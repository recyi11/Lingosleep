export type TargetLanguage = "Japanese" | "Korean" | "English";
export type NativeLanguage = "English" | "Simplified Chinese";
export type Level = "Basic" | "Intermediate" | "Advanced";
export type ExamLevel = "N5" | "N4" | "N3" | "N2" | "N1";
export type KoreanGrade = "초급" | "중급" | "고급";
export type Topic =
  | "food"
  | "travel"
  | "daily life"
  | "numbers"
  | "common verbs"
  | "work"
  | "school"
  | "anime/drama"
  | "general"
  | "JLPT"
  | "TOPIK";
export type Familiarity = "New" | "Learning" | "Familiar" | "Mastered";
export type VocabItem = {
  id: string;
  targetLanguage: TargetLanguage;
  targetText: string;
  meanings: Record<NativeLanguage, string>;
  reading: string;
  romanization: string;
  level: Level;
  topic: Topic;
  examLevel?: ExamLevel;
  koreanGrade?: KoreanGrade;
  exampleSentence: string;
  exampleTranslations: Record<NativeLanguage, string>;
  status?: Familiarity;
  favorite?: boolean;
  timesPlayed?: number;
  lastPlayed?: string;
};

import { jlptLevelByWord } from "./jlpt-level-map";
import { koreanGradeByWord } from "./korean-level-map";
import { advancedVocab } from "./vocabulary-advanced";
import { advancedExpansion2 } from "./vocabulary-advanced-expansion-2";
import { basicVocab } from "./vocabulary-basic";
import { basicCuratedExpansion } from "./vocabulary-basic-expansion";
import { intermediateVocab } from "./vocabulary-intermediate";
import { intermediateCuratedExpansion } from "./vocabulary-intermediate-curated-expansion";
import { advancedExpansion, intermediateExpansion } from "./vocabulary-expansion";
import { advancedNounExpansion, intermediateNounExpansion } from "./vocabulary-noun-expansion";
import { validatedHeadwordExpansion } from "./vocabulary-validated-expansion";

const rawVocabSeed: VocabItem[] = [
  ...basicVocab,
  ...basicCuratedExpansion,
  ...intermediateVocab,
  ...intermediateExpansion,
  ...intermediateNounExpansion,
  ...intermediateCuratedExpansion,
  ...advancedVocab,
  ...advancedExpansion2,
  ...advancedExpansion,
  ...advancedNounExpansion,
  ...validatedHeadwordExpansion,
];


function levelFromJlpt(examLevel: ExamLevel): Level {
  if (examLevel === "N5" || examLevel === "N4") return "Basic";
  if (examLevel === "N3") return "Intermediate";
  return "Advanced";
}

function levelFromKoreanGrade(koreanGrade: KoreanGrade): Level {
  if (koreanGrade === "초급") return "Basic";
  if (koreanGrade === "중급") return "Intermediate";
  return "Advanced";
}

export function normalizeVocabForExam(item: VocabItem): VocabItem {
  if (item.targetLanguage === "Japanese") {
    const examLevel = jlptLevelByWord[item.targetText] as ExamLevel | undefined;
    if (examLevel) {
      return { ...item, examLevel, level: levelFromJlpt(examLevel), topic: "JLPT" };
    }
    if (item.topic === "JLPT") {
      const { examLevel: _unused, ...rest } = item;
      return { ...rest, topic: "general" };
    }
    return item;
  }

  if (item.targetLanguage === "Korean") {
    const koreanGrade = koreanGradeByWord[item.targetText] as KoreanGrade | undefined;
    if (koreanGrade) {
      return { ...item, koreanGrade, level: levelFromKoreanGrade(koreanGrade) };
    }
    if (item.topic === "TOPIK") {
      const { koreanGrade: _unused, ...rest } = item;
      return { ...rest, topic: "general" };
    }
  }

  return item;
}

export const vocabSeed: VocabItem[] = rawVocabSeed.map(normalizeVocabForExam);
