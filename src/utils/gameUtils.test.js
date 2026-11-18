import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getEncounterType,
  getDifficultyMultiplier,
  calculateDamage,
  calculateMobHealth,
  getExpectedDifficulty,
  calculateXPReward,
  calculateXPToLevel,
  generateMathProblem,
  getReadingWord,
  getWordForDifficulty,
  getRandomMob,
  getRandomFriendlyMob,
  getRandomMiniboss,
  getRandomBoss,
} from './gameUtils';

/**
 * CHARACTERIZATION TESTS — gameUtils
 *
 * These tests freeze the *current* behavior of the RPG progression engine as
 * received (vibe-coded). They are NOT a specification of what the numbers
 * "should" be: they are a safety net so that any future refactoring that
 * changes a value fails loudly. See docs/DEBT.md and docs/TESTING.md.
 */

describe('getDifficultyMultiplier — 3^(difficulty-1)', () => {
  it.each([
    [1, 1],
    [2, 3],
    [3, 9],
    [4, 27],
    [5, 81],
    [6, 243],
    [7, 729],
  ])('difficulty %i → %i', (difficulty, expected) => {
    expect(getDifficultyMultiplier(difficulty)).toBe(expected);
  });
});

describe('calculateDamage — BASE_DAMAGE(12) × multiplier, level-independent', () => {
  it('ignores player level', () => {
    expect(calculateDamage(1, 3)).toBe(calculateDamage(999, 3));
  });
  it.each([
    [1, 12],
    [2, 36],
    [3, 108],
    [7, 8748],
  ])('difficulty %i → %i damage', (difficulty, expected) => {
    expect(calculateDamage(1, difficulty)).toBe(expected);
  });
});

describe('calculateMobHealth — BASE_MOB_HEALTH(60) × multiplier (5-hit battles)', () => {
  it.each([
    [1, 60],
    [2, 180],
    [3, 540],
  ])('difficulty %i → %i HP', (difficulty, expected) => {
    expect(calculateMobHealth(difficulty)).toBe(expected);
  });

  it('keeps the "5 hits to kill" invariant at every difficulty', () => {
    for (let d = 1; d <= 7; d++) {
      expect(calculateMobHealth(d) / calculateDamage(1, d)).toBe(5);
    }
  });
});

describe('getExpectedDifficulty — unlocks every 20 levels, capped at 7', () => {
  it.each([
    [1, 1],
    [20, 1],
    [21, 2],
    [40, 2],
    [41, 3],
    [200, 7],
    [9999, 7],
  ])('level %i → expected difficulty %i', (level, expected) => {
    expect(getExpectedDifficulty(level)).toBe(expected);
  });
});

describe('getEncounterType — level cycle (10=miniboss, 20=boss)', () => {
  it.each([
    [1, 'hostile'],
    [9, 'hostile'],
    [10, 'miniboss'],
    [11, 'hostile'],
    [20, 'boss'],
    [21, 'hostile'],
    [30, 'miniboss'],
    [40, 'boss'],
  ])('level %i → %s', (level, expected) => {
    expect(getEncounterType(level)).toBe(expected);
  });
});

describe('calculateXPReward', () => {
  it('backward-compat (no playerLevel) → multiplier × 100', () => {
    expect(calculateXPReward(1)).toBe(100);
    expect(calculateXPReward(3)).toBe(900);
  });

  it('full reward at or above expected difficulty (level 1)', () => {
    expect(calculateXPReward(1, 1)).toBe(100);
  });

  it('applies a penalty below expected difficulty', () => {
    // At level 21, expected difficulty is 2; playing at 1 is penalized.
    const full = calculateXPReward(2, 21);
    const penalized = calculateXPReward(1, 21);
    expect(penalized).toBeLessThan(full);
  });
});

describe('calculateXPToLevel', () => {
  it('backward-compat (no playerLevel) → 100 × multiplier', () => {
    expect(calculateXPToLevel(1)).toBe(100);
    expect(calculateXPToLevel(2)).toBe(300);
  });

  it('level 1 at difficulty 1 requires 100 XP', () => {
    expect(calculateXPToLevel(1, 1)).toBe(100);
  });
});

describe('generateMathProblem — structural invariants for every difficulty', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([1, 2, 3, 4, 5, 6, 7])('difficulty %i returns a well-formed problem', (d) => {
    const p = generateMathProblem(d);
    expect(p.type).toBe('math');
    expect(typeof p.question).toBe('string');
    expect(p.question).toContain('= ?');
    expect(typeof p.answer).toBe('string');
    expect(p.answer.length).toBeGreaterThan(0);
  });

  it('difficulty 1 produces an arithmetically correct addition (random pinned)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const p = generateMathProblem(1);
    const match = p.question.match(/^(\d+)\s*\+\s*(\d+) = \?$/);
    expect(match).not.toBeNull();
    const [, a, b] = match;
    expect(p.answer).toBe(String(Number(a) + Number(b)));
  });

  it('difficulty 7 is flagged as nightmare', () => {
    expect(generateMathProblem(7).isNightmare).toBe(true);
  });
});

describe('word selection helpers return usable content', () => {
  it('getReadingWord returns a non-empty string for every difficulty', () => {
    for (let d = 1; d <= 7; d++) {
      const w = getReadingWord(d);
      expect(typeof w).toBe('string');
      expect(w.length).toBeGreaterThan(0);
    }
  });

  it('getWordForDifficulty returns an uppercased word with an image', () => {
    const item = getWordForDifficulty(1);
    expect(item.word).toBe(item.word.toUpperCase());
    expect(item).toHaveProperty('displayName');
    expect(item).toHaveProperty('image');
  });
});

describe('random mob getters always return a valid key (never undefined)', () => {
  it('each getter returns a non-empty string', () => {
    expect(typeof getRandomMob(null)).toBe('string');
    expect(getRandomMob(null).length).toBeGreaterThan(0);
    expect(typeof getRandomFriendlyMob()).toBe('string');
    expect(typeof getRandomMiniboss()).toBe('string');
    expect(typeof getRandomBoss()).toBe('string');
  });
});
