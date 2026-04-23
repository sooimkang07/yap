// ═══════════════════════════════════════════════════════
// yAp — Shared utilities
// ═══════════════════════════════════════════════════════

const APP_COPY = {
  listening: 'Listening…',
};

function getStoredCurrentUserId() {
  try {
    return localStorage.getItem(APP_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredCurrentUserId(userId) {
  try {
    if (!userId) localStorage.removeItem(APP_SESSION_STORAGE_KEY);
    else localStorage.setItem(APP_SESSION_STORAGE_KEY, userId);
  } catch {}
}

function getStoredAuthSession() {
  try {
    const raw = localStorage.getItem(APP_AUTH_SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredAuthSession(session) {
  try {
    if (!session) {
      localStorage.removeItem(APP_AUTH_SESSION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(APP_AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {}
}

function getCurrentUserId() {
  return window.__yapSession?.currentUserId || getStoredCurrentUserId() || APP_DEFAULT_CURRENT_USER_ID;
}

function getCurrentUser() {
  return getUserById(getCurrentUserId()) || {
    id: getCurrentUserId(),
    name: 'You',
    color: '#B8D8FF',
    initials: 'Y',
    avatarUrl: null,
  };
}

function getUserById(userId) {
  if (typeof USERS === 'undefined') return null;
  return Object.values(USERS).find(candidate => candidate.id === userId) || null;
}

function setCurrentUserId(userId) {
  window.__yapSession = window.__yapSession || {};
  window.__yapSession.currentUserId = userId || APP_DEFAULT_CURRENT_USER_ID;
  setStoredCurrentUserId(window.__yapSession.currentUserId);
  return window.__yapSession.currentUserId;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDurationClock(ms) {
  if (!ms || ms <= 0) return '0:00';
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function clipWords(text, maxWords = 8) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}...`;
}

function setElementImage(element, imageUrl) {
  if (!element) return;
  element.textContent = '';
  element.style.backgroundImage = imageUrl ? `url('${imageUrl}')` : '';
  element.style.backgroundSize = imageUrl ? 'cover' : '';
  element.style.backgroundPosition = imageUrl ? 'center' : '';
}

function setDisplay(element, isVisible, displayValue = '') {
  if (!element) return;
  element.style.display = isVisible ? displayValue : 'none';
}

function blobFromBase64(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function measureAudioDurationFromUrl(url) {
  return new Promise(resolve => {
    if (!url) {
      resolve(0);
      return;
    }

    const probe = new Audio();
    probe.preload = 'metadata';
    probe.src = url;

    const finish = duration => {
      try {
        probe.pause();
        probe.removeAttribute('src');
        probe.load();
      } catch {}
      resolve(duration > 0 ? Math.round(duration * 1000) : 0);
    };

    probe.addEventListener('loadedmetadata', () => finish(Number(probe.duration) || 0), { once: true });
    probe.addEventListener('error', () => finish(0), { once: true });
  });
}
