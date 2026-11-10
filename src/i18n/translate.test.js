import { describe, it, expect } from 'vitest';
import { interpolate, resolveKey, translate, makeTranslator } from './translate';

const T = {
  en: { a: { b: 'Hello {name}' }, flat: 'Flat EN', onlyEn: 'EN only' },
  fr: { a: { b: 'Bonjour {name}' }, flat: 'Plat FR' },
};

describe('interpolate', () => {
  it('replaces known placeholders', () => {
    expect(interpolate('Hi {name}, {name}!', { name: 'Zoe' })).toBe('Hi Zoe, Zoe!');
  });
  it('leaves unknown placeholders untouched and coerces values', () => {
    expect(interpolate('{a}-{b}', { a: 1 })).toBe('1-{b}');
  });
  it('passes through non-strings', () => {
    expect(interpolate(42)).toBe(42);
  });
});

describe('resolveKey', () => {
  it('resolves dotted keys', () => {
    expect(resolveKey(T.en, 'a.b')).toBe('Hello {name}');
  });
  it('returns undefined for missing paths or bad input', () => {
    expect(resolveKey(T.en, 'a.x')).toBeUndefined();
    expect(resolveKey(T.en, 'a.b.c')).toBeUndefined();
    expect(resolveKey(null, 'a')).toBeUndefined();
    expect(resolveKey(T.en, 123)).toBeUndefined();
  });
});

describe('translate', () => {
  it('translates with interpolation', () => {
    expect(translate(T, 'fr', 'a.b', { name: 'Léa' })).toBe('Bonjour Léa');
  });
  it('falls back to the fallback language when key missing', () => {
    expect(translate(T, 'fr', 'onlyEn')).toBe('EN only');
  });
  it('returns the key itself when missing everywhere', () => {
    expect(translate(T, 'fr', 'nope.here')).toBe('nope.here');
  });
  it('does not fall back when fallback equals lang', () => {
    expect(translate(T, 'en', 'missing', {}, 'en')).toBe('missing');
  });
  it('tolerates an empty translations map', () => {
    expect(translate(undefined, 'fr', 'x')).toBe('x');
  });
});

describe('makeTranslator', () => {
  it('binds a language', () => {
    const t = makeTranslator(T, 'fr');
    expect(t('flat')).toBe('Plat FR');
    expect(t('a.b', { name: 'Max' })).toBe('Bonjour Max');
  });
});
