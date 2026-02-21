import type { LanguageCode } from "@/lib/languages";

export interface ChatMessage {
  id: string; // unique message id
  senderId: string; // peerId or "local"
  senderName: string;
  originalText: string;
  sourceLang: LanguageCode;
  translatedText?: string; // only populated if it needed translation
  timestamp: number;
}

export type DataChannelMessage =
  | { type: "subtitle"; original: string; translated: string; segmentId: string }
  | { type: "tts-audio"; audioBase64: string; segmentId: string }
  | { type: "language"; lang: LanguageCode }
  | { type: "voice-ready"; voiceId: string }
  | { type: "mute-status"; isMuted: boolean }
  | { type: "camera-status"; isCameraOff: boolean }
  | { type: "nickname"; name: string }
  | { type: "chat-message"; message: ChatMessage };

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
