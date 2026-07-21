import { spawn } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audioDir = path.join(rootDir, "public", "audio", "target");
const vocabularyPath = path.join(rootDir, "src", "vocabulary.ts");

const voices = {
  Japanese: "ja-JP-NanamiNeural",
  Korean: "ko-KR-SunHiNeural",
};
const includeExamples = process.argv.includes("--examples");

const source = await readFile(vocabularyPath, "utf8");
const start = source.indexOf("export const vocabSeed");
if (start === -1) throw new Error("Could not find vocabSeed export");
const js = source.slice(start).replace("export const vocabSeed: VocabItem[] =", "exports.vocabSeed =");
const sandbox = { exports: {} };
vm.runInNewContext(js, sandbox, { filename: vocabularyPath });

await mkdir(audioDir, { recursive: true });

const exists = async (file) => {
  try {
    return (await stat(file)).size > 0;
  } catch {
    return false;
  }
};

const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn("py", ["-m", "edge_tts", ...args], {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`edge-tts exited ${code}`))));
  });

for (const item of sandbox.exports.vocabSeed) {
  const voice = voices[item.targetLanguage];
  if (!voice) continue;

  const jobs = [{ kind: "word", text: item.targetLanguage === "Japanese" ? item.reading : item.targetText }];
  if (includeExamples) jobs.push({ kind: "example", text: item.exampleSentence });

  for (const job of jobs) {
    const file = path.join(audioDir, `${item.id}-${job.kind}.mp3`);
    if (await exists(file)) continue;
    console.log(`${item.id}-${job.kind}: ${job.text}`);
    await run(["--voice", voice, "--text", job.text, "--write-media", file]);
  }
}
