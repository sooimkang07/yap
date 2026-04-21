-- ═══════════════════════════════════════════════════════
-- yAp — Database Schema
-- Run this in your Supabase SQL editor
-- ═══════════════════════════════════════════════════════

-- ── Users ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  name        TEXT        NOT NULL,
  color_hex   TEXT        NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Chats ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chats (
  id          TEXT PRIMARY KEY,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Chat participants ──────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id     TEXT REFERENCES chats(id)  ON DELETE CASCADE,
  user_id     TEXT REFERENCES users(id)  ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

-- ── Voice messages ─────────────────────────────────────
-- Phase 1: status = 'processing' after upload.
-- Phase 2+ Edge Function updates to 'done' after transcription.
CREATE TABLE IF NOT EXISTS voice_messages (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  chat_id     TEXT        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  author_id   TEXT        NOT NULL REFERENCES users(id),
  audio_url   TEXT,
  duration_ms INTEGER,
  status      TEXT        NOT NULL DEFAULT 'processing'
                CHECK (status IN ('processing', 'done', 'failed')),
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Transcripts ────────────────────────────────────────
-- Phase 2+: created by Edge Function after Whisper runs.
CREATE TABLE IF NOT EXISTS transcripts (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  voice_message_id  TEXT NOT NULL REFERENCES voice_messages(id) ON DELETE CASCADE,
  full_text         TEXT NOT NULL,
  word_timestamps   JSONB,   -- [{ word, start_ms, end_ms }]
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Topic threads ──────────────────────────────────────
-- Each thread = one ongoing conversational topic in a chat.
CREATE TABLE IF NOT EXISTS topic_threads (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  chat_id          TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  label            TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Topic segments ─────────────────────────────────────
-- A segment is a slice of a voice message that belongs to a thread.
CREATE TABLE IF NOT EXISTS topic_segments (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  voice_message_id TEXT NOT NULL REFERENCES voice_messages(id) ON DELETE CASCADE,
  topic_thread_id  TEXT REFERENCES topic_threads(id),
  label            TEXT NOT NULL,
  transcript       TEXT NOT NULL,
  start_ms         INTEGER NOT NULL DEFAULT 0,
  end_ms           INTEGER NOT NULL,
  embedding        VECTOR(1536),   -- populated by Edge Function (Phase 6)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Playback progress ──────────────────────────────────
-- Tracks which voice messages each user has heard.
CREATE TABLE IF NOT EXISTS playback_progress (
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voice_message_id TEXT NOT NULL REFERENCES voice_messages(id) ON DELETE CASCADE,
  heard            BOOLEAN NOT NULL DEFAULT FALSE,
  played_ms        INTEGER NOT NULL DEFAULT 0,
  last_heard_at    TIMESTAMPTZ,
  PRIMARY KEY (user_id, voice_message_id)
);

-- ── Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_voice_messages_chat   ON voice_messages(chat_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_topic_segments_thread ON topic_segments(topic_thread_id);
CREATE INDEX IF NOT EXISTS idx_topic_threads_chat    ON topic_threads(chat_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_playback_user         ON playback_progress(user_id, last_heard_at DESC);

-- ── Row Level Security ─────────────────────────────────
-- Enable RLS (tighten in production; open for Phase 1 demo)
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_threads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_segments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_progress  ENABLE ROW LEVEL SECURITY;

-- Phase 1: allow all for demo (replace with auth-based policies later)
CREATE POLICY "allow_all_users"             ON users             FOR ALL USING (true);
CREATE POLICY "allow_all_chats"             ON chats             FOR ALL USING (true);
CREATE POLICY "allow_all_participants"      ON chat_participants  FOR ALL USING (true);
CREATE POLICY "allow_all_voice_messages"    ON voice_messages     FOR ALL USING (true);
CREATE POLICY "allow_all_transcripts"       ON transcripts        FOR ALL USING (true);
CREATE POLICY "allow_all_topic_threads"     ON topic_threads      FOR ALL USING (true);
CREATE POLICY "allow_all_topic_segments"    ON topic_segments     FOR ALL USING (true);
CREATE POLICY "allow_all_playback_progress" ON playback_progress  FOR ALL USING (true);

-- ── Storage bucket ─────────────────────────────────────
-- Create manually in Supabase dashboard:
--   Storage > New bucket > Name: "voice-messages" > Public: OFF
-- Then add a policy: allow all operations for Phase 1 demo
