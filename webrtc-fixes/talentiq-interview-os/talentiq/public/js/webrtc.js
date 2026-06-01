// ═══════════════════════════════════════════════════════
// TalentIQ — WebRTC Manager
// ═══════════════════════════════════════════════════════

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export class WebRTCManager {
  constructor(socket, localStream, onRemoteStream, onRemoveStream) {
    this.socket = socket;
    this.localStream = localStream;
    this.onRemoteStream = onRemoteStream;
    this.onRemoveStream = onRemoveStream;
    this.peers = new Map(); // socketId -> RTCPeerConnection
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('participant-joined', async ({ socketId, userName, role }) => {
      console.log('[WebRTC] participant-joined, creating offer for', socketId, userName, role);
      await this.createOffer(socketId, userName, role);
    });

    this.socket.on('offer', async ({ from, offer, userName, role }) => {
      console.log('[WebRTC] Received offer from', from, userName, role);
      await this.handleOffer(from, offer, userName, role);
    });

    this.socket.on('answer', async ({ from, answer }) => {
      console.log('[WebRTC] Received answer from', from);
      const pc = this.peers.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[WebRTC] Remote description set (answer) for', from);
      }
    });

    this.socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = this.peers.get(from);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WebRTC] ICE candidate added from', from);
        } catch(e) {
          console.warn('[WebRTC] Failed to add ICE candidate:', e);
        }
      }
    });

    this.socket.on('participant-left', ({ socketId }) => {
      console.log('[WebRTC] Participant left:', socketId);
      this.removePeer(socketId);
    });
  }

  createPeerConnection(socketId, userName, role) {
    console.log('[WebRTC] Creating peer connection for', socketId, userName);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peers.set(socketId, pc);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log('[WebRTC] Adding local track:', track.kind, track.label);
        pc.addTrack(track, this.localStream);
      });
    } else {
      console.warn('[WebRTC] No localStream available when creating peer connection!');
    }

    // ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.log('[WebRTC] Sending ICE candidate to', socketId);
        this.socket.emit('ice-candidate', { to: socketId, candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState, 'for', socketId);
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState, 'for', socketId);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.removePeer(socketId);
      }
    };

    // Remote stream — delivers video+audio to the UI
    pc.ontrack = (event) => {
      console.log('[WebRTC] ontrack fired — kind:', event.track.kind, 'streams:', event.streams.length);
      const remoteStream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      console.log('[WebRTC] Remote stream id:', remoteStream.id, 'tracks:', remoteStream.getTracks().length);
      this.onRemoteStream(socketId, remoteStream, userName, role);
    };

    return pc;
  }

  async createOffer(socketId, userName, role) {
    console.log('[WebRTC] Creating offer for', socketId);
    const pc = this.createPeerConnection(socketId, userName, role);
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      console.log('[WebRTC] Offer created, sending to', socketId);
      this.socket.emit('offer', { to: socketId, offer: pc.localDescription });
    } catch (e) {
      console.error('[WebRTC] createOffer failed:', e);
    }
  }

  async handleOffer(socketId, offer, userName, role) {
    console.log('[WebRTC] Handling offer from', socketId);
    const pc = this.createPeerConnection(socketId, userName, role);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[WebRTC] Remote description set (offer) for', socketId);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[WebRTC] Answer created, sending to', socketId);
      this.socket.emit('answer', { to: socketId, answer: pc.localDescription });
    } catch (e) {
      console.error('[WebRTC] handleOffer failed:', e);
    }
  }

  removePeer(socketId) {
    const pc = this.peers.get(socketId);
    if (pc) {
      pc.close();
      this.peers.delete(socketId);
      this.onRemoveStream(socketId);
    }
  }

  updateLocalStream(newStream) {
    this.localStream = newStream;
    this.peers.forEach(pc => {
      const senders = pc.getSenders();
      newStream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track && s.track.kind === track.kind);
        if (sender) sender.replaceTrack(track);
      });
    });
  }

  closeAll() {
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
  }
}
