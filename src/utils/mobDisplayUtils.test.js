import { describe, it, expect, afterEach, vi } from 'vitest';
import { getRandomAura, generateMobWithAura, AURA_ADJECTIVES } from './mobDisplayUtils';

/**
 * CHARACTERIZATION TESTS — mobDisplayUtils
 * Freezes the aura set and the "adjective + mob name" display convention.
 */

const AURA_TYPES = ['rainbow', 'frost', 'shadow', 'lava', 'gradient', 'sparkle', 'plasma', 'nature'];

describe('getRandomAura', () => {
  afterEach(() => vi.restoreAllMocks());

  it('always returns one of the known aura types', () => {
    for (let i = 0; i < 50; i++) {
      expect(AURA_TYPES).toContain(getRandomAura());
    }
  });

  it('first and last aura are reachable (boundary pinned)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(getRandomAura()).toBe('rainbow');
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(getRandomAura()).toBe('nature');
  });
});

describe('generateMobWithAura', () => {
  afterEach(() => vi.restoreAllMocks());

  it('prefixes the mob name with the aura adjective when one exists', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // → rainbow → "Prismatic"
    const result = generateMobWithAura('Zombie', '/zombie.png');
    expect(result).toEqual({
      mobName: 'Zombie',
      mobSrc: '/zombie.png',
      aura: 'rainbow',
      displayName: 'Prismatic Zombie',
    });
  });

  it('every adjective maps to a known aura type', () => {
    for (const aura of Object.keys(AURA_ADJECTIVES)) {
      expect(AURA_TYPES).toContain(aura);
    }
  });
});
