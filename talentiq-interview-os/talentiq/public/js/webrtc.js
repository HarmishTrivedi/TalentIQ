// ═══════════════════════════════════════════════════════
// TalentIQ — WebRTC Manager (Audited & Fixed)
// ═══════════════════════════════════════════════════════

let ICE_SERVERS = [
  { urls: "stun:stun.relay.metered.ca:80" },
  { urls: "stun:stun.l.google.com:19302" }
];

async function fetchIceServers() {
  try {
    const res = await fetch('/api/webrtc/turn-credentials');
    const data = await res.json();
    if (data.iceServers) {
      ICE_SERVERS = data.iceServers;
      console.log('[WebRTC Audit] Dynamic ICE Servers loaded:', ICE_SERVERS.length);
    }
  } catch (e) {
    console.warn('[WebRTC Audit] Using STUN fallback');
  }
}

fetchIceServers();

export class WebRTCManager {
  constructor(socket, localStream, onRemoteStream, onRemoveStream) {
    this.socket = socket;
    this.localStream = localStream;
    this.onRemoteStream = onRemoteStream;
    this.onRemoveStream = onRemoveStream;
    this.peers = new Map();       // socketId -> RTCPeerConnection
    this.makingOffer = new Map(); // socketId -> boolean
    this.setupSocketListeners();

    console.log("[WebRTC Audit] 1. Local Media Stream Verification");
    if (localStream) {
      console.log("Local Stream:", localStream);
      console.log("Tracks:", localStream.getTracks().map(t => `${t.kind}: ${t.label}`));
    } else {
      console.error("❌ No local stream found!");
    }
  }

  setupSocketListeners() {
    this.socket.on('participant-joined', async ({ socketId, userName, role }) => {
      console.log('[WebRTC Signaling] participant-joined:', socketId, userName);
      await this.createOffer(socketId, userName, role);
    });

    this.socket.on('offer', async ({ from, offer, userName, role }) => {
      console.log('[WebRTC Signaling] 3. Offer Received from', from);
      await this.handleOffer(from, offer, userName, role);
    });

    this.socket.on('answer', async ({ from, answer }) => {
      console.log('[WebRTC Signaling] 3. Answer Received from', from);
      const pc = this.peers.get(from);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('[WebRTC Signaling] Answer applied for', from);
        } catch (e) {
          console.error('[WebRTC] setRemoteDescription failed:', e);
        }
      }
    });

    this.socket.on('ice-candidate', async ({ from, candidate }) => {
      console.log('[WebRTC Signaling] 4. ICE Candidate Received from', from);
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
    if (this.peers.has(socketId)) return this.peers.get(socketId);

    console.log('[WebRTC Audit] Creating PeerConnection for', socketId);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peers.set(socketId, pc);

    // ── 2. Track Attachment ──────────────────────────────────────────────────
    if (this.localStream) {
      console.log("[WebRTC Audit] 2. Attaching local tracks for", socketId);
      this.localStream.getTracks().forEach(track => {
        console.log(`[WebRTC Audit]  → Adding ${track.kind} track`);
        pc.addTrack(track, this.localStream);
      });
    }

    // ── 4. ICE Candidate Exchange ─────────────────────────────────────────────
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.log('[WebRTC Audit] 4. ICE Candidate Generated for', socketId);
        this.socket.emit('ice-candidate', { to: socketId, candidate });
      }
    };

    // ── 8. Connection Diagnostics ─────────────────────────────────────────────
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC Audit] 8. Connection State:", pc.connectionState, "for", socketId);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC Audit] 8. ICE State:", pc.iceConnectionState, "for", socketId);
      if (pc.iceConnectionState === 'failed') pc.restartIce();
    };

    // ── 5. Remote Stream Reception ────────────────────────────────────────────
    pc.ontrack = (event) => {
      console.log("[WebRTC Audit] 5. Remote Track Received", event.track.kind);
      const remoteStream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      this.onRemoteStream(socketId, remoteStream, userName, role);
    };

    return pc;
  }

  async createOffer(socketId, userName, role) {
    console.log('[WebRTC Signaling] 3. Creating Offer to', socketId);
    const pc = this.createPeerConnection(socketId, userName, role);
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      console.log('[WebRTC Signaling] 3. Offer Sent to', socketId);
      this.socket.emit('offer', { to: socketId, offer: pc.localDescription });
    } catch (e) {
      console.error('[WebRTC] createOffer failed:', e);
    }
  }

  async handleOffer(socketId, offer, userName, role) {
    console.log('[WebRTC Signaling] 3. Handling Offer from', socketId);
    const pc = this.createPeerConnection(socketId, userName, role);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[WebRTC Signaling] 3. Answer Sent to', socketId);
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
