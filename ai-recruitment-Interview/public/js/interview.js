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

    // Recording
    this.mediaRecorder = null;
    this.recordingChunks = [];
    this.isRecording = false;
    this.candidateName = null; // set when remote participant joins
  }

  render() {
    // 1. Setup signaling immediately so we don't miss offers
    this.setupSocket();
    this.setupWebRTC();

    // 2. Render UI shell
    const loading = showLoading('Joining interview');
    document.getElementById('app').innerHTML = this.html();

    // 3. Initialize room after UI is ready
    setTimeout(() => {
      this.initRoom();
      hideLoading();
    }, 800);
  }

  html() {
    const isRecruiter = this.role === 'recruiter';
    return `
    <div id="interview-room" class="interview-layout-v2">

      <!-- Header V2 -->
      <header class="header-v2">
        <div class="header-v2-left">
          <div class="room-logo">
            <div class="room-logo-mark">T</div>
            <span class="room-title">TalentIQ AI</span>
          </div>
          <div class="ctrl-divider"></div>
          <div class="session-info">
            <div class="session-title">${this.roomId} — AI Interview</div>
            <div class="session-status">
              <span id="room-timer" class="room-timer">00:00</span>
              <span class="ctrl-divider" style="height:12px;"></span>
              <span>${this.name} (${this.role})</span>
            </div>
          </div>
        </div>
        <div class="header-v2-right">
          ${isRecruiter ? `
          <div class="live-indicator" id="recording-indicator" style="display:none;">
            <span class="recording-dot"></span>
            REC
          </div>
          <div class="live-indicator">
            <span class="recording-dot" style="background:var(--accent-green);"></span>
            AI Analysis Live
          </div>
          <button id="ctrl-record" class="ctrl-btn" title="Start Recording" style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);border-radius:var(--r-md);width:auto;padding:0 14px;gap:6px;font-size:11px;font-weight:700;color:var(--accent-red);">
            ${SVGIcons.record()}
            <span id="record-btn-label">REC</span>
          </button>` : ''}
          <div style="font-size:11px;color:var(--text-muted);background:var(--glass-bg);backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);padding:6px 14px;border-radius:999px;">
            SECURE SESSION
          </div>
        </div>
      </header>

      <!-- Left Section: Candidate Video -->
      <section class="section-video">
        <div class="video-main-container ai-glow">
          <div class="video-tiles count-1" id="video-tiles" style="width:100%; height:100%;">
            <!-- Populated dynamically -->
          </div>
          
          <!-- Minimal Overlay Controls -->
          <div class="video-overlay-controls">
            <button class="ctrl-btn" id="ctrl-mic" title="Microphone">
              ${SVGIcons.mic()}
            </button>
            <button class="ctrl-btn" id="ctrl-cam" title="Camera">
              ${SVGIcons.camera()}
            </button>
            <button class="ctrl-btn" id="ctrl-screen" title="Share Screen">
              ${SVGIcons.screen()}
            </button>
            <div class="ctrl-divider"></div>
            <button class="ctrl-btn end-call" id="ctrl-leave" title="End Session">
              ${SVGIcons.phone()}
            </button>
          </div>
        </div>

        <!-- Floating Self Preview -->
        <div class="self-preview" id="self-preview" style="bottom:40px; right:40px;">
          <video id="local-video" autoplay muted playsinline></video>
          <div class="self-preview-label">You</div>
        </div>
      </section>

      <!-- Center Section: Live Conversation -->
      <section class="section-conversation">
        <div class="conversation-header">
          <span class="conversation-title">Live Transcript & Notes</span>
          <div class="ai-live-badge"><span class="ai-pulse"></span>ACTIVE</div>
        </div>
        <div class="transcript-scroll" id="transcript-body">
          <div style="text-align:center; padding-top:100px; color:var(--text-hint); font-size:13px;">
            Waiting for conversation to begin...
          </div>
        </div>
        
        <!-- Chat Area (Hidden by default, toggleable) -->
        <div id="panel-chat" class="side-panel" style="position:relative; width:100%; height:auto; transform:none; border:none; display:none; background:rgba(0,0,0,0.2);">
          <div class="chat-messages" id="chat-messages" style="height:200px;"></div>
          <div class="chat-input-wrap">
            <textarea class="chat-input" id="chat-input" placeholder="Quick message..." rows="1"></textarea>
            <button class="chat-send-btn" id="chat-send">${SVGIcons.send()}</button>
          </div>
        </div>
      </section>

      <!-- Right Section: AI Analysis -->
      <aside class="section-analysis">
        
        <!-- Overall Score Card -->
        <div class="analysis-card">
          <div class="panel-section-heading">Interview Performance</div>
          <div class="analysis-score-circle">
            <svg class="score-svg" viewBox="0 0 100 100">
              <circle class="score-circle-bg" cx="50" cy="50" r="45"></circle>
              <circle class="score-circle-fill" id="overall-circle" cx="50" cy="50" r="45" style="stroke-dasharray: 282.7; stroke-dashoffset: 282.7;"></circle>
            </svg>
            <div class="score-number" id="overall-score">0</div>
          </div>
          <div id="overall-summary" style="font-size:12px; color:var(--text-secondary); text-align:center; line-height:1.5;">
            Analyzing interview data in real-time...
          </div>
        </div>

        <!-- Metric Bars -->
        <div class="analysis-card">
          <div class="panel-section-heading">Communication Analysis</div>
          <div class="analysis-metrics-grid">
            ${['Clarity','Structure','Technical','Complete','Concise'].map(m => `
            <div class="metric-row">
              <div class="metric-info">
                <span>${m}</span>
                <span id="score-${m.toLowerCase()}">0%</span>
              </div>
              <div class="metric-bar-bg">
                <div class="metric-bar-fill" id="bar-${m.toLowerCase()}" style="width:0%"></div>
              </div>
            </div>`).join('')}
          </div>
        </div>

        <!-- Detected Skills -->
        <div class="analysis-card">
          <div class="panel-section-heading">Technical Skills Detected</div>
          <div class="skill-tags mt-2" id="skill-tags">
            <div style="font-size:11px; color:var(--text-hint);">No skills detected yet.</div>
          </div>
        </div>

        <!-- Topics Covered -->
        <div class="analysis-card">
          <div class="panel-section-heading">Discussion Topics</div>
          <div class="topic-list mt-2" id="topic-list">
            <div style="font-size:11px; color:var(--text-hint);">Analyzing topics...</div>
          </div>
        </div>

        <!-- Strengths & Concerns -->
        <div class="analysis-card">
          <div class="panel-section-heading">AI Feedback Highlights</div>
          <div id="strengths-list" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div>
          <div id="concerns-list" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div>
        </div>

      </aside>

      <!-- Footer: Question Bar -->
      <footer class="footer-v2">
        <div class="question-bar">
          <div class="question-label">AI Suggested</div>
          <div class="question-text" id="active-ai-question">
            Listening to conversation to generate the next best question...
          </div>
          <div class="ctrl-divider"></div>
          <div class="header-v2-right" style="gap:8px;">
            <button class="ctrl-btn" id="ctrl-chat" title="Toggle Chat" style="width:36px; height:36px;">
              ${SVGIcons.chat()}
            </button>
            <button class="ctrl-btn" id="ctrl-participants" title="Participants" style="width:36px; height:36px;">
              ${SVGIcons.people()}
            </button>
            ${isRecruiter ? `
            <button class="ctrl-btn" id="ctrl-notes" title="Notes" style="width:36px; height:36px;">
              ${SVGIcons.notes()}
            </button>
            ` : ''}
          </div>
        </div>
      </footer>

      <!-- Floating Participants Panel -->
      <div class="side-panel" id="panel-participants" style="right:32px; bottom:120px; top:auto; height:400px; border-radius:var(--r-lg); border:1px solid var(--border-bright);">
        <div class="panel-header">
          <span class="panel-title">Participants (<span id="participant-count">1</span>)</span>
          <button class="panel-close" data-close="participants">${SVGIcons.x()}</button>
        </div>
        <div class="panel-body" id="participants-list"></div>
      </div>

      <!-- Floating Notes Panel -->
      <div class="side-panel" id="panel-notes" style="right:32px; bottom:120px; top:auto; height:500px; border-radius:var(--r-lg); border:1px solid var(--border-bright);">
        <div class="panel-header">
          <span class="panel-title">Interview Notes</span>
          <button class="panel-close" data-close="notes">${SVGIcons.x()}</button>
        </div>
        <div class="panel-body">
          <textarea class="notes-textarea" id="notes-general" placeholder="Your observations..." style="height:100%;"></textarea>
          <button id="export-notes-btn" class="btn-join" style="margin-top:12px; padding:10px; font-size:12px;">Export Report</button>
        </div>
      </div>

      <!-- Toast Container -->
      <div class="toast-container" id="toast-container"></div>

      <!-- Recording Consent Modal (candidate sees this) -->
      <div id="recording-consent-modal" style="display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.75); backdrop-filter:blur(8px); display:none; align-items:center; justify-content:center;">
        <div style="background:var(--bg-elevated); border:1px solid var(--border-bright); border-radius:var(--r-2xl); padding:40px 36px; max-width:440px; width:90%; text-align:center; box-shadow:var(--shadow-xl);">
          <div style="width:64px;height:64px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="28" height="28"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h3 style="font-size:20px;font-weight:800;color:var(--text-primary);margin-bottom:10px;">Recording Request</h3>
          <p style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:28px;" id="consent-message">
            The interviewer would like to record this session for review purposes. Do you consent?
          </p>
          <div style="display:flex;gap:12px;">
            <button id="consent-decline" style="flex:1;padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);color:var(--text-secondary);font-size:14px;font-weight:600;cursor:pointer;">Decline</button>
            <button id="consent-accept" style="flex:1;padding:12px;background:linear-gradient(135deg,var(--accent-red),#dc2626);border:none;border-radius:var(--r-lg);color:white;font-size:14px;font-weight:700;cursor:pointer;">Yes, Allow Recording</button>
          </div>
        </div>
      </div>

      <!-- Recording Notification Banner -->
      <div id="recording-banner" style="display:none; position:fixed; top:70px; left:50%; transform:translateX(-50%); z-index:500; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4); border-radius:999px; padding:8px 20px; font-size:12px; font-weight:700; color:var(--accent-red); display:none; align-items:center; gap:8px;">
        <span style="width:8px;height:8px;border-radius:50%;background:var(--accent-red);animation:blink-rec 1.5s ease infinite;"></span>
        This session is being recorded
      </div>
    </div>
    `;
  }

  initRoom() {
    this.setupLocalVideo();
    this.addSelfTile();
    this.setupControls();
    this.setupPanels();
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
    const safeName = name || (role === 'recruiter' ? 'Recruiter' : 'Candidate');
    console.log(`[UI] addVideoTile for ${safeName} (${socketId}), isSelf: ${isSelf}`);
    const tilesEl = document.getElementById('video-tiles');
    if (!tilesEl) return;

    let tile = document.getElementById(`tile-${socketId}`);
    if (!tile) {
      tile = document.createElement('div');
      tile.className = `video-tile${isSelf ? ' is-self' : ''}`;
      tile.id = `tile-${socketId}`;
      tile.innerHTML = `
        <div class="video-avatar" id="avatar-${socketId}">
          <div class="avatar-ring">${getInitials(safeName)}</div>
          <span class="avatar-name">${escapeHtml(safeName)}</span>
        </div>
        <video id="video-${socketId}" autoplay playsinline ${isSelf ? 'muted' : ''} style="width:100%; height:100%; object-fit:cover; background:#000;"></video>
        <div class="tile-overlay"></div>
        <div class="tile-info">
          <div class="tile-name">
            ${escapeHtml(safeName)}
            ${role === 'recruiter' ? `<span class="role-badge recruiter">Recruiter</span>` : ''}
          </div>
        </div>
      `;
      tilesEl.appendChild(tile);
    }

    if (stream) {
      const videoEl = document.getElementById(`video-${socketId}`);
      if (videoEl && videoEl.srcObject !== stream) {
        console.log(`[UI] Attaching stream to video element for ${socketId}`);
        videoEl.srcObject = stream;
        
        const playVideo = async () => {
          try {
            await videoEl.play();
            console.log(`[UI] Video playing for ${socketId}`);
            if (!isSelf) {
              videoEl.muted = false;
              videoEl.volume = 1.0;
            }
            document.getElementById(`avatar-${socketId}`)?.classList.add('hidden');
          } catch (e) {
            console.warn(`[UI] Auto-play blocked for ${socketId}, retrying on click...`, e);
            // Fallback: unhide avatar if video fails to play
            document.getElementById(`avatar-${socketId}`)?.classList.remove('hidden');
            // Try to play again if user clicks anywhere
            window.addEventListener('click', () => videoEl.play().catch(e=>{}), { once: true });
          }
        };

        playVideo();
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
    
    const selfTile = document.getElementById('tile-self');
    const selfPreview = document.getElementById('self-preview');
    const totalCount = tilesEl.children.length;
    
    // UI Logic: If more than 1 person, hide self from grid and show floating preview
    if (totalCount > 1) {
      if (selfTile) selfTile.style.display = 'none';
      if (selfPreview) selfPreview.style.display = 'block';
    } else {
      if (selfTile) selfTile.style.display = '';
      if (selfPreview) selfPreview.style.display = 'none';
    }

    // Grid Logic: Set count class based on VISIBLE tiles only
    const visibleTiles = Array.from(tilesEl.children).filter(t => t.style.display !== 'none');
    const visibleCount = visibleTiles.length;
    
    console.log(`[UI] Updating layout: total=${totalCount}, visible=${visibleCount}`);
    tilesEl.className = `video-tiles count-${Math.min(visibleCount, 4)}`;
    
    // If only 1 visible (the remote peer), ensure it's centered and large
    if (visibleCount === 1) {
      visibleTiles[0].style.width = '100%';
      visibleTiles[0].style.height = '100%';
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
    // Record (recruiter only)
    if (this.role === 'recruiter') {
      document.getElementById('ctrl-record')?.addEventListener('click', () => this.toggleRecording());
    }
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
      // Track candidate name for recording filename
      if (role === 'candidate') this.candidateName = userName;
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
          // Capture candidate name for recording filename
          if (p.role === 'candidate') this.candidateName = p.userName;
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

    // ── Recording events ──
    // Candidate: receives consent request
    this.socket.on('recording-consent-request', ({ recruiterName }) => {
      const modal = document.getElementById('recording-consent-modal');
      const msg = document.getElementById('consent-message');
      if (msg) msg.textContent = `${recruiterName || 'The interviewer'} would like to record this session for review purposes. Do you consent?`;
      if (modal) modal.style.display = 'flex';

      document.getElementById('consent-accept')?.addEventListener('click', () => {
        modal.style.display = 'none';
        this.socket.emit('recording-consent-response', { roomId: this.roomId, accepted: true });
      }, { once: true });

      document.getElementById('consent-decline')?.addEventListener('click', () => {
        modal.style.display = 'none';
        this.socket.emit('recording-consent-response', { roomId: this.roomId, accepted: false });
      }, { once: true });
    });

    // Recruiter: receives candidate's consent decision
    this.socket.on('recording-consent-result', ({ accepted, candidateName }) => {
      if (accepted) {
        showToast(`${candidateName} accepted recording`, 'info');
        this._startMediaRecorder();
      } else {
        showToast(`${candidateName} declined recording`, 'warn');
      }
    });

    // Both: recording started announcement
    this.socket.on('recording-started', ({ startedBy }) => {
      this._showRecordingBanner(true);
      this._speak('Attention: This meeting is now being recorded.');
      showToast('🔴 Recording started', 'warn', 4000);
    });

    // Both: recording stopped announcement
    this.socket.on('recording-stopped', ({ stoppedBy }) => {
      this._showRecordingBanner(false);
      this._speak('Recording has stopped.');
      showToast('Recording stopped', 'info', 3000);
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
    const panelMap = { chat: 'panel-chat', participants: 'panel-participants', notes: 'panel-notes' };
    const ctrlMap = { chat: 'ctrl-chat', participants: 'ctrl-participants', notes: 'ctrl-notes' };

    if (!panelMap[name]) return; // AI and Transcript are now fixed sections

    const panel = document.getElementById(panelMap[name]);
    const ctrl = document.getElementById(ctrlMap[name]);

    if (this.activePanel === name) {
      panel.style.display = 'none';
      ctrl?.classList.remove('active');
      this.activePanel = null;
    } else {
      // Close previous floating panel if different
      if (this.activePanel && panelMap[this.activePanel]) {
        document.getElementById(panelMap[this.activePanel]).style.display = 'none';
        document.getElementById(ctrlMap[this.activePanel])?.classList.remove('active');
      }
      
      panel.style.display = name === 'chat' ? 'flex' : 'flex';
      ctrl?.classList.add('active');
      this.activePanel = name;

      if (name === 'chat') {
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
      <div class="chat-msg-meta" style="font-size:9px; color:var(--text-hint); margin-bottom:2px;">${escapeHtml(msg.userName)} · ${formatTimestamp(msg.timestamp)}</div>
      <div class="chat-bubble" style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:12px; padding:8px 12px; font-size:12px; color:var(--text-secondary); max-width:85%; line-height:1.4;">
        ${escapeHtml(msg.message)}
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  addTranscriptEntry(entry) {
    this.transcriptEntries.push(entry);
    const container = document.getElementById('transcript-body');
    if (!container) return;

    // Remove placeholder if it exists
    if (this.transcriptEntries.length === 1) {
      container.innerHTML = '';
    }

    const isRecruiter = entry.speaker === 'Recruiter' || entry.speaker === this.name && this.role === 'recruiter';
    const div = document.createElement('div');
    div.className = 'transcript-bubble';
    if (isRecruiter) div.style.alignSelf = 'flex-end';

    div.innerHTML = `
      <div class="bubble-meta" style="${isRecruiter ? 'flex-direction:row-reverse' : ''}">
        <span class="bubble-speaker ${isRecruiter ? 'recruiter' : ''}">${escapeHtml(entry.speaker)}</span>
        <span class="bubble-time">${formatTimestamp(entry.timestamp)}</span>
      </div>
      <div class="bubble-content ${isRecruiter ? 'recruiter' : ''}">
        ${escapeHtml(entry.text)}
      </div>
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
      <div class="media-icon ${audio ? 'on' : 'off'}" style="width:20px; height:20px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:${audio ? 'rgba(0,242,255,0.1)' : 'rgba(255,61,113,0.1)'}; color:${audio ? 'var(--brand)' : 'var(--accent-red)'}">
        ${audio ? SVGIcons.micSmall() : SVGIcons.micOffSmall()}
      </div>
      <div class="media-icon ${video ? 'on' : 'off'}" style="width:20px; height:20px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:${video ? 'rgba(0,255,157,0.1)' : 'rgba(255,61,113,0.1)'}; color:${video ? 'var(--accent-green)' : 'var(--accent-red)'}">
        ${video ? SVGIcons.cameraSmall() : SVGIcons.cameraOffSmall()}
      </div>
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
    const circleEl = document.getElementById('overall-circle');
    const summaryEl = document.getElementById('overall-summary');
    
    if (scoreEl) scoreEl.textContent = score;
    if (circleEl) {
      const radius = 45;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (score / 100) * circumference;
      circleEl.style.strokeDasharray = `${circumference} ${circumference}`;
      circleEl.style.strokeDashoffset = offset;
    }
    if (summaryEl) summaryEl.textContent = analysis.summary || 'Analysis in progress...';

    // Comm scores
    const scores = analysis.commScores || {};
    const scoreKeys = { clarity: 'clarity', structure: 'structure', technical: 'technical', completeness: 'complete', conciseness: 'concise' };
    Object.entries(scoreKeys).forEach(([key, shortKey]) => {
      const val = scores[key] || 0;
      const el = document.getElementById(`score-${shortKey}`);
      const bar = document.getElementById(`bar-${shortKey}`);
      if (el) el.textContent = `${val}%`;
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
        </div>
      `).join('');
    }

    // Skills
    const skillTags = document.getElementById('skill-tags');
    if (skillTags && analysis.skills?.length) {
      skillTags.innerHTML = analysis.skills.map(s => `
        <span class="skill-tag ${s.status === 'demonstrated' ? 'confirmed' : 'mentioned'}">
          <span class="tag-dot"></span>
          ${escapeHtml(s.name)}
        </span>
      `).join('');
    }

    // Strengths / Concerns
    const strengthsList = document.getElementById('strengths-list');
    if (strengthsList && analysis.strengths?.length) {
      strengthsList.innerHTML = analysis.strengths.slice(0, 3).map(s => `
        <div style="display:flex;align-items:flex-start;gap:8px;font-size:11px;color:var(--text-secondary);background:rgba(0,255,157,0.05);padding:6px 10px;border-radius:6px;border-left:2px solid var(--accent-green);">
          ${escapeHtml(s)}
        </div>`).join('');
    }

    const concernsList = document.getElementById('concerns-list');
    if (concernsList && analysis.concerns?.length) {
      concernsList.innerHTML = analysis.concerns.slice(0, 2).map(c => `
        <div style="display:flex;align-items:flex-start;gap:8px;font-size:11px;color:var(--text-secondary);background:rgba(255,61,113,0.05);padding:6px 10px;border-radius:6px;border-left:2px solid var(--accent-red);">
          ${escapeHtml(c)}
        </div>`).join('');
    }

    // Suggested Question (Update the Question Bar)
    const questionEl = document.getElementById('active-ai-question');
    if (questionEl && analysis.suggestedQuestions?.length) {
      const latestQ = analysis.suggestedQuestions[analysis.suggestedQuestions.length - 1].question;
      if (questionEl.textContent !== latestQ) {
        questionEl.style.opacity = 0;
        setTimeout(() => {
          questionEl.textContent = latestQ;
          questionEl.style.opacity = 1;
        }, 300);
      }
    }
  }

  // ── Recording ──
  toggleRecording() {
    if (!this.isRecording) {
      // Ask candidate for consent first
      this.socket.emit('recording-start-request', { roomId: this.roomId, recruiterName: this.name });
      showToast('Waiting for candidate consent...', 'info', 4000);
    } else {
      this._stopMediaRecorder();
    }
  }

  _startMediaRecorder() {
    // Capture all video tiles + local audio into one stream
    const streams = [];
    if (this.localStream) streams.push(this.localStream);

    // Grab remote video elements' streams
    document.querySelectorAll('#video-tiles video').forEach(v => {
      if (v.srcObject && v.srcObject !== this.localStream) streams.push(v.srcObject);
    });

    // Merge into one stream via canvas + AudioContext
    let combinedStream;
    try {
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      streams.forEach(s => {
        s.getAudioTracks().forEach(() => {
          audioCtx.createMediaStreamSource(s).connect(dest);
        });
      });

      // Use screen capture of the interview room element for video
      const videoEl = document.querySelector('#video-tiles video:not([muted])');
      const videoStream = videoEl?.srcObject || this.localStream;
      const videoTrack = videoStream?.getVideoTracks()[0];

      const tracks = [...dest.stream.getAudioTracks()];
      if (videoTrack) tracks.push(videoTrack);
      combinedStream = new MediaStream(tracks);
    } catch(e) {
      // Fallback: just record local stream
      combinedStream = this.localStream;
    }

    if (!combinedStream) {
      showToast('No stream available to record', 'error');
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    this.recordingChunks = [];
    this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordingChunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => this._saveRecording();
    this.mediaRecorder.start(1000); // collect chunks every 1s

    this.isRecording = true;
    this._updateRecordBtn(true);

    // Notify all participants
    this.socket.emit('recording-started', { roomId: this.roomId });
  }

  _stopMediaRecorder() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
    this._updateRecordBtn(false);
    this.socket.emit('recording-stopped', { roomId: this.roomId });
  }

  async _saveRecording() {
    if (!this.recordingChunks.length) return;
    const blob = new Blob(this.recordingChunks, { type: 'video/webm' });
    const candidateName = (this.candidateName || 'candidate').replace(/\s+/g, '_');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${candidateName}_${date}_${this.roomId.slice(0, 8)}.webm`;

    // Try uploading to server
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const res = await fetch(`/api/rooms/${this.roomId}/recording`, {
        method: 'POST',
        headers: { 'Content-Type': 'video/webm' },
        body: arrayBuffer
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Recording saved: ${data.filename}`, 'info', 5000);
        return;
      }
    } catch(e) {
      console.warn('Server upload failed, falling back to download:', e);
    }

    // Fallback: trigger browser download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Recording downloaded: ${filename}`, 'info', 5000);
  }

  _updateRecordBtn(isRecording) {
    const btn = document.getElementById('ctrl-record');
    const label = document.getElementById('record-btn-label');
    const indicator = document.getElementById('recording-indicator');
    if (!btn) return;
    if (isRecording) {
      btn.style.background = 'rgba(239,68,68,0.25)';
      btn.style.borderColor = 'rgba(239,68,68,0.6)';
      if (label) label.textContent = 'STOP REC';
      if (indicator) indicator.style.display = 'flex';
    } else {
      btn.style.background = 'rgba(239,68,68,0.12)';
      btn.style.borderColor = 'rgba(239,68,68,0.25)';
      if (label) label.textContent = 'REC';
      if (indicator) indicator.style.display = 'none';
    }
  }

  _showRecordingBanner(show) {
    const banner = document.getElementById('recording-banner');
    if (banner) banner.style.display = show ? 'flex' : 'none';
  }

  _speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
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
      if (this.isRecording) this._stopMediaRecorder();
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
  record: () => `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><circle cx="12" cy="12" r="8"/></svg>`,
};
