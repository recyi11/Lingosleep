# LingoSleep

LingoSleep is a mobile-first nighttime vocabulary review app for Japanese and Korean. It combines curated vocabulary playback, native-language meanings, gentle recall pauses, session timers, calming generated background sounds, favorites, history, and basic progress tracking.

The app is designed for relaxed review while resting or falling asleep. It does not claim that users can become fluent through sleep-only learning.

## MVP Features

- Onboarding and language setup
- Japanese or Korean target language
- English, Simplified Chinese, or Traditional Chinese native language
- Basic, Intermediate, and Advanced levels
- Topic-based playlists
- Four playback modes
- Separate language and background timers
- Separate voice and background volume controls
- Background ducking while voice is speaking
- Gradual language fade at session end
- PWA manifest, service worker, and Media Session metadata for mobile/lock-screen support where supported by the browser
- Favorites, session history, and progress status
- Next-day-style active recall quiz based on the last session

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
