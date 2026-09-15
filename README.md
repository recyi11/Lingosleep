# LingoSleep

**LingoSleep** is a mobile-first vocabulary review app for Japanese and Korean, designed for relaxed listening and recall while resting, commuting, or winding down.

Live: **https://lingosleep.pages.dev**

## Vocabulary

| Level | Japanese | Korean | Total |
| --- | ---: | ---: | ---: |
| Basic | 564 | 499 | 1,063 |
| Intermediate | 723 | 947 | 1,670 |
| Advanced | 1,268 | 902 | 2,170 |
| **Total** | **2,555** | **2,348** | **4,903** |

Counts are unique bundled target headwords currently loaded by `vocabSeed`; optional remote Supabase vocabulary is not included.

Newer vocabulary expansions prioritize useful standalone nouns, verbs, adjectives, and established lexical compounds rather than mechanically generated phrase combinations. Japanese entries include kana readings and romanization where applicable.

## Features

- Japanese and Korean with English or Simplified Chinese meanings
- Basic, Intermediate, and Advanced levels with topic filters
- Full filtered vocabulary pool instead of a fixed 70-word bucket
- Shuffle-bag random playback with recent-history anti-repetition
- Recall modes, favorites, history, progress status, and review quiz
- Target/native voice controls, timers, and rain / thunder backgrounds
- Mobile-first UI, responsive long-word display, PWA and Media Session support

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

For Supabase-backed features, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.

```bash
npm run build
```

## Stack

React + TypeScript + Vite · Supabase · Cloudflare Pages · Playwright

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment details. The generated code graph is available under `graphify-out/`.
