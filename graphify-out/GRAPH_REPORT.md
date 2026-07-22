# Graph Report - .  (2026-07-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 97 nodes · 101 edges · 13 communities (10 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5d86107f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.tsx
- compilerOptions
- dependencies
- package.json
- App
- devDependencies
- lib
- tsconfig.json
- public-sw.js
- supabase.ts
- buildPlaylist

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `App()` - 8 edges
3. `scripts` - 4 edges
4. `lib` - 4 edges
5. `useBackgroundSound()` - 3 edges
6. `buildPlaylist()` - 3 edges
7. `engines` - 2 edges
8. `@supabase/supabase-js` - 2 edges
9. `@vitejs/plugin-react` - 2 edges
10. `lucide-react` - 2 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `buildPlaylist()`  [EXTRACTED]
  src/main.tsx → src/main.tsx  _Bridges community 4 → community 10_

## Import Cycles
- None detected.

## Communities (13 total, 3 thin omitted)

### Community 0 - "main.tsx"
Cohesion: 0.07
Nodes (18): BackgroundSound, backgroundSounds, defaultConfig, durations, Familiarity, Level, levels, modes (+10 more)

### Community 1 - "compilerOptions"
Cohesion: 0.13
Nodes (15): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, module (+7 more)

### Community 2 - "dependencies"
Cohesion: 0.15
Nodes (13): lucide-react, dependencies, lucide-react, react, react-dom, @supabase/supabase-js, vite, @vitejs/plugin-react (+5 more)

### Community 3 - "package.json"
Cohesion: 0.18
Nodes (10): engines, node, name, private, scripts, build, dev, preview (+2 more)

### Community 4 - "App"
Cohesion: 0.25
Nodes (8): App(), createNoiseSource(), formatTime(), loadJson(), nextStatus(), speak(), useBackgroundSound(), wait()

### Community 5 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @types/react, @types/react-dom, typescript, @types/react, @types/react-dom, typescript

### Community 6 - "lib"
Cohesion: 0.50
Nodes (4): DOM, DOM.Iterable, ES2020, lib

### Community 7 - "tsconfig.json"
Cohesion: 0.50
Nodes (3): src, include, references

## Knowledge Gaps
- **55 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `compilerOptions` connect `compilerOptions` to `lib`, `tsconfig.json`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._