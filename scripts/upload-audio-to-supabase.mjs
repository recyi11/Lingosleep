import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audioDir = path.join(rootDir, "public", "audio");
const prefixArgIndex = process.argv.indexOf("--prefix");
const uploadPrefix =
  prefixArgIndex === -1 ? "" : (process.argv[prefixArgIndex + 1] || "").replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/?$/, "/");
const excludePrefixes = process.argv
  .flatMap((arg, index, args) => (arg === "--exclude-prefix" ? [args[index + 1]] : []))
  .filter(Boolean)
  .map((value) => value.replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/?$/, "/"));
const quiet = process.env.AUDIO_QUIET === "1";
const concurrency = Number(process.env.AUDIO_UPLOAD_CONCURRENCY || 8);

const loadEnv = async () => {
  for (const fileName of [".env.local", ".env"]) {
    try {
      const source = await readFile(path.join(rootDir, fileName), "utf8");
      for (const line of source.split(/\r?\n/)) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
      }
    } catch {
      // Upload requires explicit env vars; missing env files are handled below.
    }
  }
};

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(fullPath) : fullPath;
    })
  );
  return files.flat();
};

await loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const token = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ACCESS_TOKEN;

if (!supabaseUrl || supabaseUrl === "https://example.supabase.co") {
  throw new Error("Missing SUPABASE_URL or VITE_SUPABASE_URL.");
}
if (!token) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ACCESS_TOKEN.");
}

const files = (await walk(audioDir)).filter((file) => {
  if (!file.endsWith(".mp3") || file.includes(`${path.sep}samples${path.sep}`) || file.includes(`${path.sep}background${path.sep}`)) return false;
  const storagePath = path.relative(audioDir, file).replaceAll(path.sep, "/");
  return (!uploadPrefix || storagePath.startsWith(uploadPrefix)) && !excludePrefixes.some((prefix) => storagePath.startsWith(prefix));
});
let nextFile = 0;
let uploaded = 0;
let skipped = 0;

const uploadFile = async (file) => {
  const info = await stat(file);
  if (!info.size) {
    skipped += 1;
    return;
  }
  const storagePath = path.relative(audioDir, file).replaceAll(path.sep, "/");
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/audio/${storagePath}`, {
    method: "POST",
    headers: {
      apikey: token,
      authorization: `Bearer ${token}`,
      "content-type": "audio/mpeg",
      "x-upsert": "true",
    },
    body: createReadStream(file),
    duplex: "half",
  });
  if (!response.ok) throw new Error(`Upload failed for ${storagePath}: ${response.status} ${await response.text()}`);
  uploaded += 1;
  if (!quiet) console.log(`uploaded ${storagePath}`);
  if (quiet && (uploaded === files.length - skipped || uploaded % 500 === 0)) console.log(`uploaded ${uploaded}/${files.length - skipped} files`);
};

await Promise.all(
  Array.from({ length: Math.max(1, Math.min(concurrency, files.length)) }, async () => {
    while (nextFile < files.length) {
      const file = files[nextFile++];
      await uploadFile(file);
    }
  })
);

if (quiet) console.log(`uploaded ${uploaded} files${skipped ? `, skipped ${skipped} empty files` : ""}`);
