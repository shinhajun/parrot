import type { LanguageCode } from "@/lib/languages";

export const VOICE_CLONE_MIN_DURATION = 10; // seconds of speech needed
export const SUBTITLE_FADE_DURATION = 5000; // ms before subtitle fades
export const TTS_VOLUME = 0.7;
export const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel
export const SUPABASE_FUNCTIONS_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1";

export const SAMPLE_SENTENCES: Record<LanguageCode, string> = {
  ko: "안녕하세요. 만나서 반갑습니다. 지금 제 목소리를 등록하고 있습니다.",
  en: "Hello, nice to meet you. I am registering my voice right now.",
  ja: "はじめまして。今、声を登録しています。よろしくお願いします。",
  zh: "你好，很高兴认识你。我正在注册我的声音。",
  es: "Hola, mucho gusto. Estoy registrando mi voz ahora mismo.",
  fr: "Bonjour, enchanté. Je suis en train d'enregistrer ma voix.",
  de: "Hallo, schön Sie kennenzulernen. Ich registriere jetzt meine Stimme.",
};
