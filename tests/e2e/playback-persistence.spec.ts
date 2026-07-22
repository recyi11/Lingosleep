import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

declare global {
  interface Window {
    __spoken: string[];
  }
}

type TargetLanguage = "Japanese" | "Korean";

const startSession = (page: Page) =>
  page.getByRole("button", {
    name: /Start sleep session|Start session|Continue session|Start random session|开始复习|继续复习|开始随机复习/,
  }).click();

type CorruptionCase = {
  name: string;
  targetLanguage: TargetLanguage;
  corruptedId: string;
  corruptedText: string;
  corruptedReading: string;
  expectedSpeech: string[];
};

const cases: CorruptionCase[] = [
  {
    name: "Korean Food",
    targetLanguage: "Korean",
    corruptedId: "ko-food-basic-1",
    corruptedText: "자다",
    corruptedReading: "자다",
    expectedSpeech: ["rice", "밥", "밥"],
  },
  {
    name: "Japanese Food",
    targetLanguage: "Japanese",
    corruptedId: "ja-food-basic-1",
    corruptedText: "寝る",
    corruptedReading: "ねる",
    expectedSpeech: ["meal", "ご飯", "ごはん"],
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
        nativeVoiceVolume: 0.95,
        backgroundVolume: 0,
      };

      const corruptedRecord = {
        id: testCase.corruptedId,
        targetLanguage: testCase.targetLanguage,
        targetText: testCase.corruptedText,
        meanings: {
          English: "",
          "Simplified Chinese": "",
        },
        reading: testCase.corruptedReading,
        romanization: "stale-sleep",
        level: "Basic",
        topic: "food",
        exampleSentence: testCase.corruptedText,
        exampleTranslations: {
          English: "",
          "Simplified Chinese": "",
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
    await startSession(page);

    await expect.poll(() => page.evaluate(() => window.__spoken.slice(0, 3))).toEqual(testCase.expectedSpeech);

    const spoken = await page.evaluate(() => window.__spoken.slice(0, 3));
    expect(spoken).not.toContain(testCase.corruptedText);
    expect(spoken[0]).not.toBe("");
  });
}
