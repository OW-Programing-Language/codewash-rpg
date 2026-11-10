/**
 * Pure translation core — no React, no I/O, fully unit-testable.
 *
 * Keys use dot notation ("settings.title"). Missing keys fall back to the
 * fallback language, then to the key itself, so a missing translation is never
 * a crash and is visible in the UI.
 */

export const DEFAULT_FALLBACK_LANG = 'en';

/** Replace {placeholders} in a string from a vars object. */
export const interpolate = (template, vars = {}) => {
  if (typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
};

/** Resolve a dotted key against a nested dictionary. Returns undefined if absent. */
export const resolveKey = (dict, key) => {
  if (!dict || typeof key !== 'string') return undefined;
  return key.split('.').reduce((node, part) => {
    if (node && typeof node === 'object' && part in node) return node[part];
    return undefined;
  }, dict);
};

/**
 * Translate `key` for `lang`, with interpolation and fallback.
 *
 * @param translations { [lang]: nestedDict }
 * @param lang          active language code
 * @param key           dotted key
 * @param vars          interpolation vars
 * @param fallbackLang  used when the key is missing in `lang`
 * @returns the resolved string, or the key itself if nothing matches
 */
export const translate = (translations, lang, key, vars = {}, fallbackLang = DEFAULT_FALLBACK_LANG) => {
  const dicts = translations || {};
  let value = resolveKey(dicts[lang], key);
  if (value === undefined && fallbackLang && fallbackLang !== lang) {
    value = resolveKey(dicts[fallbackLang], key);
  }
  if (typeof value !== 'string') return key;
  return interpolate(value, vars);
};

/** Build a bound `t(key, vars)` for a given language. */
export const makeTranslator = (translations, lang, fallbackLang = DEFAULT_FALLBACK_LANG) =>
  (key, vars) => translate(translations, lang, key, vars, fallbackLang);
