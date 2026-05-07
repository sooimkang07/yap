# yAp Native

This is the active native iPhone project for yAp.

## Structure

- `yAp/`: Swift source and app assets
- `yAp.xcodeproj/`: Xcode project

## Setup

1. Open `yAp-native/yAp.xcodeproj` in Xcode.
2. Update signing and bundle identifier.
3. Set the backend base URL in `yAp/Config/AppConfig.swift`.
4. For push notifications, add the OneSignal Swift Package in Xcode and paste the OneSignal App ID into `yAp/Config/AppConfig.swift`.
5. Run on a physical iPhone for auth, contacts, recording, push notifications, and playback testing.

See `../docs/PUSH_NOTIFICATIONS.md` for the OneSignal setup checklist.
