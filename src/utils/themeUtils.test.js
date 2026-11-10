import { describe, it, expect } from 'vitest';
import {
  BASE_THEME_ID,
  resolveTheme,
  resolveMobImage,
  resolveThemeBgm,
  THEME_BGM,
} from './themeUtils';

const CONFIG = {
  minecraft: {
    name: 'Minecraft',
    style: { backgroundImage: 'mc.png', backgroundSize: 'cover' },
    assets: { logo: 'mc_logo.png', cardBack: 'mc_card.jpg', mobs: { Zombie: 'mc/zombie.png' } },
    skills: { math: { name: 'Math' }, reading: { name: 'Reading' } },
  },
  scifi: {
    name: 'Sci-Fi',
    style: { backgroundImage: 'scifi.png' },
    assets: { logo: 'scifi_logo.png' }, // no mobs, no cardBack → inherit
    skills: { math: { name: 'Engineering' } }, // reading inherited
  },
};

const MAPS = {
  hostile: { Zombie: 'base/zombie.png', Creeper: 'base/creeper.png' },
  boss: { Wither: 'base/wither.png' },
  miniboss: { Ravager: 'base/ravager.png' },
  chest: { Chest: 'base/chest.png' },
  memoryIcon: 'icon/memory.png',
  fallback: 'base/fallback.png',
};

describe('resolveTheme', () => {
  it('returns the base theme untouched for the base id', () => {
    const t = resolveTheme('minecraft', CONFIG);
    expect(t.name).toBe('Minecraft');
    expect(t.assets.mobs.Zombie).toBe('mc/zombie.png');
  });

  it('inherits missing keys from the base theme', () => {
    const t = resolveTheme('scifi', CONFIG);
    expect(t.name).toBe('Sci-Fi');
    expect(t.style.backgroundImage).toBe('scifi.png'); // overridden
    expect(t.style.backgroundSize).toBe('cover'); // inherited from base
    expect(t.assets.logo).toBe('scifi_logo.png'); // overridden
    expect(t.assets.cardBack).toBe('mc_card.jpg'); // inherited
    expect(t.assets.mobs.Zombie).toBe('mc/zombie.png'); // inherited mob art
    expect(t.skills.math.name).toBe('Engineering'); // overridden
    expect(t.skills.reading.name).toBe('Reading'); // inherited
  });

  it('falls back to the base theme for an unknown id', () => {
    const t = resolveTheme('does-not-exist', CONFIG);
    expect(t.name).toBe('Minecraft');
  });

  it('never throws on an empty config (defensive defaults)', () => {
    const t = resolveTheme('whatever', {});
    expect(t).toEqual({ style: {}, assets: { mobs: {} }, skills: {} });
  });
});

describe('resolveMobImage — theme wins first', () => {
  const themeWithOwnMob = { assets: { mobs: { Zombie: 'theme/zombie.png' } } };

  it('prefers the theme asset over the global map', () => {
    const { src } = resolveMobImage('math', 'Zombie', themeWithOwnMob, MAPS);
    expect(src).toBe('theme/zombie.png');
  });

  it('falls back to the global map when the theme lacks the mob', () => {
    const { src, displayName } = resolveMobImage('math', 'Creeper', { assets: { mobs: {} } }, MAPS);
    expect(src).toBe('base/creeper.png');
    expect(displayName).toBe('Creeper');
  });

  it('resolves boss and miniboss via the global maps', () => {
    expect(resolveMobImage('reading', 'Wither', {}, MAPS).src).toBe('base/wither.png');
    expect(resolveMobImage('patterns', 'Ravager', {}, MAPS).src).toBe('base/ravager.png');
  });

  it('memory skill uses the fixed icon', () => {
    expect(resolveMobImage('memory', 'Anything', {}, MAPS).src).toBe('icon/memory.png');
  });

  it('cleaning skill resolves chest art with theme priority and fallback', () => {
    expect(resolveMobImage('cleaning', 'Chest', {}, MAPS).src).toBe('base/chest.png');
    expect(resolveMobImage('cleaning', 'Unknown', {}, MAPS).src).toBe('base/fallback.png');
  });

  it('unknown combat mob degrades to Zombie, then fallback', () => {
    const { src, displayName } = resolveMobImage('math', 'Nonexistent', {}, MAPS);
    expect(displayName).toBe('Zombie');
    expect(src).toBe('base/zombie.png');
  });

  it('unknown mob with no Zombie anywhere hits the final fallback', () => {
    const { src } = resolveMobImage('math', 'Nope', {}, { ...MAPS, hostile: {} });
    expect(src).toBe('base/fallback.png');
  });
});

describe('resolveThemeBgm', () => {
  it('maps a theme to its track paths', () => {
    expect(resolveThemeBgm('scifi')).toEqual([
      'assets/sounds/bgm/piano1.wav',
      'assets/sounds/bgm/piano2.wav',
      'assets/sounds/bgm/piano3.wav',
    ]);
  });

  it('falls back to the base theme tracks for an unknown theme', () => {
    expect(resolveThemeBgm('unknown')).toEqual(resolveThemeBgm(BASE_THEME_ID));
  });

  it('every configured theme maps only to known track names', () => {
    const known = new Set(['calm1', 'calm2', 'calm3', 'piano1', 'piano2', 'piano3']);
    for (const names of Object.values(THEME_BGM)) {
      for (const n of names) expect(known.has(n)).toBe(true);
    }
  });
});
