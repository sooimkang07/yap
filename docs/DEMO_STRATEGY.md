# yAp Demo Strategy Without Apple Developer

This project should be demoed as a web/PWA messaging app with SMS notifications
unless Apple Developer setup becomes available.

## Why

Native iPhone distribution to other people requires Apple Developer setup for
TestFlight, App Store distribution, and APNs-backed push notification delivery.
If that setup is not available, the Swift app can still be built locally, but it
is not the practical way to share yAp with classmates, reviewers, or test users.

## Current Demo Path

Use:

- Web app: `https://yap-murex.vercel.app`
- Backend: Vercel serverless API routes in `api/`
- Database: Supabase
- Notifications: Twilio SMS
- Native concept: `yAp-native/`

The demo should show:

1. Open the web app on a phone.
2. Sign in or complete the current auth flow.
3. Create/open a group.
4. Record a voice memo.
5. Process/transcribe/segment the memo.
6. Send invite or message notification by SMS.
7. Recipient taps the SMS link and returns to the web app.

## Notification Behavior

Production should use:

```bash
YAP_NOTIFICATION_DELIVERY_MODE=sms
```

SMS notifications appear in the user's Messages app, not as yAp app push
notifications.

Example:

```text
Sooim sent a new yAp in "Besties". Open: https://yap-murex.vercel.app/...
```

## Role Of The Swift App

The Swift app remains useful as:

- a native UX prototype
- a local iPhone build for personal demos
- a future implementation path if Apple Developer setup becomes available
- a way to explore native recording, contacts, playback, and push code

Do not treat the Swift app as the main distribution path unless the user
explicitly says Apple Developer/TestFlight/App Store is now available.

## Agent Rules

- Prioritize the web/SMS path for showcase-critical features.
- Keep native code clean, but do not block demo readiness on native-only
  features.
- Preserve SMS invites and message notifications even if push code exists.
- Do not tell users they can install the Swift app on their phones unless there
  is a clear distribution mechanism.
- Do not rely on OneSignal push for demo users without Apple Developer/APNs.

