import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

declare global {
  interface Window {
    __spoken: string[];
    __spokenVoices?: Array<string | null>;
    __audioAttempts?: number;
    __audioUrls?: string[];
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
    expectedSpeech: ["rice, meal", "밥", "밥"],
  },
  {
    name: "Japanese Food",
    targetLanguage: "Japanese",
    corruptedId: "ja-food-basic-1",
    corruptedText: "寝る",
    corruptedReading: "ねる",
    expectedSpeech: ["rice, meal", "ごはん", "ごはん"],
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

test("local meaning overrides still apply to remote duplicate fields", async ({ page }) => {
  await page.route("**/rest/v1/vocabulary**", (route) =>
    route.fulfill({
      status: 200,
      headers: {
        "content-range": "0-0/1",
        "content-type": "application/json",
      },
      body: JSON.stringify([
        {
          id: "ja-food-basic-1",
          target_language: "ja",
          level: "basic",
          topic: "food",
          target_text: "ご飯",
          reading: "ごはん",
          romanization: "gohan",
          meaning_en: "meal",
          meaning_zh_cn: "REMOTE-ZH",
          example_text: "朝ご飯を食べます。",
          example_translation_en: "I eat breakfast.",
          example_translation_zh_cn: "我吃早饭。",
        },
      ]),
    })
  );
  await page.addInitScript(() => {
    window.localStorage.setItem("lingosleep-onboarded", "true");
    window.localStorage.setItem(
      "lingosleep-config",
      JSON.stringify({
        targetLanguage: "Japanese",
        nativeLanguage: "Simplified Chinese",
        level: "Basic",
        topic: "food",
        mode: "Recall mode",
        languageMinutes: 10,
        backgroundMinutes: 10,
        backgroundSound: "none",
        playbackOrder: "Start from beginning",
        voiceVolume: 0.72,
        nativeVoiceVolume: 0.95,
        targetVoiceRate: 1,
        nativeVoiceRate: 1,
        backgroundVolume: 0,
      })
    );
  });

  await page.goto("/");

  await expect
    .poll(() =>
      page.evaluate(() => {
        const vocab = JSON.parse(window.localStorage.getItem("lingosleep-vocab") || "[]");
        return vocab.find((item: { id: string; meanings: Record<string, string> }) => item.id === "ja-food-basic-1")?.meanings[
          "Simplified Chinese"
        ];
      })
    )
    .toBe("饭，吃饭");
});

test("remote vocabulary without bundled audio coverage is skipped", async ({ page }) => {
  await page.route("**/rest/v1/vocabulary**", (route) =>
    route.fulfill({
      status: 200,
      headers: {
        "content-range": "0-1/2",
        "content-type": "application/json",
      },
      body: JSON.stringify([
        {
          id: "ja-food-basic-1",
          target_language: "ja",
          level: "basic",
          topic: "food",
          target_text: "ご飯",
          reading: "ごはん",
          romanization: "gohan",
          meaning_en: "meal",
          meaning_zh_cn: "饭",
          example_text: "朝ご飯を食べます。",
          example_translation_en: "I eat breakfast.",
          example_translation_zh_cn: "我吃早饭。",
        },
        {
          id: "ja-food-basic-999",
          target_language: "ja",
          level: "basic",
          topic: "food",
          target_text: "未生成の音声",
          reading: "みせいせいのおんせい",
          romanization: "missing-audio",
          meaning_en: "missing audio",
          meaning_zh_cn: "缺少音频",
          example_text: "未生成の音声です。",
          example_translation_en: "The audio has not been generated.",
          example_translation_zh_cn: "音频尚未生成。",
        },
      ]),
    })
  );
  await page.addInitScript(() => {
    window.localStorage.setItem("lingosleep-onboarded", "true");
  });

  await page.goto("/");

  await expect
    .poll(() =>
      page.evaluate(() => {
        const vocab = JSON.parse(window.localStorage.getItem("lingosleep-vocab") || "[]") as Array<{ id: string }>;
        return {
          bundledDuplicateLoaded: vocab.some((item) => item.id === "ja-food-basic-1"),
          missingAudioLoaded: vocab.some((item) => item.id === "ja-food-basic-999"),
        };
      })
    )
    .toEqual({ bundledDuplicateLoaded: true, missingAudioLoaded: false });
});

test("advanced Korean meaning override keeps two native explanations", async ({ page }) => {
  await page.route("**/rest/v1/vocabulary**", (route) =>
    route.fulfill({
      status: 200,
      headers: {
        "content-range": "0-0/1",
        "content-type": "application/json",
      },
      body: JSON.stringify([
        {
          id: "ko-topik-advanced-4",
          target_language: "ko",
          level: "advanced",
          topic: "TOPIK",
          target_text: "현저하다",
          reading: "현저하다",
          romanization: "hyeonjeohada",
          meaning_en: "remarkable",
          meaning_zh_cn: "显著",
          example_text: "현저한 변화가 있었어요.",
          example_translation_en: "There was a significant change.",
          example_translation_zh_cn: "发生了显著变化。",
        },
      ]),
    })
  );
  await page.addInitScript(() => {
    window.localStorage.setItem("lingosleep-onboarded", "true");
    window.localStorage.setItem(
      "lingosleep-config",
      JSON.stringify({
        targetLanguage: "Korean",
        nativeLanguage: "Simplified Chinese",
        level: "Advanced",
        topic: "TOPIK",
        mode: "Recall mode",
        languageMinutes: 10,
        backgroundMinutes: 10,
        backgroundSound: "none",
        playbackOrder: "Start from beginning",
        voiceVolume: 0.72,
        nativeVoiceVolume: 0.95,
        targetVoiceRate: 1,
        nativeVoiceRate: 1,
        backgroundVolume: 0,
      })
    );
  });

  await page.goto("/");

  await expect
    .poll(() =>
      page.evaluate(() => {
        const vocab = JSON.parse(window.localStorage.getItem("lingosleep-vocab") || "[]");
        return vocab.find((item: { id: string; meanings: Record<string, string> }) => item.id === "ko-topik-advanced-4")?.meanings[
          "Simplified Chinese"
        ];
      })
    )
    .toBe("显著，明显");
});

test("bundled vocabulary uses paired native explanations", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("lingosleep-onboarded", "true");
  });

  await page.goto("/");

  await expect
    .poll(() =>
      page.evaluate(() => {
        const vocab = JSON.parse(window.localStorage.getItem("lingosleep-vocab") || "[]") as Array<{ meanings: Record<string, string> }>;
        return vocab.filter(
          (item) => !/[,;/]/.test(item.meanings.English) || !/[，,、；;]/.test(item.meanings["Simplified Chinese"])
        ).length;
      })
    )
    .toBe(0);
});

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
          mode: "Normal mode",
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
      window.__audioUrls = [];

      class FakeAudio {
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        onpause: (() => void) | null = null;
        volume = 1;
        playbackRate = 1;
        private currentSrc = "";

        constructor(url = "") {
          window.__audioAttempts = (window.__audioAttempts ?? 0) + 1;
          this.src = url;
        }

        get src() {
          return this.currentSrc;
        }

        set src(url: string) {
          this.currentSrc = url;
          window.__audioUrls?.push(url);
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
        { lang: "en-US", name: "Aria Female" },
        { lang: "en-US", name: "Michelle Female" },
        { lang: "en-US", name: "Samantha Female" },
        { lang: "en-US", name: "Brian Male" },
        { lang: "en-US", name: "Guy Male" },
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

    await expect.poll(() => page.evaluate(() => window.__spoken.slice(0, 3))).toEqual(["rice, meal", "ごはん", "ごはん"]);

    const expectedVoice = voiceStyle === "Female" ? "Kyoko Female" : "Otoya Male";
    const expectedNativeVoice = voiceStyle === "Female" ? "Brian Male" : "Michelle Female";
    await expect.poll(() => page.evaluate(() => window.__spokenVoices?.[0])).toBe(expectedNativeVoice);
    await expect.poll(() => page.evaluate(() => window.__spokenVoices?.slice(1, 3))).toEqual([expectedVoice, expectedVoice]);
    expect(await page.evaluate(() => window.__audioAttempts)).toBeGreaterThan(0);
    if (voiceStyle === "Male") {
      expect(await page.evaluate(() => window.__audioUrls?.some((url) => url.includes("/audio/target/male/ja-food-basic-1-word.mp3")))).toBe(true);
    }
  });
}

for (const nativeVoiceStyle of ["Female", "Male"] as VoiceStyle[]) {
  test(`simplified chinese native voice prefers the selected ${nativeVoiceStyle.toLowerCase()} voice`, async ({ page }) => {
    await page.addInitScript(({ nativeVoiceStyle }) => {
      window.localStorage.setItem("lingosleep-onboarded", "true");
      window.localStorage.setItem(
        "lingosleep-config",
        JSON.stringify({
          targetLanguage: "Japanese",
          nativeLanguage: "Simplified Chinese",
          level: "Basic",
          topic: "food",
          mode: "Normal mode",
          languageMinutes: 10,
          backgroundMinutes: 10,
          backgroundSound: "none",
          playbackOrder: "Start from beginning",
          voiceVolume: 0.72,
          nativeVoiceVolume: 0.95,
          targetVoiceStyle: "Female",
          nativeVoiceStyle,
          targetVoiceRate: 1,
          nativeVoiceRate: 1,
          targetDelaySeconds: 0,
          backgroundVolume: 0,
        })
      );

      window.__spoken = [];
      window.__spokenVoices = [];

      class FakeAudio {
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        onpause: (() => void) | null = null;
        volume = 1;
        playbackRate = 1;

        play() {
          this.onerror?.();
          return Promise.reject(new Error("audio unavailable"));
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
        { lang: "zh-CN", name: "Microsoft Xiaoxiao Female" },
        { lang: "zh-CN", name: "Microsoft Yunjian Male" },
        { lang: "ja-JP", name: "Kyoko Female" },
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
    }, { nativeVoiceStyle });

    await page.goto("/");
    await startSession(page);

    const expectedNativeVoice = nativeVoiceStyle === "Female" ? "Microsoft Xiaoxiao Female" : "Microsoft Yunjian Male";
    await expect.poll(() => page.evaluate(() => window.__spokenVoices?.[0])).toBe(expectedNativeVoice);
  });
}
