// ═══════════════════════════════════════════════════════
// TalentIQ — WebRTC Manager (Fixed with Queuing & Logging)
// ═══════════════════════════════════════════════════════

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.ekiga.net' },
  { urls: 'stun:stun.voxgratia.org' },
];

export class WebRTCManager {
  constructor(socket, localStream, onRemoteStream, onRemoveStream) {
    this.socket = socket;
    this.localStream = localStream;
    this.onRemoteStream = onRemoteStream;
    this.onRemoveStream = onRemoveStream;
    this.peers = new Map();
    this.pendingCandidates = new Map(); // Queue for ICE candidates
    this.setupSocketListeners();
    console.log('[WebRTC] Manager initialized');
  }

  setupSocketListeners() {
    this.socket.on('participant-joined', async ({ socketId, userName, role }) => {
      console.log(`[WebRTC] New participant joined: ${userName} (${socketId})`);
      await this.createOffer(socketId, userName, role);
    });

    this.socket.on('offer', async ({ from, offer, userName, role }) => {
      console.log(`[WebRTC] Received offer from: ${userName} (${from})`);
      await this.handleOffer(from, offer, userName, role);
    });

    this.socket.on('answer', async ({ from, answer }) => {
      console.log(`[WebRTC] Received answer from: ${from}`);
      const pc = this.peers.get(from);
      if (pc) {
        try { 
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log(`[WebRTC] Set remote description (answer) for: ${from}`);
          this.processPendingCandidates(from);
        } catch(e) {
          console.error(`[WebRTC] Error setting remote answer for ${from}:`, e);
        }
      }
    });

    this.socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = this.peers.get(from);
      if (pc && pc.remoteDescription) {
        try { 
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`[WebRTC] Added ICE candidate from: ${from}`);
        } catch(e) {
          console.error(`[WebRTC] Error adding ICE candidate from ${from}:`, e);
        }
      } else {
        console.log(`[WebRTC] Queuing ICE candidate from: ${from}`);
        if (!this.pendingCandidates.has(from)) this.pendingCandidates.set(from, []);
        this.pendingCandidates.get(from).push(candidate);
      }
    });

    this.socket.on('participant-left', ({ socketId }) => {
      console.log(`[WebRTC] Participant left: ${socketId}`);
      this.removePeer(socketId);
    });
  }

  createPeerConnection(socketId, userName, role) {
    console.log(`[WebRTC] Creating PC for: ${userName} (${socketId})`);
    
    // Close any existing connection for this peer
    if (this.peers.has(socketId)) {
      console.warn(`[WebRTC] Peer ${socketId} already exists, closing old connection`);
      this.peers.get(socketId).close();
      this.peers.delete(socketId);
    }

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });
    this.peers.set(socketId, pc);

    // Add local tracks
    if (this.localStream) {
      console.log(`[WebRTC] Adding local tracks to PC for: ${socketId}`);
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.socket.emit('ice-candidate', { to: socketId, candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from: ${socketId} (${event.track.kind})`);
      const stream = (event.streams && event.streams[0]) || new MediaStream([event.track]);
      this.onRemoteStream(socketId, stream, userName, role);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state for ${socketId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn(`[WebRTC] ICE connection failed for ${socketId}, attempting restart...`);
        if (pc.restartIce) pc.restartIce();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state for ${socketId}: ${pc.connectionState}`);
    };

    return pc;
  }

  async createOffer(socketId, userName, role) {
    const pc = this.createPeerConnection(socketId, userName, role);
    try {
      const offer = await pc.createOffer({ 
        offerToReceiveAudio: true, 
        offerToReceiveVideo: true 
      });
      await pc.setLocalDescription(offer);
      console.log(`[WebRTC] Created offer and set local description for: ${socketId}`);
      this.socket.emit('offer', { to: socketId, offer: pc.localDescription });
    } catch(e) {
      console.error(`[WebRTC] createOffer error for ${socketId}:`, e);
    }
  }

  async handleOffer(socketId, offer, userName, role) {
    const pc = this.createPeerConnection(socketId, userName, role);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log(`[WebRTC] Set remote description (offer) for: ${socketId}`);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log(`[WebRTC] Created answer and set local description for: ${socketId}`);
      
      this.socket.emit('answer', { to: socketId, answer: pc.localDescription });
      this.processPendingCandidates(socketId);
    } catch(e) {
      console.error(`[WebRTC] handleOffer error for ${socketId}:`, e);
    }
  }

  processPendingCandidates(socketId) {
    const candidates = this.pendingCandidates.get(socketId);
    if (candidates && candidates.length > 0) {
      console.log(`[WebRTC] Processing ${candidates.length} queued candidates for: ${socketId}`);
      const pc = this.peers.get(socketId);
      if (pc) {
        candidates.forEach(async (candidate) => {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}
        });
      }
      this.pendingCandidates.delete(socketId);
    }
  }

  removePeer(socketId) {
    const pc = this.peers.get(socketId);
    if (pc) {
      pc.close();
      this.peers.delete(socketId);
      this.pendingCandidates.delete(socketId);
      this.onRemoveStream(socketId);
    }
  }

  updateLocalStream(newStream) {
    console.log('[WebRTC] Updating local stream');
    this.localStream = newStream;
    this.peers.forEach((pc, socketId) => {
      const senders = pc.getSenders();
      newStream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track && s.track.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          pc.addTrack(track, newStream);
        }
      });
    });
  }

  closeAll() {
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.pendingCandidates.clear();
  }
}
