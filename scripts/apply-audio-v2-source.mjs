import { readFile, writeFile } from "node:fs/promises";

const mainPath = "src/main.tsx";
const vitePath = "vite.config.ts";

let main = await readFile(mainPath, "utf8");

const importLine = 'import { nativeAudioSourcesV2, targetAudioSourcesV2 } from "./audio-v2";';
if (!main.includes(importLine)) {
  const anchor = 'import { supabase } from "./lib/supabase";';
  if (!main.includes(anchor)) throw new Error("Could not find Supabase import anchor in src/main.tsx");
  main = main.replace(anchor, `${anchor}\n${importLine}`);
}

const oldBlock = `    // Audio files are keyed by ID, but several curated entries replaced the
    // old generated text while retaining the same IDs. Reusing those files can
    // make the spoken word disagree with the displayed word, so use live TTS
    // until audio assets are regenerated from the current vocabulary.
    const targetWordAudioPaths: string[] = [];
    const targetExampleAudioPaths: string[] = [];
    const nativeMeaningAudioPaths: string[] = [];
    const nativeExampleAudioPaths: string[] = [];`;

const newBlock = `    // Core word/meaning audio is content-addressed. If a matching v2 asset does not exist yet,
    // speakIfPlaying falls back to browser TTS instead of risking a stale file for a reused ID.
    const targetWordAudioPaths = targetAudioSourcesV2(item, "word", sessionConfig.targetVoiceStyle);
    const targetExampleAudioPaths: string[] = [];
    const nativeMeaningAudioPaths = nativeAudioSourcesV2(item, "meaning", sessionConfig.nativeLanguage, sessionConfig.nativeVoiceStyle);
    const nativeExampleAudioPaths: string[] = [];`;

if (main.includes(oldBlock)) {
  main = main.replace(oldBlock, newBlock);
} else if (!main.includes('const targetWordAudioPaths = targetAudioSourcesV2(item, "word", sessionConfig.targetVoiceStyle);')) {
  throw new Error("Could not find the disabled audio source block in src/main.tsx");
}

await writeFile(mainPath, main);
await writeFile(
  vitePath,
  'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({\n  plugins: [react()],\n});\n'
);

console.log("AUDIO_V2_SOURCE_MIGRATION_OK");
