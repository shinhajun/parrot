import type { LanguageCode } from "@/lib/languages";

export type DataChannelMessage =
  | { type: "subtitle"; original: string; translated: string; segmentId: string }
  | { type: "tts-audio"; audioBase64: string; segmentId: string }
  | { type: "language"; lang: LanguageCode }
  | { type: "voice-ready"; voiceId: string }
  | { type: "mute-status"; isMuted: boolean }
  | { type: "camera-status"; isCameraOff: boolean };

export interface TranslateRequest {
  audioBase64: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
}

export interface TranslateResponse {
  originalText: string;
  translatedText: string;
}

export interface TTSRequest {
  text: string;
  voiceId?: string;
  languageCode: LanguageCode;
}

export interface CloneVoiceRequest {
  audioBase64: string;
  name: string;
}

export interface CloneVoiceResponse {
  voiceId: string;
}

export interface Subtitle {
  id: string;
  original: string;
  translated: string;
  timestamp: number;
  isMine: boolean;
}
