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
  conversationHydratedChatId: '',
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
    createGroupSubmitting: false,
  },
  replyTargetThreadId: null,
  recording: {
    manager: null,
    phase:   'idle',       // idle | recording | stopped | sending
    sentAt: 0,            // timestamp when message was sent
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
  chatViewMode: 'threads',
  nowPlaying: {
    active: false,
    topicIndex: 0,
    isPlaying: false,
    lastSpeakerId: null,
    completedAll: false,
    topicDotColors: {},
  },
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
    realtimeChannel: null,
    realtimeTimer: 0,
    conversationPrimeTimer: 0,
    conversationPrimePromise: null,
    conversationCacheVersions: new Map(),
    remotePresence: new Map(),
    lastChatsRefreshAt: 0,
    pendingForceConversation: false,
    pendingForceChats: false,
  },
  navTimer: null,
  viewportSyncRaf: 0,
  viewportBaseHeight: 0,
  chatsRenderRaf: 0,
  chatsRefreshPromise: null,
};

/** Next chats list paint runs a FLIP reorder (pin / unpin). Cleared after render. */
let _chatsListFlipPending = null;

// ── DOM refs ──────────────────────────────────────────
const DOM = {};
const PLAY_BUTTON_ICONS = {
  play:
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22.5 12C22.5006 12.2546 22.4353 12.5051 22.3105 12.7271C22.1856 12.949 22.0055 13.1349 21.7875 13.2666L8.28 21.5297C8.05227 21.6691 7.79144 21.7453 7.52445 21.7502C7.25746 21.7552 6.99399 21.6887 6.76125 21.5578C6.53073 21.4289 6.3387 21.241 6.2049 21.0132C6.07111 20.7855 6.00039 20.5263 6 20.2622V3.73781C6.00039 3.4737 6.07111 3.21447 6.2049 2.98675C6.3387 2.75904 6.53073 2.57108 6.76125 2.44219C6.99399 2.31126 7.25746 2.24484 7.52445 2.24979C7.79144 2.25473 8.05227 2.33086 8.28 2.47031L21.7875 10.7334C22.0055 10.8651 22.1856 11.051 22.3105 11.2729C22.4353 11.4949 22.5006 11.7453 22.5 12Z" fill="currentColor"/></svg>',
  pause:
    '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect x="6" y="4" width="5" height="20" rx="2" fill="currentColor"/><rect x="17" y="4" width="5" height="20" rx="2" fill="currentColor"/></svg>',
};
const APP_NOTIFICATION_PERMISSION_KEY = 'yap.notifications.permission.requested';

function resetConversationHydrationState() {
  AppState.conversationHydrating = null;
  AppState.conversationHydratedAt = 0;
  AppState.conversationHydratedChatId = '';
}

function getStoredNotificationPermissionRequested() {
  try {
    return localStorage.getItem(APP_NOTIFICATION_PERMISSION_KEY) === 'true';
  } catch {
    return false;
  }
}

function setStoredNotificationPermissionRequested(requested) {
  try {
    if (requested) {
      localStorage.setItem(APP_NOTIFICATION_PERMISSION_KEY, 'true');
    } else {
      localStorage.removeItem(APP_NOTIFICATION_PERMISSION_KEY);
    }
  } catch {}
}

async function ensureNotificationPermission() {
  if (!('Notification' in window) || typeof Notification.requestPermission !== 'function') {
    return 'unsupported';
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  if (getStoredNotificationPermissionRequested()) {
    return Notification.permission;
  }

  setStoredNotificationPermissionRequested(true);
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission || 'default';
  }
}

function resetAppStateForUser(userId = '') {
  const nextUserId = String(userId || '');
  resetConversationHydrationState();
  stopRemoteSync();
  AppState.activeChat = null;
  AppState.chats = [];
  AppState.pendingChats = [];
  AppState.chatsRefreshPromise = null;
  AppState.sync.chatSnapshot = null;
  AppState.sync.lastChatsRefreshAt = 0;
  Store.clear();
  setCurrentUserId(nextUserId || null);
  if (nextUserId && YAP_SUPABASE_REMOTE_SYNC_ENABLED) {
    startRemoteSync();
  }
}

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
  DOM.createChatHelperText = document.getElementById('create-chat-helper-text');
  DOM.createChatAlpha = document.getElementById('create-chat-alpha');
  DOM.createChatBottomMeta = document.getElementById('create-chat-bottom-meta');
  DOM.btnCreateGroupRow = document.getElementById('btn-create-group-row');
  DOM.createChatCreateBar = document.getElementById('create-chat-create-bar');
  DOM.btnCreateGroupShare = document.getElementById('btn-create-group-share');
  DOM.btnCreateGroupHelp = document.getElementById('btn-create-group-help');
  DOM.btnAddGroupMember = document.getElementById('btn-add-group-member');
  DOM.btnCreateGroupSubmit = document.getElementById('btn-create-group-submit');
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
  DOM.btnProfileEdit = document.getElementById('btn-profile-edit');
  DOM.inputManageProfileAvatar = document.getElementById('input-manage-profile-avatar');
  DOM.inputManageProfileAvatarFile = document.getElementById('input-manage-profile-avatar-file');
  DOM.profileAvatarPreviewOverlay = document.getElementById('profile-avatar-preview-overlay');
  DOM.profileAvatarPreviewStage = document.getElementById('profile-avatar-preview-stage');
  DOM.btnProfileAvatarPreviewClose = document.getElementById('btn-profile-avatar-preview-close');
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
  DOM.btnGroupSettingsEdit = document.getElementById('btn-group-settings-edit');
  DOM.groupSettingsContactCard = document.getElementById('group-settings-contact-card');
  DOM.groupSettingsContactPhone = document.getElementById('group-settings-contact-phone');
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
  DOM.chatContextMenu = document.getElementById('chat-context-menu');

  // Chat screen
  DOM.chatTitle      = document.getElementById('chat-title');
  DOM.chatMemberPips = document.getElementById('chat-member-pips');
  DOM.chatBody       = document.getElementById('chat-body');
  DOM.chatEmpty      = document.getElementById('chat-empty');
  DOM.chatTopics     = document.getElementById('chat-topics');
  DOM.chatProcessing = document.getElementById('chat-processing');
  DOM.chatPresence   = document.getElementById('chat-presence');
  DOM.btnBack        = document.getElementById('btn-back');
  DOM.btnMic         = document.getElementById('btn-mic');
  DOM.btnNowPlaying  = document.getElementById('btn-now-playing');
  DOM.nowPlayingOverlay = document.getElementById('now-playing-overlay');
  DOM.nowPlayingSheet   = document.getElementById('now-playing-sheet');
  DOM.npTopicTitle  = document.getElementById('np-topic-title');
  DOM.npStage       = document.getElementById('np-stage');
  DOM.npAvatars     = document.getElementById('np-avatars');
  DOM.npTopicProgress = document.getElementById('np-topic-progress');
  DOM.npDots = DOM.npTopicProgress;
  DOM.npTimeline   = document.getElementById("np-timeline");
  DOM.btnNpClose    = document.getElementById('btn-np-close');
  DOM.btnNpPrev     = document.getElementById('btn-np-prev');
  DOM.btnNpPlaypause = document.getElementById('btn-np-playpause');
  DOM.btnNpNext     = document.getElementById('btn-np-next');
  DOM.btnChatMore    = document.getElementById('btn-chat-more');
  DOM.floatingAvatarPrimary = document.getElementById('floating-avatar-primary');
  DOM.floatingAvatarSecondary = document.getElementById('floating-avatar-secondary');
  DOM.floatingAvatarPrimaryLabel = document.getElementById('floating-avatar-primary-label');
  DOM.floatingAvatarSecondaryLabel = document.getElementById('floating-avatar-secondary-label');
  DOM.floatingAvatarPrimaryPhoto = document.querySelector('#floating-avatar-primary .floating-avatar__photo');
  DOM.floatingAvatarSecondaryPhoto = document.querySelector('#floating-avatar-secondary .floating-avatar__photo');
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
  DOM.btnDiscardRecording = document.getElementById('btn-discard-recording');
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
  DOM.analysisStatusLine = document.getElementById('analysis-status-line');
  DOM.btnAnalysisCancel = document.getElementById('btn-analysis-cancel');
  DOM.analysisVisualField = document.querySelector('#analysis-overlay .analysis-visual-field');
  DOM.analysisWaveformCanvas = document.getElementById('analysis-waveform-canvas');
  DOM.iosAlertOverlay = document.getElementById('ios-alert-overlay');
  DOM.iosAlertTitle = document.getElementById('ios-alert-title');
  DOM.iosAlertMessage = document.getElementById('ios-alert-message');
  DOM.iosAlertAction = document.getElementById('ios-alert-action');
}

const SCREEN_TRANSITION_MS = 150;
const PROFILE_SCREEN_TRANSITION_MS = 440;
const SHEET_TRANSITION_MS = 220;
/** Left-edge interactive back — same threshold across all stack screens */
const IOS_STACK_EDGE_PX = 28;
/** Full-width sheet slide over chats — single curve, no CSS `ease` keyword */
const PROFILE_PUSH_EASING = 'cubic-bezier(0.33, 0.86, 0.2, 1)';

function isSheetScreen(screenId) {
  return screenId === 'create-group';
}

function isOnboardingFlowScreen(screenId) {
  return ['welcome', 'auth-phone', 'auth-verify', 'profile-setup'].includes(screenId);
}

function resetScreenTransitionState(screen) {
  if (!screen) return;
  screen.classList.remove('screen-sheet-closing');
  screen.style.transform = '';
  screen.style.opacity = '';
  screen.style.transition = '';
  screen.style.zIndex = '';
}

function screenIdToElement(screenId) {
  if (!screenId) return null;
  const keyMap = {
    splash: 'splash',
    welcome: 'welcome',
    'auth-phone': 'authPhone',
    'auth-verify': 'authVerify',
    'profile-setup': 'profileSetup',
    'create-group': 'createGroup',
    'contacts-hub': 'contactsHub',
    profile: 'profile',
    'group-settings': 'groupSettings',
    chats: 'chats',
    chat: 'chat',
  };
  const key = keyMap[screenId];
  const mapped = key ? DOM.screens?.[key] : null;
  return mapped || document.getElementById(`screen-${screenId}`);
}

function resetIosStackEdgeSwipeVisuals(activeEl, underEl) {
  if (activeEl) {
    activeEl.classList.remove('is-ios-stack-dragging');
    resetScreenTransitionState(activeEl);
  }
  if (underEl) {
    underEl.classList.remove('ios-stack-interactive-under');
    resetScreenTransitionState(underEl);
  }
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
  if (activeElement.closest?.('#screen-auth-phone, #screen-auth-verify, #screen-profile-setup')) return;
  requestAnimationFrame(() => {
    try {
      activeElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } catch (_) {}
  });
}

function updateViewportMetrics() {
  const viewport = window.visualViewport;
  const layoutViewportHeight = Math.round(window.innerHeight || document.documentElement.clientHeight || 0);
  const viewportHeight = Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
  const rawViewportBottomInset = viewport
    ? Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
    : 0;
  const textEntryFocused = isTextEntryElement(document.activeElement);
  const keyboardInset = textEntryFocused ? rawViewportBottomInset : 0;
  const viewportBottomInset = textEntryFocused ? 0 : rawViewportBottomInset;
  const appHeight = textEntryFocused
    ? Math.max(AppState.viewportBaseHeight || 0, layoutViewportHeight, viewportHeight)
    : viewportHeight;
  const nextBaseHeight = keyboardInset > 0
    ? Math.max(AppState.viewportBaseHeight || 0, viewportHeight)
    : appHeight;

  AppState.viewportBaseHeight = Math.max(nextBaseHeight || 0, appHeight || viewportHeight || 0);

  document.documentElement.style.setProperty('--app-height', `${appHeight}px`);
  document.documentElement.style.setProperty('--layout-height', `${AppState.viewportBaseHeight || appHeight || viewportHeight}px`);
  document.documentElement.style.setProperty('--keyboard-inset', `${keyboardInset}px`);
  document.documentElement.style.setProperty('--visual-viewport-bottom-inset', `${viewportBottomInset}px`);
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

function focusFieldAfterTransition(element, delay = 420) {
  if (!element) return;
  window.setTimeout(() => {
    try {
      element.focus({ preventScroll: true });
    } catch (_) {
      try { element.focus(); } catch (__) {}
    }
    scheduleViewportMetricsUpdate();
    window.setTimeout(scheduleViewportMetricsUpdate, 140);
  }, delay);
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
function navigate(toId, direction = 'forward', { replace = false, skipTransition = false } = {}) {
  const from = document.querySelector('.screen.active');
  const to   = DOM.screens[toId] || document.getElementById(`screen-${toId}`);

  if (!to || from === to) return;

  const fromId = from?.dataset.screen || AppState.screen;
  if (fromId === 'profile' && toId !== 'profile') {
    closeProfileAvatarPreviewOverlay();
  }
  if (fromId === 'chat' && toId !== 'chat') {
    cancelRecording();
  }
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
  document.querySelectorAll('.ios-stack-interactive-under').forEach(el => {
    el.classList.remove('ios-stack-interactive-under');
  });
  document.querySelectorAll('.is-ios-stack-dragging').forEach(el => {
    el.classList.remove('is-ios-stack-dragging');
  });
  if (!from) {
    to.classList.add('active');
    return;
  }

  const openingSheet = isSheetScreen(toId) && direction !== 'back';
  const closingSheet = isSheetScreen(fromId) && direction === 'back';
  const onboardingFlowTransition = isOnboardingFlowScreen(toId) || isOnboardingFlowScreen(fromId);
  const profileTransition = toId === 'profile' || fromId === 'profile';

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

  if (skipTransition) {
    from.classList.remove('active');
    resetScreenTransitionState(from);
    resetScreenTransitionState(to);
    syncLocalPresence();
    return;
  }

  if (direction === 'fade') {
    const fadeMs = onboardingFlowTransition
      ? 220
      : profileTransition
        ? PROFILE_SCREEN_TRANSITION_MS
        : SCREEN_TRANSITION_MS;
    to.style.opacity = '0';
    to.style.transform = 'scale(0.985)';
    requestAnimationFrame(() => {
      to.style.transition = `opacity ${fadeMs}ms ease, transform ${fadeMs}ms ease`;
      from.style.transition = `opacity ${fadeMs}ms ease, transform ${fadeMs}ms ease`;
      to.style.opacity = '1';
      to.style.transform = 'scale(1)';
      from.style.opacity = '0';
      from.style.transform = 'scale(1.01)';
    });
    AppState.navTimer = setTimeout(() => {
      from.classList.remove('active');
      resetScreenTransitionState(from);
      resetScreenTransitionState(to);
      AppState.navTimer = null;
    }, fadeMs);
  } else {
    const stackMs = PROFILE_SCREEN_TRANSITION_MS;
    if (direction === 'back') {
      to.style.opacity = '1';
      to.style.transform = 'translate3d(0, 0, 0)';
      from.style.opacity = '1';
      from.style.transform = 'translate3d(0, 0, 0)';
      to.style.zIndex = '2';
      from.style.zIndex = '3';
      requestAnimationFrame(() => {
        to.style.transition = 'none';
        from.style.transition = `transform ${stackMs}ms ${PROFILE_PUSH_EASING}`;
        from.style.transform = 'translate3d(100%, 0, 0)';
      });
    } else {
      to.style.opacity = '1';
      to.style.transform = 'translate3d(100%, 0, 0)';
      from.style.opacity = '1';
      from.style.transform = 'translate3d(0, 0, 0)';
      from.style.zIndex = '2';
      to.style.zIndex = '3';
      requestAnimationFrame(() => {
        to.style.transition = `transform ${stackMs}ms ${PROFILE_PUSH_EASING}`;
        from.style.transition = 'none';
        to.style.transform = 'translate3d(0, 0, 0)';
      });
    }
    AppState.navTimer = setTimeout(() => {
      from.classList.remove('active');
      resetScreenTransitionState(from);
      resetScreenTransitionState(to);
      AppState.navTimer = null;
    }, stackMs);
  }

  syncLocalPresence();
}

function goBack(fallback = 'welcome', { instant = false } = {}) {
  const previous = AppState.screenHistory.pop() || fallback;
  navigate(previous, 'back', { replace: true, skipTransition: instant });
  return previous;
}

function wireIosStackEdgeSwipe() {
  const app = document.getElementById('app');
  if (!app) return;

  let tracking = null;

  app.addEventListener('touchstart', e => {
    if (AppState.navTimer) return;
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;
    const screenId = activeScreen.dataset.screen;
    if (!screenId || screenId === 'splash') return;
    if (isSheetScreen(screenId)) return;

    const prevId = AppState.screenHistory.length
      ? AppState.screenHistory[AppState.screenHistory.length - 1]
      : null;
    if (!prevId) return;

    const underEl = screenIdToElement(prevId);
    if (!underEl || underEl === activeScreen) return;

    const t = e.changedTouches[0];
    if (!t || t.clientX > IOS_STACK_EDGE_PX) return;
    if (!activeScreen.contains(e.target)) return;
    if (e.target.closest('button, a, input, textarea, select, label[for], [role="button"]')) return;

    tracking = {
      activeEl: activeScreen,
      underEl,
      fromScreenId: screenId,
      startX: t.clientX,
      startY: t.clientY,
      lastX: t.clientX,
      lastT: e.timeStamp,
      vx: 0,
      id: t.identifier,
    };
  }, { passive: true, capture: true });

  app.addEventListener('touchmove', e => {
    if (!tracking) return;
    if (!tracking.activeEl.classList.contains('active')) {
      tracking = null;
      return;
    }
    const t = Array.from(e.changedTouches).find(x => x.identifier === tracking.id);
    if (!t) return;

    const dx = t.clientX - tracking.startX;
    const dy = t.clientY - tracking.startY;

    if (dx < 10 && Math.abs(dy) > 16) {
      const snap = tracking;
      tracking = null;
      resetIosStackEdgeSwipeVisuals(snap.activeEl, snap.underEl);
      return;
    }

    if (dx <= 0) return;

    if (Math.abs(dy) > Math.abs(dx) + 12) {
      const snap = tracking;
      tracking = null;
      resetIosStackEdgeSwipeVisuals(snap.activeEl, snap.underEl);
      return;
    }

    e.preventDefault();

    const dt = Math.max(1, e.timeStamp - tracking.lastT);
    tracking.vx = (t.clientX - tracking.lastX) / dt;
    tracking.lastX = t.clientX;
    tracking.lastT = e.timeStamp;

    const w = window.innerWidth;
    const drag = Math.min(Math.max(0, dx), w);

    tracking.activeEl.classList.add('is-ios-stack-dragging');
    tracking.underEl.classList.add('ios-stack-interactive-under');
    tracking.activeEl.style.transition = 'none';
    tracking.underEl.style.transition = 'none';
    tracking.activeEl.style.transform = `translate3d(${drag}px, 0, 0)`;
    tracking.underEl.style.opacity = '1';
    tracking.underEl.style.transform = 'translate3d(0, 0, 0)';
  }, { passive: false, capture: true });

  function endSwipe(e) {
    if (!tracking) return;
    const t = Array.from(e.changedTouches).find(x => x.identifier === tracking.id);
    const dx = t
      ? t.clientX - tracking.startX
      : tracking.lastX - tracking.startX;
    const w = window.innerWidth;
    const commit = dx > w * 0.28 || (tracking.vx > 0.45 && dx > 36);
    const activeEl = tracking.activeEl;
    const underEl = tracking.underEl;
    const fromScreenId = tracking.fromScreenId;
    tracking = null;

    if (commit) {
      const ms = 320;
      activeEl.style.transition = `transform ${ms}ms ${PROFILE_PUSH_EASING}`;
      underEl.style.transition = `transform ${ms}ms ${PROFILE_PUSH_EASING}`;
      activeEl.style.transform = 'translate3d(100%, 0, 0)';
      underEl.style.transform = 'translate3d(0, 0, 0)';
      activeEl.classList.remove('is-ios-stack-dragging');
      if (AppState.navTimer) {
        clearTimeout(AppState.navTimer);
        AppState.navTimer = null;
      }
      AppState.navTimer = setTimeout(() => {
        underEl.classList.remove('ios-stack-interactive-under');
        resetScreenTransitionState(activeEl);
        resetScreenTransitionState(underEl);
        AppState.navTimer = null;
        if (fromScreenId === 'chat') {
          void closeActiveChatAndNavigateToList({ skipTransition: true });
        } else {
          const target = goBack('welcome', { instant: true });
          if (target === 'chats') renderChatsList();
        }
      }, ms);
    } else {
      const ms = 280;
      activeEl.style.transition = `transform ${ms}ms ${PROFILE_PUSH_EASING}`;
      underEl.style.transition = `transform ${ms}ms ${PROFILE_PUSH_EASING}`;
      activeEl.style.transform = 'translate3d(0, 0, 0)';
      underEl.style.transform = 'translate3d(0, 0, 0)';
      setTimeout(() => {
        activeEl.classList.remove('is-ios-stack-dragging');
        underEl.classList.remove('ios-stack-interactive-under');
        resetScreenTransitionState(activeEl);
        resetScreenTransitionState(underEl);
      }, ms);
    }
  }

  app.addEventListener('touchend', endSwipe, { passive: true, capture: true });
  app.addEventListener('touchcancel', () => {
    if (!tracking) return;
    const snap = tracking;
    tracking = null;
    resetIosStackEdgeSwipeVisuals(snap.activeEl, snap.underEl);
  }, { passive: true, capture: true });
}

function clearScreenHistory() {
  AppState.screenHistory = [];
}

function scheduleChatsListRender(options = {}) {
  if (options.flipForChatId != null) {
    _chatsListFlipPending = {
      chatId: options.flipForChatId,
      pinned: !!options.flipPinned,
    };
  }
  if (AppState.chatsRenderRaf) return;
  AppState.chatsRenderRaf = requestAnimationFrame(() => {
    AppState.chatsRenderRaf = 0;
    renderChatsList();
  });
}

const _CHATS_GRID_FLIP_MS = 680;
const _CHATS_GRID_FLIP_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';

function _runChatsGridFlipAnimation(grid, oldRects) {
  if (!grid || !oldRects?.size) return;

  requestAnimationFrame(() => {
    const animated = [];
    for (const el of grid.querySelectorAll('.chat-card')) {
      const id = el.dataset.chatId;
      const prev = oldRects.get(id);
      if (!prev) continue;
      const next = el.getBoundingClientRect();
      const dx = prev.left - next.left;
      const dy = prev.top - next.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      animated.push(el);
    }

    if (!animated.length) return;

    requestAnimationFrame(() => {
      for (const el of animated) {
        el.style.transition = `transform ${_CHATS_GRID_FLIP_MS}ms ${_CHATS_GRID_FLIP_EASING}`;
        el.style.transform = 'translate(0, 0)';
        const cleanup = () => {
          el.removeEventListener('transitionend', onEnd);
          el.style.transition = '';
          el.style.transform = '';
        };
        const onEnd = event => {
          if (event.propertyName !== 'transform') return;
          cleanup();
        };
        el.addEventListener('transitionend', onEnd);
        window.setTimeout(cleanup, _CHATS_GRID_FLIP_MS + 100);
      }
    });
  });
}

function buildConversationCacheVersion(chat) {
  return [
    chat?.id || '',
    Number(chat?.lastMessageAt || 0),
    Number(chat?.unread || 0),
    chat?.previewAuthorId || '',
  ].join(':');
}

async function primeConversationCaches() {
  if (!YAP_SUPABASE_PRELOAD_CONVERSATIONS || !AppState.supabaseOk || !getCurrentUserId()) return [];
  if (AppState.sync.conversationPrimePromise) return AppState.sync.conversationPrimePromise;

  const chatsToPrime = (AppState.chats || []).filter(chat => chat?.id);
  if (!chatsToPrime.length) return [];

  AppState.sync.conversationPrimePromise = (async () => {
    const pendingChats = chatsToPrime.filter(chat => {
      const cachedThreads = Store.getCachedThreads(chat.id);
      const nextVersion = buildConversationCacheVersion(chat);
      const cachedVersion = AppState.sync.conversationCacheVersions.get(chat.id);
      return !cachedThreads.length || cachedVersion !== nextVersion;
    });

    if (!pendingChats.length) return [];

    const queue = [...pendingChats];
    const concurrency = Math.min(3, queue.length);

    const worker = async () => {
      while (queue.length) {
        const chat = queue.shift();
        if (!chat?.id) continue;

        try {
          await hydrateChatFromSupabase(chat.id);
          AppState.sync.conversationCacheVersions.set(chat.id, buildConversationCacheVersion(chat));
        } catch (error) {
          console.warn('[yAp] conversation cache prime failed:', chat.id, error);
        }
      }
    };

    await Promise.all(Array.from({ length: concurrency }, worker));
    return pendingChats.map(chat => chat.id);
  })().finally(() => {
    AppState.sync.conversationPrimePromise = null;
  });

  return AppState.sync.conversationPrimePromise;
}

function scheduleConversationCachePrime(delayMs = 180) {
  if (!YAP_SUPABASE_PRELOAD_CONVERSATIONS || !AppState.supabaseOk || !getCurrentUserId()) return;
  if (AppState.sync.conversationPrimeTimer) {
    window.clearTimeout(AppState.sync.conversationPrimeTimer);
  }

  AppState.sync.conversationPrimeTimer = window.setTimeout(() => {
    AppState.sync.conversationPrimeTimer = 0;
    primeConversationCaches();
  }, Math.max(0, delayMs || 0));
}

async function refreshChatsAndRender({ force = false } = {}) {
  await refreshChats({ force });
  updateChatsUnreadCounts();
  scheduleChatsListRender();
  scheduleConversationCachePrime();
  return AppState.chats;
}


// Background refresh: fetch fresh chats in background without blocking UI
async function backgroundRefreshChats() {
  if (!AppState.supabaseOk || !getCurrentUserId()) return;
  try {
    const remoteChats = await getChatsForUser(getCurrentUserId());
    if (remoteChats && Array.isArray(remoteChats)) {
      const oldChats = AppState.chats || [];
      const merged = applyPinnedFromLocal(remoteChats, oldChats);
      const newChats = sortChatsForDisplay(merged);

      const oldIds = new Set(oldChats.map(c => c.id));
      const newIds = new Set(newChats.map(c => c.id));
      const hasChanges = oldIds.size !== newIds.size
        || newChats.some((c, i) => c.id !== oldChats[i]?.id || Number(c.unread || 0) !== Number(oldChats[i]?.unread || 0));

      if (hasChanges) {
        AppState.chats = newChats;
        updateChatsUnreadCounts();
        writeCachedChatsForUser(AppState.chats, getCurrentUserId());
        scheduleChatsListRender();
      }
    }
  } catch (error) {
    console.warn('[yAp] background chat refresh failed:', error);
  }
}

function renderChatsList() {
  const flipPending = _chatsListFlipPending;
  _chatsListFlipPending = null;

  const chats = AppState.chats.length ? AppState.chats : [];
  const showEmptyState = chats.length === 0;
  const query = AppState.chatsSearchQuery.trim().toLowerCase();
  const currentUser = getCurrentUser();
  const visibleChats = chats.filter(chat => {
    const displayName = getChatDisplayName(chat);
    return !query || displayName.toLowerCase().includes(query);
  });
  const showSearch = AppState.chatsSearchOpen || !!query;

  const grid = DOM.chatsGrid;
  let oldRects = null;
  if (flipPending && grid && !showEmptyState) {
    const cards = grid.querySelectorAll('.chat-card');
    if (cards.length) {
      oldRects = new Map();
      for (const el of cards) {
        const id = el.dataset.chatId;
        if (id) oldRects.set(id, el.getBoundingClientRect());
      }
    }
  }

  setDisplay(DOM.chatsGrid, !showEmptyState, 'grid');
  setDisplay(DOM.chatsEmptyState, showEmptyState, 'flex');
  DOM.screens?.chats?.classList.toggle('has-chats', !showEmptyState);
  if (DOM.chatsSearch) {
    DOM.chatsSearch.hidden = false;
    DOM.chatsSearch.classList.toggle('is-open', showSearch);
    DOM.chatsSearch.setAttribute('aria-hidden', showSearch ? 'false' : 'true');
  }
  DOM.screens?.chats?.classList.toggle('screen-chats-search-open', showSearch);
  if (DOM.inputChatSearch && DOM.inputChatSearch.value !== AppState.chatsSearchQuery) {
    DOM.inputChatSearch.value = AppState.chatsSearchQuery;
  }

  setElementImage(DOM.selfAvatar, currentUser.avatarUrl, currentUser.initials || buildUserInitials(currentUser.name || 'You'));

  if (showEmptyState) {
    DOM.chatsGrid.innerHTML = '';
    return;
  }

  DOM.chatsGrid.innerHTML = visibleChats.map(chat => {
    const displayName = getChatDisplayName(chat);
    const artHTML = _chatArtHTML(chat);
    const badgeHTML = chat.unread > 0
      ? `<span class="chat-badge" aria-label="${chat.unread} unread message${chat.unread === 1 ? '' : 's'}"></span>`
      : '';

    const hideAlertsIconHTML = chat.hideAlerts
      ? `<span class="chat-card__unread-alerts-icon" aria-hidden="true"></span>`
      : '';
    const pinHTML = chat.pinned
      ? `<span class="chat-card__pin" aria-hidden="true"></span>`
      : '';
    const trailingHTML = hideAlertsIconHTML || pinHTML
      ? `<div class="chat-card__title-trailing">${hideAlertsIconHTML}${pinHTML}</div>`
      : '';

    return `
      <div class="chat-card chat-card--${chat.visual || 'default'}${chat.id === ACTIVE_CHAT_ID ? ' chat-card--besties' : ''}" data-chat-id="${chat.id}">
        <div class="chat-card__art">${artHTML}</div>
        <div class="chat-card__footer">
          <div class="chat-card__title-row">
            <div class="chat-card__name-anchor">
              ${badgeHTML}
              <div class="chat-card__name">${escapeHtml(displayName)}</div>
            </div>
            ${trailingHTML}
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (oldRects && flipPending && grid) {
    _runChatsGridFlipAnimation(grid, oldRects);
  }
  if (flipPending?.pinned && grid) {
    const card = [...grid.querySelectorAll('.chat-card')].find(c => c.dataset.chatId === flipPending.chatId);
    const pinEl = card?.querySelector('.chat-card__pin');
    if (pinEl) pinEl.classList.add('chat-card__pin--rising');
  }
}

function pinChatInLocalLists(chat) {
  if (!chat?.id) return;

  const pinnedChat = {
    ...chat,
    persistLocally: chat.persistLocally !== false,
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
  writeCachedChatsForUser(AppState.chats, getCurrentUserId());
}

function applyPinnedFromLocal(chats, ...sources) {
  const pinnedIds = new Set();
  for (const list of sources) {
    for (const c of list || []) {
      if (c?.id && c.pinned) pinnedIds.add(c.id);
    }
  }
  return (Array.isArray(chats) ? chats : []).map(chat => {
    if (!chat?.id) return chat;
    return { ...chat, pinned: pinnedIds.has(chat.id) };
  });
}

function sortChatsForDisplay(chats) {
  return [...(Array.isArray(chats) ? chats : [])].sort((a, b) => {
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return (b.lastMessageAt || b.localCreatedAt || 0) - (a.lastMessageAt || a.localCreatedAt || 0);
  });
}

async function markLatestOtherVoiceMemoUnread(chatId) {
  const uid = getCurrentUserId();
  if (!chatId || !uid) return;

  const threads = Store.getCachedThreads(chatId);
  if (!threads.length) return;

  let bestMsg = null;
  let bestSent = -1;
  for (const thread of threads) {
    for (const message of thread.messages || []) {
      if (!message || message.authorId === uid) continue;
      const sid = String(message.voiceMessageId || message.id || '');
      if (!sid || sid.startsWith('optimistic')) continue;
      const sent = Number(message.sentAt || 0);
      if (sent >= bestSent) {
        bestSent = sent;
        bestMsg = message;
      }
    }
  }
  if (!bestMsg) return;

  const voiceMessageId = bestMsg.voiceMessageId || bestMsg.id;
  const targetId = bestMsg.id;

  const updated = threads.map(thread => ({
    ...thread,
    messages: (thread.messages || []).map(m => {
      if (m.id !== targetId) return m;
      return {
        ...m,
        heardByCurrentUser: false,
        playedMs: 0,
        heardAt: null,
      };
    }),
  }));

  Store.replaceThreads(chatId, updated);
  if (AppState.activeChat?.id === chatId) {
    Store.setActiveChat(chatId);
    renderTopics();
  }

  if (AppState.supabaseOk && voiceMessageId && !String(voiceMessageId).startsWith('local-')) {
    await savePlaybackProgressRecord({
      userId: uid,
      voiceMessageId,
      heard: false,
      playedMs: 0,
    });
  }

  updateChatsUnreadCounts();
  writeCachedChatsForUser(AppState.chats, getCurrentUserId());
  scheduleChatsListRender();
}

async function markEntireChatAsRead(chatId) {
  const uid = getCurrentUserId();
  if (!chatId || !uid) return;

  const threads = Store.getCachedThreads(chatId);
  if (!threads.length) {
    updateChatsUnreadCounts();
    writeCachedChatsForUser(AppState.chats, uid);
    scheduleChatsListRender();
    return;
  }

  const heardPromises = [];
  const updated = threads.map(thread => ({
    ...thread,
    messages: (thread.messages || []).map(m => {
      if (!m || m.authorId === uid || m.heardByCurrentUser) return m;
      const vmid = m.voiceMessageId;
      if (AppState.supabaseOk && vmid && !String(vmid).startsWith('local-') && !String(vmid).startsWith('optimistic')) {
        heardPromises.push(savePlaybackProgressRecord({
          userId: uid,
          voiceMessageId: vmid,
          heard: true,
          playedMs: 0,
        }));
      }
      return {
        ...m,
        heardByCurrentUser: true,
        heardAt: Date.now(),
      };
    }),
  }));

  Store.replaceThreads(chatId, updated);
  if (AppState.activeChat?.id === chatId) {
    Store.setActiveChat(chatId);
    renderTopics();
  }

  if (heardPromises.length) {
    await Promise.all(heardPromises);
  }
  updateChatsUnreadCounts();
  writeCachedChatsForUser(AppState.chats, uid);
  scheduleChatsListRender();
}

function syncChatContextMenuLabels(chat) {
  if (!chat) return;

  const pinBtn = document.getElementById('ctx-pin-chat');
  const pinIcon = document.getElementById('ctx-pin-chat-icon');
  const pinLabel = pinBtn?.querySelector('.ctx-menu-label');
  if (pinIcon && pinLabel) {
    pinLabel.textContent = chat.pinned ? 'Unpin' : 'Pin';
    const nextSrc = chat.pinned ? 'assets/unpin.svg' : 'assets/pin.svg';
    if (pinIcon instanceof HTMLImageElement) {
      pinIcon.src = nextSrc;
    }
  }

  const unreadBtn = document.getElementById('ctx-mark-unread');
  const unreadIcon = unreadBtn?.querySelector('.chat-context-menu__icon');
  const unreadLabel = unreadBtn?.querySelector('.ctx-menu-label');
  const hasUnread = Number(chat.unread || 0) > 0;
  if (unreadIcon && unreadLabel) {
    unreadLabel.textContent = hasUnread ? 'Mark as Read' : 'Mark as Unread';
    unreadIcon.classList.remove('chat-context-menu__icon--unread', 'chat-context-menu__icon--read');
    unreadIcon.classList.add(hasUnread ? 'chat-context-menu__icon--read' : 'chat-context-menu__icon--unread');
  }

  const alertsBtn = document.getElementById('ctx-hide-alerts');
  const alertsIcon = alertsBtn?.querySelector('.chat-context-menu__icon');
  const alertsLabel = alertsBtn?.querySelector('.ctx-menu-label');
  const muted = !!chat.hideAlerts;
  if (alertsIcon && alertsLabel) {
    alertsLabel.textContent = muted ? 'Show Alerts' : 'Hide Alerts';
    alertsIcon.classList.remove('chat-context-menu__icon--alerts', 'chat-context-menu__icon--show-alerts');
    alertsIcon.classList.add(muted ? 'chat-context-menu__icon--show-alerts' : 'chat-context-menu__icon--alerts');
  }
}

function enterChatContextDeleteConfirm() {
  const chatId = AppState.contextMenuChatId;
  if (!chatId || !DOM.chatContextMenu) return;
  if (!AppState.chats.some(c => c.id === chatId)) return;

  const confirmEl = document.getElementById('chat-context-delete-confirm');
  if (confirmEl) confirmEl.removeAttribute('hidden');
  DOM.chatContextMenu.classList.add('chat-context-menu--delete-confirm');
}

function exitChatContextDeleteConfirm() {
  if (!DOM.chatContextMenu) return;
  const confirmEl = document.getElementById('chat-context-delete-confirm');
  if (confirmEl) confirmEl.setAttribute('hidden', '');
  DOM.chatContextMenu.classList.remove('chat-context-menu--delete-confirm');
}

async function executeLeaveAndRemoveChat(chatId) {
  const uid = getCurrentUserId();
  if (!chatId || !uid) return;

  await leaveChat(chatId, uid);
  Store.clear(chatId);
  removeCachedThreadsForChat(chatId);
  AppState.chats = AppState.chats.filter(c => c.id !== chatId);
  AppState.pendingChats = AppState.pendingChats.filter(c => c.id !== chatId);
  if (AppState.activeChat?.id === chatId) {
    AppState.activeChat = null;
  }
  writeCachedChatsForUser(AppState.chats, uid);
  await refreshChatsAndRender({ force: true });
}

function showChatContextMenu(chatId) {
  if (!DOM.chatContextMenu) return;

  DOM.chatContextMenu.classList.remove('chat-context-menu--delete-confirm');
  const confirmEl = document.getElementById('chat-context-delete-confirm');
  if (confirmEl) confirmEl.setAttribute('hidden', '');

  const actionsEl = document.getElementById('chat-context-menu-actions');
  const preview = document.getElementById('chat-context-preview');
  if (!actionsEl) return;

  if (preview) {
    const threads = Store.getCachedThreads(chatId) || [];
    const previewThreads = [...threads].slice(-3);

    const formatClockTime = sentAt => {
      if (!sentAt) return '';
      try {
        return new Date(sentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      } catch {
        return '';
      }
    };

    const previewCards = previewThreads.map(thread => {
      const messages = Array.isArray(thread?.messages) ? thread.messages : [];
      const seed = messages[0] || null;
      const title = seed?.label || thread?.label || 'Voice memo';
      const time = formatClockTime(seed?.sentAt || thread?.lastActivityAt || thread?.createdAt || null);

      const totalMs = messages.reduce((sum, msg) => sum + Math.max(0, Number(msg?.durationMs) || 0), 0);
      const remaining = totalMs ? `-${formatDurationClock(totalMs)}` : '';

      const authors = [];
      const seen = new Set();
      for (const msg of messages) {
        const key = msg?.authorId || msg?.author?.name || msg?.id;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        authors.push({
          name: msg?.author?.name || msg?.authorId || 'Friend',
          avatarUrl: msg?.author?.avatarUrl || '',
        });
        if (authors.length >= 3) break;
      }

      const avatars = authors.length
        ? `<div class="chat-context-preview-card__avatars">
            ${authors.map(a => {
              const initials = buildUserInitials(a.name || 'Y');
              const style = a.avatarUrl ? `background-image:url('${escapeHtml(a.avatarUrl)}')` : '';
              return `<span class="chat-context-preview-card__avatar" style="${style}">${a.avatarUrl ? '' : escapeHtml(initials)}</span>`;
            }).join('')}
          </div>`
        : '';

      return `
        <div class="chat-context-preview-card">
          <div class="chat-context-preview-card__header">
            <div class="chat-context-preview-card__play" aria-hidden="true"></div>
            <div class="chat-context-preview-card__title">${escapeHtml(title)}</div>
            ${time ? `<div class="chat-context-preview-card__time">${escapeHtml(time)}</div>` : ''}
          </div>
          <div class="chat-context-preview-card__track">
            <div class="chat-context-preview-card__time">0:00</div>
            <div class="chat-context-preview-card__line"><span style="width:0%"></span></div>
            ${remaining ? `<div class="chat-context-preview-card__time">${escapeHtml(remaining)}</div>` : ''}
          </div>
          ${avatars}
        </div>
      `;
    }).join('');

    if (previewCards) {
      preview.innerHTML = previewCards;
    } else {
      const chat = AppState.chats.find(c => c.id === chatId) || null;
      const otherMembers = chat ? getChatOtherMembers(chat) : [];
      const heroMember = otherMembers[0] ? resolveAvatarMember(otherMembers[0]) : null;
      const accent = heroMember?.color || pickUserColor(heroMember?.name || heroMember?.phoneE164 || heroMember?.id || 'Y');
      const accentRgb = _hexToRgb(accent);
      preview.innerHTML = `
        <div class="chat-context-preview-empty">
          ${heroMember
            ? `<div class="floating-avatar floating-avatar--primary chat-context-preview-empty__floating"
                 style="--floating-accent:${accent};--floating-accent-rgb:${accentRgb}">
                <div class="floating-avatar__label">${escapeHtml(heroMember?.name || 'Friend')}</div>
                <div class="floating-avatar__photo ${heroMember?.avatarUrl ? '' : 'avatar-fallback'}"
                     style="${heroMember?.avatarUrl ? `background-image:url('${escapeHtml(heroMember.avatarUrl)}');background-size:cover;background-position:center;background-repeat:no-repeat` : `--avatar-accent:${accent};`}">
                  ${heroMember?.avatarUrl ? '' : `<span>${escapeHtml(buildUserInitials(heroMember?.name || 'Y'))}</span>`}
                </div>
              </div>`
            : `<div class="floating-avatar floating-avatar--primary chat-context-preview-empty__floating"
                 style="--floating-accent:${accent};--floating-accent-rgb:${accentRgb}">
                <div class="floating-avatar__label">New chat</div>
                <div class="floating-avatar__photo avatar-fallback" style="--avatar-accent:${accent};">
                  <span>${escapeHtml(buildUserInitials('Y'))}</span>
                </div>
              </div>`}
        </div>
      `;
    }
  }

  AppState.contextMenuChatId = chatId;
  updateChatsUnreadCounts();
  const menuChat = AppState.chats.find(c => c.id === chatId) || null;
  syncChatContextMenuLabels(menuChat);
  DOM.chatContextMenu.removeAttribute('hidden');
  DOM.chatContextMenu.classList.add('active');
}

function hideChatContextMenu() {
  if (!DOM.chatContextMenu) return;
  DOM.chatContextMenu.classList.remove('chat-context-menu--delete-confirm');
  const confirmEl = document.getElementById('chat-context-delete-confirm');
  if (confirmEl) confirmEl.setAttribute('hidden', '');
  DOM.chatContextMenu.classList.remove('active');
  DOM.chatContextMenu.setAttribute('hidden', '');
  AppState.contextMenuChatId = null;
}

async function handleChatContextAction(action) {
  const chatId = AppState.contextMenuChatId;
  if (!chatId) return;

  const chat = AppState.chats.find(c => c.id === chatId);
  if (!chat) return;

  hideChatContextMenu();

  try {
    switch (action) {
      case 'pin': {
        const nextPinned = !chat.pinned;
        AppState.chats = sortChatsForDisplay(
          AppState.chats.map(c => (c.id === chatId ? { ...c, pinned: nextPinned } : c))
        );
        writeCachedChatsForUser(AppState.chats, getCurrentUserId());
        scheduleChatsListRender({ flipForChatId: chatId, flipPinned: nextPinned });
        break;
      }
      case 'mark-unread': {
        const fresh = AppState.chats.find(c => c.id === chatId);
        if (fresh && Number(fresh.unread || 0) > 0) {
          await markEntireChatAsRead(chatId);
        } else {
          await markLatestOtherVoiceMemoUnread(chatId);
        }
        break;
      }
      case 'hide-alerts': {
        const nextMute = !chat.hideAlerts;
        chat.hideAlerts = nextMute;
        await setChatMuteAlerts(chatId, getCurrentUserId(), nextMute);
        writeCachedChatsForUser(AppState.chats, getCurrentUserId());
        await refreshChatsAndRender({ force: true });
        break;
      }
    }
  } catch (error) {
    console.error('[yAp] Context action failed:', error);
  }
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

function queueRealtimeSync(delayMs = 250) {
  if (!YAP_SUPABASE_REMOTE_SYNC_ENABLED) return;
  if (AppState.sync.realtimeTimer) {
    window.clearTimeout(AppState.sync.realtimeTimer);
  }

  AppState.sync.realtimeTimer = window.setTimeout(() => {
    AppState.sync.realtimeTimer = 0;
    syncRemoteState({ forceConversation: true, forceChats: true });
  }, Math.max(0, delayMs || 0));
}

function handleRealtimePostgresChange(payload) {
  const table = payload?.table || '';
  const eventType = payload?.eventType || '';
  const row = payload?.new || payload?.old || {};
  const activeChatId = AppState.activeChat?.id || null;
  const changedChatId = row?.chat_id || null;
  const isActiveChatMessageChange = table === 'voice_messages'
    && eventType === 'INSERT'
    && changedChatId
    && changedChatId === activeChatId;

  if (isActiveChatMessageChange) {
    // Force fresh data immediately when new message arrives in active chat
    AppState.sync.pendingForceConversation = true;
    queueRealtimeSync(0);
  } else {
    // Debounced sync for other changes
    queueRealtimeSync(120);
  }
}

function buildChatDeepLink(chatId) {
  const url = new URL(window.location.href);
  if (chatId) {
    url.searchParams.set('chat', chatId);
  } else {
    url.searchParams.delete('chat');
  }
  return url.toString();
}

async function showLocalChatNotification(title, body, tag, chatId = '') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (chatId) {
    const chat = AppState.chats.find(c => c.id === chatId);
    if (chat?.hideAlerts) return;
  }
  const targetUrl = buildChatDeepLink(chatId);

  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (registration?.showNotification) {
      await registration.showNotification(title, {
        body,
        tag,
        renotify: false,
        data: {
          url: targetUrl,
          chatId: chatId || '',
        },
      });
      return;
    }
  } catch (error) {
    console.warn('[yAp] service worker notification failed:', error);
  }

  try {
    const notification = new Notification(title, {
      body,
      tag,
      data: {
        url: targetUrl,
        chatId: chatId || '',
      },
    });
    notification.onclick = () => {
      try {
        window.focus();
      } catch {}
      window.location.href = targetUrl;
      notification.close();
    };
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
      if (!chat.hideAlerts) {
        showLocalChatNotification(getChatDisplayName(chat, 'New chat'), 'You were added to a chat.', `chat-${chat.id}`, chat.id);
      }
      continue;
    }

    const nextLastMessageAt = Number(chat?.lastMessageAt || 0);
    const nextUnread = Number(chat?.unread || 0);
    const hasNewRemoteMessage = nextLastMessageAt > Number(previous.lastMessageAt || 0)
      && nextUnread > Number(previous.unread || 0)
      && chat?.previewAuthorId
      && chat.previewAuthorId !== currentUserId;

    if (!hasNewRemoteMessage) continue;
    if (chat.hideAlerts) continue;

    showLocalChatNotification(
      getChatDisplayName(chat, 'New message'),
      chat.preview || 'New voice memo',
      `chat-${chat.id}-message`,
      chat.id
    );
  }
}

async function syncRemoteState({ forceConversation = false, forceChats = false } = {}) {
  if (!AppState.supabaseOk || !AppState.auth.session || !getCurrentUserId()) return;
  if (AppState.sync.inFlight) {
    AppState.sync.pendingForceConversation = AppState.sync.pendingForceConversation || forceConversation;
    AppState.sync.pendingForceChats = AppState.sync.pendingForceChats || forceChats;
    return;
  }

  AppState.sync.inFlight = true;
  const previousSnapshot = AppState.sync.chatSnapshot;
  const activeChatId = AppState.activeChat?.id || null;

  try {
    await refreshChats({ force: forceChats });

    if (activeChatId) {
      AppState.activeChat = AppState.chats.find(chat => chat.id === activeChatId) || AppState.activeChat;
    }

    scheduleChatsListRender();
    scheduleConversationCachePrime();

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
    const pendingForceConversation = AppState.sync.pendingForceConversation;
    const pendingForceChats = AppState.sync.pendingForceChats;
    AppState.sync.pendingForceConversation = false;
    AppState.sync.pendingForceChats = false;
    if (pendingForceConversation || pendingForceChats) {
      window.setTimeout(() => {
        syncRemoteState({
          forceConversation: pendingForceConversation,
          forceChats: pendingForceChats,
        });
      }, 0);
    }
  }
}

function startRemoteSync() {
  if (!YAP_SUPABASE_REMOTE_SYNC_ENABLED) {
    stopRemoteSync();
    return;
  }

  if (AppState.sync.intervalId) {
    ensureRealtimeSyncChannel();
    return;
  }

  AppState.sync.chatSnapshot = buildChatActivitySnapshot(AppState.chats);
  AppState.sync.intervalId = window.setInterval(() => {
    syncRemoteState({ forceConversation: AppState.screen === 'chat' });
  }, YAP_SUPABASE_SYNC_INTERVAL_MS);
  ensureRealtimeSyncChannel();

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

function bindResumeRefreshHandlers() {
  if (AppState.sync.handlersBound) return;

  const refreshOnResume = () => {
    if (!AppState.supabaseOk || !AppState.auth.session || !getCurrentUserId()) return;
    const minRefreshMs = Math.max(15_000, Number(YAP_SUPABASE_CHAT_REFRESH_MIN_MS || 0));
    if ((Date.now() - Number(AppState.sync.lastChatsRefreshAt || 0)) < minRefreshMs) return;
    syncRemoteState({ forceConversation: AppState.screen === 'chat' });
  };

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshOnResume();
  });
  window.addEventListener('focus', refreshOnResume);
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
  AppState.sync.lastChatsRefreshAt = 0;
  if (AppState.sync.realtimeTimer) {
    window.clearTimeout(AppState.sync.realtimeTimer);
  }
  AppState.sync.realtimeTimer = 0;
  if (AppState.sync.conversationPrimeTimer) {
    window.clearTimeout(AppState.sync.conversationPrimeTimer);
  }
  AppState.sync.conversationPrimeTimer = 0;
  AppState.sync.conversationPrimePromise = null;
  AppState.sync.conversationCacheVersions = new Map();
  AppState.sync.remotePresence = new Map();
  AppState.sync.pendingForceConversation = false;
  AppState.sync.pendingForceChats = false;
  if (AppState.sync.realtimeChannel) {
    try {
      supabaseClient?.removeChannel?.(AppState.sync.realtimeChannel);
    } catch (error) {
      console.warn('[yAp] realtime channel cleanup failed:', error);
    }
  }
  AppState.sync.realtimeChannel = null;
}

function ensureRealtimeSyncChannel() {
  if (!AppState.supabaseOk || !supabaseClient?.channel || !getCurrentUserId()) return;
  if (AppState.sync.realtimeChannel) return;

  const channel = supabaseClient.channel(`yap-sync-${getCurrentUserId()}`, {
    config: {
      presence: {
        key: getCurrentUserId(),
      },
    },
  });
  const tables = [
    'chats',
    'chat_participants',
    'voice_messages',
    'topic_threads',
    'topic_segments',
    'transcripts',
    'playback_progress',
  ];

  tables.forEach(table => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      payload => handleRealtimePostgresChange(payload)
    );
  });

  channel.on('presence', { event: 'sync' }, () => {
    refreshRemotePresenceState();
    renderChatPresence(AppState.activeChat);
  });

  channel.on('presence', { event: 'join' }, () => {
    refreshRemotePresenceState();
    renderChatPresence(AppState.activeChat);
  });

  channel.on('presence', { event: 'leave' }, () => {
    refreshRemotePresenceState();
    renderChatPresence(AppState.activeChat);
  });

  channel.subscribe(async status => {
    if (status === 'SUBSCRIBED') {
      console.log('[yAp] Realtime subscription active');
      await syncLocalPresence();
      refreshRemotePresenceState();
      renderChatPresence(AppState.activeChat);
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      console.warn(`[yAp] Realtime channel ${status}, falling back to polling`);
      AppState.sync.realtimeChannel = null;
      // Auto-reconnect in 5 seconds
      setTimeout(() => ensureRealtimeSyncChannel(), 5000);
    }
  });

  AppState.sync.realtimeChannel = channel;

  // Periodically check realtime health (every 30 seconds)
  setInterval(() => {
    if (!AppState.sync.realtimeChannel || !supabaseClient?.channel) return;
    if (AppState.sync.realtimeChannel.state !== 'joined') {
      console.warn('[yAp] Realtime connection lost, re-establishing...');
      closeRealtimeSyncChannel();
      ensureRealtimeSyncChannel();
    }
  }, 30000);
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
    await refreshChats({ force: true });
    const found = AppState.chats.find(chat => chat.id === chatId) || null;
    if (found) return found;
    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return AppState.chats.find(chat => chat.id === chatId) || null;
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
    DOM.profilePhotoPickLabel.textContent = hasCustomProfileAvatar(imageUrl) ? 'Change Photo' : 'Add required photo';
  }
}

function isPlaceholderProfileName(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || normalized === 'name' || normalized === 'you';
}

function hasCustomProfileAvatar(value = '') {
  const normalized = String(value || '').trim();
  return !!normalized && normalized !== 'assets/sooim.jpg';
}

function validateProfileSetupFields() {
  const name = DOM.inputProfileName?.value?.trim() || '';
  const avatarUrl = DOM.inputProfileAvatar?.value?.trim() || '';

  if (isPlaceholderProfileName(name)) {
    DOM.inputProfileName?.focus();
    setFeedback(DOM.profileSetupFeedback, 'Add your name before continuing.', 'error');
    return false;
  }

  if (!hasCustomProfileAvatar(avatarUrl)) {
    DOM.btnProfilePhotoPick?.focus();
    setFeedback(DOM.profileSetupFeedback, 'Add a profile photo before continuing.', 'error');
    return false;
  }

  return true;
}

function syncProfileManageAvatarLabel(user = getCurrentUser()) {
  if (!DOM.manageProfilePhotoLabel) return;
  DOM.manageProfilePhotoLabel.textContent = user?.avatarUrl ? 'Edit' : 'Add';
}

let profileAvatarPreviewReturnFocus = null;

function syncManageProfilePhotoButton() {
  if (!DOM.btnManageProfilePhoto) return;
  const editing = DOM.btnProfileEdit?.dataset.editing === 'true';
  DOM.btnManageProfilePhoto.setAttribute(
    'aria-label',
    editing ? 'Change profile photo' : 'View profile photo',
  );
}

function onProfileAvatarPreviewOverlayKeydown(event) {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  closeProfileAvatarPreviewOverlay();
}

function closeProfileAvatarPreviewOverlay() {
  if (!DOM.profileAvatarPreviewOverlay || DOM.profileAvatarPreviewOverlay.hidden) return;
  DOM.profileAvatarPreviewOverlay.hidden = true;
  DOM.profileAvatarPreviewOverlay.setAttribute('aria-hidden', 'true');
  document.removeEventListener('keydown', onProfileAvatarPreviewOverlayKeydown);
  DOM.profileAvatarPreviewStage?.setAttribute('aria-hidden', 'true');
  if (profileAvatarPreviewReturnFocus && typeof profileAvatarPreviewReturnFocus.focus === 'function') {
    try {
      profileAvatarPreviewReturnFocus.focus();
    } catch {}
  }
  profileAvatarPreviewReturnFocus = null;
}

function openProfileAvatarPreviewOverlay() {
  if (!DOM.profileAvatarPreviewOverlay || !DOM.profileAvatarPreviewStage) return;
  profileAvatarPreviewReturnFocus = document.activeElement;
  const name = DOM.inputManageProfileName?.value?.trim() || getCurrentUser().name || 'You';
  const rawUrl = DOM.inputManageProfileAvatar?.value?.trim() || '';
  const imageUrl = hasCustomProfileAvatar(rawUrl) ? rawUrl : '';
  setAvatarPickerPreview({
    element: DOM.profileAvatarPreviewStage,
    imageUrl,
    fallbackText: buildUserInitials(name),
    accent: pickUserColor(name),
  });
  DOM.profileAvatarPreviewOverlay.hidden = false;
  DOM.profileAvatarPreviewOverlay.setAttribute('aria-hidden', 'false');
  DOM.profileAvatarPreviewStage.setAttribute('aria-hidden', 'false');
  document.addEventListener('keydown', onProfileAvatarPreviewOverlayKeydown);
  try {
    DOM.btnProfileAvatarPreviewClose?.focus();
  } catch {}
}

async function handleProfileAvatarPicked(file, target = 'setup') {
  const hiddenInput = target === 'manage' ? DOM.inputManageProfileAvatar : DOM.inputProfileAvatar;
  const feedbackEl = target === 'manage' ? DOM.profileManageFeedback : DOM.profileSetupFeedback;
  if (!file) return;

  if (!String(file.type || '').startsWith('image/')) {
    setFeedback(feedbackEl, 'Choose an image from your photo library.', 'error');
    return;
  }

  const tooLarge = file.size > (25 * 1024 * 1024);
  if (tooLarge) {
    setFeedback(feedbackEl, 'Choose an image under 25 MB.', 'error');
    return;
  }

  try {
    setFeedback(feedbackEl, 'Optimizing photo...', 'success');
    const optimized = await optimizeImageFileForAvatar(file, {
      maxDimension: 640,
      maxBytes: 180 * 1024,
      outputType: 'image/jpeg',
    });
    hiddenInput.value = optimized.dataUrl;
    setFeedback(feedbackEl, '');

    if (target === 'manage') {
      const currentUser = getCurrentUser();
      setAvatarPickerPreview({
        element: DOM.profileSettingsAvatar,
        imageUrl: optimized.dataUrl,
        fallbackText: buildUserInitials(currentUser.name || 'You'),
        accent: pickUserColor(currentUser.name || 'You'),
      });
      currentUser.avatarUrl = optimized.dataUrl;
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

function getChatMemberDisplayName(member) {
  const resolvedMember = resolveAvatarMember(member);
  const name = String(resolvedMember?.name || '').trim();
  if (name && name !== resolvedMember?.phoneE164) return name;
  return String(resolvedMember?.phoneE164 || '').trim();
}

function getChatDisplayName(chat, fallback = 'yAp chat') {
  const otherNames = getChatOtherMembers(chat)
    .map(getChatMemberDisplayName)
    .filter(Boolean);

  if (otherNames.length) {
    const visibleNames = otherNames.slice(0, 3);
    const remainingCount = otherNames.length - visibleNames.length;
    return remainingCount > 0
      ? `${visibleNames.join(', ')} +${remainingCount}`
      : visibleNames.join(', ');
  }

  return String(chat?.name || fallback).trim() || fallback;
}

function canManageActiveChat() {
  const role = AppState.activeChat?.currentUserRole;
  return role === 'owner' || role === 'admin' || role === 'member';
}

function resolveAvatarMember(member) {
  if (!member) return member;
  if (member.avatarUrl && member.name && member.name !== member.phoneE164) return member;
  if (typeof USERS === 'undefined') return member;

  const phone = normalizePhoneNumber(member.phoneE164 || member.phone || '');
  const displayName = normalizeAvatarLookupName(member.name || '');
  const candidates = Object.values(USERS).filter(candidate => {
    if (!candidate) return false;
    if (member.id && candidate.id === member.id) return true;
    if (phone && normalizePhoneNumber(candidate.phoneE164 || '') === phone) return true;
    if (displayName && isLikelySameAvatarName(displayName, candidate.name || '')) return true;
    return false;
  });

  if (!candidates.length) return member;

  const best = candidates.sort((a, b) => {
    const aScore = (a?.avatarUrl ? 4 : 0) + (a?.name && a.name !== a.phoneE164 ? 2 : 0) + (a?.profileCompleted ? 1 : 0);
    const bScore = (b?.avatarUrl ? 4 : 0) + (b?.name && b.name !== b.phoneE164 ? 2 : 0) + (b?.profileCompleted ? 1 : 0);
    return bScore - aScore;
  })[0];

  return {
    ...member,
    ...best,
    id: member.id || best.id,
    name: best.name || member.name,
    phoneE164: member.phoneE164 || best.phoneE164,
    avatarUrl: best.avatarUrl || member.avatarUrl || '',
    color: best.color || member.color,
    initials: best.initials || member.initials,
  };
}

function normalizeAvatarLookupName(name = '') {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelySameAvatarName(normalizedName, candidateName = '') {
  const normalizedCandidate = normalizeAvatarLookupName(candidateName);
  if (!normalizedName || !normalizedCandidate) return false;
  if (normalizedName === normalizedCandidate) return true;

  const nameFirst = normalizedName.split(' ')[0] || '';
  const candidateFirst = normalizedCandidate.split(' ')[0] || '';
  return !!nameFirst
    && !!candidateFirst
    && nameFirst.length >= 3
    && candidateFirst.length >= 3
    && (nameFirst.startsWith(candidateFirst) || candidateFirst.startsWith(nameFirst));
}

function buildAvatarClass(baseClass, member) {
  const resolvedMember = resolveAvatarMember(member);
  return `${baseClass}${resolvedMember?.avatarUrl ? '' : ' avatar-fallback'}`;
}

function cssUrl(value = '') {
  return `url('${escapeHtml(String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'"))}')`;
}

function buildAvatarStyle(member) {
  const resolvedMember = resolveAvatarMember(member);
  const accent = resolvedMember?.color || pickUserColor(resolvedMember?.name || resolvedMember?.phoneE164 || resolvedMember?.id || '');
  const glow = `--chat-avatar-accent:${accent}`;
  return resolvedMember?.avatarUrl
    ? `background-image:${cssUrl(resolvedMember.avatarUrl)};background-size:cover;background-position:center;background-repeat:no-repeat;background-color:transparent;${glow}`
    : `--avatar-accent:${accent};${glow}`;
}

function buildAvatarContent(member, fallbackSeed = 'Y') {
  const resolvedMember = resolveAvatarMember(member);
  if (resolvedMember?.avatarUrl) return '';
  const name = resolvedMember?.name;
  const isPhoneOnly = !name || name === resolvedMember?.phoneE164;
  if (isPhoneOnly) return profilePlaceholderIconHTML();
  const initials = escapeHtml(resolvedMember?.initials || buildUserInitials(name));
  return `<span>${initials}</span>`;
}

function buildMemberAvatarMarkup(member, extraClass = '') {
  return `
    <div class="${buildAvatarClass(extraClass, member)}" style="${buildAvatarStyle(member)}">
      ${buildAvatarContent(member)}
    </div>
  `;
}

function getLocalPresencePayload() {
  const isInActiveChat = AppState.screen === 'chat' && !!AppState.activeChat?.id;
  return {
    userId: getCurrentUserId() || '',
    chatId: isInActiveChat ? AppState.activeChat.id : '',
    state: AppState.recording.phase === 'sending'
      ? 'sending'
      : AppState.recording.phase === 'recording'
      ? 'recording'
      : (isInActiveChat ? 'active' : 'idle'),
    ts: Date.now(),
  };
}

function foldPresenceEntries(entries = []) {
  const priority = { sending: 3, recording: 2, active: 1, idle: 0 };
  return (Array.isArray(entries) ? entries : []).reduce((best, entry) => {
    if (!entry?.userId) return best;
    if (!best) return entry;

    const nextPriority = priority[entry.state] ?? -1;
    const bestPriority = priority[best.state] ?? -1;
    if (nextPriority !== bestPriority) {
      return nextPriority > bestPriority ? entry : best;
    }

    return Number(entry.ts || 0) >= Number(best.ts || 0) ? entry : best;
  }, null);
}

function refreshRemotePresenceState() {
  const channel = AppState.sync.realtimeChannel;
  const nextPresence = new Map();
  const rawState = channel?.presenceState?.() || {};

  Object.values(rawState).forEach(entries => {
    const normalizedEntries = (Array.isArray(entries) ? entries : [])
      .map(entry => entry?.presence_ref ? entry : (entry?.payload || entry))
      .filter(Boolean);
    const folded = foldPresenceEntries(normalizedEntries);
    if (folded?.userId) nextPresence.set(folded.userId, folded);
  });

  AppState.sync.remotePresence = nextPresence;
}

function getLiveChatPresenceMembers(chat = AppState.activeChat) {
  if (!chat?.id) return [];

  return getChatOtherMembers(chat)
    .map(member => {
      const resolvedMember = resolveAvatarMember(member);
      const presence = AppState.sync.remotePresence.get(resolvedMember?.id || member?.id || '');
      if (!presence || presence.chatId !== chat.id || presence.state === 'idle') return null;
      return {
        ...resolvedMember,
        presenceState: presence.state,
      };
    })
    .filter(Boolean);
}

function renderChatPresence(chat = AppState.activeChat) {
  if (!DOM.chatPresence) return;

  const liveMembers = getLiveChatPresenceMembers(chat);
  DOM.chatPresence.innerHTML = liveMembers
    .map(member => `
      <div class="${buildAvatarClass(`chat-presence__avatar is-live is-${member.presenceState}`, member)}"
           style="${buildAvatarStyle(member)}">
        ${buildAvatarContent(member)}
        <span class="chat-presence__status" aria-hidden="true"></span>
      </div>
    `)
    .join('');

  setDisplay(DOM.chatPresence, liveMembers.length > 0, 'flex');
}

async function syncLocalPresence() {
  const channel = AppState.sync.realtimeChannel;
  if (!channel?.track || !getCurrentUserId()) return;

  try {
    await channel.track(getLocalPresencePayload());
  } catch (error) {
    console.warn('[yAp] local presence track failed:', error);
  }
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
  const otherMembers = getChatOtherMembers(chat);
  if (otherMembers.length === 1) {
    return `
      <div class="chat-art-besties chat-art-besties--single">
        ${buildMemberAvatarMarkup(otherMembers[0], 'chat-art-besties__avatar chat-art-besties__avatar--single')}
      </div>
    `;
  }

  if (chat.avatarUrl) {
    return `<div class="chat-art-circle" style="background-image:${cssUrl(chat.avatarUrl)};background-size:cover;background-position:center;background-repeat:no-repeat"></div>`;
  }

  if (chat.visual === 'besties') {
    const bestiesMembers = (otherMembers.length ? otherMembers : (chat.members || [])).slice(0, 4);
    if (bestiesMembers.length) {
      return `
        <div class="chat-art-besties">
          ${bestiesMembers.map((member, index) => buildMemberAvatarMarkup(
            member,
            `chat-art-besties__avatar ${index === 0 ? 'chat-art-besties__avatar--main' : 'chat-art-besties__avatar--secondary'}`
          )).join('')}
        </div>
      `;
    }

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

  const artMembers = (otherMembers.length ? otherMembers : (chat.members || [])).slice(0, 4);
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

  const fallbackLabel = buildUserInitials(chat.name || chat.emoji || 'Y');
  return `<div class="chat-art-circle avatar-fallback chat-art-circle--fallback" style="--avatar-accent:${pickUserColor(chat.name || fallbackLabel)}"><span>${escapeHtml(fallbackLabel)}</span></div>`;
}

function renderActiveChatShell(chat) {
  DOM.chatTitle.textContent = getChatDisplayName(chat);

  const currentUserId = getCurrentUserId();
  const otherMembers = getChatOtherMembers(chat);
  if (DOM.chatMemberPips) {
    if (otherMembers.length > 1) {
      const pipMembers = otherMembers.slice(0, 4);
      DOM.chatMemberPips.innerHTML = `
        <div class="chat-art-besties chat-art-besties--pips">
          ${pipMembers.map((member, index) => buildMemberAvatarMarkup(
            member,
            `chat-art-besties__avatar ${index === 0 ? 'chat-art-besties__avatar--main' : 'chat-art-besties__avatar--secondary'}`
          )).join('')}
        </div>
      `;
    } else {
      DOM.chatMemberPips.innerHTML = (chat.members || [])
        .filter(member => member.id !== currentUserId)
        .map(member => {
          const avatarUrl = member.avatarUrl ? `url('${member.avatarUrl}')` : 'none';
          const bgColor = member.color || pickUserColor(member.name || member.phoneE164 || member.id || '');
          return `<div class="member-pip" style="background-image:${avatarUrl}; background-color:${bgColor}; background-size:cover; background-position:center;"></div>`;
        })
        .join('');
    }
  }

  renderChatPresence(chat);
  DOM.chatEmpty?.classList.toggle('is-single-member', otherMembers.length === 1);

  const featuredMembers = otherMembers.slice(0, otherMembers.length);
  const firstMember = featuredMembers[0];
  const secondMember = featuredMembers[1];

  // Render all floating avatars
  const floatingContainer = DOM.chatEmpty?.querySelector('.floating-avatars-container') || DOM.chatEmpty;
  if (floatingContainer && featuredMembers.length > 0) {
    let existingContainer = DOM.chatEmpty?.querySelector('.floating-avatars-container');
    if (!existingContainer) {
      existingContainer = document.createElement('div');
      existingContainer.className = 'floating-avatars-container';
      DOM.chatEmpty?.appendChild(existingContainer);
      DOM.chatEmpty.floatingAvatarsContainer = existingContainer;
    }
    
    existingContainer.innerHTML = '';
    featuredMembers.forEach((member, index) => {
      const avatarEl = document.createElement('div');
      avatarEl.className = 'floating-avatar floating-avatar--dynamic';
      avatarEl.id = `floating-avatar-${index}`;
      avatarEl.style.zIndex = 1000 - index;
      avatarEl.style.right = (index * 30) + 'px';
      
      const labelEl = document.createElement('div');
      labelEl.className = 'floating-avatar__label';
      labelEl.textContent = member.name || member.phoneE164 || 'User';
      
      const photoEl = document.createElement('div');
      photoEl.className = 'floating-avatar__photo';
      
      avatarEl.appendChild(labelEl);
      avatarEl.appendChild(photoEl);
      existingContainer.appendChild(avatarEl);
      
      renderFloatingProfile(avatarEl, labelEl, photoEl, member, '');
    });
  }
}

// ── Open a chat ───────────────────────────────────────
function updateChatsUnreadCounts() {
  const currentUserId = getCurrentUserId();
  for (const chat of AppState.chats || []) {
    const threads = readCachedThreadsForChat(chat.id);
    let unreadCount = 0;
    for (const thread of threads || []) {
      for (const message of thread.messages || []) {
        if (message.authorId !== currentUserId && !message.heardByCurrentUser) {
          unreadCount++;
        }
      }
    }
    chat.unread = unreadCount;
  }
}

async function markChatMessagesAsHeard(chatId) {
  const threads = Store.getThreads();
  const currentUserId = getCurrentUserId();
  if (!currentUserId || !threads.length) return;

  const heardPromises = [];
  for (const thread of threads) {
    for (const message of thread.messages || []) {
      if (message.authorId !== currentUserId && !message.heardByCurrentUser && message.voiceMessageId) {
        heardPromises.push(savePlaybackProgressRecord({
          userId: currentUserId,
          voiceMessageId: message.voiceMessageId,
          heard: true,
          playedMs: 0,
        }));
      }
    }
  }

  if (heardPromises.length > 0) {
    await Promise.all(heardPromises);
    const chat = AppState.chats.find(c => c.id === chatId);
    if (chat) {
      chat.unread = 0;
      refreshChats();
    }
  }
}

async function closeActiveChatAndNavigateToList({ skipTransition = false } = {}) {
  if (AppState.activeChat) {
    pinChatInLocalLists(AppState.activeChat);
  }
  try {
    await refreshChatsAndRender({ force: true });
  } finally {
    AppState.activeChat = null;
    navigate('chats', 'back', { replace: true, skipTransition });
  }
}

async function openChat(chat) {
  AppState.activeChat = chat;
  Store.setActiveChat(chat.id);
  if (DOM.btnNowPlaying) DOM.btnNowPlaying.style.visibility = 'hidden';

  renderActiveChatShell(chat);
  syncLocalPresence();

  // Show cached threads instantly without any delay
  const cachedThreads = Store.getCachedThreads(chat.id);
  Store.setActiveChat(chat.id);
  DOM.chatMemberPips.style.visibility = 'visible';
  setDisplay(DOM.chatEmpty, false);
  setDisplay(DOM.chatTopics, true, 'flex');
  renderTopics();
  scrollChatToLatest();

  navigate('chat', 'forward');
  renderChatPresence(AppState.activeChat);

  // Load fresh threads in background
  hydrateActiveConversation(true)
    .then(() => {
      if (AppState.activeChat?.id !== chat.id) return;
      const existingThreads = Store.getThreads();

      if (existingThreads.length > 0) {
        renderTopics();
        scrollChatToLatest();
      } else {
        setDisplay(DOM.chatEmpty, true);
        setDisplay(DOM.chatTopics, false);
      }
      renderChatPresence(AppState.activeChat);
    })
    .catch(error => console.warn('[yAp] Chat open hydration failed:', error));

  markChatMessagesAsHeard(chat.id).catch(error => console.warn('[yAp] mark read failed:', error));
}

function scrollChatToLatest() {
  const scroll = () => {
    if (DOM.chatTopics) DOM.chatTopics.scrollTop = DOM.chatTopics.scrollHeight;
    if (DOM.chatBody) DOM.chatBody.scrollTop = DOM.chatBody.scrollHeight;
  };
  requestAnimationFrame(() => {
    scroll();
    requestAnimationFrame(scroll);
  });
}

async function hydrateActiveConversation(force = false) {
  if (!AppState.supabaseOk || !AppState.activeChat?.id) return Store.getThreads();
  if (!force && AppState.conversationHydrating) return AppState.conversationHydrating;

  const activeChatId = AppState.activeChat.id;
  const shouldReuse = !force
    && AppState.conversationHydratedChatId === activeChatId
    && AppState.conversationHydratedAt
    && (Date.now() - AppState.conversationHydratedAt) < YAP_SUPABASE_CONVERSATION_CACHE_TTL_MS;
  if (shouldReuse) return Store.getThreads();

  AppState.conversationHydrating = hydrateChatFromSupabase(activeChatId)
    .catch(error => {
      console.warn('[yAp] Conversation hydration failed:', error);
      return Store.getThreads();
    })
    .finally(() => {
      AppState.conversationHydrating = null;
      AppState.conversationHydratedAt = Date.now();
      AppState.conversationHydratedChatId = activeChatId;
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

// ── Now Playing ───────────────────────────────────────

function openNowPlaying() {
  const threads = Store.getThreads();
  if (!threads.length) return;

  // Find the last unheard thread; if all heard, start from the end
  let startIndex = threads.length - 1;
  for (let i = threads.length - 1; i >= 0; i--) {
    if (threads[i].unheardCount > 0) {
      startIndex = i;
      break;
    }
  }

  AppState.nowPlaying.active = true;
  AppState.nowPlaying.topicIndex = startIndex;
  AppState.nowPlaying.isPlaying = true;
  AppState.nowPlaying.lastSpeakerId = null;
  AppState.nowPlaying.completedAll = false;
  AppState.nowPlaying.topicDotColors = {};
  DOM.nowPlayingOverlay.classList.add('visible');
  DOM.nowPlayingOverlay.setAttribute('aria-hidden', 'false');
  _renderNowPlayingTopic(startIndex, null);
  _startNowPlayingPlayback();
}

function closeNowPlaying() {
  AppState.nowPlaying.active = false;
  AppState.nowPlaying.isPlaying = false;
  AppState.nowPlaying.completedAll = false;
  AppState.nowPlaying.topicDotColors = {};
  PlaybackController.stop();
  DOM.nowPlayingOverlay.classList.remove('visible');
  DOM.nowPlayingOverlay.setAttribute('aria-hidden', 'true');
  _syncNowPlayingPauseIcon(false);
}

function _startNowPlayingPlayback() {
  const threads = Store.getThreads();
  const thread = threads[AppState.nowPlaying.topicIndex];
  if (!thread) return;
  AppState.nowPlaying.isPlaying = true;
  AppState.nowPlaying.completedAll = false;
  _syncNowPlayingPauseIcon(true);
  PlaybackController.playThread(thread, null).catch(() => {});
}

function _toggleNowPlayingPause() {
  if (!AppState.nowPlaying.active) return;
  if (PlaybackController.audio.paused) {
    AppState.nowPlaying.isPlaying = true;
    _syncNowPlayingPauseIcon(true);
    PlaybackController.audio.play().catch(() => {});
  } else {
    AppState.nowPlaying.isPlaying = false;
    _syncNowPlayingPauseIcon(false);
    PlaybackController.audio.pause();
  }
}

function _syncNowPlayingPauseIcon(isPlaying) {
  const playIcon = DOM.btnNpPlaypause?.querySelector('.np-icon-play');
  const pauseIcon = DOM.btnNpPlaypause?.querySelector('.np-icon-pause');
  if (playIcon) playIcon.style.display = isPlaying ? 'none' : '';
  if (pauseIcon) pauseIcon.style.display = isPlaying ? '' : 'none';
}

function _nowPlayingGoToTopic(index, direction) {
  const threads = Store.getThreads();
  if (!threads.length) return;
  const safeIndex = Math.max(0, Math.min(index, threads.length - 1));
  if (safeIndex === AppState.nowPlaying.topicIndex && AppState.nowPlaying.active) return;
  PlaybackController.stop();
  AppState.nowPlaying.topicIndex = safeIndex;
  AppState.nowPlaying.lastSpeakerId = null;
  AppState.nowPlaying.completedAll = false;
  _renderNowPlayingTopic(safeIndex, direction);
  _startNowPlayingPlayback();
}

function _nowPlayingSkipMemo(direction) {
  if (!AppState.nowPlaying.active) return;

  const playlist = _getNowPlayingMemoPlaylist();
  if (!playlist.length) return;

  const activePosition = _getNowPlayingActivePlaylistIndex(playlist);
  const offset = direction === 'prev' ? -1 : 1;
  const activeMemo = playlist[activePosition] || playlist[0];
  let targetMemo = null;

  for (let step = 1; step < playlist.length; step += 1) {
    const candidateIndex = (activePosition + (offset * step) + playlist.length) % playlist.length;
    const candidate = playlist[candidateIndex];
    if (!activeMemo?.speakerId || candidate.speakerId !== activeMemo.speakerId) {
      targetMemo = candidate;
      break;
    }
  }

  if (!targetMemo) {
    targetMemo = playlist[(activePosition + offset + playlist.length) % playlist.length];
  }
  if (!targetMemo) return;

  AppState.nowPlaying.isPlaying = true;
  AppState.nowPlaying.topicIndex = targetMemo.topicIndex;
  AppState.nowPlaying.lastSpeakerId = targetMemo.speakerId;
  AppState.nowPlaying.completedAll = false;
  _syncNowPlayingPauseIcon(true);
  _setNowPlayingTopicTitle(targetMemo.thread.label || `Topic ${targetMemo.topicIndex + 1}`, direction);
  _buildNowPlayingAvatarsNew(targetMemo.thread, targetMemo.speakerId);
  PlaybackController.playThreadAt(targetMemo.thread, targetMemo.sequenceIndex, null).catch(() => {});
}

function _getNowPlayingMemoPlaylist() {
  const threads = Store.getThreads();
  return threads.flatMap((thread, topicIndex) =>
    _threadPlaybackSequence(thread).map((item, sequenceIndex) => ({
      thread,
      topicIndex,
      item,
      sequenceIndex,
      speakerId: item?.authorId || item?.author?.name || null,
    }))
  );
}

function _getNowPlayingActivePlaylistIndex(playlist) {
  const activeMeta = PlaybackController.activeMeta;
  const activeItemId = PlaybackController.activeItemId;
  const activeIndex = playlist.findIndex(entry => {
    if (activeMeta?.mode === 'thread' && activeMeta?.threadId === entry.thread.id) {
      return Number(activeMeta.sequenceIndex) === entry.sequenceIndex;
    }
    return activeItemId && (entry.item.id === activeItemId || entry.item.voiceMessageId === activeItemId);
  });
  return activeIndex >= 0 ? activeIndex : 0;
}

function _renderNowPlayingTopic(index, direction) {
  const threads = Store.getThreads();
  const thread = threads[index];
  if (!thread) return;

  _setNowPlayingTopicTitle(thread.label || `Topic ${index + 1}`, direction);
  _buildNowPlayingAvatarsNew(thread, _getInitialNowPlayingSpeakerId(thread));
  _syncNowPlayingTopicProgress();
}

function _setNowPlayingTopicTitle(title, direction = null) {
  if (!DOM.npTopicTitle) return;
  if (!direction || DOM.npTopicTitle.textContent === title) {
    DOM.npTopicTitle.textContent = title;
    DOM.npTopicTitle.classList.remove('is-swiping-out', 'is-swiping-in', 'is-visible');
    DOM.npTopicTitle.style.removeProperty('--np-title-out-x');
    DOM.npTopicTitle.style.removeProperty('--np-title-in-x');
    return;
  }

  const outX = direction === 'prev' ? '28px' : '-28px';
  const inX = direction === 'prev' ? '-28px' : '28px';
  DOM.npTopicTitle.style.setProperty('--np-title-out-x', outX);
  DOM.npTopicTitle.style.setProperty('--np-title-in-x', inX);
  DOM.npTopicTitle.classList.remove('is-swiping-in', 'is-visible');
  DOM.npTopicTitle.classList.add('is-swiping-out');

  setTimeout(() => {
    if (!DOM.npTopicTitle) return;
    DOM.npTopicTitle.textContent = title;
    DOM.npTopicTitle.classList.remove('is-swiping-out');
    DOM.npTopicTitle.classList.add('is-swiping-in');
    requestAnimationFrame(() => {
      DOM.npTopicTitle?.classList.add('is-visible');
    });
  }, 160);
}

function _buildNowPlayingAvatars(thread) {
  if (!DOM.npAvatars) return;
  const people = [];
  const durationByKey = new Map();
  const seen = new Set();
  const messages = (thread.messages || []).slice().sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0));
  messages.forEach(msg => {
    const key = msg.authorId || msg.author?.name;
    if (!key) return;
    durationByKey.set(key, (durationByKey.get(key) || 0) + (Number(msg.durationMs) || 0));
    if (seen.has(key)) return;
    seen.add(key);
    people.push({
      id: msg.authorId || msg.author?.name || '',
      name: msg.author?.name || 'Friend',
      color: msg.author?.color || pickUserColor(msg.author?.name || ''),
      avatarUrl: msg.author?.avatarUrl || '',
    });
  });

  const displayPeople = people.slice(0, 3);
  DOM.npAvatars.setAttribute('data-count', displayPeople.length);
  const positions = ['np-avatar--a', 'np-avatar--b', 'np-avatar--c'];
  DOM.npAvatars.innerHTML = displayPeople.map((person, i) => {
    const accent = person.color;
    const initials = buildUserInitials(person.name);
    const photoStyle = person.avatarUrl
      ? `background-image:url('${person.avatarUrl}')`
      : `--avatar-accent:${accent};`;
    const photoClass = person.avatarUrl ? '' : 'avatar-fallback';
    const totalMs = durationByKey.get(person.id) || 0;
    const secs = Math.round(totalMs / 1000);
    const timestamp = totalMs > 0
      ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
      : '';
    return `
      <div class="np-avatar ${positions[i]}" data-author-id="${escapeHtml(person.id)}" style="--chat-avatar-accent:${accent}">
        <div class="np-avatar__label">${escapeHtml(person.name)}</div>
        <div class="np-avatar__ring-wrap">
          <div class="np-avatar__ring np-avatar__ring--track"></div>
          <div class="np-avatar__ring np-avatar__ring--progress"></div>
          <div class="np-avatar__photo ${photoClass}" style="${photoStyle}">
            ${person.avatarUrl ? '' : `<span>${escapeHtml(initials)}</span>`}
          </div>
        </div>
        ${timestamp ? `<div class="np-avatar__duration">${timestamp}</div>` : ''}
      </div>
    `;
  }).join('');
}

function _renderNowPlayingDots(threads, activeIndex) {
  if (!DOM.npDots) return;
  const total = Array.isArray(threads) ? threads.length : 0;
  if (total <= 0) { DOM.npDots.innerHTML = ''; return; }
  DOM.npDots.innerHTML = threads.map((thread, i) => {
    const isActive = i === activeIndex;
    const isComplete = i < activeIndex || AppState.nowPlaying.completedAll;
    const color = AppState.nowPlaying.topicDotColors?.[thread.id] || _getNowPlayingTopicDotColor(thread);
    const progress = isActive || isComplete ? 1 : 0;
    return `<span class="np-dot${isActive ? ' is-active' : ''}${isComplete ? ' is-complete' : ''}" style="--np-dot-progress:${progress};--np-dot-color:${escapeHtml(color)}" aria-hidden="true"></span>`;
  }).join('');
}

function _getNowPlayingTopicDotColor(thread) {
  const fallbackMessage = (thread?.messages || [])[0];
  const fallbackColor = fallbackMessage?.author?.color || pickUserColor(fallbackMessage?.author?.name || thread?.label || 'topic');
  const meta = PlaybackController.activeMeta;
  if (thread && meta?.mode === 'thread' && meta.threadId === thread.id && Array.isArray(meta.sequence)) {
    const item = meta.sequence[Math.max(0, Number(meta.sequenceIndex) || 0)];
    return item?.author?.color || fallbackColor;
  }

  if (AppState.nowPlaying.lastSpeakerId) {
    const speakerMessage = (thread?.messages || []).find(msg =>
      (msg.authorId || msg.author?.name) === AppState.nowPlaying.lastSpeakerId
    );
    if (speakerMessage?.author?.color) return speakerMessage.author.color;
  }

  return fallbackColor;
}

function _syncNowPlayingTopicProgress(options = {}) {
  const threads = Store.getThreads();
  if (!threads.length) {
    _renderNowPlayingDots([], 0);
    return;
  }

  if (options.completeAll) AppState.nowPlaying.completedAll = true;
  const activeIndex = Math.max(0, Math.min(AppState.nowPlaying.topicIndex, threads.length - 1));
  const activeThread = threads[activeIndex];
  const activeColor = _getNowPlayingTopicDotColor(activeThread);
  if (activeThread?.id) {
    AppState.nowPlaying.topicDotColors = {
      ...(AppState.nowPlaying.topicDotColors || {}),
      [activeThread.id]: activeColor,
    };
  }
  _renderNowPlayingDots(threads, activeIndex);
}

function _syncNowPlayingSpeaker() {
  if (!AppState.nowPlaying.active) return;
  
  const activeItemId = PlaybackController.activeItemId;
  const threads = Store.getThreads();
  const thread = threads[AppState.nowPlaying.topicIndex];
  if (!thread) return;

  // Find who is currently speaking
  let speakingId = null;
  if (activeItemId) {
    for (const msg of (thread.messages || [])) {
      if (msg.id === activeItemId || msg.voiceMessageId === activeItemId) {
        speakingId = msg.authorId || msg.author?.name || null;
        break;
      }
    }
  }
  const threadMeta = PlaybackController.activeMeta;
  if (!speakingId && threadMeta?.mode === 'thread' && String(threadMeta.threadId || '') === String(thread.id || '')) {
    const cur = threadMeta.sequence?.[Math.max(0, Number(threadMeta.sequenceIndex) || 0)];
    speakingId = cur?.authorId || cur?.author?.name || null;
  }

  // Rebuild avatars if speaker changed
  if (speakingId && (!AppState.nowPlaying.lastSpeakerId || AppState.nowPlaying.lastSpeakerId !== speakingId)) {
    AppState.nowPlaying.lastSpeakerId = speakingId;
    if (DOM.npAvatars) {
      _buildNowPlayingAvatarsNew(thread, speakingId);
    }
  }

  _syncNowPlayingAvatarProgress();
  _syncNowPlayingTopicProgress();
}

function _buildNowPlayingTimeline(thread) {
  if (!DOM.npTimeline) return;
  const messages = (thread.messages || []).slice().sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0));
  if (messages.length === 0) {
    DOM.npTimeline.innerHTML = '';
    return;
  }

  // Calculate total duration and segment positions
  const segments = [];
  let totalDuration = 0;
  messages.forEach(msg => {
    const durationMs = Number(msg.durationMs) || 0;
    const startMs = totalDuration;
    const endMs = totalDuration + durationMs;
    segments.push({
      msg,
      startMs,
      endMs,
      durationMs,
      color: msg.author?.color || pickUserColor(msg.author?.name || ''),
    });
    totalDuration = endMs;
  });

  const totalLabel = formatDurationClock(totalDuration || 0);
  const segmentHtml = segments.map(seg => {
    const flexGrow = totalDuration > 0 ? seg.durationMs / totalDuration : 1;
    return `<span class="np-timeline__segment" style="flex:${flexGrow};" data-message-id="${escapeHtml(seg.msg.id || '')}" data-author-id="${escapeHtml(seg.msg.authorId || seg.msg.author?.name || '')}"></span>`;
  }).join('');
  const playedSegmentHtml = segments.map(seg => {
    const flexGrow = totalDuration > 0 ? seg.durationMs / totalDuration : 1;
    return `<span class="np-timeline__segment np-timeline__segment--played" style="flex:${flexGrow};" data-message-id="${escapeHtml(seg.msg.id || '')}" data-author-id="${escapeHtml(seg.msg.authorId || seg.msg.author?.name || '')}"></span>`;
  }).join('');

  DOM.npTimeline.innerHTML = `
    <span class="np-timeline__tick" data-np-elapsed>0:00</span>
    <span class="np-timeline__track">
      ${segmentHtml}
      <span class="np-timeline__played" aria-hidden="true">${playedSegmentHtml}</span>
    </span>
    <span class="np-timeline__tick" data-np-remaining>-${totalLabel}</span>
  `;

  // Set total duration on the timeline for progress tracking
  DOM.npTimeline.setAttribute('data-total-duration', totalDuration);
  DOM.npTimeline.style.setProperty('--timeline-progress', '0%');
}

function _buildNowPlayingAvatarsNew(thread, currentSpeakerId) {
  if (!DOM.npAvatars) return;

  const previousRects = _getNowPlayingAvatarRects();
  const peopleByKey = new Map();
  const seen = new Set();
  const durationByKey = new Map();
  const messages = (thread.messages || []).slice().sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0));
  const topicSpeakerKeys = new Set();

  const addPerson = person => {
    const key = person?.id || person?.phoneE164 || person?.name;
    if (!key || peopleByKey.has(key)) return;
    peopleByKey.set(key, {
      id: key,
      name: person.name || 'Friend',
      color: person.color || pickUserColor(person.name || person.phoneE164 || key),
      avatarUrl: person.avatarUrl || '',
      hasMemoInTopic: false,
    });
  };

  messages.forEach(msg => {
    const key = msg.authorId || msg.author?.name;
    if (!key) return;
    topicSpeakerKeys.add(key);
    durationByKey.set(key, (durationByKey.get(key) || 0) + (Number(msg.durationMs) || 0));
    addPerson({
      id: msg.authorId || msg.author?.name || '',
      name: msg.author?.name || 'Friend',
      color: msg.author?.color || pickUserColor(msg.author?.name || ''),
      avatarUrl: msg.author?.avatarUrl || '',
    });
  });

  (AppState.activeChat?.members || []).forEach(member => {
    const resolvedMember = resolveAvatarMember(member);
    addPerson({
      id: resolvedMember?.id || member?.id || member?.phoneE164 || member?.name || '',
      name: resolvedMember?.name || member?.name || member?.phoneE164 || 'Friend',
      color: resolvedMember?.color || member?.color || pickUserColor(member?.name || member?.phoneE164 || member?.id || ''),
      avatarUrl: resolvedMember?.avatarUrl || member?.avatarUrl || '',
      phoneE164: resolvedMember?.phoneE164 || member?.phoneE164 || '',
    });
  });

  const people = Array.from(peopleByKey.values()).map(person => ({
    ...person,
    hasMemoInTopic: topicSpeakerKeys.has(person.id),
  }));

  // Separate current speaker from everyone else. If playback has not emitted yet, use the first memo speaker.
  const currentSpeaker = people.find(p => p.id === currentSpeakerId) || people.find(p => p.hasMemoInTopic) || people[0];
  const floatingPeople = people.filter(p => p.id !== currentSpeaker?.id);

  let html = '';
  
  if (currentSpeaker) {
    const totalMs = durationByKey.get(currentSpeaker.id) || 0;
    const secs = Math.round(totalMs / 1000);
    const timestamp = totalMs > 0
      ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
      : '';
    html += _buildNowPlayingAvatar(currentSpeaker, 'np-avatar--current is-speaking', {
      durationLabel: timestamp,
    });
  }

  if (floatingPeople.length > 0) {
    html += '<div class="np-avatar--others-container">';
    floatingPeople.forEach((person, index) => {
      html += _buildNowPlayingAvatar(person, `np-avatar--other${person.hasMemoInTopic ? ' has-topic-memo' : ''}`, {
        styleVars: _getNowPlayingFloatingStyle(index, floatingPeople.length),
      });
    });
    html += '</div>';
  }

  DOM.npAvatars.innerHTML = html;
  DOM.npAvatars.setAttribute('data-count', people.length);
  _animateNowPlayingAvatarSwap(previousRects);
  _syncNowPlayingAvatarProgress();
}

function _getNowPlayingAvatarRects() {
  const rects = new Map();
  DOM.npAvatars?.querySelectorAll('.np-avatar[data-author-id]').forEach(avatar => {
    const key = avatar.getAttribute('data-author-id');
    if (!key) return;
    const rect = avatar.getBoundingClientRect();
    if (rect.width && rect.height) rects.set(key, rect);
  });
  return rects;
}

function _animateNowPlayingAvatarSwap(previousRects) {
  if (!DOM.npAvatars || !previousRects?.size) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

  const avatars = Array.from(DOM.npAvatars.querySelectorAll('.np-avatar[data-author-id]'));
  if (!avatars.length) return;

  DOM.npAvatars.classList.add('is-swapping');
  let animated = false;

  avatars.forEach(avatar => {
    const key = avatar.getAttribute('data-author-id');
    const oldRect = previousRects.get(key);
    const newRect = avatar.getBoundingClientRect();
    if (!oldRect || !newRect.width || !newRect.height) {
      avatar.style.opacity = '0';
      return;
    }

    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top - newRect.top;
    const scale = Math.max(0.45, Math.min(1.8, oldRect.width / newRect.width));
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(scale - 1) < 0.02) return;

    animated = true;
    avatar.style.transition = 'none';
    avatar.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${scale})`;
    avatar.style.opacity = avatar.classList.contains('np-avatar--current') ? '0.72' : '0.5';
  });

  requestAnimationFrame(() => {
    avatars.forEach(avatar => {
      avatar.style.transition = 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease, filter 420ms ease';
      avatar.style.transform = 'translate(-50%, -50%) translate(0px, 0px) scale(1)';
      avatar.style.opacity = '';
    });

    setTimeout(() => {
      avatars.forEach(avatar => {
        avatar.style.transition = '';
        avatar.style.transform = '';
        avatar.style.opacity = '';
      });
      DOM.npAvatars?.classList.remove('is-swapping');
    }, animated ? 560 : 260);
  });
}

function _buildNowPlayingAvatar(person, className, options = {}) {
  const initials = buildUserInitials(person.name);
  const accent = person.color || pickUserColor(person.name || person.phoneE164 || person.id || '');
  const photoStyle = person.avatarUrl
    ? `background-image:url('${escapeHtml(person.avatarUrl)}');background-size:cover;background-position:center;background-repeat:no-repeat`
    : `--avatar-accent:${accent};`;
  const photoClass = person.avatarUrl ? '' : 'avatar-fallback';

  return `
    <div class="np-avatar ${className}" data-author-id="${escapeHtml(person.id)}" style="--chat-avatar-accent:${accent};${options.styleVars || ''}">
      <div class="np-avatar__label">${escapeHtml(person.name)}</div>
      <div class="np-avatar__ring-wrap">
        <div class="np-avatar__ring np-avatar__ring--track"></div>
        <div class="np-avatar__ring np-avatar__ring--progress"></div>
        <div class="np-avatar__photo ${photoClass}" style="${photoStyle}">
          ${person.avatarUrl ? '' : `<span>${escapeHtml(initials)}</span>`}
        </div>
      </div>
      ${options.durationLabel ? `<div class="np-avatar__duration">${escapeHtml(options.durationLabel)}</div>` : ''}
    </div>
  `;
}

function _getNowPlayingFloatingStyle(index, total) {
  const presets = {
    1: [[-86, 28]],
    2: [[-94, 20], [92, 56]],
    3: [[-112, 12], [104, 26], [-18, 90]],
    4: [[-124, 10], [116, 18], [-72, 92], [72, 96]],
    5: [[-128, 6], [122, 14], [-86, 82], [8, 102], [96, 88]],
  };
  const point = presets[total]?.[index];
  if (point) {
    return `--np-other-x:${point[0]}px;--np-other-y:${point[1]}px;--np-float-delay:${index * -0.7}s;`;
  }

  const columns = Math.min(4, Math.max(1, total));
  const col = index % columns;
  const row = Math.floor(index / columns);
  const center = (columns - 1) / 2;
  const offsetX = (col - center) * 76;
  const offsetY = 22 + row * 72 + (col % 2) * 16;
  return `--np-other-x:${Math.max(-136, Math.min(136, offsetX))}px;--np-other-y:${offsetY}px;--np-float-delay:${index * -0.7}s;`;
}

function _getInitialNowPlayingSpeakerId(thread) {
  const firstMsg = (thread?.messages || []).slice().sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0))[0];
  return firstMsg?.authorId || firstMsg?.author?.name || null;
}

function _npRingGradientSafeColor(raw) {
  const s = raw != null ? String(raw).trim() : '';
  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return s;
  if (/^rgba?\(/i.test(s)) return s;
  return '#DFFFB8';
}

function _playbackRingItemMatch(a, b) {
  if (!a || !b) return false;
  const pairs = [
    [a.id, b.id],
    [a.voiceMessageId, b.voiceMessageId],
    [a.id, b.voiceMessageId],
    [a.voiceMessageId, b.id],
  ];
  for (const [x, y] of pairs) {
    if (x != null && y != null && String(x) === String(y)) return true;
  }
  return false;
}

/** Prefer the live playlist on the player so the ring matches stitched playback order/length. */
function _resolveNowPlayingRingSequence(thread) {
  const meta = PlaybackController.activeMeta;
  if (
    meta?.mode === 'thread' &&
    thread &&
    String(meta.threadId || '') === String(thread.id || '') &&
    Array.isArray(meta.sequence) &&
    meta.sequence.length
  ) {
    return meta.sequence;
  }
  return _threadPlaybackSequence(thread) || [];
}

/** Progress only when the ring uses the exact sequence array the audio element is advancing. */
function _nowPlayingRingPlaybackState(thread, sequence) {
  const meta = PlaybackController.activeMeta;
  if (meta?.mode !== 'thread' || !Array.isArray(meta.sequence)) {
    return { sync: false, idx: -1, segmentElapsedMs: 0 };
  }
  if (String(meta.threadId || '') !== String(thread?.id || '')) {
    return { sync: false, idx: -1, segmentElapsedMs: 0 };
  }
  if (sequence !== meta.sequence) {
    return { sync: false, idx: -1, segmentElapsedMs: 0 };
  }
  const idx = Math.max(0, Number(meta.sequenceIndex) || 0);
  const audio = PlaybackController.audio;
  const segmentElapsedMs = audio
    ? Math.max(0, (audio.currentTime - Number(meta.startAt || 0)) * 1000)
    : 0;
  return { sync: true, idx, segmentElapsedMs };
}

/**
 * Build segmented track/progress layers for the Now Playing ring.
 * Track: grey segmented arcs with gaps (duration-weighted).
 * Progress: colored arc overlays the current playback position across segments.
 */
function _buildNowPlayingSegmentedRingLayers(thread) {
  const sequence = _resolveNowPlayingRingSequence(thread);
  const n = sequence.length;
  if (!n) return null;

  const durations = sequence.map(item => Math.max(1, Number(item.durationMs) || 0));
  const totalMs = durations.reduce((a, b) => a + b, 0);
  if (totalMs <= 0) return null;

  const gapDeg = n <= 1 ? 0 : 4;
  const gapColor = 'transparent';
  const trackColor = '#D1D1D6';
  const usable = 360 - n * gapDeg;
  const { sync, idx, segmentElapsedMs } = _nowPlayingRingPlaybackState(thread, sequence);

  const trackStops = [];
  const progressStops = [];
  let cursor = 0;

  for (let i = 0; i < n; i++) {
    if (gapDeg > 0) {
      trackStops.push(`${gapColor} ${cursor}deg`, `${gapColor} ${cursor + gapDeg}deg`);
      progressStops.push(`${gapColor} ${cursor}deg`, `${gapColor} ${cursor + gapDeg}deg`);
      cursor += gapDeg;
    }
    const arc = (durations[i] / totalMs) * usable;
    const item = sequence[i];
    const rawColor = _npRingGradientSafeColor(
      item?.author?.color || pickUserColor(item?.author?.name || item?.authorId || '')
    );
    const playedColor = `color-mix(in srgb, ${rawColor} 72%, white 28%)`;

    let p = 0;
    if (sync) {
      const durMs = Math.max(0.001, durations[i]);
      if (i < idx) p = 1;
      else if (i === idx) p = Math.min(1, segmentElapsedMs / durMs);
    }

    // Track is always visible (segmented grey).
    trackStops.push(`${trackColor} ${cursor}deg`, `${cursor + arc}deg`);

    // Progress overlays only the played portion; unplayed is transparent.
    const playedArc = arc * p;
    if (playedArc > 0.0005) {
      progressStops.push(`${playedColor} ${cursor}deg`, `${cursor + playedArc}deg`);
      if (playedArc < arc) {
        progressStops.push(`transparent ${cursor + playedArc}deg`, `transparent ${cursor + arc}deg`);
      }
    } else {
      progressStops.push(`transparent ${cursor}deg`, `transparent ${cursor + arc}deg`);
    }

    cursor += arc;
  }

  if (cursor < 359.99) {
    trackStops.push(`${gapColor} ${cursor}deg`, `${gapColor} 360deg`);
    progressStops.push(`${gapColor} ${cursor}deg`, `${gapColor} 360deg`);
  }

  return {
    track: `conic-gradient(from 0deg, ${trackStops.join(', ')})`,
    progress: `conic-gradient(from 0deg, ${progressStops.join(', ')})`,
  };
}

function _syncNowPlayingSegmentedRing() {
  const trackEl = DOM.npAvatars?.querySelector('.np-avatar--current .np-avatar__ring--track');
  const progressEl = DOM.npAvatars?.querySelector('.np-avatar--current .np-avatar__ring--progress');
  if (!trackEl || !progressEl) return;
  const threads = Store.getThreads();
  const thread = threads[AppState.nowPlaying.topicIndex];
  if (!thread) {
    trackEl.style.removeProperty('background');
    progressEl.style.removeProperty('background');
    return;
  }
  const layers = _buildNowPlayingSegmentedRingLayers(thread);
  if (layers?.track) trackEl.style.background = layers.track;
  else trackEl.style.removeProperty('background');
  if (layers?.progress) progressEl.style.background = layers.progress;
  else progressEl.style.removeProperty('background');
}

function _syncNowPlayingAvatarProgress() {
  _syncNowPlayingSegmentedRing();
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
  PresenceManager.setRecordingState('idle').catch(e => console.warn('[yAp] Presence update failed:', e));
  window.__yapVoiceVisualizerBridge?.reset?.();
  window.__yapVoiceVisualizerBridge?.setRecording?.(false);
  DOM.btnMic.classList.remove('recording');
  syncLocalPresence();
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
  if (!readiness.checks.twilioMessaging?.ok) warnings.push('SMS notifications');

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
  await refreshChatsAndRender();
  navigate('chats', 'fade');
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
  scheduleChatsListRender();
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
// Debug helpers for animation iteration (do not ship enabled).
const YAP_DEBUG_HOLD_ANALYSIS_AFTER_SEND = false;
const YAP_DEBUG_SEND_TRANSITION_MS = 2400;

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
    PresenceManager.setRecordingState('recording').catch(e => console.warn('[yAp] Presence update failed:', e));
    window.__yapVoiceVisualizerBridge?.setRecording?.(true);
    DOM.btnMic.classList.add('recording');
    syncLocalPresence();
  } catch (err) {
    const message = err?.message || 'We could not start recording on this device.';
    console.warn('[yAp] startRecording failed:', err);
    const isPermissionError = err?.message?.includes('permission');
    const title = isPermissionError ? 'Enable Microphone' : 'Microphone Unavailable';
    showIOSAlert(message, { title });
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
  PresenceManager.setRecordingState('recording').catch(e => console.warn('[yAp] Presence update failed:', e));
  window.__yapVoiceVisualizerBridge?.setRecording?.(false);
  _showRecRow('stopped');
  syncLocalPresence();

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
  PresenceManager.setRecordingState('sending').catch(e => console.warn('[yAp] Presence update failed:', e));
  _showRecRow('sending');
  syncLocalPresence();

  // Capture before manager is discarded
  const blob       = mgr.blob;
  const durationMs = mgr.durationMs || 0;
  // Independent URL that survives mgr.discard()
  const audioUrl   = URL.createObjectURL(blob);
  const seedMessageId = `local-${Date.now()}`;
  const replyTargetThreadId = AppState.replyTargetThreadId;
  const chatId = AppState.activeChat?.id || ACTIVE_CHAT_ID;
  const authorId = getCurrentUserId();

  // Track send time for latency measurement
  const sendTime = Date.now();
  AppState.recording.sentAt = sendTime;

  // Show optimistic message immediately (before analysis)
  if (replyTargetThreadId) {
    const thread = Store.getThread(replyTargetThreadId);
    if (thread) {
      const optimisticMessage = {
        id: `optimistic-reply-${Date.now()}`,
        voiceMessageId: `optimistic-${Date.now()}`,
        threadId: replyTargetThreadId,
        authorId,
        author: getCurrentUser(),
        audioUrl,
        audioBlob: blob,
        durationMs,
        label: 'Voice reply',
        transcript: 'Sending reply...',
        excerpt: 'Sending reply...',
        startMs: 0,
        endMs: durationMs,
        sentAt: Date.now(),
        heardByCurrentUser: true,
        optimistic: true,
        status: 'sending',
      };
      Store.addMessage(replyTargetThreadId, optimisticMessage);
      renderTopics();
      // Re-render current thread to show new message immediately
      const currentThread = Store.getThread(replyTargetThreadId);
      if (currentThread) {
        DOM.chatEmpty?.classList.toggle('is-single-member', false);
        DOM.chatTopics?.classList.add('showing-thread-details');
      }
      scrollChatToLatest();
    }
  } else {
    // For memos: show optimistic message immediately before analysis modal opens
    const threadId = `thread-${seedMessageId}-0`;
    const currentAuthor = getUserById(authorId) || getCurrentUser();
    console.log('[yAp] Creating optimistic memo:', { threadId, chatId, seedMessageId });
    if (!Store.getThread(threadId)) {
      Store.addThread({
        id: threadId,
        chatId,
        label: 'Voice memo',
        excerpt: 'Analyzing…',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        messages: [],
      });
      console.log('[yAp] Thread added. Current threads:', Store.getThreads().length);
    }
    Store.addMessage(threadId, {
      id: `${seedMessageId}-seg-0`,
      voiceMessageId: seedMessageId,
      threadId,
      authorId,
      author: currentAuthor,
      audioUrl,
      audioBlob: blob,
      durationMs,
      label: 'Voice memo',
      transcript: 'Analyzing…',
      excerpt: 'Analyzing…',
      startMs: 0,
      endMs: durationMs,
      sentAt: Date.now(),
      parentMemoId: seedMessageId,
      heardByCurrentUser: true,
      optimistic: true,
      status: 'sending',
    });
    console.log('[yAp] Message added. Rendering topics...');
    renderTopics();
    scrollChatToLatest();
  }

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
          chatId,
          authorId,
          replyTargetThreadId,
          audioUrl
        );
        clearReplyTarget();
        renderTopics();
        addReplyToTopic(replyTargetThreadId, replyMessage);
        refreshChatsAndRender();
        return;
      }

      // Memo send: show analysis overlay while pipeline runs.
      AnalysisModal.open(blob);

      if (YAP_DEBUG_HOLD_ANALYSIS_AFTER_SEND) {
        // For visual iteration: keep the analysis overlay up and do not send.
        return;
      }

      await Pipeline.run(blob, durationMs, chatId, authorId, audioUrl, seedMessageId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err || 'Something went wrong');
      console.error('[yAp] Pipeline error:', {
        message: errorMessage,
        error: err,
      });
      if (replyTargetThreadId) {
        showIOSAlert(errorMessage, { title: 'Message Not Sent' });
      } else {
        AnalysisModal.open();
        AnalysisModal.showError(errorMessage);
      }
    } finally {
      if (replyTargetThreadId) {
        clearReplyTarget();
      }
    }
  }, YAP_DEBUG_SEND_TRANSITION_MS);
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
  button.classList.toggle('is-busy', !!isBusy);
  button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
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
  AppState.onboarding.createGroupSubmitting = false;
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

function scoreCreateGroupContactMatch(contact, query) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return Number.POSITIVE_INFINITY;

  const profileName = String(contact.matchedUser?.name || '').trim().toLowerCase();
  const importedName = String(contact.display_name || '').trim().toLowerCase();
  const phone = String(contact.phone_e164 || '').trim().toLowerCase();
  const nameCandidates = [profileName, importedName].filter(Boolean);

  // Priority 1: Name matches (scores 0-3)
  for (const name of nameCandidates) {
    if (name === normalizedQuery) return 0;
  }
  for (const name of nameCandidates) {
    if (name.startsWith(normalizedQuery)) return 1;
  }
  for (const name of nameCandidates) {
    if (name.split(/\s+/).some(part => part.startsWith(normalizedQuery))) return 2;
  }
  for (const name of nameCandidates) {
    if (name.includes(normalizedQuery)) return 3;
  }

  // Priority 2: Phone number matches (only exact start match, scores 4)
  // This allows searching by phone but names always take priority
  if (phone.startsWith(normalizedQuery)) return 4;

  return Number.POSITIVE_INFINITY;
}

function renderCreateGroupContactRow(contact, { compact = false } = {}) {
  const phone = contact.phone_e164 || '';
  const matchedUser = contact.matched_user_id
    ? (getUserById(contact.matched_user_id) || contact.matchedUser || null)
    : (contact.matchedUser || null);
  const isSelected = AppState.onboarding.pendingMembers.some(member => member.phone === phone);
  const displayName = matchedUser?.name || contact.display_name || phone || 'Unknown contact';
  const isSelf = matchedUser?.id === getCurrentUserId();
  const statusBadge = isSelf
    ? 'You'
    : matchedUser
      ? 'On yAp'
      : 'Invite';
  const subtitle = isSelf
    ? 'Message yourself'
    : matchedUser
      ? phone
      : (compact ? phone : 'Send an SMS invite');
  const compactSubline = compact ? '' : `<div class="create-chat-picker__contact-sub">${escapeHtml(subtitle)}</div>`;
  const avatarContent = matchedUser?.avatarUrl
    ? ''
    : `<img class="create-chat-picker__contact-placeholder" src="assets/contact-placeholder.svg" alt="" aria-hidden="true">`;
  const isAddable = !!phone && !isSelected;

  return `
    <button class="create-chat-picker__contact-row${isSelected ? ' is-added' : ''}" type="button" data-add-create-group-contact="${escapeHtml(phone)}" ${isAddable ? '' : 'disabled'}>
      <div class="create-chat-picker__contact-avatar ${matchedUser?.avatarUrl ? '' : 'avatar-fallback'}" style="${matchedUser?.avatarUrl ? `background-image:url('${matchedUser.avatarUrl}')` : `--avatar-accent:${pickUserColor(displayName)}`}">
        ${avatarContent}
      </div>
      <div class="create-chat-picker__contact-meta">
        <div class="create-chat-picker__contact-name-row">
          <div class="create-chat-picker__contact-name">${escapeHtml(displayName)}</div>
        </div>
        ${compactSubline}
      </div>
      <span class="create-chat-picker__contact-badge create-chat-picker__contact-badge--${isSelf ? 'self' : matchedUser ? 'registered' : 'invite'}">${escapeHtml(statusBadge)}</span>
    </button>
  `;
}

async function renderCreateGroupPicker() {
  if (!DOM.createChatContacts) return;

  const query = String(AppState.onboarding.createGroupSearchQuery || '').trim();
  const queryLower = query.toLowerCase();
  const allContacts = buildCreateGroupContactIndex(await getCreateGroupContacts());
  const filteredContacts = !query
    ? []
    : allContacts
      .map(contact => ({
        contact,
        score: scoreCreateGroupContactMatch(contact, queryLower),
        displayName: (contact.matchedUser?.name || contact.display_name || contact.phone_e164 || '').toLowerCase(),
      }))
      .filter(entry => Number.isFinite(entry.score))
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.displayName.localeCompare(b.displayName);
      })
      .map(entry => entry.contact);

  const exactPhone = normalizePhoneNumber(query);
  const manualMatchedUser = exactPhone ? await getRegisteredUserByPhone(exactPhone) : null;
  const canAddManual = !!exactPhone
    && !allContacts.some(contact => contact.phone_e164 === exactPhone)
    && !AppState.onboarding.pendingMembers.some(member => member.phone === exactPhone);

  if (!query) {
    DOM.createChatContacts.innerHTML = '';
    DOM.createChatContacts.hidden = true;
    return;
  }

  const rows = filteredContacts.map(contact => renderCreateGroupContactRow(contact)).join('');
  const manualRow = canAddManual ? `
    <button class="create-chat-picker__contact-row" type="button" data-add-manual-create-group="${escapeHtml(exactPhone)}">
      <div class="create-chat-picker__contact-avatar avatar-fallback" style="--avatar-accent:${pickUserColor(exactPhone)}">
        <img class="create-chat-picker__contact-placeholder" src="assets/contact-placeholder.svg" alt="" aria-hidden="true">
      </div>
      <div class="create-chat-picker__contact-meta">
        <div class="create-chat-picker__contact-name">${escapeHtml(manualMatchedUser?.name || exactPhone)}</div>
        <div class="create-chat-picker__contact-sub">${escapeHtml(manualMatchedUser ? exactPhone : 'Send an SMS invite')}</div>
      </div>
      <span class="create-chat-picker__contact-badge create-chat-picker__contact-badge--${manualMatchedUser ? 'registered' : 'invite'}">${manualMatchedUser ? 'On yAp' : 'Invite'}</span>
    </button>
  ` : '';

  DOM.createChatContacts.hidden = false;
  DOM.createChatContacts.innerHTML = rows || manualRow
    ? `<div class="create-chat-picker__contact-card">${manualRow}${rows}</div>`
    : `<div class="create-chat-picker__empty">${exactPhone ? 'Tap Add to invite that number by SMS.' : 'No matches yet.'}</div>`;
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
    resolvedName = matchedUser?.name || resolvedName || resolvedPhone;
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
      ? (inGroup ? 'In Conversation' : invited ? 'Pending' : matchedUser ? 'On yAp' : 'Invite')
      : (selected ? 'Added' : matchedUser ? 'On yAp' : 'Invite');
    const isDisabled = inOnboarding
      ? true
      : AppState.onboarding.contactsTarget === 'group-settings'
      ? inGroup || invited
      : selected;
    const buttonLabel = inOnboarding
      ? 'Saved'
      : AppState.onboarding.contactsTarget === 'group-settings'
      ? (inGroup ? 'Added' : invited ? 'Pending' : matchedUser ? 'Add' : 'Invite')
      : (selected ? 'Added' : matchedUser ? 'Add' : 'Invite');

    return `
      <div class="contacts-hub-row" data-contact-phone="${escapeHtml(phone)}">
        <div class="contacts-hub-row__avatar ${matchedUser?.avatarUrl ? '' : 'avatar-fallback'}" style="${matchedUser?.avatarUrl ? `background-image:url('${matchedUser.avatarUrl}')` : `--avatar-accent:${pickUserColor(contact.display_name || matchedUser?.name || phone)}`}">${matchedUser?.avatarUrl ? '' : `<span>${escapeHtml(initials)}</span>`}</div>
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

async function refreshChats({ force = false } = {}) {
  if (!force && AppState.chatsRefreshPromise) {
    return AppState.chatsRefreshPromise;
  }

  const refreshPromise = (async () => {
    if (!AppState.supabaseOk) {
      AppState.chats = sortChatsForDisplay(AppState.pendingChats || []);
      return AppState.chats;
    }

    const lastRefreshAt = Number(AppState.sync.lastChatsRefreshAt || 0);
    const cachedChats = readCachedChatsForUser(getCurrentUserId());
    // Show cached chats immediately if available
    if (cachedChats.length && !AppState.chats.length) {
      AppState.chats = sortChatsForDisplay(applyPinnedFromLocal(cachedChats, []));
      scheduleChatsListRender();
    }
    if (!force && cachedChats.length && (Date.now() - lastRefreshAt) < YAP_SUPABASE_CHAT_REFRESH_MIN_MS) {
      // Keep UI snappy, but still try to pull the latest chats in the background.
      AppState.chats = sortChatsForDisplay(applyPinnedFromLocal(cachedChats, AppState.chats));
      backgroundRefreshChats();
      return AppState.chats;
    }

    const remoteChats = await getChatsForUser(getCurrentUserId());
    AppState.sync.lastChatsRefreshAt = Date.now();
    const resolvedRemoteChats = Array.isArray(remoteChats) ? remoteChats : cachedChats;
    const pendingChatFreshnessMs = 2 * 60 * 1000;
    const now = Date.now();

    AppState.pendingChats = (AppState.pendingChats || []).filter(chat => {
      if (chat?.persistLocally) return !!chat?.id;
      const createdAt = Number(chat?.localCreatedAt || chat?.lastMessageAt || 0);
      return !!chat?.id && (now - createdAt) < pendingChatFreshnessMs;
    });

    const remoteIds = new Set(resolvedRemoteChats.map(chat => chat.id));
    const mergedChats = [
      ...resolvedRemoteChats,
      ...AppState.pendingChats.filter(chat => !remoteIds.has(chat.id)),
    ];

    const seenChatIds = new Set();
    const dedupedChats = mergedChats.filter(chat => {
      if (!chat?.id || seenChatIds.has(chat.id)) return false;
      seenChatIds.add(chat.id);
      return true;
    });
    const withPins = applyPinnedFromLocal(dedupedChats, cachedChats, AppState.chats);
    AppState.chats = sortChatsForDisplay(withPins);
    updateChatsUnreadCounts();
    writeCachedChatsForUser(AppState.chats, getCurrentUserId());
    AppState.pendingChats = AppState.pendingChats.filter(chat => !remoteIds.has(chat.id));
    if (AppState.activeChat?.id) {
      AppState.activeChat = AppState.chats.find(chat => chat.id === AppState.activeChat.id) || AppState.activeChat;
    }
    return AppState.chats;
  })();
  AppState.chatsRefreshPromise = refreshPromise;

  try {
    return await refreshPromise;
  } finally {
    if (AppState.chatsRefreshPromise === refreshPromise) {
      AppState.chatsRefreshPromise = null;
    }
  }
}

function prefillProfileForm(user) {
  if (!user) return;
  if (DOM.inputProfileName && !DOM.inputProfileName.value && !isPlaceholderProfileName(user.name)) {
    DOM.inputProfileName.value = user.name || '';
  }
  if (DOM.inputProfileAvatar && !DOM.inputProfileAvatar.value && hasCustomProfileAvatar(user.avatarUrl)) {
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
  DOM.inputManageProfileName.readOnly = true;
  if (DOM.btnProfileEdit) {
    delete DOM.btnProfileEdit.dataset.editing;
    DOM.btnProfileEdit.classList.remove('is-icon-only');
    DOM.btnProfileEdit.textContent = 'Edit';
    DOM.btnProfileEdit.setAttribute('aria-label', 'Edit profile');
  }
  DOM.inputManageProfileAvatar.value = currentUser.avatarUrl || '';
  syncProfileManageAvatarLabel(currentUser);
  syncManageProfilePhotoButton();
  setFeedback(DOM.profileManageFeedback, '');
}

async function persistManagedProfile() {
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
  await refreshChatsAndRender();
  if (AppState.activeChat?.members?.some(member => member.id === savedUser.id)) {
    AppState.activeChat = AppState.chats.find(chat => chat.id === AppState.activeChat.id) || AppState.activeChat;
  }
  return savedUser;
}

async function saveManagedProfileNameFromEditor() {
  if (!DOM.inputManageProfileName) return;
  if (DOM.inputManageProfileName.dataset.saving === 'true') return;

  if (!DOM.inputManageProfileName.value.trim()) {
    DOM.inputManageProfileName.value = 'You';
  }
  if (DOM.inputManageProfileName.value.trim() === (getCurrentUser().name || '')) return;

  DOM.inputManageProfileName.dataset.saving = 'true';
  setFeedback(DOM.profileManageFeedback, '');
  try {
    await persistManagedProfile();
  } catch (error) {
    setFeedback(DOM.profileManageFeedback, error.message || 'We could not save your profile yet.', 'error');
  } finally {
    delete DOM.inputManageProfileName.dataset.saving;
  }
}

async function saveGroupSettingsNameFromEditor() {
  if (!AppState.activeChat || !AppState.groupSettingsEditing) return;
  if (!canManageActiveChat()) return;
  if (!validateFormWithIOSAlert(DOM.formGroupSettings)) return;
  if (DOM.btnSaveGroupSettings?.dataset.saving === 'true') return;

  setButtonBusy(DOM.btnSaveGroupSettings, true, 'Saving...');
  if (DOM.btnSaveGroupSettings) {
    DOM.btnSaveGroupSettings.dataset.saving = 'true';
  }
  setFeedback(DOM.groupSettingsFeedback, '');
  try {
    const updated = AppState.supabaseOk
      ? await renameChat(AppState.activeChat.id, DOM.inputGroupSettingsName.value)
      : { id: AppState.activeChat.id, name: DOM.inputGroupSettingsName.value };
    const updatedChat = {
      ...AppState.activeChat,
      ...updated,
      name: updated.name,
      lastMessageAt: Number(AppState.activeChat.lastMessageAt || Date.now()),
      localCreatedAt: Number(AppState.activeChat.localCreatedAt || AppState.activeChat.lastMessageAt || Date.now()),
      persistLocally: true,
    };
    AppState.activeChat = updatedChat;
    pinChatInLocalLists(updatedChat);
    await refreshChatsAndRender();
    AppState.activeChat = AppState.chats.find(chat => chat.id === updated.id) || updatedChat;
    DOM.chatTitle.textContent = getChatDisplayName(AppState.activeChat);
    AppState.groupSettingsEditing = false;
    renderGroupSettings(AppState.supabaseOk ? await getInvitationsForChat(AppState.activeChat.id) : []);
    setFeedback(DOM.groupSettingsFeedback, 'Group updated.', 'success');
  } catch (error) {
    setFeedback(DOM.groupSettingsFeedback, error.message || 'We could not update this group.', 'error');
  } finally {
    if (DOM.btnSaveGroupSettings) {
      delete DOM.btnSaveGroupSettings.dataset.saving;
    }
    setButtonBusy(DOM.btnSaveGroupSettings, false);
  }
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
  const currentUserId = getCurrentUserId();
  const memberTiles = (chat?.members || [])
    .filter(member => member.id !== currentUserId && member?.avatarUrl)
    .map((member, index) => ({
      id: `${member.id}-${index}`,
      imageUrl: member.avatarUrl,
      initials: buildUserInitials(member.name || 'Y'),
      accent: member.color || pickUserColor(member.name || member.phoneE164 || member.id || ''),
      badge: buildUserInitials(member.name || 'Y'),
      badgeAccent: member.color || '#9fb3f0',
    }));

  if (memberTiles.length) return memberTiles.slice(0, 8);

  return (chat?.members || [])
    .filter(member => member.id !== currentUserId)
    .slice(0, 6).map((member, index) => ({
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
  const currentUserId = getCurrentUserId();
  const canManage = canManageActiveChat();
  const editing = canManage && AppState.groupSettingsEditing;
  const members = chat.members || [];
  const otherMembers = getChatOtherMembers(chat);
  const isDirectChat = otherMembers.length === 1;
  const directMember = isDirectChat ? resolveAvatarMember(otherMembers[0]) : null;
  AppState.groupSettingsInvites = invites;

  if (DOM.inputGroupSettingsName) {
    DOM.inputGroupSettingsName.value = getChatDisplayName(chat);
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
  if (DOM.btnGroupSettingsEdit) {
    const showEdit = canManage && !isDirectChat;
    DOM.btnGroupSettingsEdit.hidden = !showEdit;
    const isTopbarEditing = DOM.btnGroupSettingsEdit.dataset.editing === 'true';
    if (editing && !isTopbarEditing) {
      DOM.btnGroupSettingsEdit.dataset.editing = 'true';
      DOM.btnGroupSettingsEdit.innerHTML = '<img src="assets/done.svg" alt="" aria-hidden="true">';
      DOM.btnGroupSettingsEdit.classList.add('is-icon-only');
      DOM.btnGroupSettingsEdit.setAttribute('aria-label', 'Done editing group');
    }
    if (!editing && isTopbarEditing) {
      delete DOM.btnGroupSettingsEdit.dataset.editing;
      DOM.btnGroupSettingsEdit.classList.remove('is-icon-only');
      DOM.btnGroupSettingsEdit.textContent = 'Edit';
      DOM.btnGroupSettingsEdit.setAttribute('aria-label', 'Edit group');
    }
  }
  DOM.groupSettingsInviteCard?.classList.toggle('is-hidden', !editing || isDirectChat);
  if (DOM.toggleGroupHideAlerts) DOM.toggleGroupHideAlerts.checked = !!AppState.groupSettingsPrefs.hideAlerts;

  if (DOM.groupSettingsHeroAvatars) {
    if (otherMembers.length > 1) {
      const heroMembers = otherMembers.slice(0, 4);
      DOM.groupSettingsHeroAvatars.innerHTML = `
        <div class="chat-art-besties chat-art-besties--hero">
          ${heroMembers.map((member, index) => buildMemberAvatarMarkup(
            member,
            `chat-art-besties__avatar ${index === 0 ? 'chat-art-besties__avatar--main' : 'chat-art-besties__avatar--secondary'}`
          )).join('')}
        </div>
      `;
    } else {
      DOM.groupSettingsHeroAvatars.innerHTML = members
        .filter(member => member.id !== currentUserId)
        .slice(0, 3)
        .map(member => `
          <div class="${buildAvatarClass('group-details-hero__avatar', member)}" style="${buildAvatarStyle(member)}">
            ${buildAvatarContent(member)}
          </div>
        `)
        .join('');
    }
  }

  if (DOM.groupSettingsPeopleStrip) {
    DOM.groupSettingsPeopleStrip.hidden = isDirectChat;
    if (isDirectChat) {
      DOM.groupSettingsPeopleStrip.innerHTML = '';
    } else {
      const invitePhoneSet = new Set(invites.map(invite => invite.phone_e164).filter(Boolean));
      const peopleStripEntries = [
        ...otherMembers.map(member => ({
          member,
          status: member.pending || invitePhoneSet.has(member.phoneE164) ? 'Pending Invite' : '',
          key: member.id || member.phoneE164 || member.name || '',
        })),
        ...invites
          .filter(invite => invite.phone_e164 && !otherMembers.some(member => member.phoneE164 === invite.phone_e164))
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
  }

  if (DOM.groupSettingsContactCard && DOM.groupSettingsContactPhone) {
    const shouldShowContact = isDirectChat && directMember?.phoneE164;
    DOM.groupSettingsContactCard.style.display = shouldShowContact ? '' : 'none';
    DOM.groupSettingsContactPhone.textContent = directMember?.phoneE164 || '';
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
  await refreshChatsAndRender();
  if (!AppState.activeChat) return;
  AppState.activeChat = AppState.chats.find(chat => chat.id === AppState.activeChat.id) || AppState.activeChat;
  renderActiveChatShell(AppState.activeChat);
  const invites = AppState.supabaseOk ? await getInvitationsForChat(AppState.activeChat.id) : [];
  renderGroupSettings(invites);
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
  const cameFromVerifyStep = AppState.screen === 'auth-verify';
  if (!authSession) {
    resetAppStateForUser('');
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
      focusFieldAfterTransition(DOM.inputAuthPhone, 460);
      return;
    }

    navigate('welcome', 'fade');
    return;
  }

  const canLeaveSplashEarly = AppState.screen === 'splash'
    && !AppState.auth.pendingInviteToken
    && !AppState.auth.pendingChatId;
  if (canLeaveSplashEarly) {
    const cachedChats = readCachedChatsForUser(getCurrentUserId());
    if (cachedChats.length) AppState.chats = sortChatsForDisplay(applyPinnedFromLocal(cachedChats, []));
    navigate('chats', 'fade');
    scheduleChatsListRender();
  }

  const appUser = await ensureAppUserFromAuthSession(authSession);
  if (!appUser?.id) {
    // DB lookup/insert failed, but the user IS verified (Twilio OTP succeeded).
    // Send them to profile-setup to complete registration; saveUserProfile will
    // create the DB record via upsert when they submit.
    const hasVerifiedPhone = !!(authSession?.user?.phone || authSession?.provider === 'twilio-verify');
    if (hasVerifiedPhone) {
      const pendingId = generateAppRecordId('user');
      if (getCurrentUserId() !== pendingId) {
        resetAppStateForUser(pendingId);
      }
      navigate('profile-setup', cameFromVerifyStep ? 'forward' : 'fade');
      return;
    }
    navigate('welcome', 'fade');
    return;
  }

  if (getCurrentUserId() !== appUser.id) {
    resetAppStateForUser(appUser.id);
  } else {
    if (YAP_SUPABASE_REMOTE_SYNC_ENABLED) startRemoteSync();
  }
  prefillProfileForm(appUser);

  if (!appUser.profileCompleted) {
    updateAuthEntryCopy();
    navigate('profile-setup', cameFromVerifyStep ? 'forward' : 'fade');
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

  const canShowChatsBeforeRefresh = !AppState.auth.pendingChatId && !joinedChatId;
  let showedChatsBeforeRefresh = false;
  if (canShowChatsBeforeRefresh) {
    const cachedChats = readCachedChatsForUser(appUser.id);
    if (cachedChats.length) AppState.chats = sortChatsForDisplay(applyPinnedFromLocal(cachedChats, []));
    AppState.sync.chatSnapshot = buildChatActivitySnapshot(AppState.chats);
    navigate('chats', cameFromVerifyStep ? 'forward' : 'fade');
    scheduleChatsListRender();
    showedChatsBeforeRefresh = true;
  }

  // If we showed cached chats, refresh in background so UI stays responsive
  // Otherwise, await the refresh to show something to the user
  if (showedChatsBeforeRefresh) {
    refreshChatsAndRender().catch(error => {
      console.warn('[yAp] background chat refresh failed:', error);
    });
  } else {
    await refreshChatsAndRender();
  }
  bindResumeRefreshHandlers();
  ensureNotificationPermission().catch(error => {
    console.warn('[yAp] notification permission request failed:', error);
  });

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
    if (!showedChatsBeforeRefresh) navigate('chats', cameFromVerifyStep ? 'forward' : 'fade');
    scheduleChatsListRender();
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
  if (!showedChatsBeforeRefresh) navigate('chats', cameFromVerifyStep ? 'forward' : 'fade');
  scheduleChatsListRender();
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
    focusFieldAfterTransition(DOM.inputAuthPhone, 460);
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
      focusFieldAfterTransition(DOM.inputAuthCode, 460);
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
    focusFieldAfterTransition(DOM.inputAuthPhone, 460);
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
      focusFieldAfterTransition(DOM.inputAuthCode, 180);
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
      // Ensure session is persisted for auto-login on next visit
      if (AppState.auth.session) {
        setStoredAuthSession(AppState.auth.session);
        console.log('[Session] Auth session persisted after OTP verification');
      }
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
    if (!validateProfileSetupFields()) return;
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
      await refreshChatsAndRender();
      navigate('chats', 'forward');
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
    const hasInput = String(event.target.value || '').trim().length > 0;
    DOM.createChatHelperText?.classList.toggle('is-hidden', hasInput);
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
        const inviteCount = result?.invitesCreated || 0;
        setFeedback(
          DOM.contactsHubFeedback,
          inviteCount ? `SMS invite sent to ${name}.` : `${name} added to this group.`,
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
    if (AppState.onboarding.createGroupSubmitting) {
      return;
    }
    if (!AppState.onboarding.pendingMembers.length) {
      setFeedback(DOM.createGroupFeedback, 'Add at least one person to start a chat.', 'error');
      DOM.inputCreateGroupSearch?.focus();
      return;
    }
    AppState.onboarding.createGroupSubmitting = true;
    setFeedback(DOM.createGroupFeedback, '');
    setButtonBusy(DOM.btnCreateGroupSubmit, true, 'Creating');

    try {
      const createdChat = await createGroupChat({
        ownerUserId: getCurrentUserId(),
        name: DOM.inputGroupName?.value || '',
        members: AppState.onboarding.pendingMembers,
      });
      const nextChat = createdChat;

      resetCreateGroupComposer();
      // Pin the freshly-created chat immediately so it survives the trip back
      // to All Chats even if the remote refresh has not caught up yet.
      pinChatInLocalLists(nextChat);
      scheduleChatsListRender();
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
      refreshChatsAndRender();
    } catch (error) {
      setFeedback(DOM.createGroupFeedback, error.message || 'We could not create your group yet.', 'error');
    } finally {
      AppState.onboarding.createGroupSubmitting = false;
      setButtonBusy(DOM.btnCreateGroupSubmit, false);
    }
  });

  DOM.btnStartChat.addEventListener('click', () => {
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
  DOM.btnProfileEdit?.addEventListener('click', async () => {
    if (!DOM.inputManageProfileName || !DOM.btnProfileEdit) return;

    const isEditing = DOM.btnProfileEdit.dataset.editing === 'true';
    if (!isEditing) {
      DOM.btnProfileEdit.dataset.editing = 'true';
      DOM.btnProfileEdit.innerHTML = '<img src="assets/done.svg" alt="" aria-hidden="true">';
      DOM.btnProfileEdit.classList.add('is-icon-only');
      DOM.btnProfileEdit.setAttribute('aria-label', 'Done editing profile');
      DOM.inputManageProfileName.readOnly = false;
      DOM.inputManageProfileName.focus();
      try {
        DOM.inputManageProfileName.setSelectionRange(0, DOM.inputManageProfileName.value.length);
      } catch {}
      syncManageProfilePhotoButton();
      return;
    }

    DOM.inputManageProfileName.readOnly = true;
    DOM.inputManageProfileName.blur();
    try {
      await saveManagedProfileNameFromEditor();
    } catch {}
    delete DOM.btnProfileEdit.dataset.editing;
    DOM.btnProfileEdit.classList.remove('is-icon-only');
    DOM.btnProfileEdit.textContent = 'Edit';
    DOM.btnProfileEdit.setAttribute('aria-label', 'Edit profile');
    syncManageProfilePhotoButton();
  });
  DOM.btnManageProfilePhoto?.addEventListener('click', () => {
    if (DOM.btnProfileEdit?.dataset.editing === 'true') {
      DOM.inputManageProfileAvatarFile?.click();
      return;
    }
    openProfileAvatarPreviewOverlay();
  });
  DOM.profileAvatarPreviewOverlay?.addEventListener('click', () => {
    closeProfileAvatarPreviewOverlay();
  });
  DOM.btnProfileAvatarPreviewClose?.addEventListener('click', event => {
    event.stopPropagation();
    closeProfileAvatarPreviewOverlay();
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
    await saveManagedProfileNameFromEditor();
    DOM.inputManageProfileName?.blur();
  });
  DOM.inputManageProfileName?.addEventListener('blur', async () => {
    await saveManagedProfileNameFromEditor();
  });
  DOM.inputManageProfileAvatarFile?.addEventListener('change', async event => {
    if (DOM.btnProfileEdit?.dataset.editing !== 'true') {
      event.target.value = '';
      return;
    }
    const file = event.target.files?.[0];
    await handleProfileAvatarPicked(file, 'manage');
    if (file) {
      try {
        await persistManagedProfile();
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
      await persistManagedProfile();
    } catch (error) {
      setFeedback(DOM.profileManageFeedback, error.message || 'We could not save your profile yet.', 'error');
    }
  });
  DOM.btnSignOut?.addEventListener('click', async () => {
    setButtonBusy(DOM.btnSignOut, true, 'Signing out...');
    try {
      await signOutAuthSession();
      resetAppStateForUser('');
      AppState.auth.session = null;
      AppState.auth.pendingPhone = '';
      AppState.auth.pendingInviteToken = '';
      AppState.auth.pendingChatId = '';
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

  // Long-press context menu for chat cards
  let pressTimer = null;
  let pressTarget = null;
  DOM.chatsGrid.addEventListener('pointerdown', event => {
    const card = event.target.closest('[data-chat-id]');
    if (!card) return;
    if (event.pointerType === 'touch') {
      // Prevent iOS text selection / native callout highlight on long press.
      event.preventDefault();
    }
    pressTarget = card;
    card.classList.add('chat-card--pressing');
    pressTimer = setTimeout(() => {
      showChatContextMenu(card.dataset.chatId);
      pressTimer = null;
    }, 720);
  });
  DOM.chatsGrid.addEventListener('pointerup', () => {
    if (pressTarget) pressTarget.classList.remove('chat-card--pressing');
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
    pressTarget = null;
  });
  DOM.chatsGrid.addEventListener('pointercancel', () => {
    if (pressTarget) pressTarget.classList.remove('chat-card--pressing');
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
    pressTarget = null;
  });

  // Disable native iOS/Safari context menu (we provide our own).
  DOM.chatsGrid.addEventListener('contextmenu', event => {
    const card = event.target.closest?.('[data-chat-id]');
    if (!card) return;
    event.preventDefault();
  });

  // Chat context menu handlers — overlay tap dismisses (including delete-confirm → back to chats)
  DOM.chatContextMenu?.addEventListener('click', event => {
    const overlay = DOM.chatContextMenu.querySelector('.chat-context-menu__overlay');
    if (event.target === DOM.chatContextMenu || event.target === overlay) {
      hideChatContextMenu();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && DOM.chatContextMenu && !DOM.chatContextMenu.hidden) {
      hideChatContextMenu();
    }
  });
  document.getElementById('ctx-pin-chat')?.addEventListener('click', () => handleChatContextAction('pin'));
  document.getElementById('ctx-mark-unread')?.addEventListener('click', () => handleChatContextAction('mark-unread'));
  document.getElementById('ctx-hide-alerts')?.addEventListener('click', () => handleChatContextAction('hide-alerts'));
  document.getElementById('ctx-delete-chat')?.addEventListener('click', event => {
    event.stopPropagation();
    enterChatContextDeleteConfirm();
  });
  document.getElementById('ctx-delete-confirm-btn')?.addEventListener('click', async event => {
    event.stopPropagation();
    const id = AppState.contextMenuChatId;
    if (!id) return;
    try {
      await executeLeaveAndRemoveChat(id);
    } catch (err) {
      console.error('[yAp] Delete chat failed:', err);
    } finally {
      hideChatContextMenu();
    }
  });
  document.getElementById('ctx-delete-cancel-btn')?.addEventListener('click', event => {
    event.stopPropagation();
    exitChatContextDeleteConfirm();
  });

  DOM.btnBack.addEventListener('click', () => {
    void closeActiveChatAndNavigateToList();
  });
  DOM.btnChatMore?.addEventListener('click', openGroupSettingsScreen);
  DOM.btnGroupSettingsBack?.addEventListener('click', () => {
    AppState.groupSettingsEditing = false;
    goBack('chat');
  });
  DOM.btnGroupSettingsEdit?.addEventListener('click', async () => {
    // Mirror profile settings: topbar Edit toggles into Done (icon-only).
    if (!AppState.activeChat) return;
    if (!canManageActiveChat()) return;

    if (!AppState.groupSettingsEditing) {
      AppState.groupSettingsEditing = true;
      renderGroupSettings(AppState.supabaseOk ? await getInvitationsForChat(AppState.activeChat.id) : []);
      DOM.inputGroupSettingsName?.focus();
      DOM.inputGroupSettingsName?.select();
      return;
    }
    await saveGroupSettingsNameFromEditor();
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
    await saveGroupSettingsNameFromEditor();
  });
  DOM.inputGroupSettingsName?.addEventListener('keydown', async event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    await saveGroupSettingsNameFromEditor();
    DOM.inputGroupSettingsName?.blur();
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
      const addedCount = result?.addedUsers?.length || 0;
      const inviteCount = result?.invitesCreated || 0;
      const message = inviteCount && !addedCount
        ? 'SMS invite sent.'
        : inviteCount
          ? 'Member added and SMS invite sent.'
          : 'Member added.';
      setFeedback(DOM.groupSettingsFeedback, message, 'success');
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
    openCreateGroupComposer();
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
      AppState.pendingChats = (AppState.pendingChats || []).filter(chat => chat.id !== leavingChatId);
      Store.clear(leavingChatId);
      writeCachedChatsForUser(AppState.chats, getCurrentUserId());
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

  DOM.btnNowPlaying?.addEventListener('click', () => {
    openNowPlaying();
  });
  DOM.btnNpClose?.addEventListener('click', closeNowPlaying);
  DOM.btnNpPlaypause?.addEventListener('click', _toggleNowPlayingPause);
  DOM.btnNpPrev?.addEventListener('click', () => {
    _nowPlayingSkipMemo('prev');
  });
  DOM.btnNpNext?.addEventListener('click', () => {
    _nowPlayingSkipMemo('next');
  });

  // Hook into PlaybackController audio events for now-playing sync
  PlaybackController.init();
  PlaybackController.audio.addEventListener('play', () => _syncNowPlayingSpeaker());
  PlaybackController.audio.addEventListener('timeupdate', () => _syncNowPlayingSpeaker());
  PlaybackController.audio.addEventListener('pause', () => {
    if (!AppState.nowPlaying.active) return;
    if (!PlaybackController.audio.ended) {
      _syncNowPlayingPauseIcon(false);
      AppState.nowPlaying.isPlaying = false;
    }
  });

  // When a full thread finishes playing, auto-advance to next topic
  window.onThreadPlaybackComplete = () => {
    if (!AppState.nowPlaying.active) return;
    const threads = Store.getThreads();
    const nextIndex = AppState.nowPlaying.topicIndex + 1;
    if (nextIndex < threads.length) {
      _syncNowPlayingTopicProgress();
      setTimeout(() => _nowPlayingGoToTopic(nextIndex, 'next'), 400);
    } else {
      _syncNowPlayingPauseIcon(false);
      AppState.nowPlaying.isPlaying = false;
      _syncNowPlayingTopicProgress({ completeAll: true });
    }
  };

  DOM.btnMic.addEventListener('click', () => {
    clearReplyTarget();
    openRecordingOverlay();
    startRecording();
  });

  DOM.btnRecCancel.addEventListener('click', cancelRecording);
  DOM.btnDiscardRecording?.addEventListener('click', cancelRecording);
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

  wireIosStackEdgeSwipe();
}

// ── Pipeline event listeners ──────────────────────────
function wirePipelineEvents() {
  document.addEventListener('yap:pipeline:started', () => {
    // Only show analysis UI when we're sending a full memo (not reply),
    // which is the only flow that needs segmentation feedback.
    if (AppState.replyTargetThreadId) return;
    if (!DOM.analysisOverlay?.classList.contains('visible')) {
      AnalysisModal.open();
    }
  });

  // Segments arrive from API → render immediately with no animation
  document.addEventListener('yap:pipeline:segments', e => {
    if (!AppState.replyTargetThreadId && DOM.analysisOverlay?.classList.contains('visible')) {
      AnalysisModal.animateSegments(e.detail?.segments || [], () => {
        // Re-render when modal closes so updated message displays immediately
        renderTopics();
        scrollChatToLatest();
      });
    } else {
      renderTopics();
      scrollChatToLatest();
    }
  });

  document.addEventListener('yap:pipeline:done', () => {
    refreshChatsAndRender();
  });

  // A Chloe/Maria response arrived → add bar to matching topic card
  document.addEventListener('yap:response:arrived', e => {
    addReplyToTopic(e.detail.threadId, e.detail.message);
    refreshChatsAndRender();
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
  // Restore auth session on page load
  const storedSession = getStoredAuthSession();
  if (storedSession) {
    AppState.auth.session = storedSession;
    console.log('[Session] Restored login session from storage');
  }
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
  if (YAP_SUPABASE_REMOTE_SYNC_ENABLED) startRemoteSync();
  flushNotificationOutbox().catch(error => console.warn('[yAp] notification outbox flush failed:', error));
  window.addEventListener('online', () => {
    flushNotificationOutbox().catch(error => console.warn('[yAp] notification outbox flush failed:', error));
  });
  window.addEventListener('focus', () => {
    flushNotificationOutbox().catch(error => console.warn('[yAp] notification outbox flush failed:', error));
    // Force refresh chats when browser regains focus to catch new chats added on other accounts
    if (AppState.supabaseOk && (AppState.screen === 'chats-list' || AppState.screen === 'splash')) {
      refreshChatsAndRender({ force: true }).catch(error => console.warn('[yAp] focus chat refresh failed:', error));
    }
  });
  if (AppState.supabaseOk && supabaseClient?.auth) {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      AppState.auth.session = session || getStoredAuthSession() || null;
    });
  }

  // Splash auto-advance - resolve immediately for instant loading
  safeResolveInitialRoute();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
