import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const DEFAULT_SUPABASE_URL = "https://etmcomizbmoaxhacnpuy.supabase.co";
const DEFAULT_PUBLISHABLE_KEY = "sb_publishable_Zhil84fRZRMFIuu9J40tDQ_YGxdFKBR";

const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
const readKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_PUBLISHABLE_KEY;
const writeKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const expectedVocabCount = Number(process.env.EXPECTED_VOCAB_COUNT || 0);
const generationConcurrency = Math.max(1, Number(process.env.AUDIO_CONCURRENCY || 6));
const uploadConcurrency = Math.max(1, Number(process.env.AUDIO_UPLOAD_CONCURRENCY || 12));
const ttsTimeoutMs = Math.max(10_000, Number(process.env.AUDIO_TTS_TIMEOUT_MS || 45_000));
const pythonCommand = process.env.PYTHON || "python3";

if (!writeKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY. Refusing to generate thousands of files without upload credentials.");
}
if (writeKey.startsWith("sbp_")) {
  throw new Error("SUPABASE personal access tokens cannot write Storage objects. Use a service-role JWT or sb_secret_ key.");
}

const apiHeaders = (key) => {
  const headers = { apikey: key };
  if (key.split(".").length === 3) headers.authorization = `Bearer ${key}`;
  return headers;
};

const storageHeaders = (contentType) => ({
  ...apiHeaders(writeKey),
  "content-type": contentType,
  "x-upsert": "true",
  "cache-control": "no-cache",
});

const voices = {
  ja: { Female: "ja-JP-NanamiNeural", Male: "ja-JP-KeitaNeural" },
  ko: { Female: "ko-KR-SunHiNeural", Male: "ko-KR-InJoonNeural" },
  en: { Female: "en-US-MichelleNeural", Male: "en-US-BrianNeural" },
  nativeEn: { Female: "en-US-MichelleNeural", Male: "en-US-BrianNeural" },
  nativeZh: { Female: "zh-CN-XiaoxiaoNeural", Male: "zh-CN-YunjianNeural" },
};

const fetchVocabulary = async () => {
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const query = new URLSearchParams({
      select: "id,target_language,target_text,reading,meaning_en,meaning_zh_cn",
      order: "id.asc",
      limit: String(pageSize),
      offset: String(offset),
    });
    const response = await fetch(`${supabaseUrl}/rest/v1/vocabulary?${query}`, {
      headers: apiHeaders(readKey),
    });
    if (!response.ok) throw new Error(`Failed to read public.vocabulary: ${response.status} ${await response.text()}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
};

const vocabulary = await fetchVocabulary();
if (!vocabulary.length) throw new Error("public.vocabulary returned zero rows.");
if (expectedVocabCount && vocabulary.length !== expectedVocabCount) {
  throw new Error(`Vocabulary count changed: expected ${expectedVocabCount}, got ${vocabulary.length}. Re-run after reviewing the new source of truth.`);
}

const duplicateIds = vocabulary.filter((row, index) => vocabulary.findIndex((other) => other.id === row.id) !== index);
if (duplicateIds.length) throw new Error(`Duplicate vocabulary IDs found: ${duplicateIds.slice(0, 10).map((row) => row.id).join(", ")}`);

const sourceSnapshot = vocabulary.map((row) => ({
  id: row.id,
  target_language: row.target_language,
  target_text: row.target_text,
  reading: row.reading,
  meaning_en: row.meaning_en,
  meaning_zh_cn: row.meaning_zh_cn,
}));
const sourceHash = createHash("sha256").update(JSON.stringify(sourceSnapshot)).digest("hex");

const workDir = path.join(os.tmpdir(), `lingosleep-core-audio-${Date.now()}`);
await rm(workDir, { recursive: true, force: true });
await mkdir(workDir, { recursive: true });

const jobs = [];
for (const row of vocabulary) {
  const targetVoices = voices[row.target_language];
  if (!targetVoices) throw new Error(`Unsupported target_language '${row.target_language}' for ${row.id}`);
  const targetText = row.target_language === "ja" ? (row.reading || row.target_text) : row.target_text;
  if (!targetText?.trim()) throw new Error(`Missing target speech text for ${row.id}`);
  if (!row.meaning_en?.trim()) throw new Error(`Missing English meaning for ${row.id}`);
  const zhMeaning = row.meaning_zh_cn?.trim() || row.meaning_en.trim();

  jobs.push(
    { storagePath: `target/${row.id}-word.mp3`, voice: targetVoices.Female, text: targetText },
    { storagePath: `target/male/${row.id}-word.mp3`, voice: targetVoices.Male, text: targetText },
    { storagePath: `native/en/${row.id}-meaning.mp3`, voice: voices.nativeEn.Female, text: row.meaning_en.trim() },
    { storagePath: `native/en/male/${row.id}-meaning.mp3`, voice: voices.nativeEn.Male, text: row.meaning_en.trim() },
    { storagePath: `native/zh-cn/${row.id}-meaning.mp3`, voice: voices.nativeZh.Female, text: zhMeaning },
    { storagePath: `native/zh-cn/male/${row.id}-meaning.mp3`, voice: voices.nativeZh.Male, text: zhMeaning },
  );
}

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

const generateJob = async (job) => {
  const outputFile = path.join(workDir, job.storagePath);
  await mkdir(path.dirname(outputFile), { recursive: true });
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await rm(outputFile, { force: true });
    try {
      await runEdgeTts(job, outputFile);
      const info = await stat(outputFile);
      if (!info.size) throw new Error(`Generated empty audio for ${job.storagePath}`);
      return outputFile;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
};

console.log(`source public.vocabulary rows: ${vocabulary.length}`);
console.log(`source hash: ${sourceHash}`);
console.log(`core audio jobs: ${jobs.length}`);
console.log(`generation concurrency: ${generationConcurrency}`);

let nextGenerate = 0;
let generated = 0;
await Promise.all(Array.from({ length: Math.min(generationConcurrency, jobs.length) }, async () => {
  while (true) {
    const index = nextGenerate++;
    if (index >= jobs.length) return;
    await generateJob(jobs[index]);
    generated += 1;
    if (generated % 100 === 0 || generated === jobs.length) console.log(`generated ${generated}/${jobs.length}`);
  }
}));

for (const job of jobs) {
  const info = await stat(path.join(workDir, job.storagePath));
  if (!info.size) throw new Error(`Validation failed: ${job.storagePath} is empty.`);
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "public.vocabulary",
  sourceRowCount: vocabulary.length,
  sourceHash,
  coreAudioFileCount: jobs.length,
  voiceSet: voices,
};
await writeFile(path.join(workDir, "core-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const upload = async (storagePath, filePath, contentType) => {
  const body = await readFile(filePath);
  const response = await fetch(`${supabaseUrl}/storage/v1/object/audio/${storagePath}`, {
    method: "POST",
    headers: storageHeaders(contentType),
    body,
  });
  if (!response.ok) throw new Error(`Upload failed for ${storagePath}: ${response.status} ${await response.text()}`);
};

console.log(`upload concurrency: ${uploadConcurrency}`);
let nextUpload = 0;
let uploaded = 0;
await Promise.all(Array.from({ length: Math.min(uploadConcurrency, jobs.length) }, async () => {
  while (true) {
    const index = nextUpload++;
    if (index >= jobs.length) return;
    const job = jobs[index];
    await upload(job.storagePath, path.join(workDir, job.storagePath), "audio/mpeg");
    uploaded += 1;
    if (uploaded % 250 === 0 || uploaded === jobs.length) console.log(`uploaded ${uploaded}/${jobs.length}`);
  }
}));

await upload("core-manifest.json", path.join(workDir, "core-manifest.json"), "application/json");
console.log(`uploaded manifest for ${vocabulary.length} rows / ${jobs.length} core audio files`);
console.log("CORE_AUDIO_REBUILD_OK");
