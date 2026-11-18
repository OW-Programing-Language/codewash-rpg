import { describe, it, expect } from 'vitest';
import {
  LANGUAGES,
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  isSupportedLang,
  loadLang,
  saveLang,
} from './config';

function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

describe('config', () => {
  it('ships at least English and French, with English as default', () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(codes).toContain('en');
    expect(codes).toContain('fr');
    expect(DEFAULT_LANG).toBe('en');
  });

  it('isSupportedLang', () => {
    expect(isSupportedLang('fr')).toBe(true);
    expect(isSupportedLang('xx')).toBe(false);
    expect(isSupportedLang(null)).toBe(false);
  });

  describe('loadLang', () => {
    it('returns the stored language when supported', () => {
      expect(loadLang(makeStorage({ [LANG_STORAGE_KEY]: 'fr' }))).toBe('fr');
    });
    it('falls back to default for unknown or missing values', () => {
      expect(loadLang(makeStorage({ [LANG_STORAGE_KEY]: 'xx' }))).toBe('en');
      expect(loadLang(makeStorage())).toBe('en');
      expect(loadLang(null)).toBe('en');
    });
  });

  describe('saveLang', () => {
    it('persists supported languages and echoes them', () => {
      const s = makeStorage();
      expect(saveLang('fr', s)).toBe('fr');
      expect(s.getItem(LANG_STORAGE_KEY)).toBe('fr');
    });
    it('coerces unsupported to default', () => {
      const s = makeStorage();
      expect(saveLang('zz', s)).toBe('en');
      expect(s.getItem(LANG_STORAGE_KEY)).toBe('en');
    });
    it('no storage → still returns effective language', () => {
      expect(saveLang('fr', null)).toBe('fr');
    });
  });
});
