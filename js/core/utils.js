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
  return window.__yapSession?.currentUserId || getStoredCurrentUserId() || null;
}

function getCurrentUser() {
  const currentUserId = getCurrentUserId();
  const currentUser = getUserById(currentUserId);
  if (currentUser) {
    return {
      ...currentUser,
      avatarUrl: currentUser.avatarUrl || 'assets/sooim.jpg',
    };
  }
  return {
    id: currentUserId,
    name: 'You',
    color: '#B8D8FF',
    initials: 'Y',
    avatarUrl: 'assets/sooim.jpg',
  };
}

function getUserById(userId) {
  if (typeof USERS === 'undefined') return null;
  return Object.values(USERS).find(candidate => candidate.id === userId) || null;
}

function setCurrentUserId(userId) {
  window.__yapSession = window.__yapSession || {};
  window.__yapSession.currentUserId = userId || null;
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

function setElementImage(element, imageUrl, fallbackText = '') {
  if (!element) return;
  element.classList.toggle('has-image', !!imageUrl);
  element.textContent = imageUrl ? '' : fallbackText;
  element.style.backgroundImage = imageUrl ? `url(${imageUrl})` : '';
  element.style.background = imageUrl ? 'transparent' : '';
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Choose an image first.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('We could not read that image.'));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('We could not process that image.'));
    image.src = dataUrl;
  });
}

function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.86) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('We could not prepare that photo yet.'));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

async function optimizeImageFileForAvatar(file, options = {}) {
  if (!file) throw new Error('Choose an image first.');

  const maxDimension = Number(options.maxDimension || 640);
  const maxBytes = Number(options.maxBytes || 180 * 1024);
  const outputType = String(options.outputType || 'image/jpeg');
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(sourceDataUrl);

  const width = Number(image.naturalWidth || image.width || 0);
  const height = Number(image.naturalHeight || image.height || 0);
  if (!width || !height) {
    throw new Error('We could not read that photo.');
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    throw new Error('Your browser could not prepare that photo.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const qualitySteps = [0.88, 0.8, 0.72, 0.64, 0.56, 0.48, 0.4];
  let bestBlob = await canvasToBlob(canvas, outputType, qualitySteps[0]);

  for (const quality of qualitySteps) {
    const candidate = await canvasToBlob(canvas, outputType, quality);
    bestBlob = candidate;
    if (candidate.size <= maxBytes) break;
  }

  const optimizedDataUrl = await readFileAsDataUrl(bestBlob);
  return {
    dataUrl: optimizedDataUrl,
    width: targetWidth,
    height: targetHeight,
    bytes: bestBlob.size,
    mimeType: bestBlob.type || outputType,
  };
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
