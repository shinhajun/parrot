export const LANGUAGES = {
  ko: { name: "한국어", flag: "🇰🇷", english: "Korean" },
  en: { name: "English", flag: "🇺🇸", english: "English" },
  ja: { name: "日本語", flag: "🇯🇵", english: "Japanese" },
  zh: { name: "中文", flag: "🇨🇳", english: "Chinese" },
  es: { name: "Español", flag: "🇪🇸", english: "Spanish" },
  fr: { name: "Français", flag: "🇫🇷", english: "French" },
  de: { name: "Deutsch", flag: "🇩🇪", english: "German" },
  pt: { name: "Português", flag: "🇧🇷", english: "Portuguese" },
  it: { name: "Italiano", flag: "🇮🇹", english: "Italian" },
  ru: { name: "Русский", flag: "🇷🇺", english: "Russian" },
  hi: { name: "हिन्दी", flag: "🇮🇳", english: "Hindi" },
  ar: { name: "العربية", flag: "🇸🇦", english: "Arabic" },
  vi: { name: "Tiếng Việt", flag: "🇻🇳", english: "Vietnamese" },
  id: { name: "Bahasa Indonesia", flag: "🇮🇩", english: "Indonesian" },
  th: { name: "ภาษาไทย", flag: "🇹🇭", english: "Thai" },
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
