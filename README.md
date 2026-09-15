# LingoSleep

**LingoSleep** is a mobile-first Japanese and Korean vocabulary app built for relaxed listening and review while resting, commuting, or winding down.

**Live:** https://lingosleep.pages.dev

## What you can do

- Learn **Japanese or Korean** with **English or Simplified Chinese** meanings
- Choose **Basic, Intermediate, or Advanced** vocabulary and filter by topic
- Listen continuously with configurable target/native voices
- Use random playback with recent-word anti-repetition for more variety
- Save favorites, track learning progress and history, and review with quizzes
- Add rain or thunder background audio and set a sleep timer
- Use it comfortably on mobile as a responsive PWA

## Vocabulary

| Level | Japanese | Korean | Total |
| --- | ---: | ---: | ---: |
| Basic | 564 | 499 | 1,063 |
| Intermediate | 723 | 947 | 1,670 |
| Advanced | 1,268 | 902 | 2,170 |
| **Total** | **2,555** | **2,348** | **4,903** |

The bundled vocabulary focuses on useful standalone words and established lexical compounds rather than mechanically generated phrases. Japanese entries include kana readings and romanization where applicable.

For exam-focused study, the library also includes expanded **JLPT-oriented Japanese vocabulary** and **exam-oriented Korean vocabulary**, including additional intermediate and advanced learner words.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

For Supabase-backed features, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.

```bash
npm run build
```

**Stack:** React + TypeScript + Vite · Supabase · Cloudflare Pages · Playwright

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment details.
