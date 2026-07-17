import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __audio: {
      media: FakeMediaAudio[];
      contexts: FakeAudioContext[];
      sources: FakeBufferSource[];
      gains: FakeGainNode[];
      spoken: FakeSpeechSynthesisUtterance[];
      fetches: string[];
      decodedBuffers: number;
      cancelCount: number;
      now: number;
    };
  }
}

class FakeMediaAudio {
  src = "";
  loop = false;
  preload = "";
  volume = 1;
  currentTime = 0;
  playCount = 0;
  pauseCount = 0;
}

class FakeAudioParam {
  private currentValue = 0;
  assignedValues: number[] = [];
  rampTargets: number[] = [];
  canceledAt: number[] = [];

  get value() {
    return this.currentValue;
  }

  set value(value: number) {
    this.currentValue = value;
    this.assignedValues.push(value);
  }

  cancelScheduledValues(time: number) {
    this.canceledAt.push(time);
  }

  linearRampToValueAtTime(value: number) {
    this.value = value;
    this.rampTargets.push(value);
  }
}

class FakeGainNode {
  gain = new FakeAudioParam();

  connect(destination: unknown) {
    return destination;
  }
}

class FakeBufferSource {
  buffer: unknown = null;
  loop = false;
  startCount = 0;
  stopCount = 0;

  connect(destination: FakeGainNode) {
    return destination;
  }

  start() {
    this.startCount += 1;
  }

  stop() {
    this.stopCount += 1;
  }
}

class FakeAudioContext {
  sampleRate = 100;
  currentTime = 0;
  destination = {};
  closeCount = 0;

  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return {
      getChannelData: () => data,
    };
  }

  createGain() {
    const gain = new FakeGainNode();
    window.__audio.gains.push(gain);
    return gain;
  }

  createBufferSource() {
    const source = new FakeBufferSource();
    window.__audio.sources.push(source);
    return source;
  }

  decodeAudioData() {
    window.__audio.decodedBuffers += 1;
    return Promise.resolve({});
  }

  close() {
    this.closeCount += 1;
  }
}

class FakeSpeechSynthesisUtterance {
  text: string;
  lang = "";
  rate = 1;
  pitch = 1;
  volume = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

const sessionConfig = {
  targetLanguage: "Japanese",
  nativeLanguage: "Simplified Chinese",
  level: "Basic",
  topic: "food",
  mode: "Recall mode",
  languageMinutes: 10,
  backgroundMinutes: 10,
  backgroundSound: "white noise",
  voiceVolume: 0.72,
  nativeVoiceVolume: 0.95,
  backgroundVolume: 0.34,
};

async function prepareAudioHarness(
  page: Parameters<Parameters<typeof test>[1]>[0]["page"],
  configOverrides: Partial<typeof sessionConfig> = {}
) {
  await page.addInitScript(({ sessionConfig, configOverrides }) => {
    const testConfig = { ...sessionConfig, ...configOverrides };
    window.localStorage.setItem("lingosleep-onboarded", "true");
    window.localStorage.setItem("lingosleep-config", JSON.stringify(testConfig));

    window.__audio = {
      media: [],
      contexts: [],
      sources: [],
      gains: [],
      spoken: [],
      fetches: [],
      decodedBuffers: 0,
      cancelCount: 0,
      now: 1000,
    };

    Object.defineProperty(Date, "now", {
      configurable: true,
      value: () => window.__audio.now,
    });

    class BrowserFakeAudioParam {
      private currentValue = 0;
      assignedValues: number[] = [];
      rampTargets: number[] = [];
      canceledAt: number[] = [];

      get value() {
        return this.currentValue;
      }

      set value(value: number) {
        this.currentValue = value;
        this.assignedValues.push(value);
      }

      cancelScheduledValues(time: number) {
        this.canceledAt.push(time);
      }

      linearRampToValueAtTime(value: number) {
        this.value = value;
        this.rampTargets.push(value);
      }
    }

    class BrowserFakeGainNode {
      gain = new BrowserFakeAudioParam();

      connect(destination: unknown) {
        return destination;
      }
    }

    class BrowserFakeBufferSource {
      buffer: unknown = null;
      loop = false;
      startCount = 0;
      stopCount = 0;

      connect(destination: BrowserFakeGainNode) {
        return destination;
      }

      start() {
        this.startCount += 1;
      }

      stop() {
        this.stopCount += 1;
      }
    }

    class BrowserFakeAudioContext {
      sampleRate = 100;
      currentTime = 0;
      destination = {};
      closeCount = 0;

      constructor() {
        window.__audio.contexts.push(this as unknown as FakeAudioContext);
      }

      createBuffer(_channels: number, length: number) {
        const data = new Float32Array(length);
        return {
          getChannelData: () => data,
        };
      }

      createGain() {
        const gain = new BrowserFakeGainNode();
        window.__audio.gains.push(gain as unknown as FakeGainNode);
        return gain;
      }

      createBufferSource() {
        const source = new BrowserFakeBufferSource();
        window.__audio.sources.push(source as unknown as FakeBufferSource);
        return source;
      }

      decodeAudioData() {
        window.__audio.decodedBuffers += 1;
        return Promise.resolve({});
      }

      close() {
        this.closeCount += 1;
      }
    }

    class BrowserFakeAudio {
      src: string;
      loop = false;
      preload = "";
      volume = 1;
      currentTime = 0;
      playCount = 0;
      pauseCount = 0;

      constructor(src: string) {
        this.src = src;
        window.__audio.media.push(this as unknown as FakeMediaAudio);
      }

      play() {
        this.playCount += 1;
        return Promise.resolve();
      }

      pause() {
        this.pauseCount += 1;
      }
    }

    class BrowserFakeSpeechSynthesisUtterance {
      text: string;
      lang = "";
      rate = 1;
      pitch = 1;
      volume = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(text: string) {
        this.text = text;
      }
    }

    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: BrowserFakeAudioContext,
    });
    const originalFetch = window.fetch.bind(window);
    Object.defineProperty(window, "fetch", {
      configurable: true,
      value: (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (
          url.includes("/audio/background/soft-rain.mp3") ||
          url.includes("/audio/background/heavy-rain.mp3") ||
          url.includes("/audio/background/thunderstorm.mp3")
        ) {
          window.__audio.fetches.push(url);
          return Promise.resolve({
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
          });
        }
        return originalFetch(input, init);
      },
    });
    Object.defineProperty(window, "Audio", {
      configurable: true,
      value: BrowserFakeAudio,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: BrowserFakeSpeechSynthesisUtterance,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel: () => {
          window.__audio.cancelCount += 1;
        },
        speak: (utterance: BrowserFakeSpeechSynthesisUtterance) => {
          window.__audio.spoken.push(utterance as unknown as FakeSpeechSynthesisUtterance);
        },
      },
    });
  }, { sessionConfig, configOverrides });
}

test("Soft rain background plays the soft rain audio asset", async ({ page }) => {
  await prepareAudioHarness(page, { backgroundSound: "soft rain" });
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();

  await expect.poll(() => page.evaluate(() => window.__audio.fetches[0] ?? "")).toContain("/audio/background/soft-rain.mp3");
  await expect.poll(() => page.evaluate(() => window.__audio.gains[0]?.gain.assignedValues)).toEqual([sessionConfig.backgroundVolume * 1.3]);
  await expect.poll(() => page.evaluate(() => window.__audio.decodedBuffers)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__audio.sources[0]?.startCount ?? 0)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__audio.media.length)).toBe(0);

  await page.locator(".round-button").click();

  await expect.poll(() => page.evaluate(() => window.__audio.sources[0]?.stopCount ?? 0)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__audio.contexts[0]?.closeCount ?? 0)).toBe(1);
});

test("Rain and Thunder background plays the Rain and Thunder audio asset", async ({ page }) => {
  await prepareAudioHarness(page, { backgroundSound: "Rain and Thunder" });
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();

  await expect.poll(() => page.evaluate(() => window.__audio.fetches[0] ?? "")).toContain("/audio/background/thunderstorm.mp3");
});

test("Heavy rain background plays the heavy rain audio asset", async ({ page }) => {
  await prepareAudioHarness(page, { backgroundSound: "heavy rain" });
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();

  await expect.poll(() => page.evaluate(() => window.__audio.fetches[0] ?? "")).toContain("/audio/background/heavy-rain.mp3");
});

test("Stop tears down generated background audio and cancels speech", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.sources[0]?.startCount ?? 0)).toBe(1);

  await page.locator(".round-button").click();

  await expect.poll(() => page.evaluate(() => window.__audio.cancelCount)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__audio.sources[0]?.stopCount ?? 0)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__audio.contexts[0]?.closeCount ?? 0)).toBe(1);
});

test("Recall mode does not lower background volume for speech", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text))).toEqual(["吃饭"]);

  await page.evaluate(() => window.__audio.spoken[0]?.onend?.());

  const rampTargetsAfterMeaning = await page.evaluate(() => window.__audio.gains[0].gain.rampTargets);
  expect(rampTargetsAfterMeaning).toEqual([]);

  await expect
    .poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text)))
    .toEqual(["吃饭", "ご飯"]);

  const rampTargetsThroughTarget = await page.evaluate(() => window.__audio.gains[0].gain.rampTargets);
  expect(rampTargetsThroughTarget).toEqual([]);
});

test("Stop during Recall-mode gap prevents target and reading playback", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text))).toEqual(["吃饭"]);

  await page.evaluate(() => window.__audio.spoken[0]?.onend?.());
  await page.locator(".round-button").click();
  await page.waitForTimeout(3200);

  await expect.poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text))).toEqual(["吃饭"]);
  await expect.poll(() => page.evaluate(() => window.__audio.sources[0]?.stopCount ?? 0)).toBe(1);
});

test("Restart after stopping during Recall-mode gap does not resume stale playback", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text))).toEqual(["吃饭"]);

  await page.evaluate(() => window.__audio.spoken[0]?.onend?.());
  await page.locator(".round-button").click();
  await page.locator(".round-button").click();

  await expect
    .poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text)))
    .toEqual(["吃饭", "吃饭"]);

  await page.waitForTimeout(3200);

  await expect
    .poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text)))
    .toEqual(["吃饭", "吃饭"]);
});

test("Restart after stopping during fade-out does not let old session stop the new one", async ({ page }) => {
  await prepareAudioHarness(page, { mode: "Target-language-only immersion" });
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text))).toEqual(["ご飯"]);

  await page.evaluate(() => window.__audio.spoken[0]?.onend?.());
  await expect
    .poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text)))
    .toEqual(["ご飯", "朝ご飯を食べます。"]);

  await page.evaluate(() => {
    window.__audio.now += 10 * 60 * 1000 + 1;
    window.__audio.spoken[1]?.onend?.();
  });
  await expect
    .poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text)))
    .toEqual(["ご飯", "朝ご飯を食べます。", "Good night."]);

  await page.locator(".round-button").click();
  await page.locator(".round-button").click();
  await expect
    .poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text)))
    .toEqual(["ご飯", "朝ご飯を食べます。", "Good night.", "ご飯"]);

  await page.evaluate(() => window.__audio.spoken[2]?.onend?.());
  await page.waitForTimeout(800);

  await expect.poll(() => page.evaluate(() => window.__audio.cancelCount)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__audio.sources[1]?.stopCount ?? 0)).toBe(0);
});

test("Background volume slider controls generated audio gain", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByLabel("Background", { exact: true }).fill("0.12");
  await page.getByRole("button", { name: "Start sleep session" }).click();

  await expect.poll(() => page.evaluate(() => window.__audio.sources[0]?.startCount ?? 0)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__audio.gains[0]?.gain.assignedValues)).toEqual([0.12]);
  await expect.poll(() => page.evaluate(() => window.__audio.gains[0]?.gain.rampTargets)).toEqual([]);
});

test("Player exposes usable voice and background volume controls during active playback", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.sources[0]?.startCount ?? 0)).toBe(1);

  const voiceVolume = page.getByRole("slider", { name: "Target voice" });
  const nativeVoiceVolume = page.getByRole("slider", { name: "Native voice" });
  const backgroundVolume = page.getByRole("slider", { name: "Background" });

  await expect(voiceVolume).toBeVisible();
  await expect(nativeVoiceVolume).toBeVisible();
  await expect(backgroundVolume).toBeVisible();

  await voiceVolume.fill("0.41");
  await nativeVoiceVolume.fill("0.67");
  await backgroundVolume.fill("0.16");

  await expect(voiceVolume).toHaveValue("0.41");
  await expect(nativeVoiceVolume).toHaveValue("0.67");
  await expect(backgroundVolume).toHaveValue("0.16");
});

test("Player displays meaning with colon romanization", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();

  await expect.poll(() => page.locator(".meaning").innerText({ timeoutMs: 1000 })).toBe("吃饭：gohan");
});

test("Back to setup stops active playback so settings can be changed", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.sources[0]?.startCount ?? 0)).toBe(1);

  await page.getByRole("button", { name: "Back to setup" }).click();

  await expect.poll(() => page.evaluate(() => window.__audio.sources[0]?.stopCount ?? 0)).toBe(1);
  await page.getByLabel("Background", { exact: true }).fill("0.12");
  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.sources[1]?.startCount ?? 0)).toBe(1);
});

test("Native language choices remove Traditional Chinese and normalize stale config", async ({ page }) => {
  await prepareAudioHarness(page, { nativeLanguage: "Traditional Chinese" });
  await page.goto("/");

  await expect.poll(() => page.getByRole("button", { name: "Traditional Chinese" }).count()).toBe(0);
  await expect.poll(() => page.getByRole("button", { name: "Simplified Chinese" }).getAttribute("class")).toBe("active");
});

test("Japanese target speech uses selected voice volume without boost", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text))).toEqual(["吃饭"]);
  const nativeSpeechVolume = await page.evaluate(() => window.__audio.spoken[0]?.volume);
  expect(nativeSpeechVolume).toBeCloseTo(sessionConfig.nativeVoiceVolume, 5);

  await page.getByRole("slider", { name: "Target voice" }).fill("0.31");
  await page.getByRole("slider", { name: "Native voice" }).fill("0.52");
  await page.getByRole("slider", { name: "Background" }).fill("0.16");

  await expect
    .poll(() => page.evaluate(() => window.__audio.gains[0]?.gain.rampTargets.at(-1)))
    .toBeCloseTo(0.16, 5);

  await page.evaluate(() => window.__audio.spoken[0]?.onend?.());

  await expect
    .poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text)))
    .toEqual(["吃饭", "ご飯"]);

  const targetSpeechVolume = await page.evaluate(() => window.__audio.spoken[1]?.volume);
  expect(targetSpeechVolume).toBeCloseTo(0.31, 5);
});

test("Korean target speech gets Korean-only volume boost", async ({ page }) => {
  await prepareAudioHarness(page, { targetLanguage: "Korean", voiceVolume: 0.4 });
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();
  await page.evaluate(() => window.__audio.spoken[0]?.onend?.());

  await expect
    .poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text)))
    .toEqual(["吃饭", "밥"]);

  const targetSpeechVolume = await page.evaluate(() => window.__audio.spoken[1]?.volume);
  expect(targetSpeechVolume).toBeCloseTo(0.4 * 1.3, 5);
});
