// ═══════════════════════════════════════════════════════
// yAp — App
// Router, screen manager, event wiring
// ═══════════════════════════════════════════════════════

// ── App state ─────────────────────────────────────────
const AppState = {
  screen:     'splash',    // current screen id
  screenHistory: [],
  activeChat: null,        // chat object
  chats: [],
  pendingChats: [],
  chatsSearchQuery: '',
  chatsSearchOpen: false,
  supabaseOk: false,
  conversationHydrating: null,
  conversationHydratedAt: 0,
  auth: {
    session: null,
    pendingPhone: '',
    pendingInviteToken: '',
    pendingChatId: '',
    backendReadiness: null,
  },
  onboarding: {
    pendingMembers: [],
    contactsTarget: 'create-group',
    createGroupSearchQuery: '',
  },
  replyTargetThreadId: null,
  recording: {
    manager: null,
    phase:   'idle',       // idle | recording | stopped | sending
  },
  playback: {
    lastHeardChatId: null,
    lastHeardThreadId: null,
    lastHeardMessageId: null,
    lastHeardAt: 0,
    lastHeardAuthor: '',
    lastHeardLabel: '',
    lastHeardTranscript: '',
  },
  chatViewMode: 'immersive',
  groupSettingsTab: 'info',
  groupSettingsEditing: false,
  groupSettingsInvites: [],
  groupSettingsBackground: 'none',
  groupSettingsPrefs: {
    hideAlerts: false,
    sharedWithYou: true,
    autoTranslate: false,
  },
  sync: {
    intervalId: 0,
    inFlight: false,
    handlersBound: false,
    chatSnapshot: null,
  },
  navTimer: null,
  viewportSyncRaf: 0,
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
    chats:       document.getElementById('screen-chats'),
    chat:        document.getElementById('screen-chat'),
  };

  // Entry flow
  DOM.btnGetStarted = document.getElementById('btn-get-started');
  DOM.formAuthPhone = document.getElementById('form-auth-phone');
  DOM.inputAuthPhone = document.getElementById('input-auth-phone');
  DOM.authPhoneSubtitle = document.getElementById('auth-phone-subtitle');
  DOM.btnSendCode = document.getElementById('btn-send-code');
  DOM.btnAuthPhoneBack = document.getElementById('btn-auth-phone-back');
  DOM.authPhoneFeedback = document.getElementById('auth-phone-feedback');
  DOM.formAuthVerify = document.getElementById('form-auth-verify');
  DOM.inputAuthCode = document.getElementById('input-auth-code');
  DOM.btnVerifyCode = document.getElementById('btn-verify-code');
  DOM.btnAuthVerifyBack = document.getElementById('btn-auth-verify-back');
  DOM.btnAuthVerifyResend = document.getElementById('btn-auth-verify-resend');
  DOM.authVerifyFeedback = document.getElementById('auth-verify-feedback');
  DOM.authVerifySubtitle = document.getElementById('auth-verify-subtitle');
  DOM.formProfileSetup = document.getElementById('form-profile-setup');
  DOM.profileSetupSubtitle = document.getElementById('profile-setup-subtitle');
  DOM.btnProfileSetupBack = document.getElementById('btn-profile-setup-back');
  DOM.btnProfilePhotoPick = document.getElementById('btn-profile-photo-pick');
  DOM.profileSetupAvatarPreview = document.getElementById('profile-setup-avatar-preview');
  DOM.profilePhotoPickLabel = document.getElementById('profile-photo-pick-label');
  DOM.inputProfileAvatarFile = document.getElementById('input-profile-avatar-file');
  DOM.inputProfileName = document.getElementById('input-profile-name');
  DOM.inputProfileAvatar = document.getElementById('input-profile-avatar');
  DOM.btnSaveProfile = document.getElementById('btn-save-profile');
  DOM.profileSetupFeedback = document.getElementById('profile-setup-feedback');
  DOM.formCreateGroup = document.getElementById('form-create-group');
  DOM.btnCreateGroupBack = document.getElementById('btn-create-group-back');
  DOM.btnCreateGroupCancel = document.getElementById('btn-create-group-cancel');
  DOM.inputGroupName = document.getElementById('input-group-name');
  DOM.inputMemberName = document.getElementById('input-member-name');
  DOM.inputMemberPhone = document.getElementById('input-member-phone');
  DOM.inputCreateGroupSearch = document.getElementById('input-create-group-search');
  DOM.btnCreateGroupSearchClear = document.getElementById('btn-create-group-search-clear');
  DOM.createChatSearchWrap = document.querySelector('#screen-create-group .create-chat-picker__search-wrap');
  DOM.createChatSearchResult = document.getElementById('create-chat-search-result');
  DOM.createChatSearchResultCard = document.getElementById('create-chat-search-result-card');
  DOM.btnCreateGroupConnectInline = document.getElementById('btn-create-group-connect-inline');
  DOM.createChatPermissionCard = document.getElementById('create-chat-permission-card');
  DOM.createChatPermissionBody = document.getElementById('create-chat-permission-body');
  DOM.createChatSelected = document.getElementById('create-chat-selected');
  DOM.createChatContacts = document.getElementById('create-chat-contacts');
  DOM.createChatAlpha = document.getElementById('create-chat-alpha');
  DOM.createChatBottomMeta = document.getElementById('create-chat-bottom-meta');
  DOM.btnCreateGroupRow = document.getElementById('btn-create-group-row');
  DOM.createChatCreateBar = document.getElementById('create-chat-create-bar');
  DOM.btnCreateGroupShare = document.getElementById('btn-create-group-share');
  DOM.btnCreateGroupHelp = document.getElementById('btn-create-group-help');
  DOM.btnAddGroupMember = document.getElementById('btn-add-group-member');
  DOM.btnBrowseContacts = document.getElementById('btn-browse-contacts');
  DOM.btnImportVCard = document.getElementById('btn-import-vcard');
  DOM.inputContactFile = document.getElementById('input-contact-file');
  DOM.groupMemberList = document.getElementById('group-member-list');
  DOM.btnCreateGroup = document.getElementById('btn-create-group');
  DOM.createGroupFeedback = document.getElementById('create-group-feedback');
  DOM.btnContactsHubBack = document.getElementById('btn-contacts-hub-back');
  DOM.btnContactsHubClose = document.getElementById('btn-contacts-hub-close');
  DOM.contactsHubIntro = document.getElementById('contacts-hub-intro');
  DOM.contactsHubTitle = document.getElementById('contacts-hub-title');
  DOM.contactsHubBody = document.getElementById('contacts-hub-body');
  DOM.btnContactsHubDevice = document.getElementById('btn-contacts-hub-device');
  DOM.btnContactsImportVCard = document.getElementById('btn-contacts-import-vcard');
  DOM.inputContactsHubFile = document.getElementById('input-contacts-hub-file');
  DOM.contactsHubList = document.getElementById('contacts-hub-list');
  DOM.contactsHubFeedback = document.getElementById('contacts-hub-feedback');
  DOM.btnProfileBack = document.getElementById('btn-profile-back');
  DOM.formProfileManage = document.getElementById('form-profile-manage');
  DOM.btnManageProfilePhoto = document.getElementById('btn-manage-profile-photo');
  DOM.profileSettingsAvatar = document.getElementById('profile-settings-avatar');
  DOM.manageProfilePhotoLabel = document.getElementById('manage-profile-photo-label');
  DOM.profileSettingsName = document.getElementById('profile-settings-name');
  DOM.profileSettingsPhone = document.getElementById('profile-settings-phone');
  DOM.inputManageProfileName = document.getElementById('input-manage-profile-name');
  DOM.inputManageProfileAvatar = document.getElementById('input-manage-profile-avatar');
  DOM.inputManageProfileAvatarFile = document.getElementById('input-manage-profile-avatar-file');
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
  DOM.btnSaveGroupSettings = document.getElementById('btn-save-group-settings');
  DOM.btnLeaveGroup = document.getElementById('btn-leave-group');
  DOM.groupSettingsFeedback = document.getElementById('group-settings-feedback');
  DOM.groupSettingsHeroAvatars = document.getElementById('group-settings-hero-avatars');
  DOM.groupSettingsSummaryPeople = document.getElementById('group-settings-summary-people');
  DOM.groupSettingsSummaryTopics = document.getElementById('group-settings-summary-topics');
  DOM.groupSettingsSummaryLinks = document.getElementById('group-settings-summary-links');
  DOM.groupSettingsPeopleStrip = document.getElementById('group-settings-people-strip');
  DOM.groupSettingsInviteCard = document.getElementById('group-settings-invite-card');
  DOM.groupSettingsLinksGrid = document.getElementById('group-settings-links-grid');
  DOM.groupSettingsBackgroundOptions = document.getElementById('group-settings-background-options');
  DOM.groupSettingsBackgroundSuggestions = document.getElementById('group-settings-background-suggestions');
  DOM.groupSettingsPanels = Array.from(document.querySelectorAll('[data-group-settings-panel]'));
  DOM.btnGroupSettingsTabInfo = document.getElementById('btn-group-settings-tab-info');
  DOM.btnGroupSettingsTabBackgrounds = document.getElementById('btn-group-settings-tab-backgrounds');
  DOM.btnGroupSettingsTabLinks = document.getElementById('btn-group-settings-tab-links');
  DOM.toggleGroupHideAlerts = document.getElementById('toggle-group-hide-alerts');

  // Chats screen
  DOM.chatsGrid  = document.getElementById('chats-grid');
  DOM.chatsEmptyState = document.getElementById('chats-empty-state');
  DOM.chatsSearch = document.getElementById('chats-search');
  DOM.inputChatSearch = document.getElementById('input-chat-search');
  DOM.btnClearSearch = document.getElementById('btn-clear-search');
  DOM.selfAvatar = document.getElementById('self-avatar');
  DOM.btnStartChat = document.getElementById('btn-start-chat');
  DOM.btnSearch = document.getElementById('btn-search');
  DOM.btnComposeChat = document.getElementById('btn-compose-chat');

  // Chat screen
  DOM.chatTitle      = document.getElementById('chat-title');
  DOM.chatMemberPips = document.getElementById('chat-member-pips');
  DOM.chatEmpty      = document.getElementById('chat-empty');
  DOM.chatTopics     = document.getElementById('chat-topics');
  DOM.chatProcessing = document.getElementById('chat-processing');
  DOM.chatPresence   = document.getElementById('chat-presence');
  DOM.btnBack        = document.getElementById('btn-back');
  DOM.btnMic         = document.getElementById('btn-mic');
  DOM.btnChatViewToggle = document.getElementById('btn-chat-view-toggle');
  DOM.btnChatMore    = document.getElementById('btn-chat-more');
  DOM.floatingChloe = document.getElementById('floating-chloe');
  DOM.floatingMaria = document.getElementById('floating-maria');
  DOM.floatingChloeLabel = document.getElementById('floating-chloe-label');
  DOM.floatingMariaLabel = document.getElementById('floating-maria-label');
  DOM.floatingChloePhoto = document.querySelector('#floating-chloe .floating-avatar__photo');
  DOM.floatingMariaPhoto = document.querySelector('#floating-maria .floating-avatar__photo');
  DOM.chatImmersive = document.getElementById('chat-immersive');

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
  DOM.analysisTitle   = document.getElementById('analysis-title');
  DOM.analysisBody    = document.getElementById('analysis-body');
  DOM.analysisStatusCopy = document.getElementById('analysis-status-copy');
  DOM.btnAnalysisCancel = document.getElementById('btn-analysis-cancel');
  DOM.iosAlertOverlay = document.getElementById('ios-alert-overlay');
  DOM.iosAlertTitle = document.getElementById('ios-alert-title');
  DOM.iosAlertMessage = document.getElementById('ios-alert-message');
  DOM.iosAlertAction = document.getElementById('ios-alert-action');
}

const SCREEN_TRANSITION_MS = 360;
const SHEET_TRANSITION_MS = 360;

function isSheetScreen(screenId) {
  return screenId === 'create-group';
}

function isProfileScreen(screenId) {
  return screenId === 'profile';
}

function resetScreenTransitionState(screen) {
  if (!screen) return;
  screen.classList.remove('screen-sheet-closing');
  screen.style.transform = '';
  screen.style.opacity = '';
  screen.style.transition = '';
}

function isTextEntryElement(element) {
  if (!element || !(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  const tagName = element.tagName;
  if (tagName === 'TEXTAREA') return true;
  if (tagName !== 'INPUT') return false;
  const type = (element.getAttribute('type') || 'text').toLowerCase();
  return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(type);
}

function syncFocusedFieldIntoView() {
  const activeElement = document.activeElement;
  if (!isTextEntryElement(activeElement)) return;
  if (activeElement.closest?.('#screen-create-group')) return;
  requestAnimationFrame(() => {
    try {
      activeElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } catch (_) {}
  });
}

function updateViewportMetrics() {
  const viewport = window.visualViewport;
  const viewportHeight = Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
  const keyboardInset = viewport
    ? Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
    : 0;

  document.documentElement.style.setProperty('--app-height', `${viewportHeight}px`);
  document.documentElement.style.setProperty('--keyboard-inset', `${keyboardInset}px`);
  document.body.classList.toggle('keyboard-open', keyboardInset > 0);

  if (keyboardInset > 0) {
    syncFocusedFieldIntoView();
  }
}

function scheduleViewportMetricsUpdate() {
  if (AppState.viewportSyncRaf) cancelAnimationFrame(AppState.viewportSyncRaf);
  AppState.viewportSyncRaf = requestAnimationFrame(() => {
    AppState.viewportSyncRaf = 0;
    updateViewportMetrics();
  });
}

function wireViewportHandlers() {
  scheduleViewportMetricsUpdate();
  window.addEventListener('resize', scheduleViewportMetricsUpdate);
  window.addEventListener('orientationchange', scheduleViewportMetricsUpdate);
  window.addEventListener('focusin', event => {
    if (!isTextEntryElement(event.target)) return;
    scheduleViewportMetricsUpdate();
    setTimeout(scheduleViewportMetricsUpdate, 180);
  });
  window.addEventListener('focusout', () => {
    setTimeout(scheduleViewportMetricsUpdate, 120);
  });
  window.visualViewport?.addEventListener('resize', scheduleViewportMetricsUpdate);
  window.visualViewport?.addEventListener('scroll', scheduleViewportMetricsUpdate);
}

// ── Router ─────────────────────────────────────────────
/**
 * Navigate between top-level screens.
 * direction: 'forward' | 'back' | 'fade'
 */
function navigate(toId, direction = 'forward', { replace = false } = {}) {
  const from = document.querySelector('.screen.active');
  const to   = DOM.screens[toId] || document.getElementById(`screen-${toId}`);

  if (!to || from === to) return;

  const fromId = from?.dataset.screen || AppState.screen;
  const eligibleForHistory = fromId && fromId !== 'splash';
  if (!replace && eligibleForHistory) {
    if (direction === 'back') {
      const last = AppState.screenHistory[AppState.screenHistory.length - 1];
      if (last === toId) {
        AppState.screenHistory.pop();
      }
    } else {
      const last = AppState.screenHistory[AppState.screenHistory.length - 1];
      if (last !== fromId) {
        AppState.screenHistory.push(fromId);
      }
    }
  }

  AppState.screen = toId;
  if (AppState.navTimer) {
    clearTimeout(AppState.navTimer);
    AppState.navTimer = null;
  }

  Object.values(DOM.screens || {}).forEach(resetScreenTransitionState);

  if (!from) {
    to.classList.add('active');
    return;
  }

  const openingSheet = isSheetScreen(toId) && direction !== 'back';
  const closingSheet = isSheetScreen(fromId) && direction === 'back';
  const profileTransition = isProfileScreen(toId) || isProfileScreen(fromId);
  const screenTransitionMs = profileTransition ? 240 : SCREEN_TRANSITION_MS;

  if (openingSheet) {
    to.classList.add('active');
    AppState.navTimer = setTimeout(() => {
      resetScreenTransitionState(to);
      AppState.navTimer = null;
    }, SHEET_TRANSITION_MS);
    return;
  }

  if (closingSheet) {
    to.classList.add('active');
    from.classList.add('screen-sheet-closing');
    AppState.navTimer = setTimeout(() => {
      from.classList.remove('active', 'screen-sheet-closing');
      resetScreenTransitionState(from);
      resetScreenTransitionState(to);
      AppState.navTimer = null;
    }, SHEET_TRANSITION_MS);
    return;
  }

  to.classList.add('active');

  if (direction === 'fade') {
    to.style.opacity = profileTransition ? '1' : '0';
    to.style.transform = 'scale(0.985)';
    requestAnimationFrame(() => {
      to.style.transition = `opacity ${screenTransitionMs}ms ease, transform ${screenTransitionMs}ms ease`;
      from.style.transition = `opacity ${screenTransitionMs}ms ease, transform ${screenTransitionMs}ms ease`;
      to.style.opacity = '1';
      to.style.transform = 'scale(1)';
      from.style.opacity = '0';
      from.style.transform = 'scale(1.01)';
    });
  } else if (direction === 'back') {
    to.style.opacity = profileTransition ? '1' : '0.92';
    to.style.transform = 'translate3d(-22px, 0, 0)';
    requestAnimationFrame(() => {
      to.style.transition = `transform ${screenTransitionMs}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${screenTransitionMs}ms ease`;
      from.style.transition = `transform ${screenTransitionMs}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${screenTransitionMs}ms ease`;
      to.style.opacity = '1';
      to.style.transform = 'translate3d(0, 0, 0)';
      from.style.opacity = profileTransition ? '1' : '0.96';
      from.style.transform = 'translate3d(100%, 0, 0)';
    });
  } else {
    to.style.opacity = profileTransition ? '1' : '0.96';
    to.style.transform = 'translate3d(100%, 0, 0)';
    requestAnimationFrame(() => {
      to.style.transition = `transform ${screenTransitionMs}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${screenTransitionMs}ms ease`;
      from.style.transition = `transform ${screenTransitionMs}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${screenTransitionMs}ms ease`;
      to.style.opacity = '1';
      to.style.transform = 'translate3d(0, 0, 0)';
      from.style.opacity = profileTransition ? '1' : '0.9';
      from.style.transform = 'translate3d(-22px, 0, 0)';
    });
  }

  AppState.navTimer = setTimeout(() => {
    from.classList.remove('active');
    resetScreenTransitionState(from);
    resetScreenTransitionState(to);
    AppState.navTimer = null;
  }, screenTransitionMs);
}

function goBack(fallback = 'welcome') {
  const previous = AppState.screenHistory.pop() || fallback;
  navigate(previous, 'back', { replace: true });
  return previous;
}

function clearScreenHistory() {
  AppState.screenHistory = [];
}

function renderChatsList() {
  const chats = AppState.chats.length ? AppState.chats : [];
  const showEmptyState = chats.length === 0;
  const query = AppState.chatsSearchQuery.trim().toLowerCase();
  const currentUser = getCurrentUser();
  const visibleChats = chats.filter(chat => !query || chat.name.toLowerCase().includes(query));
  const showSearch = AppState.chatsSearchOpen || !!query;

  setDisplay(DOM.chatsGrid, !showEmptyState, 'grid');
  setDisplay(DOM.chatsEmptyState, showEmptyState, 'flex');
  if (DOM.chatsSearch) {
    DOM.chatsSearch.hidden = false;
    DOM.chatsSearch.classList.toggle('is-open', showSearch);
    DOM.chatsSearch.setAttribute('aria-hidden', showSearch ? 'false' : 'true');
  }
  DOM.screens?.chats?.classList.toggle('screen-chats-search-open', showSearch);
  if (DOM.inputChatSearch && DOM.inputChatSearch.value !== AppState.chatsSearchQuery) {
    DOM.inputChatSearch.value = AppState.chatsSearchQuery;
  }

  setElementImage(DOM.selfAvatar, currentUser.avatarUrl);

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

function pinChatInLocalLists(chat) {
  if (!chat?.id) return;

  const pinnedChat = {
    ...chat,
    localCreatedAt: Number(chat.localCreatedAt || chat.lastMessageAt || Date.now()),
    lastMessageAt: Number(chat.lastMessageAt || chat.localCreatedAt || Date.now()),
  };

  AppState.pendingChats = [
    pinnedChat,
    ...(AppState.pendingChats || []).filter(entry => entry.id !== pinnedChat.id),
  ];

  AppState.chats = [
    pinnedChat,
    ...(AppState.chats || []).filter(entry => entry.id !== pinnedChat.id),
  ].sort((a, b) => (b.lastMessageAt || b.localCreatedAt || 0) - (a.lastMessageAt || a.localCreatedAt || 0));
}

function buildChatActivitySnapshot(chats = AppState.chats) {
  return new Map((Array.isArray(chats) ? chats : []).map(chat => [
    chat.id,
    {
      lastMessageAt: Number(chat?.lastMessageAt || 0),
      unread: Number(chat?.unread || 0),
      previewAuthorId: chat?.previewAuthorId || null,
    },
  ]));
}

async function showLocalChatNotification(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (registration?.showNotification) {
      await registration.showNotification(title, {
        body,
        tag,
        renotify: false,
      });
      return;
    }
  } catch (error) {
    console.warn('[yAp] service worker notification failed:', error);
  }

  try {
    new Notification(title, { body, tag });
  } catch (error) {
    console.warn('[yAp] local notification failed:', error);
  }
}

function notifyAboutRemoteChatChanges(previousSnapshot, chats = AppState.chats) {
  if (!previousSnapshot || !('Notification' in window) || Notification.permission !== 'granted') return;

  const currentUserId = getCurrentUserId();
  const isBackgrounded = document.hidden || !document.hasFocus();
  if (!isBackgrounded || !currentUserId) return;

  for (const chat of Array.isArray(chats) ? chats : []) {
    const previous = previousSnapshot.get(chat.id);
    if (!previous) {
      showLocalChatNotification(chat.name || 'New chat', 'You were added to a chat.', `chat-${chat.id}`);
      continue;
    }

    const nextLastMessageAt = Number(chat?.lastMessageAt || 0);
    const nextUnread = Number(chat?.unread || 0);
    const hasNewRemoteMessage = nextLastMessageAt > Number(previous.lastMessageAt || 0)
      && nextUnread > Number(previous.unread || 0)
      && chat?.previewAuthorId
      && chat.previewAuthorId !== currentUserId;

    if (!hasNewRemoteMessage) continue;

    showLocalChatNotification(
      chat.name || 'New message',
      chat.preview || 'New voice memo',
      `chat-${chat.id}-message`
    );
  }
}

async function syncRemoteState({ forceConversation = false } = {}) {
  if (!AppState.supabaseOk || !AppState.auth.session || !getCurrentUserId() || AppState.sync.inFlight) return;

  AppState.sync.inFlight = true;
  const previousSnapshot = AppState.sync.chatSnapshot;
  const activeChatId = AppState.activeChat?.id || null;

  try {
    await refreshChats();

    if (activeChatId) {
      AppState.activeChat = AppState.chats.find(chat => chat.id === activeChatId) || AppState.activeChat;
    }

    renderChatsList();

    if (AppState.screen === 'chat' && AppState.activeChat?.id) {
      renderActiveChatShell(AppState.activeChat);
      await hydrateActiveConversation(true);
      const threads = Store.getThreads();
      if (threads.length) {
        DOM.chatMemberPips.style.visibility = 'visible';
        setDisplay(DOM.chatProcessing, false);
        setDisplay(DOM.chatEmpty, false);
        setDisplay(DOM.chatPresence, true, 'flex');
        renderTopics();
      } else {
        DOM.chatMemberPips.style.visibility = 'hidden';
        setDisplay(DOM.chatProcessing, false);
        setDisplay(DOM.chatEmpty, true);
        setDisplay(DOM.chatTopics, false);
        setDisplay(DOM.chatPresence, false);
      }
    } else if (AppState.screen === 'group-settings' && AppState.activeChat?.id) {
      renderGroupSettings(AppState.groupSettingsInvites || []);
    }

    if (AppState.auth.pendingChatId && !AppState.activeChat) {
      const opened = await openPendingLinkedChatIfAvailable();
      if (opened) {
        AppState.sync.chatSnapshot = buildChatActivitySnapshot(AppState.chats);
        return;
      }
    }

    notifyAboutRemoteChatChanges(previousSnapshot, AppState.chats);
    AppState.sync.chatSnapshot = buildChatActivitySnapshot(AppState.chats);
  } catch (error) {
    console.warn('[yAp] remote sync failed:', error);
  } finally {
    AppState.sync.inFlight = false;
  }
}

function startRemoteSync() {
  if (AppState.sync.intervalId) return;

  AppState.sync.chatSnapshot = buildChatActivitySnapshot(AppState.chats);
  AppState.sync.intervalId = window.setInterval(() => {
    syncRemoteState({ forceConversation: AppState.screen === 'chat' });
  }, 8000);

  if (AppState.sync.handlersBound) return;

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      syncRemoteState({ forceConversation: AppState.screen === 'chat' });
    }
  });
  window.addEventListener('focus', () => {
    syncRemoteState({ forceConversation: AppState.screen === 'chat' });
  });
  window.addEventListener('online', () => {
    syncRemoteState({ forceConversation: true });
  });
  AppState.sync.handlersBound = true;
}

function stopRemoteSync() {
  if (AppState.sync.intervalId) {
    window.clearInterval(AppState.sync.intervalId);
  }
  AppState.sync.intervalId = 0;
  AppState.sync.inFlight = false;
  AppState.sync.chatSnapshot = null;
}

function clearPendingChatLink() {
  AppState.auth.pendingChatId = '';
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('chat');
    window.history.replaceState({}, '', url.toString());
  } catch {}
}

async function openPendingLinkedChatIfAvailable() {
  const pendingChatId = AppState.auth.pendingChatId;
  if (!pendingChatId) return false;

  const linkedChat = AppState.chats.find(chat => chat.id === pendingChatId);
  if (!linkedChat) return false;

  clearPendingChatLink();
  await openChat(linkedChat);
  return true;
}

function sleep(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function waitForChatAvailability(chatId, { attempts = 5, delayMs = 700 } = {}) {
  if (!chatId || !AppState.supabaseOk || !getCurrentUserId()) {
    return AppState.chats.find(chat => chat.id === chatId) || null;
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await refreshChats();
    const found = AppState.chats.find(chat => chat.id === chatId) || null;
    if (found) return found;
    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return AppState.chats.find(chat => chat.id === chatId) || null;
}

function toggleChatViewMode() {
  AppState.chatViewMode = AppState.chatViewMode === 'immersive' ? 'threads' : 'immersive';
  DOM.btnChatViewToggle?.classList.toggle('is-active', AppState.chatViewMode === 'immersive');
  renderTopics();
}

function profilePlaceholderIconHTML(className = 'avatar-fallback__icon') {
  return `<img class="${className}" src="assets/contact-placeholder.svg" alt="" aria-hidden="true">`;
}

function setAvatarPickerPreview({ element, imageUrl, fallbackText = '+', accent = '#d7e8ff' }) {
  if (!element) return;

  if (imageUrl) {
    element.classList.remove('avatar-fallback');
    element.innerHTML = '';
    element.style.backgroundImage = `url('${imageUrl}')`;
    element.style.backgroundSize = 'cover';
    element.style.backgroundPosition = 'center';
    element.style.setProperty('--avatar-accent', accent);
    return;
  }

  element.classList.add('avatar-fallback');
  element.innerHTML = fallbackText === '+'
    ? profilePlaceholderIconHTML()
    : `<span>${escapeHtml(fallbackText)}</span>`;
  element.style.backgroundImage = '';
  element.style.backgroundSize = '';
  element.style.backgroundPosition = '';
  element.style.setProperty('--avatar-accent', accent);
}

function syncProfileSetupAvatarPreview() {
  const name = DOM.inputProfileName?.value?.trim() || '';
  const imageUrl = DOM.inputProfileAvatar?.value?.trim() || '';
  setAvatarPickerPreview({
    element: DOM.profileSetupAvatarPreview,
    imageUrl,
    fallbackText: imageUrl ? '' : (name ? buildUserInitials(name) : '+'),
    accent: pickUserColor(name || 'profile-setup'),
  });
  if (DOM.profilePhotoPickLabel) {
    DOM.profilePhotoPickLabel.textContent = imageUrl ? 'Change Photo' : 'Add Photo';
  }
}

function syncProfileManageAvatarLabel(user = getCurrentUser()) {
  if (!DOM.manageProfilePhotoLabel) return;
  DOM.manageProfilePhotoLabel.textContent = user?.avatarUrl ? 'Edit' : 'Add';
}

async function handleProfileAvatarPicked(file, target = 'setup') {
  const hiddenInput = target === 'manage' ? DOM.inputManageProfileAvatar : DOM.inputProfileAvatar;
  const feedbackEl = target === 'manage' ? DOM.profileManageFeedback : DOM.profileSetupFeedback;
  if (!file) return;

  if (!String(file.type || '').startsWith('image/')) {
    setFeedback(feedbackEl, 'Choose an image from your photo library.', 'error');
    return;
  }

  const tooLarge = file.size > (4 * 1024 * 1024);
  if (tooLarge) {
    setFeedback(feedbackEl, 'Choose an image under 4 MB.', 'error');
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    hiddenInput.value = dataUrl;
    setFeedback(feedbackEl, '');

    if (target === 'manage') {
      const currentUser = getCurrentUser();
      setAvatarPickerPreview({
        element: DOM.profileSettingsAvatar,
        imageUrl: dataUrl,
        fallbackText: buildUserInitials(currentUser.name || 'You'),
        accent: pickUserColor(currentUser.name || 'You'),
      });
      currentUser.avatarUrl = dataUrl;
      syncProfileManageAvatarLabel(currentUser);
    } else {
      syncProfileSetupAvatarPreview();
    }
  } catch (error) {
    setFeedback(feedbackEl, error.message || 'We could not use that photo yet.', 'error');
  }
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
  DOM.inputChatSearch?.blur();
  renderChatsList();
}

function openCreateGroupComposer() {
  const sheet = DOM.screens?.createGroup;
  const chatsScreen = DOM.screens?.chats;
  if (sheet) {
    sheet.classList.remove('screen-sheet-closing');
    resetScreenTransitionState(sheet);

    // Recover gracefully if the sheet was left marked active over Chats.
    if (sheet.classList.contains('active') && chatsScreen?.classList.contains('active')) {
      sheet.classList.remove('active');
    }
  }

  AppState.screen = 'chats';
  navigate('create-group', 'forward');

  renderPendingGroupMembers();
  renderCreateGroupPicker();
  scheduleViewportMetricsUpdate();
}

function _hexToRgb(hex) {
  const normalized = String(hex || '').trim();
  if (!/^#([0-9a-f]{6})$/i.test(normalized)) return '217, 222, 234';
  const value = normalized.slice(1);
  return `${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}`;
}

function getChatOtherMembers(chat) {
  return (chat?.members || []).filter(member => member.id !== getCurrentUserId());
}

function canManageActiveChat() {
  const role = AppState.activeChat?.currentUserRole;
  return role === 'owner' || role === 'admin' || role === 'member';
}

function buildAvatarClass(baseClass, member) {
  return `${baseClass}${member?.avatarUrl ? '' : ' avatar-fallback'}`;
}

function buildAvatarStyle(member) {
  const accent = member?.color || pickUserColor(member?.name || member?.phoneE164 || member?.id || '');
  return member?.avatarUrl
    ? `background-image:url('${member.avatarUrl}')`
    : `--avatar-accent:${accent}`;
}

function buildAvatarContent(member, fallbackSeed = 'Y') {
  if (member?.avatarUrl) return '';
  const name = member?.name;
  const isPhoneOnly = !name || name === member?.phoneE164;
  if (isPhoneOnly) return profilePlaceholderIconHTML();
  const initials = escapeHtml(member?.initials || buildUserInitials(name));
  return `<span>${initials}</span>`;
}

function buildMemberAvatarMarkup(member, extraClass = '') {
  return `
    <div class="${buildAvatarClass(extraClass, member)}" style="${buildAvatarStyle(member)}">
      ${buildAvatarContent(member)}
    </div>
  `;
}

function renderAvatarElement(element, member, fallbackSeed = 'Y') {
  if (!element) return;
  element.classList.toggle('avatar-fallback', !member?.avatarUrl);
  element.style.backgroundImage = member?.avatarUrl ? `url('${member.avatarUrl}')` : '';
  element.style.backgroundSize = member?.avatarUrl ? 'cover' : '';
  element.style.backgroundPosition = member?.avatarUrl ? 'center' : '';
  if (member?.avatarUrl) {
    element.style.removeProperty('--avatar-accent');
  } else {
    element.style.setProperty('--avatar-accent', member?.color || pickUserColor(member?.name || member?.phoneE164 || fallbackSeed));
  }
  element.innerHTML = buildAvatarContent(member, fallbackSeed);
}

function renderFloatingProfile(wrapper, label, photo, member, fallbackSeed) {
  if (wrapper) {
    const accent = member?.color || pickUserColor(member?.name || member?.phoneE164 || fallbackSeed);
    wrapper.style.setProperty('--floating-accent', accent);
    wrapper.style.setProperty('--floating-accent-rgb', _hexToRgb(accent));
  }
  if (label) {
    label.textContent = member?.name || fallbackSeed;
  }
  renderAvatarElement(photo, member, fallbackSeed);
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

  const artMembers = getChatOtherMembers(chat).slice(0, 2);
  if (artMembers.length) {
    return `
      <div class="chat-art-besties">
        ${artMembers.map((member, index) => buildMemberAvatarMarkup(
          member,
          `chat-art-besties__avatar ${index === 0 ? 'chat-art-besties__avatar--main' : 'chat-art-besties__avatar--secondary'}`
        )).join('')}
      </div>
    `;
  }

  return `<div class="chat-art-circle"><span>${chat.emoji || '💬'}</span></div>`;
}

function renderActiveChatShell(chat) {
  DOM.chatTitle.textContent = chat.name;

  DOM.chatMemberPips.innerHTML = (chat.members || [])
    .map(member => `<div class="member-pip" style="background-image:url('${member.avatarUrl || ''}'); background-color:${member.color || pickUserColor(member.name || member.phoneE164 || member.id || '')}"></div>`)
    .join('');

  const otherMembers = getChatOtherMembers(chat);
  DOM.chatPresence.innerHTML = otherMembers
    .map(member => `
      <div class="${buildAvatarClass('chat-presence__avatar', member)}" style="${buildAvatarStyle(member)}">
        ${buildAvatarContent(member)}
      </div>
    `)
    .join('');

  const featuredMembers = otherMembers.slice(0, 2);
  const firstMember = featuredMembers[0];
  const secondMember = featuredMembers[1];

  if (DOM.floatingChloe) DOM.floatingChloe.style.display = firstMember ? '' : 'none';
  if (firstMember) renderFloatingProfile(DOM.floatingChloe, DOM.floatingChloeLabel, DOM.floatingChloePhoto, firstMember, '');
  if (DOM.floatingMaria) DOM.floatingMaria.style.display = secondMember ? '' : 'none';
  if (secondMember) renderFloatingProfile(DOM.floatingMaria, DOM.floatingMariaLabel, DOM.floatingMariaPhoto, secondMember, '');
}

// ── Open a chat ───────────────────────────────────────
async function openChat(chat) {
  AppState.activeChat = chat;
  Store.setActiveChat(chat.id);
  if (DOM.btnChatViewToggle) DOM.btnChatViewToggle.hidden = true;

  renderActiveChatShell(chat);

  setDisplay(DOM.chatEmpty, false);
  setDisplay(DOM.chatTopics, false);
  setDisplay(DOM.chatProcessing, true, 'flex');
  setDisplay(DOM.chatPresence, false);
  navigate('chat', 'forward');

  const cachedThreads = Store.getThreads();
  if (cachedThreads.length > 0) {
    setDisplay(DOM.chatProcessing, false);
    DOM.chatMemberPips.style.visibility = 'visible';
    setDisplay(DOM.chatEmpty, false);
    setDisplay(DOM.chatPresence, true, 'flex');
    renderTopics();
  }

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
  if (DOM.recLiveTranscript) {
    DOM.recLiveTranscript.textContent = APP_COPY.listening;
    DOM.recLiveTranscript.classList.add('is-placeholder');
  }
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

function updateAuthEntryCopy() {
  if (DOM.authPhoneSubtitle) {
    DOM.authPhoneSubtitle.textContent = AppState.auth.pendingInviteToken
      ? 'We’ll text you a verification code, then open your invite.'
      : AppState.auth.pendingChatId
        ? 'We’ll text you a verification code, then open your chat.'
        : 'We’ll text you a verification code so you can join chats securely.';
  }

  if (DOM.profileSetupSubtitle) {
    DOM.profileSetupSubtitle.textContent = AppState.auth.pendingInviteToken
      ? 'Choose the name people in this group will see when you join.'
      : 'Pick the name your friends will see in chats and invites.';
  }
}

function buildBackendReadinessMessage(readiness) {
  if (!readiness?.checks) return '';

  if (!readiness.checks.twilioVerify?.ok) {
    return 'Phone sign-in is not configured yet. Add the missing Twilio Verify environment variables before testing auth.';
  }

  const warnings = [];
  if (!readiness.checks.openai?.ok) warnings.push('audio processing');

  if (!warnings.length) return '';
  return `${warnings.join(' and ')} ${warnings.length === 1 ? 'is' : 'are'} not configured yet, so those flows will fail until env vars are added.`;
}

function isAuthBlockedByReadiness(readiness) {
  return !!readiness?.checks && !readiness.checks.twilioVerify?.ok;
}

function supportsDeviceContacts() {
  return !!navigator.contacts?.select;
}

function isContactsOnboardingTarget() {
  return AppState.onboarding.contactsTarget === 'onboarding';
}

function parsePickedContacts(pickedContacts = []) {
  const contacts = [];

  for (const contact of pickedContacts) {
    const name = (contact.name?.[0] || '').trim();
    for (const rawPhone of (contact.tel || [])) {
      const phone = normalizePhoneNumber(rawPhone);
      if (phone) {
        contacts.push({ name: name || phone, phone });
      }
    }
  }

  return contacts;
}

async function pickDeviceContacts() {
  if (!supportsDeviceContacts()) {
    throw new Error('Device contacts are not supported in this browser. Use "Import iCloud / vCard" instead.');
  }

  const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
  return parsePickedContacts(picked);
}

async function addContactsToGroupDraft(contacts) {
  let fresh = contacts.filter(contact =>
    !AppState.onboarding.pendingMembers.some(member => member.phone === contact.phone)
  );

  if (AppState.supabaseOk && fresh.length) {
    const matched = await Promise.all(fresh.map(async contact => {
      const user = await getRegisteredUserByPhone(contact.phone);
      return user ? { name: user.name || contact.name || contact.phone, phone: contact.phone } : null;
    }));
    fresh = matched.filter(Boolean);
  }

  if (!fresh.length) {
    return 0;
  }

  AppState.onboarding.pendingMembers.push(...fresh);
  renderPendingGroupMembers();

  if (AppState.supabaseOk) {
    await saveImportedContacts(getCurrentUserId(), fresh, 'device').catch(() => {});
  }

  return fresh.length;
}

async function saveContactsToAddressBook(contacts) {
  const fresh = contacts.filter(contact => !!contact?.phone);
  if (!fresh.length) return 0;

  if (AppState.supabaseOk) {
    await saveImportedContacts(getCurrentUserId(), fresh, 'device').catch(() => {});
  } else {
    fresh.forEach(contact => {
      if (!AppState.onboarding.pendingMembers.some(member => member.phone === contact.phone)) {
        AppState.onboarding.pendingMembers.push(contact);
      }
    });
  }

  return fresh.length;
}

async function addContactsToActiveChat(contacts) {
  if (!AppState.activeChat?.id) return 0;

  const fresh = contacts.filter(contact => {
    const alreadyMember = AppState.activeChat.members?.some(member => member.phoneE164 === contact.phone);
    return !alreadyMember;
  });

  if (!fresh.length) {
    return 0;
  }

  const result = await addMembersToChat({
    chatId: AppState.activeChat.id,
    ownerUserId: getCurrentUserId(),
    members: fresh,
  });
  await refreshActiveChatAndSettings();

  return {
    addedCount: fresh.length,
    smsWarning: result?.smsWarning || null,
  };
}

async function importDeviceContactsIntoCurrentTarget() {
  const contacts = await pickDeviceContacts();
  if (!contacts.length) return 0;

  if (AppState.onboarding.contactsTarget === 'group-settings') {
    return addContactsToActiveChat(contacts);
  }

  if (isContactsOnboardingTarget()) {
    return saveContactsToAddressBook(contacts);
  }

  return addContactsToGroupDraft(contacts);
}

function activeContactsFeedbackNode() {
  if (isContactsOnboardingTarget()) {
    return DOM.contactsHubFeedback;
  }

  return AppState.onboarding.contactsTarget === 'group-settings'
    ? DOM.groupSettingsFeedback
    : DOM.createGroupFeedback;
}

async function getImportedContactsCountForCurrentUser() {
  if (!AppState.supabaseOk) {
    return AppState.onboarding.pendingMembers.length;
  }

  try {
    const contacts = await getImportedContactsForUser(getCurrentUserId());
    return contacts.length;
  } catch (error) {
    console.warn('[yAp] imported contacts lookup failed:', error);
    return 0;
  }
}

async function completeContactsOnboarding() {
  await refreshChats();
  navigate('chats', 'fade');
  renderChatsList();
}

async function routeFirstRunEmptyState() {
  const importedContactsCount = await getImportedContactsCountForCurrentUser();
  if (!importedContactsCount) {
    await openContactsHub('onboarding');
    if (!supportsDeviceContacts()) {
      setFeedback(
        DOM.contactsHubFeedback,
        'Web apps on iPhone cannot auto-sync the full address book. Import an iCloud/vCard file here to bring your contacts in.',
        'error'
      );
    }
    return;
  }

  navigate('chats', 'fade');
  renderChatsList();
}

async function handleDirectDeviceContactsImport() {
  const feedbackNode = activeContactsFeedbackNode();
  setFeedback(feedbackNode, '');

  try {
    const importResult = await importDeviceContactsIntoCurrentTarget();
    const addedCount = typeof importResult === 'number' ? importResult : (importResult?.addedCount || 0);
    const successMessage = AppState.onboarding.contactsTarget === 'group-settings'
      ? (addedCount
        ? `Added ${addedCount} contact${addedCount === 1 ? '' : 's'} to this group.`
        : 'No new registered yAp users were found in those contacts.')
      : isContactsOnboardingTarget()
        ? (addedCount
          ? `Connected ${addedCount} contact${addedCount === 1 ? '' : 's'} from your phone.`
          : 'Those contacts are already connected.')
      : (addedCount
        ? `Added ${addedCount} contact${addedCount === 1 ? '' : 's'} to the To field.`
        : 'No new registered yAp users were found in those contacts.');

    if (AppState.onboarding.contactsTarget === 'group-settings') {
      await refreshActiveChatAndSettings();
    } else if (isContactsOnboardingTarget()) {
      await renderContactsHub();
    } else {
      renderPendingGroupMembers();
      await renderCreateGroupPicker();
    }

    setFeedback(feedbackNode, successMessage, addedCount ? 'success' : '');

    if (isContactsOnboardingTarget() && addedCount) {
      setTimeout(() => {
        completeContactsOnboarding();
      }, 250);
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    setFeedback(feedbackNode, error.message || 'We could not load contacts.', 'error');
  }
}

function triggerDirectContactsEntry(target = 'create-group') {
  AppState.onboarding.contactsTarget = target;

  if (supportsDeviceContacts()) {
    return handleDirectDeviceContactsImport();
  }

  if (target === 'group-settings') {
    openContactsHub().then(() => {
      setFeedback(
        DOM.contactsHubFeedback,
        'Direct iPhone contact picking is not available in this browser. Import an iCloud/vCard file instead.',
        'error'
      );
    });
    return Promise.resolve();
  }

  openContactsHub().then(() => {
    setFeedback(
      DOM.contactsHubFeedback,
      'Direct iPhone contact picking is not available in this browser. Import an iCloud/vCard file instead.',
      'error'
    );
  });
  return Promise.resolve();
}

function updateContactsHubChrome() {
  const inGroupSettings = AppState.onboarding.contactsTarget === 'group-settings';
  const inOnboarding = isContactsOnboardingTarget();

  if (DOM.contactsHubIntro) {
    DOM.contactsHubIntro.hidden = false;
  }

  if (DOM.contactsHubTitle) {
    DOM.contactsHubTitle.textContent = inOnboarding
      ? 'Connect your contacts.'
      : inGroupSettings
        ? 'Add people to this group.'
        : 'Your contacts.';
  }
  if (DOM.contactsHubBody) {
    DOM.contactsHubBody.textContent = inOnboarding
      ? (supportsDeviceContacts()
        ? 'Allow access to the contacts on your phone, then we will drop you straight into Chats.'
        : 'On the web, iPhone does not expose full automatic contact sync. Import your iCloud/vCard contacts here so your chat list can start from real people.')
      : inGroupSettings
        ? 'Pull in real contacts, then add them directly into the current group.'
        : 'Import real contacts, then tap to add them into your group draft.';
  }
  if (DOM.btnContactsHubDevice) {
    DOM.btnContactsHubDevice.hidden = !supportsDeviceContacts();
  }
  if (DOM.btnContactsHubClose) {
    DOM.btnContactsHubClose.setAttribute('aria-label', inOnboarding ? 'Continue to chats' : 'Close contacts');
  }
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
    const message = err?.message || 'We could not start recording on this device.';
    console.warn('[yAp] startRecording failed:', err);
    showIOSAlert(message, { title: 'Microphone Unavailable' });
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
        refreshChats().then(() => renderChatsList());
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
        showIOSAlert(errorMessage, { title: 'Message Not Sent' });
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

function formatVerifyFailureMessage() {
  return 'Incorrect code entered\nPlease check the code and try again';
}

function setButtonBusy(button, isBusy, busyLabel) {
  if (!button) return;
  if (!button.dataset.idleLabel) {
    button.dataset.idleLabel = button.textContent;
  }
  button.disabled = isBusy;
  button.textContent = isBusy ? busyLabel : button.dataset.idleLabel;
}

function buildInviteLink(inviteToken) {
  if (!inviteToken) return '';
  const url = new URL(window.location.href);
  url.searchParams.delete('chat');
  url.searchParams.set('invite', inviteToken);
  return url.toString();
}

function formatInviteShareText(invites = []) {
  const lines = invites
    .filter(invite => invite?.invite_token)
    .map(invite => {
      const label = invite.invitee_name || invite.phone_e164 || 'Invite';
      return `${label}: ${buildInviteLink(invite.invite_token)}`;
    });

  return lines.join('\n');
}

async function shareInviteLinks(invites = [], { source = 'group' } = {}) {
  const shareText = formatInviteShareText(invites);
  if (!shareText) {
    showIOSAlert(
      source === 'draft'
        ? 'Create the group first, then yAp can generate invite links for each person.'
        : 'No invite links are ready yet for this group.',
      { title: 'Invite Links' }
    );
    return false;
  }

  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Join me on yAp',
        text: shareText,
      });
      return true;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText);
      return true;
    }
  } catch (error) {
    if (error?.name === 'AbortError') return false;
    throw error;
  }

  showIOSAlert(shareText, { title: 'Invite Links' });
  return true;
}

function showIOSAlert(message, options = {}) {
  const overlay = DOM.iosAlertOverlay;
  if (!overlay) return;

  const {
    title = 'Alert',
    actionLabel = 'OK',
    onDismiss = null,
  } = options;

  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('visible');
  DOM.iosAlertTitle.textContent = title;
  DOM.iosAlertMessage.textContent = message;
  DOM.iosAlertAction.textContent = actionLabel;
  overlay._onDismiss = typeof onDismiss === 'function' ? onDismiss : null;
}

function dismissIOSAlert() {
  const overlay = DOM.iosAlertOverlay;
  if (!overlay) return;
  overlay.classList.remove('visible');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.hidden = true;
  const onDismiss = overlay._onDismiss;
  overlay._onDismiss = null;
  if (onDismiss) onDismiss();
}

function validationMessageForField(field) {
  const title = field?.closest('label')?.querySelector('.entry-label, .ios-settings-row__title, .ios-group-hero__caption')?.textContent
    ?.replace(/\(optional\)/ig, '')
    ?.trim();

  if (field?.id === 'input-auth-phone') return { title: 'Phone Number', message: 'Enter the phone number you want to use with yAp.' };
  if (field?.id === 'input-auth-code') return { title: 'Verification Code', message: 'Enter the verification code from your text message.' };
  if (field?.id === 'input-profile-name' || field?.id === 'input-manage-profile-name') {
    return { title: 'Display Name', message: 'Enter the name people will see in the conversation.' };
  }
  if (field?.id === 'input-group-settings-name') {
    return { title: 'Group Name', message: 'Enter a group name before you tap Done.' };
  }

  return {
    title: title || 'Missing Information',
    message: title ? `Enter a value for ${title}.` : 'Fill in the required field before continuing.',
  };
}

function validateFormWithIOSAlert(form) {
  if (!form) return true;
  const invalidField = form.querySelector(':invalid');
  if (!invalidField) return true;

  const { title, message } = validationMessageForField(invalidField);
  showIOSAlert(message, {
    title,
    onDismiss: () => invalidField.focus(),
  });
  return false;
}

function resetCreateGroupComposer() {
  AppState.onboarding.pendingMembers = [];
  AppState.onboarding.createGroupSearchQuery = '';
  if (DOM.formCreateGroup) DOM.formCreateGroup.reset();
  if (DOM.inputCreateGroupSearch) DOM.inputCreateGroupSearch.value = '';
  setFeedback(DOM.createGroupFeedback, '');
  renderPendingGroupMembers();
  renderCreateGroupPicker();
}

function renderPendingGroupMembers() {
  if (!DOM.groupMemberList) return;

  if (!AppState.onboarding.pendingMembers.length) {
    DOM.groupMemberList.innerHTML = '';
    DOM.groupMemberList.hidden = true;
    if (DOM.createChatCreateBar) DOM.createChatCreateBar.hidden = true;
    return;
  }

  DOM.groupMemberList.innerHTML = AppState.onboarding.pendingMembers.map(member => `
    <div class="entry-member-pill" data-member-phone="${escapeHtml(member.phone)}">
      <span class="entry-member-pill__name">${escapeHtml(member.name || member.phone || 'New member')}</span>
      <button class="entry-member-pill__remove" type="button" data-remove-member="${escapeHtml(member.phone)}" aria-label="Remove ${escapeHtml(member.name || member.phone)}">×</button>
    </div>
  `).join('');
  DOM.groupMemberList.hidden = false;
  if (DOM.createChatCreateBar) DOM.createChatCreateBar.hidden = false;
}

async function getCreateGroupContacts() {
  if (AppState.supabaseOk) {
    return getImportedContactsForUser(getCurrentUserId());
  }

  return AppState.onboarding.pendingMembers.map((member, index) => ({
    id: `draft-contact-${index}`,
    display_name: member.name,
    phone_e164: member.phone,
    matchedUser: null,
  }));
}

function buildCreateGroupContactIndex(contacts = []) {
  const deduped = [];
  const seen = new Set();

  contacts.forEach(contact => {
    const phone = contact.phone_e164 || '';
    if (!phone || seen.has(phone)) return;
    seen.add(phone);
    deduped.push(contact);
  });

  return deduped.sort((a, b) => {
    const aName = (a.display_name || a.matchedUser?.name || a.phone_e164 || '').toLowerCase();
    const bName = (b.display_name || b.matchedUser?.name || b.phone_e164 || '').toLowerCase();
    return aName.localeCompare(bName);
  });
}

function renderCreateGroupContactRow(contact, { compact = false } = {}) {
  const phone = contact.phone_e164 || '';
  const matchedUser = contact.matchedUser || null;
  const isSelected = AppState.onboarding.pendingMembers.some(member => member.phone === phone);
  const displayName = contact.display_name || matchedUser?.name || phone || 'Unknown contact';
  const isSelf = matchedUser?.id === getCurrentUserId();
  const statusBadge = isSelf
    ? 'You'
    : matchedUser
      ? 'On yAp'
      : 'Not on yAp';
  const subtitle = isSelf
    ? 'Message yourself'
    : matchedUser
      ? (compact ? phone : 'Can join instantly')
      : (compact ? phone : 'Registered users only');
  const compactSubline = compact ? '' : `<div class="create-chat-picker__contact-sub">${escapeHtml(subtitle)}</div>`;
  const avatarContent = matchedUser?.avatarUrl
    ? ''
    : `<img class="create-chat-picker__contact-placeholder" src="assets/contact-placeholder.svg" alt="" aria-hidden="true">`;
  const isAddable = !!matchedUser && !isSelected;

  return `
    <button class="create-chat-picker__contact-row${isSelected ? ' is-added' : ''}" type="button" data-add-create-group-contact="${escapeHtml(phone)}" ${isAddable ? '' : 'disabled'}>
      <div class="create-chat-picker__contact-avatar ${matchedUser?.avatarUrl ? '' : 'avatar-fallback'}" style="${matchedUser?.avatarUrl ? `background-image:url('${matchedUser.avatarUrl}')` : `--avatar-accent:${pickUserColor(displayName)}`}">
        ${avatarContent}
      </div>
      <div class="create-chat-picker__contact-meta">
        <div class="create-chat-picker__contact-name-row">
          <div class="create-chat-picker__contact-name">${escapeHtml(displayName)}</div>
          <span class="create-chat-picker__contact-badge create-chat-picker__contact-badge--${isSelf ? 'self' : matchedUser ? 'registered' : 'invite'}">${escapeHtml(statusBadge)}</span>
        </div>
        ${compactSubline}
      </div>
    </button>
  `;
}

async function renderCreateGroupPicker() {
  if (!DOM.createChatContacts) return;

  const query = String(AppState.onboarding.createGroupSearchQuery || '').trim().toLowerCase();
  const allContacts = buildCreateGroupContactIndex(await getCreateGroupContacts());
  const filteredContacts = !query
    ? []
    : allContacts.filter(contact => {
      const haystack = [
        contact.display_name,
        contact.phone_e164,
        contact.matchedUser?.name,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });

  const exactPhone = normalizePhoneNumber(query);
  const manualMatchedUser = exactPhone ? await getRegisteredUserByPhone(exactPhone) : null;
  const canAddManual = !!exactPhone
    && !!manualMatchedUser
    && !allContacts.some(contact => contact.phone_e164 === exactPhone)
    && !AppState.onboarding.pendingMembers.some(member => member.phone === exactPhone);

  if (!query) {
    DOM.createChatContacts.innerHTML = '';
    DOM.createChatContacts.hidden = true;
    return;
  }

  const rows = filteredContacts.map(contact => renderCreateGroupContactRow(contact, { compact: true })).join('');
  const manualRow = canAddManual ? `
    <button class="create-chat-picker__contact-row" type="button" data-add-manual-create-group="${escapeHtml(exactPhone)}">
      <div class="create-chat-picker__contact-avatar avatar-fallback" style="--avatar-accent:${pickUserColor(exactPhone)}">
        <img class="create-chat-picker__contact-placeholder" src="assets/contact-placeholder.svg" alt="" aria-hidden="true">
      </div>
      <div class="create-chat-picker__contact-meta">
        <div class="create-chat-picker__contact-name">${escapeHtml(manualMatchedUser?.name || exactPhone)}</div>
        <div class="create-chat-picker__contact-sub">${escapeHtml(exactPhone)}</div>
      </div>
    </button>
  ` : '';

  DOM.createChatContacts.hidden = false;
  DOM.createChatContacts.innerHTML = rows || manualRow
    ? `<div class="create-chat-picker__contact-card">${manualRow}${rows}</div>`
    : `<div class="create-chat-picker__empty">${exactPhone ? 'That number is not on yAp yet.' : 'No matches yet.'}</div>`;
}

async function addPendingGroupMember() {
  const rawValue = String(DOM.inputCreateGroupSearch?.value || '').trim();
  const phone = normalizePhoneNumber(rawValue);
  const name = String(DOM.inputMemberName?.value || '').trim();
  let resolvedPhone = phone;
  let resolvedName = name;

  if (!resolvedPhone && rawValue) {
    const contacts = buildCreateGroupContactIndex(await getCreateGroupContacts());
    const exactMatch = contacts.find(contact => {
      const displayName = (contact.display_name || contact.matchedUser?.name || '').trim().toLowerCase();
      return displayName === rawValue.toLowerCase();
    });
    if (exactMatch) {
      resolvedPhone = exactMatch.phone_e164 || '';
      resolvedName = exactMatch.display_name || exactMatch.matchedUser?.name || resolvedPhone;
    }
  }

  if (!resolvedPhone) {
    setFeedback(DOM.createGroupFeedback, 'Add a valid phone number for each member.', 'error');
    DOM.inputCreateGroupSearch?.focus();
    return;
  }

  if (AppState.supabaseOk) {
    const matchedUser = await getRegisteredUserByPhone(resolvedPhone);
    if (!matchedUser) {
      setFeedback(DOM.createGroupFeedback, 'That phone number is not on yAp yet. Right now you can only add registered users.', 'error');
      DOM.inputCreateGroupSearch?.focus();
      return;
    }
    resolvedName = matchedUser.name || resolvedName || resolvedPhone;
  }

  if (AppState.onboarding.pendingMembers.some(member => member.phone === resolvedPhone)) {
    setFeedback(DOM.createGroupFeedback, 'That phone number is already in this group.', 'error');
    return;
  }

  AppState.onboarding.pendingMembers.push({
    name: resolvedName || resolvedPhone,
    phone: resolvedPhone,
  });

  DOM.inputMemberName.value = '';
  if (DOM.inputMemberPhone) DOM.inputMemberPhone.value = '';
  if (DOM.inputCreateGroupSearch) DOM.inputCreateGroupSearch.value = '';
  AppState.onboarding.createGroupSearchQuery = '';
  setFeedback(DOM.createGroupFeedback, '');
  renderPendingGroupMembers();
  renderCreateGroupPicker();
  requestAnimationFrame(() => DOM.inputCreateGroupSearch?.focus());
}

async function importContactsFromVCard(file) {
  if (!file) return;

  const text = await file.text();
  const contacts = parseVCardContacts(text);
  if (!contacts.length) {
    throw new Error('We could not find any phone numbers in that vCard file.');
  }

  if (AppState.supabaseOk) {
    await saveImportedContacts(getCurrentUserId(), contacts, 'icloud_vcard');
    setFeedback(
      DOM.createGroupFeedback,
      `Imported ${contacts.length} contact${contacts.length === 1 ? '' : 's'}. Start typing a name or number to add people.`,
      'success'
    );
    return;
  }

  const newContacts = contacts.filter(contact =>
    !AppState.onboarding.pendingMembers.some(existing => existing.phone === contact.phone)
  );

  if (!newContacts.length) {
    throw new Error('Those contacts are already in this group draft.');
  }

  AppState.onboarding.pendingMembers.push(...newContacts);
  renderPendingGroupMembers();
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
  } else if (!isContactsOnboardingTarget()) {
    contacts.forEach(contact => {
      if (!AppState.onboarding.pendingMembers.some(existing => existing.phone === contact.phone)) {
        AppState.onboarding.pendingMembers.push(contact);
      }
    });
  }

  await renderContactsHub();
  setFeedback(DOM.contactsHubFeedback, `Imported ${contacts.length} contact${contacts.length === 1 ? '' : 's'} from vCard.`, 'success');

  if (isContactsOnboardingTarget()) {
    setTimeout(() => {
      completeContactsOnboarding();
    }, 250);
  }
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
    DOM.contactsHubList.innerHTML = `<div class="settings-list__empty">${
      isContactsOnboardingTarget()
        ? 'No contacts connected yet. Bring in your phone contacts to get started.'
        : 'No imported contacts yet. Import a vCard to start building your group.'
    }</div>`;
    return;
  }

  DOM.contactsHubList.innerHTML = contacts.map(contact => {
    const phone = contact.phone_e164 || '';
    const inGroup = !!AppState.activeChat?.members?.some(member => member.phoneE164 === phone);
    const invited = !!pendingInvites.some(invite => invite.phone_e164 === phone);
    const selected = AppState.onboarding.pendingMembers.some(member => member.phone === phone);
    const matchedUser = contact.matchedUser;
    const initials = buildUserInitials(contact.display_name || phone || 'C');
    const inOnboarding = isContactsOnboardingTarget();
    const status = inOnboarding
      ? (matchedUser ? 'On yAp' : 'Imported')
      : AppState.onboarding.contactsTarget === 'group-settings'
      ? (inGroup ? 'In Conversation' : invited ? 'Pending' : matchedUser ? 'On yAp' : 'Not on yAp')
      : (selected ? 'Added' : matchedUser ? 'On yAp' : 'Not on yAp');
    const isDisabled = inOnboarding
      ? true
      : AppState.onboarding.contactsTarget === 'group-settings'
      ? inGroup || invited || !matchedUser
      : selected || !matchedUser;
    const buttonLabel = inOnboarding
      ? 'Saved'
      : AppState.onboarding.contactsTarget === 'group-settings'
      ? (inGroup ? 'Added' : invited ? 'Pending' : matchedUser ? 'Add' : 'Unavailable')
      : (selected ? 'Added' : matchedUser ? 'Add' : 'Unavailable');

    return `
      <div class="contacts-hub-row" data-contact-phone="${escapeHtml(phone)}">
        <div class="contacts-hub-row__avatar" style="${matchedUser?.avatarUrl ? `background-image:url('${matchedUser.avatarUrl}')` : ''}">${escapeHtml(initials)}</div>
        <div class="contacts-hub-row__meta">
          <div class="contacts-hub-row__name">${escapeHtml(contact.display_name || matchedUser?.name || 'Unknown contact')}</div>
          <div class="contacts-hub-row__sub">${escapeHtml(phone)}</div>
        </div>
        <div class="contacts-hub-row__actions">
          ${status ? `<span class="contacts-hub-row__status">${escapeHtml(status)}</span>` : ''}
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
    const demoChats = CHATS.filter(chat => chat.members.some(member => member.id === getCurrentUserId()));
    const demoIds = new Set(demoChats.map(c => c.id));
    const pending = (AppState.pendingChats || []).filter(c => !demoIds.has(c.id));
    AppState.chats = [...pending, ...demoChats];
    return AppState.chats;
  }

  const remoteChats = await getChatsForUser(getCurrentUserId());
  const pendingChatFreshnessMs = 2 * 60 * 1000;
  const now = Date.now();

  AppState.pendingChats = (AppState.pendingChats || []).filter(chat => {
    const createdAt = Number(chat?.localCreatedAt || chat?.lastMessageAt || 0);
    return !!chat?.id && (now - createdAt) < pendingChatFreshnessMs;
  });

  const remoteIds = new Set(remoteChats.map(chat => chat.id));
  const mergedChats = [
    ...remoteChats,
    ...AppState.pendingChats.filter(chat => !remoteIds.has(chat.id)),
  ].sort((a, b) => (b.lastMessageAt || b.localCreatedAt || 0) - (a.lastMessageAt || a.localCreatedAt || 0));

  AppState.chats = mergedChats;
  AppState.pendingChats = AppState.pendingChats.filter(chat => !remoteIds.has(chat.id));
  if (AppState.activeChat?.id) {
    AppState.activeChat = AppState.chats.find(chat => chat.id === AppState.activeChat.id) || AppState.activeChat;
  }
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
  syncProfileSetupAvatarPreview();
}

function renderProfileSettings() {
  const currentUser = getCurrentUser();
  setAvatarPickerPreview({
    element: DOM.profileSettingsAvatar,
    imageUrl: currentUser.avatarUrl,
    fallbackText: buildUserInitials(currentUser.name || 'You'),
    accent: pickUserColor(currentUser.name || 'You'),
  });
  DOM.profileSettingsPhone.textContent = currentUser.phoneE164 || AppState.auth.session?.user?.phone || 'Phone sign-in';
  DOM.inputManageProfileName.value = currentUser.name || '';
  DOM.inputManageProfileAvatar.value = currentUser.avatarUrl || '';
  syncProfileManageAvatarLabel(currentUser);
  setFeedback(DOM.profileManageFeedback, '');
}

async function persistManagedProfile({ showSuccess = false } = {}) {
  const nextName = DOM.inputManageProfileName?.value?.trim() || 'You';
  const nextAvatar = DOM.inputManageProfileAvatar?.value?.trim() || '';

  const savedUser = await saveUserProfile({
    userId: getCurrentUserId(),
    authUserId: AppState.auth.session?.user?.id || null,
    name: nextName,
    avatarUrl: nextAvatar,
    phone: AppState.auth.session?.user?.phone || getCurrentUser().phoneE164,
  });

  setCurrentUserId(savedUser.id);
  renderProfileSettings();
  await refreshChats();
  renderChatsList();
  if (AppState.activeChat?.members?.some(member => member.id === savedUser.id)) {
    AppState.activeChat = AppState.chats.find(chat => chat.id === AppState.activeChat.id) || AppState.activeChat;
  }
  if (showSuccess) {
    setFeedback(DOM.profileManageFeedback, 'Profile updated.', 'success');
  }
  return savedUser;
}

function extractLinkCardsFromChat(chat) {
  const messages = (chat?.threads || []).flatMap(thread => thread.messages || []);
  const seen = new Set();
  const cards = [];

  for (const message of messages) {
    const transcript = String(message?.transcript || message?.label || '').trim();
    if (!transcript) continue;
    const matches = transcript.match(/https?:\/\/[^\s)]+/gi) || [];
    for (const rawUrl of matches) {
      if (seen.has(rawUrl)) continue;
      seen.add(rawUrl);
      let host = '';
      try {
        host = new URL(rawUrl).hostname.replace(/^www\./, '');
      } catch {
        host = 'shared link';
      }
      cards.push({
        id: `${message.id}-${rawUrl}`,
        url: rawUrl,
        host,
        title: clipWords(transcript.replace(rawUrl, '').trim() || host, 8),
        byline: message.author?.name || 'Shared',
        accent: message.author?.color || '#b8d8ff',
        avatarUrl: message.author?.avatarUrl || '',
        initials: buildUserInitials(message.author?.name || 'Y'),
      });
      if (cards.length >= 8) return cards;
    }
  }

  return cards;
}

function buildGroupSettingsPhotoTiles(chat) {
  const memberTiles = (chat?.members || [])
    .filter(member => member?.avatarUrl)
    .map((member, index) => ({
      id: `${member.id}-${index}`,
      imageUrl: member.avatarUrl,
      initials: buildUserInitials(member.name || 'Y'),
      accent: member.color || pickUserColor(member.name || member.phoneE164 || member.id || ''),
      badge: buildUserInitials(member.name || 'Y'),
      badgeAccent: member.color || '#9fb3f0',
    }));

  if (memberTiles.length) return memberTiles.slice(0, 8);

  return (chat?.members || []).slice(0, 6).map((member, index) => ({
    id: `${member.id}-${index}`,
    imageUrl: '',
    initials: buildUserInitials(member.name || 'Y'),
    accent: member.color || pickUserColor(member.name || member.phoneE164 || member.id || ''),
    badge: buildUserInitials(member.name || 'Y'),
    badgeAccent: member.color || '#9fb3f0',
  }));
}

function renderGroupSettingsTabState() {
  AppState.groupSettingsTab = 'info';
  DOM.groupSettingsPanels?.forEach(panel => {
    const active = panel.dataset.groupSettingsPanel === 'info';
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
}

function renderGroupSettings(invites = []) {
  const chat = AppState.activeChat;
  if (!chat) return;
  const canManage = canManageActiveChat();
  const editing = canManage && AppState.groupSettingsEditing;
  const members = chat.members || [];
  AppState.groupSettingsInvites = invites;

  if (DOM.inputGroupSettingsName) {
    DOM.inputGroupSettingsName.value = chat.name || '';
    DOM.inputGroupSettingsName.disabled = !editing;
    DOM.inputGroupSettingsName.readOnly = !editing;
  }
  if (DOM.inputGroupMemberName) DOM.inputGroupMemberName.disabled = !editing;
  if (DOM.inputGroupMemberPhone) DOM.inputGroupMemberPhone.disabled = !editing;
  if (DOM.btnAddGroupSettingsMember) DOM.btnAddGroupSettingsMember.disabled = !editing;
  if (DOM.btnSaveGroupSettings) {
    DOM.btnSaveGroupSettings.disabled = !canManage;
    DOM.btnSaveGroupSettings.textContent = editing ? 'Done' : 'Edit';
    DOM.btnSaveGroupSettings.classList.toggle('is-disabled', !canManage);
  }
  DOM.groupSettingsInviteCard?.classList.toggle('is-hidden', !editing);
  if (DOM.toggleGroupHideAlerts) DOM.toggleGroupHideAlerts.checked = !!AppState.groupSettingsPrefs.hideAlerts;

  if (DOM.groupSettingsHeroAvatars) {
    DOM.groupSettingsHeroAvatars.innerHTML = members.slice(0, 3).map(member => `
      <div class="${buildAvatarClass('group-details-hero__avatar', member)}" style="${buildAvatarStyle(member)}">
        ${buildAvatarContent(member)}
      </div>
    `).join('');
  }

  if (DOM.groupSettingsPeopleStrip) {
    const invitePhoneSet = new Set(invites.map(invite => invite.phone_e164).filter(Boolean));
    const peopleStripEntries = [
      ...members.map(member => ({
        member,
        status: member.id === getCurrentUserId() ? 'You' : (member.pending || invitePhoneSet.has(member.phoneE164) ? 'Pending Invite' : ''),
        key: member.id || member.phoneE164 || member.name || '',
      })),
      ...invites
        .filter(invite => invite.phone_e164 && !members.some(member => member.phoneE164 === invite.phone_e164))
        .map(invite => ({
          member: {
            id: `invite-${invite.id}`,
            name: invite.invitee_name || invite.phone_e164 || 'Pending invite',
            phoneE164: invite.phone_e164 || '',
            pending: true,
          },
          status: 'Pending',
          key: `invite-${invite.id}`,
        })),
    ];
    const addNode = canManage ? `
      <button class="group-details-person group-details-person--add" id="btn-group-settings-browse-contacts" type="button" aria-label="Add contact">
        <span class="group-details-person__avatar">+</span>
        <span class="group-details-person__name">Add</span>
      </button>
    ` : '';

    DOM.groupSettingsPeopleStrip.innerHTML = `
      ${peopleStripEntries.map(({ member, status }) => `
        <div class="group-details-person">
          <div class="${buildAvatarClass('group-details-person__avatar', member)}" style="${buildAvatarStyle(member)}">
            ${buildAvatarContent(member)}
          </div>
          <div class="group-details-person__name">${escapeHtml(member.name || member.phoneE164 || 'Member')}</div>
          ${status ? `<div class="group-details-person__status">${escapeHtml(status)}</div>` : ''}
        </div>
      `).join('')}
      ${addNode}
    `;
  }

  DOM.groupSettings?.setAttribute('data-group-background', AppState.groupSettingsBackground);

  renderGroupSettingsTabState();

  setFeedback(DOM.groupSettingsFeedback, '');
}

async function openProfileScreen() {
  navigate('profile', 'forward');
  requestAnimationFrame(() => {
    renderProfileSettings();
  });
}

async function openGroupSettingsScreen() {
  if (!AppState.activeChat) return;
  AppState.groupSettingsEditing = false;
  AppState.groupSettingsTab = 'info';
  try {
    const invites = AppState.supabaseOk ? await getInvitationsForChat(AppState.activeChat.id) : [];
    renderGroupSettings(invites);
  } catch (_) {
    try { renderGroupSettings([]); } catch (__) {}
  }
  navigate('group-settings', 'forward');
}

async function refreshActiveChatAndSettings() {
  await refreshChats();
  if (!AppState.activeChat) return;
  AppState.activeChat = AppState.chats.find(chat => chat.id === AppState.activeChat.id) || AppState.activeChat;
  renderActiveChatShell(AppState.activeChat);
  const invites = AppState.supabaseOk ? await getInvitationsForChat(AppState.activeChat.id) : [];
  renderGroupSettings(invites);
  renderChatsList();
}

async function openContactsHub(target = 'create-group') {
  AppState.onboarding.contactsTarget = target;
  setFeedback(DOM.contactsHubFeedback, '');
  updateContactsHubChrome();
  await renderContactsHub();
  navigate('contacts-hub', 'forward');
  if (!DOM.contactsHubList?.querySelector('.contacts-hub-row') && !supportsDeviceContacts()) {
    setFeedback(
      DOM.contactsHubFeedback,
      'Import an iCloud/vCard file to add contacts on iPhone Safari.',
      'success'
    );
  }
}


async function routeAuthenticatedUser() {
  const authSession = AppState.auth.session;
  if (!authSession) {
    stopRemoteSync();
    clearScreenHistory();
    if (AppState.auth.pendingInviteToken || AppState.auth.pendingChatId) {
      updateAuthEntryCopy();
      navigate('auth-phone', 'fade');
      setFeedback(
        DOM.authPhoneFeedback,
        AppState.auth.pendingInviteToken
          ? 'Sign in with your phone to open this invite.'
          : 'Sign in with your phone to open this chat.',
        'success'
      );
      DOM.inputAuthPhone?.focus();
      return;
    }

    navigate('welcome', 'fade');
    return;
  }

  startRemoteSync();
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
    updateAuthEntryCopy();
    navigate('profile-setup', 'fade');
    return;
  }

  let joinedChatId = null;
  if (AppState.auth.pendingInviteToken) {
    try {
      joinedChatId = await acceptInviteToken(
        AppState.auth.pendingInviteToken,
        appUser.id,
        appUser.phoneE164 || authSession?.user?.phone || ''
      );
      if (joinedChatId) {
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        window.history.replaceState({}, '', url.toString());
        AppState.auth.pendingInviteToken = '';
      }
    } catch (error) {
      console.warn('[yAp] invite acceptance failed:', error);
      setFeedback(
        DOM.authPhoneFeedback,
        error.message || 'We could not open that invite yet. You can still sign in and try again.',
        'error'
      );
    }
  }

  await refreshChats();

  if (AppState.auth.pendingChatId) {
    const linkedChat = await waitForChatAvailability(AppState.auth.pendingChatId, { attempts: 6, delayMs: 850 });
    if (linkedChat) {
      clearPendingChatLink();
      await openChat(linkedChat);
      return;
    }
  }

  if (!AppState.chats.length) {
    AppState.sync.chatSnapshot = buildChatActivitySnapshot(AppState.chats);
    navigate('chats', 'fade');
    renderChatsList();
    return;
  }

  if (joinedChatId) {
    const invitedChat = AppState.chats.find(chat => chat.id === joinedChatId);
    if (invitedChat) {
      await openChat(invitedChat);
      return;
    }
  }

  AppState.sync.chatSnapshot = buildChatActivitySnapshot(AppState.chats);
  navigate('chats', 'fade');
  requestAnimationFrame(renderChatsList);
}

async function resolveInitialRoute() {
  const params = new URLSearchParams(window.location.search);
  AppState.auth.pendingInviteToken = params.get('invite') || '';
  AppState.auth.pendingChatId = params.get('chat') || '';
  updateAuthEntryCopy();
  clearScreenHistory();
  AppState.auth.backendReadiness = await fetchBackendReadiness();

  if (!AppState.supabaseOk) {
    AppState.auth.session = null;
    AppState.chats = [];
    Store.clear();
    navigate('auth-phone', 'fade');
    setFeedback(
      DOM.authPhoneFeedback,
      'Finish backend setup before testing sign-in and chats.',
      'error'
    );
    return;
  }

  const readinessMessage = buildBackendReadinessMessage(AppState.auth.backendReadiness);
  if (readinessMessage && isAuthBlockedByReadiness(AppState.auth.backendReadiness)) {
    navigate('auth-phone', 'fade');
    setFeedback(DOM.authPhoneFeedback, readinessMessage, 'error');
    return;
  }

  AppState.auth.session = await getAuthSession();
  await routeAuthenticatedUser();

  if (readinessMessage && !isAuthBlockedByReadiness(AppState.auth.backendReadiness)) {
    setFeedback(DOM.authPhoneFeedback, readinessMessage, 'error');
  }
}

async function safeResolveInitialRoute() {
  try {
    await resolveInitialRoute();
  } catch (error) {
    console.error('[yAp] initial route failed:', error);
    navigate('auth-phone', 'fade');
    setFeedback(
      DOM.authPhoneFeedback,
      error.message || 'We hit a setup error while opening yAp. Try signing in again.',
      'error'
    );
  }
}

// ── Event wiring ──────────────────────────────────────
function wireEvents() {
  DOM.btnGetStarted?.addEventListener('click', () => {
    updateAuthEntryCopy();
    setFeedback(DOM.authPhoneFeedback, '');
    navigate('auth-phone', 'forward');
    DOM.inputAuthPhone?.focus();
  });

  DOM.btnAuthPhoneBack?.addEventListener('click', () => {
    updateAuthEntryCopy();
    setFeedback(DOM.authPhoneFeedback, '');
    goBack('welcome');
  });

  DOM.formAuthPhone?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validateFormWithIOSAlert(DOM.formAuthPhone)) return;
    setFeedback(DOM.authPhoneFeedback, '');
    setButtonBusy(DOM.btnSendCode, true, 'Sending...');

    try {
      const phone = await sendPhoneOtp(DOM.inputAuthPhone.value);
      AppState.auth.pendingPhone = phone;
      DOM.authVerifySubtitle.textContent = `We sent a verification code to ${phone}.`;
      DOM.inputAuthCode.value = '';
      setFeedback(DOM.authVerifyFeedback, '');
      updateAuthEntryCopy();
      navigate('auth-verify', 'forward');
      DOM.inputAuthCode.focus();
    } catch (error) {
      setFeedback(DOM.authPhoneFeedback, error.message || 'We could not send a verification code right now.', 'error');
    } finally {
      setButtonBusy(DOM.btnSendCode, false);
    }
  });

  DOM.btnAuthVerifyBack?.addEventListener('click', () => {
    updateAuthEntryCopy();
    setFeedback(DOM.authVerifyFeedback, '');
    goBack('auth-phone');
    DOM.inputAuthPhone?.focus();
  });

  DOM.btnAuthVerifyResend?.addEventListener('click', async () => {
    setFeedback(DOM.authVerifyFeedback, '');
    setButtonBusy(DOM.btnAuthVerifyResend, true, 'Resending...');

    try {
      const phone = await sendPhoneOtp(AppState.auth.pendingPhone || DOM.inputAuthPhone?.value || '');
      AppState.auth.pendingPhone = phone;
      DOM.authVerifySubtitle.textContent = `We sent a verification code to ${phone}.`;
      DOM.inputAuthCode.value = '';
      setFeedback(DOM.authVerifyFeedback, 'A new verification code has been sent.', 'success');
      DOM.inputAuthCode?.focus();
    } catch (error) {
      setFeedback(DOM.authVerifyFeedback, 'We could not resend the verification code right now.', 'error');
    } finally {
      setButtonBusy(DOM.btnAuthVerifyResend, false);
    }
  });

  DOM.btnProfileSetupBack?.addEventListener('click', () => {
    setFeedback(DOM.profileSetupFeedback, '');
    goBack('auth-verify');
  });

  DOM.formAuthVerify?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validateFormWithIOSAlert(DOM.formAuthVerify)) return;
    setFeedback(DOM.authVerifyFeedback, '');
    setButtonBusy(DOM.btnVerifyCode, true, 'Verifying...');

    try {
      AppState.auth.session = await verifyPhoneOtp(AppState.auth.pendingPhone, DOM.inputAuthCode.value);
      await routeAuthenticatedUser();
    } catch (error) {
      setFeedback(DOM.authVerifyFeedback, formatVerifyFailureMessage(), 'error');
    } finally {
      setButtonBusy(DOM.btnVerifyCode, false);
    }
  });

  DOM.btnProfilePhotoPick?.addEventListener('click', () => {
    DOM.inputProfileAvatarFile?.click();
  });
  DOM.inputProfileName?.addEventListener('input', () => {
    syncProfileSetupAvatarPreview();
  });
  DOM.inputProfileAvatarFile?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    await handleProfileAvatarPicked(file, 'setup');
    event.target.value = '';
  });
  DOM.formProfileSetup?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validateFormWithIOSAlert(DOM.formProfileSetup)) return;
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
      navigate('chats', 'forward');
      renderChatsList();
    } catch (error) {
      setFeedback(DOM.profileSetupFeedback, error.message || 'We could not save your profile yet.', 'error');
    } finally {
      setButtonBusy(DOM.btnSaveProfile, false);
    }
  });

  DOM.btnAddGroupMember?.addEventListener('click', async () => {
    const query = String(DOM.inputCreateGroupSearch?.value || '').trim();
    if (query) {
      await addPendingGroupMember();
      return;
    }

    if (AppState.onboarding.pendingMembers.length) {
      DOM.formCreateGroup?.requestSubmit();
      return;
    }

    if (supportsDeviceContacts()) {
      triggerDirectContactsEntry('create-group');
      return;
    }

    DOM.inputContactFile?.click();
  });
  DOM.btnCreateGroupBack?.addEventListener('click', async () => {
    const target = goBack(AppState.chats.length ? 'chats' : 'profile-setup');
    if (target === 'chats') renderChatsList();
  });
  DOM.inputCreateGroupSearch?.addEventListener('input', event => {
    AppState.onboarding.createGroupSearchQuery = event.target.value || '';
    renderCreateGroupPicker();
  });
  DOM.inputCreateGroupSearch?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const query = String(DOM.inputCreateGroupSearch?.value || '').trim();
      if (!query && AppState.onboarding.pendingMembers.length) {
        DOM.formCreateGroup?.requestSubmit();
      } else {
        addPendingGroupMember();
      }
    }
  });
  DOM.inputContactFile?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    setButtonBusy(DOM.btnAddGroupMember, true, 'Loading...');
    try {
      await importContactsFromVCard(file);
      await renderCreateGroupPicker();
    } catch (error) {
      setFeedback(DOM.createGroupFeedback, error.message || 'We could not import that contact file.', 'error');
    } finally {
      event.target.value = '';
      setButtonBusy(DOM.btnAddGroupMember, false);
    }
  });
  DOM.btnContactsHubBack?.addEventListener('click', () => {
    const fallback = isContactsOnboardingTarget()
      ? 'chats'
      : AppState.onboarding.contactsTarget === 'group-settings'
        ? 'group-settings'
        : 'create-group';
    goBack(fallback);
  });
  DOM.btnContactsHubClose?.addEventListener('click', () => {
    if (isContactsOnboardingTarget()) {
      navigate('chats', 'fade', { replace: true });
      renderChatsList();
      return;
    }

    const fallback = isContactsOnboardingTarget()
      ? 'chats'
      : AppState.onboarding.contactsTarget === 'group-settings'
        ? 'group-settings'
        : 'create-group';
    const target = goBack(fallback);
    if (target === 'chats') renderChatsList();
  });

  DOM.btnContactsHubDevice?.addEventListener('click', async () => {
    setFeedback(DOM.contactsHubFeedback, '');
    setButtonBusy(DOM.btnContactsHubDevice, true, 'Loading...');
    try {
      const importResult = await importDeviceContactsIntoCurrentTarget();
      const addedCount = typeof importResult === 'number' ? importResult : (importResult?.addedCount || 0);
      const smsWarning = typeof importResult === 'number' ? null : (importResult?.smsWarning || null);
      await renderContactsHub();
      setFeedback(
        DOM.contactsHubFeedback,
        smsWarning
          ? `Added ${addedCount} contact${addedCount === 1 ? '' : 's'}. ${smsWarning}`
          : addedCount
            ? `Added ${addedCount} contact${addedCount === 1 ? '' : 's'}.`
            : AppState.onboarding.contactsTarget === 'group-settings'
              ? 'Those contacts are already in this group.'
              : 'Those contacts are already in your group draft.',
        smsWarning ? 'error' : addedCount ? 'success' : ''
      );
    } catch (error) {
      if (error.name !== 'AbortError') {
        setFeedback(DOM.contactsHubFeedback, error.message || 'We could not load device contacts.', 'error');
      }
    } finally {
      setButtonBusy(DOM.btnContactsHubDevice, false);
    }
  });

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
      }).then(async result => {
        await refreshActiveChatAndSettings();
        await renderContactsHub();
        setFeedback(
          DOM.contactsHubFeedback,
          `${name} added to this group.`,
          'success'
        );
      }).catch(error => {
        setFeedback(DOM.contactsHubFeedback, error.message || 'We could not add that contact to the group.', 'error');
      });
      return;
    }

    if (isContactsOnboardingTarget()) return;

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
    renderCreateGroupPicker();
  });
  DOM.createChatContacts?.addEventListener('click', event => {
    const contactButton = event.target.closest('[data-add-create-group-contact]');
    if (contactButton) {
      const phone = contactButton.dataset.addCreateGroupContact;
      const row = contactButton.closest('.create-chat-picker__contact-row');
      const name = row?.querySelector('.create-chat-picker__contact-name')?.textContent?.trim() || phone;
      if (!phone || AppState.onboarding.pendingMembers.some(member => member.phone === phone)) return;
      AppState.onboarding.pendingMembers.push({ name, phone });
      AppState.onboarding.createGroupSearchQuery = '';
      if (DOM.inputCreateGroupSearch) DOM.inputCreateGroupSearch.value = '';
      setFeedback(DOM.createGroupFeedback, '');
      renderPendingGroupMembers();
      renderCreateGroupPicker();
      requestAnimationFrame(() => DOM.inputCreateGroupSearch?.focus());
      return;
    }

    const manualButton = event.target.closest('[data-add-manual-create-group]');
    if (manualButton) {
      if (DOM.inputCreateGroupSearch) {
        DOM.inputCreateGroupSearch.value = manualButton.dataset.addManualCreateGroup || '';
      }
      addPendingGroupMember();
      AppState.onboarding.createGroupSearchQuery = '';
      renderCreateGroupPicker();
    }
  });

  DOM.formCreateGroup?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!AppState.onboarding.pendingMembers.length) {
      setFeedback(DOM.createGroupFeedback, 'Add at least one person to start a chat.', 'error');
      DOM.inputCreateGroupSearch?.focus();
      return;
    }
    setFeedback(DOM.createGroupFeedback, '');

    try {
      const createdChat = await createGroupChat({
        ownerUserId: getCurrentUserId(),
        name: DOM.inputGroupName?.value || '',
        members: AppState.onboarding.pendingMembers,
      });
      const persistedChat = await waitForChatAvailability(createdChat.id, { attempts: 5, delayMs: 650 });
      const nextChat = persistedChat || createdChat;

      resetCreateGroupComposer();
      // Pin the freshly-created chat immediately so it survives the trip back
      // to All Chats even if the remote refresh has not caught up yet.
      pinChatInLocalLists(nextChat);
      renderChatsList();
      // Forcibly close the create-group sheet so it doesn't stay active and
      // intercept the back button when the user navigates out of the new chat.
      const createGroupSheet = DOM.screens?.createGroup;
      if (createGroupSheet) {
        createGroupSheet.classList.remove('active', 'screen-sheet-closing');
        resetScreenTransitionState(createGroupSheet);
      }
      if (AppState.navTimer) { clearTimeout(AppState.navTimer); AppState.navTimer = null; }
      await openChat(nextChat);
      // Refresh from DB in background to sync any server-side changes.
      refreshChats().then(() => renderChatsList());
    } catch (error) {
      setFeedback(DOM.createGroupFeedback, error.message || 'We could not create your group yet.', 'error');
    }
  });

  DOM.btnStartChat.addEventListener('click', () => {
    openCreateGroupComposer();
  });
  DOM.btnComposeChat?.addEventListener('click', () => {
    openCreateGroupComposer();
  });

  DOM.inputMemberPhone?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addPendingGroupMember();
    }
  });

  DOM.selfAvatar?.addEventListener('click', openProfileScreen);
  DOM.btnProfileBack?.addEventListener('click', () => {
    const target = goBack('chats');
    if (target === 'chats') renderChatsList();
  });
  DOM.btnManageProfilePhoto?.addEventListener('click', () => {
    DOM.inputManageProfileAvatarFile?.click();
  });
  DOM.inputManageProfileName?.addEventListener('input', () => {
    const nextName = DOM.inputManageProfileName.value.trim() || 'You';
    if (!DOM.inputManageProfileAvatar.value.trim()) {
      setAvatarPickerPreview({
        element: DOM.profileSettingsAvatar,
        imageUrl: '',
        fallbackText: buildUserInitials(nextName),
        accent: pickUserColor(nextName),
      });
    }
  });
  DOM.inputManageProfileName?.addEventListener('keydown', async event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    DOM.inputManageProfileName?.blur();
  });
  DOM.inputManageProfileName?.addEventListener('blur', async () => {
    if (!DOM.inputManageProfileName?.value.trim()) {
      DOM.inputManageProfileName.value = 'You';
    }
    if (DOM.inputManageProfileName.value.trim() === (getCurrentUser().name || '')) return;
    setFeedback(DOM.profileManageFeedback, '');
    try {
      await persistManagedProfile({ showSuccess: true });
    } catch (error) {
      setFeedback(DOM.profileManageFeedback, error.message || 'We could not save your profile yet.', 'error');
    }
  });
  DOM.inputManageProfileAvatarFile?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    await handleProfileAvatarPicked(file, 'manage');
    if (file) {
      try {
        await persistManagedProfile({ showSuccess: true });
      } catch (error) {
        setFeedback(DOM.profileManageFeedback, error.message || 'We could not save your profile yet.', 'error');
      }
    }
    event.target.value = '';
  });
  DOM.formProfileManage?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validateFormWithIOSAlert(DOM.formProfileManage)) return;
    setFeedback(DOM.profileManageFeedback, '');
    try {
      await persistManagedProfile({ showSuccess: true });
    } catch (error) {
      setFeedback(DOM.profileManageFeedback, error.message || 'We could not save your profile yet.', 'error');
    }
  });
  DOM.btnSignOut?.addEventListener('click', async () => {
    setButtonBusy(DOM.btnSignOut, true, 'Signing out...');
    try {
      await signOutAuthSession();
      setCurrentUserId(null);
      AppState.auth.session = null;
      AppState.auth.pendingPhone = '';
      AppState.auth.pendingInviteToken = '';
      AppState.auth.pendingChatId = '';
      AppState.activeChat = null;
      AppState.chats = [];
      stopRemoteSync();
      Store.clear();
      clearScreenHistory();
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
  DOM.inputChatSearch?.addEventListener('focus', () => {
    if (!AppState.chatsSearchOpen) openChatsSearch();
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
    closeChatsSearch();
  });

  DOM.chatsGrid.addEventListener('click', event => {
    const card = event.target.closest('[data-chat-id]');
    if (!card) return;
    const chat = AppState.chats.find(entry => entry.id === card.dataset.chatId);
    if (chat?.active) openChat(chat);
  });

  DOM.btnBack.addEventListener('click', async () => {
    if (AppState.activeChat) {
      pinChatInLocalLists(AppState.activeChat);
    }

    try {
      await refreshChats();
    } finally {
      renderChatsList();
      AppState.activeChat = null;
      navigate('chats', 'back', { replace: true });
    }
  });
  DOM.btnChatViewToggle?.addEventListener('click', toggleChatViewMode);
  DOM.btnChatMore?.addEventListener('click', openGroupSettingsScreen);
  DOM.btnGroupSettingsBack?.addEventListener('click', () => {
    AppState.groupSettingsEditing = false;
    goBack('chat');
  });
  DOM.btnSaveGroupSettings?.addEventListener('click', async () => {
    if (!AppState.activeChat) return;
    if (!canManageActiveChat()) return;

    if (!AppState.groupSettingsEditing) {
      AppState.groupSettingsEditing = true;
      renderGroupSettings(AppState.supabaseOk ? await getInvitationsForChat(AppState.activeChat.id) : []);
      DOM.inputGroupSettingsName?.focus();
      DOM.inputGroupSettingsName?.select();
      return;
    }

    if (!validateFormWithIOSAlert(DOM.formGroupSettings)) return;

    setButtonBusy(DOM.btnSaveGroupSettings, true, 'Saving...');
    setFeedback(DOM.groupSettingsFeedback, '');
    try {
      const updated = AppState.supabaseOk
        ? await renameChat(AppState.activeChat.id, DOM.inputGroupSettingsName.value)
        : { id: AppState.activeChat.id, name: DOM.inputGroupSettingsName.value };
      AppState.activeChat.name = updated.name;
      AppState.chats = AppState.chats.map(chat => chat.id === updated.id ? { ...chat, name: updated.name } : chat);
      DOM.chatTitle.textContent = updated.name;
      AppState.groupSettingsEditing = false;
      renderChatsList();
      renderGroupSettings(AppState.supabaseOk ? await getInvitationsForChat(AppState.activeChat.id) : []);
      setFeedback(DOM.groupSettingsFeedback, 'Group updated.', 'success');
    } catch (error) {
      setFeedback(DOM.groupSettingsFeedback, error.message || 'We could not update this group.', 'error');
    } finally {
      setButtonBusy(DOM.btnSaveGroupSettings, false);
    }
  });
  DOM.btnAddGroupSettingsMember?.addEventListener('click', async () => {
    if (!AppState.activeChat) return;
    if (!canManageActiveChat()) {
      setFeedback(DOM.groupSettingsFeedback, 'Only joined group members can add people.', 'error');
      return;
    }
    setButtonBusy(DOM.btnAddGroupSettingsMember, true, 'Adding...');
    setFeedback(DOM.groupSettingsFeedback, '');
    try {
      const result = await addMembersToChat({
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
      setFeedback(
        DOM.groupSettingsFeedback,
        'Member added.',
        'success'
      );
    } catch (error) {
      setFeedback(DOM.groupSettingsFeedback, error.message || 'We could not add that member.', 'error');
    } finally {
      setButtonBusy(DOM.btnAddGroupSettingsMember, false);
    }
  });
  DOM.groupSettingsPeopleStrip?.addEventListener('click', event => {
    const addContactsButton = event.target.closest('#btn-group-settings-browse-contacts');
    if (!addContactsButton) return;
    if (!canManageActiveChat()) {
      setFeedback(DOM.groupSettingsFeedback, 'Only joined group members can add people.', 'error');
      return;
    }
    triggerDirectContactsEntry('group-settings');
  });
  DOM.groupSettingsBackgroundOptions?.addEventListener('click', event => {
    const option = event.target.closest('[data-group-background]');
    if (!option) return;
    AppState.groupSettingsBackground = option.dataset.groupBackground || 'none';
    renderGroupSettings(AppState.groupSettingsInvites);
  });
  DOM.groupSettingsBackgroundSuggestions?.addEventListener('click', event => {
    const option = event.target.closest('[data-group-background]');
    if (!option) return;
    AppState.groupSettingsBackground = option.dataset.groupBackground || 'none';
    renderGroupSettings(AppState.groupSettingsInvites);
  });
  DOM.toggleGroupHideAlerts?.addEventListener('change', event => {
    AppState.groupSettingsPrefs.hideAlerts = !!event.target.checked;
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
      Store.clear(leavingChatId);
      AppState.activeChat = null;
      clearScreenHistory();
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
  DOM.iosAlertAction?.addEventListener('click', dismissIOSAlert);
  DOM.iosAlertOverlay?.addEventListener('click', event => {
    if (event.target === DOM.iosAlertOverlay) dismissIOSAlert();
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

  document.addEventListener('yap:pipeline:done', () => {
    refreshChats().then(() => renderChatsList());
  });

  // A Chloe/Maria response arrived → add bar to matching topic card
  document.addEventListener('yap:response:arrived', e => {
    addReplyToTopic(e.detail.threadId, e.detail.message);
    refreshChats().then(() => renderChatsList());
  });

  document.addEventListener('yap:thread:reply', e => {
    AppState.replyTargetThreadId = e.detail.threadId;
    openRecordingOverlay();
    startRecording();
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.warn('[yAp] service worker registration failed:', error);
    });
  }, { once: true });
}

// ── Boot ──────────────────────────────────────────────
async function boot() {
  setCurrentUserId(getCurrentUserId());
  cacheDOM();
  wireViewportHandlers();
  wireEvents();
  wirePipelineEvents();
  registerServiceWorker();
  renderPendingGroupMembers();
  renderCreateGroupPicker();
  syncProfileSetupAvatarPreview();
  setDisplay(DOM.btnChatMore, true);

  AppState.supabaseOk = initSupabase();
  startRemoteSync();
  if (AppState.supabaseOk && supabaseClient?.auth) {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      AppState.auth.session = session || getStoredAuthSession() || null;
    });
  }

  // Splash auto-advance
  setTimeout(() => {
    safeResolveInitialRoute();
  }, 950);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
