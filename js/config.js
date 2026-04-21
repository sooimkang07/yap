// ═══════════════════════════════════════════════════════
// yAp — Supabase Configuration
// ═══════════════════════════════════════════════════════
//
// 1. Create a project at https://supabase.com
// 2. Run supabase/schema.sql in the SQL editor
// 3. Run supabase/seed.sql in the SQL editor
// 4. Create a Storage bucket named "voice-messages" (private)
// 5. Paste your project URL and anon key below

const SUPABASE_URL      = 'https://maigiwxpyganbhpwbejd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1haWdpd3hweWdhbmJocHdiZWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMDU5NzUsImV4cCI6MjA5MTg4MTk3NX0.7I1jRIXrd7IsLxAkqIeT8VZgwNDA2BjBdQBsCVmXe1Y';

// Server endpoint for production-safe audio processing.
// OpenAI credentials now stay server-side in Vercel environment variables.
const YAP_PROCESS_AUDIO_ENDPOINT = '/api/process-audio';
const YAP_GENERATE_REPLIES_ENDPOINT = '/api/generate-replies';
const YAP_SYNTHESIZE_REPLY_ENDPOINT = '/api/synthesize-reply';
const YAP_DEV_ALLOW_MOCK_FALLBACK = false;

// Current user (hardcoded for Phase 1 — replaced by auth in Phase 0/later)
const CURRENT_USER = {
  id:       'user-sooim-000000000001',
  name:     'sooim',
  color:    '#B8D8FF',
  initials: 'S',
};

// Active chat for Phase 1 demo
const ACTIVE_CHAT_ID = 'chat-besties-000000000010';
