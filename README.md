# yap

Voice-first group chat web app with a shareable PWA client, serverless API routes, and Supabase persistence.

## Repo Structure

- `index.html`, `css/`, `js/`: web app client
- `api/`: Vercel/serverless endpoints for auth, invites, audio processing, and replies
- `assets/`: app images and icons used by the web client
- `components/voice-visualizer/`: isolated visualizer code
- `supabase/`: schema, migration, and seed SQL
- `docs/`: product and technical notes
- `AGENTS.md`: project rules for LLM/coding agents
- `STYLE_GUIDE.md`: UI styling guide
- `SKILLS.md`: repeatable workflows for common agent tasks

### Web App Layout

- `js/core/`: app config, shared utilities, persistence, and backend data access
- `js/features/`: recording, pipeline, analysis, and chat behavior
- `js/app.js`: top-level screen orchestration and event wiring

## Notes

- The web app is the primary distribution and development focus.
- SMS links and push notifications provide discovery and engagement.
- The web app is optimized to feel native through responsive design and platform-aware interactions.
