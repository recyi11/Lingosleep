# LingoSleep

LingoSleep is a mobile-first nighttime vocabulary review app for Japanese and Korean. It combines curated vocabulary playback, native-language meanings, gentle recall pauses, session timers, calming background sounds, favorites, history, and basic progress tracking.

The app is designed for relaxed review while resting or falling asleep. It does not claim that users can become fluent through sleep-only learning.

## MVP Features

- Onboarding and language setup
- Japanese or Korean target language
- English or Simplified Chinese native language
- Basic, Intermediate, and Advanced levels
- Topic-based playlists
- Four playback modes
- Separate language and background timers
- Separate voice and background volume controls
- Soft rain, heavy rain, and Rain and Thunder audio backgrounds
- Gradual language fade at session end
- PWA manifest, service worker, and Media Session metadata for mobile/lock-screen support where supported by the browser
- Favorites, session history, and progress status
- Next-day-style active recall quiz based on the last session

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` before opening the app.

## Build

```bash
npm run build
```

## Infrastructure

- Frontend: React + Vite
- Hosting: Cloudflare Pages
- Backend services: Supabase Auth, PostgreSQL, Storage, and Row Level Security

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment and environment details.

## Graphify

Current code graph summary:

- `src/main.tsx` is the main application entry. `App()` coordinates setup, session state, playlist building, speech playback, background audio, progress, and quiz flow.
- Vocabulary starts from bundled data in `src/vocabulary.ts` and split level files, then `fetchRemoteVocabulary()` and `mergeVocabMetadata()` combine Supabase rows with local metadata.
- Audio behavior centers on `speak()`, `useBackgroundSound()`, and `createNoiseSource()`, with e2e coverage for playback lifecycle and persistence.
- Supabase browser access is isolated in `src/lib/supabase.ts`; migrations include vocabulary bucket backfill and intermediate vocabulary refresh helpers.
- Project health checks live in Playwright specs under `tests/e2e`, including audio lifecycle, playback persistence, playlist buckets, and service worker strategy.

![LingoSleep code graph](graphify-out/graph.svg)

Open `graphify-out/graph.html` for the interactive view. Last Graphify run: 191 nodes, 210 edges, 23 communities; no import cycles detected.
