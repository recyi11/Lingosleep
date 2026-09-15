import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const restoreAudioSources = (): Plugin => ({
  name: "restore-audio-sources",
  enforce: "pre",
  transform(code, id) {
    if (!id.replaceAll("\\", "/").endsWith("/src/main.tsx")) return null;

    const disabledAudioBlock = `    // Audio files are keyed by ID, but several curated entries replaced the
    // old generated text while retaining the same IDs. Reusing those files can
    // make the spoken word disagree with the displayed word, so use live TTS
    // until audio assets are regenerated from the current vocabulary.
    const targetWordAudioPaths: string[] = [];
    const targetExampleAudioPaths: string[] = [];
    const nativeMeaningAudioPaths: string[] = [];
    const nativeExampleAudioPaths: string[] = [];`;

    const restoredAudioBlock = `    // Prefer generated audio from Supabase, then local files, with browser TTS as the final fallback.
    const targetWordAudioPaths = styledTargetAudioSources(item.id, "word", sessionConfig.targetVoiceStyle);
    const targetExampleAudioPaths = styledTargetAudioSources(item.id, "example", sessionConfig.targetVoiceStyle);
    const nativeMeaningAudioPaths = nativeAudioSources(item.id, "meaning", sessionConfig.nativeLanguage, sessionConfig.nativeVoiceStyle);
    const nativeExampleAudioPaths = nativeAudioSources(item.id, "example", sessionConfig.nativeLanguage, sessionConfig.nativeVoiceStyle);`;

    if (!code.includes(disabledAudioBlock)) {
      throw new Error("Expected disabled audio source block was not found in src/main.tsx");
    }

    return {
      code: code.replace(disabledAudioBlock, restoredAudioBlock),
      map: null,
    };
  },
});

export default defineConfig({
  plugins: [restoreAudioSources(), react()],
});
