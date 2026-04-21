# YAP MVP

## Core concept
Voice-first group messaging app where long voice memos are transcribed, segmented by topic, and automatically organized into replyable threads.

## Seeded MVP
- Group: besties 👋
- Members: me, Chloe, Maria

## Primary flow
1. Open app
2. Contacts permission flow
3. Chats list
4. Open besties
5. Empty besties state
6. Record first memo
7. Stop memo
8. Send memo
9. Analyze memo
10. Segment into topics
11. Show Chloe/Maria responses
12. Allow record-again from main chat
13. Infer which topic(s) the new memo responds to

## Key interaction rule
Users do not manually choose a thread before recording. They record from the main chat. The system infers which heard content and which topic(s) the memo is responding to.

## MVP inference logic
- prioritize most recently heard content
- compare transcript segments to existing topics
- attach to matching topic if confidence is strong
- otherwise create a new topic

## Real vs mocked
- UI/navigation: real
- state transitions: real
- seeded chat data: real local or database-backed data
- transcription: real
- topic segmentation: real
- topic/thread assignment: real
- persistence: real
- contacts sync: mocked for MVP
