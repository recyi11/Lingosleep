# LingoSleep Deployment

## Architecture

- GitHub stores the source code.
- Cloudflare Pages builds and hosts the React + Vite frontend.
- Supabase provides PostgreSQL, Authentication, Storage, and Row Level Security.

## Current Deployment

- GitHub repository: `recyi11/Lingosleep`
- Cloudflare Pages project: `lingosleep`
- Production URL: `https://lingosleep.pages.dev`
- Supabase project: `lingosleep`
- Supabase project ref: `etmcomizbmoaxhacnpuy`
- Supabase region: Southeast Asia (Singapore), `ap-southeast-1`

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these local variables in `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Never commit `.env`, `.env.local`, Supabase service role keys, database passwords, Cloudflare API tokens, GitHub tokens, or personal credentials.

## Build

```bash
npm run build
```

The production build output directory is `dist`.

## Cloudflare Pages

Recommended configuration:

- Project name: `lingosleep`
- Framework preset: Vite or React
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Node.js version: Node 22 or newer, matching `package.json` engines

Add these variables in both Production and Preview:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Do not add server-side secrets such as `SUPABASE_SERVICE_ROLE_KEY`, database passwords, JWT secrets, or management API tokens to the frontend environment.

Cloudflare Pages should redeploy automatically on each push to `main`. A manual redeploy can also be started from the Pages deployment list.

## SPA Routing

`public/_redirects` contains:

```text
/* /index.html 200
```

This allows direct page loads and refreshes for client-side routes.

## Supabase Migration

Apply migrations from:

```text
supabase/migrations/20260716000000_initial_schema.sql
```

The initial migration creates:

- `vocabulary`
- `user_progress`
- `sessions`
- `session_items`
- `user_preferences`

It also seeds a small public vocabulary set and creates the public `audio` Storage bucket with audio MIME type restrictions.

## Row Level Security

RLS is enabled on all application tables.

- `vocabulary`: anon and authenticated users can read; no client-side insert, update, or delete policy is granted.
- `user_progress`: authenticated users can read, insert, update, and delete only rows where `auth.uid() = user_id`.
- `sessions`: authenticated users can read, insert, update, and delete only their own sessions.
- `session_items`: access is allowed only when the related `sessions.user_id` matches `auth.uid()`.
- `user_preferences`: authenticated users can read, insert, and update only their own preferences.

## Authentication

MVP provider:

- Email + password
- Magic Link optional

Supabase Auth URL configuration should be updated after the Cloudflare Pages production URL exists:

- Site URL: `https://lingosleep.pages.dev`
- Redirect URLs:
  - `http://localhost:5173/**`
  - `https://lingosleep.pages.dev/**`

The current app initializes Supabase Auth session persistence, but it does not yet include a full in-app authentication screen.

## Storage

Bucket:

- `audio`

Recommended object layout:

- `background/rain/`
- `background/white-noise/`
- `background/brown-noise/`
- `background/fireplace/`
- `vocabulary/ja/`
- `vocabulary/ko/`

Allowed MIME types:

- `audio/mpeg`
- `audio/wav`
- `audio/ogg`
- `audio/mp4`

Do not upload copyrighted or unverified audio assets.

## Troubleshooting

- If the app is blank in production, check that Cloudflare Pages has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- If a build fails, run `npm install` and `npm run build` locally first.
- If direct subpaths return 404, confirm `_redirects` is included in the built `dist` directory.
- If Supabase reads fail, confirm the migration was applied and RLS policies are present.
- If Auth redirects fail, confirm Supabase Site URL and Redirect URLs match the Pages URL and localhost port.
