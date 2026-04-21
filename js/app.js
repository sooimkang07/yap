// ═══════════════════════════════════════════════════════
// yAp — App
// Router, screen manager, event wiring
// ═══════════════════════════════════════════════════════

// ── App state ─────────────────────────────────────────
const AppState = {
  screen:     'splash',    // current screen id
  activeChat: null,        // chat object
  chatsSearchQuery: '',
  supabaseOk: false,
  contactsConnected: false,
  conversationHydrating: null,
  conversationHydratedAt: 0,
  recording: {
    manager: null,
    phase:   'idle',       // idle | recording | stopped | sending
  },
};

// ── DOM refs ──────────────────────────────────────────
const DOM = {};

function cacheDOM() {
  // Screens
  DOM.screens = {
    splash:      document.getElementById('screen-splash'),
    permission:  document.getElementById('screen-contacts-permission'),
    chats:       document.getElementById('screen-chats'),
    chat:        document.getElementById('screen-chat'),
  };

  // Chats screen
  DOM.chatsGrid  = document.getElementById('chats-grid');
  DOM.chatsEmptyState = document.getElementById('chats-empty-state');
  DOM.selfAvatar = document.getElementById('self-avatar');
  DOM.permissionSelfAvatar = document.getElementById('permission-self-avatar');

  // Chat screen
  DOM.chatTitle      = document.getElementById('chat-title');
  DOM.chatMemberPips = document.getElementById('chat-member-pips');
  DOM.chatEmpty      = document.getElementById('chat-empty');
  DOM.chatTopics     = document.getElementById('chat-topics');
  DOM.chatProcessing = document.getElementById('chat-processing');
  DOM.chatPresence   = document.getElementById('chat-presence');

  // Recording overlay
  DOM.overlay           = document.getElementById('recording-overlay');
  DOM.recTimer          = document.getElementById('rec-timer');
  DOM.waveformVideo     = document.getElementById('waveform-video');
  DOM.waveformCanvas    = document.getElementById('waveform-canvas');
  DOM.recLiveTranscript = document.getElementById('rec-live-transcript');
  DOM.recActionsRecording = document.getElementById('rec-actions-recording');
  DOM.recActionsStopped   = document.getElementById('rec-actions-stopped');
  DOM.recActionsSending   = document.getElementById('rec-actions-sending');
  DOM.btnPlay           = document.getElementById('btn-play');

  // Analysis overlay
  DOM.analysisOverlay = document.getElementById('analysis-overlay');
  DOM.analysisBars    = document.getElementById('analysis-bars');
  DOM.analysisLabel   = document.getElementById('analysis-label');
}

// ── Router ─────────────────────────────────────────────
/**
 * Navigate between top-level screens.
 * direction: 'forward' | 'back' | 'fade'
 */
function navigate(toId, direction = 'forward') {
  const from = document.querySelector('.screen.active');
  const to   = DOM.screens[toId] || document.getElementById(`screen-${toId}`);

  if (!to || from === to) return;

  AppState.screen = toId;
  if (from) {
    from.classList.remove('active', 'fade-in', 'entering', 'entering-back', 'leaving-left', 'leaving-right');
    from.style.transform = '';
    from.style.opacity = '';
    from.style.transition = '';
  }
  to.classList.remove('fade-in', 'entering', 'entering-back', 'leaving-left', 'leaving-right');
  to.style.transform = '';
  to.style.opacity = '';
  to.style.transition = '';
  to.classList.add('active');
}

// ── Chats list rendering ───────────────────────────────
function renderChatsList() {
  const showEmptyState = !AppState.contactsConnected;

  DOM.chatsGrid.style.display = showEmptyState ? 'none' : '';
  DOM.chatsEmptyState.style.display = showEmptyState ? 'flex' : 'none';

  DOM.chatsGrid.innerHTML = '';
  DOM.selfAvatar.textContent = '';
  DOM.selfAvatar.style.backgroundImage = `url('${USERS.sooim.avatarUrl}')`;
  DOM.selfAvatar.style.backgroundSize = 'cover';
  DOM.selfAvatar.style.backgroundPosition = 'center';
  if (DOM.permissionSelfAvatar) {
    DOM.permissionSelfAvatar.textContent = '';
    DOM.permissionSelfAvatar.style.backgroundImage = `url('${USERS.sooim.avatarUrl}')`;
    DOM.permissionSelfAvatar.style.backgroundSize = 'cover';
    DOM.permissionSelfAvatar.style.backgroundPosition = 'center';
  }

  if (showEmptyState) return;

  const visibleChats = CHATS.filter(chat => {
    const query = AppState.chatsSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return chat.name.toLowerCase().includes(query);
  });

  visibleChats.forEach(chat => {
    const card = document.createElement('div');
    card.className = 'chat-card chat-card--' + (chat.visual || 'default') + (chat.id === ACTIVE_CHAT_ID ? ' chat-card--besties' : '');
    card.dataset.chatId = chat.id;

    let artHTML = _chatArtHTML(chat);

    // Bottom area: name + badge
    const badgeHTML = chat.unread > 0
      ? `<div class="chat-badge">${chat.unread}</div>`
      : '';

    card.innerHTML = `
      <div class="chat-card__art">${artHTML}</div>
      <div class="chat-card__footer">
        <div class="chat-card__name">${chat.name}</div>
        ${badgeHTML}
      </div>
    `;

    card.addEventListener('click', () => {
      if (chat.active) openChat(chat);
    });

    DOM.chatsGrid.appendChild(card);
  });
}

// Derive readable text color from a light pastel
function _tintColor(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
  return luminance > 0.7 ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.65)';
}

function _chatArtHTML(chat) {
  if (chat.visual === 'besties') {
    return `
      <div class="chat-art-besties">
        <div class="chat-art-besties__avatar chat-art-besties__avatar--main" style="background-image:url('${USERS.chloe.avatarUrl}')"></div>
        <div class="chat-art-besties__avatar chat-art-besties__avatar--secondary" style="background-image:url('${USERS.maria.avatarUrl}')"></div>
      </div>
    `;
  }

  if (chat.visual === 'heart') {
    return `<div class="chat-art-circle chat-art-circle--heart"><span>💕</span></div>`;
  }

  if (chat.visual === 'letters') {
    return `
      <div class="chat-art-circle chat-art-circle--letters">
        <span>I</span>
        <span class="chat-art-circle__bubble">E</span>
      </div>
    `;
  }

  if (chat.visual === 'collage') {
    return `<div class="chat-art-circle chat-art-circle--collage"></div>`;
  }

  if (chat.visual === 'alien') {
    return `<div class="chat-art-circle chat-art-circle--alien"><span>👽</span></div>`;
  }

  if (chat.visual === 'mushroom') {
    return `<div class="chat-art-circle chat-art-circle--mushroom"></div>`;
  }

  return `<div class="chat-art-circle"><span>${chat.emoji || '💬'}</span></div>`;
}

// ── Open a chat ───────────────────────────────────────
async function openChat(chat) {
  AppState.activeChat = chat;

  // Update header
  DOM.chatTitle.textContent = chat.id === ACTIVE_CHAT_ID ? 'besties💛' : chat.name;

  // Member color pips
  DOM.chatMemberPips.innerHTML = chat.members
    .map(u => `<div class="member-pip" style="background-image:url('${u.avatarUrl || ''}'); background-color:${u.color}"></div>`)
    .join('');
  DOM.chatPresence.innerHTML = chat.members
    .filter(u => u.id !== CURRENT_USER.id)
    .map(u => `<div class="chat-presence__avatar" style="background-image:url('${u.avatarUrl || ''}'); background-color:${u.color}"></div>`)
    .join('');
  document.querySelector('#floating-chloe .floating-avatar__photo').style.backgroundImage = `url('${USERS.chloe.avatarUrl}')`;
  document.querySelector('#floating-maria .floating-avatar__photo').style.backgroundImage = `url('${USERS.maria.avatarUrl}')`;

  DOM.chatEmpty.style.display = 'none';
  DOM.chatTopics.style.display = 'none';
  DOM.chatProcessing.style.display = '';
  DOM.chatPresence.style.display = 'none';
  navigate('chat', 'forward');

  await hydrateActiveConversation();

  const existingThreads = Store.getThreads();
  DOM.chatProcessing.style.display = 'none';

  if (existingThreads.length > 0) {
    DOM.chatMemberPips.style.visibility = 'visible';
    DOM.chatEmpty.style.display = 'none';
    renderTopics();
  } else {
    DOM.chatMemberPips.style.visibility = 'hidden';
    DOM.chatEmpty.style.display = '';
    DOM.chatTopics.style.display = 'none';
    DOM.chatPresence.style.display = 'none';
  }

  if (existingThreads.length > 0) {
    DOM.chatPresence.style.display = '';
  }

}

async function hydrateActiveConversation(force = false) {
  if (!AppState.supabaseOk) return Store.getThreads();
  if (!force && AppState.conversationHydrating) return AppState.conversationHydrating;

  const shouldReuse = !force && AppState.conversationHydratedAt && (Date.now() - AppState.conversationHydratedAt) < 5000;
  if (shouldReuse) return Store.getThreads();

  AppState.conversationHydrating = hydrateChatFromSupabase(ACTIVE_CHAT_ID)
    .catch(error => {
      console.warn('[yAp] Conversation hydration failed:', error);
      return Store.getThreads();
    })
    .finally(() => {
      AppState.conversationHydrating = null;
      AppState.conversationHydratedAt = Date.now();
    });

  return AppState.conversationHydrating;
}

// ── Recording overlay ─────────────────────────────────
function openRecordingOverlay() {
  DOM.overlay.classList.add('visible');
  DOM.overlay.setAttribute('aria-hidden', 'false');

  // Reset to recording-ready state
  _showRecRow('recording');
  DOM.recTimer.textContent = '0:00';
  if (DOM.recLiveTranscript) DOM.recLiveTranscript.textContent = 'Listening…';
}

function closeRecordingOverlay() {
  DOM.overlay.classList.remove('visible');
  DOM.overlay.setAttribute('aria-hidden', 'true');
}

function _showRecRow(which) {
  // which: 'recording' | 'stopped' | 'sending'
  DOM.recActionsRecording.classList.toggle('hidden', which !== 'recording');
  DOM.recActionsStopped.classList.toggle('hidden',   which !== 'stopped');
  DOM.recActionsSending.classList.toggle('hidden',   which !== 'sending');
}

// ── Recording flow ────────────────────────────────────
async function startRecording() {
  const mgr = new RecordingManager({
    videoEl: DOM.waveformVideo,
    canvasEl: DOM.waveformCanvas,
    timerEl:  DOM.recTimer,
    transcriptEl: DOM.recLiveTranscript,
  });
  AppState.recording.manager = mgr;

  try {
    await mgr.start();
    AppState.recording.phase = 'recording';
    window.__yapVoiceVisualizerBridge?.setRecording?.(true);
    document.getElementById('btn-mic').classList.add('recording');
  } catch (err) {
    alert(err.message);
    AppState.recording.manager = null;
    window.__yapVoiceVisualizerBridge?.reset?.();
    closeRecordingOverlay();
  }
}

async function stopRecording() {
  const mgr = AppState.recording.manager;
  if (!mgr) return;

  const result = await mgr.stop();
  if (!result) return;

  AppState.recording.phase = 'stopped';
  window.__yapVoiceVisualizerBridge?.setRecording?.(false);
  _showRecRow('stopped');

  // Update timer to show final duration
  DOM.recTimer.textContent = mgr.formatDuration(result.durationMs);
}

async function sendRecording() {
  const mgr = AppState.recording.manager;
  if (!mgr || !mgr.blob) return;
  if (!mgr.blob.size) {
    console.error('[yAp] Cannot send empty recording blob', {
      durationMs: mgr.durationMs || 0,
      mimeType: mgr.blob.type || mgr.mimeType || 'unknown',
      size: mgr.blob.size,
    });
    AnalysisModal.open();
    AnalysisModal.showError('Recording is empty. Try speaking a bit longer.');
    return;
  }

  AppState.recording.phase = 'sending';
  _showRecRow('sending');

  // Capture before manager is discarded
  const blob       = mgr.blob;
  const durationMs = mgr.durationMs || 0;
  // Independent URL that survives mgr.discard()
  const audioUrl   = URL.createObjectURL(blob);

  // Brief dots animation, then hand off to analysis modal
  setTimeout(async () => {
    closeRecordingOverlay();
    document.getElementById('btn-mic').classList.remove('recording');
    window.__yapVoiceVisualizerBridge?.setRecording?.(false);

    mgr.discard();
    AppState.recording.manager = null;
    AppState.recording.phase   = 'idle';

    // Open analysis modal immediately so user sees feedback
    AnalysisModal.open();

    try {
      await Pipeline.run(blob, durationMs, ACTIVE_CHAT_ID, CURRENT_USER.id, audioUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err || 'Something went wrong');
      console.error('[yAp] Pipeline error:', {
        message: errorMessage,
        error: err,
      });
      AnalysisModal.showError(errorMessage);
    }
  }, 520);
}

function discardRecording() {
  const mgr = AppState.recording.manager;
  if (mgr) mgr.discard();
  AppState.recording.manager = null;
  AppState.recording.phase   = 'idle';
  window.__yapVoiceVisualizerBridge?.reset?.();
  closeRecordingOverlay();
  document.getElementById('btn-mic').classList.remove('recording');
}

function cancelRecording() {
  const mgr = AppState.recording.manager;
  if (!mgr) {
    closeRecordingOverlay();
    return;
  }
  if (mgr.phase === 'recording') {
    mgr.stop().then(() => {
      window.__yapVoiceVisualizerBridge?.setRecording?.(false);
      mgr.discard();
      AppState.recording.manager = null;
      AppState.recording.phase   = 'idle';
    });
  } else {
    mgr.discard();
    AppState.recording.manager = null;
    AppState.recording.phase   = 'idle';
  }
  window.__yapVoiceVisualizerBridge?.reset?.();
  closeRecordingOverlay();
  document.getElementById('btn-mic').classList.remove('recording');
}

// ── Event wiring ──────────────────────────────────────
function wireEvents() {

  // ── Contacts permission screen ──
  document.getElementById('btn-allow-contacts').addEventListener('click', () => {
    AppState.contactsConnected = true;
    navigate('chats', 'back');
    setTimeout(renderChatsList, 50);
  });
  document.getElementById('btn-select-contacts').addEventListener('click', () => {
    AppState.contactsConnected = true;
    navigate('chats', 'back');
    setTimeout(renderChatsList, 50);
  });
  document.getElementById('btn-deny-contacts').addEventListener('click', () => {
    navigate('chats', 'back');
    setTimeout(renderChatsList, 50);
  });

  document.getElementById('btn-start-chat').addEventListener('click', () => {
    navigate('contacts-permission', 'forward');
  });

  document.getElementById('btn-search').addEventListener('click', () => {
    const nextQuery = window.prompt('Search chats', AppState.chatsSearchQuery || '');
    if (nextQuery === null) return;
    AppState.chatsSearchQuery = nextQuery;
    renderChatsList();
  });

  // ── Chats screen ──
  // (Cards are wired in renderChatsList)

  // ── Chat screen ──
  document.getElementById('btn-back').addEventListener('click', () => {
    navigate('chats', 'back');
  });

  document.getElementById('btn-mic').addEventListener('click', () => {
    openRecordingOverlay();
    startRecording();
  });

  // ── Recording overlay ──
  document.getElementById('btn-rec-cancel').addEventListener('click', cancelRecording);
  document.getElementById('btn-rec-exit').addEventListener('click', cancelRecording);
  document.getElementById('btn-stop').addEventListener('click', stopRecording);
  document.getElementById('btn-discard').addEventListener('click', discardRecording);

  document.getElementById('btn-play').addEventListener('click', () => {
    const mgr = AppState.recording.manager;
    if (!mgr) return;
    const isNowPlaying = mgr.togglePlay();
    DOM.btnPlay.classList.toggle('playing', isNowPlaying);

    // SVG: swap play ▶ for pause ⏸
    DOM.btnPlay.innerHTML = isNowPlaying
      ? `<svg width="28" height="30" viewBox="0 0 28 30" fill="none">
           <rect x="6" y="4" width="5" height="22" rx="2" fill="currentColor"/>
           <rect x="17" y="4" width="5" height="22" rx="2" fill="currentColor"/>
         </svg>`
      : `<svg width="28" height="30" viewBox="0 0 28 30" fill="none">
           <path d="M5 3.5L23 15L5 26.5V3.5Z" fill="currentColor"/>
         </svg>`;

    // When audio ends, reset button
    if (mgr.audioEl) {
      mgr.audioEl.onended = () => {
        DOM.btnPlay.classList.remove('playing');
        DOM.btnPlay.innerHTML = `<svg width="28" height="30" viewBox="0 0 28 30" fill="none">
          <path d="M5 3.5L23 15L5 26.5V3.5Z" fill="currentColor"/>
        </svg>`;
      };
    }
  });

  document.getElementById('btn-send').addEventListener('click', sendRecording);

  // Close recording overlay when tapping backdrop
  document.querySelector('#recording-overlay .recording-backdrop').addEventListener('click', () => {
    if (AppState.recording.phase === 'recording') return;
    if (AppState.recording.phase === 'sending')   return;
    cancelRecording();
  });

  // Analysis modal cancel
  document.getElementById('btn-analysis-cancel').addEventListener('click', () => {
    AnalysisModal.close();
  });
}

// ── Pipeline event listeners ──────────────────────────
function wirePipelineEvents() {
  // Segments arrive from API → animate in analysis modal, then render chat
  document.addEventListener('yap:pipeline:segments', e => {
    AnalysisModal.animateSegments(e.detail.segments, () => {
      // Animation complete → render topic cards
      renderTopics();
    });
  });

  // A Chloe/Maria response arrived → add bar to matching topic card
  document.addEventListener('yap:response:arrived', e => {
    addReplyToTopic(e.detail.threadId, e.detail.message);
  });
}

// ── Boot ──────────────────────────────────────────────
async function boot() {
  cacheDOM();
  wireEvents();
  wirePipelineEvents();

  AppState.supabaseOk = initSupabase();
  if (AppState.supabaseOk) {
    hydrateActiveConversation(true);
  }

  // Splash auto-advance
  setTimeout(() => {
    navigate('chats', 'fade');
    setTimeout(renderChatsList, 50);
  }, 1800);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
