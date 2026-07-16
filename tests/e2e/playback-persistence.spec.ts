import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __spoken: string[];
    __backgroundClosed: number;
  }
}

type TargetLanguage = "Japanese" | "Korean";

type CorruptionCase = {
  name: string;
  targetLanguage: TargetLanguage;
  corruptedId: string;
  corruptedText: string;
  corruptedReading: string;
  expectedSpeech: string[];
};

type RotationCase = {
  name: string;
  targetLanguage: TargetLanguage;
  topic: "food" | "daily life";
  expectedSpeech: string[];
};

const cases: CorruptionCase[] = [
  {
    name: "Korean Food",
    targetLanguage: "Korean",
    corruptedId: "ko-food-basic-1",
    corruptedText: "자다",
    corruptedReading: "자다",
    expectedSpeech: ["rice; meal", "밥"],
  },
  {
    name: "Japanese Food",
    targetLanguage: "Japanese",
    corruptedId: "ja-food-basic-1",
    corruptedText: "寝る",
    corruptedReading: "ねる",
    expectedSpeech: ["meal; cooked rice", "ご飯"],
  },
];

const rotationCases: RotationCase[] = [
  {
    name: "Japanese Food",
    targetLanguage: "Japanese",
    topic: "food",
    expectedSpeech: ["meal; cooked rice", "ご飯", "water", "水"],
  },
  {
    name: "Japanese Daily Life",
    targetLanguage: "Japanese",
    topic: "daily life",
    expectedSpeech: ["to sleep", "寝る", "to wake up", "起きる"],
  },
  {
    name: "Korean Food",
    targetLanguage: "Korean",
    topic: "food",
    expectedSpeech: ["rice; meal", "밥", "water", "물"],
  },
  {
    name: "Korean Daily Life",
    targetLanguage: "Korean",
    topic: "daily life",
    expectedSpeech: ["to sleep", "자다", "to wake up", "일어나다"],
  },
];

for (const testCase of cases) {
  test(`${testCase.name} playback ignores stale persisted vocabulary fields`, async ({ page }) => {
    await page.addInitScript(({ testCase }) => {
      const config = {
        targetLanguage: testCase.targetLanguage,
        nativeLanguage: "English",
        level: "Basic",
        topic: "food",
        mode: "Recall mode",
        languageMinutes: 10,
        backgroundMinutes: 10,
        backgroundSound: "none",
        voiceVolume: 0.72,
        backgroundVolume: 0,
      };

      const corruptedRecord = {
        id: testCase.corruptedId,
        targetLanguage: testCase.targetLanguage,
        targetText: testCase.corruptedText,
        meanings: {
          English: "",
          "Simplified Chinese": "",
          "Traditional Chinese": "",
        },
        reading: testCase.corruptedReading,
        romanization: "stale-sleep",
        level: "Basic",
        topic: "food",
        exampleSentence: testCase.corruptedText,
        exampleTranslations: {
          English: "",
          "Simplified Chinese": "",
          "Traditional Chinese": "",
        },
        status: "New",
        favorite: false,
        timesPlayed: 0,
      };

      window.localStorage.setItem("lingosleep-onboarded", "true");
      window.localStorage.setItem("lingosleep-config", JSON.stringify(config));
      window.localStorage.setItem("lingosleep-vocab", JSON.stringify([corruptedRecord]));

      window.__spoken = [];

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

      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        configurable: true,
        value: FakeSpeechSynthesisUtterance,
      });

      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          cancel: () => undefined,
          speak: (utterance: FakeSpeechSynthesisUtterance) => {
            window.__spoken.push(utterance.text);
            window.setTimeout(() => utterance.onend?.(), 0);
          },
        },
      });
    }, { testCase });

    await page.goto("/");
    await page.getByRole("button", { name: "Start sleep session" }).click();

    await expect.poll(() => page.evaluate((length) => window.__spoken.slice(0, length), testCase.expectedSpeech.length)).toEqual(testCase.expectedSpeech);

    const spoken = await page.evaluate((length) => window.__spoken.slice(0, length), testCase.expectedSpeech.length);
    expect(spoken).not.toContain(testCase.corruptedText);
    expect(spoken[0]).not.toBe("");
  });
}

for (const testCase of rotationCases) {
  test(`${testCase.name} playback rotates through multiple topic words`, async ({ page }) => {
    await page.addInitScript(({ testCase }) => {
      const config = {
        targetLanguage: testCase.targetLanguage,
        nativeLanguage: "English",
        level: "Basic",
        topic: testCase.topic,
        mode: "Recall mode",
        languageMinutes: 10,
        backgroundMinutes: 10,
        backgroundSound: "none",
        voiceVolume: 0.72,
        backgroundVolume: 0,
      };

      window.localStorage.setItem("lingosleep-onboarded", "true");
      window.localStorage.setItem("lingosleep-config", JSON.stringify(config));
      window.localStorage.removeItem("lingosleep-progress");
      window.localStorage.removeItem("lingosleep-vocab");

      window.__spoken = [];

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

      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        configurable: true,
        value: FakeSpeechSynthesisUtterance,
      });

      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          cancel: () => undefined,
          speak: (utterance: FakeSpeechSynthesisUtterance) => {
            window.__spoken.push(utterance.text);
            window.setTimeout(() => utterance.onend?.(), 0);
          },
        },
      });
    }, { testCase });

    await page.goto("/");
    await page.getByRole("button", { name: "Start sleep session" }).click();

    await expect
      .poll(() => page.evaluate((length) => window.__spoken.slice(0, length), testCase.expectedSpeech.length), { timeout: 10_000 })
      .toEqual(testCase.expectedSpeech);
  });
}

test("stop button closes the active background sound", async ({ page }) => {
  await page.addInitScript(() => {
    const config = {
      targetLanguage: "Japanese",
      nativeLanguage: "English",
      level: "Basic",
      topic: "food",
      mode: "Recall mode",
      languageMinutes: 10,
      backgroundMinutes: 10,
      backgroundSound: "rain",
      voiceVolume: 0.72,
      backgroundVolume: 0.2,
    };

    window.localStorage.setItem("lingosleep-onboarded", "true");
    window.localStorage.setItem("lingosleep-config", JSON.stringify(config));
    window.localStorage.removeItem("lingosleep-progress");

    window.__spoken = [];
    window.__backgroundClosed = 0;

    class FakeSpeechSynthesisUtterance {
      text: string;
      lang = "";
      rate = 1;
      pitch = 1;
      volume = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      voice: SpeechSynthesisVoice | null = null;

      constructor(text: string) {
        this.text = text;
      }
    }

    class FakeAudioContext {
      sampleRate = 100;
      currentTime = 0;
      destination = {};

      createBuffer(_channels: number, length: number) {
        const data = new Float32Array(length);
        return { getChannelData: () => data };
      }

      createBufferSource() {
        return {
          buffer: null,
          loop: false,
          connect: () => ({ connect: () => undefined }),
          start: () => undefined,
          stop: () => undefined,
        };
      }

      createGain() {
        return {
          gain: {
            value: 0,
            linearRampToValueAtTime: (value: number) => {
              this.currentTime += 0.01;
              return value;
            },
          },
          connect: () => undefined,
        };
      }

      close() {
        window.__backgroundClosed += 1;
        return Promise.resolve();
      }
    }

    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: FakeAudioContext,
    });

    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: FakeSpeechSynthesisUtterance,
    });

    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel: () => undefined,
        getVoices: () => [],
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        speak: (utterance: FakeSpeechSynthesisUtterance) => {
          window.__spoken.push(utterance.text);
          window.setTimeout(() => utterance.onend?.(), 0);
        },
      },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Start sleep session" }).click();
  await expect.poll(() => page.evaluate(() => window.__spoken.length > 0)).toBe(true);

  const pauseButton = page.locator(".round-button");
  await expect(pauseButton).toHaveCount(1);
  await pauseButton.click();

  await expect.poll(() => page.evaluate(() => window.__backgroundClosed)).toBeGreaterThan(0);
});
