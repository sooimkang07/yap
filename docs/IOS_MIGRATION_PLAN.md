# yAp iOS Migration Plan

## Goal
Ship a real iPhone-native build of yAp that runs on your personal device within 7 days, without waiting for App Store review or broad distribution.

This plan assumes:
- the current web repo remains the backend/reference product
- the iOS client is the only new client we actively build this week
- the app only needs to run on your iPhone via Xcode + your personal Apple ID team

## What Stays
Keep these parts of the current repo as the backend/product source of truth:
- `supabase/schema.sql`
- `supabase/seed.sql`
- `api/process-audio.js`
- `api/generate-replies.js`
- `api/synthesize-reply.js`
- `api/send-invites.js`
- `api/send-message-notifications.js`
- `api/send-phone-code.js`
- `api/verify-phone-code.js`

Keep using:
- Supabase for auth-adjacent app data, chats, memberships, storage, and playback state
- Twilio for OTP and SMS invite/notification flows
- existing server APIs for transcript, segmentation, reply generation, and synthesis

## What Stops Being Primary
The browser UI is no longer the primary shipping client for the one-week deadline.

The current web app becomes:
- product prototype
- backend integration reference
- schema and logic reference
- fallback internal test surface

## What the Native App Must Do This Week
The iOS build only needs the core loop:

1. Sign in with phone number
2. Pull your phone profile from Contacts where available
3. Import device contacts
4. Create a group
5. Open chat
6. Record and send a voice memo
7. See the memo persist in chat
8. Play a memo back
9. Receive or simulate reply refresh

## Native Architecture

### Client
- SwiftUI
- iOS only
- `URLSession` for backend calls this week
- `Contacts.framework` for contacts + Me card
- `AVFoundation` for recording/playback
- `UserNotifications` later if time remains

### Data Flow
1. iPhone app requests phone auth code from `POST /api/send-phone-code`
2. iPhone app verifies OTP through `POST /api/verify-phone-code`
3. App resolves or creates the app user in Supabase-backed tables
4. App requests Contacts permission
5. App imports:
   - Me card display name
   - Me card image if available
   - address book contacts
6. App creates group and memberships in backend
7. App uploads audio and calls processing API
8. Backend writes transcript, segments, and replies
9. App refreshes chat state from backend

## iPhone-Native Profile Strategy
This week, the correct profile source is the device contact store, not direct iCloud web sync.

Use:
- `CNContactStore`
- `unifiedMeContactWithKeys(toFetch:)` for your phone's Me card
- `CNContact.thumbnailImageDataKey` for profile photo if present

Fallback if Me card is unavailable:
- prefill phone number from auth
- let the user edit name once
- keep avatar empty until set or synced later

## Backend Contract Mapping

### Auth
- `POST /api/send-phone-code`
  - input: `{ phone }`
  - output: `{ ok: true }`
- `POST /api/verify-phone-code`
  - input: `{ phone, code }`
  - output: verified session payload

### User bootstrap
Use the existing `users` table, but the iOS client should treat it as:
- fetch current user by phone/auth id
- create or upsert profile after OTP verify
- sync Me card data after contacts permission

### Chats
The iOS client needs dedicated app-facing endpoints or direct Supabase queries for:
- list chats for current user
- fetch chat by id
- create group
- add members
- list messages/threads for a chat

If direct Supabase access is faster this week, use that first. If any query becomes messy, wrap it in an app-specific API route rather than spreading SQL-ish logic through SwiftUI views.

### Audio
- upload recorded memo to storage
- persist pending message record
- call `POST /api/process-audio`
- poll or refresh chat after processing

## One-Week Build Plan

### Day 1
- create the `yAp-native` Xcode project
- add bundle id and local signing
- set up app shell, theme, routing, and config
- connect app to dev backend base URL

### Day 2
- phone auth screens
- send code
- verify code
- persist local session

### Day 3
- contacts permission
- Me card import
- contact import + normalization
- profile setup fallback only when import fails

### Day 4
- chats list
- new group flow
- select contacts
- create group in backend

### Day 5
- chat screen
- fetch persisted messages and threads
- open/create group correctly

### Day 6
- native voice recording
- upload/send memo
- processing state
- playback

### Day 7
- QA on your real iPhone
- fix broken flows
- tighten spacing, navigation, safe areas, keyboard, error states

## Hard Scope Cuts
Do not spend this week on:
- App Store submission
- Android
- push notifications if SMS works
- AI participant polish
- advanced settings
- custom animations beyond what is needed for clarity
- deep Figma/design library work

## Cost Reality
For this one-week plan:
- Apple Developer Program: not required if only your phone is used
- Xcode + Personal Team: free for personal device install
- Supabase: likely free tier is enough for now
- Twilio: trial is enough to start, but invite/verify behavior may be limited
- OpenAI: variable usage cost depending on audio volume

## Repo Shape Going Forward

### Existing repo
- `/api` remains backend edge/serverless logic
- `/supabase` remains schema and seed source of truth
- `/docs` contains product and migration docs
- `/yAp-native` contains the native source files and Xcode project

### Future
When the iOS app is stable, split if needed into:
- `yap-backend`
- `yap-ios`

For now, the native client lives in `/yAp-native`.

For this week, staying in one repo is faster.

## Definition Of Done For This Week
The build is successful when, on your real iPhone, you can:
- install and open the app from Xcode
- sign in with your phone number
- import your iPhone contact identity
- create a group from contacts
- open the group
- record and send a memo
- see it saved when you leave and return
- play it back

## Immediate Next Build Step
Open `yAp-native/yAp.xcodeproj` in Xcode.

Then wire:
- signing
- bundle id
- backend base URL
- device permissions
