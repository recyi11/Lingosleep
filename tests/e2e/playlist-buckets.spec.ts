import { expect, test } from "@playwright/test";

type TargetLanguage = "Japanese" | "Korean";
type Level = "Basic" | "Intermediate" | "Advanced";

const bucketCases: Array<{ targetLanguage: TargetLanguage; level: Level; topics: string[] }> = [
  { targetLanguage: "Japanese", level: "Basic", topics: ["all topics", "food", "travel", "daily life", "numbers", "common verbs"] },
  { targetLanguage: "Korean", level: "Basic", topics: ["all topics", "food", "travel", "daily life", "numbers", "common verbs"] },
  { targetLanguage: "Japanese", level: "Intermediate", topics: ["all topics", "food", "travel", "daily life", "work", "school", "anime/drama"] },
  { targetLanguage: "Korean", level: "Intermediate", topics: ["all topics", "food", "travel", "daily life", "work", "school", "anime/drama"] },
  { targetLanguage: "Japanese", level: "Advanced", topics: ["all topics", "JLPT"] },
  { targetLanguage: "Korean", level: "Advanced", topics: ["all topics", "TOPIK"] },
];

for (const { targetLanguage, level, topics } of bucketCases) {
  for (const topic of topics) {
    test(`${targetLanguage} ${level} ${topic} playlist has 70 words`, async ({ page }) => {
      await page.addInitScript(
        ({ targetLanguage, level, topic }) => {
          window.localStorage.setItem("lingosleep-onboarded", "true");
          window.localStorage.setItem(
            "lingosleep-config",
            JSON.stringify({
              targetLanguage,
              nativeLanguage: "English",
              level,
              topic,
              mode: "Recall mode",
              languageMinutes: 10,
              backgroundMinutes: 10,
              backgroundSound: "none",
              playbackOrder: "Start from beginning",
              voiceVolume: 0.72,
              nativeVoiceVolume: 0.95,
              targetVoiceRate: 1,
              nativeVoiceRate: 1,
              pauseSeconds: 2.8,
              backgroundVolume: 0,
            })
          );
        },
        { targetLanguage, level, topic }
      );

      await page.goto("/");

      await expect(page.locator(".progress-card p")).toContainText("0/70");
    });
  }
}
