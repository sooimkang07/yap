# SKILLS.md

This file describes repeatable workflows for agents working on yAp. Use these as
task recipes alongside `AGENTS.md`.

## Skill: Orient To The Project

Use when starting a new session or after a large context reset.

1. Read `AGENTS.md`.
2. Skim `README.md`.
3. If product behavior matters, read `APP_FLOW.md`.
4. If demo/distribution behavior matters, read `docs/DEMO_STRATEGY.md`.
5. If native iOS behavior matters, read `yAp-native/README.md`.
6. If notifications matter, read `docs/PUSH_NOTIFICATIONS.md`.
7. If UI parity matters, inspect the relevant web files in `index.html`,
   `css/styles.css`, `js/`, and `assets/`.
8. Run `git status --short` and avoid unrelated local changes.
9. Identify whether the task belongs to:
   - web client
   - native iOS client
   - backend API
   - Supabase schema
   - docs/product planning

## Skill: Add Or Change A Backend API Route

Use for Vercel route changes under `api/`.

1. Read the target route and any helper it imports.
2. Keep provider-specific logic in helper files such as `_twilio.js` or
   `_onesignal.js`.
3. Validate input at the route boundary.
4. Return stable JSON shapes that existing clients can handle.
5. Avoid leaking secrets or raw provider credentials in errors.
6. Run:

```bash
node --check api/<changed-file>.js
```

7. If production behavior must change, deploy with:

```bash
npx vercel --prod --yes
```

## Skill: Work On Native iOS

Use for changes under `yAp-native/`.

1. Work in `yAp-native/`, not `yap-ios/`.
2. Treat the web app as the canonical UI. Before editing a Swift screen, inspect
   the matching web screen, CSS, assets, and interaction behavior.
3. Replicate the web UI as closely as SwiftUI allows. Avoid generic native
   redesigns unless the user explicitly asks for them.
4. Keep SwiftUI views focused on UI.
5. Put reusable app logic in:
   - `Core/Services/`
   - `Core/Models/`
   - `Core/Utilities/`
   - `Core/DesignSystem/`
6. Avoid secrets in Swift. App IDs are okay; REST/API secrets are not.
7. For push, remember real delivery requires Apple Developer/APNs setup and a
   physical iPhone. Without that setup, demo through the web/SMS path.
8. Build-check with:

```bash
xcodebuild -project yAp-native/yAp.xcodeproj -scheme yAp -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /private/tmp/yap-derived build
```

9. Do not commit Xcode `xcuserdata/` changes.

## Skill: Work On The Web Client

Use for changes under `index.html`, `css/`, `js/`, `assets/`, or `components/`.

1. Keep the app mobile-first and messaging-first.
2. Preserve the web app as the UI north star for the whole project.
3. Do not add fake controls.
4. Respect the current module split:
   - `js/app.js` for orchestration and screen wiring
   - `js/core/` for config/data/utilities
   - `js/features/` for recording, chat, analysis, and pipeline behavior
5. Keep Supabase reads narrow and bounded.
6. Reuse existing assets before adding new ones.
7. Run `node --check` on changed JS files where applicable.

## Skill: Add Data Or Supabase Behavior

Use for schema, persistence, membership, invite, or chat state work.

1. Read `supabase/schema.sql` and `supabase/migrate.sql`.
2. Decide whether the change is:
   - new fresh schema
   - additive migration
   - seed/demo data
   - app query/API behavior only
3. Preserve row ownership and group membership access rules.
4. Avoid unbounded reads and broad `select('*')`.
5. Normalize phone numbers before matching contacts or invites.
6. Think through pending invite to registered user transitions.

## Skill: Add Or Change Notifications

Use for OneSignal, Twilio SMS, invites, or message re-engagement.

1. Read `docs/PUSH_NOTIFICATIONS.md`.
2. Read `docs/DEMO_STRATEGY.md` if the change affects demos.
3. Keep OneSignal REST API key server-side only.
4. Keep OneSignal App ID in client config only where needed.
5. Preserve SMS invite behavior.
6. Ensure backend push targets use stable yAp user ids.
7. Keep `YAP_NOTIFICATION_DELIVERY_MODE` behavior intact:
   - `push`
   - `sms`
   - `both`
8. Use `sms` for the current no-Apple-Developer demo mode.
9. Verify edited API files with `node --check`.

## Skill: Review For Real Product Quality

Use before considering a task done.

Ask:

- Does every visible control work?
- Did this introduce a hardcoded user, group, or sender assumption?
- If Swift UI changed, does it faithfully match the web app UI?
- Are reads bounded and efficient?
- Are secrets kept out of client code and git?
- Does native code build?
- Do backend files parse?
- Did I leave unrelated local changes untouched?
- Is the remaining caveat clearly documented?
