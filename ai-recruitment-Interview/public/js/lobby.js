// ═══════════════════════════════════════════════════════
// TalentIQ — Lobby (Pre-Join)
// ═══════════════════════════════════════════════════════
import { showToast } from './ui.js';

export class LobbyPage {
  constructor(roomId, role, name, onJoin) {
    this.roomId = roomId;
    this.role = role;
    this.name = name;
    this.onJoin = onJoin;
    this.stream = null;
    this.videoEnabled = true;
    this.audioEnabled = true;
    this.joining = false;
  }

  async render() {
    const app = document.getElementById('app');
    app.innerHTML = this.html();
    await this.initMedia();
    this.bindEvents();
    this.checkConnection();
  }

  html() {
    return `
    <div id="lobby">
      <div class="lobby-bg"></div>
      <div class="lobby-bg-grid"></div>

      <div class="lobby-container">
        <!-- Camera Preview Side -->
        <div class="lobby-preview-side">
          <div class="camera-preview-wrap" id="preview-wrap">
            <video id="preview-video" autoplay muted playsinline></video>
            <div class="preview-overlay"></div>
            <div class="preview-badge" id="preview-badge">Camera On</div>
            <div class="no-camera hidden" id="no-camera">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/>
              </svg>
              <span>Camera is off</span>
            </div>
          </div>

          <div class="preview-controls">
            <button class="preview-control-btn active" id="toggle-cam">
              ${SVG.camera()}
              <span id="cam-label">Camera On</span>
            </button>
            <button class="preview-control-btn active" id="toggle-mic">
              ${SVG.mic()}
              <span id="mic-label">Mic On</span>
            </button>
          </div>

          <div class="connection-status">
            <div class="status-chip" id="conn-status">
              <span class="dot" id="conn-dot"></span>
              <span id="conn-text">Checking...</span>
            </div>
            <div class="status-chip" id="audio-status">
              <span class="dot" id="audio-dot"></span>
              <span id="audio-text">Audio Ready</span>
            </div>
          </div>
        </div>

        <!-- Join Panel -->
        <div class="lobby-panel">
          <div class="lobby-logo">
            <div class="lobby-logo-mark">T</div>
            <div class="lobby-logo-text">Talent<span>IQ</span></div>
          </div>

          <div class="lobby-header">
            <h1>Ready to join?</h1>
            <p>Check your camera and microphone before entering the interview.</p>
          </div>

          <div class="lobby-meeting-info">
            <div class="meeting-title" id="meeting-title">Interview Room</div>
            <div class="meeting-meta">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Room: ${this.roomId}
              &nbsp;·&nbsp;
              <span class="role-badge ${this.role}" style="font-size:10px;">${this.role}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Your Display Name</label>
            <input class="form-input" id="display-name" value="${this.name}" placeholder="Enter your name" autocomplete="off" />
          </div>

          <button class="btn-join" id="btn-join">
            Join Interview
            <span class="btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </span>
          </button>

          <p style="font-size:11px;color:var(--text-hint);text-align:center;line-height:1.5;">
            By joining, you agree to the recording and AI analysis of this interview session.
          </p>
        </div>
      </div>
    </div>
    `;
  }

  async initMedia() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
      });
      const video = document.getElementById('preview-video');
      if (video) video.srcObject = this.stream;
      document.getElementById('conn-dot').className = 'dot';
      document.getElementById('conn-text').textContent = 'Camera Ready';
    } catch (e) {
      console.warn('Media error:', e);
      document.getElementById('no-camera').classList.remove('hidden');
      document.getElementById('preview-video').classList.add('hidden');
      document.getElementById('conn-dot').className = 'dot bad';
      document.getElementById('conn-text').textContent = 'No Camera';
    }
  }

  checkConnection() {
    const conn = navigator.connection || { effectiveType: '4g', downlink: 10 };
    const type = conn.effectiveType || '4g';
    const dotEl = document.getElementById('audio-dot');
    const textEl = document.getElementById('audio-text');
    if (type === '4g' || (conn.downlink && conn.downlink > 1.5)) {
      dotEl.className = 'dot';
      textEl.textContent = 'Good Connection';
    } else if (type === '3g') {
      dotEl.className = 'dot warn';
      textEl.textContent = 'Fair Connection';
    } else {
      dotEl.className = 'dot bad';
      textEl.textContent = 'Slow Connection';
    }
  }

  bindEvents() {
    document.getElementById('toggle-cam').onclick = () => this.toggleCamera();
    document.getElementById('toggle-mic').onclick = () => this.toggleMic();
    document.getElementById('btn-join').onclick = () => this.join();
    document.getElementById('display-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.join();
    });
  }

  toggleCamera() {
    if (!this.stream) return;
    this.videoEnabled = !this.videoEnabled;
    this.stream.getVideoTracks().forEach(t => t.enabled = this.videoEnabled);
    const btn = document.getElementById('toggle-cam');
    const label = document.getElementById('cam-label');
    const preview = document.getElementById('preview-video');
    const noCam = document.getElementById('no-camera');
    const badge = document.getElementById('preview-badge');

    if (this.videoEnabled) {
      btn.classList.add('active');
      btn.classList.remove('muted');
      label.textContent = 'Camera On';
      preview.classList.remove('hidden');
      noCam.classList.add('hidden');
      badge.textContent = 'Camera On';
    } else {
      btn.classList.remove('active');
      btn.classList.add('muted');
      label.textContent = 'Camera Off';
      preview.classList.add('hidden');
      noCam.classList.remove('hidden');
      badge.textContent = 'Camera Off';
    }
  }

  toggleMic() {
    if (!this.stream) return;
    this.audioEnabled = !this.audioEnabled;
    this.stream.getAudioTracks().forEach(t => t.enabled = this.audioEnabled);
    const btn = document.getElementById('toggle-mic');
    const label = document.getElementById('mic-label');
    if (this.audioEnabled) {
      btn.classList.add('active');
      btn.classList.remove('muted');
      label.textContent = 'Mic On';
    } else {
      btn.classList.remove('active');
      btn.classList.add('muted');
      label.textContent = 'Mic Off';
    }
  }

  async join() {
    if (this.joining) return;
    this.joining = true;

    // Request full screen on join
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    const name = document.getElementById('display-name').value.trim() || this.name;
    const btn = document.getElementById('btn-join');
    btn.textContent = 'Connecting...';
    btn.disabled = true;

    if (!this.stream) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (e) {
        // allow joining without media
      }
    }

    setTimeout(() => {
      this.onJoin(this.stream, name);
    }, 400);
  }
}

// SVG icons helper (shared)
export const SVG = {
  camera: (off = false) => off
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 17H4a2 2 0 0 1-2-2V7c0-1.1.9-2 2-2h11l6 4-6 4V7"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,

  mic: (off = false) => off
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
};
