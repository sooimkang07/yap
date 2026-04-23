// ═══════════════════════════════════════════════════════
// yAp — App
// Router, screen manager, event wiring
// ═══════════════════════════════════════════════════════

// ── App state ─────────────────────────────────────────
const AppState = {
  screen:     'splash',    // current screen id
  activeChat: null,        // chat object
  chats: [],
  chatsSearchQuery: '',
  chatsSearchOpen: false,
  supabaseOk: false,
  contactsConnected: false,
  conversationHydrating: null,
  conversationHydratedAt: 0,
  auth: {
    session: null,
    pendingPhone: '',
    pendingInviteToken: '',
    pendingChatId: '',
  },
  onboarding: {
    pendingMembers: [],
    contactsTarget: 'create-group',
  },
  replyTargetThreadId: null,
  recording: {
    manager: null,
    phase:   'idle',       // idle | recording | stopped | sending
  },
};

// ── DOM refs ──────────────────────────────────────────
const DOM = {};
const PLAY_BUTTON_ICONS = {
  play: `<svg width="28" height="30" viewBox="0 0 28 30" fill="none">
    <path d="M5 3.5L23 15L5 26.5V3.5Z" fill="currentColor"/>
  </svg>`,
  pause: `<svg width="28" height="30" viewBox="0 0 28 30" fill="none">
    <rect x="6" y="4" width="5" height="22" rx="2" fill="currentColor"/>
    <rect x="17" y="4" width="5" height="22" rx="2" fill="currentColor"/>
  </svg>`,
};

function cacheDOM() {
  // Screens
  DOM.screens = {
    splash:      document.getElementById('screen-splash'),
    welcome:     document.getElementById('screen-welcome'),
    authPhone:   document.getElementById('screen-auth-phone'),
    authVerify:  document.getElementById('screen-auth-verify'),
    profileSetup: document.getElementById('screen-profile-setup'),
    createGroup: document.getElementById('screen-create-group'),
    contactsHub: document.getElementById('screen-contacts-hub'),
    profile:      document.getElementById('screen-profile'),
    groupSettings: document.getElementById('screen-group-settings'),
    permission:  document.getElementById('screen-contacts-permission'),
    chats:       document.getElementById('screen-chats'),
    chat:        document.getElementById('screen-chat'),
  };

  // Entry flow
  DOM.btnGetStarted = document.getElementById('btn-get-started');
  DOM.formAuthPhone = document.getElementById('form-auth-phone');
  DOM.inputAuthPhone = document.getElementById('input-auth-phone');
  DOM.btnSendCode = document.getElementById('btn-send-code');
  DOM.btnAuthPhoneBack = document.getElementById('btn-auth-phone-back');
  DOM.authPhoneFeedback = document.getElementById('auth-phone-feedback');
  DOM.formAuthVerify = document.getElementById('form-auth-verify');
  DOM.inputAuthCode = document.getElementById('input-auth-code');
  DOM.btnVerifyCode = document.getElementById('btn-verify-code');
  DOM.btnAuthVerifyBack = document.getElementById('btn-auth-verify-back');
  DOM.authVerifyFeedback = document.getElementById('auth-verify-feedback');
  DOM.authVerifySubtitle = document.getElementById('auth-verify-subtitle');
  DOM.formProfileSetup = document.getElementById('form-profile-setup');
  DOM.inputProfileName = document.getElementById('input-profile-name');
  DOM.inputProfileAvatar = document.getElementById('input-profile-avatar');
  DOM.btnSaveProfile = document.getElementById('btn-save-profile');
  DOM.profileSetupFeedback = document.getElementById('profile-setup-feedback');
  DOM.formCreateGroup = document.getElementById('form-create-group');
  DOM.btnCreateGroupBack = document.getElementById('btn-create-group-back');
  DOM.inputGroupName = document.getElementById('input-group-name');
  DOM.inputMemberName = document.getElementById('input-member-name');
  DOM.inputMemberPhone = document.getElementById('input-member-phone');
  DOM.btnAddGroupMember = document.getElementById('btn-add-group-member');
  DOM.btnBrowseContacts = document.getElementById('btn-browse-contacts');
  DOM.btnImportVCard = document.getElementById('btn-import-vcard');
  DOM.inputContactFile = document.getElementById('input-contact-file');
  DOM.groupMemberList = document.getElementById('group-member-list');
  DOM.btnCreateGroup = document.getElementById('btn-create-group');
  DOM.createGroupFeedback = document.getElementById('create-group-feedback');
  DOM.btnContactsHubBack = document.getElementById('btn-contacts-hub-back');
  DOM.btnContactsHubDevice = document.getElementById('btn-contacts-hub-device');
  DOM.btnContactsImportVCard = document.getElementById('btn-contacts-import-vcard');
  DOM.inputContactsHubFile = document.getElementById('input-contacts-hub-file');
  DOM.contactsHubList = document.getElementById('contacts-hub-list');
  DOM.contactsHubFeedback = document.getElementById('contacts-hub-feedback');
  DOM.btnProfileBack = document.getElementById('btn-profile-back');
  DOM.formProfileManage = document.getElementById('form-profile-manage');
  DOM.profileSettingsAvatar = document.getElementById('profile-settings-avatar');
  DOM.profileSettingsName = document.getElementById('profile-settings-name');
  DOM.profileSettingsPhone = document.getElementById('profile-settings-phone');
  DOM.inputManageProfileName = document.getElementById('input-manage-profile-name');
  DOM.inputManageProfileAvatar = document.getElementById('input-manage-profile-avatar');
  DOM.btnUpdateProfile = document.getElementById('btn-update-profile');
  DOM.btnSignOut = document.getElementById('btn-sign-out');
  DOM.profileManageFeedback = document.getElementById('profile-manage-feedback');
  DOM.btnGroupSettingsBack = document.getElementById('btn-group-settings-back');
  DOM.formGroupSettings = document.getElementById('form-group-settings');
  DOM.inputGroupSettingsName = document.getElementById('input-group-settings-name');
  DOM.inputGroupMemberName = document.getElementById('input-group-member-name');
  DOM.inputGroupMemberPhone = document.getElementById('input-group-member-phone');
  DOM.btnAddGroupSettingsMember = document.getElementById('btn-add-group-settings-member');
  DOM.btnGroupSettingsBrowseContacts = document.getElementById('btn-group-settings-browse-contacts');
  DOM.groupSettingsMembers = document.getElementById('group-settings-members');
  DOM.groupSettingsInvites = document.getElementById('group-settings-invites');
  DOM.btnSaveGroupSettings = document.getElementById('btn-save-group-settings');
  DOM.btnLeaveGroup = document.getElementById('btn-leave-group');
  DOM.groupSettingsFeedback = document.getElementById('group-settings-feedback');

  // Chats screen
  DOM.chatsGrid  = document.getElementById('chats-grid');
  DOM.chatsEmptyState = document.getElementById('chats-empty-state');
  DOM.chatsSearch = document.getElementById('chats-search');
  DOM.inputChatSearch = document.getElementById('input-chat-search');
  DOM.btnClearSearch = document.getElementById('btn-clear-search');
  DOM.selfAvatar = document.getElementById('self-avatar');
  DOM.permissionSelfAvatar = document.getElementById('permission-self-avatar');
  DOM.btnStartChat = document.getElementById('btn-start-chat');
  DOM.btnSearch = document.getElementById('btn-search');
  DOM.btnAllowContacts = document.getElementById('btn-allow-contacts');
  DOM.btnSelectContacts = document.getElementById('btn-select-contacts');
  DOM.btnDenyContacts = document.getElementById('btn-deny-contacts');

  // Chat screen
  DOM.chatTitle      = document.getElementById('chat-title');
  DOM.chatMemberPips = document.getElementById('chat-member-pips');
  DOM.chatEmpty      = document.getElementById('chat-empty');
  DOM.chatTopics     = document.getElementById('chat-topics');
  DOM.chatProcessing = document.getElementById('chat-processing');
  DOM.chatPresence   = document.getElementById('chat-presence');
  DOM.btnBack        = document.getElementById('btn-back');
  DOM.btnMic         = document.getElementById('btn-mic');
  DOM.btnChatMore    = document.getElementById('btn-chat-more');
  DOM.floatingChloePhoto = document.querySelector('#floating-chloe .floating-avatar__photo');
  DOM.floatingMariaPhoto = document.querySelector('#floating-maria .floating-avatar__photo');

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
  DOM.btnRecCancel      = document.getElementById('btn-rec-cancel');
  DOM.btnRecExit        = document.getElementById('btn-rec-exit');
  DOM.btnStop           = document.getElementById('btn-stop');
  DOM.btnDiscard        = document.getElementById('btn-discard');
  DOM.btnSend           = document.getElementById('btn-send');
  DOM.recordingBackdrop = document.querySelector('#recording-overlay .recording-backdrop');

  // Analysis overlay
  DOM.analysisOverlay = document.getElementById('analysis-overlay');
  DOM.analysisBars    = document.getElementById('analysis-bars');
  DOM.analysisLabel   = document.getElementById('analysis-label');
  DOM.btnAnalysisCancel = document.getElementById('btn-analysis-cancel');
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
  const chats = AppState.chats.length ? AppState.chats : [];
  const showEmptyState = chats.length === 0;
  const query = AppState.chatsSearchQuery.trim().toLowerCase();
  const currentUser = getCurrentUser();
  const visibleChats = chats.filter(chat => !query || chat.name.toLowerCase().includes(query));
  const showSearch = AppState.chatsSearchOpen || !!query;

  setDisplay(DOM.chatsGrid, !showEmptyState, 'grid');
  setDisplay(DOM.chatsEmptyState, showEmptyState, 'flex');
  DOM.chatsSearch.hidden = !showSearch;
  if (DOM.inputChatSearch && DOM.inputChatSearch.value !== AppState.chatsSearchQuery) {
    DOM.inputChatSearch.value = AppState.chatsSearchQuery;
  }

  setElementImage(DOM.selfAvatar, currentUser.avatarUrl);
  setElementImage(DOM.permissionSelfAvatar, currentUser.avatarUrl);

  if (showEmptyState) {
    DOM.chatsGrid.innerHTML = '';
    return;
  }

  DOM.chatsGrid.innerHTML = visibleChats.map(chat => {
    const artHTML = _chatArtHTML(chat);
    const badgeHTML = chat.unread > 0
      ? `<div class="chat-badge">${chat.unread}</div>`
      : '';

    return `
      <div class="chat-card chat-card--${chat.visual || 'default'}${chat.id === ACTIVE_CHAT_ID ? ' chat-card--besties' : ''}" data-chat-id="${chat.id}">
        <div class="chat-card__art">${artHTML}</div>
        <div class="chat-card__footer">
          <div class="chat-card__name">${chat.name}</div>
          ${badgeHTML}
        </div>
      </div>
    `;
  }).join('');
}

function openChatsSearch() {
  AppState.chatsSearchOpen = true;
  renderChatsList();
  requestAnimationFrame(() => DOM.inputChatSearch?.focus());
}

function closeChatsSearch() {
  AppState.chatsSearchOpen = false;
  AppState.chatsSearchQuery = '';
  if (DOM.inputChatSearch) DOM.inputChatSearch.value = '';
  renderChatsList();
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
  DOM.chatTitle.textContent = chat.name;

  // Member color pips
  DOM.chatMemberPips.innerHTML = chat.members
    .map(u => `<div class="member-pip" style="background-image:url('${u.avatarUrl || ''}'); background-color:${u.color}"></div>`)
    .join('');
  DOM.chatPresence.innerHTML = chat.members
    .filter(u => u.id !== getCurrentUserId())
    .map(u => `<div class="chat-presence__avatar" style="background-image:url('${u.avatarUrl || ''}'); background-color:${u.color}"></div>`)
    .join('');
  setElementImage(DOM.floatingChloePhoto, USERS.chloe.avatarUrl);
  setElementImage(DOM.floatingMariaPhoto, USERS.maria.avatarUrl);

  setDisplay(DOM.chatEmpty, false);
  setDisplay(DOM.chatTopics, false);
  setDisplay(DOM.chatProcessing, true, 'flex');
  setDisplay(DOM.chatPresence, false);
  navigate('chat', 'forward');

  await hydrateActiveConversation(true);

  const existingThreads = Store.getThreads();
  setDisplay(DOM.chatProcessing, false);

  if (existingThreads.length > 0) {
    DOM.chatMemberPips.style.visibility = 'visible';
    setDisplay(DOM.chatEmpty, false);
    renderTopics();
  } else {
    DOM.chatMemberPips.style.visibility = 'hidden';
    setDisplay(DOM.chatEmpty, true);
    setDisplay(DOM.chatTopics, false);
    setDisplay(DOM.chatPresence, false);
  }

  if (existingThreads.length > 0) {
    setDisplay(DOM.chatPresence, true, 'flex');
  }
}

async function hydrateActiveConversation(force = false) {
  if (!AppState.supabaseOk || !AppState.activeChat?.id) return Store.getThreads();
  if (!force && AppState.conversationHydrating) return AppState.conversationHydrating;

  const shouldReuse = !force && AppState.conversationHydratedAt && (Date.now() - AppState.conversationHydratedAt) < 5000;
  if (shouldReuse) return Store.getThreads();

  AppState.conversationHydrating = hydrateChatFromSupabase(AppState.activeChat.id)
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
  if (DOM.recLiveTranscript) DOM.recLiveTranscript.textContent = APP_COPY.listening;
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

function _setRecordingIdleState() {
  AppState.recording.manager = null;
  AppState.recording.phase = 'idle';
  window.__yapVoiceVisualizerBridge?.reset?.();
  window.__yapVoiceVisualizerBridge?.setRecording?.(false);
  DOM.btnMic.classList.remove('recording');
}

function clearReplyTarget() {
  AppState.replyTargetThreadId = null;
}

function _navigateToChats() {
  navigate('chats', 'back');
  requestAnimationFrame(renderChatsList);
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
    DOM.btnMic.classList.add('recording');
  } catch (err) {
    alert(err.message);
    _setRecordingIdleState();
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
  const replyTargetThreadId = AppState.replyTargetThreadId;

  // Brief dots animation, then hand off to analysis modal
  setTimeout(async () => {
    closeRecordingOverlay();

    mgr.discard();
    _setRecordingIdleState();

    try {
      if (replyTargetThreadId) {
        const replyMessage = await Pipeline.replyToThread(
          blob,
          durationMs,
          AppState.activeChat?.id || ACTIVE_CHAT_ID,
          getCurrentUserId(),
          replyTargetThreadId,
          audioUrl
        );
        clearReplyTarget();
        renderTopics();
        addReplyToTopic(replyTargetThreadId, replyMessage);
        return;
      }

      // Open analysis modal immediately so user sees feedback
      AnalysisModal.open();
      await Pipeline.run(blob, durationMs, AppState.activeChat?.id || ACTIVE_CHAT_ID, getCurrentUserId(), audioUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err || 'Something went wrong');
      console.error('[yAp] Pipeline error:', {
        message: errorMessage,
        error: err,
      });
      if (replyTargetThreadId) {
        alert(errorMessage);
      } else {
        AnalysisModal.showError(errorMessage);
      }
    } finally {
      if (replyTargetThreadId) {
        clearReplyTarget();
      }
    }
  }, 520);
}

function discardRecording() {
  const mgr = AppState.recording.manager;
  if (mgr) mgr.discard();
  clearReplyTarget();
  _setRecordingIdleState();
  closeRecordingOverlay();
}

function cancelRecording() {
  const mgr = AppState.recording.manager;
  if (!mgr) {
    closeRecordingOverlay();
    return;
  }
  if (mgr.phase === 'recording') {
    mgr.stop().then(() => {
      mgr.discard();
      clearReplyTarget();
      _setRecordingIdleState();
    });
  } else {
    mgr.discard();
    clearReplyTarget();
    _setRecordingIdleState();
  }
  closeRecordingOverlay();
}

function setFeedback(element, message = '', tone = '') {
  if (!element) return;
  element.textContent = message;
  if (tone) element.dataset.tone = tone;
  else delete element.dataset.tone;
}

function setButtonBusy(button, isBusy, busyLabel) {
  if (!button) return;
  if (!button.dataset.idleLabel) {
    button.dataset.idleLabel = button.textContent;
  }
  button.disabled = isBusy;
  button.textContent = isBusy ? busyLabel : button.dataset.idleLabel;
}

function resetCreateGroupComposer() {
  AppState.onboarding.pendingMembers = [];
  if (DOM.formCreateGroup) DOM.formCreateGroup.reset();
  renderPendingGroupMembers();
  setFeedback(DOM.createGroupFeedback, '');
}

function renderPendingGroupMembers() {
  if (!DOM.groupMemberList) return;

  if (!AppState.onboarding.pendingMembers.length) {
    DOM.groupMemberList.innerHTML = `
      <div class="entry-member-empty">
        Add at least one real phone number so the group can actually route invites and membership.
      </div>
    `;
    return;
  }

  DOM.groupMemberList.innerHTML = AppState.onboarding.pendingMembers.map(member => `
    <div class="entry-member-pill" data-member-phone="${escapeHtml(member.phone)}">
      <div class="entry-member-pill__meta">
        <span class="entry-member-pill__name">${escapeHtml(member.name || 'New member')}</span>
        <span class="entry-member-pill__phone">${escapeHtml(member.phone)}</span>
      </div>
      <button class="entry-member-pill__remove" type="button" data-remove-member="${escapeHtml(member.phone)}" aria-label="Remove ${escapeHtml(member.name || member.phone)}">×</button>
    </div>
  `).join('');
}

function addPendingGroupMember() {
  const phone = normalizePhoneNumber(DOM.inputMemberPhone?.value || '');
  const name = String(DOM.inputMemberName?.value || '').trim();

  if (!phone) {
    setFeedback(DOM.createGroupFeedback, 'Add a valid phone number for each member.', 'error');
    DOM.inputMemberPhone?.focus();
    return;
  }

  if (AppState.onboarding.pendingMembers.some(member => member.phone === phone)) {
    setFeedback(DOM.createGroupFeedback, 'That phone number is already in this group.', 'error');
    return;
  }

  AppState.onboarding.pendingMembers.push({
    name: name || phone,
    phone,
  });

  DOM.inputMemberName.value = '';
  DOM.inputMemberPhone.value = '';
  setFeedback(DOM.createGroupFeedback, '');
  renderPendingGroupMembers();
}

async function importContactsFromVCard(file) {
  if (!file) return;

  const text = await file.text();
  const contacts = parseVCardContacts(text);
  if (!contacts.length) {
    throw new Error('We could not find any phone numbers in that vCard file.');
  }

  const newContacts = contacts.filter(contact =>
    !AppState.onboarding.pendingMembers.some(existing => existing.phone === contact.phone)
  );

  if (!newContacts.length) {
    throw new Error('Those contacts are already in this group draft.');
  }

  AppState.onboarding.pendingMembers.push(...newContacts);
  renderPendingGroupMembers();

  if (AppState.supabaseOk) {
    await saveImportedContacts(getCurrentUserId(), newContacts, 'icloud_vcard');
  }

  setFeedback(DOM.createGroupFeedback, `Imported ${newContacts.length} contact${newContacts.length === 1 ? '' : 's'} from vCard.`, 'success');
}

async function importContactsIntoHub(file) {
  if (!file) return;

  const text = await file.text();
  const contacts = parseVCardContacts(text);
  if (!contacts.length) {
    throw new Error('We could not find any phone numbers in that vCard file.');
  }

  if (AppState.supabaseOk) {
    await saveImportedContacts(getCurrentUserId(), contacts, 'icloud_vcard');
  } else {
    contacts.forEach(contact => {
      if (!AppState.onboarding.pendingMembers.some(existing => existing.phone === contact.phone)) {
        AppState.onboarding.pendingMembers.push(contact);
      }
    });
  }

  await renderContactsHub();
  setFeedback(DOM.contactsHubFeedback, `Imported ${contacts.length} contact${contacts.length === 1 ? '' : 's'} from vCard.`, 'success');
}

async function renderContactsHub() {
  if (!DOM.contactsHubList) return;

  let contacts = [];
  let pendingInvites = [];
  if (AppState.supabaseOk) {
    contacts = await getImportedContactsForUser(getCurrentUserId());
    if (AppState.onboarding.contactsTarget === 'group-settings' && AppState.activeChat?.id) {
      pendingInvites = await getInvitationsForChat(AppState.activeChat.id);
    }
  } else {
    contacts = AppState.onboarding.pendingMembers.map((member, index) => ({
      id: `local-contact-${index}`,
      display_name: member.name,
      phone_e164: member.phone,
      matchedUser: null,
    }));
  }

  // Deduplicate by phone number, keeping the most recent entry per number.
  const seenPhones = new Set();
  contacts = contacts.filter(contact => {
    const phone = contact.phone_e164;
    if (!phone || seenPhones.has(phone)) return false;
    seenPhones.add(phone);
    return true;
  });

  if (!contacts.length) {
    DOM.contactsHubList.innerHTML = '<div class="settings-list__empty">No imported contacts yet. Import a vCard to start building your group.</div>';
    return;
  }

  DOM.contactsHubList.innerHTML = contacts.map(contact => {
    const phone = contact.phone_e164 || '';
    const inGroup = !!AppState.activeChat?.members?.some(member => member.phoneE164 === phone);
    const invited = !!pendingInvites.some(invite => invite.phone_e164 === phone);
    const selected = AppState.onboarding.pendingMembers.some(member => member.phone === phone);
    const matchedUser = contact.matchedUser;
    const initials = buildUserInitials(contact.display_name || phone || 'C');
    const status = AppState.onboarding.contactsTarget === 'group-settings'
      ? (inGroup ? 'In group' : invited ? 'Invited' : matchedUser ? 'On yAp' : 'Invite')
      : (selected ? 'Selected' : matchedUser ? 'On yAp' : 'Invite');
    const isDisabled = AppState.onboarding.contactsTarget === 'group-settings'
      ? inGroup || invited
      : selected;
    const buttonLabel = AppState.onboarding.contactsTarget === 'group-settings'
      ? (inGroup ? 'Added' : invited ? 'Pending' : 'Add')
      : (selected ? 'Selected' : 'Add');

    return `
      <div class="contacts-hub-row" data-contact-phone="${escapeHtml(phone)}">
        <div class="contacts-hub-row__avatar" style="${matchedUser?.avatarUrl ? `background-image:url('${matchedUser.avatarUrl}')` : ''}">${escapeHtml(initials)}</div>
        <div class="contacts-hub-row__meta">
          <div class="contacts-hub-row__name">${escapeHtml(contact.display_name || matchedUser?.name || 'Unknown contact')}</div>
          <div class="contacts-hub-row__sub">${escapeHtml(phone)}</div>
        </div>
        <div class="contacts-hub-row__actions">
          <span class="contacts-hub-row__status">${status}</span>
          <button class="contacts-hub-row__add" type="button" data-add-contact="${escapeHtml(phone)}" ${isDisabled ? 'disabled' : ''}>
            ${buttonLabel}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function refreshChats() {
  if (!AppState.supabaseOk) {
    AppState.chats = CHATS.filter(chat => chat.members.some(member => member.id === getCurrentUserId()));
    AppState.contactsConnected = AppState.chats.length > 0;
    return AppState.chats;
  }

  AppState.chats = await getChatsForUser(getCurrentUserId());
  AppState.contactsConnected = AppState.chats.length > 0;
  return AppState.chats;
}

function prefillProfileForm(user) {
  if (!user) return;
  if (DOM.inputProfileName && !DOM.inputProfileName.value) {
    DOM.inputProfileName.value = user.name || '';
  }
  if (DOM.inputProfileAvatar && !DOM.inputProfileAvatar.value) {
    DOM.inputProfileAvatar.value = user.avatarUrl || '';
  }
}

function renderProfileSettings() {
  const currentUser = getCurrentUser();
  setElementImage(DOM.profileSettingsAvatar, currentUser.avatarUrl);
  DOM.profileSettingsName.textContent = currentUser.name || 'You';
  DOM.profileSettingsPhone.textContent = currentUser.phoneE164 || AppState.auth.session?.user?.phone || 'Phone sign-in';
  DOM.inputManageProfileName.value = currentUser.name || '';
  DOM.inputManageProfileAvatar.value = currentUser.avatarUrl || '';
  setFeedback(DOM.profileManageFeedback, '');
}

function renderGroupSettings(invites = []) {
  const chat = AppState.activeChat;
  if (!chat) return;

  DOM.inputGroupSettingsName.value = chat.name || '';
  DOM.groupSettingsMembers.innerHTML = (chat.members || []).map(member => `
    <div class="settings-list__row">
      <div class="settings-avatar" style="background-image:url('${member.avatarUrl || ''}'); background-color:${member.color || '#eee'}"></div>
      <div class="settings-list__meta">
        <div class="settings-list__title">${escapeHtml(member.name)}</div>
        <div class="settings-list__sub">${escapeHtml(member.phoneE164 || '')}</div>
      </div>
      <div class="settings-list__actions">
        <div class="settings-list__badge">${member.id === getCurrentUserId() ? 'You' : 'Member'}</div>
        ${member.id !== getCurrentUserId()
          ? `<button class="settings-list__action" type="button" data-remove-member="${escapeHtml(member.id)}">Remove</button>`
          : ''}
      </div>
    </div>
  `).join('') || '<div class="settings-list__empty">No members yet.</div>';

  DOM.groupSettingsInvites.innerHTML = invites.length
    ? invites.map(invite => `
      <div class="settings-list__row">
        <div class="settings-list__meta">
          <div class="settings-list__title">${escapeHtml(invite.invitee_name || invite.phone_e164 || 'Pending invite')}</div>
          <div class="settings-list__sub">${escapeHtml(invite.phone_e164 || invite.email || '')}</div>
        </div>
        <div class="settings-list__actions">
          <div class="settings-list__badge">${escapeHtml(invite.status)}</div>
          <button class="settings-list__action" type="button" data-resend-invite="${escapeHtml(invite.id)}">Resend</button>
          <button class="settings-list__action" type="button" data-revoke-invite="${escapeHtml(invite.id)}">Revoke</button>
        </div>
      </div>
    `).join('')
    : '<div class="settings-list__empty">No pending invites.</div>';

  setFeedback(DOM.groupSettingsFeedback, '');
}

async function openProfileScreen() {
  renderProfileSettings();
  navigate('profile', 'forward');
}

async function openGroupSettingsScreen() {
  if (!AppState.activeChat) return;
  const invites = AppState.supabaseOk ? await getInvitationsForChat(AppState.activeChat.id) : [];
  renderGroupSettings(invites);
  navigate('group-settings', 'forward');
}

async function refreshActiveChatAndSettings() {
  await refreshChats();
  if (!AppState.activeChat) return;
  AppState.activeChat = AppState.chats.find(chat => chat.id === AppState.activeChat.id) || AppState.activeChat;
  const invites = AppState.supabaseOk ? await getInvitationsForChat(AppState.activeChat.id) : [];
  renderGroupSettings(invites);
  renderChatsList();
}

async function openContactsHub(target = 'create-group', autoImport = false) {
  AppState.onboarding.contactsTarget = target;
  setFeedback(DOM.contactsHubFeedback, '');
  await renderContactsHub();
  navigate('contacts-hub', 'forward');

  // If no contacts are loaded yet (or caller asked), auto-trigger the file picker
  // so the user doesn't have to figure out what to tap next.
  if (autoImport || !DOM.contactsHubList?.querySelector('.contacts-hub-row')) {
    setTimeout(() => DOM.inputContactsHubFile?.click(), 300);
  }
}


async function routeAuthenticatedUser() {
  const authSession = AppState.auth.session;
  if (!authSession) {
    navigate('welcome', 'fade');
    return;
  }

  const appUser = await ensureAppUserFromAuthSession(authSession);
  if (!appUser?.id) {
    // DB lookup/insert failed, but the user IS verified (Twilio OTP succeeded).
    // Send them to profile-setup to complete registration; saveUserProfile will
    // create the DB record via upsert when they submit.
    const hasVerifiedPhone = !!(authSession?.user?.phone || authSession?.provider === 'twilio-verify');
    if (hasVerifiedPhone) {
      const pendingId = generateAppRecordId('user');
      setCurrentUserId(pendingId);
      navigate('profile-setup', 'fade');
      return;
    }
    navigate('welcome', 'fade');
    return;
  }

  setCurrentUserId(appUser.id);
  prefillProfileForm(appUser);

  if (!appUser.profileCompleted) {
    navigate('profile-setup', 'fade');
    return;
  }

  let joinedChatId = null;
  if (AppState.auth.pendingInviteToken) {
    joinedChatId = await acceptInviteToken(AppState.auth.pendingInviteToken, appUser.id);
    if (joinedChatId) {
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url.toString());
      AppState.auth.pendingInviteToken = '';
    }
  }

  await refreshChats();

  if (!AppState.chats.length) {
    navigate('create-group', 'fade');
    renderPendingGroupMembers();
    return;
  }

  if (AppState.auth.pendingChatId) {
    const linkedChat = AppState.chats.find(chat => chat.id === AppState.auth.pendingChatId);
    if (linkedChat) {
      await openChat(linkedChat);
      return;
    }
  }

  if (joinedChatId) {
    const invitedChat = AppState.chats.find(chat => chat.id === joinedChatId);
    if (invitedChat) {
      await openChat(invitedChat);
      return;
    }
  }

  navigate('chats', 'fade');
  requestAnimationFrame(renderChatsList);
}

async function resolveInitialRoute() {
  const params = new URLSearchParams(window.location.search);
  AppState.auth.pendingInviteToken = params.get('invite') || '';
  AppState.auth.pendingChatId = params.get('chat') || '';

  if (!AppState.supabaseOk) {
    AppState.chats = CHATS.filter(chat => chat.members.some(member => member.id === getCurrentUserId()));
    navigate('chats', 'fade');
    requestAnimationFrame(renderChatsList);
    return;
  }

  AppState.auth.session = await getAuthSession();
  await routeAuthenticatedUser();
}

// ── Event wiring ──────────────────────────────────────
function wireEvents() {
  DOM.btnGetStarted?.addEventListener('click', () => {
    setFeedback(DOM.authPhoneFeedback, '');
    navigate('auth-phone', 'forward');
    DOM.inputAuthPhone?.focus();
  });

  DOM.btnAuthPhoneBack?.addEventListener('click', () => {
    setFeedback(DOM.authPhoneFeedback, '');
    navigate('welcome', 'back');
  });

  DOM.formAuthPhone?.addEventListener('submit', async event => {
    event.preventDefault();
    setFeedback(DOM.authPhoneFeedback, '');
    setButtonBusy(DOM.btnSendCode, true, 'Sending...');

    try {
      const phone = await sendPhoneOtp(DOM.inputAuthPhone.value);
      AppState.auth.pendingPhone = phone;
      DOM.authVerifySubtitle.textContent = `We sent a verification code to ${phone}.`;
      DOM.inputAuthCode.value = '';
      setFeedback(DOM.authVerifyFeedback, '');
      navigate('auth-verify', 'forward');
      DOM.inputAuthCode.focus();
    } catch (error) {
      setFeedback(DOM.authPhoneFeedback, error.message || 'We could not send a verification code right now.', 'error');
    } finally {
      setButtonBusy(DOM.btnSendCode, false);
    }
  });

  DOM.btnAuthVerifyBack?.addEventListener('click', () => {
    setFeedback(DOM.authVerifyFeedback, '');
    navigate('auth-phone', 'back');
    DOM.inputAuthPhone?.focus();
  });

  DOM.formAuthVerify?.addEventListener('submit', async event => {
    event.preventDefault();
    setFeedback(DOM.authVerifyFeedback, '');
    setButtonBusy(DOM.btnVerifyCode, true, 'Verifying...');

    try {
      AppState.auth.session = await verifyPhoneOtp(AppState.auth.pendingPhone, DOM.inputAuthCode.value);
      await routeAuthenticatedUser();
    } catch (error) {
      setFeedback(DOM.authVerifyFeedback, error.message || 'That code did not work. Try again.', 'error');
    } finally {
      setButtonBusy(DOM.btnVerifyCode, false);
    }
  });

  DOM.formProfileSetup?.addEventListener('submit', async event => {
    event.preventDefault();
    setFeedback(DOM.profileSetupFeedback, '');
    setButtonBusy(DOM.btnSaveProfile, true, 'Saving...');

    try {
      const savedUser = await saveUserProfile({
        userId: getCurrentUserId(),
        authUserId: AppState.auth.session?.user?.id || null,
        name: DOM.inputProfileName.value,
        avatarUrl: DOM.inputProfileAvatar.value.trim(),
        phone: AppState.auth.session?.user?.phone || AppState.auth.pendingPhone,
      });

      setCurrentUserId(savedUser.id);
      await refreshChats();

      if (!AppState.chats.length) {
        navigate('create-group', 'forward');
        renderPendingGroupMembers();
      } else {
        navigate('chats', 'forward');
        renderChatsList();
      }
    } catch (error) {
      setFeedback(DOM.profileSetupFeedback, error.message || 'We could not save your profile yet.', 'error');
    } finally {
      setButtonBusy(DOM.btnSaveProfile, false);
    }
  });

  DOM.btnAddGroupMember?.addEventListener('click', addPendingGroupMember);
  DOM.btnCreateGroupBack?.addEventListener('click', async () => {
    if (AppState.chats.length) {
      navigate('chats', 'back');
      renderChatsList();
      return;
    }
    navigate('profile-setup', 'back');
  });
  DOM.btnBrowseContacts?.addEventListener('click', async () => {
    if (!('contacts' in navigator) || !('ContactsManager' in window)) {
      setFeedback(DOM.createGroupFeedback, 'Contact picker not supported in this browser. Use "Import iCloud / vCard" or add friends manually.', 'error');
      return;
    }
    try {
      const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      if (!picked?.length) return;
      const incoming = [];
      for (const contact of picked) {
        const name = (contact.name?.[0] || '').trim();
        for (const raw of (contact.tel || [])) {
          const phone = normalizePhoneNumber(raw);
          if (phone) incoming.push({ name: name || phone, phone });
        }
      }
      const fresh = incoming.filter(c => !AppState.onboarding.pendingMembers.some(m => m.phone === c.phone));
      AppState.onboarding.pendingMembers.push(...fresh);
      renderPendingGroupMembers();
      if (AppState.supabaseOk && fresh.length) {
        await saveImportedContacts(getCurrentUserId(), fresh, 'device').catch(() => {});
      }
      setFeedback(DOM.createGroupFeedback,
        fresh.length ? `Added ${fresh.length} contact${fresh.length === 1 ? '' : 's'}.` : 'Already in group draft.',
        fresh.length ? 'success' : '');
    } catch (err) {
      if (err.name !== 'AbortError') {
        setFeedback(DOM.createGroupFeedback, `Contacts error: ${err.message}`, 'error');
      }
    }
  });

  DOM.btnImportVCard?.addEventListener('click', () => {
    DOM.inputContactFile?.click();
  });
  DOM.inputContactFile?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    setButtonBusy(DOM.btnImportVCard, true, 'Importing...');
    try {
      await importContactsFromVCard(file);
      // After import, go to the hub so the user can tap contacts to add them.
      await openContactsHub('create-group');
    } catch (error) {
      setFeedback(DOM.createGroupFeedback, error.message || 'We could not import that contact file.', 'error');
    } finally {
      event.target.value = '';
      setButtonBusy(DOM.btnImportVCard, false);
    }
  });
  DOM.btnContactsHubBack?.addEventListener('click', () => {
    navigate(AppState.onboarding.contactsTarget === 'group-settings' ? 'group-settings' : 'create-group', 'back');
  });

  // navigator.contacts is not supported on any iOS browser — button stays hidden.
  DOM.btnContactsImportVCard?.addEventListener('click', () => {
    DOM.inputContactsHubFile?.click();
  });
  DOM.inputContactsHubFile?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    setButtonBusy(DOM.btnContactsImportVCard, true, 'Importing...');
    try {
      await importContactsIntoHub(file);
    } catch (error) {
      setFeedback(DOM.contactsHubFeedback, error.message || 'We could not import that contact file.', 'error');
    } finally {
      event.target.value = '';
      setButtonBusy(DOM.btnContactsImportVCard, false);
    }
  });
  DOM.contactsHubList?.addEventListener('click', event => {
    const addButton = event.target.closest('[data-add-contact]');
    if (!addButton) return;

    const row = addButton.closest('[data-contact-phone]');
    const phone = addButton.dataset.addContact;
    const name = row?.querySelector('.contacts-hub-row__name')?.textContent?.trim() || phone;
    if (!phone) return;

    if (AppState.onboarding.contactsTarget === 'group-settings') {
      if (AppState.activeChat?.members?.some(member => member.phoneE164 === phone)) return;

      addMembersToChat({
        chatId: AppState.activeChat.id,
        ownerUserId: getCurrentUserId(),
        members: [{ name, phone }],
      }).then(async () => {
        await refreshActiveChatAndSettings();
        await renderContactsHub();
        setFeedback(DOM.contactsHubFeedback, `${name} added to this group.`, 'success');
      }).catch(error => {
        setFeedback(DOM.contactsHubFeedback, error.message || 'We could not add that contact to the group.', 'error');
      });
      return;
    }

    if (AppState.onboarding.pendingMembers.some(member => member.phone === phone)) return;

    AppState.onboarding.pendingMembers.push({ name, phone });
    renderPendingGroupMembers();
    renderContactsHub();
    setFeedback(DOM.contactsHubFeedback, `${name} added to your group draft.`, 'success');
  });
  DOM.groupMemberList?.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-remove-member]');
    if (!removeButton) return;

    AppState.onboarding.pendingMembers = AppState.onboarding.pendingMembers.filter(
      member => member.phone !== removeButton.dataset.removeMember
    );
    renderPendingGroupMembers();
  });

  DOM.formCreateGroup?.addEventListener('submit', async event => {
    event.preventDefault();
    setFeedback(DOM.createGroupFeedback, '');
    setButtonBusy(DOM.btnCreateGroup, true, 'Creating...');

    try {
      const createdChat = await createGroupChat({
        ownerUserId: getCurrentUserId(),
        name: DOM.inputGroupName.value,
        members: AppState.onboarding.pendingMembers,
      });

      resetCreateGroupComposer();
      await refreshChats();
      renderChatsList();
      navigate('chats', 'forward');
      const nextChat = AppState.chats.find(chat => chat.id === createdChat.id) || createdChat;
      await openChat(nextChat);

      if (createdChat.smsWarning) {
        setFeedback(DOM.createGroupFeedback, `Group created. SMS issue: ${createdChat.smsWarning}`, 'error');
      }
    } catch (error) {
      setFeedback(DOM.createGroupFeedback, error.message || 'We could not create your group yet.', 'error');
    } finally {
      setButtonBusy(DOM.btnCreateGroup, false);
    }
  });

  DOM.btnAllowContacts.addEventListener('click', () => {
    AppState.contactsConnected = true;
    _navigateToChats();
  });
  DOM.btnSelectContacts.addEventListener('click', () => {
    AppState.contactsConnected = true;
    _navigateToChats();
  });
  DOM.btnDenyContacts.addEventListener('click', () => {
    _navigateToChats();
  });

  DOM.btnStartChat.addEventListener('click', () => {
    navigate('create-group', 'forward');
    renderPendingGroupMembers();
  });

  DOM.selfAvatar?.addEventListener('click', openProfileScreen);
  DOM.btnProfileBack?.addEventListener('click', () => {
    navigate('chats', 'back');
    renderChatsList();
  });
  DOM.formProfileManage?.addEventListener('submit', async event => {
    event.preventDefault();
    setButtonBusy(DOM.btnUpdateProfile, true, 'Saving...');
    setFeedback(DOM.profileManageFeedback, '');
    try {
      const savedUser = await saveUserProfile({
        userId: getCurrentUserId(),
        authUserId: AppState.auth.session?.user?.id || null,
        name: DOM.inputManageProfileName.value,
        avatarUrl: DOM.inputManageProfileAvatar.value.trim(),
        phone: AppState.auth.session?.user?.phone || getCurrentUser().phoneE164,
      });
      setCurrentUserId(savedUser.id);
      renderProfileSettings();
      await refreshChats();
      renderChatsList();
      if (AppState.activeChat?.members?.some(member => member.id === savedUser.id)) {
        AppState.activeChat = AppState.chats.find(chat => chat.id === AppState.activeChat.id) || AppState.activeChat;
      }
      setFeedback(DOM.profileManageFeedback, 'Profile updated.', 'success');
    } catch (error) {
      setFeedback(DOM.profileManageFeedback, error.message || 'We could not save your profile yet.', 'error');
    } finally {
      setButtonBusy(DOM.btnUpdateProfile, false);
    }
  });
  DOM.btnSignOut?.addEventListener('click', async () => {
    setButtonBusy(DOM.btnSignOut, true, 'Signing out...');
    try {
      await signOutAuthSession();
      setCurrentUserId(APP_DEFAULT_CURRENT_USER_ID);
      AppState.auth.session = null;
      AppState.activeChat = null;
      AppState.chats = [];
      Store.clear();
      navigate('welcome', 'fade');
    } catch (error) {
      setFeedback(DOM.profileManageFeedback, error.message || 'We could not sign you out.', 'error');
    } finally {
      setButtonBusy(DOM.btnSignOut, false);
    }
  });

  DOM.btnSearch.addEventListener('click', () => {
    openChatsSearch();
  });
  DOM.inputChatSearch?.addEventListener('input', event => {
    AppState.chatsSearchQuery = event.target.value || '';
    renderChatsList();
  });
  DOM.inputChatSearch?.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeChatsSearch();
    }
  });
  DOM.btnClearSearch?.addEventListener('click', () => {
    if (!AppState.chatsSearchQuery) {
      closeChatsSearch();
      return;
    }
    AppState.chatsSearchQuery = '';
    DOM.inputChatSearch.value = '';
    renderChatsList();
  });

  DOM.chatsGrid.addEventListener('click', event => {
    const card = event.target.closest('[data-chat-id]');
    if (!card) return;
    const chat = AppState.chats.find(entry => entry.id === card.dataset.chatId);
    if (chat?.active) openChat(chat);
  });

  DOM.btnBack.addEventListener('click', () => {
    navigate('chats', 'back');
  });
  DOM.btnChatMore?.addEventListener('click', openGroupSettingsScreen);
  DOM.btnGroupSettingsBack?.addEventListener('click', () => {
    navigate('chat', 'back');
  });
  DOM.formGroupSettings?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!AppState.activeChat) return;
    setButtonBusy(DOM.btnSaveGroupSettings, true, 'Saving...');
    setFeedback(DOM.groupSettingsFeedback, '');
    try {
      const updated = AppState.supabaseOk
        ? await renameChat(AppState.activeChat.id, DOM.inputGroupSettingsName.value)
        : { id: AppState.activeChat.id, name: DOM.inputGroupSettingsName.value };
      AppState.activeChat.name = updated.name;
      AppState.chats = AppState.chats.map(chat => chat.id === updated.id ? { ...chat, name: updated.name } : chat);
      DOM.chatTitle.textContent = updated.name;
      renderChatsList();
      setFeedback(DOM.groupSettingsFeedback, 'Group updated.', 'success');
    } catch (error) {
      setFeedback(DOM.groupSettingsFeedback, error.message || 'We could not update this group.', 'error');
    } finally {
      setButtonBusy(DOM.btnSaveGroupSettings, false);
    }
  });
  DOM.btnAddGroupSettingsMember?.addEventListener('click', async () => {
    if (!AppState.activeChat) return;
    setButtonBusy(DOM.btnAddGroupSettingsMember, true, 'Adding...');
    setFeedback(DOM.groupSettingsFeedback, '');
    try {
      await addMembersToChat({
        chatId: AppState.activeChat.id,
        ownerUserId: getCurrentUserId(),
        members: [{
          name: DOM.inputGroupMemberName.value,
          phone: DOM.inputGroupMemberPhone.value,
        }],
      });
      DOM.inputGroupMemberName.value = '';
      DOM.inputGroupMemberPhone.value = '';
      await refreshActiveChatAndSettings();
      setFeedback(DOM.groupSettingsFeedback, 'Member added or invite sent.', 'success');
    } catch (error) {
      setFeedback(DOM.groupSettingsFeedback, error.message || 'We could not add that member.', 'error');
    } finally {
      setButtonBusy(DOM.btnAddGroupSettingsMember, false);
    }
  });
  DOM.groupSettingsMembers?.addEventListener('click', async event => {
    const removeButton = event.target.closest('[data-remove-member]');
    if (!removeButton || !AppState.activeChat) return;

    setFeedback(DOM.groupSettingsFeedback, '');
    try {
      await removeMemberFromChat(AppState.activeChat.id, removeButton.dataset.removeMember);
      await refreshActiveChatAndSettings();
      setFeedback(DOM.groupSettingsFeedback, 'Member removed from group.', 'success');
    } catch (error) {
      setFeedback(DOM.groupSettingsFeedback, error.message || 'We could not remove that member.', 'error');
    }
  });
  DOM.btnGroupSettingsBrowseContacts?.addEventListener('click', async () => {
    if (!('contacts' in navigator) || !('ContactsManager' in window)) {
      await openContactsHub('group-settings');
      return;
    }
    try {
      const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      if (!picked?.length) return;
      const incoming = [];
      for (const contact of picked) {
        const name = (contact.name?.[0] || '').trim();
        for (const raw of (contact.tel || [])) {
          const phone = normalizePhoneNumber(raw);
          if (phone) incoming.push({ name: name || phone, phone });
        }
      }
      const fresh = incoming.filter(c => !AppState.activeChat?.members?.some(m => m.phoneE164 === c.phone));
      if (fresh.length) {
        await addMembersToChat({ chatId: AppState.activeChat.id, ownerUserId: getCurrentUserId(), members: fresh });
        await refreshActiveChatAndSettings();
        setFeedback(DOM.groupSettingsFeedback, `Added ${fresh.length} contact${fresh.length === 1 ? '' : 's'}.`, 'success');
      } else {
        setFeedback(DOM.groupSettingsFeedback, 'Those contacts are already in this group.', '');
      }
    } catch (err) {
      if (err.name !== 'AbortError') setFeedback(DOM.groupSettingsFeedback, `Contacts error: ${err.message}`, 'error');
    }
  });
  DOM.groupSettingsInvites?.addEventListener('click', async event => {
    const resendButton = event.target.closest('[data-resend-invite]');
    const revokeButton = event.target.closest('[data-revoke-invite]');
    if (!resendButton && !revokeButton) return;

    setFeedback(DOM.groupSettingsFeedback, '');
    try {
      const invites = await getInvitationsForChat(AppState.activeChat.id);
      if (resendButton) {
        const invite = invites.find(entry => entry.id === resendButton.dataset.resendInvite);
        await resendInvitation(invite);
        setFeedback(DOM.groupSettingsFeedback, 'Invite resent.', 'success');
      }
      if (revokeButton) {
        await revokeInvitation(revokeButton.dataset.revokeInvite);
        setFeedback(DOM.groupSettingsFeedback, 'Invite revoked.', 'success');
      }
      await refreshActiveChatAndSettings();
    } catch (error) {
      setFeedback(DOM.groupSettingsFeedback, error.message || 'We could not update that invite.', 'error');
    }
  });
  DOM.btnLeaveGroup?.addEventListener('click', async () => {
    if (!AppState.activeChat) return;
    setButtonBusy(DOM.btnLeaveGroup, true, 'Leaving...');
    setFeedback(DOM.groupSettingsFeedback, '');
    try {
      if (AppState.supabaseOk) {
        await leaveChat(AppState.activeChat.id, getCurrentUserId());
      }
      const leavingChatId = AppState.activeChat.id;
      AppState.chats = AppState.chats.filter(chat => chat.id !== leavingChatId);
      AppState.activeChat = null;
      navigate('chats', 'back');
      renderChatsList();
    } catch (error) {
      setFeedback(DOM.groupSettingsFeedback, error.message || 'We could not leave this group.', 'error');
    } finally {
      setButtonBusy(DOM.btnLeaveGroup, false);
    }
  });

  DOM.btnMic.addEventListener('click', () => {
    clearReplyTarget();
    openRecordingOverlay();
    startRecording();
  });

  DOM.btnRecCancel.addEventListener('click', cancelRecording);
  DOM.btnRecExit.addEventListener('click', cancelRecording);
  DOM.btnStop.addEventListener('click', stopRecording);
  DOM.btnDiscard.addEventListener('click', discardRecording);

  DOM.btnPlay.addEventListener('click', () => {
    const mgr = AppState.recording.manager;
    if (!mgr) return;
    const isNowPlaying = mgr.togglePlay();
    DOM.btnPlay.classList.toggle('playing', isNowPlaying);
    DOM.btnPlay.innerHTML = isNowPlaying ? PLAY_BUTTON_ICONS.pause : PLAY_BUTTON_ICONS.play;

    // When audio ends, reset button
    if (mgr.audioEl) {
      mgr.audioEl.onended = () => {
        DOM.btnPlay.classList.remove('playing');
        DOM.btnPlay.innerHTML = PLAY_BUTTON_ICONS.play;
      };
    }
  });

  DOM.btnSend.addEventListener('click', sendRecording);

  DOM.recordingBackdrop.addEventListener('click', () => {
    if (AppState.recording.phase === 'recording') return;
    if (AppState.recording.phase === 'sending')   return;
    cancelRecording();
  });

  DOM.btnAnalysisCancel.addEventListener('click', () => {
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

  document.addEventListener('yap:thread:reply', e => {
    AppState.replyTargetThreadId = e.detail.threadId;
    openRecordingOverlay();
    startRecording();
  });
}

// ── Boot ──────────────────────────────────────────────
async function boot() {
  setCurrentUserId(getCurrentUserId());
  cacheDOM();
  wireEvents();
  wirePipelineEvents();
  renderPendingGroupMembers();
  setDisplay(DOM.btnChatMore, true);

  AppState.supabaseOk = initSupabase();
  if (AppState.supabaseOk && supabaseClient?.auth) {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      AppState.auth.session = session || getStoredAuthSession() || null;
    });
  }

  // Splash auto-advance
  setTimeout(() => {
    resolveInitialRoute();
  }, 950);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
