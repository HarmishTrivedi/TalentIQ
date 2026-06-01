// ═══════════════════════════════════════════════════════
// TalentIQ — WebRTC Manager (Fixed)
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
      if (pc) {
        try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); } catch(e) {}
      }
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
    // Close any existing connection for this peer
    if (this.peers.has(socketId)) {
      this.peers.get(socketId).close();
      this.peers.delete(socketId);
    }

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });
    this.peers.set(socketId, pc);

    // Add local tracks — do NOT add transceivers separately, addTrack handles it
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    } else {
      // No local stream: add recvonly transceivers so we can still receive
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.socket.emit('ice-candidate', { to: socketId, candidate });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams && event.streams[0];
      if (stream) {
        this.onRemoteStream(socketId, stream, userName, role);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'failed') {
        // Attempt ICE restart
        if (pc.restartIce) pc.restartIce();
      }
      if (state === 'closed') {
        this.removePeer(socketId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        if (pc.restartIce) pc.restartIce();
      }
    };

    return pc;
  }

  async createOffer(socketId, userName, role) {
    const pc = this.createPeerConnection(socketId, userName, role);
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      this.socket.emit('offer', { to: socketId, offer: pc.localDescription });
    } catch(e) {
      console.error('createOffer error:', e);
    }
  }

  async handleOffer(socketId, offer, userName, role) {
    const pc = this.createPeerConnection(socketId, userName, role);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit('answer', { to: socketId, answer: pc.localDescription });
    } catch(e) {
      console.error('handleOffer error:', e);
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
