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

The bundled vocabulary favors useful standalone nouns, verbs, adjectives, adverbs, and established lexical compounds rather than mechanically generated phrase combinations. Japanese entries include kana readings and romanization where applicable.

### Exam-oriented expansion

- **Japanese:** 800 additional JLPT-oriented headwords — N3 200, N2 350, N1 250. Candidates are cross-checked against the app's JLPT level map and validated against JMdict entries, supported parts of speech, and corpus-frequency filters.
- **Korean:** 700 additional exam-oriented headwords — learner grade `중급` 250 and `고급` 450. Selection is based on KRDICT learner vocabulary grades; spellings with multiple KRDICT lexical entries are excluded to reduce ambiguous or incorrect senses.
- Korean learner-facing English and Simplified Chinese meanings use KRDICT dictionary data when available. Missing dictionary translations fall back only when necessary.
- Vocabulary generation and runtime meaning handling avoid fabricated placeholders such as `X, related X` or `X，相关X`; entries may keep a single meaning when no reliable second meaning exists.

## Features

- Japanese and Korean with English or Simplified Chinese meanings
- Basic, Intermediate, and Advanced levels with topic filters
- JLPT-oriented Japanese and exam-oriented Korean vocabulary pools
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

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment details.
