import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

declare global {
  interface Window {
    __spoken: string[];
    __spokenVoices?: Array<string | null>;
    __audioAttempts?: number;
  }
}

type TargetLanguage = "Japanese" | "Korean";
type VoiceStyle = "Female" | "Male";

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
    expectedSpeech: ["meal", "ごはん", "ごはん"],
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

      class FakeAudio {
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        onpause: (() => void) | null = null;
        volume = 1;
        playbackRate = 1;

        play() {
          this.onerror?.();
          return Promise.reject(new Error("target audio unavailable"));
        }

        pause() {
          this.onpause?.();
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

      const voices = [
        { lang: "ja-JP", name: "Kyoko Female" },
        { lang: "ko-KR", name: "Yuna Female" },
        { lang: "en-US", name: "Samantha Female" },
      ];

      Object.defineProperty(window, "Audio", {
        configurable: true,
        value: FakeAudio,
      });
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        configurable: true,
        value: FakeSpeechSynthesisUtterance,
      });

      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          cancel: () => undefined,
          getVoices: () => voices,
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

for (const voiceStyle of ["Female", "Male"] as VoiceStyle[]) {
  test(`target-language repeats use the selected ${voiceStyle.toLowerCase()} voice`, async ({ page }) => {
    await page.addInitScript(({ voiceStyle }) => {
      const nativeVoiceStyle = voiceStyle === "Female" ? "Male" : "Female";
      window.localStorage.setItem("lingosleep-onboarded", "true");
      window.localStorage.setItem(
        "lingosleep-config",
        JSON.stringify({
          targetLanguage: "Japanese",
          nativeLanguage: "English",
          level: "Basic",
          topic: "food",
          mode: "Native word -> target word -> target word",
          languageMinutes: 10,
          backgroundMinutes: 10,
          backgroundSound: "none",
          playbackOrder: "Start from beginning",
          voiceVolume: 0.72,
          nativeVoiceVolume: 0.95,
          targetVoiceStyle: voiceStyle,
          nativeVoiceStyle,
          targetVoiceRate: 1,
          nativeVoiceRate: 1,
          targetDelaySeconds: 0,
          backgroundVolume: 0,
        })
      );

      window.__spoken = [];
      window.__spokenVoices = [];
      window.__audioAttempts = 0;

      class FakeAudio {
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        onpause: (() => void) | null = null;
        volume = 1;
        playbackRate = 1;

        constructor() {
          window.__audioAttempts = (window.__audioAttempts ?? 0) + 1;
        }

        pause() {
          this.onpause?.();
        }
      }

      class FakeSpeechSynthesisUtterance {
        text: string;
        lang = "";
        voice: { lang: string; name: string } | null = null;
        rate = 1;
        pitch = 1;
        volume = 1;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;

        constructor(text: string) {
          this.text = text;
        }
      }

      const voices = [
        { lang: "ja-JP", name: "Kyoko Female" },
        { lang: "ja-JP", name: "Otoya Male" },
        { lang: "en-US", name: "Samantha Female" },
        { lang: "en-US", name: "Daniel Male" },
      ];

      Object.defineProperty(window, "Audio", {
        configurable: true,
        value: FakeAudio,
      });
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        configurable: true,
        value: FakeSpeechSynthesisUtterance,
      });
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          cancel: () => undefined,
          getVoices: () => voices,
          speak: (utterance: FakeSpeechSynthesisUtterance) => {
            window.__spoken.push(utterance.text);
            window.__spokenVoices?.push(utterance.voice?.name ?? null);
            window.setTimeout(() => utterance.onend?.(), 0);
          },
        },
      });
    }, { voiceStyle });

    await page.goto("/");
    await startSession(page);

    await expect.poll(() => page.evaluate(() => window.__spoken.slice(0, 3))).toEqual(["meal", "ごはん", "ごはん"]);

    const expectedVoice = voiceStyle === "Female" ? "Kyoko Female" : "Otoya Male";
    await expect.poll(() => page.evaluate(() => window.__spokenVoices?.slice(1, 3))).toEqual([expectedVoice, expectedVoice]);
    expect(await page.evaluate(() => window.__audioAttempts)).toBe(0);
  });
}
