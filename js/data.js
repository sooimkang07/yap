// ═══════════════════════════════════════════════════════
// yAp — Data Layer
// Supabase client + seeded data + DB helpers
// ═══════════════════════════════════════════════════════

// ── Supabase client ────────────────────────────────────
let supabaseClient = null;

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[yAp] Supabase not configured — audio will not persist. Set SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js');
    return false;
  }
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[yAp] Supabase connected');
    return true;
  } catch (e) {
    console.error('[yAp] Supabase init failed:', e);
    return false;
  }
}

function isSupabaseReady() {
  return !!supabaseClient;
}

// ── Seeded local data ──────────────────────────────────
const FIGMA_ASSETS = {
  sooimAvatar: 'assets/sooim.jpg',
  chloeAvatar: 'https://www.figma.com/api/mcp/asset/99057606-1c1b-40c1-a2fc-c23fda030a0b',
  mariaAvatar: 'https://www.figma.com/api/mcp/asset/97cb42aa-cce6-4334-98ec-baee923c114c',
  musicLeague: 'https://www.figma.com/api/mcp/asset/9a786041-43ad-46c6-bbd2-e06d9598e266',
  sooma: 'https://www.figma.com/api/mcp/asset/f151cf2d-bd6e-48e3-9a1c-7ed8af6f5f1c',
};

const USERS = {
  sooim: {
    id:       CURRENT_USER.id,
    name:     'sooim',
    color:    '#B8D8FF',
    initials: 'S',
    avatarUrl: FIGMA_ASSETS.sooimAvatar,
  },
  chloe: {
    id:       'user-chloe-000000000002',
    name:     'Chloe',
    color:    '#DEC0F8',
    initials: 'C',
    avatarUrl: FIGMA_ASSETS.chloeAvatar,
  },
  maria: {
    id:       'user-maria-000000000003',
    name:     'Maria',
    color:    '#FFDEB8',
    initials: 'M',
    avatarUrl: FIGMA_ASSETS.mariaAvatar,
  },
};

const CHATS = [
  {
    id:      ACTIVE_CHAT_ID,
    name:    'besties 💛',
    emoji:   null,
    members: [USERS.sooim, USERS.chloe, USERS.maria],
    unread:  0,
    active:  true,   // navigates into chat
    visual:  'besties',
  },
];

const LEGACY_DEMO_TRANSCRIPTS = new Set([
  'what are you up to this weekend',
  'something funny happened today',
  'hey what are you guys up to this weekend? also wanted to tell you about something funny that happened today.',
]);

// ── DB helpers ─────────────────────────────────────────

/**
 * Upload audio blob to Supabase Storage and insert a voice_messages row.
 * Returns { messageId, audioUrl } on success, or null if Supabase is not configured.
 */
async function saveVoiceMessage(chatId, authorId, audioBlob, durationMs) {
  if (!supabaseClient) {
    console.warn('[yAp] saveVoiceMessage: Supabase not configured, skipping DB write');
    return null;
  }

  const messageId = crypto.randomUUID();
  const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
  const storagePath = `${chatId}/${messageId}.${ext}`;

  // 1. Upload to Storage
  const { error: uploadErr } = await supabaseClient.storage
    .from('voice-messages')
    .upload(storagePath, audioBlob, {
      contentType: audioBlob.type,
      upsert: false,
    });

  if (uploadErr) {
    console.error('[yAp] Storage upload failed:', uploadErr);
    return null;
  }

  // 2. Create a signed URL for immediate playback. The stored DB value remains the path.
  const audioUrl = await createSignedAudioUrl(storagePath);

  // 3. Insert voice_messages row
  const { data, error: insertErr } = await supabaseClient
    .from('voice_messages')
    .insert({
      id:          messageId,
      chat_id:     chatId,
      author_id:   authorId,
      audio_url:   storagePath,
      duration_ms: durationMs,
      status:      'processing',
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[yAp] DB insert failed:', insertErr);
    return null;
  }

  console.log('[yAp] Voice message saved:', data);
  return { messageId: data.id, audioUrl, audioPath: storagePath };
}

async function saveTranscriptRecord(voiceMessageId, transcriptText, wordTimestamps = null) {
  if (!supabaseClient || !voiceMessageId || !transcriptText) return null;

  const { data, error } = await supabaseClient
    .from('transcripts')
    .insert({
      voice_message_id: voiceMessageId,
      full_text: transcriptText,
      word_timestamps: wordTimestamps,
    })
    .select()
    .single();

  if (error) {
    console.error('[yAp] Transcript insert failed:', error);
    return null;
  }

  return data;
}

async function ensureTopicThread(thread) {
  if (!supabaseClient || !thread) return null;

  const payload = {
    id: thread.id,
    chat_id: thread.chatId,
    label: thread.label,
    last_activity_at: new Date(thread.lastActivityAt || Date.now()).toISOString(),
  };

  const { data: existing } = await supabaseClient
    .from('topic_threads')
    .select('id')
    .eq('id', thread.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseClient
      .from('topic_threads')
      .update({
        label: payload.label,
        last_activity_at: payload.last_activity_at,
      })
      .eq('id', thread.id);

    if (error) {
      console.error('[yAp] Topic thread update failed:', error);
      return null;
    }

    return thread.id;
  }

  const { error } = await supabaseClient
    .from('topic_threads')
    .insert(payload);

  if (error) {
    console.error('[yAp] Topic thread insert failed:', error);
    return null;
  }

  return thread.id;
}

async function saveTopicSegmentRecord({ voiceMessageId, topicThreadId, label, transcript, startMs, endMs }) {
  if (!supabaseClient || !voiceMessageId || !topicThreadId || !transcript) return null;

  const { data, error } = await supabaseClient
    .from('topic_segments')
    .insert({
      voice_message_id: voiceMessageId,
      topic_thread_id: topicThreadId,
      label,
      transcript,
      start_ms: startMs || 0,
      end_ms: endMs || 0,
    })
    .select()
    .single();

  if (error) {
    console.error('[yAp] Topic segment insert failed:', error);
    return null;
  }

  return data;
}

async function markVoiceMessageDone(messageId) {
  if (!supabaseClient || !messageId) return null;

  const { error } = await supabaseClient
    .from('voice_messages')
    .update({ status: 'done' })
    .eq('id', messageId);

  if (error) {
    console.error('[yAp] Voice message status update failed:', error);
    return null;
  }

  return true;
}

async function markVoiceMessageFailed(messageId) {
  if (!supabaseClient || !messageId) return null;

  const { error } = await supabaseClient
    .from('voice_messages')
    .update({ status: 'failed' })
    .eq('id', messageId);

  if (error) {
    console.error('[yAp] Voice message failure update failed:', error);
    return null;
  }

  return true;
}

async function saveGeneratedReply({ chatId, threadId, authorId, audioBlob, durationMs, transcript, label }) {
  if (!supabaseClient || !chatId || !threadId || !authorId || !audioBlob || !transcript) return null;

  const messageId = crypto.randomUUID();
  const storagePath = `${chatId}/generated/${messageId}.mp3`;

  const { error: uploadErr } = await supabaseClient.storage
    .from('voice-messages')
    .upload(storagePath, audioBlob, {
      contentType: audioBlob.type || 'audio/mpeg',
      upsert: true,
    });

  if (uploadErr) {
    console.error('[yAp] Generated reply upload failed:', uploadErr);
    return null;
  }

  const audioUrl = await createSignedAudioUrl(storagePath);

  const { error: insertErr } = await supabaseClient
    .from('voice_messages')
    .insert({
      id: messageId,
      chat_id: chatId,
      author_id: authorId,
      audio_url: storagePath,
      duration_ms: durationMs,
      status: 'done',
    });

  if (insertErr) {
    console.error('[yAp] Generated reply DB insert failed:', insertErr);
    return null;
  }

  await saveTopicSegmentRecord({
    voiceMessageId: messageId,
    topicThreadId: threadId,
    label,
    transcript,
    startMs: 0,
    endMs: durationMs,
  });

  return { messageId, audioUrl, audioPath: storagePath };
}

async function persistReplyAudioForMessage({ chatId, voiceMessageId, audioBlob, durationMs }) {
  if (!supabaseClient || !chatId || !voiceMessageId || !audioBlob) return null;

  const storagePath = `${chatId}/generated/${voiceMessageId}.mp3`;

  const { error: uploadErr } = await supabaseClient.storage
    .from('voice-messages')
    .upload(storagePath, audioBlob, {
      contentType: audioBlob.type || 'audio/mpeg',
      upsert: true,
    });

  if (uploadErr) {
    console.error('[yAp] Reply audio backfill upload failed:', uploadErr);
    return null;
  }

  const audioUrl = await createSignedAudioUrl(storagePath);

  const { error: updateErr } = await supabaseClient
    .from('voice_messages')
    .update({
      audio_url: storagePath,
      duration_ms: durationMs || null,
      status: 'done',
    })
    .eq('id', voiceMessageId);

  if (updateErr) {
    console.error('[yAp] Reply audio backfill DB update failed:', updateErr);
    return null;
  }

  return { audioUrl, audioPath: storagePath };
}

async function savePlaybackProgressRecord({ userId, voiceMessageId, heard, playedMs }) {
  if (!supabaseClient || !userId || !voiceMessageId) return null;

  const { error } = await supabaseClient
    .from('playback_progress')
    .upsert({
      user_id: userId,
      voice_message_id: voiceMessageId,
      heard: !!heard,
      played_ms: playedMs || 0,
      last_heard_at: heard ? new Date().toISOString() : null,
    });

  if (error) {
    console.error('[yAp] Playback progress upsert failed:', error);
    return null;
  }

  return true;
}

async function getVoiceMessages(chatId) {
  if (!supabaseClient || !chatId) return [];

  const { data, error } = await supabaseClient
    .from('voice_messages')
    .select(`
      *,
      transcripts(*),
      topic_segments(*),
      playback_progress(*)
    `)
    .eq('chat_id', chatId)
    .order('sent_at', { ascending: true });

  if (error) {
    console.error('[yAp] getVoiceMessages:', error);
    return [];
  }

  return data || [];
}

async function createSignedAudioUrl(storagePath, expiresIn = 60 * 60) {
  if (!supabaseClient || !storagePath) return null;
  if (!looksLikeStoragePath(storagePath)) return storagePath;

  const { data, error } = await supabaseClient.storage
    .from('voice-messages')
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error('[yAp] Signed URL creation failed:', error);
    return null;
  }

  return data?.signedUrl || null;
}

function looksLikeStoragePath(value) {
  return typeof value === 'string' && !/^https?:\/\//i.test(value);
}

async function ensureMessageAudioUrl(message) {
  if (!message) return null;

  if (!message.audioPath && looksLikeStoragePath(message.audioUrl)) {
    message.audioPath = message.audioUrl;
    message.audioUrl = null;
  }

  const expiresSoon = message.audioSignedAt
    ? (Date.now() - message.audioSignedAt) > 45 * 60 * 1000
    : true;

  if (message.audioUrl && !message.audioPath) return message.audioUrl;
  if (message.audioUrl && !message.audioSignedAt) return message.audioUrl;
  if (message.audioUrl && !expiresSoon) return message.audioUrl;
  if (!message.audioPath) return message.audioUrl || null;

  const signedUrl = await createSignedAudioUrl(message.audioPath);
  if (!signedUrl) return null;

  message.audioUrl = signedUrl;
  message.audioSignedAt = Date.now();
  return signedUrl;
}

// ── In-memory Store ────────────────────────────────────
// Mirrors the DB schema shape. Populated by pipeline.js.
// Shape of each thread:
//   { id, chatId, label, transcript, createdAt,
//     messages: [{ id, threadId, authorId, author, audioUrl, durationMs, label, transcript, startMs, sentAt }] }

const Store = {
  threads: [],

  clear() { this.threads = []; },

  addThread(thread) {
    const normalized = this._normalizeThread(thread);
    this.threads.push(normalized);
  },

  addMessage(threadId, message) {
    const t = this.threads.find(t => t.id === threadId);
    if (t) {
      t.messages.push(this._normalizeMessage(message));
      t.lastActivityAt = message.sentAt || Date.now();
      this._recalculateThreadState(t);
    }
  },

  updateThread(threadId, patch = {}) {
    const t = this.threads.find(t => t.id === threadId);
    if (!t) return null;
    Object.assign(t, patch);
    this._recalculateThreadState(t);
    return t;
  },

  getThreads()          {
    return [...this.threads].sort((a, b) =>
      (b.unheardCount || 0) - (a.unheardCount || 0) ||
      (b.lastHeardAt || 0) - (a.lastHeardAt || 0) ||
      (b.lastActivityAt || b.createdAt || 0) - (a.lastActivityAt || a.createdAt || 0)
    );
  },
  getThread(threadId)   { return this.threads.find(t => t.id === threadId); },
  hasThreads() { return this.threads.length > 0; },
  findMessage(messageId) {
    for (const thread of this.threads) {
      const message = thread.messages.find(msg => msg.id === messageId);
      if (message) return { thread, message };
    }
    return null;
  },
  findPlayableItem(itemId) {
    for (const thread of this.threads) {
      const message = thread.messages.find(msg => msg.id === itemId);
      if (message) return { thread, item: message, type: 'message' };

      if (thread.parentMemoMessage?.id === itemId) {
        return { thread, item: thread.parentMemoMessage, type: 'parentMemo' };
      }
    }
    return null;
  },
  markMessageHeard(messageId, playedMs = 0) {
    const found = this.findMessage(messageId);
    if (!found) return null;

    const { thread, message } = found;
    if (message.authorId === CURRENT_USER.id) return found;

    message.heardByCurrentUser = true;
    message.playedMs = Math.max(playedMs || 0, message.durationMs || 0);
    message.heardAt = Date.now();
    thread.lastHeardAt = message.heardAt;
    this._recalculateThreadState(thread);

    return found;
  },
  _normalizeThread(thread) {
    const normalized = {
      ...thread,
      messages: Array.isArray(thread.messages) ? thread.messages.map(message => this._normalizeMessage(message)) : [],
      parentMemoMessage: thread.parentMemoMessage ? this._normalizeMessage(thread.parentMemoMessage) : null,
      lastHeardAt: thread.lastHeardAt || null,
      unheardCount: thread.unheardCount || 0,
    };

    this._recalculateThreadState(normalized);
    return normalized;
  },
  _normalizeMessage(message) {
    const isCurrentUser = message.authorId === CURRENT_USER.id;
    const startMs = Math.max(0, Number(message.startMs) || 0);
    const rawDurationMs = Math.max(0, Number(message.durationMs) || 0);
    const endMs = Math.max(startMs, Number(message.endMs) || (startMs + rawDurationMs));
    const durationMs = Math.max(0, endMs - startMs) || rawDurationMs;
    return {
      ...message,
      voiceMessageId: message.voiceMessageId || message.id,
      audioPath: message.audioPath || (looksLikeStoragePath(message.audioUrl) ? message.audioUrl : null),
      audioUrl: looksLikeStoragePath(message.audioUrl) ? null : (message.audioUrl || null),
      audioBlob: message.audioBlob || null,
      audioSignedAt: message.audioSignedAt || null,
      startMs,
      endMs,
      durationMs,
      heardByCurrentUser: typeof message.heardByCurrentUser === 'boolean'
        ? message.heardByCurrentUser
        : isCurrentUser,
      playedMs: message.playedMs || 0,
      heardAt: message.heardAt || null,
    };
  },
  _recalculateThreadState(thread) {
    const heardMessages = thread.messages.filter(message => message.heardByCurrentUser && message.authorId !== CURRENT_USER.id);
    const unheardMessages = thread.messages.filter(message => !message.heardByCurrentUser && message.authorId !== CURRENT_USER.id);

    thread.unheardCount = unheardMessages.length;
    thread.lastHeardAt = heardMessages.length
      ? Math.max(...heardMessages.map(message => message.heardAt || 0))
      : thread.lastHeardAt || null;
    thread.hasHeardContext = heardMessages.length > 0;
  },
};

async function getTopicThreads(chatId) {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient
    .from('topic_threads')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[yAp] getTopicThreads:', error);
    return [];
  }

  return data || [];
}

async function hydrateChatFromSupabase(chatId) {
  if (!supabaseClient || !chatId) return [];

  const [topicThreads, voiceMessages] = await Promise.all([
    getTopicThreads(chatId),
    getVoiceMessages(chatId),
  ]);

  const threadMap = new Map(
    topicThreads.map(thread => [thread.id, {
      id: thread.id,
      chatId: thread.chat_id,
      label: thread.label,
      excerpt: '',
      transcript: '',
      rangeLabel: '',
      parentMemoId: null,
      parentMemoMessage: null,
      createdAt: new Date(thread.created_at).getTime(),
      lastActivityAt: new Date(thread.last_activity_at).getTime(),
      lastHeardAt: null,
      unheardCount: 0,
      messages: [],
    }])
  );

  const sortedMessages = [...voiceMessages].sort((a, b) =>
    new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
  );

  for (const voiceMessage of sortedMessages) {
    const author = Object.values(USERS).find(user => user.id === voiceMessage.author_id) || USERS.sooim;
    const progress = Array.isArray(voiceMessage.playback_progress)
      ? voiceMessage.playback_progress.find(entry => entry.user_id === CURRENT_USER.id)
      : null;
    const segments = Array.isArray(voiceMessage.topic_segments)
      ? [...voiceMessage.topic_segments].sort((a, b) => a.start_ms - b.start_ms)
      : [];

    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      if (!segment.topic_thread_id) continue;

      const thread = threadMap.get(segment.topic_thread_id) || {
        id: segment.topic_thread_id,
        chatId,
        label: segment.label,
        excerpt: '',
        transcript: '',
        rangeLabel: '',
        parentMemoId: null,
        parentMemoMessage: null,
        createdAt: new Date(voiceMessage.sent_at).getTime(),
        lastActivityAt: new Date(voiceMessage.sent_at).getTime(),
        lastHeardAt: null,
        unheardCount: 0,
        messages: [],
      };

      const durationMs = Math.max(
        0,
        (segment.end_ms || 0) - (segment.start_ms || 0)
      ) || voiceMessage.duration_ms || 0;
      const sentAt = new Date(voiceMessage.sent_at).getTime() + index;

      const message = {
        id: `${voiceMessage.id}-seg-${segment.id}`,
        voiceMessageId: voiceMessage.id,
        threadId: thread.id,
        authorId: voiceMessage.author_id,
        author,
        audioPath: looksLikeStoragePath(voiceMessage.audio_url) ? voiceMessage.audio_url : null,
        audioUrl: looksLikeStoragePath(voiceMessage.audio_url) ? null : (voiceMessage.audio_url || null),
        durationMs,
        label: segment.label || clipMessageLabel(segment.transcript),
        transcript: segment.transcript,
        excerpt: clipMessageLabel(segment.transcript),
        startMs: segment.start_ms || 0,
        endMs: segment.end_ms || durationMs,
        sentAt,
        parentMemoId: voiceMessage.id,
        heardByCurrentUser: voiceMessage.author_id === CURRENT_USER.id ? true : !!progress?.heard,
        playedMs: progress?.played_ms || 0,
        heardAt: progress?.last_heard_at ? new Date(progress.last_heard_at).getTime() : null,
      };

      thread.messages.push(message);
      thread.lastActivityAt = Math.max(thread.lastActivityAt || 0, sentAt);

      if (!thread.parentMemoId && voiceMessage.author_id === CURRENT_USER.id) {
        thread.parentMemoId = voiceMessage.id;
        thread.excerpt = clipMessageLabel(segment.transcript);
        thread.transcript = segment.transcript;
        thread.rangeLabel = `${formatMs(segment.start_ms)}-${formatMs(segment.end_ms)}`;
        thread.parentMemoMessage = {
          id: `memo-${thread.id}-${voiceMessage.id}`,
          voiceMessageId: voiceMessage.id,
          threadId: thread.id,
          authorId: voiceMessage.author_id,
          author,
          audioPath: looksLikeStoragePath(voiceMessage.audio_url) ? voiceMessage.audio_url : null,
          audioUrl: looksLikeStoragePath(voiceMessage.audio_url) ? null : (voiceMessage.audio_url || null),
          durationMs: voiceMessage.duration_ms || durationMs,
          label: 'Full memo',
          transcript: '',
          excerpt: '',
          startMs: 0,
          endMs: voiceMessage.duration_ms || durationMs,
          sentAt: new Date(voiceMessage.sent_at).getTime(),
          parentMemoId: voiceMessage.id,
          heardByCurrentUser: true,
        };
      }

      threadMap.set(thread.id, thread);
    }
  }

  const hydratedThreads = [...threadMap.values()]
    .map(thread => ({
      ...thread,
      messages: thread.messages.sort((a, b) => a.sentAt - b.sentAt),
      excerpt: thread.excerpt || clipMessageLabel(thread.messages[0]?.transcript || ''),
      transcript: thread.transcript || thread.messages[0]?.transcript || '',
      rangeLabel: thread.rangeLabel || `${formatMs(thread.messages[0]?.startMs || 0)}-${formatMs(thread.messages[0]?.endMs || 0)}`,
      parentMemoId: thread.parentMemoId || thread.messages[0]?.voiceMessageId || null,
      parentMemoMessage: thread.parentMemoMessage || null,
    }))
    .filter(thread => isVisibleConversationThread(thread))
    .sort((a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0));

  for (const thread of hydratedThreads) {
    if (thread.parentMemoMessage?.audioPath) {
      await ensureMessageAudioUrl(thread.parentMemoMessage);
    }
    for (const message of thread.messages) {
      if (message.audioPath) {
        await ensureMessageAudioUrl(message);
      }
    }
  }

  Store.clear();
  hydratedThreads.forEach(thread => Store.addThread(thread));
  return Store.getThreads();
}

function clipMessageLabel(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).slice(0, 8).join(' ');
}

function clipDebugText(text, maxWords = 24) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ') + '...';
}

function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.round((ms || 0) / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function isVisibleConversationThread(thread) {
  if (!thread || !Array.isArray(thread.messages) || thread.messages.length === 0) return false;

  const userMessages = thread.messages.filter(message => message.authorId === CURRENT_USER.id);
  if (!userMessages.length) return false;

  return !userMessages.every(message => isLegacyDemoText(message.transcript) || isLegacyDemoText(message.label));
}

function isLegacyDemoText(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized ? LEGACY_DEMO_TRANSCRIPTS.has(normalized) : false;
}
