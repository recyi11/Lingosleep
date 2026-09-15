import type { NativeLanguage, VocabItem } from "./vocabulary";

export type AudioVoiceStyle = "Auto" | "Female" | "Male";
export type TargetAudioKind = "word" | "example";
export type NativeAudioKind = "meaning" | "example";

const AUDIO_KEY_VERSION = "v2-2026-09";

function stableHash(input: string) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, "0");
}

export function targetSpeechText(item: VocabItem) {
  return item.targetLanguage === "Japanese" ? item.reading || item.targetText : item.targetText;
}

export function targetAudioFingerprint(item: VocabItem, kind: TargetAudioKind) {
  const text = kind === "word" ? targetSpeechText(item) : item.exampleSentence;
  return stableHash([AUDIO_KEY_VERSION, "target", kind, item.id, item.targetLanguage, text].join("\u001f"));
}

export function nativeAudioFingerprint(item: VocabItem, kind: NativeAudioKind, language: NativeLanguage) {
  const text = kind === "meaning" ? item.meanings[language] : item.exampleTranslations[language];
  return stableHash([AUDIO_KEY_VERSION, "native", kind, item.id, language, text || ""].join("\u001f"));
}

function supabaseAudioUrl(storagePath: string) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url || url === "https://example.supabase.co") return undefined;
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/audio/${storagePath}`;
}

function contentAddressedSources(storagePath: string) {
  const remoteUrl = supabaseAudioUrl(storagePath);
  const localUrl = `/audio/${storagePath}`;
  return [remoteUrl, localUrl].filter(Boolean) as string[];
}

export function targetAudioSourcesV2(item: VocabItem, kind: TargetAudioKind, style: AudioVoiceStyle) {
  const fingerprint = targetAudioFingerprint(item, kind);
  const fileName = `${item.id}-${kind}-${fingerprint}.mp3`;
  const storagePath = style === "Male" ? `target/v2/male/${fileName}` : `target/v2/${fileName}`;
  return contentAddressedSources(storagePath);
}

export function nativeAudioSourcesV2(
  item: VocabItem,
  kind: NativeAudioKind,
  language: NativeLanguage,
  style: AudioVoiceStyle
) {
  const languagePath = language === "English" ? "en" : language === "Simplified Chinese" ? "zh-cn" : null;
  if (!languagePath) return [];
  const fingerprint = nativeAudioFingerprint(item, kind, language);
  const fileName = `${item.id}-${kind}-${fingerprint}.mp3`;
  const storagePath = style === "Male" ? `native/v2/${languagePath}/male/${fileName}` : `native/v2/${languagePath}/${fileName}`;
  return contentAddressedSources(storagePath);
}
