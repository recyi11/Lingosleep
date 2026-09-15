export type TargetLanguage = "Japanese" | "Korean" | "English";
export type NativeLanguage = "English" | "Simplified Chinese";
export type Level = "Basic" | "Intermediate" | "Advanced";
export type Topic =
  | "food"
  | "travel"
  | "daily life"
  | "numbers"
  | "common verbs"
  | "work"
  | "school"
  | "anime/drama"
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
  exampleSentence: string;
  exampleTranslations: Record<NativeLanguage, string>;
  status?: Familiarity;
  favorite?: boolean;
  timesPlayed?: number;
  lastPlayed?: string;
};

import { advancedVocab } from "./vocabulary-advanced";
import { advancedExpansion2 } from "./vocabulary-advanced-expansion-2";
import { basicVocab } from "./vocabulary-basic";
import { basicCuratedExpansion } from "./vocabulary-basic-expansion";
import { intermediateVocab } from "./vocabulary-intermediate";
import { advancedExpansion, intermediateExpansion } from "./vocabulary-expansion";
import { advancedNounExpansion, intermediateNounExpansion } from "./vocabulary-noun-expansion";
import { validatedHeadwordExpansion } from "./vocabulary-validated-expansion";

export const vocabSeed: VocabItem[] = [
  ...basicVocab,
  ...basicCuratedExpansion,
  ...intermediateVocab,
  ...intermediateExpansion,
  ...intermediateNounExpansion,
  ...advancedVocab,
  ...advancedExpansion2,
  ...advancedExpansion,
  ...advancedNounExpansion,
  ...validatedHeadwordExpansion,
];
