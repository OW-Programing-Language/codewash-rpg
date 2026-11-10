import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { translations } from './translations';
import { LANGUAGES, DEFAULT_LANG, loadLang, saveLang } from './config';
import { makeTranslator } from './translate';

/**
 * Thin React binding around the pure i18n core (translate.js / config.js).
 * All real logic is in those tested modules; this only holds the active-language
 * state and exposes `t`.
 */
const I18nContext = createContext(null);

export const I18nProvider = ({ children, initialLang }) => {
  const [lang, setLangState] = useState(() => initialLang ?? loadLang());

  const setLang = useCallback((code) => {
    const effective = saveLang(code);
    setLangState(effective);
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      languages: LANGUAGES,
      t: makeTranslator(translations, lang),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

/** Access i18n. Falls back to a default English translator if no provider. */
// eslint-disable-next-line react-refresh/only-export-components -- context + its hook conventionally live together; fast-refresh impact is negligible.
export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return {
    lang: DEFAULT_LANG,
    setLang: () => {},
    languages: LANGUAGES,
    t: makeTranslator(translations, DEFAULT_LANG),
  };
};
