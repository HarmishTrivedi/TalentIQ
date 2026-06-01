// ═══════════════════════════════════════════════════════
// TalentIQ — WebRTC Manager (Fixed)
// ═══════════════════════════════════════════════════════

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export class WebRTCManager {
  constructor(socket, localStream, onRemoteStream, onRemoveStream) {
    this.socket = socket;
    this.localStream = localStream;
    this.onRemoteStream = onRemoteStream;
    this.onRemoveStream = onRemoveStream;
    this.peers = new Map();       // socketId -> RTCPeerConnection
    this.makingOffer = new Map(); // socketId -> boolean (polite peer collision)
    this.setupSocketListeners();

    console.log('[WebRTC] Manager initialized. Local stream tracks:',
      localStream ? localStream.getTracks().map(t => `${t.kind}(${t.label})`).join(', ') : 'NONE'
    );
  }

  setupSocketListeners() {
    // Existing peer notifies us that a new participant joined — they create the offer
    this.socket.on('participant-joined', async ({ socketId, userName, role }) => {
      console.log('[WebRTC] participant-joined event — creating offer for', socketId, userName);
      await this.createOffer(socketId, userName, role);
    });

    this.socket.on('offer', async ({ from, offer, userName, role }) => {
      console.log('[WebRTC] Received offer from', from, userName);
      await this.handleOffer(from, offer, userName, role);
    });

    this.socket.on('answer', async ({ from, answer }) => {
      console.log('[WebRTC] Received answer from', from);
      const pc = this.peers.get(from);
      if (!pc) {
        console.warn('[WebRTC] No peer connection found for answer from', from);
        return;
      }
      // Ignore answer if we are not in the right state
      if (pc.signalingState !== 'have-local-offer') {
        console.warn('[WebRTC] Ignoring answer — unexpected signaling state:', pc.signalingState);
        return;
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[WebRTC] Remote description set (answer) for', from);
      } catch (e) {
        console.error('[WebRTC] setRemoteDescription (answer) failed:', e);
      }
    });

    this.socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = this.peers.get(from);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WebRTC] ICE candidate added from', from);
        } catch (e) {
          // Ignore benign ICE errors (e.g. candidate added after connection closed)
          if (e.name !== 'InvalidStateError') {
            console.warn('[WebRTC] Failed to add ICE candidate from', from, ':', e.message);
          }
        }
      }
    });

    this.socket.on('participant-left', ({ socketId }) => {
      console.log('[WebRTC] Participant left:', socketId);
      this.removePeer(socketId);
    });
  }

  createPeerConnection(socketId, userName, role) {
    // Prevent duplicate peer connections
    if (this.peers.has(socketId)) {
      console.log('[WebRTC] Peer connection already exists for', socketId, '— reusing');
      return this.peers.get(socketId);
    }

    console.log('[WebRTC] Creating NEW peer connection for', socketId, userName, role);

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    this.peers.set(socketId, pc);
    this.makingOffer.set(socketId, false);

    // ── Add local tracks ──────────────────────────────────────────────────────
    if (this.localStream) {
      const tracks = this.localStream.getTracks();
      console.log('[WebRTC] Adding', tracks.length, 'local tracks to peer connection for', socketId);
      tracks.forEach(track => {
        console.log('[WebRTC]  → Adding track:', track.kind, track.label, 'enabled:', track.enabled);
        pc.addTrack(track, this.localStream);
      });
    } else {
      console.error('[WebRTC] ❌ No localStream when creating peer connection for', socketId, '— remote will not receive media!');
    }

    // ── ICE candidates ────────────────────────────────────────────────────────
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.log('[WebRTC] Sending ICE candidate to', socketId, candidate.type);
        this.socket.emit('ice-candidate', { to: socketId, candidate });
      } else {
        console.log('[WebRTC] ICE gathering complete for', socketId);
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log('[WebRTC] ICE gathering state:', pc.iceGatheringState, 'for', socketId);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState, 'for', socketId);
      if (pc.iceConnectionState === 'failed') {
        console.warn('[WebRTC] ICE failed — attempting restart for', socketId);
        pc.restartIce();
      }
    };

    pc.onsignalingstatechange = () => {
      console.log('[WebRTC] Signaling state:', pc.signalingState, 'for', socketId);
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState, 'for', socketId);
      if (pc.connectionState === 'connected') {
        console.log('[WebRTC] ✅ Peer connection ESTABLISHED with', socketId, userName);
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(socketId);
      }
    };

    // ── Remote track handler — THE most critical part ─────────────────────────
    // ontrack fires once per track. We collect all tracks into a MediaStream.
    const remoteStream = new MediaStream();
    pc._remoteStream = remoteStream;

    pc.ontrack = (event) => {
      console.log('[WebRTC] ✅ ontrack fired — kind:', event.track.kind,
        'readyState:', event.track.readyState,
        'streams:', event.streams.length
      );

      // Prefer event.streams[0] (contains both audio+video already bundled)
      if (event.streams && event.streams[0]) {
        console.log('[WebRTC] Using event.streams[0], id:', event.streams[0].id,
          'tracks:', event.streams[0].getTracks().map(t => t.kind).join(', ')
        );
        this.onRemoteStream(socketId, event.streams[0], userName, role);
      } else {
        // Fallback: manually build stream from individual tracks
        remoteStream.addTrack(event.track);
        console.log('[WebRTC] Built manual stream, tracks now:',
          remoteStream.getTracks().map(t => t.kind).join(', ')
        );
        this.onRemoteStream(socketId, remoteStream, userName, role);
      }

      event.track.onunmute = () => {
        console.log('[WebRTC] Track unmuted:', event.track.kind, 'for', socketId);
      };

      event.track.onended = () => {
        console.log('[WebRTC] Track ended:', event.track.kind, 'for', socketId);
      };
    };

    return pc;
  }

  // Public — called both internally (participant-joined) and from interview.js (room-participants)
  async createOffer(socketId, userName, role) {
    console.log('[WebRTC] createOffer → to', socketId, userName);
    const pc = this.createPeerConnection(socketId, userName, role);

    // Guard: don't create offer if already negotiating
    if (pc.signalingState !== 'stable') {
      console.warn('[WebRTC] Skipping createOffer — signaling state is', pc.signalingState, 'for', socketId);
      return;
    }

    try {
      this.makingOffer.set(socketId, true);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      console.log('[WebRTC] Offer created, sending to', socketId);
      this.socket.emit('offer', { to: socketId, offer: pc.localDescription });
    } catch (e) {
      console.error('[WebRTC] createOffer failed for', socketId, ':', e);
    } finally {
      this.makingOffer.set(socketId, false);
    }
  }

  async handleOffer(socketId, offer, userName, role) {
    console.log('[WebRTC] handleOffer ← from', socketId, userName);

    let pc = this.peers.get(socketId);

    // Collision detection: if we already have a peer and are making an offer,
    // use "polite peer" strategy — the one with the higher socket ID yields
    if (pc && this.makingOffer.get(socketId)) {
      const isPolite = this.socket.id > socketId;
      console.log('[WebRTC] Offer collision detected. isPolite:', isPolite);
      if (!isPolite) {
        console.log('[WebRTC] Impolite peer — ignoring incoming offer');
        return;
      }
      // Polite peer: rollback and accept the incoming offer
      try {
        await pc.setLocalDescription({ type: 'rollback' });
        console.log('[WebRTC] Rolled back local description');
      } catch (e) {
        console.warn('[WebRTC] Rollback failed:', e.message);
      }
    }

    if (!pc) {
      pc = this.createPeerConnection(socketId, userName, role);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[WebRTC] Remote description set (offer) for', socketId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[WebRTC] Answer created, sending to', socketId);
      this.socket.emit('answer', { to: socketId, answer: pc.localDescription });
    } catch (e) {
      console.error('[WebRTC] handleOffer failed for', socketId, ':', e);
    }
  }

  removePeer(socketId) {
    const pc = this.peers.get(socketId);
    if (pc) {
      pc.close();
      this.peers.delete(socketId);
      this.makingOffer.delete(socketId);
      this.onRemoveStream(socketId);
      console.log('[WebRTC] Peer removed:', socketId);
    }
  }

  updateLocalStream(newStream) {
    console.log('[WebRTC] Updating local stream, new tracks:',
      newStream.getTracks().map(t => t.kind).join(', ')
    );
    this.localStream = newStream;
    this.peers.forEach((pc, socketId) => {
      const senders = pc.getSenders();
      newStream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track && s.track.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
          console.log('[WebRTC] Replaced', track.kind, 'track for', socketId);
        }
      });
    });
  }

  closeAll() {
    console.log('[WebRTC] Closing all peer connections');
    this.peers.forEach((pc, socketId) => {
      pc.close();
      console.log('[WebRTC] Closed peer:', socketId);
    });
    this.peers.clear();
    this.makingOffer.clear();
  }
}
