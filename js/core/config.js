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
const YAP_SEND_INVITES_ENDPOINT = '/api/send-invites';
const YAP_SEND_MESSAGE_NOTIFICATIONS_ENDPOINT = '/api/send-message-notifications';
const YAP_PROCESS_NOTIFICATION_JOBS_ENDPOINT = '/api/process-notification-jobs';
const YAP_SEND_PHONE_CODE_ENDPOINT = '/api/send-phone-code';
const YAP_VERIFY_PHONE_CODE_ENDPOINT = '/api/verify-phone-code';
const YAP_HEALTH_ENDPOINT = '/api/health';

// Supabase sync enabled for real-time data fetching
const YAP_SUPABASE_REMOTE_SYNC_ENABLED = true;
const YAP_SUPABASE_PRELOAD_CONVERSATIONS = false;
const YAP_SUPABASE_SYNC_INTERVAL_MS = 60_000;
const YAP_SUPABASE_CHAT_REFRESH_MIN_MS = 30_000;
const YAP_SUPABASE_MAX_CHAT_PREVIEW_MESSAGES = 100;
const YAP_SUPABASE_MAX_CONVERSATION_MESSAGES = 50;
const YAP_SUPABASE_MAX_IMPORTED_CONTACTS = 300;
const YAP_SUPABASE_CONVERSATION_CACHE_TTL_MS = 60_000;

// Session storage keys
const APP_SESSION_STORAGE_KEY = 'yap.session.currentUserId';
const APP_AUTH_SESSION_STORAGE_KEY = 'yap.session.auth';

// No default test users — all accounts are real
const APP_DEFAULT_CURRENT_USER_ID = null;
const ACTIVE_CHAT_ID = null;
