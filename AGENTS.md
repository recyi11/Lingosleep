# Project Agent Guidelines

## Project Overview

LingoSleep is a React, Vite, TypeScript, Supabase, and Cloudflare Pages app for mobile-first Japanese and Korean vocabulary review.

## Required Reading

Before changing code, read:

- `README.md`
- `DEPLOYMENT.md`
- Any files directly related to the assigned task
- `docs/bugs/BUG-001.md` when working on the current bug

## Local Commands

Use only scripts that exist in `package.json`:

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

Do not claim that `npm test`, `npm run lint`, or `npm run typecheck` passed unless those scripts exist and were actually run.

## Security Rules

- Never commit `.env`, `.env.local`, service role keys, database passwords, Cloudflare tokens, GitHub tokens, or personal credentials.
- Never put a Supabase `service_role` key in browser code.
- Do not disable RLS or replace specific policies with broad allow-all policies to hide a bug.
- Do not hardcode production URLs, user IDs, or private keys in source code.
- Do not silently ignore failed Supabase, auth, storage, or network requests.

## Git Rules

- Keep each change scoped to the assigned task.
- Do not overwrite or discard existing user or Worker changes.
- Do not commit `node_modules`, `dist`, logs, local env files, or unrelated formatting churn.
- Workers must not merge to `main` directly.
- Bug work branches should use the agreed prefixes, such as `bug/`, `test/`, `review/`, or `deploy/`.

## Bug Workflow

- Investigate before fixing.
- Prefer a failing regression test or a documented manual regression script before implementing a fix.
- Fixes should be minimal, targeted, and compatible with existing APIs and data shapes.
- Review must be performed by a separate Worker from the Fix Worker.
- Deployment verification must re-run the original reproduction steps on production.
