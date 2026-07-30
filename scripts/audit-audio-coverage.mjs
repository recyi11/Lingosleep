import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audioDir = path.join(rootDir, "public", "audio");
const coreOnly = process.argv.includes("--core");
const vocabularyFiles = [
  path.join(rootDir, "src", "vocabulary-basic.ts"),
  path.join(rootDir, "src", "vocabulary-intermediate.ts"),
  path.join(rootDir, "src", "vocabulary-advanced.ts"),
];

const loadEnv = async () => {
  for (const fileName of [".env.local", ".env"]) {
    try {
      const source = await readFile(path.join(rootDir, fileName), "utf8");
      for (const line of source.split(/\r?\n/)) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
      }
    } catch {
      // Env files are optional for local-only audits.
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
    if (!response.ok) throw new Error(`Supabase vocabulary fetch failed: ${response.status} ${await response.text()}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows.map(mapRemoteVocabulary).filter(Boolean);
};

const listStoragePrefix = async (prefix = "") => {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url === "https://example.supabase.co") return null;

  const paths = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(`${url.replace(/\/$/, "")}/storage/v1/object/list/audio`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!response.ok) throw new Error(`Supabase audio list failed: ${response.status} ${await response.text()}`);
    const page = await response.json();
    for (const item of page) {
      const storagePath = `${prefix}${item.name}`;
      if (item.id) paths.push(storagePath);
      else paths.push(...(await listStoragePrefix(`${storagePath}/`)));
    }
    if (page.length < 1000) break;
  }
  return paths;
};

const audioRequirements = (item) => {
  const fileName = (kind) => `${item.id}-${kind}.mp3`;
  return [
    { group: "target.word.female", storagePath: `target/${fileName("word")}` },
    { group: "target.word.male", storagePath: `target/male/${fileName("word")}` },
    { group: "target.example.female", storagePath: `target/${fileName("example")}` },
    { group: "target.example.male", storagePath: `target/male/${fileName("example")}` },
    { group: "native.en.meaning.female", storagePath: `native/en/${fileName("meaning")}` },
    { group: "native.en.meaning.male", storagePath: `native/en/male/${fileName("meaning")}` },
    { group: "native.en.example.female", storagePath: `native/en/${fileName("example")}` },
    { group: "native.en.example.male", storagePath: `native/en/male/${fileName("example")}` },
    { group: "native.zh-cn.meaning.female", storagePath: `native/zh-cn/${fileName("meaning")}` },
    { group: "native.zh-cn.meaning.male", storagePath: `native/zh-cn/male/${fileName("meaning")}` },
    { group: "native.zh-cn.example.female", storagePath: `native/zh-cn/${fileName("example")}` },
    { group: "native.zh-cn.example.male", storagePath: `native/zh-cn/male/${fileName("example")}` },
  ];
};

await loadEnv();
const localVocab = (await Promise.all(vocabularyFiles.map(readVocabFile))).flat();
const remoteVocab = await readRemoteVocab();
const vocab = Array.from(new Map([...remoteVocab, ...localVocab].map((item) => [item.id, item])).values());
const groups = new Map();
const coreGroups = new Set(["target.word.female", "target.word.male", "native.en.meaning.female", "native.en.meaning.male", "native.zh-cn.meaning.female", "native.zh-cn.meaning.male"]);
const storagePaths = await listStoragePrefix();
const storageSet = storagePaths ? new Set(storagePaths) : null;

for (const item of vocab) {
  for (const requirement of audioRequirements(item)) {
    if (coreOnly && !coreGroups.has(requirement.group)) continue;
    const current = groups.get(requirement.group) || { total: 0, localMissing: 0, storageMissing: 0, samples: [] };
    current.total += 1;
    const localPath = path.join(audioDir, requirement.storagePath);
    const hasLocal = existsSync(localPath);
    if (!hasLocal) current.localMissing += 1;
    const hasStorage = storageSet?.has(requirement.storagePath);
    if (hasStorage === false) current.storageMissing += 1;
    if ((!hasLocal || hasStorage === false) && current.samples.length < 8) current.samples.push(requirement.storagePath);
    groups.set(requirement.group, current);
  }
}

console.log(
  JSON.stringify(
    {
      vocabItems: vocab.length,
      remoteItems: remoteVocab.length,
      bundledItems: localVocab.length,
      storageItems: storagePaths?.length ?? null,
      groups: Object.fromEntries(groups),
    },
    null,
    2
  )
);
