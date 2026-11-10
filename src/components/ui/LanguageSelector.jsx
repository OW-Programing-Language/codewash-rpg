import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

/**
 * Language selector: a labelled list of buttons, one per registered language.
 * Driven entirely by the i18n config — adding a language adds a button here with
 * no code change (see src/i18n/config.js).
 */
const LanguageSelector = () => {
  const { lang, setLang, languages, t } = useI18n();

  return (
    <div>
      <h3 className="text-xl text-blue-300 mb-5 font-bold flex items-center gap-3 uppercase tracking-wider">
        <Globe size={20} /> {t('language.label')}
      </h3>
      <div className="flex flex-wrap gap-3" role="group" aria-label={t('language.choose')}>
        {languages.map((l) => {
          const active = l.code === lang;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              aria-pressed={active}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-bold transition-all ${
                active
                  ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300'
                  : 'border-slate-600 bg-slate-900/50 text-slate-300 hover:border-slate-400'
              }`}
            >
              <span aria-hidden="true">{l.flag}</span>
              {l.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSelector;
