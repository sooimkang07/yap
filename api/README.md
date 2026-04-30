# API

Serverless endpoints used by the web app.

## Files

- `send-phone-code.js`: send OTP via Twilio Verify
- `verify-phone-code.js`: verify OTP
- `send-invites.js`: send invite SMS links
- `send-message-notifications.js`: send SMS re-engagement notifications
- `process-audio.js`: transcribe and segment uploaded voice memos
- `generate-replies.js`: generate friend-style replies and audio
- `synthesize-reply.js`: synthesize standalone reply audio
- `health.js`: lightweight backend readiness check
- `_env.js`: local env loader for Vercel-style local development
- `_twilio.js`: shared Twilio helpers
