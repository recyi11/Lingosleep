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
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Star,
  Volume2,
  Waves,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import {
  vocabSeed,
  type Familiarity,
  type Level,
  type NativeLanguage,
  type TargetLanguage,
  type Topic,
  type VocabItem,
} from "./vocabulary";
import "./styles.css";

type PlaybackMode =
  | "Native word -> target word -> target word"
  | "Recall mode"
  | "Word and example sentence"
  | "Target-language-only immersion";
type BackgroundSound = "soft rain" | "heavy rain" | "Rain and Thunder" | "white noise" | "brown noise" | "fireplace" | "none";
type PlaybackOrder = "Start from beginning" | "Start from last left" | "Random";
type ReviewTopic = Topic | "all topics";
type VoiceStyle = "Auto" | "Female" | "Male";
type PersistedVocabMetadata = Pick<VocabItem, "status" | "favorite" | "timesPlayed" | "lastPlayed">;
type VocabularyRow = {
  id: string;
  target_language: "ja" | "ko";
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

const nativeLanguages: NativeLanguage[] = ["English", "Simplified Chinese"];
const koreanVoiceBoost = 1.3;
const softRainBoost = 1.3;
const playlistBucketSize = 70;
const remoteVocabularyPageSize = 1000;
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
const backgroundSounds: BackgroundSound[] = ["soft rain", "heavy rain", "Rain and Thunder", "white noise", "brown noise", "fireplace", "none"];
const playbackOrders: PlaybackOrder[] = ["Start from beginning", "Start from last left", "Random"];
const rainSoundUrls: Partial<Record<BackgroundSound, string>> = {
  "soft rain": "/audio/background/soft-rain.mp3",
  "heavy rain": "/audio/background/heavy-rain.mp3",
  "Rain and Thunder": "/audio/background/thunderstorm.mp3",
};
const simplifiedChineseLabels: Record<string, string> = {
  "Night vocabulary review": "词汇复习",
  "Relaxed vocabulary review for quiet nights.": "适合安静时段的轻松词汇复习。",
  "Review Japanese or Korean words with validated course data, gentle pacing, translations, examples, and calming sound beds. It supports review while resting, without promising sleep-only fluency.":
    "用经过整理的课程词汇复习日语或韩语，包含舒缓节奏、翻译、例句和背景声音。它适合休息时复习，但不承诺只靠睡眠就能流利掌握。",
  "Gentle review for rest time. Fluency still needs active study, speaking, reading, and recall practice.":
    "适合休息时的轻松复习。真正流利仍然需要主动学习、开口、阅读和回忆练习。",
  Begin: "开始",
  "Back to setup": "返回设置",
  "Session history": "复习记录",
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
  Japanese: "日语",
  Korean: "韩语",
  English: "英语",
  "Simplified Chinese": "简体中文",
  Basic: "基础",
  Intermediate: "中级",
  Advanced: "高级",
  "JLPT N5-N4 / TOPIK 1-2": "JLPT N5-N4 / TOPIK 1-2",
  "JLPT N3-N2 / TOPIK 3-4": "JLPT N3-N2 / TOPIK 3-4",
  "JLPT N1 / TOPIK 5-6": "JLPT N1 / TOPIK 5-6",
  "all topics": "全部词库",
  food: "食物",
  travel: "旅行",
  "daily life": "日常生活",
  numbers: "数字",
  "common verbs": "常用动词",
  work: "工作",
  school: "学校",
  "anime/drama": "动漫/剧集",
  "Native word -> target word -> target word": "母语 -> 目标语 -> 目标语",
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
};

function translate(text: string, nativeLanguage: NativeLanguage) {
  return nativeLanguage === "Simplified Chinese" ? simplifiedChineseLabels[text] || text : text;
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
  targetDelaySeconds: 0.3,
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

function mergeVocabMetadata(items: VocabItem[], stored: unknown[]) {
  const storedById = new Map(stored.map((item) => [(item as { id?: unknown }).id, item]));
  return items.map((item) => ({ ...withDefaultMetadata(item), ...readPersistedVocabMetadata(storedById.get(item.id)) }));
}

function mapVocabularyRow(row: VocabularyRow): VocabItem | null {
  const targetLanguage = row.target_language === "ja" ? "Japanese" : row.target_language === "ko" ? "Korean" : null;
  const level = row.level === "basic" ? "Basic" : row.level === "intermediate" ? "Intermediate" : row.level === "advanced" ? "Advanced" : null;
  if (!targetLanguage || !level || !topics.includes(row.topic as Topic)) return null;

  return {
    id: row.id,
    targetLanguage,
    targetText: row.target_text,
    meanings: { English: row.meaning_en, "Simplified Chinese": row.meaning_zh_cn || row.meaning_en },
    reading: row.reading || row.target_text,
    romanization: row.romanization || "",
    level,
    topic: row.topic as Topic,
    exampleSentence: row.example_text || row.target_text,
    exampleTranslations: {
      English: row.example_translation_en || row.meaning_en,
      "Simplified Chinese": row.example_translation_zh_cn || row.meaning_zh_cn || row.meaning_en,
    },
  };
}

async function fetchRemoteVocabulary() {
  const rows: VocabularyRow[] = [];
  for (let from = 0; ; from += remoteVocabularyPageSize) {
    const { data, error } = await supabase
      .from("vocabulary")
      .select(
        "id,target_language,level,topic,target_text,reading,romanization,meaning_en,meaning_zh_cn,example_text,example_translation_en,example_translation_zh_cn"
      )
      .range(from, from + remoteVocabularyPageSize - 1);
    if (error) throw error;
    rows.push(...((data || []) as VocabularyRow[]));
    if (!data || data.length < remoteVocabularyPageSize) break;
  }
  return rows.map(mapVocabularyRow).filter(Boolean) as VocabItem[];
}

function voiceMatchesStyle(voice: SpeechSynthesisVoice, style: VoiceStyle) {
  const name = voice.name.toLowerCase();
  const hints = style === "Female" ? femaleVoiceHints : maleVoiceHints;
  const genericMatch = style === "Female" ? /\b(female|woman)\b/.test(name) : /\b(male|man)\b/.test(name);
  return genericMatch || hints.some((hint) => name.includes(hint));
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
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    let spoken = false;
    const speakWithBestVoice = (voices: SpeechSynthesisVoice[]) => {
      if (spoken) return;
      spoken = true;
      const languageVoices = voices.filter(
        (voice) => voice.lang === speechLang || voice.lang.toLowerCase().startsWith(speechLang.slice(0, 2).toLowerCase())
      );
      utterance.voice =
        (voiceStyle !== "Auto" ? languageVoices.find((voice) => voiceMatchesStyle(voice, voiceStyle)) : undefined) ||
        languageVoices.find((voice) => voice.lang === speechLang) ||
        languageVoices[0] ||
        null;
      synth.speak(utterance);
    };

    const voices = synth.getVoices();
    if (voices.length) {
      speakWithBestVoice(voices);
      return;
    }

    const timer = window.setTimeout(() => speakWithBestVoice(synth.getVoices()), 500);
    synth.onvoiceschanged = () => {
      window.clearTimeout(timer);
      speakWithBestVoice(synth.getVoices());
    };
  });
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function createNoiseSource(ctx: AudioContext, sound: Exclude<BackgroundSound, "soft rain" | "heavy rain" | "Rain and Thunder" | "none">) {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bufferSize; i += 1) {
    const white = Math.random() * 2 - 1;
    if (sound === "brown noise") {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else if (sound === "fireplace") {
      data[i] = Math.random() > 0.985 ? white * 0.9 : white * 0.08;
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
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const gainVolume = () => Math.min(1, volumeRef.current * (sound === "soft rain" ? softRainBoost : 1));

  const start = () => {
    if (sound === "none" || sourceRef.current || ctxRef.current) return;
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.value = gainVolume();
    ctxRef.current = ctx;
    gainRef.current = gain;

    if (sound === "soft rain" || sound === "heavy rain" || sound === "Rain and Thunder") {
      const rainSoundUrl = rainSoundUrls[sound]!;
      void fetch(rainSoundUrl)
        .then((response) => response.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => {
          if (ctxRef.current !== ctx) return;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(gain).connect(ctx.destination);
          source.start();
          sourceRef.current = source;
        })
        .catch(() => {
          if (ctxRef.current !== ctx) return;
          void ctx.close().catch(() => undefined);
          ctxRef.current = null;
          gainRef.current = null;
        });
      return;
    }

    const source = createNoiseSource(ctx, sound);
    source.connect(gain).connect(ctx.destination);
    source.start();
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

  const duck = (_active: boolean) => undefined;

  useEffect(() => {
    const gain = gainRef.current;
    const ctx = ctxRef.current;
    if (gain && ctx) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.linearRampToValueAtTime(gainVolume(), ctx.currentTime + 0.25);
    }
  }, [volume, sound]);

  useEffect(() => stop, []);

  return { start, stop, duck };
}

function App() {
  const [config, setConfig] = useState<SessionConfig>(() => normalizeConfig(loadJson("lingosleep-config", defaultConfig)));
  const t = (text: string) => translate(text, config.nativeLanguage);
  const label = (text: string) => translate(text, config.nativeLanguage);
  const configRef = useRef(config);
  const [vocab, setVocab] = useState<VocabItem[]>(() => {
    const stored = loadJson<unknown>("lingosleep-vocab", null);
    return mergeVocabMetadata(vocabSeed, Array.isArray(stored) ? stored : []);
  });
  const [history, setHistory] = useState<SessionRecord[]>(() => loadJson("lingosleep-history", []));
  const [playlistPositions, setPlaylistPositions] = useState<Record<string, number>>(() => loadJson("lingosleep-playlist-positions", {}));
  const [step, setStep] = useState<"onboarding" | "setup" | "player" | "history" | "quiz">(() =>
    localStorage.getItem("lingosleep-onboarded") ? "setup" : "onboarding"
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentItem, setCurrentItem] = useState<VocabItem | null>(null);
  const [playedIds, setPlayedIds] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(config.languageMinutes * 60);
  const [backgroundLeft, setBackgroundLeft] = useState(config.backgroundMinutes * 60);
  const playingRef = useRef(false);
  const sessionTokenRef = useRef(0);
  const playedIdsRef = useRef<string[]>([]);
  const background = useBackgroundSound(config.backgroundSound, config.backgroundVolume);
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

  useEffect(() => localStorage.setItem("lingosleep-config", JSON.stringify(config)), [config]);
  useEffect(() => localStorage.setItem("lingosleep-vocab", JSON.stringify(vocab)), [vocab]);
  useEffect(() => localStorage.setItem("lingosleep-history", JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem("lingosleep-playlist-positions", JSON.stringify(playlistPositions)), [playlistPositions]);
  useEffect(() => {
    void supabase.auth.getSession().then(({ error }) => {
      if (error) console.warn("Supabase auth session check failed", error);
    });
    if (import.meta.env.VITE_SUPABASE_URL === "https://example.supabase.co") return;
    void fetchRemoteVocabulary()
      .then((remoteVocab) => {
        if (remoteVocab.length) {
          setVocab((current) => mergeVocabMetadata(takeUnique([...remoteVocab, ...vocabSeed], Number.MAX_SAFE_INTEGER), current));
        }
      })
      .catch((error) => {
        console.warn("Supabase vocabulary load failed; using bundled vocabulary", error);
      });
  }, []);

  const playlist = useMemo(() => buildPlaylist(vocab, config), [vocab, config]);
  const playlistKey = useMemo(() => getPlaylistKey(config), [config.targetLanguage, config.level, config.topic]);
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

  const isSessionActive = (sessionToken: number) => playingRef.current && sessionTokenRef.current === sessionToken;

  const speakIfPlaying = async (text: string, lang: TargetLanguage | NativeLanguage, volume: number, sessionToken: number) => {
    if (!isSessionActive(sessionToken)) return false;
    const rate = lang === configRef.current.targetLanguage ? configRef.current.targetVoiceRate : configRef.current.nativeVoiceRate;
    const voiceStyle = lang === configRef.current.targetLanguage ? configRef.current.targetVoiceStyle : configRef.current.nativeVoiceStyle;
    await speak(text, lang, volume, rate, voiceStyle);
    return isSessionActive(sessionToken);
  };

  const waitIfPlaying = async (ms: number, sessionToken: number) => {
    if (!isSessionActive(sessionToken)) return false;
    await wait(ms);
    return isSessionActive(sessionToken);
  };

  const speakItem = async (item: VocabItem, sessionToken: number) => {
    if (!isSessionActive(sessionToken)) return;
    const sessionConfig = config;
    const targetSpeechText = sessionConfig.targetLanguage === "Japanese" ? item.reading : item.targetText;
    const baseVolume = (multiplier = 1) => configRef.current.voiceVolume * multiplier;
    const targetBoost = sessionConfig.targetLanguage === "Korean" ? koreanVoiceBoost : 1;
    const voiceVolume = (multiplier = 1) => Math.min(1, baseVolume(multiplier) * targetBoost);
    const nativeVolume = (multiplier = 1) => Math.min(1, configRef.current.nativeVoiceVolume * multiplier);
    setCurrentItem(item);
    background.duck(true);
    if (sessionConfig.mode === "Native word -> target word -> target word") {
      if (!(await speakIfPlaying(item.meanings[sessionConfig.nativeLanguage], sessionConfig.nativeLanguage, nativeVolume(), sessionToken))) return;
      if (!(await waitIfPlaying(configRef.current.targetDelaySeconds * 1000, sessionToken))) return;
      if (!(await speakIfPlaying(targetSpeechText, sessionConfig.targetLanguage, voiceVolume(), sessionToken))) return;
      if (!(await waitIfPlaying(700, sessionToken))) return;
      if (!(await speakIfPlaying(targetSpeechText, sessionConfig.targetLanguage, voiceVolume(0.92), sessionToken))) return;
    } else if (sessionConfig.mode === "Recall mode") {
      if (!(await speakIfPlaying(item.meanings[sessionConfig.nativeLanguage], sessionConfig.nativeLanguage, nativeVolume(), sessionToken))) return;
      if (!(await waitIfPlaying(2800, sessionToken))) return;
      background.duck(true);
      if (!(await speakIfPlaying(targetSpeechText, sessionConfig.targetLanguage, voiceVolume(), sessionToken))) return;
      if (!(await waitIfPlaying(500, sessionToken))) return;
      if (!(await speakIfPlaying(targetSpeechText, sessionConfig.targetLanguage, voiceVolume(0.82), sessionToken))) return;
    } else if (sessionConfig.mode === "Word and example sentence") {
      if (!(await speakIfPlaying(targetSpeechText, sessionConfig.targetLanguage, voiceVolume(), sessionToken))) return;
      if (!(await waitIfPlaying(700, sessionToken))) return;
      if (!(await speakIfPlaying(item.meanings[sessionConfig.nativeLanguage], sessionConfig.nativeLanguage, nativeVolume(0.88), sessionToken))) return;
      if (!(await waitIfPlaying(900, sessionToken))) return;
      if (!(await speakIfPlaying(item.exampleSentence, sessionConfig.targetLanguage, voiceVolume(0.84), sessionToken))) return;
      if (!(await waitIfPlaying(700, sessionToken))) return;
      if (!(await speakIfPlaying(item.exampleTranslations[sessionConfig.nativeLanguage], sessionConfig.nativeLanguage, nativeVolume(0.74), sessionToken))) return;
    } else {
      if (!(await speakIfPlaying(targetSpeechText, sessionConfig.targetLanguage, voiceVolume(), sessionToken))) return;
      if (!(await waitIfPlaying(900, sessionToken))) return;
      if (!(await speakIfPlaying(item.exampleSentence, sessionConfig.targetLanguage, voiceVolume(0.78), sessionToken))) return;
    }
    if (!isSessionActive(sessionToken)) return;
    background.duck(false);
    markPlayed(item);
  };

  const startSession = async () => {
    if (playingRef.current) return;
    if (!playlist.length) return;
    const sessionToken = sessionTokenRef.current + 1;
    sessionTokenRef.current = sessionToken;
    setStep("player");
    setIsPlaying(true);
    playingRef.current = true;
    setSecondsLeft(config.languageMinutes * 60);
    setBackgroundLeft(config.backgroundMinutes * 60);
    setPlayedIds([]);
    playedIdsRef.current = [];
    background.start();

    const started = Date.now();
    const sessionPlaylist = config.playbackOrder === "Random" ? shuffle(playlist) : playlist;
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
    sessionTokenRef.current += 1;
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

  const fadeLanguage = async (sessionToken: number) => {
    for (let i = 0; i < 4; i += 1) {
      const fadeVolume = Math.max(0.05, configRef.current.voiceVolume * (0.25 - i * 0.05));
      if (!(await speakIfPlaying("Good night.", "English", fadeVolume, sessionToken))) return;
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

  return (
    <main className="app-shell">
      <div className="app-bg" />
      {step !== "onboarding" && (
        <header className="topbar">
          <button className="icon-button" onClick={goToSetup} aria-label="Back to setup">
            <ChevronLeft size={22} />
          </button>
          <div>
            <p className="eyebrow">LingoSleep</p>
            <h1>{t("Night vocabulary review")}</h1>
          </div>
          <button className="icon-button" onClick={() => setStep("history")} aria-label={t("Session history")}>
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
          <h1>{t("Relaxed vocabulary review for quiet nights.")}</h1>
          <p>
            {t(
              "Review Japanese or Korean words with validated course data, gentle pacing, translations, examples, and calming sound beds. It supports review while resting, without promising sleep-only fluency."
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

      {step === "setup" && (
        <section className="screen stack">
          <Notice t={t} />
          <ControlGroup title={t("Target language")}>
            <Segmented
              options={["Japanese", "Korean"]}
              value={config.targetLanguage}
              labelFor={label}
              onChange={(value) => updateConfig("targetLanguage", value as TargetLanguage)}
            />
            <RangeControl
              icon={<Clock3 size={18} />}
              label={t("Target speed")}
              value={config.targetVoiceRate}
              min={0.5}
              max={2}
              step={0.1}
              valueText={`${config.targetVoiceRate.toFixed(1)}x`}
              onChange={(value) => updateConfig("targetVoiceRate", value)}
            />
            <span className="segmented-label">{t("Target voice style")}</span>
            <Segmented
              options={voiceStyles}
              value={config.targetVoiceStyle}
              labelFor={label}
              onChange={(value) => updateConfig("targetVoiceStyle", value as VoiceStyle)}
            />
          </ControlGroup>
          <ControlGroup title={t("Native language")}>
            <Segmented
              options={nativeLanguages}
              value={config.nativeLanguage}
              labelFor={label}
              onChange={(value) => updateConfig("nativeLanguage", value as NativeLanguage)}
            />
            <RangeControl
              icon={<Clock3 size={18} />}
              label={t("Native speed")}
              value={config.nativeVoiceRate}
              min={0.5}
              max={2}
              step={0.1}
              valueText={`${config.nativeVoiceRate.toFixed(1)}x`}
              onChange={(value) => updateConfig("nativeVoiceRate", value)}
            />
            <span className="segmented-label">{t("Native voice style")}</span>
            <Segmented
              options={voiceStyles}
              value={config.nativeVoiceStyle}
              labelFor={label}
              onChange={(value) => updateConfig("nativeVoiceStyle", value as VoiceStyle)}
            />
          </ControlGroup>
          <ControlGroup title={t("Level")}>
            <div className="choice-grid">
              {levels.map((level) => (
                <button
                  key={level}
                  className={`choice ${config.level === level ? "selected" : ""}`}
                  onClick={() => updateConfig("level", level)}
                >
                  <strong>{label(level)}</strong>
                  <span>{level === "Basic" ? label("JLPT N5-N4 / TOPIK 1-2") : level === "Intermediate" ? label("JLPT N3-N2 / TOPIK 3-4") : label("JLPT N1 / TOPIK 5-6")}</span>
                </button>
              ))}
            </div>
          </ControlGroup>
          <ControlGroup title={t("Topic")}>
            <div className="pill-grid">
              {availableTopics.map((topic) => (
                <button
                  key={topic}
                  className={`pill ${config.topic === topic ? "selected" : ""}`}
                  onClick={() => updateConfig("topic", topic)}
                >
                  {label(topic)}
                </button>
              ))}
            </div>
          </ControlGroup>
          <ControlGroup title={t("Playback mode")}>
            <div className="choice-grid">
              {modes.map((mode) => (
                <button
                  key={mode}
                  className={`choice ${config.mode === mode ? "selected" : ""}`}
                  onClick={() => updateConfig("mode", mode)}
                >
                  <strong>{label(mode)}</strong>
                </button>
              ))}
            </div>
          </ControlGroup>
          <ControlGroup title={t("Word order")}>
            <Segmented
              options={playbackOrders}
              value={config.playbackOrder}
              labelFor={label}
              onChange={(value) => updateConfig("playbackOrder", value as PlaybackOrder)}
            />
          </ControlGroup>
          <div className="progress-card">
            <div>
              <span>{t("Finished")}</span>
              <strong>{progressPercent}%</strong>
            </div>
            <progress value={completedWords} max={playlist.length || 1} />
            <p>
              {config.nativeLanguage === "Simplified Chinese"
                ? `${completedWords}/${playlist.length} ${t("in this playlist")} · ${label(config.targetLanguage)}${t("words total")} ${targetLanguageWordCount} · `
                : `${completedWords}/${playlist.length} ${t("in this playlist")} · ${targetLanguageWordCount} ${label(config.targetLanguage)} ${t("words total")} · `}
              {config.playbackOrder === "Random"
                ? t("random order")
                : config.playbackOrder === "Start from beginning"
                  ? t("start from first word")
                : completedWords === 0
                  ? t("start from first word")
                : completedWords >= playlist.length
                  ? t("all words finished")
                : resumeWord
                  ? `${t("continue from")} ${resumeWord.targetText}`
                  : t("all words finished")}
            </p>
          </div>
          <ControlGroup title={t("Timers")}>
            <TimerPicker
              label={t("Language playback")}
              value={config.languageMinutes}
              onChange={(value) => updateConfig("languageMinutes", value)}
            />
            <TimerPicker
              label={t("Background sound")}
              value={config.backgroundMinutes}
              onChange={(value) => updateConfig("backgroundMinutes", value)}
            />
            <RangeControl
              icon={<Clock3 size={18} />}
              label={t("Meaning to target delay")}
              value={config.targetDelaySeconds}
              min={0}
              max={2}
              step={0.1}
              valueText={`${config.targetDelaySeconds.toFixed(1)}s`}
              onChange={(value) => updateConfig("targetDelaySeconds", value)}
            />
            <RangeControl
              icon={<Clock3 size={18} />}
              label={t("Pause between words")}
              value={config.pauseSeconds}
              min={0.5}
              max={5}
              step={0.5}
              valueText={`${config.pauseSeconds.toFixed(1)}s`}
              onChange={(value) => updateConfig("pauseSeconds", value)}
            />
          </ControlGroup>
          <ControlGroup title={t("Background sound")}>
            <Segmented
              options={backgroundSounds}
              value={config.backgroundSound}
              labelFor={label}
              onChange={(value) => updateConfig("backgroundSound", value as BackgroundSound)}
            />
          </ControlGroup>
          <ControlGroup title={t("Volume")}>
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
          </ControlGroup>
          <div className="sticky-actions">
            <button className="primary-button" onClick={startSession}>
              {config.playbackOrder === "Random" ? <Shuffle size={20} /> : <Play size={20} />}
              {config.playbackOrder === "Random"
                ? t("Start random session")
                : config.playbackOrder === "Start from last left" && completedWords > 0
                  ? t("Continue session")
                  : t("Start session")}
            </button>
            <button className="secondary-button" onClick={() => setStep("quiz")} disabled={!lastSessionWords.length}>
              <BookOpen size={19} />
              {t("Morning quiz")}
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
            <p className="eyebrow">{label(config.targetLanguage)} {t("review session")}</p>
            <h2>{currentItem?.targetText || t("Settling in")}</h2>
            <p className="reading">{currentItem?.reading || t("Voice will begin after you tap play")}</p>
            {currentItem && (
              <p className="meaning">
                {currentItem.meanings[config.nativeLanguage]}：{currentItem.romanization}
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
              <button className="round-button" onClick={() => (isPlaying ? stopSession(true) : startSession())}>
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
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

function buildPlaylist(vocab: VocabItem[], config: SessionConfig) {
  const languageItems = vocab.filter((item) => item.targetLanguage === config.targetLanguage);
  const levelItems = languageItems.filter((item) => item.level === config.level);
  const topicItems = config.topic === allTopics ? levelItems : levelItems.filter((item) => item.topic === config.topic);
  const backupItems =
    config.topic === allTopics ? languageItems : [...languageItems.filter((item) => item.topic === config.topic), ...levelItems, ...languageItems];
  return takeUnique([...topicItems, ...backupItems], playlistBucketSize);
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
    <label className="range-control">
      <span>
        <span>
          {icon}
          {label}
        </span>
        {valueText && <small>{valueText}</small>}
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
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
