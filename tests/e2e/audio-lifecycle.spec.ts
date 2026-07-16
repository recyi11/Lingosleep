import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __audio: {
      contexts: FakeAudioContext[];
      sources: FakeBufferSource[];
      gains: FakeGainNode[];
      spoken: FakeSpeechSynthesisUtterance[];
      cancelCount: number;
    };
  }
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
  backgroundSound: "rain",
  voiceVolume: 0.72,
  backgroundVolume: 0.34,
};

async function prepareAudioHarness(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  await page.addInitScript(({ sessionConfig }) => {
    window.localStorage.setItem("lingosleep-onboarded", "true");
    window.localStorage.setItem("lingosleep-config", JSON.stringify(sessionConfig));

    window.__audio = {
      contexts: [],
      sources: [],
      gains: [],
      spoken: [],
      cancelCount: 0,
    };

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

      close() {
        this.closeCount += 1;
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
  }, { sessionConfig });
}

test("Stop tears down background audio and cancels speech", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.sources[0]?.startCount ?? 0)).toBe(1);

  await page.locator(".round-button").click();

  await expect.poll(() => page.evaluate(() => window.__audio.cancelCount)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__audio.sources[0]?.stopCount ?? 0)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__audio.contexts[0]?.closeCount ?? 0)).toBe(1);
});

test("Recall mode keeps background ducked between native meaning and target playback", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text))).toEqual(["米饭；餐"]);

  await page.evaluate(() => window.__audio.spoken[0]?.onend?.());

  const duckedVolume = sessionConfig.backgroundVolume * 0.28;
  const rampTargetsAfterMeaning = await page.evaluate(() => window.__audio.gains[0].gain.rampTargets);
  expect(rampTargetsAfterMeaning.every((target) => target <= duckedVolume)).toBe(true);

  await expect
    .poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text)))
    .toEqual(["米饭；餐", "ご飯"]);

  const rampTargetsThroughTarget = await page.evaluate(() => window.__audio.gains[0].gain.rampTargets);
  expect(rampTargetsThroughTarget.every((target) => target <= duckedVolume)).toBe(true);
});

test("Stop during Recall-mode gap prevents target and reading playback", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text))).toEqual(["米饭；餐"]);

  await page.evaluate(() => window.__audio.spoken[0]?.onend?.());
  await page.locator(".round-button").click();
  await page.waitForTimeout(3200);

  await expect.poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text))).toEqual(["米饭；餐"]);
  await expect.poll(() => page.evaluate(() => window.__audio.sources[0]?.stopCount ?? 0)).toBe(1);
});

test("Restart after stopping during Recall-mode gap does not resume stale playback", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text))).toEqual(["米饭；餐"]);

  await page.evaluate(() => window.__audio.spoken[0]?.onend?.());
  await page.locator(".round-button").click();
  await page.locator(".round-button").click();

  await expect
    .poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text)))
    .toEqual(["米饭；餐", "米饭；餐"]);

  await page.waitForTimeout(3200);

  await expect
    .poll(() => page.evaluate(() => window.__audio.spoken.map((utterance) => utterance.text)))
    .toEqual(["米饭；餐", "米饭；餐"]);
});

test("Background volume slider controls generated audio gain", async ({ page }) => {
  await prepareAudioHarness(page);
  await page.goto("/");

  await page.getByLabel("Background", { exact: true }).fill("0.12");
  await page.getByRole("button", { name: "Start sleep session" }).click();

  await expect.poll(() => page.evaluate(() => window.__audio.sources[0]?.startCount ?? 0)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__audio.gains[0]?.gain.assignedValues)).toEqual([
    0.12,
    0.12 * 0.28,
  ]);
  await expect.poll(() => page.evaluate(() => window.__audio.gains[0]?.gain.rampTargets)).toEqual([0.12 * 0.28]);
});
