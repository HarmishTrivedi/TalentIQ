// ═══════════════════════════════════════════════════════
// TalentIQ — Interview Room
// ═══════════════════════════════════════════════════════
import { WebRTCManager } from './webrtc.js';
import { AIAnalysisEngine } from './ai-engine.js';
import { showToast, showLoading, hideLoading, formatTime, formatTimestamp, getInitials, escapeHtml } from './ui.js';

export class InterviewRoom {
  constructor(roomId, role, name, localStream, socket) {
    this.roomId = roomId;
    this.role = role; // 'recruiter' | 'candidate'
    this.name = name;
    this.localStream = localStream;
    this.socket = socket;
    this.userId = 'user_' + Math.random().toString(36).substr(2, 9);

    // State
    this.videoEnabled = true;
    this.audioEnabled = true;
    this.screenSharing = false;
    this.activePanel = null; // 'chat' | 'participants' | 'ai' | 'transcript' | 'notes'
    this.participants = new Map();
    this.chatMessages = [];
    this.transcriptEntries = [];
    this.notes = '';
    this.elapsedSeconds = 0;
    this.timerInterval = null;
    this.speechRecognition = null;

    // AI (recruiter only)
    this.aiEngine = null;
    this.analysisState = null;

    this.webrtc = null;
  }

  render() {
    const loading = showLoading('Joining interview');
    document.getElementById('app').innerHTML = this.html();

    setTimeout(() => {
      this.initRoom();
      hideLoading();
    }, 800);
  }

  html() {
    const isRecruiter = this.role === 'recruiter';
    return `
    <div id="interview-room">

      <!-- Header -->
      <div class="room-header" id="room-header">
        <div class="room-header-left">
          <div class="room-logo">
            <div class="room-logo-mark">T</div>
            <span class="room-title">TalentIQ</span>
          </div>
          <div class="room-timer" id="room-timer">00:00</div>
          ${isRecruiter ? `
          <div class="recording-indicator">
            <span class="recording-dot"></span>
            AI Active
          </div>` : ''}
        </div>
        <div class="room-header-right">
          <div style="font-size:11px;color:var(--text-muted);background:var(--glass-bg);backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);padding:4px 12px;border-radius:999px;">
            ${this.roomId}
          </div>
        </div>
      </div>

      <!-- Video Grid -->
      <div class="video-grid" id="video-grid">
        <div class="video-tiles count-1" id="video-tiles">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- Self Preview -->
      <div class="self-preview" id="self-preview">
        <video id="local-video" autoplay muted playsinline></video>
        <div class="self-preview-label">You</div>
      </div>

      <!-- Control Bar -->
      <div class="control-bar" id="control-bar">
        <button class="ctrl-btn" id="ctrl-mic" title="Microphone">
          <span class="tooltip">Mute</span>
          ${SVGIcons.mic()}
        </button>
        <button class="ctrl-btn" id="ctrl-cam" title="Camera">
          <span class="tooltip">Camera</span>
          ${SVGIcons.camera()}
        </button>
        <button class="ctrl-btn" id="ctrl-screen" title="Share Screen">
          <span class="tooltip">Share Screen</span>
          ${SVGIcons.screen()}
        </button>
        <div class="ctrl-divider"></div>
        <button class="ctrl-btn" id="ctrl-chat" title="Chat">
          <span class="tooltip">Chat</span>
          ${SVGIcons.chat()}
          <span class="chat-badge hidden" id="chat-badge" style="position:absolute;top:6px;right:6px;width:8px;height:8px;background:var(--brand);border-radius:50%;"></span>
        </button>
        <button class="ctrl-btn" id="ctrl-participants" title="Participants">
          <span class="tooltip">Participants</span>
          ${SVGIcons.people()}
        </button>
        <button class="ctrl-btn" id="ctrl-fullscreen" title="Full Screen">
          <span class="tooltip">Full Screen</span>
          ${SVGIcons.fullscreen()}
        </button>
        ${isRecruiter ? `
        <div class="ctrl-divider"></div>
        <button class="ctrl-btn" id="ctrl-transcript" title="Transcript">
          <span class="tooltip">Transcript</span>
          ${SVGIcons.transcript()}
        </button>
        <button class="ctrl-btn" id="ctrl-notes" title="Notes">
          <span class="tooltip">Notes</span>
          ${SVGIcons.notes()}
        </button>
        <button class="ctrl-btn" id="ctrl-ai" title="AI Copilot">
          <span class="tooltip">AI Copilot</span>
          ${SVGIcons.ai()}
          <span style="position:absolute;top:6px;right:6px;width:6px;height:6px;background:var(--brand);border-radius:50%;animation:ai-pulse-anim 2s ease infinite;"></span>
        </button>
        ` : ''}
        <div class="ctrl-divider"></div>
        <button class="ctrl-btn end-call" id="ctrl-leave" title="Leave">
          <span class="tooltip">Leave</span>
          ${SVGIcons.phone()}
        </button>
      </div>

      <!-- Chat Panel -->
      <div class="side-panel" id="panel-chat">
        <div class="panel-header">
          <span class="panel-title">Chat</span>
          <button class="panel-close" data-close="chat">${SVGIcons.x()}</button>
        </div>
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-input-wrap">
          <textarea class="chat-input" id="chat-input" placeholder="Message everyone..." rows="1"></textarea>
          <button class="chat-send-btn" id="chat-send">${SVGIcons.send()}</button>
        </div>
      </div>

      <!-- Participants Panel -->
      <div class="side-panel" id="panel-participants">
        <div class="panel-header">
          <span class="panel-title">Participants (<span id="participant-count">1</span>)</span>
          <button class="panel-close" data-close="participants">${SVGIcons.x()}</button>
        </div>
        <div class="panel-body" id="participants-list"></div>
      </div>

      ${isRecruiter ? `
      <!-- Transcript Panel -->
      <div class="side-panel" id="panel-transcript">
        <div class="panel-header">
          <span class="panel-title">Live Transcript</span>
          <button class="panel-close" data-close="transcript">${SVGIcons.x()}</button>
        </div>
        <div class="panel-body" id="transcript-body"></div>
      </div>

      <!-- Notes Panel -->
      <div class="side-panel" id="panel-notes">
        <div class="panel-header">
          <span class="panel-title">Interview Notes</span>
          <button class="panel-close" data-close="notes">${SVGIcons.x()}</button>
        </div>
        <div class="panel-body">
          <div class="notes-section-label">Strengths</div>
          <textarea class="notes-textarea" id="notes-strengths" placeholder="Candidate strengths..." style="min-height:80px;"></textarea>
          <div class="notes-section-label mt-3">Concerns</div>
          <textarea class="notes-textarea" id="notes-concerns" placeholder="Areas of concern..." style="min-height:80px;"></textarea>
          <div class="notes-section-label mt-3">Key Observations</div>
          <textarea class="notes-textarea" id="notes-general" placeholder="General notes..." style="min-height:120px;"></textarea>
          <button id="export-notes-btn" style="width:100%;margin-top:12px;padding:10px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-md);color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;">
            Export Notes
          </button>
        </div>
      </div>

      <!-- AI Copilot Panel -->
      <div class="side-panel ai-panel" id="panel-ai">
        <div class="panel-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="panel-title">AI Copilot</span>
            <div class="ai-live-badge"><span class="ai-pulse"></span>LIVE</div>
          </div>
          <button class="panel-close" data-close="ai">${SVGIcons.x()}</button>
        </div>

        <div class="ai-panel-tabs">
          <button class="ai-tab active" data-tab="overview">Overview</button>
          <button class="ai-tab" data-tab="skills">Skills</button>
          <button class="ai-tab" data-tab="insights">Insights</button>
          <button class="ai-tab" data-tab="questions">Questions</button>
          <button class="ai-tab" data-tab="timeline">Timeline</button>
        </div>

        <!-- Overview Tab -->
        <div class="ai-tab-content active" id="tab-overview">
          <div class="ai-score-card">
            <div class="score-header">
              <span class="score-label">Overall Score</span>
              <span class="score-value high" id="overall-score">—</span>
            </div>
            <div class="score-bar-wrap">
              <div class="score-bar green" id="overall-bar" style="width:0%"></div>
            </div>
            <div class="score-sub" id="overall-summary">Waiting for interview data...</div>
          </div>

          <div class="comm-grid" id="comm-grid">
            ${['Clarity','Structure','Technical','Complete','Concise'].map(m => `
            <div class="comm-metric">
              <div class="comm-metric-label">${m}</div>
              <div class="comm-metric-score" id="score-${m.toLowerCase()}">—</div>
              <div class="comm-bar-mini"><div class="comm-bar-fill" id="bar-${m.toLowerCase()}" style="width:0%"></div></div>
            </div>`).join('')}
          </div>

          <div>
            <div class="panel-section-heading">Topic Coverage</div>
            <div class="topic-list mt-2" id="topic-list">
              <div style="font-size:12px;color:var(--text-hint);text-align:center;padding:16px;">Analysis will appear as interview progresses...</div>
            </div>
          </div>

          <div>
            <div class="panel-section-heading">Key Strengths</div>
            <div id="strengths-list" class="mt-2" style="display:flex;flex-direction:column;gap:6px;"></div>
          </div>

          <div>
            <div class="panel-section-heading">Concerns</div>
            <div id="concerns-list" class="mt-2" style="display:flex;flex-direction:column;gap:6px;"></div>
          </div>
        </div>

        <!-- Skills Tab -->
        <div class="ai-tab-content" id="tab-skills">
          <div>
            <div class="panel-section-heading">Detected Skills</div>
            <div class="skill-tags mt-2" id="skill-tags">
              <div style="font-size:12px;color:var(--text-hint);">Skills will appear as candidate speaks...</div>
            </div>
          </div>
          <div>
            <div class="panel-section-heading mt-3">Experience Claims</div>
            <div id="claims-list" class="mt-2" style="display:flex;flex-direction:column;gap:8px;"></div>
          </div>
        </div>

        <!-- Insights Tab -->
        <div class="ai-tab-content" id="tab-insights">
          <div id="contradictions-list" style="display:flex;flex-direction:column;gap:8px;">
            <div style="font-size:12px;color:var(--text-hint);text-align:center;padding:16px;">No contradictions detected.</div>
          </div>
          <div>
            <div class="panel-section-heading mt-2">AI Summary</div>
            <div id="ai-summary" class="mt-2" style="font-size:12px;color:var(--text-secondary);line-height:1.6;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:12px;">
              Summary appears after sufficient conversation...
            </div>
          </div>
        </div>

        <!-- Questions Tab -->
        <div class="ai-tab-content" id="tab-questions">
          <div id="questions-list" style="display:flex;flex-direction:column;gap:8px;">
            <div style="font-size:12px;color:var(--text-hint);text-align:center;padding:16px;">Suggested questions appear as interview progresses...</div>
          </div>
        </div>

        <!-- Timeline Tab -->
        <div class="ai-tab-content" id="tab-timeline">
          <div id="timeline-list" style="display:flex;flex-direction:column;gap:2px;">
            <div style="font-size:12px;color:var(--text-hint);text-align:center;padding:16px;">Timeline builds during the interview...</div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Toast Container -->
      <div class="toast-container" id="toast-container"></div>
    </div>
    `;
  }

  initRoom() {
    this.setupLocalVideo();
    this.addSelfTile();
    this.setupControls();
    this.setupPanels();
    this.setupSocket();
    this.setupWebRTC();
    this.startTimer();
    this.addSelfToParticipants();

    if (this.role === 'recruiter') {
      this.setupAI();
      this.setupSpeechRecognition();
    }

    // Join socket room
    this.socket.emit('join-room', {
      roomId: this.roomId,
      userId: this.userId,
      userName: this.name,
      role: this.role
    });

    showToast(`You joined as ${this.role}`, 'info');
  }

  setupLocalVideo() {
    const video = document.getElementById('local-video');
    if (video && this.localStream) {
      video.srcObject = this.localStream;
    } else if (video) {
      // Show avatar if no stream
      const preview = document.getElementById('self-preview');
      if (preview) {
        preview.innerHTML = `
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg-surface);">
            <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--brand),var(--accent-purple));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:white;">${getInitials(this.name)}</div>
          </div>
          <div class="self-preview-label">You</div>
        `;
      }
    }
  }

  addSelfTile() {
    this.addVideoTile('self', this.name, this.role, this.localStream, true);
  }

  addVideoTile(socketId, name, role, stream, isSelf = false) {
    const tilesEl = document.getElementById('video-tiles');
    if (!tilesEl) return;

    const existing = document.getElementById(`tile-${socketId}`);
    if (existing) return;

    const tile = document.createElement('div');
    tile.className = `video-tile${isSelf ? ' is-self' : ''}`;
    tile.id = `tile-${socketId}`;
    tile.innerHTML = `
      <div class="video-avatar" id="avatar-${socketId}">
        <div class="avatar-ring">${getInitials(name)}</div>
        <span class="avatar-name">${escapeHtml(name)}</span>
      </div>
      <video id="video-${socketId}" autoplay playsinline ${isSelf ? 'muted' : ''} style="width:100%; height:100%; object-fit:cover; background:#000;"></video>
      <div class="tile-overlay"></div>
      <div class="tile-info">
        <div class="tile-name">
          ${escapeHtml(name)}
          ${role === 'recruiter' ? `<span class="role-badge recruiter">Recruiter</span>` : ''}
        </div>
      </div>
    `;
    tilesEl.appendChild(tile);

    if (stream) {
      const videoEl = document.getElementById(`video-${socketId}`);
      if (videoEl) {
        videoEl.srcObject = stream;
        
        // Force play and ensure volume is up for remote users
        videoEl.onloadedmetadata = () => {
          videoEl.play().catch(e => console.error("Auto-play failed:", e));
          if (!isSelf) {
            videoEl.muted = false;
            videoEl.volume = 1.0;
          }
          document.getElementById(`avatar-${socketId}`)?.classList.add('hidden');
        };
      }
    }

    this.updateTileLayout();
  }

  removeVideoTile(socketId) {
    const tile = document.getElementById(`tile-${socketId}`);
    if (tile) tile.remove();
    this.updateTileLayout();
  }

  updateTileLayout() {
    const tilesEl = document.getElementById('video-tiles');
    if (!tilesEl) return;
    const count = tilesEl.children.length;
    tilesEl.className = `video-tiles count-${Math.min(count, 4)}`;
    // Self preview: hide the self tile if others are present, show floating preview
    const selfTile = document.getElementById('tile-self');
    const selfPreview = document.getElementById('self-preview');
    if (count > 1) {
      if (selfTile) selfTile.style.display = 'none';
      if (selfPreview) selfPreview.style.display = 'block';
    } else {
      if (selfTile) selfTile.style.display = '';
      if (selfPreview) selfPreview.style.display = 'none';
    }
  }

  setupControls() {
    // Mic
    document.getElementById('ctrl-mic')?.addEventListener('click', () => this.toggleMic());
    // Camera
    document.getElementById('ctrl-cam')?.addEventListener('click', () => this.toggleCamera());
    // Full Screen
    document.getElementById('ctrl-fullscreen')?.addEventListener('click', () => this.toggleFullscreen());
    // Screen share
    document.getElementById('ctrl-screen')?.addEventListener('click', () => this.toggleScreenShare());
    // Panel buttons
    document.getElementById('ctrl-chat')?.addEventListener('click', () => this.togglePanel('chat'));
    document.getElementById('ctrl-participants')?.addEventListener('click', () => this.togglePanel('participants'));
    document.getElementById('ctrl-transcript')?.addEventListener('click', () => this.togglePanel('transcript'));
    document.getElementById('ctrl-notes')?.addEventListener('click', () => this.togglePanel('notes'));
    document.getElementById('ctrl-ai')?.addEventListener('click', () => this.togglePanel('ai'));
    // Leave
    document.getElementById('ctrl-leave')?.addEventListener('click', () => this.leaveRoom());
    // Chat send
    document.getElementById('chat-send')?.addEventListener('click', () => this.sendChat());
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChat(); }
    });
    // Export notes
    document.getElementById('export-notes-btn')?.addEventListener('click', () => this.exportNotes());
    // Panel close buttons
    document.querySelectorAll('.panel-close').forEach(btn => {
      btn.addEventListener('click', () => this.togglePanel(btn.dataset.close));
    });
    // AI tabs
    document.querySelectorAll('.ai-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchAITab(tab.dataset.tab));
    });
  }

  setupPanels() {
    // AI panel initial state
    this.addParticipantToList(this.userId, this.name, this.role, true);
  }

  setupSocket() {
    this.socket.on('participant-joined', ({ userId, userName, role, socketId }) => {
      showToast(`${userName} joined`, 'info');
      this.addParticipantToList(socketId, userName, role, false);
    });

    this.socket.on('participant-left', ({ userName, socketId }) => {
      showToast(`${userName} left the meeting`, 'warn');
      this.removeVideoTile(socketId);
      this.removeParticipantFromList(socketId);
    });

    this.socket.on('room-participants', (participants) => {
      participants.forEach(p => {
        if (p.socketId !== this.socket.id) {
          this.addParticipantToList(p.socketId, p.userName, p.role, false);
        }
      });
    });

    this.socket.on('chat-message', (msg) => {
      this.renderChatMessage(msg);
      if (this.activePanel !== 'chat') {
        document.getElementById('chat-badge')?.classList.remove('hidden');
        showToast(`${msg.userName}: ${msg.message.slice(0, 40)}${msg.message.length > 40 ? '...' : ''}`, 'info', 2000);
      }
    });

    this.socket.on('media-state', ({ socketId, video, audio }) => {
      this.updateParticipantMedia(socketId, video, audio);
    });

    this.socket.on('screen-share-started', ({ userName }) => {
      showToast(`${userName} is sharing their screen`, 'info');
    });

    this.socket.on('screen-share-stopped', () => {
      showToast('Screen sharing ended', 'info');
    });

    this.socket.on('interview-ended', () => {
      showToast('Interview has ended', 'warn');
      setTimeout(() => {
        if (this.role === 'recruiter') {
          window.location.href = '/';
        } else {
          // Show thank you screen same as leaveRoom
          document.getElementById('app').innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:24px;background:var(--bg-void);text-align:center;padding:20px;">
              <div style="width:80px;height:80px;background:linear-gradient(135deg,var(--brand),var(--accent-purple));border-radius:24px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;color:white;box-shadow:0 20px 40px rgba(0,0,0,0.3);">✓</div>
              <div>
                <h2 style="font-size:32px;font-weight:800;color:var(--text-primary);margin-bottom:12px;letter-spacing:-0.5px;">Interview Completed</h2>
                <p style="color:var(--text-secondary);font-size:16px;max-width:400px;line-height:1.6;margin:0 auto;">Thanks for joining the interview! We appreciate your time. Our team will review the session and get back to you soon.</p>
              </div>
              <div style="font-size:18px;font-weight:600;color:var(--brand-light);display:flex;align-items:center;gap:8px;">
                Have a good day! ❤️
              </div>
            </div>
          `;
        }
      }, 3000);
    });

    this.socket.on('transcript-update', (entry) => {
      if (this.role === 'recruiter') this.addTranscriptEntry(entry);
    });
  }

  setupWebRTC() {
    this.webrtc = new WebRTCManager(
      this.socket,
      this.localStream,
      (socketId, stream, userName, role) => {
        this.addVideoTile(socketId, userName, role, stream, false);
        showToast(`${userName} video connected`, 'info', 2000);
      },
      (socketId) => {
        this.removeVideoTile(socketId);
      }
    );
  }

  setupAI() {
    this.aiEngine = new AIAnalysisEngine((analysis) => {
      this.analysisState = analysis;
      this.renderAIPanel(analysis);
    });
    this.aiEngine.startContinuousAnalysis(20000);
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    this.speechRecognition = new SpeechRecognition();
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = 'en-US';

    let finalTranscript = '';
    let lastSpeaker = this.name;

    this.speechRecognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (finalTranscript.length > 20) {
        const entry = {
          speaker: lastSpeaker,
          text: finalTranscript.trim(),
          timestamp: new Date().toISOString()
        };
        this.addTranscriptEntry(entry);
        this.aiEngine?.addTranscriptEntry(entry.speaker, entry.text, entry.timestamp);
        this.socket.emit('transcript-update', { roomId: this.roomId, transcript: entry });
        finalTranscript = '';
      }
    };

    this.speechRecognition.onerror = (e) => {
      if (e.error !== 'no-speech') console.warn('SR error:', e.error);
    };

    this.speechRecognition.onend = () => {
      if (this.timerInterval) {
        setTimeout(() => this.speechRecognition?.start(), 1000);
      }
    };

    try { this.speechRecognition.start(); } catch (e) {}
  }

  // ─── Controls ───
  toggleMic() {
    if (!this.localStream) return;
    this.audioEnabled = !this.audioEnabled;
    this.localStream.getAudioTracks().forEach(t => t.enabled = this.audioEnabled);
    const btn = document.getElementById('ctrl-mic');
    if (!this.audioEnabled) {
      btn.classList.add('muted');
      btn.innerHTML = `<span class="tooltip">Unmute</span>${SVGIcons.micOff()}`;
      showToast('Microphone muted', 'warn', 2000);
    } else {
      btn.classList.remove('muted');
      btn.innerHTML = `<span class="tooltip">Mute</span>${SVGIcons.mic()}`;
      showToast('Microphone on', 'info', 2000);
    }
    this.socket.emit('media-state', { roomId: this.roomId, video: this.videoEnabled, audio: this.audioEnabled });
  }

  toggleCamera() {
    if (!this.localStream) return;
    this.videoEnabled = !this.videoEnabled;
    this.localStream.getVideoTracks().forEach(t => t.enabled = this.videoEnabled);
    const btn = document.getElementById('ctrl-cam');
    if (!this.videoEnabled) {
      btn.classList.add('muted');
      btn.innerHTML = `<span class="tooltip">Start Camera</span>${SVGIcons.cameraOff()}`;
      showToast('Camera off', 'warn', 2000);
    } else {
      btn.classList.remove('muted');
      btn.innerHTML = `<span class="tooltip">Camera</span>${SVGIcons.camera()}`;
      showToast('Camera on', 'info', 2000);
    }
    this.socket.emit('media-state', { roomId: this.roomId, video: this.videoEnabled, audio: this.audioEnabled });
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => {
        showToast('Full screen failed', 'error');
      });
      document.getElementById('ctrl-fullscreen')?.classList.add('active');
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        document.getElementById('ctrl-fullscreen')?.classList.remove('active');
      }
    }
  }

  async toggleScreenShare() {
    const btn = document.getElementById('ctrl-screen');
    if (!this.screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        this.screenSharing = true;
        btn.classList.add('active');
        btn.innerHTML = `<span class="tooltip">Stop Share</span>${SVGIcons.screen()}`;

        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        this.webrtc?.updateLocalStream(screenStream);

        // Update self preview
        const localVideo = document.getElementById('local-video');
        if (localVideo) localVideo.srcObject = screenStream;

        videoTrack.onended = () => this.toggleScreenShare();
        this.socket.emit('screen-share-started', { roomId: this.roomId });
        showToast('Screen sharing started', 'info');
      } catch (e) {
        showToast('Screen share cancelled', 'warn', 2000);
      }
    } else {
      this.screenSharing = false;
      btn.classList.remove('active');
      btn.innerHTML = `<span class="tooltip">Share Screen</span>${SVGIcons.screen()}`;
      this.webrtc?.updateLocalStream(this.localStream);
      const localVideo = document.getElementById('local-video');
      if (localVideo) localVideo.srcObject = this.localStream;
      this.socket.emit('screen-share-stopped', { roomId: this.roomId });
      showToast('Screen sharing stopped', 'info', 2000);
    }
  }

  togglePanel(name) {
    const panelMap = { chat: 'panel-chat', participants: 'panel-participants', ai: 'panel-ai', transcript: 'panel-transcript', notes: 'panel-notes' };
    const ctrlMap = { chat: 'ctrl-chat', participants: 'ctrl-participants', ai: 'ctrl-ai', transcript: 'ctrl-transcript', notes: 'ctrl-notes' };

    if (this.activePanel === name) {
      // Close current
      document.getElementById(panelMap[name])?.classList.remove('open');
      document.getElementById(ctrlMap[name])?.classList.remove('active');
      document.getElementById('video-grid')?.classList.remove('panel-open');
      this.activePanel = null;
    } else {
      // Close previous
      if (this.activePanel) {
        document.getElementById(panelMap[this.activePanel])?.classList.remove('open');
        document.getElementById(ctrlMap[this.activePanel])?.classList.remove('active');
      }
      // Open new
      document.getElementById(panelMap[name])?.classList.add('open');
      document.getElementById(ctrlMap[name])?.classList.add('active');
      document.getElementById('video-grid')?.classList.add('panel-open');
      this.activePanel = name;

      if (name === 'chat') {
        document.getElementById('chat-badge')?.classList.add('hidden');
        setTimeout(() => document.getElementById('chat-input')?.focus(), 200);
      }
    }
  }

  sendChat() {
    const input = document.getElementById('chat-input');
    const message = input?.value.trim();
    if (!message) return;
    this.socket.emit('chat-message', { roomId: this.roomId, message, userName: this.name, role: this.role });
    input.value = '';
    input.style.height = 'auto';
  }

  renderChatMessage(msg) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const isSelf = msg.userName === this.name;
    const div = document.createElement('div');
    div.className = `chat-msg${isSelf ? ' self' : ''}`;
    div.innerHTML = `
      <div class="chat-msg-meta">${escapeHtml(msg.userName)} · ${formatTimestamp(msg.timestamp)}</div>
      <div class="chat-bubble">${escapeHtml(msg.message)}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  addTranscriptEntry(entry) {
    this.transcriptEntries.push(entry);
    const container = document.getElementById('transcript-body');
    if (!container) return;
    const isCandidate = entry.speaker !== this.name && entry.speaker !== 'Recruiter';
    const div = document.createElement('div');
    div.className = 'transcript-entry';
    div.innerHTML = `
      <div class="transcript-meta">
        <span class="transcript-speaker${isCandidate ? ' candidate' : ''}">${escapeHtml(entry.speaker)}</span>
        <span class="transcript-time">${formatTimestamp(entry.timestamp)}</span>
      </div>
      <div class="transcript-text">${escapeHtml(entry.text)}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    // Feed to AI
    this.aiEngine?.addTranscriptEntry(entry.speaker, entry.text, entry.timestamp);
  }

  addParticipantToList(id, name, role, isSelf) {
    const list = document.getElementById('participants-list');
    if (!list) return;
    if (document.getElementById(`participant-${id}`)) return;

    const div = document.createElement('div');
    div.className = 'participant-item';
    div.id = `participant-${id}`;
    div.innerHTML = `
      <div class="participant-avatar">${getInitials(name)}</div>
      <div class="participant-info">
        <div class="participant-name">${escapeHtml(name)}${isSelf ? ' <span style="font-size:10px;color:var(--text-hint)">(You)</span>' : ''}</div>
        <div class="participant-role"><span class="role-badge ${role}">${role}</span></div>
      </div>
      <div class="participant-media" id="media-${id}">
        <div class="media-icon on">${SVGIcons.micSmall()}</div>
        <div class="media-icon on">${SVGIcons.cameraSmall()}</div>
      </div>
    `;
    list.appendChild(div);
    this.updateParticipantCount();
  }

  removeParticipantFromList(socketId) {
    document.getElementById(`participant-${socketId}`)?.remove();
    this.updateParticipantCount();
  }

  updateParticipantCount() {
    const count = document.querySelectorAll('.participant-item').length;
    const el = document.getElementById('participant-count');
    if (el) el.textContent = count;
  }

  updateParticipantMedia(socketId, video, audio) {
    const el = document.getElementById(`media-${socketId}`);
    if (!el) return;
    el.innerHTML = `
      <div class="media-icon ${audio ? 'on' : 'off'}">${audio ? SVGIcons.micSmall() : SVGIcons.micOffSmall()}</div>
      <div class="media-icon ${video ? 'on' : 'off'}">${video ? SVGIcons.cameraSmall() : SVGIcons.cameraOffSmall()}</div>
    `;
  }

  switchAITab(tab) {
    document.querySelectorAll('.ai-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.ai-tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
  }

  renderAIPanel(analysis) {
    if (!analysis) return;

    // Overall score
    const score = analysis.overallScore || 0;
    const scoreEl = document.getElementById('overall-score');
    const barEl = document.getElementById('overall-bar');
    const summaryEl = document.getElementById('overall-summary');
    if (scoreEl) {
      scoreEl.textContent = score;
      scoreEl.className = `score-value ${score >= 70 ? 'high' : score >= 50 ? 'mid' : 'low'}`;
    }
    if (barEl) barEl.style.width = `${score}%`;
    if (summaryEl) summaryEl.textContent = analysis.summary || 'Analysis in progress...';

    // Comm scores
    const scores = analysis.commScores || {};
    const scoreKeys = { clarity: 'clarity', structure: 'structure', technical: 'technical', completeness: 'complete', conciseness: 'concise' };
    Object.entries(scoreKeys).forEach(([key, shortKey]) => {
      const val = scores[key] || 0;
      const el = document.getElementById(`score-${shortKey}`);
      const bar = document.getElementById(`bar-${shortKey}`);
      if (el) el.textContent = val;
      if (bar) bar.style.width = `${val}%`;
    });

    // Topics
    const topicList = document.getElementById('topic-list');
    if (topicList && analysis.topics?.length) {
      topicList.innerHTML = analysis.topics.map(t => `
        <div class="topic-item">
          <div class="topic-check ${t.covered ? 'done' : 'pending'}">
            ${t.covered ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:10px;height:10px;"><path d="M5 13l4 4L19 7"/></svg>` : ''}
          </div>
          <span class="topic-name ${t.covered ? 'done' : ''}">${escapeHtml(t.name)}</span>
          ${t.covered && t.depth ? `<span style="font-size:9px;color:var(--text-hint);">${t.depth}</span>` : ''}
        </div>
      `).join('');
    }

    // Skills
    const skillTags = document.getElementById('skill-tags');
    if (skillTags && analysis.skills?.length) {
      skillTags.innerHTML = analysis.skills.map(s => `
        <span class="skill-tag ${s.status === 'demonstrated' ? 'confirmed' : s.status === 'confirmed' ? 'confirmed' : 'mentioned'}">
          <span class="tag-dot"></span>
          ${escapeHtml(s.name)}
          <span style="font-size:9px;opacity:0.6;">${s.level || ''}</span>
        </span>
      `).join('');
    }

    // Claims
    const claimsList = document.getElementById('claims-list');
    if (claimsList && analysis.claims?.length) {
      claimsList.innerHTML = analysis.claims.map(c => `
        <div class="claim-card">
          <div class="claim-title">${escapeHtml(c.claim)}</div>
          <div class="claim-evidence">${escapeHtml(c.evidence || '')}</div>
          <div class="confidence-bar">
            <span class="conf-label">Confidence</span>
            <div class="conf-track"><div class="conf-fill" style="width:${c.confidence || 50}%"></div></div>
            <span style="font-size:10px;color:var(--text-hint);white-space:nowrap;">${c.confidence || 50}%</span>
          </div>
        </div>
      `).join('');
    }

    // Contradictions
    const contradictions = document.getElementById('contradictions-list');
    if (contradictions && analysis.contradictions?.length) {
      contradictions.innerHTML = analysis.contradictions.map(c => `
        <div class="contradiction-card">
          <div class="contradiction-header">
            <div class="contradiction-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            </div>
            <span class="contradiction-title">Possible Inconsistency · ${c.severity || 'medium'}</span>
          </div>
          <div class="contradiction-stmts">
            <div class="contradiction-stmt">
              <div class="stmt-time">${c.time_a || ''}</div>
              "${escapeHtml(c.statement_a)}"
            </div>
            <div class="contradiction-stmt">
              <div class="stmt-time">${c.time_b || ''}</div>
              "${escapeHtml(c.statement_b)}"
            </div>
          </div>
        </div>
      `).join('');
    } else if (contradictions && !analysis.contradictions?.length) {
      contradictions.innerHTML = `<div style="font-size:12px;color:var(--text-hint);text-align:center;padding:16px;">No contradictions detected.</div>`;
    }

    // AI Summary
    const summaryBox = document.getElementById('ai-summary');
    if (summaryBox && analysis.summary) {
      summaryBox.textContent = analysis.summary;
    }

    // Questions
    const questionsList = document.getElementById('questions-list');
    if (questionsList && analysis.suggestedQuestions?.length) {
      questionsList.innerHTML = analysis.suggestedQuestions.map(q => `
        <div class="question-suggestion" onclick="navigator.clipboard?.writeText('${escapeHtml(q.question)}').then(()=>{})">
          <div class="q-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div class="q-text">${escapeHtml(q.question)}</div>
            <div class="q-category">${q.category || ''} ${q.reason ? '· ' + escapeHtml(q.reason) : ''}</div>
          </div>
        </div>
      `).join('');
    }

    // Timeline
    const timelineList = document.getElementById('timeline-list');
    if (timelineList && analysis.timeline?.length) {
      timelineList.innerHTML = analysis.timeline.map((t, i) => `
        <div class="timeline-item">
          <div class="timeline-dot-wrap">
            <div class="timeline-dot"></div>
            ${i < analysis.timeline.length - 1 ? '<div class="timeline-line"></div>' : ''}
          </div>
          <span class="timeline-time">${t.time || ''}</span>
          <span class="timeline-label">${escapeHtml(t.topic || '')}</span>
        </div>
      `).join('');
    }

    // Strengths / Concerns
    const strengthsList = document.getElementById('strengths-list');
    if (strengthsList && analysis.strengths?.length) {
      strengthsList.innerHTML = analysis.strengths.map(s => `
        <div style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--text-secondary);">
          <span style="color:var(--accent-green);flex-shrink:0;margin-top:2px;">✓</span>${escapeHtml(s)}
        </div>`).join('');
    }

    const concernsList = document.getElementById('concerns-list');
    if (concernsList && analysis.concerns?.length) {
      concernsList.innerHTML = analysis.concerns.map(c => `
        <div style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--text-secondary);">
          <span style="color:var(--accent-amber);flex-shrink:0;margin-top:2px;">!</span>${escapeHtml(c)}
        </div>`).join('');
    }
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds++;
      const el = document.getElementById('room-timer');
      if (el) el.textContent = formatTime(this.elapsedSeconds);
    }, 1000);
  }

  exportNotes() {
    const strengths = document.getElementById('notes-strengths')?.value || '';
    const concerns = document.getElementById('notes-concerns')?.value || '';
    const general = document.getElementById('notes-general')?.value || '';

    const text = `TalentIQ Interview Notes
Room: ${this.roomId}
Date: ${new Date().toLocaleString()}
Duration: ${formatTime(this.elapsedSeconds)}

STRENGTHS:
${strengths}

CONCERNS:
${concerns}

GENERAL NOTES:
${general}

${this.analysisState ? `
AI ANALYSIS SUMMARY:
Overall Score: ${this.analysisState.overallScore}/100
${this.analysisState.summary}

Skills Detected:
${this.analysisState.skills?.map(s => `- ${s.name} (${s.level})`).join('\n') || 'None'}
` : ''}`;

    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `interview-notes-${this.roomId}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    showToast('Notes exported', 'info');
  }

  leaveRoom() {
    if (confirm('Are you sure you want to leave the interview?')) {
      if (this.role === 'recruiter') {
        // Recruiter ending the call can end the room for everyone
        fetch(`/api/rooms/${this.roomId}/end`, { method: 'POST' }).catch(e => console.error(e));
      }
      
      clearInterval(this.timerInterval);
      this.speechRecognition?.stop();
      this.aiEngine?.stopAnalysis();
      this.webrtc?.closeAll();
      this.localStream?.getTracks().forEach(t => t.stop());
      this.socket.disconnect();

      if (this.role === 'recruiter') {
        document.getElementById('app').innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:20px;background:var(--bg-void);">
            <div style="width:56px;height:56px;background:linear-gradient(135deg,var(--brand),var(--accent-purple));border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:white;">T</div>
            <h2 style="font-size:22px;font-weight:700;color:var(--text-primary);">You left the interview</h2>
            <p style="color:var(--text-muted);font-size:14px;">Duration: ${formatTime(this.elapsedSeconds)}</p>
            <div style="display:flex;gap:10px;">
              <button onclick="window.location.href='/'" style="padding:12px 24px;background:linear-gradient(135deg,var(--brand),var(--brand-dark));color:white;border-radius:var(--r-lg);font-size:14px;font-weight:600;cursor:pointer;border:none;">Back to Home</button>
              ${this.analysisState ? `
              <button onclick="window.location.reload()" style="padding:12px 24px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-secondary);border-radius:var(--r-lg);font-size:14px;font-weight:600;cursor:pointer;">Rejoin</button>
              ` : ''}
            </div>
          </div>
        `;
      } else {
        // Candidate Thank You Page
        document.getElementById('app').innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:24px;background:var(--bg-void);text-align:center;padding:20px;">
            <div style="width:80px;height:80px;background:linear-gradient(135deg,var(--brand),var(--accent-purple));border-radius:24px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;color:white;box-shadow:0 20px 40px rgba(0,0,0,0.3);">✓</div>
            <div>
              <h2 style="font-size:32px;font-weight:800;color:var(--text-primary);margin-bottom:12px;letter-spacing:-0.5px;">Interview Completed</h2>
              <p style="color:var(--text-secondary);font-size:16px;max-width:400px;line-height:1.6;margin:0 auto;">Thanks for joining the interview! We appreciate your time. Our team will review the session and get back to you soon.</p>
            </div>
            <div style="font-size:18px;font-weight:600;color:var(--brand-light);display:flex;align-items:center;gap:8px;">
              Have a good day! ❤️
            </div>
            <div style="margin-top:40px;opacity:0.5;display:flex;align-items:center;gap:8px;">
               <div style="width:24px;height:24px;background:rgba(255,255,255,0.1);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;">T</div>
               <span style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">TalentIQ AI</span>
            </div>
          </div>
        `;
      }
    }
  }

  addSelfToParticipants() {
    this.addParticipantToList(this.userId, this.name, this.role, true);
  }
}

// ─── SVG Icons ───
const SVGIcons = {
  mic: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
  micOff: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2m-7 9v3M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33M9 9v3a3 3 0 0 0 5.12 2.12"/></svg>`,
  camera: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  cameraOff: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="2" x2="22" y2="22"/><path d="M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16"/><path d="M9.5 4h5L17 7h3a2 2 0 0 1 2 2v7.5"/><path d="M14.12 14.12A3 3 0 0 1 9 13v0a3 3 0 0 1 3-3"/></svg>`,
  screen: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  chat: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  people: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  transcript: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  notes: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  fullscreen: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
  ai: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
  phone: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07C9.44 17.29 7.76 15.32 6.52 13a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 5.11 2h2.96a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L9.05 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>`,
  x: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  send: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  micSmall: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>`,
  micOffSmall: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12"/></svg>`,
  cameraSmall: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  cameraOffSmall: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="2" y1="2" x2="22" y2="22"/><path d="M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16"/></svg>`,
};
