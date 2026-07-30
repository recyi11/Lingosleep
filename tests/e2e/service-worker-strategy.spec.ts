import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const serviceWorkerPath = path.resolve(process.cwd(), "public/public-sw.js");

test.describe("service worker update strategy", () => {
  test("uses an intentionally versioned cache name instead of the original v1 cache", async () => {
    const source = await readFile(serviceWorkerPath, "utf8");

    expect(source).not.toMatch(/const\s+CACHE\s*=\s*["']lingosleep-v1["']/);
  });

  test("does not let stale cached HTML or JS app shell beat the network", async () => {
    const source = await readFile(serviceWorkerPath, "utf8");
    const preCachesHtmlShell = /const\s+ASSETS\s*=\s*\[[\s\S]*["']\/["'][\s\S]*["']\/index\.html["'][\s\S]*\]/.test(source);
    const handlesNavigationOrDocument =
      /request\.mode\s*===\s*["']navigate["']/.test(source) ||
      /request\.destination\s*===\s*["']document["']/.test(source);
    const networkFirstDocumentHandler =
      handlesNavigationOrDocument &&
      /fetch\s*\(\s*event\.request[\s\S]{0,800}caches\.match\s*\(\s*event\.request/.test(source);
    const skipsHtmlOrScriptCaching =
      /request\.destination\s*===\s*["']document["'][\s\S]{0,300}return/.test(source) ||
      /request\.destination\s*===\s*["']script["'][\s\S]{0,300}return/.test(source) ||
      /text\/html|javascript|app shell|no-store/i.test(source);

    expect(preCachesHtmlShell).toBe(false);
    expect(networkFirstDocumentHandler || skipsHtmlOrScriptCaching).toBe(true);
  });

  test("does not cache failed responses for media assets", async () => {
    const source = await readFile(serviceWorkerPath, "utf8");

    expect(source).toMatch(/response\.ok[\s\S]{0,160}cache\.put\s*\(\s*request/);
    expect(source).toMatch(/request\.destination\s*===\s*["']audio["']/);
    expect(source).toMatch(/fetch\s*\(\s*event\.request[\s\S]{0,260}cacheIfOk\s*\(\s*event\.request,\s*response\s*\)/);
  });
});
