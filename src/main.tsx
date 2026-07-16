import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, Check, ChevronLeft, Clock3, Heart, History, Moon, Pause, Play, SlidersHorizontal, Star, Volume2, Waves } from "lucide-react";
import "./styles.css";

type TargetLanguage = "Japanese" | "Korean";
type NativeLanguage = "English" | "Simplified Chinese" | "Traditional Chinese";
type Level = "Basic" | "Intermediate" | "Advanced";
type Topic = "food" | "travel" | "daily life" | "numbers" | "common verbs" | "work" | "school" | "anime/drama" | "JLPT" | "TOPIK";
type Mode = "Native word -> target word -> target word" | "Recall mode" | "Word and example sentence" | "Target-language-only immersion";
type Sound = "rain" | "white noise" | "brown noise" | "fireplace" | "none";
type Status = "New" | "Learning" | "Familiar" | "Mastered";

type Word = {
  id: string;
  lang: TargetLanguage;
  text: string;
  meanings: Record<NativeLanguage, string>;
  reading: string;
  romanization: string;
  level: Level;
  topic: Topic;
  example: string;
  translations: Record<NativeLanguage, string>;
  status?: Status;
  favorite?: boolean;
  timesPlayed?: number;
  lastPlayed?: string;
};

type Config = {
  targetLanguage: TargetLanguage;
  nativeLanguage: NativeLanguage;
  level: Level;
  topic: Topic;
  mode: Mode;
  languageMinutes: number;
  backgroundMinutes: number;
  backgroundSound: Sound;
  voiceVolume: number;
  backgroundVolume: number;
};

type Session = { id: string; date: string; config: Config; playedIds: string[] };

const nativeLanguages: NativeLanguage[] = ["English", "Simplified Chinese", "Traditional Chinese"];
const levels: Level[] = ["Basic", "Intermediate", "Advanced"];
const topics: Topic[] = ["food", "travel", "daily life", "numbers", "common verbs", "work", "school", "anime/drama", "JLPT", "TOPIK"];
const modes: Mode[] = ["Native word -> target word -> target word", "Recall mode", "Word and example sentence", "Target-language-only immersion"];
const durations = [10, 20, 30, 45, 60];
const sounds: Sound[] = ["rain", "white noise", "brown noise", "fireplace", "none"];

const defaultConfig: Config = {
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

const seed: Word[] = [
  word("ja-food-basic-1", "Japanese", "ご飯", "meal; cooked rice", "米饭；餐", "米飯；餐", "ごはん", "gohan", "Basic", "food", "朝ご飯を食べます。", "I eat breakfast.", "我吃早饭。", "我吃早飯。"),
  word("ja-travel-basic-1", "Japanese", "駅", "station", "车站", "車站", "えき", "eki", "Basic", "travel", "駅はどこですか。", "Where is the station?", "车站在哪里？", "車站在哪裡？"),
  word("ja-life-basic-1", "Japanese", "寝る", "to sleep", "睡觉", "睡覺", "ねる", "neru", "Basic", "daily life", "十一時に寝ます。", "I go to sleep at eleven.", "我十一点睡觉。", "我十一點睡覺。"),
  word("ja-numbers-basic-1", "Japanese", "七", "seven", "七", "七", "なな / しち", "nana / shichi", "Basic", "numbers", "七つください。", "Seven, please.", "请给我七个。", "請給我七個。"),
  word("ja-verbs-basic-1", "Japanese", "見る", "to see; to watch", "看", "看", "みる", "miru", "Basic", "common verbs", "映画を見ます。", "I watch a movie.", "我看电影。", "我看電影。"),
  word("ja-work-intermediate-1", "Japanese", "会議", "meeting; conference", "会议", "會議", "かいぎ", "kaigi", "Intermediate", "work", "午後に会議があります。", "There is a meeting in the afternoon.", "下午有会议。", "下午有會議。"),
  word("ja-school-intermediate-1", "Japanese", "課題", "assignment; task", "课题；作业", "課題；作業", "かだい", "kadai", "Intermediate", "school", "課題を提出しました。", "I submitted the assignment.", "我提交了作业。", "我提交了作業。"),
  word("ja-anime-intermediate-1", "Japanese", "主人公", "main character", "主角", "主角", "しゅじんこう", "shujinko", "Intermediate", "anime/drama", "主人公は勇敢です。", "The main character is brave.", "主角很勇敢。", "主角很勇敢。"),
  word("ja-jlpt-advanced-1", "Japanese", "恐縮", "feeling obliged; humbled", "惶恐；不好意思", "惶恐；不好意思", "きょうしゅく", "kyoshuku", "Advanced", "JLPT", "お手数をおかけして恐縮です。", "I am sorry to trouble you.", "给您添麻烦，我很不好意思。", "給您添麻煩，我很不好意思。"),
  word("ko-food-basic-1", "Korean", "밥", "rice; meal", "米饭；饭", "米飯；飯", "밥", "bap", "Basic", "food", "밥을 먹어요.", "I eat a meal.", "我吃饭。", "我吃飯。"),
  word("ko-travel-basic-1", "Korean", "역", "station", "车站", "車站", "역", "yeok", "Basic", "travel", "역이 어디예요?", "Where is the station?", "车站在哪里？", "車站在哪裡？"),
  word("ko-life-basic-1", "Korean", "자다", "to sleep", "睡觉", "睡覺", "자다", "jada", "Basic", "daily life", "열한 시에 자요.", "I sleep at eleven.", "我十一点睡觉。", "我十一點睡覺。"),
  word("ko-numbers-basic-1", "Korean", "일곱", "seven", "七", "七", "일곱", "ilgop", "Basic", "numbers", "일곱 개 주세요.", "Seven, please.", "请给我七个。", "請給我七個。"),
  word("ko-verbs-basic-1", "Korean", "보다", "to see; to watch", "看", "看", "보다", "boda", "Basic", "common verbs", "드라마를 봐요.", "I watch a drama.", "我看电视剧。", "我看電視劇。"),
  word("ko-work-intermediate-1", "Korean", "회의", "meeting", "会议", "會議", "회의", "hoeui", "Intermediate", "work", "오후에 회의가 있어요.", "There is a meeting in the afternoon.", "下午有会议。", "下午有會議。"),
  word("ko-school-intermediate-1", "Korean", "과제", "assignment", "作业；课题", "作業；課題", "과제", "gwaje", "Intermediate", "school", "과제를 냈어요.", "I turned in the assignment.", "我交了作业。", "我交了作業。"),
  word("ko-drama-intermediate-1", "Korean", "주인공", "main character", "主角", "主角", "주인공", "juingong", "Intermediate", "anime/drama", "주인공이 용감해요.", "The main character is brave.", "主角很勇敢。", "主角很勇敢。"),
  word("ko-topik-advanced-1", "Korean", "유지하다", "to maintain", "维持", "維持", "유지하다", "yujihada", "Advanced", "TOPIK", "건강한 습관을 유지해야 합니다.", "You should maintain healthy habits.", "应该维持健康的习惯。", "應該維持健康的習慣。"),
];

function word(id: string, lang: TargetLanguage, text: string, en: string, zh: string, zht: string, reading: string, romanization: string, level: Level, topic: Topic, example: string, exEn: string, exZh: string, exZht: string): Word {
  return { id, lang, text, meanings: { English: en, "Simplified Chinese": zh, "Traditional Chinese": zht }, reading, romanization, level, topic, example, translations: { English: exEn, "Simplified Chinese": exZh, "Traditional Chinese": exZht } };
}

function stored<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function say(text: string, lang: TargetLanguage | NativeLanguage, volume: number) {
  return new Promise<void>((resolve) => {
    if (!("speechSynthesis" in window)) return void setTimeout(resolve, 900);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "Japanese" ? "ja-JP" : lang === "Korean" ? "ko-KR" : lang === "Simplified Chinese" ? "zh-CN" : lang === "Traditional Chinese" ? "zh-TW" : "en-US";
    u.rate = lang === "English" ? 0.78 : 0.72;
    u.pitch = 0.84;
    u.volume = volume;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function useSound(sound: Sound, volume: number) {
  const ctx = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const stop = () => { source.current?.stop(); ctx.current?.close(); source.current = null; gain.current = null; ctx.current = null; };
  const start = () => {
    if (sound === "none" || source.current) return;
    const audio = new AudioContext();
    const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      if (sound === "brown noise") { last = (last + 0.02 * white) / 1.02; data[i] = last * 3.5; }
      else if (sound === "fireplace") data[i] = Math.random() > 0.985 ? white * 0.9 : white * 0.08;
      else if (sound === "rain") data[i] = white * (Math.random() > 0.96 ? 0.55 : 0.16);
      else data[i] = white * 0.22;
    }
    const s = audio.createBufferSource();
    const g = audio.createGain();
    g.gain.value = volume;
    s.buffer = buffer; s.loop = true; s.connect(g).connect(audio.destination); s.start();
    ctx.current = audio; gain.current = g; source.current = s;
  };
  const duck = (active: boolean) => {
    if (!ctx.current || !gain.current) return;
    gain.current.gain.linearRampToValueAtTime(active ? volume * 0.28 : volume, ctx.current.currentTime + 0.35);
  };
  useEffect(() => () => stop(), []);
  return { start, stop, duck };
}

function App() {
  const [config, setConfig] = useState<Config>(() => stored("lingosleep-config", defaultConfig));
  const [words, setWords] = useState<Word[]>(() => seed.map((item) => ({ ...item, status: "New", favorite: false, timesPlayed: 0, ...stored<Record<string, Partial<Word>>>("lingosleep-progress", {})[item.id] })));
  const [history, setHistory] = useState<Session[]>(() => stored("lingosleep-history", []));
  const [screen, setScreen] = useState<"onboarding" | "setup" | "player" | "history" | "quiz">(() => localStorage.getItem("lingosleep-onboarded") ? "setup" : "onboarding");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState<Word | null>(null);
  const [voiceLeft, setVoiceLeft] = useState(config.languageMinutes * 60);
  const [soundLeft, setSoundLeft] = useState(config.backgroundMinutes * 60);
  const played = useRef<string[]>([]);
  const playingRef = useRef(false);
  const bed = useSound(config.backgroundSound, config.backgroundVolume);

  useEffect(() => localStorage.setItem("lingosleep-config", JSON.stringify(config)), [config]);
  useEffect(() => localStorage.setItem("lingosleep-progress", JSON.stringify(Object.fromEntries(words.map((w) => [w.id, { status: w.status, favorite: w.favorite, timesPlayed: w.timesPlayed, lastPlayed: w.lastPlayed }])))), [words]);
  useEffect(() => localStorage.setItem("lingosleep-history", JSON.stringify(history)), [history]);

  const playlist = useMemo(() => words.filter((w) => w.lang === config.targetLanguage && w.level === config.level && (w.topic === config.topic || w.topic === (config.targetLanguage === "Japanese" ? "JLPT" : "TOPIK"))).sort((a, b) => score(a) - score(b)), [words, config]);
  const fallback = useMemo(() => words.filter((w) => w.lang === config.targetLanguage && w.level === config.level), [words, config]);
  const sessionWords = playlist.length ? playlist : fallback;
  const quizWords = (history[0]?.playedIds || []).map((id) => words.find((w) => w.id === id)).filter(Boolean) as Word[];

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: current?.text || "Sleep vocabulary session", artist: "LingoSleep", album: `${config.targetLanguage} ${config.level}` });
    navigator.mediaSession.setActionHandler("play", start);
    navigator.mediaSession.setActionHandler("pause", () => stop(true));
  }, [current, config]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setVoiceLeft((n) => Math.max(0, n - 1));
      setSoundLeft((n) => { const next = Math.max(0, n - 1); if (next === 0) bed.stop(); return next; });
    }, 1000);
    return () => clearInterval(timer);
  }, [playing]);

  const patchConfig = <K extends keyof Config>(key: K, value: Config[K]) => setConfig((now) => ({ ...now, [key]: value }));
  const mark = (item: Word) => {
    if (!played.current.includes(item.id)) played.current.push(item.id);
    setWords((all) => all.map((w) => w.id === item.id ? { ...w, timesPlayed: (w.timesPlayed || 0) + 1, status: nextStatus((w.timesPlayed || 0) + 1), lastPlayed: new Date().toISOString() } : w));
  };

  async function playWord(item: Word) {
    setCurrent(item); bed.duck(true);
    if (config.mode === "Native word -> target word -> target word") { await say(item.meanings[config.nativeLanguage], config.nativeLanguage, config.voiceVolume); await sleep(800); await say(item.text, config.targetLanguage, config.voiceVolume); await sleep(500); await say(item.text, config.targetLanguage, config.voiceVolume * 0.9); }
    else if (config.mode === "Recall mode") { await say(item.meanings[config.nativeLanguage], config.nativeLanguage, config.voiceVolume); bed.duck(false); await sleep(2800); bed.duck(true); await say(item.text, config.targetLanguage, config.voiceVolume); await sleep(500); await say(item.reading, config.targetLanguage, config.voiceVolume * 0.82); }
    else if (config.mode === "Word and example sentence") { await say(item.text, config.targetLanguage, config.voiceVolume); await sleep(700); await say(item.meanings[config.nativeLanguage], config.nativeLanguage, config.voiceVolume * 0.88); await sleep(800); await say(item.example, config.targetLanguage, config.voiceVolume * 0.84); await sleep(600); await say(item.translations[config.nativeLanguage], config.nativeLanguage, config.voiceVolume * 0.74); }
    else { await say(item.text, config.targetLanguage, config.voiceVolume); await sleep(900); await say(item.example, config.targetLanguage, config.voiceVolume * 0.78); }
    bed.duck(false); mark(item);
  }

  async function start() {
    if (playingRef.current || !sessionWords.length) return;
    setScreen("player"); setPlaying(true); playingRef.current = true; played.current = [];
    setVoiceLeft(config.languageMinutes * 60); setSoundLeft(config.backgroundMinutes * 60); bed.start();
    const began = Date.now(); let index = 0;
    while (playingRef.current && Date.now() - began < config.languageMinutes * 60000) { await playWord(sessionWords[index % sessionWords.length]); index++; await sleep(1600); }
    if (playingRef.current) { for (const volume of [0.18, 0.12, 0.07]) await say("Good night.", "English", config.voiceVolume * volume); stop(true); }
  }

  function stop(save: boolean) {
    playingRef.current = false; speechSynthesis?.cancel(); setPlaying(false);
    const ids = [...new Set(played.current)];
    if (save && ids.length) setHistory((all) => [{ id: crypto.randomUUID(), date: new Date().toISOString(), config, playedIds: ids }, ...all]);
  }

  const favorite = (id: string) => setWords((all) => all.map((w) => w.id === id ? { ...w, favorite: !w.favorite } : w));

  return <main className="app-shell"><div className="app-bg" />{screen !== "onboarding" && <header className="topbar"><button className="icon-button" onClick={() => setScreen("setup")} aria-label="Back to setup"><ChevronLeft /></button><div><p className="eyebrow">LingoSleep</p><h1>Night vocabulary review</h1></div><button className="icon-button" onClick={() => setScreen("history")} aria-label="Session history"><History /></button></header>}
    {screen === "onboarding" && <section className="onboarding"><div className="moon-mark"><Moon size={42} /></div><p className="eyebrow">LingoSleep</p><h1>Relaxed vocabulary review for quiet nights.</h1><p>Review Japanese or Korean words with validated course data, gentle pacing, translations, examples, and calming sound beds. It supports review while resting, without promising sleep-only fluency.</p><button className="primary-button" onClick={() => { localStorage.setItem("lingosleep-onboarded", "true"); setScreen("setup"); }}><Play size={19} />Begin</button></section>}
    {screen === "setup" && <section className="screen stack"><div className="notice"><SlidersHorizontal /><p>Gentle review for rest time. Fluency still needs active study, speaking, reading, and recall practice.</p></div><Group title="Target language"><Segments options={["Japanese", "Korean"]} value={config.targetLanguage} onChange={(v) => patchConfig("targetLanguage", v as TargetLanguage)} /></Group><Group title="Native language"><Segments options={nativeLanguages} value={config.nativeLanguage} onChange={(v) => patchConfig("nativeLanguage", v as NativeLanguage)} /></Group><Group title="Level"><div className="choice-grid">{levels.map((level) => <button className={`choice ${config.level === level ? "selected" : ""}`} onClick={() => patchConfig("level", level)} key={level}><strong>{level}</strong><span>{level === "Basic" ? "JLPT N5-N4 / TOPIK 1-2" : level === "Intermediate" ? "JLPT N3-N2 / TOPIK 3-4" : "JLPT N1 / TOPIK 5-6"}</span></button>)}</div></Group><Group title="Topic"><div className="pill-grid">{topics.map((topic) => <button className={`pill ${config.topic === topic ? "selected" : ""}`} onClick={() => patchConfig("topic", topic)} key={topic}>{topic}</button>)}</div></Group><Group title="Playback mode"><div className="choice-grid">{modes.map((mode) => <button className={`choice ${config.mode === mode ? "selected" : ""}`} onClick={() => patchConfig("mode", mode)} key={mode}><strong>{mode}</strong></button>)}</div></Group><Group title="Timers"><Timer label="Language playback" value={config.languageMinutes} onChange={(v) => patchConfig("languageMinutes", v)} /><Timer label="Background sound" value={config.backgroundMinutes} onChange={(v) => patchConfig("backgroundMinutes", v)} /></Group><Group title="Background sound"><Segments options={sounds} value={config.backgroundSound} onChange={(v) => patchConfig("backgroundSound", v as Sound)} /></Group><Group title="Volume"><Range icon={<Volume2 size={18} />} label="Voice" value={config.voiceVolume} onChange={(v) => patchConfig("voiceVolume", v)} /><Range icon={<Waves size={18} />} label="Background" value={config.backgroundVolume} onChange={(v) => patchConfig("backgroundVolume", v)} /></Group><div className="sticky-actions"><button className="primary-button" onClick={start}><Play size={20} />Start sleep session</button><button className="secondary-button" onClick={() => setScreen("quiz")} disabled={!quizWords.length}><BookOpen size={19} />Morning quiz</button></div></section>}
    {screen === "player" && <section className="screen player"><div className="orbital"><Moon size={62} /></div><div className="player-card"><p className="eyebrow">{config.targetLanguage} sleep session</p><h2>{current?.text || "Settling in"}</h2><p className="reading">{current?.reading || "Voice will begin after you tap play"}</p>{current && <p className="meaning">{current.meanings[config.nativeLanguage]} · {current.romanization}</p>}<div className="timers"><span><Clock3 size={16} />Voice {fmt(voiceLeft)}</span><span><Waves size={16} />Sound {fmt(soundLeft)}</span></div><div className="player-actions"><button className="round-button" onClick={() => playing ? stop(true) : start()}>{playing ? <Pause size={32} /> : <Play size={32} />}</button><button className="icon-button" onClick={() => current && favorite(current.id)}><Heart size={23} fill={current?.favorite ? "currentColor" : "none"} /></button></div></div><p className="fine-print">Add this app to your home screen for the best mobile lock-screen playback support. Browser policies may vary.</p></section>}
    {screen === "history" && <section className="screen stack"><h2>Session history</h2>{!history.length && <Empty text="Completed sessions will appear here with every word that was played." />}{history.map((s) => <article className="history-card" key={s.id}><div className="history-head"><div><strong>{new Date(s.date).toLocaleString()}</strong><span>{s.config.targetLanguage} · {s.config.level} · {s.playedIds.length} words</span></div></div><div className="word-list">{s.playedIds.map((id) => { const item = words.find((w) => w.id === id); return item ? <WordRow key={id} item={item} native={s.config.nativeLanguage} favorite={favorite} /> : null; })}</div></article>)}</section>}
    {screen === "quiz" && <Quiz words={quizWords} native={config.nativeLanguage} back={() => setScreen("setup")} known={(id) => setWords((all) => all.map((w) => w.id === id ? { ...w, status: promote(w.status || "New") } : w))} />}
  </main>;
}

function score(w: Word) { return (w.status === "New" ? 0 : w.status === "Learning" ? 1 : w.status === "Familiar" ? 2 : 3) - (w.favorite ? 0.8 : 0) + (w.lastPlayed ? 0.4 : 0); }
function nextStatus(times: number): Status { return times >= 8 ? "Mastered" : times >= 4 ? "Familiar" : times >= 1 ? "Learning" : "New"; }
function promote(s: Status): Status { return s === "New" ? "Learning" : s === "Learning" ? "Familiar" : "Mastered"; }
function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function Group({ title, children }: { title: string; children: React.ReactNode }) { return <section className="control-group"><h2>{title}</h2>{children}</section>; }
function Segments({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) { return <div className="segmented">{options.map((o) => <button className={value === o ? "active" : ""} onClick={() => onChange(o)} key={o}>{o}</button>)}</div>; }
function Timer({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <div className="timer-picker"><span>{label}</span><div>{durations.map((d) => <button className={value === d ? "active" : ""} onClick={() => onChange(d)} key={d}>{d}</button>)}</div></div>; }
function Range({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: number; onChange: (value: number) => void }) { return <label className="range-control"><span>{icon}{label}</span><input type="range" min="0" max="1" step="0.01" value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>; }
function WordRow({ item, native, favorite }: { item: Word; native: NativeLanguage; favorite: (id: string) => void }) { return <div className="word-row"><div><strong>{item.text}</strong><span>{item.meanings[native]} · {item.status || "New"} · played {item.timesPlayed || 0}</span></div><button className="icon-button" onClick={() => favorite(item.id)}><Star size={18} fill={item.favorite ? "currentColor" : "none"} /></button></div>; }
function Empty({ text }: { text: string }) { return <div className="empty-state"><Moon size={26} /><p>{text}</p></div>; }
function Quiz({ words, native, back, known }: { words: Word[]; native: NativeLanguage; back: () => void; known: (id: string) => void }) { const [i, setI] = useState(0); const [show, setShow] = useState(false); const word = words[i]; if (!word) return <section className="screen stack"><Empty text="Finish a sleep session first, then tomorrow's recall quiz will use those words." /><button className="primary-button" onClick={back}>Back to setup</button></section>; return <section className="screen quiz"><p className="eyebrow">Morning recall {i + 1}/{words.length}</p><h2>{word.meanings[native]}</h2><p className="fine-print">Try to recall the target-language word before revealing it.</p>{show && <div className="answer"><strong>{word.text}</strong><span>{word.reading} · {word.romanization}</span><p>{word.example}</p></div>}<div className="quiz-actions"><button className="secondary-button" onClick={() => setShow(true)}>Reveal</button><button className="primary-button" onClick={() => { known(word.id); setShow(false); setI((n) => Math.min(words.length - 1, n + 1)); }}><Check size={18} />I remembered</button></div><button className="text-button" onClick={back}>Done</button></section>; }

createRoot(document.getElementById("root")!).render(<App />);
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/public-sw.js").catch(() => undefined));
