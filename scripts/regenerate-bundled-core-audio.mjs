import { spawn } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "vite";

const DEFAULT_SUPABASE_URL = "https://etmcomizbmoaxhacnpuy.supabase.co";
const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
const writeKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const minVocabCount = Math.max(1, Number(process.env.MIN_VOCAB_COUNT || 3000));
const generationConcurrency = Math.max(1, Number(process.env.AUDIO_CONCURRENCY || 4));
const uploadConcurrency = Math.max(1, Number(process.env.AUDIO_UPLOAD_CONCURRENCY || 12));
const ttsTimeoutMs = Math.max(10_000, Number(process.env.AUDIO_TTS_TIMEOUT_MS || 45_000));
const pythonCommand = process.env.PYTHON || "python3";
const manifestPath = path.resolve("audio/core-v2-manifest.json");

if (!writeKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.");
if (writeKey.startsWith("sbp_")) throw new Error("Supabase personal access tokens cannot write Storage objects.");

const apiHeaders = (key) => {
  const headers = { apikey: key };
  if (key.split(".").length === 3) headers.authorization = `Bearer ${key}`;
  return headers;
};

const storageHeaders = () => ({
  ...apiHeaders(writeKey),
  "content-type": "audio/mpeg",
  "x-upsert": "true",
  "cache-control": "public, max-age=31536000, immutable",
});

const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
let vocabSeed;
let audioKey;
try {
  ({ vocabSeed } = await vite.ssrLoadModule("/src/vocabulary.ts"));
  audioKey = await vite.ssrLoadModule("/src/audio-v2.ts");
} finally {
  await vite.close();
}

if (!Array.isArray(vocabSeed) || vocabSeed.length < minVocabCount) {
  throw new Error(`Bundled vocabSeed is unexpectedly small: ${Array.isArray(vocabSeed) ? vocabSeed.length : "not an array"}; minimum ${minVocabCount}`);
}

const byId = new Map();
for (const item of vocabSeed) {
  const existing = byId.get(item.id);
  if (existing) {
    throw new Error(`Duplicate vocabulary ID in vocabSeed: ${item.id}`);
  }
  byId.set(item.id, item);
}

const previousManifest = await readFile(manifestPath, "utf8")
  .then((value) => JSON.parse(value))
  .catch(() => ({ schemaVersion: 2, items: {} }));
const previousItems = previousManifest?.items && typeof previousManifest.items === "object" ? previousManifest.items : {};

const voices = {
  Japanese: { Female: "ja-JP-NanamiNeural", Male: "ja-JP-KeitaNeural" },
  Korean: { Female: "ko-KR-SunHiNeural", Male: "ko-KR-InJoonNeural" },
  English: { Female: "en-US-MichelleNeural", Male: "en-US-BrianNeural" },
  nativeEn: { Female: "en-US-MichelleNeural", Male: "en-US-BrianNeural" },
  nativeZh: { Female: "zh-CN-XiaoxiaoNeural", Male: "zh-CN-YunjianNeural" },
};

const jobs = [];
const nextManifestItems = {};
for (const item of vocabSeed) {
  const targetVoices = voices[item.targetLanguage];
  if (!targetVoices) throw new Error(`Unsupported target language for ${item.id}: ${item.targetLanguage}`);

  const targetText = audioKey.targetSpeechText(item);
  const meaningEn = item.meanings?.English?.trim();
  const meaningZh = item.meanings?.["Simplified Chinese"]?.trim() || meaningEn;
  if (!targetText?.trim()) throw new Error(`Missing target speech text for ${item.id}`);
  if (!meaningEn) throw new Error(`Missing English meaning for ${item.id}`);
  if (!meaningZh) throw new Error(`Missing Chinese meaning for ${item.id}`);

  const targetHash = audioKey.targetAudioFingerprint(item, "word");
  const enHash = audioKey.nativeAudioFingerprint(item, "meaning", "English");
  const zhHash = audioKey.nativeAudioFingerprint(item, "meaning", "Simplified Chinese");
  const previous = previousItems[item.id] || {};

  nextManifestItems[item.id] = {
    targetLanguage: item.targetLanguage,
    targetHash,
    enHash,
    zhHash,
  };

  if (previous.targetHash !== targetHash || previous.targetLanguage !== item.targetLanguage) {
    const fileName = `${item.id}-word-${targetHash}.mp3`;
    jobs.push(
      { storagePath: `target/v2/${fileName}`, voice: targetVoices.Female, text: targetText },
      { storagePath: `target/v2/male/${fileName}`, voice: targetVoices.Male, text: targetText },
    );
  }
  if (previous.enHash !== enHash) {
    const fileName = `${item.id}-meaning-${enHash}.mp3`;
    jobs.push(
      { storagePath: `native/v2/en/${fileName}`, voice: voices.nativeEn.Female, text: meaningEn },
      { storagePath: `native/v2/en/male/${fileName}`, voice: voices.nativeEn.Male, text: meaningEn },
    );
  }
  if (previous.zhHash !== zhHash) {
    const fileName = `${item.id}-meaning-${zhHash}.mp3`;
    jobs.push(
      { storagePath: `native/v2/zh-cn/${fileName}`, voice: voices.nativeZh.Female, text: meaningZh },
      { storagePath: `native/v2/zh-cn/male/${fileName}`, voice: voices.nativeZh.Male, text: meaningZh },
    );
  }
}

const workDir = path.join(os.tmpdir(), `lingosleep-audio-v2-${Date.now()}`);
await rm(workDir, { recursive: true, force: true });
await mkdir(workDir, { recursive: true });

const runEdgeTts = (job, outputFile) => new Promise((resolve, reject) => {
  const args = ["-m", "edge_tts", "--voice", job.voice, "--text", job.text, "--write-media", outputFile];
  const child = spawn(pythonCommand, args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  const timer = setTimeout(() => {
    child.kill("SIGTERM");
    reject(new Error(`TTS timeout for ${job.storagePath}`));
  }, ttsTimeoutMs);
  child.on("error", (error) => {
    clearTimeout(timer);
    reject(error);
  });
  child.on("exit", (code) => {
    clearTimeout(timer);
    if (code === 0) resolve();
    else reject(new Error(`edge-tts exited ${code} for ${job.storagePath}: ${stderr.slice(-500)}`));
  });
});

async function generateJob(job) {
  const outputFile = path.join(workDir, job.storagePath);
  await mkdir(path.dirname(outputFile), { recursive: true });
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await rm(outputFile, { force: true });
    try {
      await runEdgeTts(job, outputFile);
      const info = await stat(outputFile);
      if (!info.size) throw new Error(`Generated empty audio for ${job.storagePath}`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}

console.log(`bundled vocabSeed rows: ${vocabSeed.length}`);
console.log(`core v2 audio jobs required: ${jobs.length}`);
console.log(`generation concurrency: ${generationConcurrency}`);

let nextGenerate = 0;
let generated = 0;
await Promise.all(Array.from({ length: Math.min(generationConcurrency, Math.max(1, jobs.length)) }, async () => {
  while (true) {
    const index = nextGenerate++;
    if (index >= jobs.length) return;
    await generateJob(jobs[index]);
    generated += 1;
    if (generated % 100 === 0 || generated === jobs.length) console.log(`generated ${generated}/${jobs.length}`);
  }
}));

async function upload(job) {
  const filePath = path.join(workDir, job.storagePath);
  const body = await readFile(filePath);
  const response = await fetch(`${supabaseUrl}/storage/v1/object/audio/${job.storagePath}`, {
    method: "POST",
    headers: storageHeaders(),
    body,
  });
  if (!response.ok) throw new Error(`Upload failed for ${job.storagePath}: ${response.status} ${await response.text()}`);
}

console.log(`upload concurrency: ${uploadConcurrency}`);
let nextUpload = 0;
let uploaded = 0;
await Promise.all(Array.from({ length: Math.min(uploadConcurrency, Math.max(1, jobs.length)) }, async () => {
  while (true) {
    const index = nextUpload++;
    if (index >= jobs.length) return;
    await upload(jobs[index]);
    uploaded += 1;
    if (uploaded % 250 === 0 || uploaded === jobs.length) console.log(`uploaded ${uploaded}/${jobs.length}`);
  }
}));

await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, `${JSON.stringify({
  schemaVersion: 2,
  source: "vocabSeed",
  generatedAt: new Date().toISOString(),
  itemCount: vocabSeed.length,
  coreFileCount: vocabSeed.length * 6,
  items: nextManifestItems,
}, null, 2)}\n`);

console.log(`AUDIO_V2_OK items=${vocabSeed.length} generated=${jobs.length} coreFiles=${vocabSeed.length * 6}`);
