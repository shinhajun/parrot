export const LANGUAGES = {
  ko: { name: "한국어", flag: "🇰🇷", english: "Korean" },
  en: { name: "English", flag: "🇺🇸", english: "English" },
  ja: { name: "日本語", flag: "🇯🇵", english: "Japanese" },
  zh: { name: "中文", flag: "🇨🇳", english: "Chinese" },
  es: { name: "Español", flag: "🇪🇸", english: "Spanish" },
  fr: { name: "Français", flag: "🇫🇷", english: "French" },
  de: { name: "Deutsch", flag: "🇩🇪", english: "German" },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

export function getLanguageName(code: LanguageCode): string {
  return LANGUAGES[code].name;
}

export function getLanguageFlag(code: LanguageCode): string {
  return LANGUAGES[code].flag;
}

export function getLanguageEnglish(code: LanguageCode): string {
  return LANGUAGES[code].english;
}
