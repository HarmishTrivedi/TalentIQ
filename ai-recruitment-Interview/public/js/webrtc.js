// ═══════════════════════════════════════════════════════
// TalentIQ — WebRTC Manager (Production-Grade)
// ═══════════════════════════════════════════════════════

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.services.mozilla.com' },
  { urls: 'stun:stun.ekiga.net' },
  { urls: 'stun:stun.ideasip.com' },
  { urls: 'stun:stun.voxgratia.org' },
  { urls: 'stun:stun.softjoys.com' },
];

export class WebRTCManager {
  constructor(socket, localStream, onRemoteStream, onRemoveStream) {
    this.socket = socket;
    this.localStream = localStream;
    this.onRemoteStream = onRemoteStream;
    this.onRemoveStream = onRemoveStream;
    this.peers = new Map();
    this.remoteStreams = new Map(); 
    this.pendingCandidates = new Map();
    this.setupSocketListeners();
    console.log('[WebRTC] Manager initialized');
  }

  setupSocketListeners() {
    this.socket.on('participant-joined', async ({ socketId, userName, role }) => {
      console.log(`[WebRTC] Peer joined: ${userName} (${socketId})`);
      await this.createOffer(socketId, userName, role);
    });

    this.socket.on('offer', async ({ from, offer, userName, role }) => {
      console.log(`[WebRTC] Offer received from: ${userName} (${from})`);
      await this.handleOffer(from, offer, userName, role);
    });

    this.socket.on('answer', async ({ from, answer }) => {
      const pc = this.peers.get(from);
      if (pc) {
        try { 
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log(`[WebRTC] Answer set for: ${from}`);
          this.processPendingCandidates(from);
        } catch(e) { console.error(`[WebRTC] Error setting answer:`, e); }
      }
    });

    this.socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = this.peers.get(from);
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } 
        catch(e) { console.error(`[WebRTC] Error adding candidate:`, e); }
      } else {
        if (!this.pendingCandidates.has(from)) this.pendingCandidates.set(from, []);
        this.pendingCandidates.get(from).push(candidate);
      }
    });

    this.socket.on('participant-left', ({ socketId }) => {
      this.removePeer(socketId);
    });
  }

  createPeerConnection(socketId, userName, role) {
    if (this.peers.has(socketId)) this.removePeer(socketId);

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle'
    });
    
    this.peers.set(socketId, pc);

    // Add local tracks BEFORE offer creation
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.socket.emit('ice-candidate', { to: socketId, candidate });
    };

    pc.ontrack = (event) => {
      console.log(`[WebRTC] Track arrival: ${event.track.kind} from ${socketId}`);
      
      // Get or create the remote stream for this peer
      let rs = this.remoteStreams.get(socketId);
      if (!rs) {
        rs = new MediaStream();
        this.remoteStreams.set(socketId, rs);
      }

      // Add the new track to our persistent stream
      rs.addTrack(event.track);

      // If the browser provided a stream, ensure we're using its grouping logic
      const streamToUse = (event.streams && event.streams[0]) || rs;
      
      // Always notify UI so it can ensure the video element is playing the latest stream
      this.onRemoteStream(socketId, streamToUse, userName, role);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state (${socketId}): ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed') pc.restartIce();
    };

    return pc;
  }

  async createOffer(socketId, userName, role) {
    const pc = this.createPeerConnection(socketId, userName, role);
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      this.socket.emit('offer', { to: socketId, offer: pc.localDescription });
    } catch(e) { console.error(`[WebRTC] createOffer failed:`, e); }
  }

  async handleOffer(socketId, offer, userName, role) {
    const pc = this.createPeerConnection(socketId, userName, role);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit('answer', { to: socketId, answer: pc.localDescription });
      this.processPendingCandidates(socketId);
    } catch(e) { console.error(`[WebRTC] handleOffer failed:`, e); }
  }

  processPendingCandidates(socketId) {
    const candidates = this.pendingCandidates.get(socketId);
    if (candidates) {
      const pc = this.peers.get(socketId);
      if (pc) {
        candidates.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => {}));
      }
      this.pendingCandidates.delete(socketId);
    }
  }

  removePeer(socketId) {
    const pc = this.peers.get(socketId);
    if (pc) pc.close();
    this.peers.delete(socketId);
    this.remoteStreams.delete(socketId);
    this.pendingCandidates.delete(socketId);
    this.onRemoveStream(socketId);
  }

  updateLocalStream(newStream) {
    this.localStream = newStream;
    this.peers.forEach(pc => {
      const senders = pc.getSenders();
      newStream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track && s.track.kind === track.kind);
        if (sender) sender.replaceTrack(track);
        else pc.addTrack(track, newStream);
      });
    });
  }

  closeAll() {
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.remoteStreams.clear();
    this.pendingCandidates.clear();
  }
}
