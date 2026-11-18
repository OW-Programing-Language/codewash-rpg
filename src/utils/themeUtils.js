/**
 * themeUtils — pure theme resolution layer.
 *
 * Fixes the as-received theming bugs (see docs/DEBT.md DEBT-13):
 *  - themes could never override images (global Minecraft maps were checked
 *    *before* the theme), so "not all images change". Here the theme wins first.
 *  - themes with missing keys (empty `mobs`, absent logo/background) now inherit
 *    from a base theme instead of showing broken/placeholder assets.
 *  - music/sounds were not themed; `resolveThemeBgm` maps each theme to a track
 *    set so the soundtrack changes with the theme.
 *
 * Everything here is pure and injectable → unit-testable without React/DOM.
 */

import {
  THEME_CONFIG,
  BASE_ASSETS,
  HOSTILE_MOBS,
  BOSS_MOBS,
  MINIBOSS_MOBS,
  CHEST_BLOCKS,
} from '../constants/gameData';

export const BASE_THEME_ID = 'minecraft';
const BGM_DIR = 'assets/sounds/bgm';

/**
 * Resolve a theme by id, deep-merging it onto the base theme so any key the
 * theme omits is inherited (never missing). Unknown ids fall back to the base.
 */
export const resolveTheme = (themeId, config = THEME_CONFIG) => {
  const base = config[BASE_THEME_ID] || {};
  const theme = config[themeId] || base;
  const baseAssets = base.assets || {};
  const themeAssets = theme.assets || {};
  return {
    ...base,
    ...theme,
    style: { ...(base.style || {}), ...(theme.style || {}) },
    assets: {
      ...baseAssets,
      ...themeAssets,
      mobs: { ...(baseAssets.mobs || {}), ...(themeAssets.mobs || {}) },
    },
    skills: { ...(base.skills || {}), ...(theme.skills || {}) },
  };
};

/** Default image maps used by resolveMobImage (injectable for tests). */
export const DEFAULT_MOB_MAPS = {
  hostile: HOSTILE_MOBS,
  boss: BOSS_MOBS,
  miniboss: MINIBOSS_MOBS,
  chest: CHEST_BLOCKS,
  memoryIcon: 'assets/skills/farm_icon.png',
  fallback: (BASE_ASSETS.axolotls && BASE_ASSETS.axolotls.Pink) || 'assets/skills/farm_icon.png',
};

/**
 * Resolve the image + display name for a mob, THEME FIRST then global maps.
 *
 * @returns { src, displayName }
 */
export const resolveMobImage = (skillId, mobName, themeData, maps = DEFAULT_MOB_MAPS) => {
  const m = { ...DEFAULT_MOB_MAPS, ...maps };
  const themeMobs = (themeData && themeData.assets && themeData.assets.mobs) || {};

  if (skillId === 'memory') {
    return { src: m.memoryIcon, displayName: mobName };
  }

  if (skillId === 'cleaning') {
    const src = themeMobs[mobName] || m.chest[mobName] || m.fallback;
    return { src, displayName: mobName };
  }

  // Combat & patterns skills: let the theme override, then global maps.
  let src = themeMobs[mobName] || m.hostile[mobName] || m.boss[mobName] || m.miniboss[mobName];
  if (src) return { src, displayName: mobName };

  // Invalid/unknown mob name → safe default.
  const displayName = 'Zombie';
  src = themeMobs[displayName] || m.hostile[displayName] || m.fallback;
  return { src, displayName };
};

/**
 * Per-theme background music. Maps theme ids to existing BGM tracks so the
 * soundtrack changes with the theme without requiring new audio files.
 * Add a theme's entry here when you add a theme (optional — falls back to base).
 */
export const THEME_BGM = {
  minecraft: ['calm1', 'calm2', 'calm3'],
  spy: ['piano1', 'piano2'],
  kpop: ['piano3', 'calm3'],
  pokemon: ['calm1', 'piano1'],
  scifi: ['piano1', 'piano2', 'piano3'],
  fantasy: ['calm2', 'calm3', 'piano2'],
};

/** Resolve the ordered list of BGM track paths for a theme. */
export const resolveThemeBgm = (themeId, bgmMap = THEME_BGM) => {
  const names = bgmMap[themeId] || bgmMap[BASE_THEME_ID] || [];
  return names.map((n) => `${BGM_DIR}/${n}.wav`);
};
