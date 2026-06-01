// ═══════════════════════════════════════════════════════
// TalentIQ — WebRTC Manager (Audited & Fixed)
// ═══════════════════════════════════════════════════════

let ICE_SERVERS = [
  { urls: "stun:stun.relay.metered.ca:80" },
  { urls: "stun:stun.l.google.com:19302" }
];

// Fetch fresh TURN credentials from server
async function fetchIceServers() {
  try {
    const res = await fetch('/api/webrtc/turn-credentials');
    const data = await res.json();
    if (data.iceServers) {
      ICE_SERVERS = data.iceServers;
      console.log('[WebRTC Audit] Dynamic ICE Servers loaded:', ICE_SERVERS.length);
    }
  } catch (e) {
    console.warn('[WebRTC Audit] Failed to fetch TURN credentials, using STUN fallback');
  }
}

// Global initialization
fetchIceServers();

export class WebRTCManager {
  constructor(socket, localStream, onRemoteStream, onRemoveStream) {
    this.socket = socket;
    this.localStream = localStream;
    this.onRemoteStream = onRemoteStream;
    this.onRemoveStream = onRemoveStream;
    this.peers = new Map();       // socketId -> RTCPeerConnection
    this.makingOffer = new Map(); // socketId -> boolean (polite peer collision)
    this.setupSocketListeners();

    console.log("[WebRTC Audit] 1. Local Media Stream Verification");
    if (localStream) {
      console.log("Local Stream:", localStream);
      console.log("Tracks:", localStream.getTracks());
      localStream.getTracks().forEach(t => {
        console.log(`Track: kind=${t.kind}, label=${t.label}, enabled=${t.enabled}, readyState=${t.readyState}`);
      });
    } else {
      console.error("❌ No local stream found during WebRTC initialization!");
    }
  }

  setupSocketListeners() {
    this.socket.on('participant-joined', async ({ socketId, userName, role }) => {
      console.log('[WebRTC Signaling] participant-joined event from', socketId, userName);
      await this.createOffer(socketId, userName, role);
    });

    this.socket.on('offer', async ({ from, offer, userName, role }) => {
      console.log('[WebRTC Signaling] 3. Offer Received from', from, userName);
      await this.handleOffer(from, offer, userName, role);
    });

    this.socket.on('answer', async ({ from, answer }) => {
      console.log('[WebRTC Signaling] 3. Answer Received from', from);
      const pc = this.peers.get(from);
      if (!pc) {
        console.warn('[WebRTC] No peer connection found for answer from', from);
        return;
      }
      if (pc.signalingState !== 'have-local-offer') {
        console.warn('[WebRTC] Ignoring answer — unexpected signaling state:', pc.signalingState);
        return;
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[WebRTC Signaling] Answer applied successfully for', from);
      } catch (e) {
        console.error('[WebRTC] setRemoteDescription (answer) failed:', e);
      }
    });

    this.socket.on('ice-candidate', async ({ from, candidate }) => {
      console.log('[WebRTC Signaling] 4. ICE Candidate Received from', from);
      const pc = this.peers.get(from);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WebRTC] ICE candidate added successfully from', from);
        } catch (e) {
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
    if (this.peers.has(socketId)) {
      return this.peers.get(socketId);
    }

    console.log('[WebRTC Audit] Creating peer connection for', socketId, userName);

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    this.peers.set(socketId, pc);
    this.makingOffer.set(socketId, false);

    // ── 2. Track Attachment ──────────────────────────────────────────────────
    if (this.localStream) {
      console.log("[WebRTC Audit] 2. Attaching local tracks for", socketId);
      this.localStream.getTracks().forEach(track => {
        console.log(`[WebRTC Audit]  → Adding ${track.kind} track to pc`);
        pc.addTrack(track, this.localStream);
      });
    }

    // ── 4. ICE Candidate Exchange ─────────────────────────────────────────────
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.log('[WebRTC Audit] 4. ICE Candidate Generated:', candidate.type, candidate.candidate.substring(0, 50) + "...");
        this.socket.emit('ice-candidate', { to: socketId, candidate });
      } else {
        console.log('[WebRTC Audit] ICE gathering complete for', socketId);
      }
    };

    // ── 8. Connection Diagnostics ─────────────────────────────────────────────
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC Audit] 8. Connection State:", pc.connectionState, "for", socketId);
      if (pc.connectionState === 'connected') {
        console.log('[WebRTC Audit] ✅ Connection ESTABLISHED with', socketId);
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        console.error('[WebRTC Audit] ❌ Connection', pc.connectionState, "for", socketId);
        this.removePeer(socketId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC Audit] 8. ICE State:", pc.iceConnectionState, "for", socketId);
      if (pc.iceConnectionState === 'failed') {
        console.warn('[WebRTC] ICE failed, attempting restart');
        pc.restartIce();
      }
    };

    pc.onsignalingstatechange = () => {
      console.log("[WebRTC Audit] 8. Signaling State:", pc.signalingState, "for", socketId);
    };

    // ── 5. Remote Stream Reception ────────────────────────────────────────────
    pc.ontrack = (event) => {
      console.log("[WebRTC Audit] 5. Remote Track Received", event);
      console.log("Remote Stream exists:", !!event.streams[0]);
      if (event.streams[0]) {
        console.log("Remote Stream Tracks:", event.streams[0].getTracks().map(t => t.kind));
        this.onRemoteStream(socketId, event.streams[0], userName, role);
      } else {
        // Fallback for some browsers
        const fallbackStream = new MediaStream([event.track]);
        this.onRemoteStream(socketId, fallbackStream, userName, role);
      }
    };

    return pc;
  }

  async createOffer(socketId, userName, role) {
    console.log('[WebRTC Signaling] 3. Creating Offer to', socketId);
    const pc = this.createPeerConnection(socketId, userName, role);

    if (pc.signalingState !== 'stable') return;

    try {
      this.makingOffer.set(socketId, true);
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      console.log('[WebRTC Signaling] 3. Offer Sent to', socketId);
      this.socket.emit('offer', { to: socketId, offer: pc.localDescription });
    } catch (e) {
      console.error('[WebRTC] createOffer failed:', e);
    } finally {
      this.makingOffer.set(socketId, false);
    }
  }

  async handleOffer(socketId, offer, userName, role) {
    console.log('[WebRTC Signaling] 3. Handling Offer from', socketId);

    let pc = this.peers.get(socketId);

    if (pc && this.makingOffer.get(socketId)) {
      const isPolite = this.socket.id > socketId;
      if (!isPolite) return;
      await pc.setLocalDescription({ type: 'rollback' });
    }

    if (!pc) pc = this.createPeerConnection(socketId, userName, role);

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
      this.makingOffer.delete(socketId);
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
    this.makingOffer.clear();
  }
}
