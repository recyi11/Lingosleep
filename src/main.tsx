import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Check,
  ChevronLeft,
  Clock3,
  Heart,
  History,
  Moon,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Star,
  Volume2,
  Waves,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./styles.css";

type TargetLanguage = "Japanese" | "Korean";
type NativeLanguage = "English" | "Simplified Chinese" | "Traditional Chinese";
type Level = "Basic" | "Intermediate" | "Advanced";
type Topic =
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
type PlaybackMode =
  | "Native word -> target word -> target word"
  | "Recall mode"
  | "Word and example sentence"
  | "Target-language-only immersion";
type BackgroundSound = "rain" | "white noise" | "brown noise" | "fireplace" | "none";
type Familiarity = "New" | "Learning" | "Familiar" | "Mastered";

type VocabItem = {
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

type PersistedVocabMetadata = Pick<VocabItem, "status" | "favorite" | "timesPlayed" | "lastPlayed">;

type SessionConfig = {
  targetLanguage: TargetLanguage;
  nativeLanguage: NativeLanguage;
  level: Level;
  topic: Topic;
  mode: PlaybackMode;
  languageMinutes: number;
  backgroundMinutes: number;
  backgroundSound: BackgroundSound;
  voiceVolume: number;
  backgroundVolume: number;
};

type SessionRecord = {
  id: string;
  date: string;
  config: SessionConfig;
  playedIds: string[];
};

const nativeLanguages: NativeLanguage[] = ["English", "Simplified Chinese", "Traditional Chinese"];
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
  "JLPT",
  "TOPIK",
];
const modes: PlaybackMode[] = [
  "Native word -> target word -> target word",
  "Recall mode",
  "Word and example sentence",
  "Target-language-only immersion",
];
const durations = [10, 20, 30, 45, 60];
const backgroundSounds: BackgroundSound[] = ["rain", "white noise", "brown noise", "fireplace", "none"];

const defaultConfig: SessionConfig = {
  targetLanguage: "Japanese",
  nativeLanguage: "English",
  level: "Basic",
  topic: "daily life",
  mode: "Recall mode",
  languageMinutes: 20,
  backgroundMinutes: 45,
  backgroundSound: "rain",
  voiceVolume: 0.72,
  backgroundVolume: 0.34,
};

const vocabSeed: VocabItem[] = [
  {
    id: "ja-food-basic-1",
    targetLanguage: "Japanese",
    targetText: "ご飯",
    meanings: { English: "meal; cooked rice", "Simplified Chinese": "米饭；餐", "Traditional Chinese": "米飯；餐" },
    reading: "ごはん",
    romanization: "gohan",
    level: "Basic",
    topic: "food",
    exampleSentence: "朝ご飯を食べます。",
    exampleTranslations: { English: "I eat breakfast.", "Simplified Chinese": "我吃早饭。", "Traditional Chinese": "我吃早飯。" },
  },
  {
    id: "ja-travel-basic-1",
    targetLanguage: "Japanese",
    targetText: "駅",
    meanings: { English: "station", "Simplified Chinese": "车站", "Traditional Chinese": "車站" },
    reading: "えき",
    romanization: "eki",
    level: "Basic",
    topic: "travel",
    exampleSentence: "駅はどこですか。",
    exampleTranslations: { English: "Where is the station?", "Simplified Chinese": "车站在哪里？", "Traditional Chinese": "車站在哪裡？" },
  },
  {
    id: "ja-life-basic-1",
    targetLanguage: "Japanese",
    targetText: "寝る",
    meanings: { English: "to sleep", "Simplified Chinese": "睡觉", "Traditional Chinese": "睡覺" },
    reading: "ねる",
    romanization: "neru",
    level: "Basic",
    topic: "daily life",
    exampleSentence: "十一時に寝ます。",
    exampleTranslations: { English: "I go to sleep at eleven.", "Simplified Chinese": "我十一点睡觉。", "Traditional Chinese": "我十一點睡覺。" },
  },
  {
    id: "ja-numbers-basic-1",
    targetLanguage: "Japanese",
    targetText: "七",
    meanings: { English: "seven", "Simplified Chinese": "七", "Traditional Chinese": "七" },
    reading: "なな / しち",
    romanization: "nana / shichi",
    level: "Basic",
    topic: "numbers",
    exampleSentence: "七つください。",
    exampleTranslations: { English: "Seven, please.", "Simplified Chinese": "请给我七个。", "Traditional Chinese": "請給我七個。" },
  },
  {
    id: "ja-verbs-basic-1",
    targetLanguage: "Japanese",
    targetText: "見る",
    meanings: { English: "to see; to watch", "Simplified Chinese": "看", "Traditional Chinese": "看" },
    reading: "みる",
    romanization: "miru",
    level: "Basic",
    topic: "common verbs",
    exampleSentence: "映画を見ます。",
    exampleTranslations: { English: "I watch a movie.", "Simplified Chinese": "我看电影。", "Traditional Chinese": "我看電影。" },
  },
  {
    id: "ja-work-intermediate-1",
    targetLanguage: "Japanese",
    targetText: "会議",
    meanings: { English: "meeting; conference", "Simplified Chinese": "会议", "Traditional Chinese": "會議" },
    reading: "かいぎ",
    romanization: "kaigi",
    level: "Intermediate",
    topic: "work",
    exampleSentence: "午後に会議があります。",
    exampleTranslations: { English: "There is a meeting in the afternoon.", "Simplified Chinese": "下午有会议。", "Traditional Chinese": "下午有會議。" },
  },
  {
    id: "ja-school-intermediate-1",
    targetLanguage: "Japanese",
    targetText: "課題",
    meanings: { English: "assignment; task", "Simplified Chinese": "课题；作业", "Traditional Chinese": "課題；作業" },
    reading: "かだい",
    romanization: "kadai",
    level: "Intermediate",
    topic: "school",
    exampleSentence: "課題を提出しました。",
    exampleTranslations: { English: "I submitted the assignment.", "Simplified Chinese": "我提交了作业。", "Traditional Chinese": "我提交了作業。" },
  },
  {
    id: "ja-anime-intermediate-1",
    targetLanguage: "Japanese",
    targetText: "主人公",
    meanings: { English: "main character", "Simplified Chinese": "主角", "Traditional Chinese": "主角" },
    reading: "しゅじんこう",
    romanization: "shujinko",
    level: "Intermediate",
    topic: "anime/drama",
    exampleSentence: "主人公は勇敢です。",
    exampleTranslations: { English: "The main character is brave.", "Simplified Chinese": "主角很勇敢。", "Traditional Chinese": "主角很勇敢。" },
  },
  {
    id: "ja-jlpt-advanced-1",
    targetLanguage: "Japanese",
    targetText: "恐縮",
    meanings: { English: "feeling obliged; humbled", "Simplified Chinese": "惶恐；不好意思", "Traditional Chinese": "惶恐；不好意思" },
    reading: "きょうしゅく",
    romanization: "kyoshuku",
    level: "Advanced",
    topic: "JLPT",
    exampleSentence: "お手数をおかけして恐縮です。",
    exampleTranslations: {
      English: "I am sorry to trouble you.",
      "Simplified Chinese": "给您添麻烦，我很不好意思。",
      "Traditional Chinese": "給您添麻煩，我很不好意思。",
    },
  },
  {
    id: "ko-food-basic-1",
    targetLanguage: "Korean",
    targetText: "밥",
    meanings: { English: "rice; meal", "Simplified Chinese": "米饭；饭", "Traditional Chinese": "米飯；飯" },
    reading: "밥",
    romanization: "bap",
    level: "Basic",
    topic: "food",
    exampleSentence: "밥을 먹어요.",
    exampleTranslations: { English: "I eat a meal.", "Simplified Chinese": "我吃饭。", "Traditional Chinese": "我吃飯。" },
  },
  {
    id: "ko-travel-basic-1",
    targetLanguage: "Korean",
    targetText: "역",
    meanings: { English: "station", "Simplified Chinese": "车站", "Traditional Chinese": "車站" },
    reading: "역",
    romanization: "yeok",
    level: "Basic",
    topic: "travel",
    exampleSentence: "역이 어디예요?",
    exampleTranslations: { English: "Where is the station?", "Simplified Chinese": "车站在哪里？", "Traditional Chinese": "車站在哪裡？" },
  },
  {
    id: "ko-life-basic-1",
    targetLanguage: "Korean",
    targetText: "자다",
    meanings: { English: "to sleep", "Simplified Chinese": "睡觉", "Traditional Chinese": "睡覺" },
    reading: "자다",
    romanization: "jada",
    level: "Basic",
    topic: "daily life",
    exampleSentence: "열한 시에 자요.",
    exampleTranslations: { English: "I sleep at eleven.", "Simplified Chinese": "我十一点睡觉。", "Traditional Chinese": "我十一點睡覺。" },
  },
  {
    id: "ko-numbers-basic-1",
    targetLanguage: "Korean",
    targetText: "일곱",
    meanings: { English: "seven", "Simplified Chinese": "七", "Traditional Chinese": "七" },
    reading: "일곱",
    romanization: "ilgop",
    level: "Basic",
    topic: "numbers",
    exampleSentence: "일곱 개 주세요.",
    exampleTranslations: { English: "Seven, please.", "Simplified Chinese": "请给我七个。", "Traditional Chinese": "請給我七個。" },
  },
  {
    id: "ko-verbs-basic-1",
    targetLanguage: "Korean",
    targetText: "보다",
    meanings: { English: "to see; to watch", "Simplified Chinese": "看", "Traditional Chinese": "看" },
    reading: "보다",
    romanization: "boda",
    level: "Basic",
    topic: "common verbs",
    exampleSentence: "드라마를 봐요.",
    exampleTranslations: { English: "I watch a drama.", "Simplified Chinese": "我看电视剧。", "Traditional Chinese": "我看電視劇。" },
  },
  {
    id: "ko-work-intermediate-1",
    targetLanguage: "Korean",
    targetText: "회의",
    meanings: { English: "meeting", "Simplified Chinese": "会议", "Traditional Chinese": "會議" },
    reading: "회의",
    romanization: "hoeui",
    level: "Intermediate",
    topic: "work",
    exampleSentence: "오후에 회의가 있어요.",
    exampleTranslations: { English: "There is a meeting in the afternoon.", "Simplified Chinese": "下午有会议。", "Traditional Chinese": "下午有會議。" },
  },
  {
    id: "ko-school-intermediate-1",
    targetLanguage: "Korean",
    targetText: "과제",
    meanings: { English: "assignment", "Simplified Chinese": "作业；课题", "Traditional Chinese": "作業；課題" },
    reading: "과제",
    romanization: "gwaje",
    level: "Intermediate",
    topic: "school",
    exampleSentence: "과제를 냈어요.",
    exampleTranslations: { English: "I turned in the assignment.", "Simplified Chinese": "我交了作业。", "Traditional Chinese": "我交了作業。" },
  },
  {
    id: "ko-drama-intermediate-1",
    targetLanguage: "Korean",
    targetText: "주인공",
    meanings: { English: "main character", "Simplified Chinese": "主角", "Traditional Chinese": "主角" },
    reading: "주인공",
    romanization: "juingong",
    level: "Intermediate",
    topic: "anime/drama",
    exampleSentence: "주인공이 용감해요.",
    exampleTranslations: { English: "The main character is brave.", "Simplified Chinese": "主角很勇敢。", "Traditional Chinese": "主角很勇敢。" },
  },
  {
    id: "ko-topik-advanced-1",
    targetLanguage: "Korean",
    targetText: "유지하다",
    meanings: { English: "to maintain", "Simplified Chinese": "维持", "Traditional Chinese": "維持" },
    reading: "유지하다",
    romanization: "yujihada",
    level: "Advanced",
    topic: "TOPIK",
    exampleSentence: "건강한 습관을 유지해야 합니다.",
    exampleTranslations: {
      English: "You should maintain healthy habits.",
      "Simplified Chinese": "应该维持健康的习惯。",
      "Traditional Chinese": "應該維持健康的習慣。",
    },
  },
];

const familiarityValues: Familiarity[] = ["New", "Learning", "Familiar", "Mastered"];

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function withDefaultMetadata(item: VocabItem): VocabItem {
  return { ...item, status: "New", favorite: false, timesPlayed: 0 };
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

function speak(text: string, lang: TargetLanguage | NativeLanguage, volume: number) {
  return new Promise<void>((resolve) => {
    if (!("speechSynthesis" in window)) {
      globalThis.setTimeout(resolve, 900);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang =
      lang === "Japanese"
        ? "ja-JP"
        : lang === "Korean"
          ? "ko-KR"
          : lang === "Simplified Chinese"
            ? "zh-CN"
            : lang === "Traditional Chinese"
              ? "zh-TW"
              : "en-US";
    utterance.rate = lang === "English" ? 0.78 : 0.72;
    utterance.pitch = 0.84;
    utterance.volume = volume;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function createNoiseSource(ctx: AudioContext, sound: BackgroundSound) {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  let rainBed = 0;
  let rainRumble = 0;
  let rainDrop = 0;
  for (let i = 0; i < bufferSize; i += 1) {
    const white = Math.random() * 2 - 1;
    if (sound === "brown noise") {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else if (sound === "fireplace") {
      data[i] = Math.random() > 0.985 ? white * 0.9 : white * 0.08;
    } else if (sound === "rain") {
      rainBed = rainBed * 0.82 + white * 0.18;
      rainRumble = rainRumble * 0.985 + white * 0.015;
      if (Math.random() > 0.992) {
        rainDrop += (Math.random() * 2 - 1) * 0.7;
      }
      rainDrop *= 0.88;
      data[i] = rainBed * 0.18 + rainRumble * 0.35 + rainDrop * 0.32;
    } else {
      data[i] = white * 0.22;
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function useBackgroundSound(sound: BackgroundSound, volume: number) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const start = () => {
    if (sound === "none" || sourceRef.current) return;
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    const source = createNoiseSource(ctx, sound);
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start();
    ctxRef.current = ctx;
    gainRef.current = gain;
    sourceRef.current = source;
  };

  const stop = () => {
    const source = sourceRef.current;
    const ctx = ctxRef.current;
    if (source) {
      try {
        source.stop();
      } catch {
        // Source may already be stopped by a timer or browser lifecycle event.
      }
    }
    if (ctx) {
      const closed = ctx.close();
      if (closed && "catch" in closed) {
        void closed.catch(() => undefined);
      }
    }
    sourceRef.current = null;
    gainRef.current = null;
    ctxRef.current = null;
  };

  const duck = (active: boolean) => {
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain) return;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.linearRampToValueAtTime(active ? volume * 0.28 : volume, ctx.currentTime + 0.45);
  };

  useEffect(() => {
    const gain = gainRef.current;
    const ctx = ctxRef.current;
    if (gain && ctx) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.25);
    }
  }, [volume]);

  useEffect(() => stop, []);

  return { start, stop, duck };
}

function App() {
  const [config, setConfig] = useState<SessionConfig>(() => loadJson("lingosleep-config", defaultConfig));
  const [vocab, setVocab] = useState<VocabItem[]>(() => {
    const stored = loadJson<unknown>("lingosleep-vocab", null);
    if (!Array.isArray(stored)) return vocabSeed.map(withDefaultMetadata);
    const storedById = new Map(stored.map((item) => [item.id, item]));
    return vocabSeed.map((item) => ({ ...withDefaultMetadata(item), ...readPersistedVocabMetadata(storedById.get(item.id)) }));
  });
  const [history, setHistory] = useState<SessionRecord[]>(() => loadJson("lingosleep-history", []));
  const [step, setStep] = useState<"onboarding" | "setup" | "player" | "history" | "quiz">(() =>
    localStorage.getItem("lingosleep-onboarded") ? "setup" : "onboarding"
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentItem, setCurrentItem] = useState<VocabItem | null>(null);
  const [playedIds, setPlayedIds] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(config.languageMinutes * 60);
  const [backgroundLeft, setBackgroundLeft] = useState(config.backgroundMinutes * 60);
  const playingRef = useRef(false);
  const playedIdsRef = useRef<string[]>([]);
  const background = useBackgroundSound(config.backgroundSound, config.backgroundVolume);

  useEffect(() => localStorage.setItem("lingosleep-config", JSON.stringify(config)), [config]);
  useEffect(() => localStorage.setItem("lingosleep-vocab", JSON.stringify(vocab)), [vocab]);
  useEffect(() => localStorage.setItem("lingosleep-history", JSON.stringify(history)), [history]);
  useEffect(() => {
    void supabase.auth.getSession();
  }, []);

  const playlist = useMemo(() => buildPlaylist(vocab, config), [vocab, config]);
  const lastSessionWords = useMemo(() => {
    const last = history[0];
    if (!last) return [];
    return last.playedIds.map((id) => vocab.find((item) => item.id === id)).filter(Boolean) as VocabItem[];
  }, [history, vocab]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentItem ? currentItem.targetText : "Sleep vocabulary session",
      artist: "LingoSleep",
      album: `${config.targetLanguage} ${config.level}`,
    });
    navigator.mediaSession.setActionHandler("play", () => startSession());
    navigator.mediaSession.setActionHandler("pause", () => stopSession(false));
  }, [currentItem, config]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
      setBackgroundLeft((value) => {
        const next = Math.max(0, value - 1);
        if (next === 0) background.stop();
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

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

  const speakIfPlaying = async (text: string, lang: TargetLanguage | NativeLanguage, volume: number) => {
    if (!playingRef.current) return false;
    await speak(text, lang, volume);
    return playingRef.current;
  };

  const waitIfPlaying = async (ms: number) => {
    if (!playingRef.current) return false;
    await wait(ms);
    return playingRef.current;
  };

  const speakItem = async (item: VocabItem) => {
    if (!playingRef.current) return;
    setCurrentItem(item);
    background.duck(true);
    if (config.mode === "Native word -> target word -> target word") {
      if (!(await speakIfPlaying(item.meanings[config.nativeLanguage], config.nativeLanguage, config.voiceVolume))) return;
      if (!(await waitIfPlaying(900))) return;
      if (!(await speakIfPlaying(item.targetText, config.targetLanguage, config.voiceVolume))) return;
      if (!(await waitIfPlaying(700))) return;
      if (!(await speakIfPlaying(item.targetText, config.targetLanguage, config.voiceVolume * 0.92))) return;
    } else if (config.mode === "Recall mode") {
      if (!(await speakIfPlaying(item.meanings[config.nativeLanguage], config.nativeLanguage, config.voiceVolume))) return;
      if (!(await waitIfPlaying(2800))) return;
      background.duck(true);
      if (!(await speakIfPlaying(item.targetText, config.targetLanguage, config.voiceVolume))) return;
      if (!(await waitIfPlaying(500))) return;
      if (!(await speakIfPlaying(item.reading, config.targetLanguage, config.voiceVolume * 0.82))) return;
    } else if (config.mode === "Word and example sentence") {
      if (!(await speakIfPlaying(item.targetText, config.targetLanguage, config.voiceVolume))) return;
      if (!(await waitIfPlaying(700))) return;
      if (!(await speakIfPlaying(item.meanings[config.nativeLanguage], config.nativeLanguage, config.voiceVolume * 0.88))) return;
      if (!(await waitIfPlaying(900))) return;
      if (!(await speakIfPlaying(item.exampleSentence, config.targetLanguage, config.voiceVolume * 0.84))) return;
      if (!(await waitIfPlaying(700))) return;
      if (!(await speakIfPlaying(item.exampleTranslations[config.nativeLanguage], config.nativeLanguage, config.voiceVolume * 0.74))) return;
    } else {
      if (!(await speakIfPlaying(item.targetText, config.targetLanguage, config.voiceVolume))) return;
      if (!(await waitIfPlaying(900))) return;
      if (!(await speakIfPlaying(item.exampleSentence, config.targetLanguage, config.voiceVolume * 0.78))) return;
    }
    if (!playingRef.current) return;
    background.duck(false);
    markPlayed(item);
  };

  const startSession = async () => {
    if (playingRef.current) return;
    setStep("player");
    setIsPlaying(true);
    playingRef.current = true;
    setSecondsLeft(config.languageMinutes * 60);
    setBackgroundLeft(config.backgroundMinutes * 60);
    setPlayedIds([]);
    playedIdsRef.current = [];
    background.start();

    const started = Date.now();
    let index = 0;
    while (playingRef.current && Date.now() - started < config.languageMinutes * 60 * 1000) {
      const item = playlist[index % playlist.length];
      await speakItem(item);
      index += 1;
      await wait(1600);
    }
    if (playingRef.current) {
      await fadeLanguage();
      stopSession(true);
    }
  };

  const stopSession = (save: boolean) => {
    playingRef.current = false;
    window.speechSynthesis?.cancel();
    background.stop();
    setIsPlaying(false);
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

  const fadeLanguage = async () => {
    for (let i = 0; i < 4; i += 1) {
      await speak("Good night.", "English", Math.max(0.05, config.voiceVolume * (0.25 - i * 0.05)));
      await wait(700);
    }
  };

  const toggleFavorite = (id: string) => {
    setVocab((items) => items.map((item) => (item.id === id ? { ...item, favorite: !item.favorite } : item)));
  };

  return (
    <main className="app-shell">
      <div className="app-bg" />
      {step !== "onboarding" && (
        <header className="topbar">
          <button className="icon-button" onClick={() => setStep("setup")} aria-label="Back to setup">
            <ChevronLeft size={22} />
          </button>
          <div>
            <p className="eyebrow">LingoSleep</p>
            <h1>Night vocabulary review</h1>
          </div>
          <button className="icon-button" onClick={() => setStep("history")} aria-label="Session history">
            <History size={21} />
          </button>
        </header>
      )}

      {step === "onboarding" && (
        <section className="onboarding">
          <div className="moon-mark">
            <Moon size={42} />
          </div>
          <p className="eyebrow">LingoSleep</p>
          <h1>Relaxed vocabulary review for quiet nights.</h1>
          <p>
            Review Japanese or Korean words with validated course data, gentle pacing, translations, examples, and
            calming sound beds. It supports review while resting, without promising sleep-only fluency.
          </p>
          <button
            className="primary-button"
            onClick={() => {
              localStorage.setItem("lingosleep-onboarded", "true");
              setStep("setup");
            }}
          >
            <Sparkles size={19} />
            Begin
          </button>
        </section>
      )}

      {step === "setup" && (
        <section className="screen stack">
          <Notice />
          <ControlGroup title="Target language">
            <Segmented
              options={["Japanese", "Korean"]}
              value={config.targetLanguage}
              onChange={(value) => updateConfig("targetLanguage", value as TargetLanguage)}
            />
          </ControlGroup>
          <ControlGroup title="Native language">
            <Segmented
              options={nativeLanguages}
              value={config.nativeLanguage}
              onChange={(value) => updateConfig("nativeLanguage", value as NativeLanguage)}
            />
          </ControlGroup>
          <ControlGroup title="Level">
            <div className="choice-grid">
              {levels.map((level) => (
                <button
                  key={level}
                  className={`choice ${config.level === level ? "selected" : ""}`}
                  onClick={() => updateConfig("level", level)}
                >
                  <strong>{level}</strong>
                  <span>{level === "Basic" ? "JLPT N5-N4 / TOPIK 1-2" : level === "Intermediate" ? "JLPT N3-N2 / TOPIK 3-4" : "JLPT N1 / TOPIK 5-6"}</span>
                </button>
              ))}
            </div>
          </ControlGroup>
          <ControlGroup title="Topic">
            <div className="pill-grid">
              {topics.map((topic) => (
                <button
                  key={topic}
                  className={`pill ${config.topic === topic ? "selected" : ""}`}
                  onClick={() => updateConfig("topic", topic)}
                >
                  {topic}
                </button>
              ))}
            </div>
          </ControlGroup>
          <ControlGroup title="Playback mode">
            <div className="choice-grid">
              {modes.map((mode) => (
                <button
                  key={mode}
                  className={`choice ${config.mode === mode ? "selected" : ""}`}
                  onClick={() => updateConfig("mode", mode)}
                >
                  <strong>{mode}</strong>
                </button>
              ))}
            </div>
          </ControlGroup>
          <ControlGroup title="Timers">
            <TimerPicker
              label="Language playback"
              value={config.languageMinutes}
              onChange={(value) => updateConfig("languageMinutes", value)}
            />
            <TimerPicker
              label="Background sound"
              value={config.backgroundMinutes}
              onChange={(value) => updateConfig("backgroundMinutes", value)}
            />
          </ControlGroup>
          <ControlGroup title="Background sound">
            <Segmented
              options={backgroundSounds}
              value={config.backgroundSound}
              onChange={(value) => updateConfig("backgroundSound", value as BackgroundSound)}
            />
          </ControlGroup>
          <ControlGroup title="Volume">
            <RangeControl
              icon={<Volume2 size={18} />}
              label="Voice"
              value={config.voiceVolume}
              onChange={(value) => updateConfig("voiceVolume", value)}
            />
            <RangeControl
              icon={<Waves size={18} />}
              label="Background"
              value={config.backgroundVolume}
              onChange={(value) => updateConfig("backgroundVolume", value)}
            />
          </ControlGroup>
          <div className="sticky-actions">
            <button className="primary-button" onClick={startSession}>
              <Play size={20} />
              Start sleep session
            </button>
            <button className="secondary-button" onClick={() => setStep("quiz")} disabled={!lastSessionWords.length}>
              <BookOpen size={19} />
              Morning quiz
            </button>
          </div>
        </section>
      )}

      {step === "player" && (
        <section className="screen player">
          <div className="orbital">
            <Moon size={62} />
          </div>
          <div className="player-card">
            <p className="eyebrow">{config.targetLanguage} sleep session</p>
            <h2>{currentItem?.targetText || "Settling in"}</h2>
            <p className="reading">{currentItem?.reading || "Voice will begin after you tap play"}</p>
            {currentItem && (
              <p className="meaning">
                {currentItem.meanings[config.nativeLanguage]} · {currentItem.romanization}
              </p>
            )}
            <div className="timers">
              <span>
                <Clock3 size={16} />
                Voice {formatTime(secondsLeft)}
              </span>
              <span>
                <Waves size={16} />
                Sound {formatTime(backgroundLeft)}
              </span>
            </div>
            <div className="player-actions">
              <button className="round-button" onClick={() => (isPlaying ? stopSession(true) : startSession())}>
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
              </button>
              <button className="icon-button" onClick={() => currentItem && toggleFavorite(currentItem.id)}>
                <Heart size={23} fill={currentItem?.favorite ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
          <p className="fine-print">
            Add this app to your home screen for the best mobile lock-screen playback support. Browser policies may vary.
          </p>
        </section>
      )}

      {step === "history" && (
        <section className="screen stack">
          <h2>Session history</h2>
          {!history.length && <EmptyState text="Completed sessions will appear here with every word that was played." />}
          {history.map((record) => (
            <article className="history-card" key={record.id}>
              <div className="history-head">
                <div>
                  <strong>{new Date(record.date).toLocaleString()}</strong>
                  <span>
                    {record.config.targetLanguage} · {record.config.level} · {record.playedIds.length} words
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
                  return <WordRow item={item} nativeLanguage={record.config.nativeLanguage} onFavorite={toggleFavorite} key={id} />;
                })}
              </div>
            </article>
          ))}
        </section>
      )}

      {step === "quiz" && (
        <QuizScreen
          words={lastSessionWords}
          nativeLanguage={config.nativeLanguage}
          onBack={() => setStep("setup")}
          onKnown={(id) =>
            setVocab((items) => items.map((item) => (item.id === id ? { ...item, status: nextStatus(item.status || "New") } : item)))
          }
        />
      )}
    </main>
  );
}

function buildPlaylist(vocab: VocabItem[], config: SessionConfig) {
  const candidates = vocab.filter(
    (item) =>
      item.targetLanguage === config.targetLanguage &&
      item.level === config.level &&
      (item.topic === config.topic || item.topic === (config.targetLanguage === "Japanese" ? "JLPT" : "TOPIK"))
  );
  const fallback = vocab.filter((item) => item.targetLanguage === config.targetLanguage && item.level === config.level);
  const pool = candidates.length ? candidates : fallback;
  return [...pool].sort((a, b) => {
    const scoreA = statusWeight(a.status || "New") - (a.favorite ? 0.8 : 0) + (a.lastPlayed ? 0.4 : 0);
    const scoreB = statusWeight(b.status || "New") - (b.favorite ? 0.8 : 0) + (b.lastPlayed ? 0.4 : 0);
    return scoreA - scoreB;
  });
}

function statusWeight(status: Familiarity) {
  return status === "New" ? 0 : status === "Learning" ? 1 : status === "Familiar" ? 2 : 3;
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

function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button key={option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>
          {option}
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
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-control">
      <span>
        {icon}
        {label}
      </span>
      <input type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Notice() {
  return (
    <div className="notice">
      <SlidersHorizontal size={20} />
      <p>Gentle review for rest time. Fluency still needs active study, speaking, reading, and recall practice.</p>
    </div>
  );
}

function WordRow({
  item,
  nativeLanguage,
  onFavorite,
}: {
  item: VocabItem;
  nativeLanguage: NativeLanguage;
  onFavorite: (id: string) => void;
}) {
  return (
    <div className="word-row">
      <div>
        <strong>{item.targetText}</strong>
        <span>
          {item.meanings[nativeLanguage]} · {item.status || "New"} · played {item.timesPlayed || 0}
        </span>
      </div>
      <button className="icon-button" onClick={() => onFavorite(item.id)} aria-label="Toggle favorite">
        <Star size={18} fill={item.favorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function QuizScreen({
  words,
  nativeLanguage,
  onBack,
  onKnown,
}: {
  words: VocabItem[];
  nativeLanguage: NativeLanguage;
  onBack: () => void;
  onKnown: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const word = words[index];

  if (!word) {
    return (
      <section className="screen stack">
        <EmptyState text="Finish a sleep session first, then tomorrow's recall quiz will use those words." />
        <button className="primary-button" onClick={onBack}>Back to setup</button>
      </section>
    );
  }

  return (
    <section className="screen quiz">
      <p className="eyebrow">
        Morning recall {index + 1}/{words.length}
      </p>
      <h2>{word.meanings[nativeLanguage]}</h2>
      <p className="fine-print">Try to recall the target-language word before revealing it.</p>
      {revealed && (
        <div className="answer">
          <strong>{word.targetText}</strong>
          <span>{word.reading} · {word.romanization}</span>
          <p>{word.exampleSentence}</p>
        </div>
      )}
      <div className="quiz-actions">
        <button className="secondary-button" onClick={() => setRevealed(true)}>
          Reveal
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
          I remembered
        </button>
      </div>
      <button className="text-button" onClick={onBack}>Done</button>
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
    navigator.serviceWorker.register("/public-sw.js").catch(() => undefined);
  });
}
