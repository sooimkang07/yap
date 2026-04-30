# yAp

Voice-first group chat prototype with a static web client, serverless API routes, Supabase persistence, and an in-progress native iOS client.

## Repo Structure

- `index.html`, `css/`, `js/`: primary web app
- `api/`: Vercel/serverless endpoints for auth, invites, audio processing, and replies
- `assets/`: app images and icons used by the web client
- `components/voice-visualizer/`: isolated visualizer code
- `supabase/`: schema, migration, and seed SQL
- `docs/`: product and migration notes
- `yAp-native/`: native iOS Xcode project

### Web App Layout

- `js/core/`: app config, shared utilities, persistence, and backend data access
- `js/features/`: recording, pipeline, analysis, and chat behavior
- `js/app.js`: top-level screen orchestration and event wiring

## Notes

- The active iOS project lives in `yAp-native/`.
- `yAp-native/` keeps the current capitalization because it matches the app/Xcode naming already in use.
- Generated artifacts and local machine files are intentionally not part of the clean repo layout.
