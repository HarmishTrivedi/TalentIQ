// ═══════════════════════════════════════════════════════
// TalentIQ — UI Utilities
// ═══════════════════════════════════════════════════════

export function showToast(message, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-dot ${type}"></span>${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showLoading(message = 'Connecting') {
  const el = document.createElement('div');
  el.className = 'loading-screen';
  el.id = 'loading-screen';
  el.innerHTML = `
    <div class="loading-logo">T</div>
    <div class="loading-text">${message}<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span></div>
  `;
  document.body.appendChild(el);
  return el;
}

export function hideLoading() {
  const el = document.getElementById('loading-screen');
  if (el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }
}

export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function formatTimestamp(date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
