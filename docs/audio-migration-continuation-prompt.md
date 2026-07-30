# Audio Migration Continuation Prompt

Use this prompt to continue the LingoSleep Supabase audio migration from the saved state below.

## Prompt

You are working in `/Users/ariac/Documents/learn japanese or korean while sleeping`.

Current state:

- Supabase project: `etmcomizbmoaxhacnpuy`
- Remote `vocabulary` table has 3600 rows.
- App code now loads the full remote vocabulary instead of filtering remote rows down to bundled local-audio ids.
- `npm run build` passed after the app-side change.
- `edge-tts` is installed locally and works through `python3 -m edge_tts`.
- `.env.local` contains Supabase URL, anon key, and a service/secret key for uploading. Do not print secrets.
- Current generated/uploaded audio count in Supabase Storage bucket `audio`: 25197 objects.

Completed audio coverage:

- `target.word.female`: local 3600/3600, Supabase Storage 3600/3600
- `target.word.male`: local 3600/3600, Supabase Storage 3600/3600
- `native.en.meaning.female`: local 3600/3600, Supabase Storage 3600/3600
- `native.en.meaning.male`: local 3600/3600, Supabase Storage 3600/3600
- `native.zh-cn.meaning.female`: local 3600/3600, Supabase Storage 3600/3600
- `native.zh-cn.meaning.male`: local 3600/3600, Supabase Storage 3600/3600

Remaining non-core example audio coverage from the latest full audit:

- `target.example.female`: missing 2253 local and 2253 Storage
- `target.example.male`: missing 3150 local and 3150 Storage
- `native.en.example.female`: missing 3150 local and 3150 Storage
- `native.en.example.male`: missing 3150 local and 3150 Storage
- `native.zh-cn.example.female`: missing 3150 local and 3150 Storage
- `native.zh-cn.example.male`: missing 3150 local and 3150 Storage

Important scripts and behavior:

- `npm run audit:audio -- --core` audits the six core playback groups.
- `npm run audit:audio` audits word, meaning, and example audio groups.
- `npm run generate:audio` supports `--target`, `--male`, `--native-english`, `--native-chinese`, and `--examples`.
- Use stable generation settings:
  - `AUDIO_CONCURRENCY=3`
  - `AUDIO_QUIET=1`
  - `AUDIO_TTS_TIMEOUT_MS=25000`
- `scripts/generate-target-audio.mjs` now uses `.env.local`, `python3` on macOS/Linux, temp files, timeout, retry, and quiet progress output.
- `scripts/upload-audio-to-supabase.mjs` now uses `.env.local`, quiet progress output, and `AUDIO_UPLOAD_CONCURRENCY`.

Recommended next steps:

1. Do not regenerate completed core groups unless an audit says they are missing.
2. Generate remaining example audio only if desired:
   - `env AUDIO_CONCURRENCY=3 AUDIO_QUIET=1 AUDIO_TTS_TIMEOUT_MS=25000 npm run generate:audio -- --target --examples`
   - `env AUDIO_CONCURRENCY=3 AUDIO_QUIET=1 AUDIO_TTS_TIMEOUT_MS=25000 npm run generate:audio -- --target --male --examples`
   - `env AUDIO_CONCURRENCY=3 AUDIO_QUIET=1 AUDIO_TTS_TIMEOUT_MS=25000 npm run generate:audio -- --native-english --examples`
   - `env AUDIO_CONCURRENCY=3 AUDIO_QUIET=1 AUDIO_TTS_TIMEOUT_MS=25000 npm run generate:audio -- --native-english --male --examples`
   - `env AUDIO_CONCURRENCY=3 AUDIO_QUIET=1 AUDIO_TTS_TIMEOUT_MS=25000 npm run generate:audio -- --native-chinese --examples`
   - `env AUDIO_CONCURRENCY=3 AUDIO_QUIET=1 AUDIO_TTS_TIMEOUT_MS=25000 npm run generate:audio -- --native-chinese --male --examples`
3. Upload newly generated files:
   - `env AUDIO_QUIET=1 AUDIO_UPLOAD_CONCURRENCY=12 npm run upload:audio`
4. Verify:
   - `npm run audit:audio -- --core`
   - `npm run audit:audio`
   - `npm run build`

Notes:

- Do not print, commit, or expose `.env.local` contents.
- There are temporary `.tmp-*` audio files left from interrupted generation runs; they are not uploaded because the upload script only uploads `.mp3`.
- App playback still has browser speech synthesis fallback for missing example audio.
