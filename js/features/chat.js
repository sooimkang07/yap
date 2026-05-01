// ═══════════════════════════════════════════════════════
// yAp — Chat rendering
// Compact topic rows + expanded reply stacks + single global playback
// ═══════════════════════════════════════════════════════

let _expandedThreadId = null;

function _syncChatViewToggle(threads = []) {
  if (!DOM.chatViewTabs) return;
  const hasThreads = Array.isArray(threads) && threads.length > 0;
  DOM.chatViewTabs.hidden = !hasThreads;
  DOM.btnChatViewBubbles?.classList.toggle('is-active', AppState.chatViewMode === 'immersive');
  DOM.btnChatViewThreads?.classList.toggle('is-active', AppState.chatViewMode === 'threads');
  DOM.btnChatViewBubbles?.setAttribute('aria-selected', AppState.chatViewMode === 'immersive' ? 'true' : 'false');
  DOM.btnChatViewThreads?.setAttribute('aria-selected', AppState.chatViewMode === 'threads' ? 'true' : 'false');
  DOM.btnChatViewBubbles?.setAttribute('tabindex', AppState.chatViewMode === 'immersive' ? '0' : '-1');
  DOM.btnChatViewThreads?.setAttribute('tabindex', AppState.chatViewMode === 'threads' ? '0' : '-1');
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
      this._syncActiveClass(true);
      _syncImmersivePlaybackState();
    });

    this.audio.addEventListener('pause', () => {
      if (!this.audio.ended) this._syncActiveClass(false);
      _syncImmersivePlaybackState();
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
      if (!this.activeMeta?.endAt) return;
      if (this.audio.currentTime >= this.activeMeta.endAt) {
        this._handleFinished(true);
      }
    });
  },

  async play(item, rowEl) {
    this.init();
    if (!item) return;

    if (this.activeItemId === item.id && !this.audio.paused) {
      this.stop();
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

    if (
      this.activeMeta?.mode === 'thread' &&
      this.activeMeta?.threadId === thread.id &&
      !this.audio.paused
    ) {
      this.stop();
      return;
    }

    await this._playThreadIndex(thread, sequence, 0, rowEl);
  },

  stop() {
    if (this.activeRowEl) this.activeRowEl.classList.remove('is-playing');
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

    if (completedRow) completedRow.classList.remove('is-playing');
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
  },

  _syncActiveClass(isPlaying) {
    if (!this.activeRowEl) return;
    this.activeRowEl.classList.toggle('is-playing', !!isPlaying);
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
  const threads = Store.getThreads();
  _syncChatViewToggle(threads);

  const useImmersive = AppState.chatViewMode === 'immersive' && !!threads.length;

  setDisplay(DOM.chatEmpty, !threads.length);
  setDisplay(DOM.chatImmersive, useImmersive, 'grid');
  setDisplay(DOM.chatTopics, !!threads.length && !useImmersive, 'flex');

  if (!threads.length) return;

  if (useImmersive) {
    renderImmersiveThreads(threads);
    _syncImmersivePlaybackState();
    return;
  }

  DOM.chatTopics.innerHTML = threads.map(thread => `
    <section class="topic-card${_expandedThreadId === thread.id ? ' expanded' : ''}" data-thread-id="${thread.id}">
      ${_topicCardInner(thread)}
    </section>
  `).join('');

  if (!DOM.chatTopics._interactionWired) {
    DOM.chatTopics.addEventListener('click', _handleTopicInteraction);
    DOM.chatTopics._interactionWired = true;
  }

  _restorePlaybackStateClass();
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
    const replyCount = Math.max(0, orderedMessages.length - 1);

    return `
      <button class="immersive-cluster${playableSequence.length ? ' is-playable' : ''}"
              type="button"
              data-playable-id="${primaryMessage?.id || thread.id}"
              data-thread-playlist="${thread.id}"
              data-thread-id="${thread.id}"
              style="--immersive-accent:${accent};">
        <span class="immersive-cluster__halo"></span>
        <span class="immersive-cluster__ring"></span>
        <span class="immersive-cluster__card">
          <span class="immersive-cluster__label">${escapeHtml(thread.label || 'Topic')}</span>
          <span class="immersive-cluster__meta">
            <span>${replyCount ? `${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}` : 'New thread'}</span>
            <span>${totalDurationMs ? formatDurationClock(totalDurationMs) : ''}</span>
          </span>
        </span>
        ${displayPeople.map((person, personIndex) => {
          const personAccent = person.color || accent;
          const initials = buildUserInitials(person.name || 'Y');
          return `
            <span class="immersive-cluster__speaker immersive-cluster__speaker--${clusterPositions[personIndex] || 'bottom-right'}"
                  data-author-id="${escapeHtml(person.id || person.name || `speaker-${personIndex}`)}"
                  style="--speaker-accent:${personAccent};">
              <span class="immersive-cluster__speaker-photo ${person.avatarUrl ? '' : 'avatar-fallback'}"
                    style="${person.avatarUrl ? `background-image:url('${person.avatarUrl}')` : `--avatar-accent:${personAccent};`}">
                ${person.avatarUrl ? '' : `<span>${escapeHtml(initials)}</span>`}
              </span>
              <span class="immersive-cluster__speaker-name">${escapeHtml(person.name || 'Friend')}</span>
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
  const expanded = _expandedThreadId === thread.id
    ? `
      <div class="topic-thread">
        <div class="topic-thread__replies">
          ${replies.map(_replyRowHTML).join('')}
        </div>
      </div>
    `
    : '';

  return `
    <div class="topic-card__surface${_expandedThreadId === thread.id ? ' is-expanded' : ''}" data-expand-thread="${thread.id}">
      ${_topicRowHTML(thread, topicMessage, replies)}
      ${expanded}
    </div>
  `;
}

function _topicRowHTML(thread, message, replies) {
  const segments = [
    {
      duration: Number(message.durationMs) || 0,
      speaker: message.authorId === getCurrentUserId() ? 'you' : (message.author?.name?.toLowerCase() || 'reply'),
    },
    ...replies.map(reply => ({
      duration: Number(reply.durationMs) || 0,
      speaker: reply.author?.name?.toLowerCase() || 'reply',
    })),
  ].filter(segment => segment.duration > 0);

  return `
    <div class="topic-row">
      <div class="topic-row__header">
        <button class="topic-row__play is-playable" type="button"
                data-playable-id="${message.id}"
                data-thread-playlist="${thread.id}"
                data-voice-message-id="${message.voiceMessageId || message.id}"
                aria-label="Play topic thread">
          <span class="topic-row__play-icon"></span>
        </button>
        <span class="topic-row__title">${escapeHtml(thread.label)}</span>
        <span class="topic-row__meta">
          <span class="topic-row__time">${_formatClockTime(message.sentAt)}</span>
        </span>
      </div>
      ${_renderSegmentTrack(segments)}
      ${replies.length ? `<div class="topic-card__reply-summary">
        <span class="topic-card__avatars">${replies.map(_replyAvatarHTML).join('')}</span>
        <span class="topic-card__reply-count">${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}</span>
      </div>` : ''}
    </div>
  `;
}

function _replyRowHTML(message) {
  const playable = _isPlayable(message) ? ' is-playable' : '';
  const speakerName = message.authorId === getCurrentUserId() ? 'You' : (message.author?.name || 'Friend');
  const replyTitle = message.label || 'Voice reply';
  return `
    <button class="reply-row${playable}" type="button"
            data-playable-id="${message.id}"
            data-voice-message-id="${message.voiceMessageId || message.id}">
      <div class="reply-row__header">
        <span class="reply-row__play"><span class="topic-row__play-icon"></span></span>
        <span class="reply-row__title">${escapeHtml(replyTitle)}</span>
        <span class="reply-row__meta">
          <span class="reply-row__speaker">${escapeHtml(speakerName)}</span>
          <span class="reply-row__time">${_formatClockTime(message.sentAt)}</span>
          <span class="reply-row__avatar" style="background-image:url('${message.author.avatarUrl || ''}'); background-color:${message.author.color}"></span>
        </span>
      </div>
      ${_renderSegmentTrack([{ duration: Number(message.durationMs) || 0, speaker: message.author?.name?.toLowerCase() || 'reply' }])}
    </button>
  `;
}

function _renderSegmentTrack(segments) {
  const safeSegments = Array.isArray(segments) && segments.length ? segments : [{ duration: 1, speaker: 'you' }];
  const totalMs = safeSegments.reduce((sum, segment) => sum + Math.max(0, Number(segment.duration) || 0), 0) || 1;

  return `
    <div class="topic-row__trackline">
      <span class="topic-row__tick">0:00</span>
      <span class="topic-row__track">
        ${safeSegments.map(segment => `
          <span class="topic-row__segment topic-row__segment--${segment.speaker}" style="width:${(Math.max(0, Number(segment.duration) || 0) / totalMs) * 100}%"></span>
        `).join('')}
      </span>
      <span class="topic-row__tick">-${formatDurationClock(totalMs)}</span>
    </div>
  `;
}

function _replyAvatarHTML(message) {
  return `<span class="topic-card__avatar" style="background-image:url('${message.author.avatarUrl || ''}'); background-color:${message.author.color}"></span>`;
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

function _handleTopicInteraction(event) {
  const playableRow = event.target.closest('[data-playable-id]');
  if (playableRow) {
    event.preventDefault();
    event.stopPropagation();
    if (playableRow.dataset.threadPlaylist) {
      const thread = Store.getThread(playableRow.dataset.threadPlaylist);
      PlaybackController.playThread(thread, playableRow);
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
      row.classList.add('is-playing');
      PlaybackController.activeRowEl = row;
    }
    return;
  }

  if (!PlaybackController.activeItemId) return;
  const row = DOM.chatTopics.querySelector(`[data-playable-id="${PlaybackController.activeItemId}"]`);
  if (row) {
    row.classList.add('is-playing');
    PlaybackController.activeRowEl = row;
  }
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

    if (!isActive || !PlaybackController.activeMeta) {
      node.style.setProperty('--ring-progress', '0');
      return;
    }

    const activeAuthorId = found?.item?.authorId || null;
    if (activeAuthorId) {
      const activeSpeaker = node.querySelector(`[data-author-id="${CSS.escape(String(activeAuthorId))}"]`);
      if (activeSpeaker) activeSpeaker.classList.add('is-active-speaker');
    }

    const startAt = Number(PlaybackController.activeMeta.startAt || 0);
    const durationSeconds = Math.max(0.001, Number(PlaybackController.activeMeta.durationSeconds || 0));
    const elapsed = Math.max(0, PlaybackController.audio.currentTime - startAt);
    const progress = Math.max(0, Math.min(1, elapsed / durationSeconds));
    node.style.setProperty('--ring-progress', String(progress));
  });
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

      if (!item.durationMs || item.durationMs <= 0 || item.startMs === 0) {
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
