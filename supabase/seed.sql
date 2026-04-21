-- ═══════════════════════════════════════════════════════
-- yAp — Seed Data
-- Run AFTER schema.sql
-- ═══════════════════════════════════════════════════════

-- ── Users ─────────────────────────────────────────────
INSERT INTO users (id, name, color_hex) VALUES
  ('user-sooim-000000000001', 'sooim', '#B8D8FF'),
  ('user-chloe-000000000002', 'Chloe', '#DEC0F8'),
  ('user-maria-000000000003', 'Maria', '#FFDEB8')
ON CONFLICT (id) DO NOTHING;

-- ── Besties chat ───────────────────────────────────────
INSERT INTO chats (id, name) VALUES
  ('chat-besties-000000000010', 'besties 👋')
ON CONFLICT (id) DO NOTHING;

-- ── Participants ───────────────────────────────────────
INSERT INTO chat_participants (chat_id, user_id) VALUES
  ('chat-besties-000000000010', 'user-sooim-000000000001'),
  ('chat-besties-000000000010', 'user-chloe-000000000002'),
  ('chat-besties-000000000010', 'user-maria-000000000003')
ON CONFLICT DO NOTHING;
