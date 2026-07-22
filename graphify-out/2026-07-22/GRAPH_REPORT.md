# Graph Report - .  (2026-07-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 191 nodes · 210 edges · 23 communities (17 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0773a2b0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.tsx
- audio-lifecycle.spec.ts
- compilerOptions
- vocabulary.ts
- dependencies
- package.json
- playback-persistence.spec.ts
- generate-target-audio.mjs
- App
- devDependencies
- playlist-buckets.spec.ts
- mergeVocabMetadata
- public-sw.js
- supabase.ts
- useBackgroundSound
- fetchRemoteVocabulary
- speak
- service-worker-strategy.spec.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `App()` - 16 edges
3. `scripts` - 6 edges
4. `FakeAudioContext` - 6 edges
5. `VocabItem` - 5 edges
6. `lib` - 4 edges
7. `mergeVocabMetadata()` - 4 edges
8. `FakeAudioParam` - 4 edges
9. `FakeBufferSource` - 4 edges
10. `FakeAudio` - 4 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `mergeVocabMetadata()`  [EXTRACTED]
  src/main.tsx → src/main.tsx  _Bridges community 11 → community 8_
- `App()` --calls--> `fetchRemoteVocabulary()`  [EXTRACTED]
  src/main.tsx → src/main.tsx  _Bridges community 15 → community 8_
- `App()` --calls--> `speak()`  [EXTRACTED]
  src/main.tsx → src/main.tsx  _Bridges community 16 → community 8_
- `App()` --calls--> `useBackgroundSound()`  [EXTRACTED]
  src/main.tsx → src/main.tsx  _Bridges community 14 → community 8_

## Import Cycles
- None detected.

## Communities (23 total, 6 thin omitted)

### Community 0 - "main.tsx"
Cohesion: 0.06
Nodes (23): BackgroundSound, backgroundSounds, defaultConfig, durations, familiarityValues, femaleVoiceHints, levels, maleVoiceHints (+15 more)

### Community 1 - "audio-lifecycle.spec.ts"
Cohesion: 0.08
Nodes (9): AudioHarnessOptions, FakeAudioContext, FakeAudioParam, FakeBufferSource, FakeGainNode, FakeMediaAudio, FakeSpeechSynthesisUtterance, sessionConfig (+1 more)

### Community 2 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop (+14 more)

### Community 3 - "vocabulary.ts"
Cohesion: 0.21
Nodes (10): advancedVocab, basicVocab, Familiarity, intermediateVocab, Level, NativeLanguage, TargetLanguage, Topic (+2 more)

### Community 4 - "dependencies"
Cohesion: 0.15
Nodes (13): lucide-react, dependencies, lucide-react, react, react-dom, @supabase/supabase-js, vite, @vitejs/plugin-react (+5 more)

### Community 5 - "package.json"
Cohesion: 0.15
Nodes (12): engines, node, name, private, scripts, build, dev, e2e (+4 more)

### Community 6 - "playback-persistence.spec.ts"
Cohesion: 0.15
Nodes (7): cases, CorruptionCase, FakeAudio, FakeSpeechSynthesisUtterance, TargetLanguage, VoiceStyle, Window

### Community 7 - "generate-target-audio.mjs"
Cohesion: 0.18
Nodes (8): audioDir, includeExamples, js, rootDir, sandbox, start, vocabularyPath, voices

### Community 8 - "App"
Cohesion: 0.20
Nodes (11): App(), buildPlaylist(), formatTime(), getPlaylistKey(), loadJson(), nextStatus(), normalizeConfig(), shuffle() (+3 more)

### Community 9 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, @playwright/test, @types/react, @types/react-dom, typescript, @playwright/test, @types/react, @types/react-dom (+1 more)

### Community 10 - "playlist-buckets.spec.ts"
Cohesion: 0.50
Nodes (3): bucketCases, Level, TargetLanguage

### Community 11 - "mergeVocabMetadata"
Cohesion: 0.67
Nodes (3): mergeVocabMetadata(), readPersistedVocabMetadata(), withDefaultMetadata()

## Knowledge Gaps
- **85 isolated node(s):** `supabase`, `target`, `useDefineForClassFields`, `DOM`, `DOM.Iterable` (+80 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `App` to `main.tsx`, `audio-lifecycle.spec.ts`, `mergeVocabMetadata`, `useBackgroundSound`, `fetchRemoteVocabulary`, `speak`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **What connects `supabase`, `target`, `useDefineForClassFields` to the rest of the system?**
  _85 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `audio-lifecycle.spec.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._