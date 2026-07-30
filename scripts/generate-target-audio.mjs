import { spawn } from "node:child_process";
import { mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetAudioDir = path.join(rootDir, "public", "audio", "target");
const nativeEnglishAudioDir = path.join(rootDir, "public", "audio", "native", "en");
const nativeChineseAudioDir = path.join(rootDir, "public", "audio", "native", "zh-cn");
const vocabularyFiles = [
  path.join(rootDir, "src", "vocabulary-basic.ts"),
  path.join(rootDir, "src", "vocabulary-intermediate.ts"),
  path.join(rootDir, "src", "vocabulary-advanced.ts"),
];

const voices = {
  Japanese: {
    Female: "ja-JP-NanamiNeural",
    Male: "ja-JP-KeitaNeural",
  },
  Korean: {
    Female: "ko-KR-SunHiNeural",
    Male: "ko-KR-InJoonNeural",
  },
  English: {
    Female: "en-US-MichelleNeural",
    Male: "en-US-BrianNeural",
  },
  "Simplified Chinese": {
    Female: "zh-CN-XiaoxiaoNeural",
    Male: "zh-CN-YunjianNeural",
  },
};
const includeExamples = process.argv.includes("--examples");
const includeNativeEnglish = process.argv.includes("--native-english");
const includeNativeChinese = process.argv.includes("--native-chinese");
const includeTargets = (!includeNativeEnglish && !includeNativeChinese) || process.argv.includes("--target");
const voiceStyle = process.argv.includes("--male") ? "Male" : "Female";
const concurrency = Number(process.env.AUDIO_CONCURRENCY || 3);
const pythonCommand = process.env.PYTHON || (process.platform === "win32" ? "py" : "python3");
const quiet = process.env.AUDIO_QUIET === "1";
const ttsTimeoutMs = Number(process.env.AUDIO_TTS_TIMEOUT_MS || 25000);
const ttsJobs = [];

const loadEnv = async () => {
  for (const fileName of [".env.local", ".env"]) {
    try {
      const source = await readFile(path.join(rootDir, fileName), "utf8");
      for (const line of source.split(/\r?\n/)) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
      }
    } catch {
      // Local-only generation still works without env files.
    }
  }
};

const readVocabFile = async (file) => {
  const source = await readFile(file, "utf8");
  const js = source.replace(/^import type .*;\r?\n/, "").replace(/export const (\w+): VocabItem\[] =/, "exports.$1 =");
  const sandbox = { exports: {} };
  vm.runInNewContext(js, sandbox, { filename: file });
  return Object.values(sandbox.exports).flat();
};

const mapRemoteVocabulary = (row) => {
  const targetLanguage = row.target_language === "ja" ? "Japanese" : row.target_language === "ko" ? "Korean" : row.target_language === "en" ? "English" : null;
  if (!targetLanguage) return null;
  return {
    id: row.id,
    targetLanguage,
    targetText: row.target_text,
    reading: row.reading || row.target_text,
    meanings: { English: row.meaning_en, "Simplified Chinese": row.meaning_zh_cn || row.meaning_en },
    exampleSentence: row.example_text || row.target_text,
    exampleTranslations: {
      English: row.example_translation_en || row.meaning_en,
      "Simplified Chinese": row.example_translation_zh_cn || row.meaning_zh_cn || row.meaning_en,
    },
  };
};

const readRemoteVocab = async () => {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url === "https://example.supabase.co") return [];
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/vocabulary?select=*&offset=${from}&limit=1000`, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
      },
    });
    if (!response.ok) throw new Error(`Supabase vocabulary fetch failed: ${response.status}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows.map(mapRemoteVocabulary).filter(Boolean);
};

await loadEnv();
const localVocab = (await Promise.all(vocabularyFiles.map(readVocabFile))).flat();
const remoteVocab = await readRemoteVocab();
const vocab = Array.from(new Map([...remoteVocab, ...localVocab].map((item) => [item.id, item])).values());
await mkdir(targetAudioDir, { recursive: true });
await mkdir(nativeEnglishAudioDir, { recursive: true });
await mkdir(nativeChineseAudioDir, { recursive: true });

const exists = async (file) => {
  try {
    return (await stat(file)).size > 0;
  } catch {
    return false;
  }
};

const runOnce = (args) =>
  new Promise((resolve, reject) => {
    const mediaIndex = args.indexOf("--write-media");
    const outputFile = mediaIndex === -1 ? null : args[mediaIndex + 1];
    const tempFile = outputFile ? `${outputFile}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}` : null;
    const childArgs = tempFile ? [...args.slice(0, mediaIndex + 1), tempFile, ...args.slice(mediaIndex + 2)] : args;
    const child = spawn(pythonCommand, ["-m", "edge_tts", ...childArgs], {
      cwd: rootDir,
      env: process.env,
      stdio: quiet ? "pipe" : "inherit",
    });
    const timer = setTimeout(() => child.kill("SIGTERM"), ttsTimeoutMs);
    child.on("exit", async (code) => {
      clearTimeout(timer);
      if (code === 0) {
        if (tempFile && outputFile) await rename(tempFile, outputFile);
        resolve();
        return;
      }
      if (tempFile) await rm(tempFile, { force: true });
      reject(new Error(`edge-tts exited ${code}`));
    });
  });

const run = async (args) => {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await runOnce(args);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
};

for (const item of vocab) {
  if (includeTargets) {
    const voice = voices[item.targetLanguage]?.[voiceStyle];
    if (!voice) continue;
    const audioDir = voiceStyle === "Male" ? path.join(targetAudioDir, "male") : targetAudioDir;
    await mkdir(audioDir, { recursive: true });

    const jobs = [{ kind: "word", text: item.targetLanguage === "Japanese" ? item.reading : item.targetText }];
    if (includeExamples) jobs.push({ kind: "example", text: item.exampleSentence });

    for (const job of jobs) {
      const file = path.join(audioDir, `${item.id}-${job.kind}.mp3`);
      if (await exists(file)) continue;
      ttsJobs.push({
        label: `target/${voiceStyle === "Male" ? "male/" : ""}${item.id}-${job.kind}`,
        args: ["--voice", voice, "--text", job.text, "--write-media", file],
        text: job.text,
      });
    }
  }

  if (includeNativeEnglish) {
    const audioDir = voiceStyle === "Male" ? path.join(nativeEnglishAudioDir, "male") : nativeEnglishAudioDir;
    await mkdir(audioDir, { recursive: true });
    const jobs = [{ kind: "meaning", text: item.meanings.English }];
    if (includeExamples) jobs.push({ kind: "example", text: item.exampleTranslations.English });

    for (const job of jobs) {
      const file = path.join(audioDir, `${item.id}-${job.kind}.mp3`);
      if (await exists(file)) continue;
      ttsJobs.push({
        label: `native/en/${voiceStyle === "Male" ? "male/" : ""}${item.id}-${job.kind}`,
        args: ["--voice", voices.English[voiceStyle], "--text", job.text, "--write-media", file],
        text: job.text,
      });
    }
  }

  if (includeNativeChinese) {
    const audioDir = voiceStyle === "Male" ? path.join(nativeChineseAudioDir, "male") : nativeChineseAudioDir;
    await mkdir(audioDir, { recursive: true });
    const jobs = [{ kind: "meaning", text: item.meanings["Simplified Chinese"] }];
    if (includeExamples) jobs.push({ kind: "example", text: item.exampleTranslations["Simplified Chinese"] });

    for (const job of jobs) {
      const file = path.join(audioDir, `${item.id}-${job.kind}.mp3`);
      if (await exists(file)) continue;
      ttsJobs.push({
        label: `native/zh-cn/${voiceStyle === "Male" ? "male/" : ""}${item.id}-${job.kind}`,
        args: ["--voice", voices["Simplified Chinese"][voiceStyle], "--text", job.text, "--write-media", file],
        text: job.text,
      });
    }
  }
}

let nextJob = 0;
let completedJobs = 0;
const workerCount = Math.max(1, Math.min(concurrency, ttsJobs.length));
console.log(`audio jobs: ${ttsJobs.length}`);
await Promise.all(
  Array.from({ length: workerCount }, async () => {
    while (nextJob < ttsJobs.length) {
      const job = ttsJobs[nextJob++];
      if (!quiet) console.log(`${job.label}: ${job.text}`);
      await run(job.args);
      completedJobs += 1;
      if (quiet && (completedJobs === ttsJobs.length || completedJobs % 100 === 0)) console.log(`completed ${completedJobs}/${ttsJobs.length}`);
    }
  })
);
