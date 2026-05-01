// ═══════════════════════════════════════════════════════
// yAp — Pipeline
// Audio → Transcribe → Segment → Assign → Reply → TTS → Store
//
// Emits CustomEvents on `document`:
//   yap:pipeline:started
//   yap:pipeline:transcribed   { transcript }
//   yap:pipeline:segments      { segments }
//   yap:pipeline:done          { threads }
//   yap:response:arrived       { threadId, message }
// ═══════════════════════════════════════════════════════

const Pipeline = {

  // ── Entry point ───────────────────────────────────────
  async run(blob, durationMs, chatId, authorId, localAudioUrl) {
    _pEmit('yap:pipeline:started');

    let messageId = 'local-' + Date.now();
    let audioUrl = localAudioUrl;
    let audioPath = null;

    if (isSupabaseReady()) {
      const saved = await saveVoiceMessage(chatId, authorId, blob, durationMs);
      if (!saved?.messageId) {
        throw new Error('We could not save your voice memo. Check your connection and try again.');
      }
      if (saved) {
        messageId = saved.messageId;
        audioUrl = saved.audioUrl || localAudioUrl;
        audioPath = saved.audioPath || null;
      }
    }

    let transcript = '';
    let segments = [];
    let transcriptWords = null;

    try {
      const processed = await this._processAudio(blob, durationMs, this._threadContext());
      transcript = processed.transcript || '';
      transcriptWords = processed.words || null;
      segments = Array.isArray(processed.segments) ? processed.segments : [];
      _pEmit('yap:pipeline:transcribed', { transcript });
    } catch (error) {
      if (YAP_DEV_ALLOW_MOCK_FALLBACK) {
        console.warn('[yAp] Audio processing failed — running in mock mode:', error);
        transcript = 'Hey what are you guys up to this weekend? Also wanted to tell you about something funny that happened today.';
        segments = this._mockSegments(durationMs);
        _pEmit('yap:pipeline:transcribed', { transcript });
      } else {
        if (isSupabaseReady() && !String(messageId).startsWith('local-')) {
          markVoiceMessageFailed(messageId).catch(updateError => {
            console.warn('[yAp] Failed to mark voice message failed:', updateError);
          });
        }
        throw error;
      }
    }

    _pEmit('yap:pipeline:segments', { segments });

    const touches = this._applySegmentsToThreads(chatId, authorId, segments, messageId, audioUrl, audioPath, blob, durationMs);
    const touchedThreads = [...new Set(touches.map(touch => touch.thread.id))]
      .map(threadId => Store.getThread(threadId))
      .filter(Boolean);

    if (isSupabaseReady()) {
      this._persistProcessingResult({
        transcript,
        transcriptWords,
        messageId,
        touches,
      }).catch(error => console.warn('[yAp] DB persist failed:', error));
    }

    _pEmit('yap:pipeline:done', { threads: touchedThreads });

    this._notifyHumanRecipients({
      chatId,
      chatName: AppState?.activeChat?.name || 'yAp group',
      authorId,
      senderName: currentAuthorName(authorId),
      touches,
      transcript,
      isReply: false,
    }).catch(error => console.warn('[yAp] Message notifications failed:', error));
  },

  async replyToThread(blob, durationMs, chatId, authorId, threadId, localAudioUrl) {
    const thread = Store.getThread(threadId);
    if (!thread) throw new Error('That thread is no longer available.');

    let messageId = 'local-reply-' + Date.now();
    let audioUrl = localAudioUrl;
    let audioPath = null;

    if (isSupabaseReady()) {
      const saved = await saveVoiceMessage(chatId, authorId, blob, durationMs);
      if (!saved?.messageId) {
        throw new Error('We could not save your reply. Check your connection and try again.');
      }
      if (saved) {
        messageId = saved.messageId;
        audioUrl = saved.audioUrl || localAudioUrl;
        audioPath = saved.audioPath || null;
      }
    }

    let transcript = '';

    try {
      const processed = await this._processAudio(blob, durationMs, []);
      transcript = processed.transcript || '';
      _pEmit('yap:pipeline:transcribed', { transcript });
    } catch (error) {
      if (isSupabaseReady() && !String(messageId).startsWith('local-')) {
        markVoiceMessageFailed(messageId).catch(updateError => {
          console.warn('[yAp] Failed to mark voice reply failed:', updateError);
        });
      }
      throw error;
    }

    const currentAuthor = getUserById(authorId) || getCurrentUser();
    const sentAt = Date.now();
    const replyMessage = {
      id: `${messageId}-reply`,
      voiceMessageId: messageId,
      threadId,
      authorId,
      author: currentAuthor,
      audioUrl,
      audioPath,
      audioBlob: blob,
      durationMs,
      label: _shortLabel(transcript || 'Voice reply'),
      transcript: transcript || 'Voice reply',
      excerpt: transcript || 'Voice reply',
      startMs: 0,
      endMs: durationMs,
      sentAt,
      parentMemoId: thread.parentMemoId || messageId,
      heardByCurrentUser: true,
    };

    Store.addMessage(threadId, replyMessage);
    Store.updateThread(threadId, { lastActivityAt: sentAt });

    if (isSupabaseReady()) {
      await saveTranscriptRecord(messageId, transcript || '');
      await ensureTopicThread(thread);
      await saveTopicSegmentRecord({
        voiceMessageId: messageId,
        topicThreadId: threadId,
        label: replyMessage.label,
        transcript: replyMessage.transcript,
        startMs: 0,
        endMs: durationMs,
      });
      await markVoiceMessageDone(messageId);
    }

    this._notifyHumanRecipients({
      chatId,
      chatName: AppState?.activeChat?.name || 'yAp group',
      authorId,
      senderName: currentAuthor.name,
      touches: [{ thread, userMessage: replyMessage }],
      transcript,
      isReply: true,
    }).catch(error => console.warn('[yAp] Reply notifications failed:', error));

    return replyMessage;
  },

  async _notifyHumanRecipients({ chatId, chatName, authorId, senderName, touches, transcript, isReply }) {
    if (!isSupabaseReady() || !chatId || !authorId) return;

    const recipients = await getNotificationRecipients(chatId, authorId);
    if (!recipients.length) return;

    const primaryTouch = Array.isArray(touches) && touches.length ? touches[0] : null;
    await sendMessageNotifications({
      chatId,
      chatName,
      senderName,
      recipients,
      threadLabel: primaryTouch?.thread?.label || primaryTouch?.userMessage?.label || 'New message',
      transcript: transcript || primaryTouch?.userMessage?.transcript || '',
      isReply,
    });
  },

  async _processAudio(blob, durationMs, threadContext) {
    const audioBase64 = await _blobToBase64(blob);
    const payload = {
      mimeType: blob.type || 'audio/webm',
      audioBase64,
    };

    const res = await fetch(YAP_PROCESS_AUDIO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Yap-Duration-Ms': String(durationMs || 0),
        'X-Yap-Thread-Context': _toBase64Json(threadContext),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw await _apiErrorFromResponse('Audio processing failed', res);
    }

    return res.json();
  },

  _threadContext() {
    const lastHeardThreadId = AppState?.playback?.lastHeardChatId === AppState?.activeChat?.id
      ? AppState.playback.lastHeardThreadId
      : null;

    return Store.getThreads().map(thread => ({
      id: thread.id,
      label: thread.label,
      excerpt: thread.excerpt || thread.transcript || '',
      rangeLabel: thread.rangeLabel || '',
      unheardCount: thread.unheardCount || 0,
      lastHeardAt: thread.lastHeardAt || null,
      hasHeardContext: !!thread.hasHeardContext,
      recentlyPlayed: thread.id === lastHeardThreadId,
      lastPlayedMessage: thread.id === lastHeardThreadId ? {
        id: AppState.playback.lastHeardMessageId || null,
        author: AppState.playback.lastHeardAuthor || '',
        label: AppState.playback.lastHeardLabel || '',
        transcript: AppState.playback.lastHeardTranscript || '',
        heardAt: AppState.playback.lastHeardAt || null,
      } : null,
      recentMessages: thread.messages.slice(-4).map(message => ({
        author: message.author?.name || '',
        transcript: message.transcript || '',
        label: message.label || '',
        heardByCurrentUser: !!message.heardByCurrentUser,
      })),
    }));
  },

  // ── Build / update Store-compatible thread objects ────
  _applySegmentsToThreads(chatId, authorId, segments, messageId, audioUrl, audioPath, audioBlob, totalDurationMs) {
    const touches = [];
    const currentAuthor = getUserById(authorId) || getCurrentUser();

    segments.forEach((seg, index) => {
      const existingThread = seg.assigned_thread_id
        ? Store.getThread(seg.assigned_thread_id)
        : null;

      const startMs = Math.max(0, Number(seg.start_ms) || 0);
      const endMs = Math.max(startMs, Number(seg.end_ms) || startMs);
      const durationMs = endMs > startMs
        ? endMs - startMs
        : Math.max(1400, Math.round(totalDurationMs / Math.max(segments.length, 1)));
      const sentAt = Date.now() + index;
      const threadId = existingThread?.id || `thread-${messageId}-${index}`;

      const userMessage = {
        id: `${messageId}-seg-${index}`,
        voiceMessageId: messageId,
        threadId,
        authorId,
        author: currentAuthor,
        audioUrl,
        audioPath,
        audioBlob,
        durationMs,
        label: seg.excerpt || seg.label,
        transcript: seg.transcript,
        excerpt: seg.excerpt || seg.transcript,
        startMs,
        endMs,
        sentAt,
        parentMemoId: messageId,
        heardByCurrentUser: true,
      };

      const parentMemoMessage = {
        id: `memo-${threadId}-${messageId}`,
        voiceMessageId: messageId,
        threadId,
        authorId,
        author: currentAuthor,
        audioUrl,
        audioPath,
        audioBlob,
        durationMs: totalDurationMs,
        label: 'Full memo',
        transcript: '',
        excerpt: '',
        startMs: 0,
        endMs: totalDurationMs,
        sentAt,
        parentMemoId: messageId,
        heardByCurrentUser: true,
      };

      let thread = existingThread;
      let isNewThread = false;

      if (thread) {
        Store.addMessage(thread.id, userMessage);
        thread = Store.updateThread(thread.id, {
          lastActivityAt: sentAt,
          parentMemoMessage: thread.parentMemoMessage || parentMemoMessage,
        });
      } else {
        thread = {
          id: threadId,
          chatId,
          label: seg.label,
          excerpt: seg.excerpt || seg.transcript,
          transcript: seg.transcript,
          rangeLabel: _rangeLabel(startMs, endMs),
          parentMemoId: messageId,
          parentMemoMessage,
          createdAt: sentAt,
          lastActivityAt: sentAt,
          messages: [userMessage],
        };
        Store.addThread(thread);
        isNewThread = true;
      }

      touches.push({
        thread,
        userMessage,
        segment: {
          ...seg,
          start_ms: startMs,
          end_ms: endMs,
          assigned_thread_id: thread.id,
        },
        isNewThread,
      });
    });

    return touches;
  },

  // ── Persist to DB ─────────────────────────────────────
  async _persistProcessingResult({ transcript, transcriptWords, messageId, touches }) {
    await saveTranscriptRecord(messageId, transcript, transcriptWords);

    await Promise.all(touches.map(async touch => {
      await ensureTopicThread(touch.thread);
      return saveTopicSegmentRecord({
        voiceMessageId: messageId,
        topicThreadId: touch.thread.id,
        label: touch.segment.label,
        transcript: touch.segment.transcript,
        startMs: touch.segment.start_ms,
        endMs: touch.segment.end_ms,
      });
    }));

    await markVoiceMessageDone(messageId);
  },

  async _requestReplies(thread, userMessage) {
    const res = await fetch(YAP_GENERATE_REPLIES_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatName: 'besties 👋',
        thread: {
          id: thread.id,
          label: thread.label,
          excerpt: thread.excerpt,
          transcript: thread.transcript,
          messages: thread.messages.slice(-5).map(message => ({
            author: message.author?.name || '',
            transcript: message.transcript || '',
            label: message.label || '',
          })),
        },
        latestUserMessage: {
          label: userMessage.label,
          excerpt: userMessage.excerpt,
          transcript: userMessage.transcript,
        },
      }),
    });

    if (!res.ok) {
      throw await _apiErrorFromResponse('Reply generation failed', res);
    }

    const json = await res.json();
    return Array.isArray(json.replies) ? json.replies : [];
  },

  async _materializeReply(chatId, thread, reply) {
    const user = USERS[(reply.author_name || '').toLowerCase()] || USERS.maria;
    let durationMs = Number(reply.duration_ms) || _estimateDurationMs(reply.text);

    let audioBlob = null;
    let audioUrl = null;
    let audioPath = null;

    if (reply.audio_base64) {
      audioBlob = blobFromBase64(reply.audio_base64, reply.mime_type || 'audio/mpeg');
      audioUrl = URL.createObjectURL(audioBlob);
      const measuredDuration = await measureAudioDurationFromUrl(audioUrl);
      if (measuredDuration) durationMs = measuredDuration;
    }

    let persistedId = null;

    if (isSupabaseReady() && audioBlob) {
      const saved = await saveGeneratedReply({
        chatId,
        threadId: thread.id,
        authorId: user.id,
        audioBlob,
        durationMs,
        transcript: reply.text,
        label: _shortLabel(reply.text),
      });

      if (saved?.messageId) {
        persistedId = saved.messageId;
        audioPath = saved.audioPath || null;
      }
    }

    return {
      id: persistedId || `resp-${user.id}-${thread.id}-${Date.now()}`,
      voiceMessageId: persistedId || null,
      threadId: thread.id,
      authorId: user.id,
      author: user,
      audioUrl,
      audioPath,
      audioBlob,
      durationMs,
      label: _shortLabel(reply.text),
      transcript: reply.text,
      excerpt: reply.text,
      startMs: 0,
      endMs: durationMs,
      sentAt: Date.now(),
      parentMemoId: thread.parentMemoId,
      heardByCurrentUser: false,
    };
  },

  // ── Helpers ───────────────────────────────────────────
  _mockSegments(durationMs) {
    const half = Math.round(durationMs / 2);
    return [
      {
        label: 'weekend plans',
        excerpt: 'what are you up to this weekend',
        transcript: 'what are you up to this weekend',
        start_ms: 0,
        end_ms: half,
      },
      {
        label: 'funny story',
        excerpt: 'something funny happened today',
        transcript: 'something funny happened today',
        start_ms: half,
        end_ms: durationMs,
      },
    ];
  },
};

function _pEmit(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function _shortLabel(text) {
  const words = text.trim().split(/\s+/);
  return words.length <= 6 ? text : words.slice(0, 6).join(' ') + '…';
}

function currentAuthorName(authorId) {
  return getUserById(authorId)?.name || getCurrentUser()?.name || 'A friend';
}

function _estimateDurationMs(text) {
  return Math.max(2600, (text || '').trim().split(/\s+/).filter(Boolean).length * 220);
}

function _nextReplyDelayMs(authorName, isFirstReply) {
  const normalized = String(authorName || '').toLowerCase();

  if (isFirstReply) {
    if (normalized === 'chloe') {
      return 900 + Math.round(Math.random() * 900);
    }
    if (normalized === 'maria') {
      return 1600 + Math.round(Math.random() * 1400);
    }
    return 1200 + Math.round(Math.random() * 1200);
  }

  if (normalized === 'chloe') {
    return 1400 + Math.round(Math.random() * 1400);
  }
  if (normalized === 'maria') {
    return 1800 + Math.round(Math.random() * 1800);
  }
  return 1500 + Math.round(Math.random() * 1600);
}

function _rangeLabel(startMs, endMs) {
  return `${formatDurationClock(startMs)}-${formatDurationClock(endMs)}`;
}

function _toBase64Json(value) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value || []))));
  } catch {
    return '';
  }
}

function _blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Failed to read audio blob'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

async function _apiErrorFromResponse(prefix, res) {
  let payload = null;
  let rawText = '';

  try {
    payload = await res.clone().json();
  } catch {
    rawText = await res.text();
  }

  const route = payload?.route || res.url || 'unknown route';
  const errorText = payload?.error || rawText || res.statusText || 'Unknown server error';
  const hint = payload?.hint ? ` Hint: ${payload.hint}` : '';
  const detail = `${prefix} via ${route} (${res.status}): ${errorText}${hint}`;
  const error = new Error(detail);

  error.route = route;
  error.status = res.status;
  error.payload = payload;
  console.error('[yAp] API request failed:', {
    route,
    status: res.status,
    payload,
    detail,
  });

  return error;
}
