import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Check,
  ChevronLeft,
  Clock3,
  Cloud,
  Copy,
  Heart,
  History,
  List,
  Menu,
  Moon,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Settings,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Star,
  Volume2,
  Waves,
  X,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import {
  vocabSeed,
  normalizeVocabForExam,
  type Familiarity,
  type Level,
  type NativeLanguage,
  type TargetLanguage,
  type Topic,
  type VocabItem,
} from "./vocabulary";
import { ensureMeaningPairs } from "./meaning-pairs";
import "./styles.css";

type PlaybackMode =
  | "Normal mode"
  | "Recall mode"
  | "Word and example sentence"
  | "Target-language-only immersion";
type BackgroundSound = "soft rain" | "heavy rain" | "Rain and Thunder" | "none";
type PlaybackOrder = "Start from beginning" | "Start from last left" | "Random";
type ReviewTopic = Topic | "all topics";
type VoiceStyle = "Auto" | "Female" | "Male";
type SpeechRole = "target" | "native";
type PersistedVocabMetadata = Pick<VocabItem, "status" | "favorite" | "timesPlayed" | "lastPlayed">;
type VocabularyRow = {
  id: string;
  target_language: "ja" | "ko" | "en";
  level: "basic" | "intermediate" | "advanced";
  topic: string;
  target_text: string;
  reading: string | null;
  romanization: string | null;
  meaning_en: string;
  meaning_zh_cn: string | null;
  example_text: string | null;
  example_translation_en: string | null;
  example_translation_zh_cn: string | null;
};

type SessionConfig = {
  targetLanguage: TargetLanguage;
  nativeLanguage: NativeLanguage;
  level: Level;
  topic: ReviewTopic;
  mode: PlaybackMode;
  languageMinutes: number;
  backgroundMinutes: number;
  backgroundSound: BackgroundSound;
  playbackOrder: PlaybackOrder;
  voiceVolume: number;
  nativeVoiceVolume: number;
  targetVoiceRate: number;
  nativeVoiceRate: number;
  targetVoiceStyle: VoiceStyle;
  nativeVoiceStyle: VoiceStyle;
  targetDelaySeconds: number;
  pauseSeconds: number;
  backgroundVolume: number;
};

type SessionRecord = {
  id: string;
  date: string;
  config: SessionConfig;
  playedIds: string[];
};
type SyncPayload = {
  version: 1;
  config: SessionConfig;
  vocabMetadata: Array<PersistedVocabMetadata & { id: string }>;
  history: SessionRecord[];
  playlistPositions: Record<string, number>;
};

const nativeLanguages: NativeLanguage[] = ["English", "Simplified Chinese"];
const targetLanguages: TargetLanguage[] = ["Japanese", "Korean", "English"];
const japaneseVoiceBoost = 1.3;
const koreanVoiceBoost = 1.3;
const softRainBoost = 1.3;
const recentPlayedHistoryLimit = 200;

const voiceStyles: VoiceStyle[] = ["Female", "Male"];
const femaleVoiceHints = [
  "samantha",
  "victoria",
  "karen",
  "moira",
  "tessa",
  "fiona",
  "zira",
  "aria",
  "jenny",
  "susan",
  "kyoko",
  "nanami",
  "yuna",
  "sunhi",
];
const preferredEnglishFemaleVoiceHints = ["michelle", "aria", "jenny", "samantha", "zira", "susan", "victoria"];
const preferredVoiceHints: Partial<Record<string, Partial<Record<VoiceStyle, string[]>>>> = {
  "en-US": {
    Female: preferredEnglishFemaleVoiceHints,
    Male: ["brian", "guy", "andrew", "daniel", "mark"],
  },
  "zh-CN": {
    Female: ["xiaoxiao", "xiaoyi", "xiaohan", "huihui", "yaoyao"],
    Male: ["yunjian", "yunxi", "yunyang", "yunfeng", "kangkang"],
  },
  "ja-JP": {
    Female: ["nanami", "kyoko", "haruka"],
    Male: ["keita", "daichi", "otoya"],
  },
  "ko-KR": {
    Female: ["sunhi", "yuna"],
    Male: ["injoon", "jinho", "bongjin"],
  },
};
const maleVoiceHints = ["alex", "daniel", "fred", "tom", "david", "mark", "guy", "george", "ryan", "otoya", "keita", "jinho", "injoon"];
const allTopics: ReviewTopic = "all topics";
const levels: Level[] = ["Basic", "Intermediate", "Advanced"];
const topics: Topic[] = [
  "food",
  "travel",
  "daily life",
  "numbers",
  "common verbs",
  "work",
  "school",
  "anime/drama",
  "general",
  "JLPT",
  "TOPIK",
];
const modes: PlaybackMode[] = [
  "Normal mode",
  "Recall mode",
  "Word and example sentence",
  "Target-language-only immersion",
];
const durations = [10, 20, 30, 45, 60];
const backgroundSounds: BackgroundSound[] = ["soft rain", "heavy rain", "Rain and Thunder", "none"];
const playbackOrders: PlaybackOrder[] = ["Start from beginning", "Start from last left", "Random"];
const rainSoundUrls: Partial<Record<BackgroundSound, string>> = {
  "soft rain": "/audio/background/soft-rain.mp3",
  "heavy rain": "/audio/background/heavy-rain.mp3",
  "Rain and Thunder": "/audio/background/thunderstorm.mp3",
};
const syncAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const simplifiedChineseLabels: Record<string, string> = {
  "Night vocabulary review": "词汇复习",
  "Relaxed vocabulary review for quiet nights.": "适合安静时段的轻松词汇复习。",
  "Review Japanese, Korean, or English words with validated course data, gentle pacing, translations, examples, and calming sound beds. It supports review while resting, without promising sleep-only fluency.":
    "用经过整理的课程词汇复习日语或韩语，包含舒缓节奏、翻译、例句和背景声音。它适合休息时复习，但不承诺只靠睡眠就能流利掌握。",
  "Gentle review for rest time. Fluency still needs active study, speaking, reading, and recall practice.":
    "适合休息时的轻松复习。真正流利仍然需要主动学习、开口、阅读和回忆练习。",
  Begin: "开始",
  "Back to setup": "返回设置",
  "Session history": "复习记录",
  "Sync account": "同步账号",
  "Create temporary account": "创建临时账号",
  Connect: "连接",
  "Save now": "立即保存",
  "Copy sync code": "复制同步码",
  "Local only": "仅本机",
  "Sync enabled": "已启用同步",
  "Temporary account created": "临时账号已创建",
  "Loaded remote progress": "已载入云端进度",
  "Saved to Supabase": "已保存到 Supabase",
  "Synced just now": "刚刚已同步",
  "Sync failed": "同步失败",
  "Sync code copied": "同步码已复制",
  "Target language": "目标语言",
  "Native language": "母语",
  "Target speed": "目标语语速",
  "Native speed": "母语语速",
  "Target voice style": "目标语声线",
  "Native voice style": "母语声线",
  Female: "女声",
  Male: "男声",
  Level: "等级",
  Topic: "词库",
  "Playback mode": "播放模式",
  "Word order": "单词顺序",
  Finished: "完成",
  "in this playlist": "当前播放列表",
  "words total": "总词数",
  "random order": "随机顺序",
  "start from first word": "从第一个词开始",
  "all words finished": "全部词已完成",
  "continue from": "继续：",
  Timers: "计时",
  "Language playback": "语言播放",
  "Background sound": "背景声音",
  Volume: "音量",
  "Target voice": "目标语音量",
  "Native voice": "母语音量",
  "Meaning to target delay": "释义到目标词间隔",
  Background: "背景音量",
  "Pause between words": "单词间隔",
  "Start random session": "开始随机复习",
  "Continue session": "继续复习",
  "Start session": "开始复习",
  "Morning quiz": "晨间测验",
  "review session": "复习",
  "Settling in": "准备中",
  "Voice will begin after you tap play": "点击播放后开始朗读",
  Voice: "语音",
  Sound: "背景音",
  "Add this app to your home screen for the best mobile lock-screen playback support. Browser policies may vary.":
    "添加到主屏幕可获得更好的手机锁屏播放支持。不同浏览器支持可能不同。",
  "Completed sessions will appear here with every word that was played.": "完成的复习会显示在这里，并列出播放过的单词。",
  words: "个词",
  played: "播放",
  New: "新词",
  Learning: "学习中",
  Familiar: "熟悉",
  Mastered: "已掌握",
  "Toggle favorite": "收藏/取消收藏",
  "Finish a session first, then tomorrow's recall quiz will use those words.": "先完成一次复习，明天的回忆测验会使用这些词。",
  "Morning recall": "晨间回忆",
  "Try to recall the target-language word before revealing it.": "先尝试回想目标语单词，再查看答案。",
  Reveal: "显示答案",
  "I remembered": "我记住了",
  Done: "完成",
  Japanese: "日本語",
  Korean: "한국어",
  English: "英语",
  "Simplified Chinese": "中文",
  Basic: "基础",
  Intermediate: "中级",
  Advanced: "高级",
  general: "通用",
  "JLPT N5-N4 / Korean 초급 (~TOPIK 1-2)": "JLPT N5-N4 / Korean 초급 (~TOPIK 1-2)",
  "JLPT N3 / Korean 중급 (~TOPIK 3-4)": "JLPT N3 / Korean 중급 (~TOPIK 3-4)",
  "JLPT N2-N1 / Korean 고급 (~TOPIK 5-6)": "JLPT N2-N1 / Korean 고급 (~TOPIK 5-6)",
  "all topics": "全部词库",
  food: "食物",
  travel: "旅行",
  "daily life": "日常生活",
  numbers: "数字",
  "common verbs": "常用动词",
  work: "工作",
  school: "学校",
  "anime/drama": "动漫/剧集",
  "Normal mode": "正常模式",
  "Recall mode": "回忆模式",
  "Word and example sentence": "单词和例句",
  "Target-language-only immersion": "仅目标语沉浸",
  "Start from beginning": "从头开始",
  "Start from last left": "从上次位置继续",
  Random: "随机",
  "soft rain": "小雨",
  "heavy rain": "大雨",
  "Rain and Thunder": "雨声和雷声",
  "white noise": "白噪音",
  "brown noise": "棕噪音",
  fireplace: "壁炉声",
  none: "无",
  "View playlist": "查看播放列表",
  "Current playlist": "当前播放列表",
  "Shuffle words": "换一批词",
  Settings: "设置",
  Playlist: "播放列表",
  Quiz: "测验",
  "Next batch": "下一批",
  Shuffle: "随机",
  Batch: "第",
};

function translate(text: string, nativeLanguage: NativeLanguage) {
  return nativeLanguage === "Simplified Chinese" ? simplifiedChineseLabels[text] || text : text;
}

const languageDisplayNames: Record<TargetLanguage | NativeLanguage, string> = {
  Japanese: "日本語",
  Korean: "한국어",
  English: "English",
  "Simplified Chinese": "中文",
};

function displayLabel(text: string, uiLanguage: NativeLanguage) {
  if (text in languageDisplayNames) return languageDisplayNames[text as TargetLanguage | NativeLanguage];
  if (text === "Chinese") return "中文";
  return translate(text, uiLanguage);
}

const defaultConfig: SessionConfig = {
  targetLanguage: "Japanese",
  nativeLanguage: "English",
  level: "Basic",
  topic: "daily life",
  mode: "Recall mode",
  languageMinutes: 20,
  backgroundMinutes: 45,
  backgroundSound: "soft rain",
  playbackOrder: "Start from last left",
  voiceVolume: 0.72,
  nativeVoiceVolume: 0.95,
  targetVoiceRate: 1,
  nativeVoiceRate: 1,
  targetVoiceStyle: "Female",
  nativeVoiceStyle: "Female",
  targetDelaySeconds: 2.8,
  pauseSeconds: 1.6,
  backgroundVolume: 0.34,
};

const familiarityValues: Familiarity[] = ["New", "Learning", "Familiar", "Mastered"];

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function compactSyncCode(code: string) {
  const compact = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return compact.startsWith("LS") ? compact.slice(2) : compact;
}

function formatSyncCode(code: string) {
  return `LS-${code.match(/.{1,4}/g)?.join("-") || code}`;
}

function generateSyncCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let code = "";
  for (const byte of bytes) code += syncAlphabet[byte % syncAlphabet.length];
  return formatSyncCode(code);
}

async function syncKeyFromCode(code: string) {
  const compact = compactSyncCode(code);
  if (compact.length !== 16) throw new Error("Sync code must have 16 characters.");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`lingosleep-sync:${compact}`));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createSyncPayload(
  config: SessionConfig,
  vocab: VocabItem[],
  history: SessionRecord[],
  playlistPositions: Record<string, number>
): SyncPayload {
  return {
    version: 1,
    config,
    vocabMetadata: vocab.map((item) => ({
      id: item.id,
      status: item.status,
      favorite: item.favorite,
      timesPlayed: item.timesPlayed,
      lastPlayed: item.lastPlayed,
    })),
    history,
    playlistPositions,
  };
}

function readPlaylistPositions(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, number] => typeof entry[1] === "number")
  );
}

function readHistory(value: unknown): SessionRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (record): record is SessionRecord =>
      record &&
      typeof record === "object" &&
      typeof (record as SessionRecord).id === "string" &&
      typeof (record as SessionRecord).date === "string" &&
      Array.isArray((record as SessionRecord).playedIds)
  );
}

function readSyncPayload(value: unknown): Partial<SyncPayload> {
  if (!value || typeof value !== "object") return {};
  return value as Partial<SyncPayload>;
}

function normalizeConfig(config: SessionConfig): SessionConfig {
  const storedBackground = (config as { backgroundSound?: string }).backgroundSound;
  const storedTopic = (config as { topic?: string }).topic;
  const backgroundSound =
    storedBackground === "rain"
      ? "soft rain"
      : storedBackground === "thunderstorm"
        ? "Rain and Thunder"
      : backgroundSounds.includes(storedBackground as BackgroundSound)
        ? (storedBackground as BackgroundSound)
        : defaultConfig.backgroundSound;
  const nativeVoiceVolume =
    typeof (config as SessionConfig & { nativeVoiceVolume?: unknown }).nativeVoiceVolume === "number"
      ? (config as SessionConfig & { nativeVoiceVolume: number }).nativeVoiceVolume
      : Math.min(1, config.voiceVolume * 1.35);
  const targetVoiceRate =
    typeof (config as SessionConfig & { targetVoiceRate?: unknown }).targetVoiceRate === "number"
      ? (config as SessionConfig & { targetVoiceRate: number }).targetVoiceRate
      : defaultConfig.targetVoiceRate;
  const nativeVoiceRate =
    typeof (config as SessionConfig & { nativeVoiceRate?: unknown }).nativeVoiceRate === "number"
      ? (config as SessionConfig & { nativeVoiceRate: number }).nativeVoiceRate
      : defaultConfig.nativeVoiceRate;
  const pauseSeconds =
    typeof (config as SessionConfig & { pauseSeconds?: unknown }).pauseSeconds === "number"
      ? (config as SessionConfig & { pauseSeconds: number }).pauseSeconds
      : defaultConfig.pauseSeconds;
  const targetDelaySeconds =
    typeof (config as SessionConfig & { targetDelaySeconds?: unknown }).targetDelaySeconds === "number"
      ? (config as SessionConfig & { targetDelaySeconds: number }).targetDelaySeconds
      : defaultConfig.targetDelaySeconds;
  const storedTargetVoiceStyle = (config as SessionConfig & { targetVoiceStyle?: unknown }).targetVoiceStyle;
  const storedNativeVoiceStyle = (config as SessionConfig & { nativeVoiceStyle?: unknown }).nativeVoiceStyle;
  const nativeVoiceStyle = voiceStyles.includes(storedNativeVoiceStyle as VoiceStyle)
    ? (storedNativeVoiceStyle as VoiceStyle)
    : defaultConfig.nativeVoiceStyle;

  return {
    ...config,
    backgroundSound,
    playbackOrder: playbackOrders.includes((config as SessionConfig & { playbackOrder?: PlaybackOrder }).playbackOrder)
      ? (config as SessionConfig & { playbackOrder: PlaybackOrder }).playbackOrder
      : defaultConfig.playbackOrder,
    topic: storedTopic === allTopics || topics.includes(storedTopic as Topic) ? (storedTopic as ReviewTopic) : defaultConfig.topic,
    nativeVoiceVolume,
    targetVoiceRate,
    nativeVoiceRate,
    targetVoiceStyle: voiceStyles.includes(storedTargetVoiceStyle as VoiceStyle) ? (storedTargetVoiceStyle as VoiceStyle) : nativeVoiceStyle,
    nativeVoiceStyle,
    targetDelaySeconds,
    pauseSeconds,
    nativeLanguage: nativeLanguages.includes(config.nativeLanguage) ? config.nativeLanguage : "Simplified Chinese",
  };
}

function withDefaultMetadata(item: VocabItem): VocabItem {
  return { ...item, meanings: ensureMeaningPairs(item.meanings), status: "New", favorite: false, timesPlayed: 0 };
}

function readPersistedVocabMetadata(stored: unknown): PersistedVocabMetadata {
  if (!stored || typeof stored !== "object") return {};

  const record = stored as Partial<VocabItem>;
  const metadata: PersistedVocabMetadata = {};

  if (record.status && familiarityValues.includes(record.status)) {
    metadata.status = record.status;
  }
  if (typeof record.favorite === "boolean") {
    metadata.favorite = record.favorite;
  }
  if (typeof record.timesPlayed === "number" && Number.isFinite(record.timesPlayed) && record.timesPlayed >= 0) {
    metadata.timesPlayed = record.timesPlayed;
  }
  if (typeof record.lastPlayed === "string") {
    metadata.lastPlayed = record.lastPlayed;
  }

  return metadata;
}

function mergeVocabMetadata(items: VocabItem[], stored: unknown[]) {
  const storedById = new Map(stored.map((item) => [(item as { id?: unknown }).id, item]));
  return items.map((item) => ({ ...withDefaultMetadata(item), ...readPersistedVocabMetadata(storedById.get(item.id)) }));
}

function mapVocabularyRow(row: VocabularyRow): VocabItem | null {
  const targetLanguage =
    row.target_language === "ja" ? "Japanese" : row.target_language === "ko" ? "Korean" : row.target_language === "en" ? "English" : null;
  const level = row.level === "basic" ? "Basic" : row.level === "intermediate" ? "Intermediate" : row.level === "advanced" ? "Advanced" : null;
  const topic = row.topic === "life" ? "daily life" : row.topic;
  if (!targetLanguage || !level || !topics.includes(topic as Topic)) return null;

  return normalizeVocabForExam({
    id: row.id,
    targetLanguage,
    targetText: row.target_text,
    meanings: { English: row.meaning_en, "Simplified Chinese": row.meaning_zh_cn || row.meaning_en },
    reading: row.reading || row.target_text,
    romanization: row.romanization || "",
    level,
    topic: topic as Topic,
    exampleSentence: row.example_text || row.target_text,
    exampleTranslations: {
      English: row.example_translation_en || row.meaning_en,
      "Simplified Chinese": row.example_translation_zh_cn || row.meaning_zh_cn || row.meaning_en,
    },
  });
}

async function fetchRemoteVocabulary() {
  const { data, error } = await supabase
    .from("vocabulary")
    .select("id,target_language,level,topic,target_text,reading,romanization,meaning_en,meaning_zh_cn,example_text,example_translation_en,example_translation_zh_cn");
  if (error) {
    console.warn("Failed to load vocabulary:", error);
    return [];
  }
  return (data || []).map((row) => mapVocabularyRow(row as VocabularyRow)).filter(Boolean) as VocabItem[];
}

function voiceMatchesStyle(voice: SpeechSynthesisVoice, style: VoiceStyle) {
  const name = voice.name.toLowerCase();
  const hints = style === "Female" ? femaleVoiceHints : maleVoiceHints;
  const genericMatch = style === "Female" ? /\b(female|woman)\b/.test(name) : /\b(male|man)\b/.test(name);
  return genericMatch || hints.some((hint) => name.includes(hint));
}

function findVoiceByHints(voices: SpeechSynthesisVoice[], hints: string[]) {
  return hints.map((hint) => voices.find((voice) => voice.name.toLowerCase().includes(hint))).find(Boolean);
}

function pickStyledVoice(languageVoices: SpeechSynthesisVoice[], speechLang: string, voiceStyle: VoiceStyle) {
  if (voiceStyle === "Auto") return undefined;
  const preferredHints = preferredVoiceHints[speechLang]?.[voiceStyle];
  if (preferredHints) return findVoiceByHints(languageVoices, preferredHints) || languageVoices.find((voice) => voiceMatchesStyle(voice, voiceStyle));
  return languageVoices.find((voice) => voiceMatchesStyle(voice, voiceStyle));
}

function speak(text: string, lang: TargetLanguage | NativeLanguage, volume: number, rateMultiplier: number, voiceStyle: VoiceStyle = "Auto") {
  return new Promise<void>((resolve) => {
    if (!("speechSynthesis" in window)) {
      globalThis.setTimeout(resolve, 900);
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    const speechLang =
      lang === "Japanese"
        ? "ja-JP"
        : lang === "Korean"
          ? "ko-KR"
          : lang === "Simplified Chinese"
            ? "zh-CN"
            : "en-US";
    utterance.lang = speechLang;
    utterance.rate = (lang === "English" ? 0.78 : 0.72) * rateMultiplier;
    utterance.pitch = 0.84;
    utterance.volume = volume;

    let spoken = false;
    let finished = false;
    let voicesTimer = 0;
    let watchdogTimer = 0;
    let handleVoicesChanged = () => undefined;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(voicesTimer);
      window.clearTimeout(watchdogTimer);
      utterance.onend = null;
      utterance.onerror = null;
      if (synth.onvoiceschanged === handleVoicesChanged) synth.onvoiceschanged = null;
      resolve();
    };
    const timeoutMs = Math.min(30000, Math.max(4000, (text.length * 280) / Math.max(0.5, rateMultiplier)));
    watchdogTimer = window.setTimeout(() => {
      synth.cancel();
      finish();
    }, timeoutMs);
    utterance.onend = finish;
    utterance.onerror = finish;

    const speakWithBestVoice = (voices: SpeechSynthesisVoice[]) => {
      if (spoken) return;
      spoken = true;
      const languageVoices = voices.filter(
        (voice) => voice.lang === speechLang || voice.lang.toLowerCase().startsWith(speechLang.slice(0, 2).toLowerCase())
      );
      utterance.voice =
        pickStyledVoice(languageVoices, speechLang, voiceStyle) ||
        languageVoices.find((voice) => voice.lang === speechLang) ||
        languageVoices[0] ||
        null;
      synth.speak(utterance);
    };
    handleVoicesChanged = () => {
      window.clearTimeout(voicesTimer);
      speakWithBestVoice(synth.getVoices());
    };

    const voices = synth.getVoices();
    if (voices.length) {
      speakWithBestVoice(voices);
      return;
    }

    voicesTimer = window.setTimeout(() => speakWithBestVoice(synth.getVoices()), 500);
    synth.onvoiceschanged = handleVoicesChanged;
  });
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const silentAudioUrls = new Map<number, string>();

function silentAudioUrl(ms: number) {
  const roundedMs = Math.max(50, Math.round(ms));
  const cached = silentAudioUrls.get(roundedMs);
  if (cached) return cached;

  const sampleRate = 8000;
  const samples = Math.ceil((roundedMs / 1000) * sampleRate);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples * 2, true);

  const url = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  silentAudioUrls.set(roundedMs, url);
  return url;
}

function supabaseAudioUrl(storagePath: string) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url || url === "https://example.supabase.co") return undefined;
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/audio/${storagePath}`;
}

function audioSources(storagePath: string, remoteFirst = false) {
  const localUrl = `/audio/${storagePath}`;
  const remoteUrl = supabaseAudioUrl(storagePath);
  return (remoteFirst ? [remoteUrl, localUrl] : [localUrl, remoteUrl]).filter(Boolean) as string[];
}

function styledTargetAudioSources(itemId: string, kind: "word" | "example", style: VoiceStyle) {
  const fileName = `${itemId}-${kind}.mp3`;
  if (style === "Male") return audioSources(`target/male/${fileName}`, true);
  if (style === "Female") return [...audioSources(`target/${fileName}`, true), ...audioSources(`target/female/${fileName}`, true)];
  return audioSources(`target/${fileName}`, true);
}

function nativeAudioSources(itemId: string, kind: "meaning" | "example", language: NativeLanguage, style: VoiceStyle) {
  const languagePath = language === "English" ? "en" : language === "Simplified Chinese" ? "zh-cn" : null;
  if (!languagePath) return [];
  const fileName = `${itemId}-${kind}.mp3`;
  if (style === "Male") return audioSources(`native/${languagePath}/male/${fileName}`, true);
  if (style === "Female") return [...audioSources(`native/${languagePath}/${fileName}`, true), ...audioSources(`native/${languagePath}/female/${fileName}`, true)];
  return audioSources(`native/${languagePath}/${fileName}`, true);
}

function useBackgroundSound(sound: BackgroundSound, volume: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const gainVolume = () => Math.min(1, volumeRef.current * (sound === "soft rain" ? softRainBoost : 1));

  const crossfadeDuration = 4;
  const crossfadeCheckInterval = 500;
  const crossfadeTimerRef = useRef<number | null>(null);

  const startCrossfadeLoop = (audio: HTMLAudioElement) => {
    if (crossfadeTimerRef.current) clearInterval(crossfadeTimerRef.current);
    crossfadeTimerRef.current = window.setInterval(() => {
      if (!audio || audio.paused) return;
      const remaining = audio.duration - audio.currentTime;
      if (remaining > crossfadeDuration || !isFinite(audio.duration)) return;
      // Start crossfade: create next instance
      clearInterval(crossfadeTimerRef.current!);
      crossfadeTimerRef.current = null;
      const next = new Audio(audio.src);
      next.preload = "auto";
      next.volume = 0;
      next.loop = false;
      void next.play().then(() => {
        // Fade in next, fade out current
        const steps = 20;
        const interval = (crossfadeDuration * 1000) / steps;
        let step = 0;
        const targetVol = gainVolume();
        const fadeTimer = setInterval(() => {
          step += 1;
          const progress = step / steps;
          next.volume = Math.min(1, targetVol * progress);
          audio.volume = Math.max(0, targetVol * (1 - progress));
          if (step >= steps) {
            clearInterval(fadeTimer);
            audio.pause();
            audio.currentTime = 0;
            next.volume = targetVol;
            audioRef.current = next;
            startCrossfadeLoop(next);
          }
        }, interval);
      }).catch(() => {
        // Fallback: just loop normally
        audio.loop = true;
      });
    }, crossfadeCheckInterval);
  };

  const start = () => {
    if (sound === "none" || audioRef.current) return;
    const audioSession = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (audioSession) audioSession.type = "playback";
    const audio = new Audio(rainSoundUrls[sound]!);
    audio.loop = false;
    audio.preload = "auto";
    audio.volume = gainVolume();
    audioRef.current = audio;
    void audio.play().then(() => {
      startCrossfadeLoop(audio);
    }).catch(() => {
      if (audioRef.current === audio) audioRef.current = null;
    });
  };

  const stop = () => {
    if (crossfadeTimerRef.current) { clearInterval(crossfadeTimerRef.current); crossfadeTimerRef.current = null; }
    const audio = audioRef.current;
    if (!audio) return;
    audioRef.current = null;
    const startVol = audio.volume;
    const fadeDuration = 3000;
    const steps = 30;
    const interval = fadeDuration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      audio.volume = Math.max(0, startVol * (1 - step / steps));
      if (step >= steps) {
        clearInterval(timer);
        audio.pause();
        audio.currentTime = 0;
      }
    }, interval);
  };

  const duck = (_active: boolean) => undefined;

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = gainVolume();
  }, [volume, sound]);

  useEffect(() => stop, []);

  return { start, stop, duck };
}

function App() {
  const [config, setConfig] = useState<SessionConfig>(() => normalizeConfig(loadJson("lingosleep-config", defaultConfig)));
  const t = (text: string) => translate(text, config.nativeLanguage);
  const label = (text: string) => displayLabel(text, config.nativeLanguage);
  const configRef = useRef(config);
  const [vocab, setVocab] = useState<VocabItem[]>(() => {
    const stored = loadJson<unknown>("lingosleep-vocab", null);
    return mergeVocabMetadata(vocabSeed, Array.isArray(stored) ? stored : []);
  });
  const [history, setHistory] = useState<SessionRecord[]>(() => loadJson("lingosleep-history", []));
  const [playlistPositions, setPlaylistPositions] = useState<Record<string, number>>(() => loadJson("lingosleep-playlist-positions", {}));
  const [syncCode, setSyncCode] = useState(() => localStorage.getItem("lingosleep-sync-code") || "");
  const [syncCodeInput, setSyncCodeInput] = useState("");
  const [syncStatus, setSyncStatus] = useState(syncCode ? "Sync enabled" : "Local only");
  const [syncReady, setSyncReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [step, setStep] = useState<"onboarding" | "setup" | "player" | "history" | "quiz" | "playlist">(() =>
    localStorage.getItem("lingosleep-onboarded") ? "setup" : "onboarding"
  );
  const [playlistSeed, setPlaylistSeed] = useState(0);
  const [playlistPage, setPlaylistPage] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentItem, setCurrentItem] = useState<VocabItem | null>(null);
  const [playedIds, setPlayedIds] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(config.languageMinutes * 60);
  const [backgroundLeft, setBackgroundLeft] = useState(config.backgroundMinutes * 60);
  const playingRef = useRef(false);
  const pausedRef = useRef(false);
  const sessionTokenRef = useRef(0);
  const playedIdsRef = useRef<string[]>([]);
  const background = useBackgroundSound(config.backgroundSound, config.backgroundVolume);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const availableTopics = useMemo(
    () => [
      allTopics,
      ...topics.filter((topic) =>
        vocab.some((item) => item.targetLanguage === config.targetLanguage && item.level === config.level && item.topic === topic)
      ),
    ],
    [config.targetLanguage, config.level, vocab]
  );

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (availableTopics.length && !availableTopics.includes(config.topic)) {
      updateConfig("topic", availableTopics[0]);
    }
  }, [availableTopics, config.topic]);

  useEffect(() => {
    setPlaylistSeed(0);
    setPlaylistPage(0);
  }, [config.targetLanguage, config.level, config.topic]);

  useEffect(() => localStorage.setItem("lingosleep-config", JSON.stringify(config)), [config]);
  useEffect(() => localStorage.setItem("lingosleep-vocab", JSON.stringify(vocab)), [vocab]);
  useEffect(() => localStorage.setItem("lingosleep-history", JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem("lingosleep-playlist-positions", JSON.stringify(playlistPositions)), [playlistPositions]);
  useEffect(() => {
    if (syncCode) localStorage.setItem("lingosleep-sync-code", syncCode);
    else localStorage.removeItem("lingosleep-sync-code");
  }, [syncCode]);
  useEffect(() => {
    void supabase.auth.getSession().then(({ error }) => {
      if (error) console.warn("Supabase auth session check failed", error);
    });
    if (import.meta.env.VITE_SUPABASE_URL === "https://example.supabase.co") return;
    void fetchRemoteVocabulary()
      .then((remoteVocab) => {
        if (remoteVocab.length) {
          // Keep the reviewed bundled vocabulary authoritative for shared IDs.
          // Supabase may still contain legacy/generated rows; use it only to fill
          // IDs that are not present in the curated local seed.
          setVocab((current) => mergeVocabMetadata(takeUniqueVocabulary([...vocabSeed, ...remoteVocab]), current));
        }
      })
      .catch((error) => {
        console.warn("Supabase vocabulary load failed; using bundled vocabulary", error);
      });
  }, []);

  const recentPlayedIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const record of history) {
      for (const id of record.playedIds) {
        if (seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
        if (ids.length >= recentPlayedHistoryLimit) return ids;
      }
    }
    return ids;
  }, [history]);
  const playlist = useMemo(() => buildPlaylist(vocab, config, playlistSeed), [vocab, config, playlistSeed]);
  const playlistKey = useMemo(() => getPlaylistKey(config), [config.targetLanguage, config.level, config.topic]);
  const playlistPageCount = 1;
  const completedWords = Math.min(playlist.length, Math.max(0, playlistPositions[playlistKey] || 0));
  const resumeWord = playlist[completedWords % (playlist.length || 1)];
  const progressPercent = playlist.length ? Math.round((completedWords / playlist.length) * 100) : 0;
  const targetLanguageWordCount = vocab.filter((item) => item.targetLanguage === config.targetLanguage).length;
  const lastSessionWords = useMemo(() => {
    const last = history[0];
    if (!last) return [];
    return last.playedIds.map((id) => vocab.find((item) => item.id === id)).filter(Boolean) as VocabItem[];
  }, [history, vocab]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentItem ? currentItem.targetText : t("Night vocabulary review"),
      artist: "LingoSleep",
      album: `${config.targetLanguage} ${config.level}`,
    });
    navigator.mediaSession.setActionHandler("play", () => startSession());
    navigator.mediaSession.setActionHandler("pause", () => pauseSession());
  }, [currentItem, config]);

  useEffect(() => {
    if (!isPlaying || isPaused) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
      setBackgroundLeft((value) => {
        const next = Math.max(0, value - 1);
        if (next === 0) background.stop();
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, isPaused]);

  const updateConfig = <K extends keyof SessionConfig>(key: K, value: SessionConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const markPlayed = (item: VocabItem) => {
    if (!playedIdsRef.current.includes(item.id)) {
      playedIdsRef.current = [...playedIdsRef.current, item.id];
    }
    setPlayedIds((ids) => (ids.includes(item.id) ? ids : [...ids, item.id]));
    setVocab((items) =>
      items.map((candidate) => {
        if (candidate.id !== item.id) return candidate;
        const timesPlayed = (candidate.timesPlayed || 0) + 1;
        const status: Familiarity =
          timesPlayed >= 8 ? "Mastered" : timesPlayed >= 4 ? "Familiar" : timesPlayed >= 1 ? "Learning" : "New";
        return { ...candidate, timesPlayed, status, lastPlayed: new Date().toISOString() };
      })
    );
  };

  const isSessionActive = (sessionToken: number) => playingRef.current && sessionTokenRef.current === sessionToken;

  const waitUntilResumed = async (sessionToken: number) => {
    while (isSessionActive(sessionToken) && pausedRef.current) {
      await wait(100);
    }
    return isSessionActive(sessionToken);
  };

  const playAudioIfPlaying = async (url: string, volume: number, rate: number, sessionToken: number, timeoutMs = 8000) => {
    if (!isSessionActive(sessionToken)) return false;
    if (!(await waitUntilResumed(sessionToken))) return false;
    const audio = currentAudioRef.current || new Audio();
    currentAudioRef.current = audio;
    audio.src = url;
    audio.loop = false;
    audio.currentTime = 0;
    audio.volume = volume;
    audio.playbackRate = rate;
    let settled = false;

    return new Promise<boolean>((resolve) => {
      let watchdogTimer = 0;
      const cleanup = () => {
        window.clearTimeout(watchdogTimer);
        audio.onended = null;
        audio.onerror = null;
        audio.onpause = null;
        audio.onloadedmetadata = null;
      };
      const finish = (played: boolean, stopAudio = false) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (stopAudio) audio.pause();
        resolve(played && isSessionActive(sessionToken));
      };
      const armWatchdog = (ms: number) => {
        window.clearTimeout(watchdogTimer);
        watchdogTimer = window.setTimeout(async () => {
          if (pausedRef.current && (await waitUntilResumed(sessionToken))) {
            armWatchdog(ms);
            return;
          }
          if (!isSessionActive(sessionToken)) {
            finish(false, true);
            return;
          }
          finish(false, true);
        }, ms);
      };

      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      audio.onpause = () => {
        if (!isSessionActive(sessionToken)) finish(false);
      };
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          armWatchdog(Math.max(timeoutMs, (audio.duration * 1000) / Math.max(0.25, rate) + 2500));
        }
      };
      armWatchdog(timeoutMs);
      const playPromise = audio.play?.();
      if (!playPromise) {
        finish(false);
      } else {
        playPromise.catch(() => finish(false));
      }
    });
  };

  const speakIfPlaying = async (
    role: SpeechRole,
    text: string,
    lang: TargetLanguage | NativeLanguage,
    volume: number,
    sessionToken: number,
    audioPaths: string[] = []
  ) => {
    if (!isSessionActive(sessionToken)) return false;
    if (!(await waitUntilResumed(sessionToken))) return false;
    const rate = role === "target" ? configRef.current.targetVoiceRate : configRef.current.nativeVoiceRate;
    const voiceStyle = role === "target" ? configRef.current.targetVoiceStyle : configRef.current.nativeVoiceStyle;
    for (const audioPath of audioPaths) {
      if (await playAudioIfPlaying(audioPath, volume, rate, sessionToken)) {
        return true;
      }
    }
    await speak(text, lang, volume, rate, voiceStyle);
    return isSessionActive(sessionToken);
  };

  const waitIfPlaying = async (ms: number, sessionToken: number) => {
    if (!isSessionActive(sessionToken)) return false;
    if (!(await waitUntilResumed(sessionToken))) return false;
    if (ms > 0 && !(await playAudioIfPlaying(silentAudioUrl(ms), 0, 1, sessionToken, ms + 1000))) {
      let remaining = ms;
      while (isSessionActive(sessionToken) && remaining > 0) {
        if (pausedRef.current) {
          if (!(await waitUntilResumed(sessionToken))) return false;
          continue;
        }
        const chunk = Math.min(100, remaining);
        await wait(chunk);
        remaining -= chunk;
      }
    }
    return isSessionActive(sessionToken);
  };

  const speakItem = async (item: VocabItem, sessionToken: number) => {
    if (!isSessionActive(sessionToken)) return;
    const sessionConfig = config;
    const targetSpeechText = sessionConfig.targetLanguage === "Japanese" ? item.reading : item.targetText;
    // Audio files are keyed by ID, but several curated entries replaced the
    // old generated text while retaining the same IDs. Reusing those files can
    // make the spoken word disagree with the displayed word, so use live TTS
    // until audio assets are regenerated from the current vocabulary.
    const targetWordAudioPaths: string[] = [];
    const targetExampleAudioPaths: string[] = [];
    const nativeMeaningAudioPaths: string[] = [];
    const nativeExampleAudioPaths: string[] = [];
    const baseVolume = (multiplier = 1) => configRef.current.voiceVolume * multiplier;
    const targetBoost = sessionConfig.targetLanguage === "Japanese" ? japaneseVoiceBoost : sessionConfig.targetLanguage === "Korean" ? koreanVoiceBoost : 1;
    const voiceVolume = (multiplier = 1) => Math.min(1, baseVolume(multiplier) * targetBoost);
    const nativeVolume = (multiplier = 1) => Math.min(1, configRef.current.nativeVoiceVolume * multiplier);
    setCurrentItem(item);
    background.duck(true);
    if (sessionConfig.mode === "Normal mode") {
      if (!(await speakIfPlaying("native", item.meanings[sessionConfig.nativeLanguage], sessionConfig.nativeLanguage, nativeVolume(), sessionToken, nativeMeaningAudioPaths))) return;
      if (!(await waitIfPlaying(configRef.current.targetDelaySeconds * 1000, sessionToken))) return;
      if (!(await speakIfPlaying("target", targetSpeechText, sessionConfig.targetLanguage, voiceVolume(), sessionToken, targetWordAudioPaths))) return;
      if (!(await waitIfPlaying(700, sessionToken))) return;
      if (!(await speakIfPlaying("target", targetSpeechText, sessionConfig.targetLanguage, voiceVolume(0.92), sessionToken, targetWordAudioPaths))) return;
    } else if (sessionConfig.mode === "Recall mode") {
      if (!(await speakIfPlaying("native", item.meanings[sessionConfig.nativeLanguage], sessionConfig.nativeLanguage, nativeVolume(), sessionToken, nativeMeaningAudioPaths))) return;
      if (!(await waitIfPlaying(configRef.current.targetDelaySeconds * 1000, sessionToken))) return;
      background.duck(true);
      if (!(await speakIfPlaying("target", targetSpeechText, sessionConfig.targetLanguage, voiceVolume(), sessionToken, targetWordAudioPaths))) return;
      if (!(await waitIfPlaying(500, sessionToken))) return;
      if (!(await speakIfPlaying("target", targetSpeechText, sessionConfig.targetLanguage, voiceVolume(0.82), sessionToken, targetWordAudioPaths))) return;
    } else if (sessionConfig.mode === "Word and example sentence") {
      if (!(await speakIfPlaying("target", targetSpeechText, sessionConfig.targetLanguage, voiceVolume(), sessionToken, targetWordAudioPaths))) return;
      if (!(await waitIfPlaying(700, sessionToken))) return;
      if (!(await speakIfPlaying("native", item.meanings[sessionConfig.nativeLanguage], sessionConfig.nativeLanguage, nativeVolume(0.88), sessionToken, nativeMeaningAudioPaths))) return;
      if (!(await waitIfPlaying(900, sessionToken))) return;
      if (!(await speakIfPlaying("target", item.exampleSentence, sessionConfig.targetLanguage, voiceVolume(0.84), sessionToken, targetExampleAudioPaths))) return;
      if (!(await waitIfPlaying(700, sessionToken))) return;
      if (!(await speakIfPlaying("native", item.exampleTranslations[sessionConfig.nativeLanguage], sessionConfig.nativeLanguage, nativeVolume(0.74), sessionToken, nativeExampleAudioPaths))) return;
    } else {
      if (!(await speakIfPlaying("target", targetSpeechText, sessionConfig.targetLanguage, voiceVolume(), sessionToken, targetWordAudioPaths))) return;
      if (!(await waitIfPlaying(900, sessionToken))) return;
      if (!(await speakIfPlaying("target", item.exampleSentence, sessionConfig.targetLanguage, voiceVolume(0.78), sessionToken, targetExampleAudioPaths))) return;
    }
    if (!isSessionActive(sessionToken)) return;
    background.duck(false);
    markPlayed(item);
  };

  const startSession = async () => {
    if (playingRef.current && pausedRef.current) {
      resumeSession();
      return;
    }
    if (playingRef.current) return;
    if (!playlist.length) return;
    const sessionToken = sessionTokenRef.current + 1;
    sessionTokenRef.current = sessionToken;
    setStep("player");
    setIsPlaying(true);
    setIsPaused(false);
    playingRef.current = true;
    pausedRef.current = false;
    setSecondsLeft(config.languageMinutes * 60);
    setBackgroundLeft(config.backgroundMinutes * 60);
    setPlayedIds([]);
    playedIdsRef.current = [];
    background.start();
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";

    const started = Date.now();
    const sessionPlaylist =
      config.playbackOrder === "Random" ? deprioritizeRecent(shuffle(playlist), recentPlayedIds) : playlist;
    let index = config.playbackOrder === "Start from last left" ? completedWords % sessionPlaylist.length : 0;
    while (isSessionActive(sessionToken) && Date.now() - started < config.languageMinutes * 60 * 1000) {
      const item = sessionPlaylist[index % sessionPlaylist.length];
      await speakItem(item, sessionToken);
      if (!isSessionActive(sessionToken)) break;
      index += 1;
      if (config.playbackOrder !== "Random") {
        setPlaylistPositions((positions) => ({
          ...positions,
          [playlistKey]: Math.min(index, sessionPlaylist.length),
        }));
      }
      await waitIfPlaying(configRef.current.pauseSeconds * 1000, sessionToken);
    }
    if (isSessionActive(sessionToken)) {
      await fadeLanguage(sessionToken);
      if (!isSessionActive(sessionToken)) return;
      stopSession(true);
    }
  };

  const stopSession = (save: boolean) => {
    playingRef.current = false;
    pausedRef.current = false;
    sessionTokenRef.current += 1;
    window.speechSynthesis?.cancel();
    currentAudioRef.current?.pause();
    currentAudioRef.current = null;
    background.stop();
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    setIsPlaying(false);
    setIsPaused(false);
    const savedPlayedIds = Array.from(new Set(playedIdsRef.current));
    if (save && savedPlayedIds.length) {
      setHistory((records) => [
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          config,
          playedIds: savedPlayedIds,
        },
        ...records,
      ]);
    }
  };

  const pauseSession = () => {
    if (!playingRef.current || pausedRef.current) return;
    pausedRef.current = true;
    setIsPaused(true);
    window.speechSynthesis?.pause?.();
    currentAudioRef.current?.pause();
    background.stop();
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  };

  const resumeSession = () => {
    if (!playingRef.current || !pausedRef.current) return;
    pausedRef.current = false;
    setIsPaused(false);
    background.start();
    window.speechSynthesis?.resume?.();
    void currentAudioRef.current?.play().catch(() => undefined);
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
  };

  const fadeLanguage = async (sessionToken: number) => {
    for (let i = 0; i < 4; i += 1) {
      const fadeVolume = Math.max(0.05, configRef.current.voiceVolume * (0.25 - i * 0.05));
      if (!(await speakIfPlaying("native", "Good night.", "English", fadeVolume, sessionToken))) return;
      if (!(await waitIfPlaying(700, sessionToken))) return;
    }
  };

  const goToSetup = () => {
    if (playingRef.current) {
      stopSession(true);
    }
    setStep("setup");
  };

  const toggleFavorite = (id: string) => {
    setVocab((items) => items.map((item) => (item.id === id ? { ...item, favorite: !item.favorite } : item)));
  };

  const applySyncPayload = (value: unknown) => {
    const payload = readSyncPayload(value);
    if (payload.config) setConfig(normalizeConfig({ ...defaultConfig, ...payload.config } as SessionConfig));
    if (Array.isArray(payload.vocabMetadata)) {
      setVocab((items) => mergeVocabMetadata(items, payload.vocabMetadata as unknown[]));
    }
    setHistory(readHistory(payload.history));
    setPlaylistPositions(readPlaylistPositions(payload.playlistPositions));
  };

  const saveSyncData = async (code = syncCode, showStatus = false) => {
    if (!code) return;
    setIsSyncing(true);
    try {
      const accountKey = await syncKeyFromCode(code);
      const payload = createSyncPayload(configRef.current, vocab, history, playlistPositions);
      const { error } = await supabase.rpc("save_temp_account", { account_key_input: accountKey, payload_input: payload });
      if (error) throw error;
      setSyncStatus(showStatus ? "Saved to Supabase" : "Synced just now");
    } catch (error) {
      console.warn("Temporary account sync failed", error);
      setSyncStatus("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const createTempAccount = async () => {
    const code = generateSyncCode();
    setIsSyncing(true);
    try {
      const accountKey = await syncKeyFromCode(code);
      const payload = createSyncPayload(configRef.current, vocab, history, playlistPositions);
      const { error } = await supabase.rpc("create_temp_account", { account_key_input: accountKey, payload_input: payload });
      if (error) throw error;
      setSyncCode(code);
      setSyncCodeInput("");
      setSyncReady(true);
      setSyncStatus("Temporary account created");
    } catch (error) {
      console.warn("Temporary account creation failed", error);
      setSyncStatus("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const loadTempAccount = async (code: string) => {
    setIsSyncing(true);
    try {
      const accountKey = await syncKeyFromCode(code);
      const { data, error } = await supabase.rpc("get_temp_account", { account_key_input: accountKey });
      if (error) throw error;
      applySyncPayload(data);
      setSyncCode(code);
      setSyncReady(true);
      setSyncStatus("Loaded remote progress");
    } catch (error) {
      console.warn("Temporary account load failed", error);
      setSyncStatus("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const connectTempAccount = async () => {
    const compact = compactSyncCode(syncCodeInput);
    await loadTempAccount(formatSyncCode(compact));
    setSyncCodeInput("");
  };

  const copySyncCode = async () => {
    if (!syncCode || !navigator.clipboard) return;
    await navigator.clipboard.writeText(syncCode);
    setSyncStatus("Sync code copied");
  };

  useEffect(() => {
    if (!syncCode || !syncReady) return;
    const timer = window.setTimeout(() => void saveSyncData(), 1200);
    return () => window.clearTimeout(timer);
  }, [syncCode, syncReady, config, vocab, history, playlistPositions]);

  useEffect(() => {
    if (!syncCode) return;
    void loadTempAccount(syncCode);
  }, []);

  return (
    <main className="app-shell">
      <div className="app-bg" />
      {step !== "onboarding" && (
        <header className="topbar">
          {step === "setup" ? (
            <button className="icon-button" onClick={() => setDrawerOpen(true)} aria-label="Settings">
              <Menu size={22} />
            </button>
          ) : (
            <button className="icon-button" onClick={goToSetup} aria-label="Back">
              <ChevronLeft size={22} />
            </button>
          )}
          <div>
            <p className="eyebrow">LingoSleep</p>
            <h1>{step === "setup" ? `${label(config.targetLanguage)} · ${label(config.level)}` : t("Night vocabulary review")}</h1>
          </div>
          {step === "setup" ? (
            <button className="icon-button" onClick={() => setStep("history")} aria-label={t("Session history")}>
              <History size={21} />
            </button>
          ) : (
            <button className="icon-button" onClick={() => setStep("history")} aria-label={t("Session history")}>
              <History size={21} />
            </button>
          )}
        </header>
      )}

      {step === "onboarding" && (
        <section className="onboarding">
          <div className="moon-mark">
            <Moon size={42} />
          </div>
          <p className="eyebrow">LingoSleep</p>
          <h1>{t("Relaxed vocabulary review for quiet nights.")}</h1>
          <p>
            {t(
              "Review Japanese, Korean, or English words with validated course data, gentle pacing, translations, examples, and calming sound beds. It supports review while resting, without promising sleep-only fluency."
            )}
          </p>
          <button
            className="primary-button"
            onClick={() => {
              localStorage.setItem("lingosleep-onboarded", "true");
              setStep("setup");
            }}
          >
            <Sparkles size={19} />
            {t("Begin")}
          </button>
        </section>
      )}

      {/* Drawer overlay */}
      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}
      <aside className={`drawer ${drawerOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <h2><Settings size={18} /> {t("Settings")}</h2>
          <button className="icon-button" onClick={() => setDrawerOpen(false)}><X size={22} /></button>
        </div>
        <div className="drawer-body">
          <ControlGroup title={t("Target language")}>
            <Segmented options={targetLanguages} value={config.targetLanguage} labelFor={label} onChange={(value) => updateConfig("targetLanguage", value as TargetLanguage)} />
            <RangeControl icon={<Clock3 size={18} />} label={t("Target speed")} value={config.targetVoiceRate} min={0.5} max={2} step={0.1} valueText={`${config.targetVoiceRate.toFixed(1)}x`} onChange={(value) => updateConfig("targetVoiceRate", value)} />
            <span className="segmented-label">{t("Target voice style")}</span>
            <Segmented options={voiceStyles} value={config.targetVoiceStyle} labelFor={label} onChange={(value) => updateConfig("targetVoiceStyle", value as VoiceStyle)} />
          </ControlGroup>
          <ControlGroup title={t("Native language")}>
            <Segmented options={nativeLanguages} value={config.nativeLanguage} labelFor={label} onChange={(value) => updateConfig("nativeLanguage", value as NativeLanguage)} />
            <RangeControl icon={<Clock3 size={18} />} label={t("Native speed")} value={config.nativeVoiceRate} min={0.5} max={2} step={0.1} valueText={`${config.nativeVoiceRate.toFixed(1)}x`} onChange={(value) => updateConfig("nativeVoiceRate", value)} />
            <span className="segmented-label">{t("Native voice style")}</span>
            <Segmented options={voiceStyles} value={config.nativeVoiceStyle} labelFor={label} onChange={(value) => updateConfig("nativeVoiceStyle", value as VoiceStyle)} />
          </ControlGroup>
          <ControlGroup title={t("Level")}>
            <div className="choice-grid">
              {levels.map((level) => (
                <button key={level} className={`choice ${config.level === level ? "selected" : ""}`} onClick={() => updateConfig("level", level)}>
                  <strong>{label(level)}</strong>
                  <span>{level === "Basic" ? label("JLPT N5-N4 / Korean 초급 (~TOPIK 1-2)") : level === "Intermediate" ? label("JLPT N3 / Korean 중급 (~TOPIK 3-4)") : label("JLPT N2-N1 / Korean 고급 (~TOPIK 5-6)")}</span>
                </button>
              ))}
            </div>
          </ControlGroup>
          <ControlGroup title={t("Topic")}>
            <div className="pill-grid">
              {availableTopics.map((topic) => (
                <button key={topic} className={`pill ${config.topic === topic ? "selected" : ""}`} onClick={() => updateConfig("topic", topic)}>{label(topic)}</button>
              ))}
            </div>
          </ControlGroup>
          <ControlGroup title={t("Playback mode")}>
            <div className="choice-grid">
              {modes.map((mode) => (
                <button key={mode} className={`choice ${config.mode === mode ? "selected" : ""}`} onClick={() => updateConfig("mode", mode)}><strong>{label(mode)}</strong></button>
              ))}
            </div>
          </ControlGroup>
          <ControlGroup title={t("Word order")}>
            <Segmented options={playbackOrders} value={config.playbackOrder} labelFor={label} onChange={(value) => updateConfig("playbackOrder", value as PlaybackOrder)} />
          </ControlGroup>
          <ControlGroup title={t("Timers")}>
            <TimerPicker label={t("Language playback")} value={config.languageMinutes} onChange={(value) => updateConfig("languageMinutes", value)} />
            <TimerPicker label={t("Background sound")} value={config.backgroundMinutes} onChange={(value) => updateConfig("backgroundMinutes", value)} />
            <RangeControl icon={<Clock3 size={18} />} label={t("Meaning to target delay")} value={config.targetDelaySeconds} min={0} max={5} step={0.1} valueText={`${config.targetDelaySeconds.toFixed(1)}s`} onChange={(value) => updateConfig("targetDelaySeconds", value)} />
            <RangeControl icon={<Clock3 size={18} />} label={t("Pause between words")} value={config.pauseSeconds} min={0.5} max={5} step={0.5} valueText={`${config.pauseSeconds.toFixed(1)}s`} onChange={(value) => updateConfig("pauseSeconds", value)} />
          </ControlGroup>
          <ControlGroup title={t("Background sound")}>
            <Segmented options={backgroundSounds} value={config.backgroundSound} labelFor={label} onChange={(value) => updateConfig("backgroundSound", value as BackgroundSound)} />
          </ControlGroup>
          <ControlGroup title={t("Volume")}>
            <RangeControl icon={<Volume2 size={18} />} label={t("Target voice")} value={config.voiceVolume} onChange={(value) => updateConfig("voiceVolume", value)} />
            <RangeControl icon={<Volume2 size={18} />} label={t("Native voice")} value={config.nativeVoiceVolume} onChange={(value) => updateConfig("nativeVoiceVolume", value)} />
            <RangeControl icon={<Waves size={18} />} label={t("Background")} value={config.backgroundVolume} onChange={(value) => updateConfig("backgroundVolume", value)} />
          </ControlGroup>
          <SyncPanel t={t} syncCode={syncCode} syncCodeInput={syncCodeInput} syncStatus={syncStatus} isSyncing={isSyncing} onCodeInput={setSyncCodeInput} onCreate={createTempAccount} onConnect={connectTempAccount} onCopy={copySyncCode} onSave={() => saveSyncData(syncCode, true)} />
        </div>
      </aside>

      {step === "setup" && (
        <section className="screen home-screen">
          <div className="home-center">
            <div className="home-badge">
              <span>{label(config.topic === "all topics" ? config.level : config.topic)}</span>
            </div>
            <button className="big-play-button" onClick={startSession}>
              {config.playbackOrder === "Random" ? <Shuffle size={38} /> : <Play size={38} />}
            </button>
            <p className="home-action-label">
              {config.playbackOrder === "Random"
                ? t("Start random session")
                : config.playbackOrder === "Start from last left" && completedWords > 0
                  ? t("Continue session")
                  : t("Start session")}
            </p>
          </div>
          <div className="home-footer">
            <div className="home-progress">
              <progress value={completedWords} max={playlist.length || 1} />
              <span>{completedWords}/{playlist.length}</span>
            </div>
            <div className="home-shortcuts">
              <button className="text-button" onClick={() => setStep("playlist")}>
                <List size={15} />
                {t("Playlist")}
              </button>
              <button className="text-button" onClick={() => setStep("quiz")} disabled={!lastSessionWords.length}>
                <BookOpen size={15} />
                {t("Quiz")}
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "player" && (
        <section className="screen player">
          <div className="orbital">
            <Moon size={62} />
          </div>
          <div className="player-card">
            <p className="eyebrow">{label(config.targetLanguage)} {t("review session")}</p>
            <h2 className={currentItem ? `word-length-${Math.min(currentItem.targetText.length, 8)}` : undefined}>{currentItem?.targetText || t("Settling in")}</h2>
            <p className="reading">{currentItem?.reading || t("Voice will begin after you tap play")}</p>
            {currentItem && (
              <p className="meaning">
                {currentItem.meanings[config.nativeLanguage]}{currentItem.romanization ? `：${currentItem.romanization}` : ""}
              </p>
            )}
            <div className="timers">
              <span>
                <Clock3 size={16} />
                {t("Voice")} {formatTime(secondsLeft)}
              </span>
              <span>
                <Waves size={16} />
                {t("Sound")} {formatTime(backgroundLeft)}
              </span>
            </div>
            <div className="player-volume">
              <RangeControl
                icon={<Volume2 size={18} />}
                label={t("Target voice")}
                value={config.voiceVolume}
                onChange={(value) => updateConfig("voiceVolume", value)}
              />
              <RangeControl
                icon={<Volume2 size={18} />}
                label={t("Native voice")}
                value={config.nativeVoiceVolume}
                onChange={(value) => updateConfig("nativeVoiceVolume", value)}
              />
              <RangeControl
                icon={<Waves size={18} />}
                label={t("Background")}
                value={config.backgroundVolume}
                onChange={(value) => updateConfig("backgroundVolume", value)}
              />
            </div>
            <div className="player-actions">
              <button className="round-button" onClick={() => (isPaused ? resumeSession() : isPlaying ? pauseSession() : startSession())}>
                {isPlaying && !isPaused ? <Pause size={32} /> : <Play size={32} />}
              </button>
              <button className="icon-button" onClick={() => currentItem && toggleFavorite(currentItem.id)}>
                <Heart size={23} fill={currentItem?.favorite ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
          <p className="fine-print">
            {t("Add this app to your home screen for the best mobile lock-screen playback support. Browser policies may vary.")}
          </p>
        </section>
      )}

      {step === "history" && (
        <section className="screen stack">
          <h2>{t("Session history")}</h2>
          {!history.length && <EmptyState text={t("Completed sessions will appear here with every word that was played.")} />}
          {history.map((record) => (
            <article className="history-card" key={record.id}>
              <div className="history-head">
                <div>
                  <strong>{new Date(record.date).toLocaleString()}</strong>
                  <span>
                    {label(record.config.targetLanguage)} · {label(record.config.level)} · {record.playedIds.length} {t("words")}
                  </span>
                </div>
                <button className="icon-button" onClick={() => setStep("quiz")}>
                  <RotateCcw size={19} />
                </button>
              </div>
              <div className="word-list">
                {record.playedIds.map((id) => {
                  const item = vocab.find((word) => word.id === id);
                  if (!item) return null;
                  return <WordRow item={item} nativeLanguage={record.config.nativeLanguage} onFavorite={toggleFavorite} t={t} key={id} />;
                })}
              </div>
            </article>
          ))}
        </section>
      )}

      {step === "playlist" && (
        <section className="screen stack">
          <div className="playlist-header">
            <h2>{t("Current playlist")}</h2>
            <div className="playlist-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setPlaylistSeed((s) => s + 1);
                  setPlaylistPage(0);
                  setPlaylistPositions((positions) => ({ ...positions, [playlistKey]: 0 }));
                }}
              >
                {t("Next batch")}
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setPlaylistPage(0);
                  setPlaylistSeed((s) => s + 1);
                  setPlaylistPositions((positions) => ({ ...positions, [playlistKey]: 0 }));
                }}
              >
                <RefreshCw size={16} />
                {t("Shuffle")}
              </button>
            </div>
          </div>
          <p className="fine-print">
            {playlist.length} {t("words")} · {label(config.targetLanguage)} · {label(config.level)}
            {config.topic !== allTopics ? ` · ${label(config.topic)}` : ""}
            {playlistSeed === 0 ? "" : ` · ${t("Shuffle")} ${playlistSeed}`}
          </p>
          <div className="word-list">
            {playlist.map((item, index) => (
              <div className="word-row" key={item.id}>
                <div>
                  <strong>
                    <span className="playlist-index">{index + 1}. </span>
                    {item.targetText}
                  </strong>
                  <span>
                    {item.reading} · {item.meanings[config.nativeLanguage]}
                  </span>
                </div>
                <button className="icon-button" onClick={() => toggleFavorite(item.id)} aria-label={t("Toggle favorite")}>
                  <Star size={18} fill={item.favorite ? "currentColor" : "none"} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === "quiz" && (
        <QuizScreen
          words={lastSessionWords}
          nativeLanguage={config.nativeLanguage}
          t={t}
          onBack={() => setStep("setup")}
          onKnown={(id) =>
            setVocab((items) => items.map((item) => (item.id === id ? { ...item, status: nextStatus(item.status || "New") } : item)))
          }
        />
      )}
    </main>
  );
}

function buildPlaylist(vocab: VocabItem[], config: SessionConfig, seed = 0) {
  const languageItems = vocab.filter((item) => item.targetLanguage === config.targetLanguage);
  const levelItems = languageItems.filter((item) => item.level === config.level);
  const topicItems = config.topic === allTopics ? levelItems : levelItems.filter((item) => item.topic === config.topic);
  const uniquePool = takeUnique(topicItems, Number.MAX_SAFE_INTEGER);
  return seed > 0 ? seededShuffle(uniquePool, seed) : uniquePool;
}

function deprioritizeRecent(items: VocabItem[], recentIds: string[]) {
  const recentRank = new Map(recentIds.map((id, index) => [id, index]));
  return items
    .map((item, randomIndex) => ({ item, randomIndex, rank: recentRank.get(item.id) }))
    .sort((a, b) => {
      const aRecent = a.rank !== undefined;
      const bRecent = b.rank !== undefined;
      if (aRecent !== bRecent) return aRecent ? 1 : -1;
      if (aRecent && bRecent && a.rank !== b.rank) return (b.rank || 0) - (a.rank || 0);
      return a.randomIndex - b.randomIndex;
    })
    .map(({ item }) => item);
}

function takeUnique(items: VocabItem[], limit: number) {
  const seen = new Set<string>();
  const selected: VocabItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    selected.push(item);
    if (selected.length === limit) break;
  }
  return selected;
}

function takeUniqueVocabulary(items: VocabItem[]) {
  const seenIds = new Set<string>();
  const seenWords = new Set<string>();
  const selected: VocabItem[] = [];
  for (const item of items) {
    const wordKey = [
      item.targetLanguage,
      item.level,
      item.topic,
      item.targetText.normalize("NFKC").trim().toLocaleLowerCase(),
    ].join(":");
    if (seenIds.has(item.id) || seenWords.has(wordKey)) continue;
    seenIds.add(item.id);
    seenWords.add(wordKey);
    selected.push(item);
  }
  return selected;
}

function getPlaylistKey(config: Pick<SessionConfig, "targetLanguage" | "level" | "topic">) {
  return `${config.targetLanguage}:${config.level}:${config.topic}`;
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function seededShuffle<T>(items: T[], seed: number) {
  const shuffled = [...items];
  let s = seed;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function nextStatus(status: Familiarity): Familiarity {
  if (status === "New") return "Learning";
  if (status === "Learning") return "Familiar";
  return "Mastered";
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function ControlGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="control-group">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function SyncPanel({
  t,
  syncCode,
  syncCodeInput,
  syncStatus,
  isSyncing,
  onCodeInput,
  onCreate,
  onConnect,
  onCopy,
  onSave,
}: {
  t: (text: string) => string;
  syncCode: string;
  syncCodeInput: string;
  syncStatus: string;
  isSyncing: boolean;
  onCodeInput: (value: string) => void;
  onCreate: () => void;
  onConnect: () => void;
  onCopy: () => void;
  onSave: () => void;
}) {
  const canConnect = compactSyncCode(syncCodeInput).length === 16;

  return (
    <ControlGroup title={t("Sync account")}>
      <div className="sync-panel">
        <div className="sync-code-row">
          <input className="sync-input" value={syncCode || syncCodeInput} onChange={(event) => onCodeInput(event.target.value)} placeholder="LS-XXXX-XXXX-XXXX-XXXX" readOnly={!!syncCode} />
          {syncCode && (
            <button className="icon-button" onClick={onCopy} aria-label={t("Copy sync code")}>
              <Copy size={18} />
            </button>
          )}
        </div>
        <p className="sync-status">{t(syncStatus)}</p>
        <div className="sync-actions">
          {!syncCode ? (
            <>
              <button className="secondary-button" onClick={onCreate} disabled={isSyncing}>
                <Cloud size={18} />
                {t("Create temporary account")}
              </button>
              <button className="secondary-button" onClick={onConnect} disabled={isSyncing || !canConnect}>
                <Cloud size={18} />
                {t("Connect")}
              </button>
            </>
          ) : (
            <button className="secondary-button" onClick={onSave} disabled={isSyncing}>
              <Cloud size={18} />
              {t("Save now")}
            </button>
          )}
        </div>
      </div>
    </ControlGroup>
  );
}

function Segmented({
  options,
  value,
  labelFor = (option) => option,
  onChange,
}: {
  options: string[];
  value: string;
  labelFor?: (value: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button key={option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>
          {labelFor(option)}
        </button>
      ))}
    </div>
  );
}

function TimerPicker({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="timer-picker">
      <span>{label}</span>
      <div>
        {durations.map((duration) => (
          <button key={duration} className={value === duration ? "active" : ""} onClick={() => onChange(duration)}>
            {duration}
          </button>
        ))}
      </div>
    </div>
  );
}

function RangeControl({
  icon,
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  valueText,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  valueText?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="range-control">
      <span>
        <span>
          {icon}
          {label}
        </span>
        {valueText && <small>{valueText}</small>}
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onInput={(event) => onChange(Number((event.target as HTMLInputElement).value))} onChange={() => undefined} />
    </div>
  );
}

function Notice({ t }: { t: (text: string) => string }) {
  return (
    <div className="notice">
      <SlidersHorizontal size={20} />
      <p>{t("Gentle review for rest time. Fluency still needs active study, speaking, reading, and recall practice.")}</p>
    </div>
  );
}

function WordRow({
  item,
  nativeLanguage,
  onFavorite,
  t,
}: {
  item: VocabItem;
  nativeLanguage: NativeLanguage;
  onFavorite: (id: string) => void;
  t: (text: string) => string;
}) {
  return (
    <div className="word-row">
      <div>
        <strong>{item.targetText}</strong>
        <span>
          {item.meanings[nativeLanguage]} · {t(item.status || "New")} · {t("played")} {item.timesPlayed || 0}
        </span>
      </div>
      <button className="icon-button" onClick={() => onFavorite(item.id)} aria-label={t("Toggle favorite")}>
        <Star size={18} fill={item.favorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function QuizScreen({
  words,
  nativeLanguage,
  t,
  onBack,
  onKnown,
}: {
  words: VocabItem[];
  nativeLanguage: NativeLanguage;
  t: (text: string) => string;
  onBack: () => void;
  onKnown: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const word = words[index];

  if (!word) {
    return (
      <section className="screen stack">
        <EmptyState text={t("Finish a session first, then tomorrow's recall quiz will use those words.")} />
        <button className="primary-button" onClick={onBack}>{t("Back to setup")}</button>
      </section>
    );
  }

  return (
    <section className="screen quiz">
      <p className="eyebrow">
        {t("Morning recall")} {index + 1}/{words.length}
      </p>
      <h2>{word.meanings[nativeLanguage]}</h2>
      <p className="fine-print">{t("Try to recall the target-language word before revealing it.")}</p>
      {revealed && (
        <div className="answer">
          <strong>{word.targetText}</strong>
          <span>{word.reading} · {word.romanization}</span>
          <p>{word.exampleSentence}</p>
        </div>
      )}
      <div className="quiz-actions">
        <button className="secondary-button" onClick={() => setRevealed(true)}>
          {t("Reveal")}
        </button>
        <button
          className="primary-button"
          onClick={() => {
            onKnown(word.id);
            setRevealed(false);
            setIndex((value) => Math.min(words.length - 1, value + 1));
          }}
        >
          <Check size={18} />
          {t("I remembered")}
        </button>
      </div>
      <button className="text-button" onClick={onBack}>{t("Done")}</button>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <Moon size={26} />
      <p>{text}</p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register("/public-sw.js").catch(() => undefined);
      return;
    }

    void navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister()));
    void caches.keys().then((keys) => keys.filter((key) => key.startsWith("lingosleep-")).forEach((key) => void caches.delete(key)));
  });
}
