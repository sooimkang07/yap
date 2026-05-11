-- ═══════════════════════════════════════════════════════
-- yAp — Full Database Schema
-- Safe to run on a fresh Supabase project.
-- For existing projects, run supabase/migrate.sql instead.
-- ═══════════════════════════════════════════════════════

-- ── Users ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                TEXT        PRIMARY KEY,
  name              TEXT        NOT NULL,
  color_hex         TEXT        NOT NULL,
  avatar_url        TEXT,
  auth_user_id      UUID        UNIQUE,
  phone_e164        TEXT        UNIQUE,
  email             TEXT,
  initials          TEXT,
  profile_completed BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Chats ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chats (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL,
  created_by  TEXT        REFERENCES users(id),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Chat participants ──────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id       TEXT        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id       TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT        NOT NULL DEFAULT 'member'
                            CHECK (role IN ('owner', 'admin', 'member')),
  invite_status TEXT        NOT NULL DEFAULT 'joined'
                            CHECK (invite_status IN ('pending', 'joined', 'left', 'removed')),
  mute_alerts   BOOLEAN     NOT NULL DEFAULT FALSE,
  invited_by    TEXT        REFERENCES users(id),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

-- ── Invitations ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  chat_id       TEXT        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  inviter_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_name  TEXT,
  phone_e164    TEXT,
  email         TEXT,
  invite_token  TEXT        NOT NULL UNIQUE,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'sent', 'accepted', 'revoked', 'expired')),
  accepted_by   TEXT        REFERENCES users(id) ON DELETE SET NULL,
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invitations_contact_required CHECK (phone_e164 IS NOT NULL OR email IS NOT NULL)
);

-- ── Imported contacts ─────────────────────────────────
CREATE TABLE IF NOT EXISTS imported_contacts (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  owner_user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source            TEXT        NOT NULL
                                CHECK (source IN ('device', 'google', 'icloud_vcard', 'manual')),
  source_contact_id TEXT,
  display_name      TEXT,
  phone_e164        TEXT,
  email             TEXT,
  avatar_url        TEXT,
  matched_user_id   TEXT        REFERENCES users(id) ON DELETE SET NULL,
  invited_chat_id   TEXT        REFERENCES chats(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Voice messages ────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_messages (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  chat_id     TEXT        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  author_id   TEXT        NOT NULL REFERENCES users(id),
  audio_url   TEXT,
  duration_ms INTEGER,
  status      TEXT        NOT NULL DEFAULT 'processing'
                          CHECK (status IN ('processing', 'done', 'failed')),
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Transcripts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS transcripts (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  voice_message_id TEXT        NOT NULL REFERENCES voice_messages(id) ON DELETE CASCADE,
  full_text        TEXT        NOT NULL,
  word_timestamps  JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Topic threads ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS topic_threads (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  chat_id          TEXT        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  label            TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Topic segments ────────────────────────────────────
CREATE TABLE IF NOT EXISTS topic_segments (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  voice_message_id TEXT        NOT NULL REFERENCES voice_messages(id) ON DELETE CASCADE,
  topic_thread_id  TEXT        REFERENCES topic_threads(id),
  label            TEXT        NOT NULL,
  transcript       TEXT        NOT NULL,
  start_ms         INTEGER     NOT NULL DEFAULT 0,
  end_ms           INTEGER     NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Playback progress ─────────────────────────────────
CREATE TABLE IF NOT EXISTS playback_progress (
  user_id          TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voice_message_id TEXT        NOT NULL REFERENCES voice_messages(id) ON DELETE CASCADE,
  heard            BOOLEAN     NOT NULL DEFAULT FALSE,
  played_ms        INTEGER     NOT NULL DEFAULT 0,
  last_heard_at    TIMESTAMPTZ,
  PRIMARY KEY (user_id, voice_message_id)
);

-- ── Notification delivery jobs ────────────────────────
CREATE TABLE IF NOT EXISTS notification_jobs (
  id                   TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  chat_id              TEXT        REFERENCES chats(id) ON DELETE CASCADE,
  voice_message_id     TEXT        REFERENCES voice_messages(id) ON DELETE CASCADE,
  invitation_id        TEXT        REFERENCES invitations(id) ON DELETE CASCADE,
  recipient_user_id    TEXT        REFERENCES users(id) ON DELETE SET NULL,
  recipient_phone_e164 TEXT        NOT NULL,
  recipient_name       TEXT,
  sender_user_id       TEXT        REFERENCES users(id) ON DELETE SET NULL,
  sender_name          TEXT,
  chat_name            TEXT,
  kind                 TEXT        NOT NULL DEFAULT 'message'
                                     CHECK (kind IN ('message', 'reply', 'chat_invite')),
  thread_label         TEXT,
  transcript           TEXT,
  target_url           TEXT,
  channel              TEXT        NOT NULL DEFAULT 'sms'
                                     CHECK (channel IN ('sms', 'push')),
  status               TEXT        NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempt_count        INTEGER     NOT NULL DEFAULT 0,
  last_error           TEXT,
  next_attempt_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_voice_messages_chat     ON voice_messages(chat_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_topic_segments_thread   ON topic_segments(topic_thread_id);
CREATE INDEX IF NOT EXISTS idx_topic_threads_chat      ON topic_threads(chat_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_playback_user           ON playback_progress(user_id, last_heard_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_phone             ON users(phone_e164);
CREATE INDEX IF NOT EXISTS idx_invitations_chat        ON invitations(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_contact     ON invitations(phone_e164, email);
CREATE INDEX IF NOT EXISTS idx_imported_contacts_owner ON imported_contacts(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_pending ON notification_jobs(status, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_chat    ON notification_jobs(chat_id, created_at DESC);

-- ── Realtime ──────────────────────────────────────────
-- Required for Supabase postgres_changes subscriptions used by the web app.
DO $$
DECLARE
  realtime_table TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH realtime_table IN ARRAY ARRAY[
      'chats',
      'chat_participants',
      'voice_messages',
      'topic_threads',
      'topic_segments',
      'transcripts',
      'playback_progress'
    ]::TEXT[] LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = realtime_table
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', realtime_table);
      END IF;
    END LOOP;
  END IF;
END $$;

-- ── Row Level Security ────────────────────────────────
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_threads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_segments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_jobs  ENABLE ROW LEVEL SECURITY;

-- Open policies for Phase 1 (tighten before production)
DO $$ BEGIN CREATE POLICY "allow_all_users"             ON users             FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_chats"             ON chats             FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_participants"      ON chat_participants  FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_voice_messages"    ON voice_messages     FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_transcripts"       ON transcripts        FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_topic_threads"     ON topic_threads      FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_topic_segments"    ON topic_segments     FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_playback_progress" ON playback_progress  FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_invitations"       ON invitations        FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_imported_contacts" ON imported_contacts  FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_notification_jobs" ON notification_jobs  FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Storage ───────────────────────────────────────────
-- Create manually in Supabase dashboard:
--   Storage > New bucket > Name: "voice-messages" > Public: OFF
--   Add policy: allow all for authenticated (Phase 1)
