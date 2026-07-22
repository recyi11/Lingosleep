import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audioDir = path.join(rootDir, "public", "audio");

const loadEnv = async () => {
  try {
    const source = await readFile(path.join(rootDir, ".env"), "utf8");
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    // Upload requires explicit env vars; missing .env is handled below.
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

const files = (await walk(audioDir)).filter((file) => file.endsWith(".mp3") && !file.includes(`${path.sep}samples${path.sep}`));
for (const file of files) {
  const info = await stat(file);
  if (!info.size) continue;
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
  console.log(`uploaded ${storagePath}`);
}
