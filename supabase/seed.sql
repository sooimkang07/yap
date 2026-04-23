-- ═══════════════════════════════════════════════════════
-- yAp — Seed Data
-- Run AFTER schema.sql
-- ═══════════════════════════════════════════════════════

-- ── Users ─────────────────────────────────────────────
INSERT INTO users (id, name, color_hex, phone_e164, initials, profile_completed) VALUES
  ('user-sooim-000000000001', 'sooim', '#B8D8FF', '+15555550101', 'S', true),
  ('user-chloe-000000000002', 'Chloe', '#DEC0F8', '+15555550102', 'C', true),
  ('user-maria-000000000003', 'Maria', '#FFDEB8', '+15555550103', 'M', true)
ON CONFLICT (id) DO NOTHING;

-- ── Besties chat ───────────────────────────────────────
INSERT INTO chats (id, name, created_by) VALUES
  ('chat-besties-000000000010', 'besties 👋', 'user-sooim-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ── Participants ───────────────────────────────────────
INSERT INTO chat_participants (chat_id, user_id, role, invite_status) VALUES
  ('chat-besties-000000000010', 'user-sooim-000000000001', 'owner', 'joined'),
  ('chat-besties-000000000010', 'user-chloe-000000000002', 'member', 'joined'),
  ('chat-besties-000000000010', 'user-maria-000000000003', 'member', 'joined')
ON CONFLICT DO NOTHING;

-- ── Imported contacts ─────────────────────────────────
INSERT INTO imported_contacts (owner_user_id, source, display_name, phone_e164, matched_user_id) VALUES
  ('user-sooim-000000000001', 'manual', 'Chloe', '+15555550102', 'user-chloe-000000000002'),
  ('user-sooim-000000000001', 'manual', 'Maria', '+15555550103', 'user-maria-000000000003')
ON CONFLICT DO NOTHING;
