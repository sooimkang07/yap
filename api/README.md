# API

Serverless endpoints used by the web app.

## Files

- `send-phone-code.js`: send OTP via Twilio Verify
- `verify-phone-code.js`: verify OTP
- `send-invites.js`: send invite SMS links
- `send-message-notifications.js`: send SMS or push re-engagement notifications
- `_onesignal.js`: shared OneSignal push notification helper
- `process-audio.js`: transcribe and segment uploaded voice memos
- `generate-replies.js`: generate friend-style replies and audio
- `synthesize-reply.js`: synthesize standalone reply audio
- `health.js`: lightweight backend readiness check
- `_env.js`: local env loader for Vercel-style local development
- `_twilio.js`: shared Twilio helpers

## Push Notification Environment

For the no-Apple-Developer demo path, force SMS:

```bash
YAP_NOTIFICATION_DELIVERY_MODE=sms
```

OneSignal push sends are enabled when these environment variables are present
and delivery mode is `push` or `both`:

- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`
- `YAP_NOTIFICATION_DELIVERY_MODE=push`

Use `YAP_NOTIFICATION_DELIVERY_MODE=both` to send push and SMS, or `sms` to force the Twilio-only behavior.
