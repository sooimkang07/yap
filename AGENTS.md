# AGENTS.md

This file is the operating guide for any LLM or coding agent working on yAp.
Read it before editing. Follow it over older assumptions, generic framework
advice, or quick prototype instincts.

## Project Summary

yAp is a voice-first group messaging product. The core experience is:

1. A user signs in with a phone number.
2. They create or join a real group chat.
3. They record and send voice memos.
4. Voice messages are transcribed and segmented into topic threads.
5. Other humans can listen, catch up, reply by voice, and receive notifications.

The goal is a real messaging app, not a visual demo. Features must work end to
end or be hidden until they do.

## Product Goals

- Make voice messaging feel as usable, organized, and responsive as text chat.
- Preserve the warmth and speed of spoken messages while making long voice notes
  easier to skim, play, reply to, and revisit.
- Support real groups, real users, real memberships, real invites, and real
  notification delivery.
- Keep the public demo usable through the web/PWA app plus SMS notifications.
- Continue native iPhone exploration in Swift, but do not assume Apple Developer,
  TestFlight, App Store distribution, or native push will be available.
- Keep the implementation clean, efficient, testable, and understandable enough
  that future LLMs can safely continue the work.

## Non-Negotiable Product Rules

- No fake core flows. Do not ship fake auth, contacts, group creation, search,
  settings, messaging, permissions, playback, or notifications.
- If a visible control exists, it must work, be hidden, or be clearly marked as
  unavailable without pretending.
- Do not hardcode a single current user, single group, or "Sooim is always the
  sender" assumption into new code.
- Human messaging must work without AI. AI is additive for transcription,
  segmentation, summarization, or optional participants.
- Phone number identity matters. Normalize phone numbers before matching,
  inviting, deduping, or persisting contact records.
- SMS is the default demo notification channel. Native push is optional only when
  Apple Developer/APNs setup is explicitly available.
- Protect Supabase usage. Avoid broad polling, unlimited reads, `select('*')`,
  and expensive eager-loading that can spike egress.

## Current Technical Stack

### Web Client

- Static web app:
  - `index.html`
  - `css/styles.css`
  - `js/app.js`
  - `js/core/`
  - `js/features/`
- Progressive-web-app assets:
  - `manifest.webmanifest`
  - `sw.js`
  - `assets/`
- The web app is the primary shareable demo surface because it can be opened by
  other people without App Store/TestFlight distribution.

### Native iOS Client

- Active native app: `yAp-native/`
- Xcode project: `yAp-native/yAp.xcodeproj`
- SwiftUI app source: `yAp-native/yAp/`
- Current native stack:
  - SwiftUI for screens and navigation
  - `URLSession` for backend calls
  - `Contacts.framework` for contact import
  - `AVFoundation` for recording/playback
  - OneSignal iOS SDK for push notification registration

### Backend

- Vercel serverless functions in `api/`
- Existing backend responsibilities:
  - phone OTP send/verify
  - audio processing
  - transcription and segmentation
  - AI reply generation and synthesis
  - SMS invites
  - push/SMS message notifications
  - health checks
- Shared helpers:
  - `api/_env.js`
  - `api/_twilio.js`
  - `api/_onesignal.js`

### Database and Storage

- Supabase is the source of truth for app data.
- Schema files live in `supabase/`:
  - `schema.sql`
  - `migrate.sql`
  - `seed.sql`
- Expected persisted domains:
  - users
  - groups
  - group members
  - invitations
  - contacts
  - messages
  - message segments/topic threads
  - playback/heard state
  - notification state/preferences

### Third-Party Services

- Supabase: database, auth-adjacent app data, storage, realtime where needed.
- Vercel: serverless deployment.
- Twilio: phone OTP and SMS invite/fallback flows.
- OneSignal: optional native push notifications if Apple Developer/APNs setup is
  available.
- OpenAI or compatible AI APIs: transcription, segmentation, reply generation,
  synthesis, and related AI features where configured.

## Repository Map

- `README.md`: high-level repo overview.
- `APP_FLOW.md`: product brief, PRD, flows, launch criteria.
- `index.html`: web app shell.
- `css/`: web styling.
- `js/`: web app logic.
  - `js/core/config.js`: runtime flags and service config.
  - `js/core/data.js`: persistence and Supabase/backend data access.
  - `js/core/utils.js`: shared helpers.
  - `js/features/`: recording, pipeline, analysis, chat behavior.
- `api/`: Vercel serverless endpoints.
- `assets/`: shared web assets and icons.
- `components/voice-visualizer/`: standalone visualizer component/runtime.
- `supabase/`: SQL schema, migration, and seed files.
- `docs/`: implementation and migration notes.
- `yAp-native/`: active native iOS app.
- `yap-ios/`: older/untracked native experiment unless the user explicitly asks
  to work there.

## Active Demo Direction

The active shareable demo direction is the web/PWA app plus SMS invite and
message links. This is the realistic path when Apple Developer setup is not
available.

The Swift app in `yAp-native/` remains important as:

- native product concept
- personal-device prototype
- future iOS implementation reference
- Swift architecture exploration

When a feature must be demoed to other people, make sure the web/SMS path works.
When a feature is explicitly native-only or exploratory, work in `yAp-native/`.

## Architecture Principles

- Keep UI thin. Views should render state and call services, not embed backend
  protocol logic or persistence rules.
- Keep service boundaries clear:
  - Swift service objects under `yAp-native/yAp/Core/Services/`
  - JS backend helpers under `api/_*.js`
  - web data logic under `js/core/data.js`
- Prefer small, explicit data models over loosely shaped objects.
- Avoid duplicating business rules across clients. If a rule must be shared,
  document it and prefer backend enforcement.
- Prefer simple code over clever code. Add abstractions only when they remove
  meaningful duplication or match an existing local pattern.
- Preserve compatibility between web and native clients when touching API
  contracts.

## Cleanliness and Efficiency Standards

- Do not add new dependencies unless they clearly reduce complexity or are
  required for the domain.
- Do not introduce background polling without a hard cap, minimum interval, and
  clear reason.
- Do not fetch more data than a screen needs.
- Do not use `select('*')` for Supabase reads in app-facing code. Select fields
  intentionally.
- Add pagination/limits for chat history, contacts, and notifications.
- Keep functions short enough to understand. Extract helpers when they clarify
  behavior, not just to create more files.
- Delete dead code when replacing it, unless the user explicitly wants history
  preserved.
- Do not commit local machine state, Xcode user state, secrets, build output, or
  generated caches.
- Preserve existing user changes. Never reset, checkout, or delete unrelated
  work without explicit permission.

## Security and Secrets

- Never put server secrets in client code.
- Never commit API keys, OneSignal REST keys, Twilio auth tokens, Supabase service
  role keys, OpenAI keys, or Vercel tokens.
- OneSignal App ID is allowed in the iOS client. OneSignal REST API key is
  server-only.
- Use Vercel environment variables for production secrets.
- Prefer `.env.local` or Vercel env pull for local development, but do not commit
  local env files.
- Treat phone numbers as sensitive user data. Avoid logging full phone numbers
  unless debugging locally and explicitly needed.
- Invite tokens must be unguessable and scoped to the intended group/user flow.

## Notifications

yAp's current no-Apple-Developer demo strategy uses Twilio SMS as the real
notification channel. OneSignal/native push is optional and should not be relied
on for demos unless Apple Developer/APNs setup is explicitly available.

Backend env vars:

- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`
- `YAP_NOTIFICATION_DELIVERY_MODE`

Delivery modes:

- `sms`: force Twilio SMS. This is the default demo mode.
- `push`: send OneSignal push when configured; fallback to SMS only if OneSignal
  is not configured.
- `both`: send push and SMS.

Rules:

- Do not expose the OneSignal REST API key in Swift or browser code.
- Push recipient IDs must be stable backend user IDs, not temporary local UUIDs.
- Native push requires Apple Developer/APNs setup and must be tested on a
  physical iPhone; simulator success is only a compile/integration check.
- Keep SMS invite and message notification flows working at all times.

## Supabase Usage Rules

The project has already hit Supabase free-plan egress limits. Be careful.

- Avoid broad conversation preloads.
- Avoid aggressive sync intervals.
- Keep chat refresh intervals conservative.
- Limit message previews and history reads.
- Cache conversation reads where appropriate.
- Prefer targeted queries with explicit columns.
- Add server-side endpoints when a client query becomes complex or expensive.
- Before adding realtime subscriptions or polling, define the expected usage and
  how it will be bounded.

## Web App Rules

- Keep the web app mobile-first and messaging-focused.
- Do not add marketing/landing-page structure unless explicitly requested.
- Existing visual assets should be reused before adding new ones.
- Avoid decorative UI that makes the app feel less like a messaging tool.
- Keep controls functional and compact.
- Respect existing module boundaries:
  - screen orchestration in `js/app.js`
  - shared data/config in `js/core/`
  - recording/chat/pipeline behavior in `js/features/`

## Native iOS Rules

- Work in `yAp-native/`, not `yap-ios/`, unless explicitly instructed.
- Keep SwiftUI views focused on presentation and interaction.
- Put reusable service logic in `Core/Services/`.
- Put reusable models in `Core/Models/`.
- Put theme/style primitives in `Core/DesignSystem/`.
- Prefer async/await and typed request/response structs for new network calls.
- Test permissions, recording, playback, contacts, and push on a real iPhone
  when behavior matters.
- Do not rely on iOS-only APIs that are unavailable to third-party apps. For
  example, iOS does not expose the user's "Me" card to apps.
- If Xcode adds package resolution files such as `Package.resolved`, keep the
  shared package resolution file and do not commit user-specific window state.

## Backend API Rules

- Keep Vercel route files focused on request parsing, validation, calling helpers,
  and returning responses.
- Put reusable provider logic in underscore helpers such as `_twilio.js` and
  `_onesignal.js`.
- Validate required input and return useful errors.
- Avoid leaking provider errors with secrets or overly raw payloads.
- Preserve backwards compatibility for existing web/native clients unless the
  task explicitly includes a migration.
- Run `node --check` on edited API files.

## Data Model Rules

For new or changed app data, consider:

- Who owns this record?
- Which group/chat can access it?
- Does row-level security need updating?
- What is the stable ID used by web, native, notifications, and backend jobs?
- What happens when a pending invite becomes a registered user?
- What are the retry/failure states?
- How is the read bounded to avoid Supabase egress spikes?

## Verification Checklist

Choose the smallest meaningful verification set for the change.

For backend JS changes:

```bash
node --check api/<file>.js
```

For web JS changes:

```bash
node --check js/core/<file>.js
node --check js/features/<file>.js
```

For native iOS changes:

```bash
xcodebuild -project yAp-native/yAp.xcodeproj -scheme yAp -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /private/tmp/yap-derived build
```

For deploy-affecting backend/web changes:

```bash
npx vercel --prod --yes
```

Only deploy when the user wants the change live or when the task clearly requires
production to be updated.

## Git and File Hygiene

- Keep commits focused and human-readable.
- Do not stage unrelated files.
- Do not commit:
  - `.env*`
  - `.DS_Store`
  - Xcode `xcuserdata/`
  - local screenshots
  - build outputs
  - temporary folders
  - unrelated experimental folders
- Current known unrelated local items may exist:
  - `api/debug.js`
  - `yap-ios/`
  - `yAp-native/yAp.xcodeproj/project.xcworkspace/xcuserdata/...`
- Leave unrelated local items alone unless the user asks.

## When Unsure

1. Read the nearby code and docs before editing.
2. Prefer the existing architecture over inventing a new one.
3. Ask only if the next step cannot be inferred safely.
4. Make the smallest complete change that moves the real product forward.
5. Verify the changed surface.
6. Document any important remaining caveat in the final response.
