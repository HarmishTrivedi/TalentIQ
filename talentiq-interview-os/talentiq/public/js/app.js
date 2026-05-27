// ═══════════════════════════════════════════════════════
// TalentIQ Interview OS — Main App
// ═══════════════════════════════════════════════════════

import { LobbyPage } from './lobby.js';
import { InterviewRoom } from './interview.js';
import { showToast } from './ui.js';

class App {
  constructor() {
    this.currentPage = null;
    this.socket = null;
    this.localStream = null;
    this.init();
  }

  init() {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    // Route: /interview/:roomId
    const roomMatch = path.match(/^\/interview\/([^/]+)/);

    if (roomMatch) {
      const roomId = roomMatch[1];
      const role = params.get('role') || 'candidate';
      const name = params.get('name') || (role === 'recruiter' ? 'Recruiter' : 'Candidate');
      this.startLobby(roomId, role, name);
    } else if (path === '/' || path === '') {
      this.showHome();
    } else {
      this.showHome();
    }
  }

  showHome() {
    document.getElementById('app').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:20px;background:var(--bg-void);">
        <div style="width:56px;height:56px;background:linear-gradient(135deg,var(--brand),var(--accent-purple));border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:white;">T</div>
        <div style="text-align:center;">
          <h1 style="font-size:28px;font-weight:800;letter-spacing:-0.5px;color:var(--text-primary);margin-bottom:8px;">TalentIQ Interview OS</h1>
          <p style="color:var(--text-muted);font-size:14px;max-width:400px;line-height:1.6;">Enterprise AI-powered interview platform. Create a room via the API or your recruitment portal.</p>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px 24px;max-width:480px;width:100%;margin:0 16px;">
          <p style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Quick Test Room</p>
          <div style="display:flex;gap:8px;">
            <input id="test-room-id" placeholder="Room ID (or leave blank)" style="flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:var(--r-md);padding:10px 14px;color:var(--text-primary);font-size:13px;font-family:var(--font-ui);outline:none;" />
            <button id="test-recruiter" style="padding:10px 16px;background:linear-gradient(135deg,var(--brand),var(--brand-dark));color:white;border-radius:var(--r-md);font-size:13px;font-weight:600;cursor:pointer;">Recruiter</button>
            <button id="test-candidate" style="padding:10px 16px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-secondary);border-radius:var(--r-md);font-size:13px;font-weight:600;cursor:pointer;">Candidate</button>
          </div>
        </div>
        <p style="font-size:11px;color:var(--text-hint);">API endpoint: POST /api/rooms/create</p>
      </div>
    `;

    const go = (role) => {
      const roomId = document.getElementById('test-room-id').value.trim() || 'demo-room-' + Math.random().toString(36).substr(2,6);
      window.location.href = `/interview/${roomId}?role=${role}&name=${role === 'recruiter' ? 'Sarah+Chen' : 'Alex+Kumar'}`;
    };

    document.getElementById('test-recruiter').onclick = () => go('recruiter');
    document.getElementById('test-candidate').onclick = () => go('candidate');
  }

  startLobby(roomId, role, name) {
    const lobby = new LobbyPage(roomId, role, name, (stream, displayName) => {
      this.localStream = stream;
      this.startInterview(roomId, role, displayName || name, stream);
    });
    lobby.render();
  }

  startInterview(roomId, role, name, stream) {
    this.socket = io();
    const room = new InterviewRoom(roomId, role, name, stream, this.socket);
    room.render();
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
