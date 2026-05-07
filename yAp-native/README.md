# yAp Native

This is the native iPhone concept project for yAp.

The current shareable demo path is the web app plus SMS notifications because
Apple Developer/TestFlight/App Store distribution is not assumed to be available.
Use this native project for local Swift development and personal-device demos.

The web app is the UI north star. Swift screens should match the web app's
visual design, assets, spacing, voice controls, chat flow, and interaction model
as closely as possible. Do not replace yAp's web design with generic iOS default
screens unless the user explicitly requests that direction.

## Structure

- `yAp/`: Swift source and app assets
- `yAp.xcodeproj/`: Xcode project

## Setup

1. Open `yAp-native/yAp.xcodeproj` in Xcode.
2. Before editing UI, compare against the corresponding web screen in
   `../index.html`, `../css/styles.css`, `../js/`, and `../assets/`.
3. Update signing and bundle identifier.
4. Set the backend base URL in `yAp/Config/AppConfig.swift`.
5. For push notifications, add the OneSignal Swift Package in Xcode and paste the OneSignal App ID into `yAp/Config/AppConfig.swift`.
6. Run on a physical iPhone for auth, contacts, recording, and playback testing.
   Push notification testing requires Apple Developer/APNs setup.

See `../docs/PUSH_NOTIFICATIONS.md` for the OneSignal setup checklist.
See `../docs/DEMO_STRATEGY.md` for the no-Apple-Developer showcase plan.
