-- ═══════════════════════════════════════════════════════
-- yAp — Migration (safe to re-run)
-- Step 1: Add missing columns to existing tables
-- Step 2: Create missing tables
-- Step 3: Indexes + RLS
-- ═══════════════════════════════════════════════════════

-- ── Step 1: Add columns to existing tables ────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_user_id      UUID        UNIQUE,
  ADD COLUMN IF NOT EXISTS phone_e164        TEXT        UNIQUE,
  ADD COLUMN IF NOT EXISTS email             TEXT,
  ADD COLUMN IF NOT EXISTS initials          TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS created_by  TEXT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS avatar_url  TEXT,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE chat_participants
  ADD COLUMN IF NOT EXISTS role         TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  ADD COLUMN IF NOT EXISTS invited_by   TEXT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS invite_status TEXT NOT NULL DEFAULT 'joined'
    CHECK (invite_status IN ('pending', 'joined', 'left', 'removed')),
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── Step 2: Create missing tables ────────────────────

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

CREATE TABLE IF NOT EXISTS transcripts (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  voice_message_id TEXT        NOT NULL REFERENCES voice_messages(id) ON DELETE CASCADE,
  full_text        TEXT        NOT NULL,
  word_timestamps  JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topic_threads (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  chat_id          TEXT        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  label            TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS playback_progress (
  user_id          TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voice_message_id TEXT        NOT NULL REFERENCES voice_messages(id) ON DELETE CASCADE,
  heard            BOOLEAN     NOT NULL DEFAULT FALSE,
  played_ms        INTEGER     NOT NULL DEFAULT 0,
  last_heard_at    TIMESTAMPTZ,
  PRIMARY KEY (user_id, voice_message_id)
);

-- ── Step 3: Indexes ───────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_phone             ON users(phone_e164);
CREATE INDEX IF NOT EXISTS idx_voice_messages_chat     ON voice_messages(chat_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_topic_segments_thread   ON topic_segments(topic_thread_id);
CREATE INDEX IF NOT EXISTS idx_topic_threads_chat      ON topic_threads(chat_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_playback_user           ON playback_progress(user_id, last_heard_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_chat        ON invitations(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_contact     ON invitations(phone_e164, email);
CREATE INDEX IF NOT EXISTS idx_imported_contacts_owner ON imported_contacts(owner_user_id, created_at DESC);

-- ── Step 4: RLS ───────────────────────────────────────

ALTER TABLE invitations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_threads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_segments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_progress  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "allow_all_users"             ON users             FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_chats"             ON chats             FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_participants"      ON chat_participants  FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_invitations"       ON invitations        FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_imported_contacts" ON imported_contacts  FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_voice_messages"    ON voice_messages     FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_transcripts"       ON transcripts        FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_topic_threads"     ON topic_threads      FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_topic_segments"    ON topic_segments     FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_playback_progress" ON playback_progress  FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
