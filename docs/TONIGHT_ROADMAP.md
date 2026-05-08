# Tonight Roadmap

Goal: make the web/PWA plus SMS path work end to end for a real demo tonight.

## Demo-Critical Flow

1. Phone sign-in works through Twilio Verify.
2. Profile creation persists the signed-in phone user.
3. Group creation accepts registered users and not-yet-registered phone numbers.
4. Not-yet-registered people receive SMS invite links.
5. Invite links route recipients through sign-in/profile and join the group.
6. Voice memo recording uploads audio, transcribes, segments, and renders topic threads.
7. Human members can reply by voice inside an existing topic thread.
8. Members receive SMS notifications for new messages and replies.
9. Playback/heard state persists enough for unread counts and catch-up state.

## Pass 1: Invites And Notifications

Status: done in this pass.

- Allow unknown phone numbers in create group and add-member flows.
- Create `invitations` rows with unguessable tokens for unknown numbers.
- Send invite links through `/api/send-invites`.
- Keep registered members as immediate joined participants.
- Show pending invitees in chat/member lists.
- Default message notifications to SMS unless explicitly configured otherwise.
- Refresh chats/conversations on tab focus, visibility resume, and reconnect
  without enabling broad interval polling.

## Pass 2: End-To-End Smoke Test

Status: next.

- Run local web server and open the app on a phone-sized viewport.
- Verify Twilio health check exposes missing env vars clearly.
- Sign in with a real phone number.
- Create a group with one registered phone and one not-yet-registered phone.
- Confirm SMS invite text contains a working `?invite=` link.
- Open invite in a fresh browser/session and confirm the user joins the group.

## Pass 3: Voice Memo Reliability

Status: next after invite smoke test.

- Record a short memo in the created group.
- Confirm audio upload succeeds or falls back without losing playback.
- Confirm `/api/process-audio` returns transcript and segments.
- Confirm topic rows persist and reload after refresh.
- Confirm message notification SMS links back to the chat.

## Pass 4: Reply And Catch-Up

Status: after first memo works.

- Reply to one topic by voice.
- Confirm reply attaches to the existing topic thread.
- Confirm recipient sees the reply after refresh/open.
- Confirm playback marks the reply heard and unread count drops.

## Pass 5: Final Demo Polish

Status: final sweep.

- Remove or hide any visible control that still cannot complete its real action.
- Check small iPhone viewport for clipping, overlap, and unreachable controls.
- Verify invite/profile/group settings copy matches the real behavior.
- Deploy only after the local smoke test passes.
