/**
 * i18n configuration — the single place to register languages.
 *
 * Adding a language is intentionally trivial (see docs/FEATURES.md):
 *   1. add a locale JSON under src/i18n/locales/,
 *   2. import it in src/i18n/translations.js,
 *   3. add one entry to LANGUAGES below.
 * No other code changes are needed — nothing about languages is hardcoded
 * anywhere else.
 */

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

export const DEFAULT_LANG = 'en';
export const LANG_STORAGE_KEY = 'language_v1';

const safeStorage = (storage) =>
  storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);

/** Is `code` a registered language? */
export const isSupportedLang = (code) => LANGUAGES.some((l) => l.code === code);

/** Load the persisted language, falling back to DEFAULT_LANG. */
export const loadLang = (storage) => {
  const s = safeStorage(storage);
  if (!s) return DEFAULT_LANG;
  const stored = s.getItem(LANG_STORAGE_KEY);
  return isSupportedLang(stored) ? stored : DEFAULT_LANG;
};

/** Persist a language if supported; returns the effective language. */
export const saveLang = (code, storage) => {
  const effective = isSupportedLang(code) ? code : DEFAULT_LANG;
  const s = safeStorage(storage);
  if (s) s.setItem(LANG_STORAGE_KEY, effective);
  return effective;
};
