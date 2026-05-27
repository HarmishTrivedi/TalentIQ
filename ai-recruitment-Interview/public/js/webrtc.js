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
      await this.createOffer(socketId, userName, role);
    });

    this.socket.on('offer', async ({ from, offer, userName, role }) => {
      await this.handleOffer(from, offer, userName, role);
    });

    this.socket.on('answer', async ({ from, answer }) => {
      const pc = this.peers.get(from);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    this.socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = this.peers.get(from);
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}
      }
    });

    this.socket.on('participant-left', ({ socketId }) => {
      this.removePeer(socketId);
    });
  }

  createPeerConnection(socketId, userName, role) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peers.set(socketId, pc);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.socket.emit('ice-candidate', { to: socketId, candidate });
      }
    };

    // Remote stream
    pc.ontrack = ({ streams }) => {
      if (streams && streams[0]) {
        this.onRemoteStream(socketId, streams[0], userName, role);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.removePeer(socketId);
      }
    };

    return pc;
  }

  async createOffer(socketId, userName, role) {
    const pc = this.createPeerConnection(socketId, userName, role);
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);
    this.socket.emit('offer', { to: socketId, offer });
  }

  async handleOffer(socketId, offer, userName, role) {
    const pc = this.createPeerConnection(socketId, userName, role);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.socket.emit('answer', { to: socketId, answer });
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
