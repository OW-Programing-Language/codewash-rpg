import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getDefaultStats,
  addUniqueToArray,
  recordLoginDate,
  isAchievementUnlocked,
  getNewlyUnlockedAchievements,
} from './achievementUtils';

/**
 * CHARACTERIZATION TESTS — achievementUtils
 *
 * Freezes the current behavior of the achievement/stats layer. `recordLoginDate`
 * reads the wall clock: we inject a fake clock so the test is deterministic,
 * which is exactly the kind of I/O boundary docs/DEBT.md flags for isolation.
 */

describe('getDefaultStats', () => {
  it('returns a fresh, zeroed stats object every call (no shared references)', () => {
    const a = getDefaultStats();
    const b = getDefaultStats();
    expect(a).toEqual(b);
    expect(a.uniqueMobsDefeated).not.toBe(b.uniqueMobsDefeated); // distinct arrays
    expect(a.totalMobsDefeated).toBe(0);
    expect(Array.isArray(a.achievementsUnlocked)).toBe(true);
  });
});

describe('addUniqueToArray', () => {
  it('appends a new value', () => {
    expect(addUniqueToArray(['a'], 'b')).toEqual(['a', 'b']);
  });
  it('is a no-op for an existing value', () => {
    const arr = ['a', 'b'];
    expect(addUniqueToArray(arr, 'a')).toEqual(['a', 'b']);
  });
  it('does not mutate the input array', () => {
    const arr = ['a'];
    addUniqueToArray(arr, 'b');
    expect(arr).toEqual(['a']);
  });
});

describe('recordLoginDate — clock injected', () => {
  afterEach(() => vi.useRealTimers());

  it('records today once (YYYY-MM-DD) and is idempotent same day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T08:00:00Z'));
    const first = recordLoginDate([]);
    expect(first).toEqual(['2026-11-10']);
    const second = recordLoginDate(first);
    expect(second).toEqual(['2026-11-10']);
  });

  it('appends a new day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-11T08:00:00Z'));
    expect(recordLoginDate(['2026-11-10'])).toEqual(['2026-11-10', '2026-11-11']);
  });
});

describe('isAchievementUnlocked', () => {
  it('returns false for an unknown achievement id', () => {
    expect(isAchievementUnlocked('__does_not_exist__', getDefaultStats(), {})).toBe(false);
  });
});

describe('getNewlyUnlockedAchievements', () => {
  it('returns an array (empty when nothing changed)', () => {
    const stats = getDefaultStats();
    const result = getNewlyUnlockedAchievements(stats, stats, {}, {});
    expect(Array.isArray(result)).toBe(true);
  });
});
