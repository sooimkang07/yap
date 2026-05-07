# yAp

Voice-first group chat prototype with a shareable web/PWA client, serverless API routes, Supabase persistence, and an in-progress native iOS concept build.

## Repo Structure

- `index.html`, `css/`, `js/`: primary shareable demo app
- `api/`: Vercel/serverless endpoints for auth, invites, audio processing, and replies
- `assets/`: app images and icons used by the web client
- `components/voice-visualizer/`: isolated visualizer code
- `supabase/`: schema, migration, and seed SQL
- `docs/`: product and migration notes
- `yAp-native/`: native iOS Xcode project for local concept development

### Web App Layout

- `js/core/`: app config, shared utilities, persistence, and backend data access
- `js/features/`: recording, pipeline, analysis, and chat behavior
- `js/app.js`: top-level screen orchestration and event wiring

## Notes

- The public demo path is the web app plus SMS links/notifications.
- The web app is the UI north star for the project.
- The active iOS concept project lives in `yAp-native/`, but it is not the distribution path unless Apple Developer setup exists.
- The Swift app should replicate the web app UI and interactions as closely as possible, not reinterpret yAp with generic native defaults.
- `yAp-native/` keeps the current capitalization because it matches the app/Xcode naming already in use.
- Generated artifacts and local machine files are intentionally not part of the clean repo layout.
