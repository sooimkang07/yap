// ═══════════════════════════════════════════════════════
// yAp — Chat rendering
// Compact topic rows + expanded reply stacks + single global playback
// ═══════════════════════════════════════════════════════

let _expandedThreadId = null;

let _presenceInitialized = false;

// Match the rounded play/pause geometry used by #btn-now-playing.
const _TOPIC_PLAY_ICON_SVG = `<svg class="topic-row__play-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><g class="topic-row__play-icon-play"><path d="M22.5 12C22.5006 12.2546 22.4353 12.5051 22.3105 12.7271C22.1856 12.949 22.0055 13.1349 21.7875 13.2666L8.28 21.5297C8.05227 21.6691 7.79144 21.7453 7.52445 21.7502C7.25746 21.7552 6.99399 21.6887 6.76125 21.5578C6.53073 21.4289 6.3387 21.241 6.2049 21.0132C6.07111 20.7855 6.00039 20.5263 6 20.2622V3.73781C6.00039 3.4737 6.07111 3.21447 6.2049 2.98675C6.3387 2.75904 6.53073 2.57108 6.76125 2.44219C6.99399 2.31126 7.25746 2.24484 7.52445 2.24979C7.79144 2.25473 8.05227 2.33086 8.28 2.47031L21.7875 10.7334C22.0055 10.8651 22.1856 11.051 22.3105 11.2729C22.4353 11.4949 22.5006 11.7453 22.5 12Z\" fill=\"currentColor\"/></g><g class=\"topic-row__play-icon-pause\" fill=\"currentColor\"><rect x=\"6\" y=\"4\" width=\"5\" height=\"16\" rx=\"2\"/><rect x=\"13\" y=\"4\" width=\"5\" height=\"16\" rx=\"2\"/></g></svg>`;

// Initialize presence tracking for the current chat
function _initPresenceForChat(chatId) {
  if (!chatId || _presenceInitialized) return;
  _presenceInitialized = true;
  
  PresenceManager.init(chatId);
  
  // Update UI when presence changes
  PresenceManager.onPresenceUpdate(() => {
    renderTopics();
  });
  
  // Update UI when recording state changes
  PresenceManager.onRecordingUpdate(() => {
    renderTopics();
  });
  
  console.log('[yAp] Presence initialized for chat:', chatId);
}






// Render avatars of other users recording/sending in this thread
function _renderOtherUsersRecording(thread) {
  const currentUserId = getCurrentUserId();
  const recordingUsers = PresenceManager.getRecordingUsers();
  if (!recordingUsers.length) return '';

  // Only show OTHER users (not current user)
  const threadUserIds = new Set(thread.messages.map(m => m.authorId));
  const otherUsersRecording = recordingUsers.filter(({ userId }) => 
    userId !== currentUserId && threadUserIds.has(userId)
  );
  
  if (!otherUsersRecording.length) return '';

  const userMap = new Map();
  thread.messages.forEach(msg => {
    userMap.set(msg.authorId, msg.author);
  });

  return `
    <div class="others-recording-avatars">
      ${otherUsersRecording.map(({ userId, state }) => {
        const author = userMap.get(userId);
        return `
          <div class="recording-avatar-float" data-state="${state}">
            <div class="recording-avatar-float__avatar" style="background-image:url('${author?.avatarUrl || ''}'); background-color:${author?.color}"></div>
            <div class="recording-avatar-float__label">${escapeHtml(author?.name || 'Someone')} ${state === 'sending' ? 'sending' : 'recording'}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function _getThreadDate(thread) {
  const messages = _threadMessagesChronological(thread);
  return messages[0]?.sentAt || thread.createdAt || Date.now();
}

function _formatDateHeader(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  
  const dayDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
  if (dayDiff > 0 && dayDiff < 7) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[date.getDay()];
  }
  
  const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
  const day = date.getDate();
  return `${dayAbbr}, ${monthAbbr} ${day}`;
}

function _groupThreadsByDay(threads) {
  const groups = [];
  let currentDateKey = null;
  let currentGroup = null;
  
  const sortedThreads = [...threads].sort((a, b) => {
    const aDate = _getThreadDate(a);
    const bDate = _getThreadDate(b);
    return bDate - aDate;
  });
  
  sortedThreads.forEach(thread => {
    const threadDate = _getThreadDate(thread);
    const dateKey = new Date(threadDate).toDateString();
    
    if (dateKey !== currentDateKey) {
      if (currentGroup) groups.push(currentGroup);
      currentDateKey = dateKey;
      currentGroup = {
        dateKey,
        timestamp: threadDate,
        label: _formatDateHeader(threadDate),
        threads: []
      };
    }
    
    currentGroup.threads.push(thread);
  });
  
  if (currentGroup) groups.push(currentGroup);

  // Within each day section, show oldest → newest so the latest topics land at the bottom.
  groups.forEach(group => {
    group.threads.sort((a, b) => _getThreadDate(a) - _getThreadDate(b));
  });
  return groups;
}

function _syncChatViewToggle(threads = []) {
  const hasThreads = Array.isArray(threads) && threads.length > 0;
  if (DOM.btnNowPlaying) DOM.btnNowPlaying.style.visibility = hasThreads ? 'visible' : 'hidden';
}

const PlaybackController = {
  audio: new Audio(),
  activeItemId: null,
  activeRowEl: null,
  activeMeta: null,
  initialized: false,
  _playToken: 0,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.audio.preload = 'auto';
    this.audio.playsInline = true;

    this.audio.addEventListener('play', () => {
      console.log('[yAp] play() triggered', {
        itemId: this.activeItemId,
        src: this.audio.currentSrc || this.audio.src,
      });
      this._syncPlaybackRowPlayingState();
      _syncImmersivePlaybackState();
      _syncThreadPlaybackProgress();
    });

    this.audio.addEventListener('pause', () => {
      this._syncPlaybackRowPlayingState();
      _syncImmersivePlaybackState();
      _syncThreadPlaybackProgress();
    });

    this.audio.addEventListener('ended', () => {
      this._handleFinished(false);
    });

    this.audio.addEventListener('error', () => {
      console.warn('[yAp] audio element error', this.audio.error);
      this.stop();
    });

    this.audio.addEventListener('timeupdate', () => {
      _syncImmersivePlaybackState();
      _syncThreadPlaybackProgress();
      if (!this.activeMeta?.endAt) return;
      if (this.audio.currentTime >= this.activeMeta.endAt) {
        this._handleFinished(true);
      }
    });
  },

  async play(item, rowEl) {
    this.init();
    if (!item) return;

    const sameSingleSession =
      this.activeItemId === item.id && this.activeMeta?.mode !== 'thread';
    if (sameSingleSession) {
      if (!this.audio.paused) {
        this.audio.pause();
        return;
      }
      try {
        await this.audio.play();
      } catch (error) {
        console.warn('[yAp] audio.play() resume failed', error);
      }
      return;
    }

    const source = await resolvePlayableSource(item);
    if (!source?.url) {
      console.warn('[yAp] No playable source resolved', { itemId: item.id, item });
      return;
    }

    this.stop();

    const playToken = ++this._playToken;
    const requestedStartAt = Math.max(0, Number(item.startMs || 0) / 1000);
    const requestedEndAt = Math.max(requestedStartAt, Number(item.endMs || 0) / 1000);
    const hasSegmentWindow = requestedEndAt > requestedStartAt;

    this.activeItemId = item.id;
    this.activeRowEl = rowEl;
    rowEl?.closest('.topic-row, .reply-row')?.classList.add('is-playback-session');
    this.activeMeta = {
      playToken,
      voiceMessageId: item.voiceMessageId || item.id,
      durationSeconds: Math.max(0, Number(item.durationMs || 0) / 1000),
      startAt: requestedStartAt,
      endAt: hasSegmentWindow ? requestedEndAt : null,
    };

    this.audio.src = source.url;
    this.audio.load();

    _syncPlaybackWindow(this.audio, item, this.activeMeta, playToken);

    console.log('[yAp] resolved playable source', {
      itemId: item.id,
      sourceType: source.type,
      url: source.url,
      startAt: requestedStartAt,
      endAt: hasSegmentWindow ? requestedEndAt : null,
    });

    try {
      await this.audio.play();
    } catch (error) {
      console.warn('[yAp] audio.play() failed', error);
      this.stop();
    }
  },

  async playThread(thread, rowEl) {
    this.init();
    if (!thread) return;

    const sequence = _threadPlaybackSequence(thread);
    if (!sequence.length) {
      console.warn('[yAp] No playable sequence for thread', { threadId: thread.id });
      return;
    }

    if (this.activeMeta?.mode === 'thread' && this.activeMeta?.threadId === thread.id) {
      if (!this.audio.paused) {
        this.audio.pause();
        return;
      }
      try {
        await this.audio.play();
      } catch (error) {
        console.warn('[yAp] thread audio.play() resume failed', error);
      }
      return;
    }

    await this._playThreadIndex(thread, sequence, 0, rowEl);
  },

  async playThreadAt(thread, index, rowEl) {
    this.init();
    if (!thread) return;

    const sequence = _threadPlaybackSequence(thread);
    if (!sequence.length) {
      console.warn('[yAp] No playable sequence for thread', { threadId: thread.id });
      return;
    }

    const safeIndex = Math.max(0, Math.min(Number(index) || 0, sequence.length - 1));
    await this._playThreadIndex(thread, sequence, safeIndex, rowEl);
  },

  stop() {
    _resetThreadPlaybackProgress(this.activeRowEl);
    if (this.activeRowEl) {
      this.activeRowEl.classList.remove('is-playing');
      this.activeRowEl.closest('.topic-row, .reply-row')?.classList.remove('is-playback-session');
    }
    this._playToken += 1;
    try {
      this.audio.pause();
    } catch {}
    try {
      this.audio.removeAttribute('src');
      this.audio.load();
    } catch {}
    this.activeItemId = null;
    this.activeRowEl = null;
    this.activeMeta = null;
  },

  _handleFinished(fromSegmentCutoff) {
    const completedItemId = this.activeItemId;
    const completedMeta = this.activeMeta;
    const completedRow = this.activeRowEl;

    if (!completedItemId || !completedMeta) {
      this.stop();
      return;
    }

    const found = Store.findPlayableItem(completedItemId);
    if (found?.item) {
      _markMessageHeard(
        found.item.id,
        completedMeta.voiceMessageId,
        completedMeta.durationSeconds || this.audio.duration || 0
      );
    }

    if (
      completedMeta?.mode === 'thread' &&
      Array.isArray(completedMeta.sequence) &&
      completedMeta.sequenceIndex < completedMeta.sequence.length - 1
    ) {
      const nextIndex = completedMeta.sequenceIndex + 1;
      const thread = Store.getThread(completedMeta.threadId);

      if (completedRow) completedRow.classList.add('is-playing');
      this.audio.pause();
      this.activeItemId = null;
      this.activeMeta = null;

      this._playThreadIndex(thread, completedMeta.sequence, nextIndex, completedRow).catch(error => {
        console.warn('[yAp] Thread playlist advance failed', error);
        this.stop();
      });
      return;
    }

    if (completedRow) {
      completedRow.classList.remove('is-playing');
      completedRow.closest('.topic-row, .reply-row')?.classList.remove('is-playback-session');
    }
    this.audio.pause();
    this.activeItemId = null;
    this.activeRowEl = null;
    this.activeMeta = null;

    if (fromSegmentCutoff) {
      try {
        this.audio.currentTime = 0;
      } catch {}
    }

    renderTopics();
    window.onThreadPlaybackComplete?.();
  },

  _syncPlaybackRowPlayingState() {
    if (!this.activeRowEl) return;
    const live = !this.audio.paused && !this.audio.ended;
    this.activeRowEl.classList.toggle('is-playing', live);
  },

  async _playThreadIndex(thread, sequence, index, rowEl) {
    const item = sequence[index];
    if (!item) return;

    const source = await resolvePlayableSource(item);
    if (!source?.url) {
      console.warn('[yAp] Missing playable source in thread sequence', {
        threadId: thread?.id,
        itemId: item.id,
        index,
      });
      return;
    }

    this.stop();

    const playToken = ++this._playToken;
    this.activeItemId = item.id;
    this.activeRowEl = rowEl;
    rowEl?.closest('.topic-row, .reply-row')?.classList.add('is-playback-session');
    this.activeMeta = {
      mode: 'thread',
      threadId: thread?.id || item.threadId,
      sequence,
      sequenceIndex: index,
      playToken,
      voiceMessageId: item.voiceMessageId || item.id,
      durationSeconds: Math.max(0, Number(item.durationMs || 0) / 1000),
      startAt: Math.max(0, Number(item.startMs || 0) / 1000),
      endAt: Math.max(0, Number(item.endMs || 0)) > Math.max(0, Number(item.startMs || 0))
        ? Math.max(0, Number(item.endMs || 0) / 1000)
        : null,
    };

    this.audio.src = source.url;
    this.audio.load();
    _syncPlaybackWindow(this.audio, item, this.activeMeta, playToken);

    console.log('[yAp] resolved stitched source', {
      threadId: thread?.id,
      itemId: item.id,
      index,
      sourceType: source.type,
      url: source.url,
    });

    try {
      await this.audio.play();
    } catch (error) {
      console.warn('[yAp] stitched audio.play() failed', error);
      this.stop();
    }
  },
};

function renderTopics() {
  PlaybackController.init();
  _initPresenceForChat(AppState.activeChat?.id);
  const threads = Store.getThreads();

  // Measure latency if we just sent a message
  if (AppState.recording.sentAt && threads.length > 0) {
    const latency = Date.now() - AppState.recording.sentAt;
    if (latency < 30000) { // Only measure recent sends
      console.log(`[Message Latency] Message appeared in ${latency}ms`);
    }
    AppState.recording.sentAt = 0; // Clear after logging
  }

  _syncChatViewToggle(threads);

  setDisplay(DOM.chatEmpty, !threads.length);
  setDisplay(DOM.chatImmersive, false);
  setDisplay(DOM.chatTopics, !!threads.length, 'flex');

  if (!threads.length) return;

  const groups = _groupThreadsByDay(threads);
  DOM.chatTopics.innerHTML = groups.map(group => `
    <div class="topics-section">
      <div class="topics-date-header">${escapeHtml(group.label)}</div>
      ${group.threads.map(thread => `
        <section class="topic-card${_expandedThreadId === thread.id ? ' expanded' : ''}" data-thread-id="${thread.id}">
          ${_topicCardInner(thread)}
        </section>
      `).join('')}
    </div>
  `).join('');

  if (!DOM.chatTopics._interactionWired) {
    DOM.chatTopics.addEventListener('click', _handleTopicInteraction);
    DOM.chatTopics._interactionWired = true;
  }

  _restorePlaybackStateClass();
  _syncThreadPlaybackProgress();
}

function renderImmersiveThreads(threads) {
  const cards = [...threads]
    .sort((a, b) => {
      const aLast = _threadMessagesChronological(a).slice(-1)[0]?.sentAt || 0;
      const bLast = _threadMessagesChronological(b).slice(-1)[0]?.sentAt || 0;
      return aLast - bLast;
    })
    .slice(-4);

  const positions = [
    ['top-left', 'top-right', 'bottom-left'],
    ['top-right', 'left', 'bottom-right'],
    ['top-left', 'right', 'bottom-right'],
    ['top-right', 'left', 'bottom-left'],
  ];

  DOM.chatImmersive.innerHTML = cards.map((thread, index) => {
    const orderedMessages = _threadMessagesChronological(thread);
    const primaryMessage = orderedMessages[0] || thread.messages?.[0];
    const latestMessage = orderedMessages[orderedMessages.length - 1] || primaryMessage;
    const playableSequence = _threadPlaybackSequence(thread);
    const totalDurationMs = playableSequence.reduce((sum, item) => sum + (Number(item.durationMs) || 0), 0);
    const activeAccentSource = latestMessage?.author || primaryMessage?.author || {};
    const accent = activeAccentSource.color || pickUserColor(activeAccentSource.name || thread.label || thread.id || 'topic');
    const people = [];
    const seen = new Set();

    orderedMessages.forEach(message => {
      const key = message.authorId || message.author?.name || message.id;
      if (seen.has(key)) return;
      seen.add(key);
      people.push(message.author || {
        id: message.authorId,
        name: message.author?.name || 'Friend',
        color: accent,
        avatarUrl: message.author?.avatarUrl || '',
      });
    });

    const displayPeople = people.slice(0, 3);
    const clusterPositions = positions[index % positions.length];
    const unreadCount = Math.max(0, Number(thread.unheardCount) || 0);
    return `
      <button class="immersive-cluster${playableSequence.length ? ' is-playable' : ''}"
              type="button"
              data-playable-id="${primaryMessage?.id || thread.id}"
              data-thread-playlist="${thread.id}"
              data-thread-id="${thread.id}"
              style="--immersive-accent:${accent};">
        <span class="immersive-cluster__halo"></span>
        <span class="immersive-cluster__ring"></span>
        <span class="immersive-cluster__core">
          <span class="immersive-cluster__bubble">
            <span class="immersive-cluster__bubble-speaker"
                  data-author-id="${escapeHtml(displayPeople[0]?.id || displayPeople[0]?.name || 'bubble-speaker')}"
                  data-speaker-accent="${escapeHtml(displayPeople[0]?.color || accent)}"
                  style="--speaker-accent:${displayPeople[0]?.color || accent};">
              ${displayPeople[0] ? `
                <span class="immersive-cluster__speaker-label">${escapeHtml(displayPeople[0].name || 'Friend')}</span>
                <span class="immersive-cluster__speaker-photo ${displayPeople[0].avatarUrl ? '' : 'avatar-fallback'}"
                      style="${displayPeople[0].avatarUrl ? `background-image:url('${displayPeople[0].avatarUrl}')` : `--avatar-accent:${displayPeople[0].color || accent};`}">
                  ${displayPeople[0].avatarUrl ? '' : `<span>${escapeHtml(buildUserInitials(displayPeople[0].name || 'Y'))}</span>`}
                </span>
              ` : ''}
            </span>
          </span>
          <span class="immersive-cluster__meta">
            <span class="immersive-cluster__meta-main">
              ${unreadCount > 0 ? `<span class="immersive-cluster__badge">${unreadCount}</span>` : ''}
              <span class="immersive-cluster__meta-title">${escapeHtml(thread.label || 'Topic')}</span>
            </span>
            <span>${totalDurationMs ? formatDurationClock(totalDurationMs) : ''}</span>
          </span>
        </span>
        ${displayPeople.slice(1).map((person, personIndex) => {
          const personAccent = person.color || accent;
          const initials = buildUserInitials(person.name || 'Y');
          return `
            <span class="immersive-cluster__speaker immersive-cluster__speaker--${clusterPositions[personIndex + 1] || 'bottom-right'}"
                  data-author-id="${escapeHtml(person.id || person.name || `speaker-${personIndex}`)}"
                  data-speaker-accent="${escapeHtml(personAccent)}"
                  style="--speaker-accent:${personAccent};">
              <span class="immersive-cluster__speaker-label">${escapeHtml(person.name || 'Friend')}</span>
              <span class="immersive-cluster__speaker-photo ${person.avatarUrl ? '' : 'avatar-fallback'}"
                    style="${person.avatarUrl ? `background-image:url('${person.avatarUrl}')` : `--avatar-accent:${personAccent};`}">
                ${person.avatarUrl ? '' : `<span>${escapeHtml(initials)}</span>`}
              </span>
            </span>
          `;
        }).join('')}
      </button>
    `;
  }).join('');

  if (!DOM.chatImmersive._interactionWired) {
    DOM.chatImmersive.addEventListener('click', _handleTopicInteraction);
    DOM.chatImmersive._interactionWired = true;
  }
}

function _topicCardInner(thread) {
  const orderedMessages = _threadMessagesChronological(thread);
  const topicMessage = orderedMessages[0] || _topicPrimaryMessage(thread);
  const replies = orderedMessages.slice(1);
  const othersRecording = _renderOtherUsersRecording(thread);
  const canExpand = replies.length > 0;
  const expandedMessages = topicMessage ? [topicMessage, ...replies] : replies;
  const expanded = _expandedThreadId === thread.id
    ? `
      <div class="topic-thread">
        <div class="topic-thread__replies">
          ${expandedMessages.map(_replyRowHTML).join('')}
        </div>
        ${othersRecording}
      </div>
    `
    : '';

  return `
    <div class="topic-card__surface${_expandedThreadId === thread.id ? ' is-expanded' : ''}" ${canExpand ? `data-expand-thread="${thread.id}"` : ''}>
      ${_topicRowHTML(thread, topicMessage, replies, { canExpand })}
      ${canExpand ? expanded : ''}
    </div>
  `;
}

function _topicRowHTML(thread, message, replies, options = {}) {
  const sequenceForTrack = _threadPlaybackSequence(thread);
  const segments = sequenceForTrack
    .map(item => ({
      duration: Number(item.durationMs) || 0,
      color: item.author?.color || '',
    }))
    .filter(segment => segment.duration > 0);
  const totalMs = segments.reduce((sum, segment) => sum + Math.max(0, Number(segment.duration) || 0), 0) || 0;
  const canExpand = options?.canExpand ?? (replies?.length > 0);

  return `
    <div class="topic-row" data-total-ms="${totalMs}">
      <div class="topic-row__header">
        <button class="glassNavButton topic-row__play is-playable" type="button"
                data-playable-id="${message.id}"
                data-thread-playlist="${thread.id}"
                data-voice-message-id="${message.voiceMessageId || message.id}"
                aria-label="Play topic thread">
          ${_TOPIC_PLAY_ICON_SVG}
        </button>
        <span class="topic-row__title">${escapeHtml(thread.label)}</span>
        <span class="topic-row__meta">
          <span class="topic-row__time">${_formatClockTime(message.sentAt)}</span>
        </span>
      </div>
      ${_renderSegmentTrack(segments)}
      ${_topicRowParticipantsStripHTML(thread, canExpand)}
    </div>
  `;
}

function _topicRowParticipantsStripHTML(thread, canExpand) {
  const inner = _uniqueTopicParticipantAvatarsFromThread(thread);
  if (!inner) return '';
  const wrapClass = canExpand ? 'topic-card__reply-summary' : 'topic-card__participants';
  return `<div class="${wrapClass}"><span class="topic-card__avatars">${inner}</span></div>`;
}

function _replyRowHTML(message) {
  const playable = _isPlayable(message) ? ' is-playable' : '';
  const speakerName = message.authorId === getCurrentUserId() ? 'You' : (message.author?.name || 'Friend');
  const replyTitle = message.label || 'Voice reply';
  const totalMs = Number(message.durationMs) || 0;
  return `
    <button class="reply-row${playable}" type="button"
            data-total-ms="${totalMs}"
            data-playable-id="${message.id}"
            data-voice-message-id="${message.voiceMessageId || message.id}">
      <div class="reply-row__header">
        <span class="reply-row__play">${_TOPIC_PLAY_ICON_SVG}</span>
        <span class="reply-row__title">${escapeHtml(replyTitle)}</span>
        <span class="reply-row__meta">
          <span class="reply-row__time">${_formatClockTime(message.sentAt)}</span>
          ${_participantAvatarChipHTML(_resolveTopicMessageAuthor(message), 'reply-row__avatar')}
        </span>
      </div>
      ${_renderSegmentTrack([{
    duration: Number(message.durationMs) || 0,
    color: message.author?.color || '',
  }])}
    </button>
  `;
}

function _renderSegmentTrack(segments) {
  const safeSegments = Array.isArray(segments) && segments.length ? segments : [{ duration: 1, color: '' }];
  const totalMs = safeSegments.reduce((sum, segment) => sum + Math.max(0, Number(segment.duration) || 0), 0) || 1;

  return `
    <div class="topic-row__trackline">
      <span class="topic-row__tick" data-track-elapsed>0:00</span>
      <span class="topic-row__track">
        ${safeSegments.map((segment, index) => {
    const grow = Math.max(0, Number(segment.duration) || 0) || 0.001;
    return `
          <span class="topic-row__segment-cell" style="flex:${grow} 1 0" data-segment-index="${index}">
            <span class="topic-row__segment-progress" style="transform:scaleX(0)"></span>
          </span>
        `;
  }).join('')}
      </span>
      <span class="topic-row__tick" data-track-remaining>-${formatDurationClock(totalMs)}</span>
    </div>
  `;
}

function _resolveTopicMessageAuthor(message) {
  if (!message) return null;
  const a = message.author;
  if (a && (a.id || a.name || a.avatarUrl)) return a;

  const authorId = message.authorId || a?.id;
  if (!authorId) return a || null;

  if (authorId === getCurrentUserId()) {
    const u = getCurrentUser();
    return {
      id: u.id,
      name: u.name,
      color: u.color || pickUserColor(u.name || 'You'),
      avatarUrl: u.avatarUrl || null,
    };
  }

  const u = getUserById(authorId);
  if (u) return u;

  return {
    id: authorId,
    name: a?.name || 'Friend',
    color: a?.color || pickUserColor(authorId),
    avatarUrl: a?.avatarUrl || null,
  };
}

function _participantDedupeKey(message) {
  if (!message) return '';
  const id = message.authorId || message.author?.id;
  if (id) return String(id).trim();
  return String(message.author?.name || message.id || '').trim();
}

function _participantAvatarChipHTML(author, className = 'topic-card__avatar') {
  if (!author) {
    return `<span class="${className}" style="background-color:rgba(0,0,0,0.08)"></span>`;
  }
  const url = author.avatarUrl || '';
  const color = author.color || pickUserColor(author.name || author.id || 'user');
  const initials = buildUserInitials(author.name || '?');
  if (url) {
    return `<span class="${className}" style="background-image:url('${url}'); background-color:${color}"></span>`;
  }
  return `<span class="${className} avatar-fallback" style="--avatar-accent:${color}"><span>${escapeHtml(initials)}</span></span>`;
}

/** Unique participants in chronological order (first memo first), one chip per person. */
function _uniqueTopicParticipantAvatarsFromThread(thread) {
  const ordered = _threadMessagesChronological(thread);
  const seen = new Set();
  const parts = [];
  for (const m of ordered) {
    const key = _participantDedupeKey(m);
    if (!key || seen.has(key)) continue;
    const author = _resolveTopicMessageAuthor(m);
    if (!author && !m.authorId && !m.author?.id) continue;
    seen.add(key);
    parts.push(_participantAvatarChipHTML(author, 'topic-card__avatar'));
  }
  return parts.join('');
}

function _topicPrimaryMessage(thread) {
  const userMessages = thread.messages.filter(message => message.authorId === getCurrentUserId());
  return userMessages[userMessages.length - 1] || thread.parentMemoMessage || thread.messages[0];
}

function _threadMessagesChronological(thread) {
  return [...(thread?.messages || [])].sort((a, b) =>
    (a.sentAt || 0) - (b.sentAt || 0)
  );
}

function addReplyToTopic(threadId, message) {
  renderTopics();
}

function toggleTopicExpand(threadId) {
  _expandedThreadId = _expandedThreadId === threadId ? null : threadId;
  renderTopics();
}

/** Collapse expanded topic cards and clear thread-detail chrome (e.g. after Now Playing finishes the queue). */
function collapseChatTopicLayout() {
  _expandedThreadId = null;
  DOM.chatTopics?.classList.remove('showing-thread-details');
  const otherMembers = (AppState.activeChat?.members || []).filter(m => m?.id && m.id !== getCurrentUserId());
  DOM.chatEmpty?.classList.toggle('is-single-member', otherMembers.length === 1);
  AppState.chatViewMode = 'threads';
}

function _handleTopicInteraction(event) {
  const playableRow = event.target.closest('[data-playable-id]');
  if (playableRow) {
    event.preventDefault();
    event.stopPropagation();
    if (playableRow.dataset.threadPlaylist) {
      const thread = Store.getThread(playableRow.dataset.threadPlaylist);
      const playableId = String(playableRow.dataset.playableId || '');
      const sequence = _threadPlaybackSequence(thread);
      const startIndex = playableId ? sequence.findIndex(message => message.id === playableId) : 0;
      const safeIndex = startIndex >= 0 ? startIndex : 0;
      if (sequence.length) {
        PlaybackController.playThreadAt(thread, safeIndex, playableRow);
      } else {
        console.warn('[yAp] No playable sequence for thread', { threadId: thread?.id });
      }
      return;
    }
    const item = Store.findPlayableItem(playableRow.dataset.playableId)?.item || null;
    PlaybackController.play(item, playableRow);
    return;
  }

  const expandToggle = event.target.closest('[data-expand-thread]');
  if (expandToggle) {
    if (event.target.closest('.topic-row__play')) return;
    event.preventDefault();
    event.stopPropagation();
    toggleTopicExpand(expandToggle.dataset.expandThread);
  }
}

function _restorePlaybackStateClass() {
  DOM.chatImmersive?.querySelectorAll('.immersive-cluster').forEach(node => {
    node.classList.remove('is-playing');
    node.querySelectorAll('.immersive-cluster__speaker').forEach(speaker => speaker.classList.remove('is-active-speaker'));
  });

  if (PlaybackController.activeMeta?.mode === 'thread' && PlaybackController.activeMeta?.threadId) {
    const immersiveCluster = DOM.chatImmersive?.querySelector(`[data-thread-id="${PlaybackController.activeMeta.threadId}"]`);
    if (immersiveCluster) immersiveCluster.classList.add('is-playing');
  } else if (PlaybackController.activeItemId) {
    const found = Store.findPlayableItem(PlaybackController.activeItemId);
    const threadId = found?.thread?.id || found?.item?.threadId || null;
    const immersiveCluster = threadId ? DOM.chatImmersive?.querySelector(`[data-thread-id="${threadId}"]`) : null;
    if (immersiveCluster) immersiveCluster.classList.add('is-playing');
  }

  if (PlaybackController.activeMeta?.mode === 'thread' && PlaybackController.activeMeta?.threadId) {
    const row = DOM.chatTopics.querySelector(`[data-thread-playlist="${PlaybackController.activeMeta.threadId}"]`);
    if (row) {
      PlaybackController.activeRowEl = row;
      row.closest('.topic-row, .reply-row')?.classList.add('is-playback-session');
      const live = !PlaybackController.audio.paused && !PlaybackController.audio.ended;
      row.classList.toggle('is-playing', live);
    }
    _syncThreadPlaybackProgress();
    return;
  }

  if (!PlaybackController.activeItemId) {
    _syncThreadPlaybackProgress();
    return;
  }
  const row = DOM.chatTopics.querySelector(`[data-playable-id="${PlaybackController.activeItemId}"]`);
  if (row) {
    PlaybackController.activeRowEl = row;
    row.closest('.topic-row, .reply-row')?.classList.add('is-playback-session');
    const live = !PlaybackController.audio.paused && !PlaybackController.audio.ended;
    row.classList.toggle('is-playing', live);
  }

  _syncThreadPlaybackProgress();
}

function _threadPlaybackSequence(thread) {
  if (!thread) return [];
  return _threadMessagesChronological(thread).filter(item => _isPlayable(item));
}

async function resolvePlayableSource(item) {
  if (item?.audioBlob) {
    if (!item.audioUrl || !String(item.audioUrl).startsWith('blob:')) {
      item.audioUrl = URL.createObjectURL(item.audioBlob);
      item.audioSignedAt = null;
    }
    return { url: item.audioUrl, type: 'blob' };
  }

  let url = await ensureMessageAudioUrl(item);
  if (url) {
    return { url, type: url.startsWith('blob:') ? 'blob' : 'url' };
  }

  if (item.authorId !== getCurrentUserId() && item.transcript) {
    console.log('[yAp] reply missing audio, synthesizing on demand', {
      itemId: item.id,
      author: item.author?.name,
    });
    const synthesized = await synthesizeReplyAudio(item);
    if (synthesized?.url) {
      return synthesized;
    }
  }

  return null;
}

async function synthesizeReplyAudio(item) {
  const response = await fetch(YAP_SYNTHESIZE_REPLY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: item.transcript || item.label || '',
      authorName: item.author?.name || 'Maria',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.warn('[yAp] reply synth failed', { status: response.status, text });
    return null;
  }

  const json = await response.json();
  if (!json?.audio_base64) return null;

  const blob = blobFromBase64(json.audio_base64, json.mime_type || 'audio/mpeg');
  const objectUrl = URL.createObjectURL(blob);
  const measuredDurationMs = await measureAudioDurationFromUrl(objectUrl) || Number(json.duration_ms) || item.durationMs || 0;
  item.audioBlob = blob;
  item.audioUrl = objectUrl;
  item.audioSignedAt = null;
  item.durationMs = measuredDurationMs;
  item.startMs = 0;
  item.endMs = measuredDurationMs;

  if (isSupabaseReady() && item.voiceMessageId) {
    const persisted = await persistReplyAudioForMessage({
      chatId: ACTIVE_CHAT_ID,
      voiceMessageId: item.voiceMessageId,
      audioBlob: blob,
      durationMs: measuredDurationMs,
    });
    if (persisted?.audioPath) item.audioPath = persisted.audioPath;
  }

  return { url: objectUrl, type: 'blob' };
}

function _isPlayable(item) {
  return !!(item && (item.audioUrl || item.audioPath || (item.authorId !== getCurrentUserId() && item.transcript)));
}

function _formatClockTime(sentAt) {
  if (!sentAt) return '';
  return new Date(sentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function _syncImmersivePlaybackState() {
  if (!DOM.chatImmersive) return;
  DOM.chatImmersive.querySelectorAll('.immersive-cluster').forEach(node => {
    const threadId = node.dataset.threadId;
    const found = PlaybackController.activeItemId ? Store.findPlayableItem(PlaybackController.activeItemId) : null;
    const activeThreadId = PlaybackController.activeMeta?.mode === 'thread'
      ? PlaybackController.activeMeta.threadId
      : (found?.thread?.id || found?.item?.threadId || null);
    const isActive = !!activeThreadId && threadId === activeThreadId;

    node.classList.toggle('is-playing', isActive);
    node.querySelectorAll('.immersive-cluster__speaker').forEach(speaker => speaker.classList.remove('is-active-speaker'));
    node.querySelectorAll('.immersive-cluster__bubble-speaker').forEach(speaker => speaker.classList.remove('is-active-speaker'));

    if (!isActive || !PlaybackController.activeMeta) {
      node.style.setProperty('--ring-progress', '0');
      node.style.setProperty('--ring-accent', 'var(--immersive-accent)');
      return;
    }

    const activeAuthorId = found?.item?.authorId || null;
    if (activeAuthorId) {
      const activeSpeaker = node.querySelector(`.immersive-cluster__speaker[data-author-id="${CSS.escape(String(activeAuthorId))}"], .immersive-cluster__bubble-speaker[data-author-id="${CSS.escape(String(activeAuthorId))}"]`);
      if (activeSpeaker) {
        activeSpeaker.classList.add('is-active-speaker');
        const speakerAccent = activeSpeaker.getAttribute('data-speaker-accent') || found?.item?.author?.color || '';
        node.style.setProperty(
          '--ring-accent',
          speakerAccent ? `color-mix(in srgb, ${speakerAccent} 44%, white 56%)` : 'var(--immersive-accent)'
        );
      } else if (found?.item?.author?.color) {
        node.style.setProperty('--ring-accent', `color-mix(in srgb, ${found.item.author.color} 44%, white 56%)`);
      }
    }

    const startAt = Number(PlaybackController.activeMeta.startAt || 0);
    const durationSeconds = Math.max(0.001, Number(PlaybackController.activeMeta.durationSeconds || 0));
    const elapsed = Math.max(0, PlaybackController.audio.currentTime - startAt);
    const progress = Math.max(0, Math.min(1, elapsed / durationSeconds));
    node.style.setProperty('--ring-progress', String(progress));
  });
}

function _formatRemainingClock(ms) {
  return `-${formatDurationClock(Math.max(0, Number(ms) || 0))}`;
}

function _segmentProgressFillCss(accent) {
  const raw = accent && String(accent).trim() ? String(accent).trim() : '';
  if (raw) {
    return `linear-gradient(90deg, color-mix(in srgb, ${raw} 82%, white 18%), ${raw})`;
  }
  return 'linear-gradient(90deg, rgba(184, 216, 255, 0.92), rgba(143, 191, 255, 0.96))';
}

function _defaultTopicTrackGlowColor() {
  return 'rgb(184, 216, 255)';
}

/** Parse author accent (#hex, rgb()) to RGB; default Sooim blue. */
function _authorAccentToRgbTuple(colorStr) {
  const s = String(colorStr || '').trim();
  if (!s) return { r: 184, g: 216, b: 255 };
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length === 3) {
      h = h.split('').map(ch => ch + ch).join('');
    }
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      if ([r, g, b].every(n => Number.isFinite(n) && n >= 0 && n <= 255)) {
        return { r, g, b };
      }
    }
  }
  const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (m) {
    const r = Math.round(Number(m[1]));
    const g = Math.round(Number(m[2]));
    const b = Math.round(Number(m[3]));
    if ([r, g, b].every(n => Number.isFinite(n) && n >= 0 && n <= 255)) {
      return { r, g, b };
    }
  }
  return { r: 184, g: 216, b: 255 };
}

function _setTopicRowTrackGlowVars(trackEl, rawAccent) {
  if (!trackEl) return;
  const base = rawAccent && String(rawAccent).trim() ? String(rawAccent).trim() : _defaultTopicTrackGlowColor();
  const { r, g, b } = _authorAccentToRgbTuple(base);
  trackEl.style.setProperty('--topic-track-glow-soft', `rgba(${r}, ${g}, ${b}, 0.32)`);
  trackEl.style.setProperty('--topic-track-glow-far', `rgba(${r}, ${g}, ${b}, 0.19)`);
  trackEl.style.setProperty('--topic-track-glow-mid', `rgba(${r}, ${g}, ${b}, 0.26)`);
  trackEl.style.setProperty('--topic-track-glow-faint', `rgba(${r}, ${g}, ${b}, 0.15)`);
}

function _clearTopicRowTrackGlowVars(trackEl) {
  if (!trackEl) return;
  ['--topic-track-glow-soft', '--topic-track-glow-far', '--topic-track-glow-mid', '--topic-track-glow-faint', '--topic-track-glow'].forEach(
    prop => trackEl.style.removeProperty(prop)
  );
}

/** Topic list row (or topic header when playback started from immersive cluster). */
function _playbackGlowScopeContainer(rowEl, meta) {
  if (!rowEl) return null;
  let scope = rowEl.closest?.('.topic-row, .reply-row');
  if (scope) return scope;
  if (
    meta &&
    rowEl.classList?.contains?.('immersive-cluster') &&
    meta.threadId &&
    DOM.chatTopics
  ) {
    const tid = String(meta.threadId);
    scope = DOM.chatTopics.querySelector(`.topic-card[data-thread-id="${CSS.escape(tid)}"] .topic-row`);
  }
  return scope || null;
}

function _resetThreadPlaybackProgress(rowEl) {
  const container = rowEl?.closest?.('.topic-row, .reply-row');
  if (!container) return;

  const totalMs = Number(container.dataset.totalMs || 0);
  const elapsedLabel = container.querySelector('[data-track-elapsed]');
  const remainingLabel = container.querySelector('[data-track-remaining]');

  const tr = container.querySelector('.topic-row__track');
  if (tr) _clearTopicRowTrackGlowVars(tr);
  container.querySelectorAll('.topic-row__segment-progress').forEach(fill => {
    fill.style.transform = 'scaleX(0)';
    fill.style.removeProperty('--segment-fill');
  });
  if (elapsedLabel) elapsedLabel.textContent = '0:00';
  if (remainingLabel) remainingLabel.textContent = _formatRemainingClock(totalMs);
}

function _syncThreadPlaybackProgress() {
  const activeContainer =
    PlaybackController.activeRowEl && PlaybackController.activeMeta
      ? _playbackGlowScopeContainer(PlaybackController.activeRowEl, PlaybackController.activeMeta)
      : null;

  DOM.chatTopics?.querySelectorAll('.topic-row, .reply-row').forEach(container => {
    if (container === activeContainer) return;
    container.classList.remove('is-playback-session');
    const elapsedLabel = container.querySelector('[data-track-elapsed]');
    const remainingLabel = container.querySelector('[data-track-remaining]');
    const totalMs = Number(container.dataset.totalMs || 0);

    const trClear = container.querySelector('.topic-row__track');
    if (trClear) _clearTopicRowTrackGlowVars(trClear);
    container.querySelectorAll('.topic-row__segment-progress').forEach(fill => {
      fill.style.transform = 'scaleX(0)';
      fill.style.removeProperty('--segment-fill');
    });
    if (elapsedLabel) elapsedLabel.textContent = '0:00';
    if (remainingLabel) remainingLabel.textContent = _formatRemainingClock(totalMs);
  });

  if (!activeContainer || !PlaybackController.activeMeta) return;

  const segmentFills = activeContainer.querySelectorAll('.topic-row__segment-progress');
  const elapsedLabel = activeContainer.querySelector('[data-track-elapsed]');
  const remainingLabel = activeContainer.querySelector('[data-track-remaining]');
  const meta = PlaybackController.activeMeta;
  const isPlaying = !PlaybackController.audio.paused && !PlaybackController.audio.ended;

  let totalMs = Number(activeContainer.dataset.totalMs || 0);
  let elapsedMs = 0;

  if (meta.mode === 'thread' && Array.isArray(meta.sequence)) {
    // Keep the currently playing reply-row in sync when a topic card is expanded.
    const idx = Math.max(0, Number(meta.sequenceIndex) || 0);
    const curItem = meta.sequence[idx] || null;
    const curItemId = curItem?.id != null ? String(curItem.id) : '';
    const curVoiceId = curItem?.voiceMessageId != null ? String(curItem.voiceMessageId) : '';
    const threadCard = DOM.chatTopics?.querySelector(`.topic-card[data-thread-id="${CSS.escape(String(meta.threadId || ''))}"]`);
    const activeReplyRow = threadCard
      ? threadCard.querySelector(`.reply-row[data-playable-id="${CSS.escape(curItemId)}"], .reply-row[data-playable-id="${CSS.escape(curVoiceId)}"]`)
      : null;
    if (threadCard) {
      threadCard.querySelectorAll('.reply-row').forEach(btn => {
        if (btn === activeReplyRow) return;
        btn.classList.remove('is-playback-session', 'is-playing');
        const trb = btn.querySelector('.topic-row__track');
        if (trb) _clearTopicRowTrackGlowVars(trb);
        btn.querySelectorAll('.topic-row__segment-progress').forEach(fill => {
          fill.style.transform = 'scaleX(0)';
          fill.style.removeProperty('--segment-fill');
        });
        const e = btn.querySelector('[data-track-elapsed]');
        const r = btn.querySelector('[data-track-remaining]');
        const t = Number(btn.dataset.totalMs || 0);
        if (e) e.textContent = '0:00';
        if (r) r.textContent = _formatRemainingClock(t);
      });
    }
    if (activeReplyRow) {
      const live = !PlaybackController.audio.paused && !PlaybackController.audio.ended;
      activeReplyRow.classList.add('is-playback-session');
      activeReplyRow.classList.toggle('is-playing', live);
    }

    totalMs = meta.sequence.reduce((sum, item) => sum + Math.max(0, Number(item.durationMs) || 0), 0) || totalMs;
    const priorMs = meta.sequence
      .slice(0, idx)
      .reduce((sum, item) => sum + Math.max(0, Number(item.durationMs) || 0), 0);
    const segmentElapsedMs = Math.max(0, (PlaybackController.audio.currentTime - Number(meta.startAt || 0)) * 1000);
    elapsedMs = priorMs + segmentElapsedMs;

    segmentFills.forEach((progEl, i) => {
      const item = meta.sequence[i];
      if (!item) {
        progEl.style.transform = 'scaleX(0)';
        progEl.style.removeProperty('--segment-fill');
        return;
      }
      const durMs = Math.max(0.001, Number(item.durationMs) || 0);
      let p = 0;
      if (i < idx) p = 1;
      else if (i === idx) p = Math.min(1, segmentElapsedMs / durMs);
      progEl.style.transform = `scaleX(${p})`;
      const accent = item.author?.color || '';
      if (p > 0) {
        progEl.style.setProperty('--segment-fill', _segmentProgressFillCss(accent));
      } else {
        progEl.style.removeProperty('--segment-fill');
      }
    });

    // Mirror progress on the active reply-row's single-segment track.
    if (activeReplyRow && curItem) {
      const durMs = Math.max(0.001, Number(curItem.durationMs) || 0);
      const p = Math.min(1, Math.max(0, segmentElapsedMs / durMs));
      const replyFill = activeReplyRow.querySelector('.topic-row__segment-progress');
      if (replyFill) {
        replyFill.style.transform = `scaleX(${p})`;
        const accent = curItem.author?.color || '';
        if (p > 0) replyFill.style.setProperty('--segment-fill', _segmentProgressFillCss(accent));
        else replyFill.style.removeProperty('--segment-fill');
      }
      const e = activeReplyRow.querySelector('[data-track-elapsed]');
      const r = activeReplyRow.querySelector('[data-track-remaining]');
      const totalReplyMs = Math.max(0, Number(curItem.durationMs) || Number(activeReplyRow.dataset.totalMs || 0));
      const elapsedReplyMs = Math.max(0, Math.min(totalReplyMs, Math.round(p * totalReplyMs)));
      if (e) e.textContent = formatDurationClock(elapsedReplyMs);
      if (r) r.textContent = _formatRemainingClock(totalReplyMs - elapsedReplyMs);
      const track = activeReplyRow.querySelector('.topic-row__track');
      if (track) {
        const raw = curItem?.author?.color && String(curItem.author.color).trim();
        if (isPlaying) _setTopicRowTrackGlowVars(track, raw || _defaultTopicTrackGlowColor());
        else _clearTopicRowTrackGlowVars(track);
      }
    }
  } else {
    totalMs = Math.max(totalMs, Math.round((Number(meta.durationSeconds) || 0) * 1000));
    elapsedMs = Math.max(0, (PlaybackController.audio.currentTime - Number(meta.startAt || 0)) * 1000);
    const item = Store.findPlayableItem(PlaybackController.activeItemId)?.item || null;
    const durMs = Math.max(0.001, Number(item?.durationMs) || totalMs || 1);
    const p = Math.min(1, elapsedMs / durMs);

    segmentFills.forEach((progEl, i) => {
      if (i === 0) {
        progEl.style.transform = `scaleX(${p})`;
        const accent = item?.author?.color || '';
        if (p > 0) {
          progEl.style.setProperty('--segment-fill', _segmentProgressFillCss(accent));
        } else {
          progEl.style.removeProperty('--segment-fill');
        }
      } else {
        progEl.style.transform = 'scaleX(0)';
        progEl.style.removeProperty('--segment-fill');
      }
    });
  }

  const clampedElapsedMs = Math.max(0, Math.min(totalMs, elapsedMs));
  if (elapsedLabel) elapsedLabel.textContent = formatDurationClock(clampedElapsedMs);
  if (remainingLabel) remainingLabel.textContent = _formatRemainingClock(totalMs - clampedElapsedMs);

  const trackEl = activeContainer.querySelector('.topic-row__track');
  if (trackEl) {
    if (meta.mode === 'thread' && Array.isArray(meta.sequence)) {
      const idx = Math.max(0, Number(meta.sequenceIndex) || 0);
      const cur = meta.sequence[idx];
      const raw = cur?.author?.color && String(cur.author.color).trim();
      if (isPlaying) _setTopicRowTrackGlowVars(trackEl, raw || _defaultTopicTrackGlowColor());
      else _clearTopicRowTrackGlowVars(trackEl);
    } else {
      const item = Store.findPlayableItem(PlaybackController.activeItemId)?.item || null;
      const raw = item?.author?.color && String(item.author.color).trim();
      if (isPlaying) _setTopicRowTrackGlowVars(trackEl, raw || _defaultTopicTrackGlowColor());
      else _clearTopicRowTrackGlowVars(trackEl);
    }
  }
}

async function _markMessageHeard(messageId, voiceMessageId, durationSeconds) {
  const found = Store.markMessageHeard(messageId, Math.round((durationSeconds || 0) * 1000));
  if (!found) return;

  if (found.message.authorId !== getCurrentUserId()) {
    AppState.playback.lastHeardChatId = AppState.activeChat?.id || null;
    AppState.playback.lastHeardThreadId = found.thread?.id || null;
    AppState.playback.lastHeardMessageId = found.message.id || null;
    AppState.playback.lastHeardAt = Date.now();
    AppState.playback.lastHeardAuthor = found.message.author?.name || '';
    AppState.playback.lastHeardLabel = found.message.label || '';
    AppState.playback.lastHeardTranscript = found.message.transcript || found.thread?.transcript || '';
  }

  savePlaybackProgressRecord({
    userId: getCurrentUserId(),
    voiceMessageId: voiceMessageId || found.message.voiceMessageId || messageId,
    heard: true,
    playedMs: found.message.playedMs || found.message.durationMs || 0,
  }).catch(error => console.warn('[yAp] Playback progress save failed:', error));
}

function _syncPlaybackWindow(audio, item, activeMeta, playToken) {
  const applyWindow = () => {
    if (PlaybackController._playToken !== playToken || PlaybackController.activeMeta !== activeMeta) return;

    const audioDuration = Number(audio.duration) || 0;
    if (audioDuration > 0) {
      const clampedStart = Math.min(Math.max(0, activeMeta.startAt || 0), audioDuration);
      const requestedEnd = activeMeta.endAt != null ? Math.max(clampedStart, activeMeta.endAt) : audioDuration;
      const clampedEnd = Math.min(requestedEnd, audioDuration);
      const durationSeconds = Math.max(0, clampedEnd - clampedStart) || Math.max(0, audioDuration - clampedStart);

      activeMeta.startAt = clampedStart;
      activeMeta.endAt = clampedEnd > clampedStart ? clampedEnd : null;
      activeMeta.durationSeconds = durationSeconds || audioDuration;

      try {
        if (Math.abs(audio.currentTime - clampedStart) > 0.05) {
          audio.currentTime = clampedStart;
        }
      } catch {}

      if (!item.durationMs || item.durationMs <= 0) {
        item.durationMs = Math.round((activeMeta.durationSeconds || audioDuration) * 1000);
      }
      if (!item.endMs || item.endMs < item.startMs) {
        item.endMs = Math.round((activeMeta.endAt ?? audioDuration) * 1000);
      }
    }
  };

  if (audio.readyState >= 1) {
    applyWindow();
    return;
  }

  audio.addEventListener('loadedmetadata', applyWindow, { once: true });
}
