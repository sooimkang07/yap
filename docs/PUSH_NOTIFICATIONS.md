# yAp Push And SMS Notifications

yAp has two notification paths:

- Twilio SMS for the current shareable demo path.
- OneSignal push for optional native iPhone builds when Apple Developer/APNs
  setup is available.

Without Apple Developer setup, use SMS. Native push is not a reliable demo path
for other people's phones.

## Current Demo Mode

Production should use:

```bash
YAP_NOTIFICATION_DELIVERY_MODE=sms
```

In this mode, people receive normal text messages with links back to the web app.
This is the practical way to showcase yAp without TestFlight or App Store
distribution.

## Why OneSignal

- Free mobile push sends for the current prototype scale.
- Easier than wiring APNs directly.
- Lets the backend target users by yAp user id through OneSignal external ids.

OneSignal still requires Apple's APNs setup for real native iPhone pushes.

## OneSignal Setup

1. Create a OneSignal app for iOS.
2. In Xcode, open `yAp-native/yAp.xcodeproj`.
3. Select the `yAp` target and add the OneSignal Swift Package:
   - Package URL: `https://github.com/OneSignal/OneSignal-iOS-SDK`
   - Product: `OneSignalFramework`
4. Select the `yAp` target, then Signing & Capabilities:
   - Add `Push Notifications`
   - Add `Background Modes`
   - Check `Remote notifications`
5. Paste the OneSignal App ID into `yAp-native/yAp/Config/AppConfig.swift`.
6. Run on a physical iPhone and allow notifications.

## Backend Environment

Set these Vercel environment variables:

```bash
ONESIGNAL_APP_ID=your-onesignal-app-id
ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key
YAP_NOTIFICATION_DELIVERY_MODE=push
```

`YAP_NOTIFICATION_DELIVERY_MODE` options:

- `sms`: force SMS only. Use this for the current demo strategy.
- `push`: send OneSignal push when configured; fall back to SMS only if OneSignal is not configured.
- `both`: try push, then also send SMS.

## User Targeting

The iOS app calls `OneSignal.login(userID)` with the current yAp user id.

The backend sends push notifications through `/api/send-message-notifications` using those same ids as OneSignal `external_id` aliases.

For this to work cleanly, the native auth flow should eventually use the persisted backend/Supabase user id, not a temporary local UUID.
