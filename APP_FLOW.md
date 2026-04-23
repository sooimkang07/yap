# yAp Product Brief + PRD

## Product Summary
yAp is a voice-first messaging app for real groups. Users create or join chats, send voice memos instead of typing, receive replies from other humans, and optionally use AI participants or AI assistance. Voice messages are transcribed, segmented by topic, and organized into playable threads so conversations stay understandable even when messages are long.

This is a real production app, not a prototype. No critical flows are faked. Every visible button must perform its intended function or be removed until implemented.

## Core Value Proposition
Voice is faster and more natural than typing, but standard voice notes are hard to skim, reply to, and organize. yAp makes voice messaging usable at scale by turning long voice memos into structured conversation topics while preserving the intimacy and spontaneity of spoken communication.

## Vision
Build the messaging app people use when they want to talk naturally, not type, while still keeping conversations searchable, replayable, and easy to respond to.

## Product Principles
- Voice first: recording and listening are primary actions, not secondary attachments.
- Real communication: chats are between real users with real identities, memberships, and notifications.
- Structured without friction: the system organizes voice automatically; users should not have to manually thread every message.
- Mobile native feel: the web app should behave like a polished mobile messaging product.
- No fake flows: permissions, contacts, invites, auth, messaging, playback, and chat creation must function end to end.
- Human-first AI: AI can assist or participate, but the app must work fully without AI pretending to replace missing product features.

## Primary Users
- Friends coordinating socially through casual voice updates
- Small groups who prefer speaking over typing
- Users who send long voice notes and want easier follow-up
- Invite-based private groups

## Jobs To Be Done
- Send a quick spoken update to a group
- Reply to a specific part of someone’s voice memo
- Create a group from my real contacts
- Invite others into a chat by phone number
- Receive a text that someone sent me a yAp and open directly into the conversation
- Catch up on spoken conversations without replaying everything blindly

## MVP Definition
The MVP is a fully working voice memo messaging app with:
- phone-number-based authentication
- user profiles
- real group chat creation
- real contact import options
- real member invites via SMS
- real chat membership and access control
- voice recording and upload
- playback of voice messages
- transcript generation
- topic segmentation
- topic-based thread rendering
- human replies from multiple users
- push/SMS-style re-engagement flow
- working settings/profile/group management surfaces

AI is optional in the MVP. The app must still be complete if AI replies are turned off.

## User Identity Model
Each user has:
- user id
- phone number
- display name
- avatar
- auth identity
- optional email
- created_at / updated_at

Phone number is the primary identity for auth, invites, and contact matching.

## Contact Model
Contacts can enter the system from:
- device contact picker where supported
- Google Contacts import
- iCloud / vCard import
- manual phone number entry

The app stores imported contact references and matches them against registered users by normalized phone number.

## Group Chat Model
Each group has:
- group id
- group name
- group avatar
- creator id
- member list
- created_at / updated_at

Each membership has:
- user id
- group id
- role
- invited_at
- joined_at
- notification preferences

## Message Model
Each voice message has:
- message id
- group id
- author id
- audio file
- transcript
- duration
- status
- created_at

Each segmented topic item has:
- segment id
- parent voice message id
- topic thread id
- label
- excerpt
- transcript span
- start_ms
- end_ms

Each topic thread has:
- thread id
- group id
- topic label
- last activity
- participant state
- unread / unheard state

## Invitation Model
Invitations must work by SMS.
Each invite has:
- invite id
- group id
- inviter id
- phone number
- invite token
- status
- created_at
- accepted_at

Invite links must deep link into the app and resolve to:
- sign up if the recipient is new
- login if the recipient already exists
- automatic group join on successful verification

## Supported Auth Flow
Primary auth:
- phone number input
- OTP SMS verification
- session creation
- optional profile completion after first verification

Secondary auth later:
- email magic link
- Google / Apple

## End-to-End User Flows

### Flow 1: New user creates account
1. Open app
2. Tap Get Started
3. Enter phone number
4. Receive OTP
5. Verify code
6. Create profile name + avatar
7. Land in empty chats state

### Flow 2: User connects contacts
1. From onboarding or settings, tap Connect Contacts
2. Choose one source:
   - Device Contacts
   - Google Contacts
   - Import vCard
   - Skip
3. Complete source-specific consent/import
4. App normalizes and deduplicates contacts
5. App shows:
   - already on yAp
   - invitable contacts
   - unmatched contacts

### Flow 3: User creates a new group
1. Tap New Group
2. Select contacts or enter numbers manually
3. Choose group name and optional avatar
4. Confirm create
5. Backend creates group + memberships + pending invites
6. Invited non-users receive SMS invite
7. Creator lands in new chat

### Flow 4: Invited user joins from SMS
1. Recipient gets SMS
2. Tap invite link
3. If not logged in: phone auth flow
4. Invite token is resolved
5. User profile is created or resumed
6. User is added to the group
7. Group opens directly

### Flow 5: Send first voice memo
1. Open chat
2. Tap mic
3. Record audio
4. Stop
5. Preview or discard
6. Send
7. Audio uploads
8. Message appears in pending state
9. Transcript + segmentation runs
10. Topic threads are created/updated
11. Chat updates with playable topic cards

### Flow 6: Reply to a topic
1. User opens a specific topic thread
2. Taps Reply with voice
3. Records a reply
4. Sends
5. Reply is attached to that thread
6. Other members are notified

### Flow 7: Listen and catch up
1. User opens chat
2. Sees unseen topic threads / unheard replies
3. Taps play on topic or reply
4. Playback progress updates
5. Heard state updates
6. Thread unread counts adjust accordingly

### Flow 8: Group management
1. Open group settings
2. View members
3. Add members
4. Remove members if authorized
5. Rename group
6. Update group avatar
7. Leave group

## Screen List
- Splash
- Welcome / Get Started
- Phone Auth: phone entry
- Phone Auth: OTP verification
- Profile Setup
- Chats List
- New Group: select contacts
- New Group: group details
- Contacts Import Hub
- Contact Source Flows
- Invite Status / Pending Invites
- Chat View
- Topic Thread Detail
- Recording Overlay
- Playback / Reply Composer
- Group Settings
- Profile / Settings
- Notifications / permission education
- Error / empty states

## Functional Requirements

### Authentication
- Users can sign up and log in with phone OTP
- Sessions persist securely
- Invite links survive auth and continue the join flow

### Contacts
- User can import contacts from at least one real source at launch
- Imported contacts are normalized by phone number
- User can manually add phone numbers if import is unavailable
- No fake permission screen may exist without real action behind it

### Group Creation
- Users can create real groups
- Groups persist in the database
- Members and invites are tracked independently

### Messaging
- Users can record, upload, send, and play voice memos
- Messages persist
- Human users can reply to each other
- Message delivery state is visible
- Failed states can retry

### AI Processing
- Transcription runs server-side
- Topic segmentation runs server-side
- Topic assignment is deterministic and stored
- AI replies, if enabled, are clearly represented as AI or assistant behavior

### Notifications
- Invite SMS must send successfully
- New message notifications must exist in at least one channel:
  - push notification later
  - SMS fallback or email fallback initially
- Notification links must open the correct chat

### Playback
- Users can play topic-level clips and reply clips
- Heard progress persists
- Playback state restores correctly

### Chat State
- Unread / unheard states are accurate per user
- Membership rules are enforced
- Messages are scoped to authorized users only

## Non-Functional Requirements
- Mobile-first responsive UI
- Fast perceived load on chat open
- Audio playback starts quickly
- Reasonable retry behavior for network failures
- Secure file storage and access control
- Production-safe auth and invite token handling
- Scalable backend event flow for notifications and processing

## What Must Not Ship
- Fake contacts permission UI
- Fake group creation buttons
- Fake search
- Fake multi-account switching standing in for real users
- Placeholder menus with no behavior
- Hardcoded current user logic
- Hardcoded single-chat-only architecture

## AI Role
AI is optional and additive:
- transcription
- segmentation
- summarization
- optional AI participant
AI must not be required for the app’s core human messaging loop to function.

## North Star Experience
A user creates a real group from real contacts, sends a voice memo, contacts receive a text, they join with phone login, open the group, listen, and reply with their own voice. The app automatically structures the conversation into understandable topic threads without losing the spontaneity of voice.

## Launch Criteria
The product is launch-ready when:
- a new user can sign up by phone
- create a group
- import or manually add contacts
- invite someone by SMS
- invited user can join
- both users can exchange voice memos
- messages persist
- playback works
- segmentation works
- chat state works
- no visible core UI affordance is fake

## Build Plan

### Phase 1: Foundation
1. Replace hardcoded `CURRENT_USER` with real auth/session state.
2. Add proper database tables for:
   - users
   - groups
   - group_members
   - invitations
   - contacts
   - messages
   - message_segments
   - playback_state
   - notifications
3. Add row-level security for all user/group resources.
4. Implement phone OTP auth with Supabase.
5. Add deep-link-safe invite token resolution.

### Phase 2: Real Contact + Group Creation
1. Remove the fake contacts permission screen.
2. Build a Contacts Import Hub.
3. Implement at least one real import path first:
   - Google Contacts import, or
   - vCard import
4. Add manual phone-number entry as fallback.
5. Build New Group flow.
6. Build group persistence and member invite creation.

### Phase 3: SMS Invite + Join Flow
1. Integrate Twilio (or equivalent).
2. Send invite SMS when a group is created with non-user contacts.
3. Add invite acceptance API.
4. Route invite links into:
   - auth if needed
   - automatic group join
   - direct chat open

### Phase 4: Real Human Messaging
1. Generalize chat model beyond one hardcoded `besties` chat.
2. Make all message authors dynamic.
3. Remove assumptions that Sooim is always the human sender.
4. Build thread reply composer.
5. Ensure both sender and recipient can record and reply.

### Phase 5: Voice Pipeline Completion
1. Keep current recording/upload pipeline.
2. Tie every voice message to real group/message records.
3. Persist transcript and topic segments to live group threads.
4. Add processing states:
   - uploading
   - transcribing
   - organizing
   - failed
   - ready
5. Add retry paths.

### Phase 6: Playback + State
1. Finalize heard/unheard state per user.
2. Restore playback state accurately after reload.
3. Improve topic thread detail screen.
4. Add message-level and thread-level unread behavior.

### Phase 7: Settings + Management
1. Build profile/settings page.
2. Build group settings page.
3. Add member management.
4. Add leave group.
5. Add rename and group avatar updates.

### Phase 8: Notifications
1. Add outbound new-message notification strategy.
2. Decide launch version:
   - SMS notifications
   - email fallback
   - push later
3. Add per-user notification preferences.

### Phase 9: Ship Hardening
1. Replace any remaining prompt-based or placeholder UI.
2. Add analytics and error logging.
3. Add upload failure handling.
4. Add auth/session expiry handling.
5. Add invite abuse/rate limiting.
6. Add phone number normalization and dedupe logic.
7. Add onboarding and empty states.
8. Add end-to-end QA for:
   - create group
   - invite
   - join
   - send
   - reply
   - playback
   - relaunch

## Suggested Immediate Priority Order
1. Phone auth
2. Real user/session model
3. Group creation
4. Manual phone-number invite flow
5. SMS invites + join links
6. Dynamic multi-user messaging
7. Contact import
8. Settings / group management
9. Notifications polish
10. Optional AI participant features

## Strict Rule Going Forward
If a control exists in the UI, it must:
- work now
- be hidden
- or be explicitly labeled unavailable in a non-deceptive way

No fake buttons.
No fake settings.
No fake permissions.
No fake chat creation.
No fake multi-user behavior.
