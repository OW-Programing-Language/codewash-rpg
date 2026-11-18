import { describe, it, expect, vi } from 'vitest';
import { preloadImages, toPercent, browserImageLoader } from './assetPreloader';

describe('toPercent', () => {
  it('maps loaded/total to a clamped integer percentage', () => {
    expect(toPercent(0, 4)).toBe(0);
    expect(toPercent(1, 4)).toBe(25);
    expect(toPercent(4, 4)).toBe(100);
    expect(toPercent(5, 4)).toBe(100); // clamped
  });
  it('returns 100 when there is nothing to load', () => {
    expect(toPercent(0, 0)).toBe(100);
  });
});

describe('preloadImages', () => {
  it('reports 100% immediately for an empty list', async () => {
    const onProgress = vi.fn();
    const res = await preloadImages([], { onProgress });
    expect(res).toEqual({ total: 0, loaded: 0, failed: [] });
    expect(onProgress).toHaveBeenCalledWith(0, 0, 100);
  });

  it('dedupes and ignores falsy urls', async () => {
    const loadImage = vi.fn((src) => Promise.resolve({ src, ok: true }));
    const res = await preloadImages(['a.png', 'a.png', '', null, 'b.png'], { loadImage });
    expect(res.total).toBe(2);
    expect(loadImage).toHaveBeenCalledTimes(2);
  });

  it('reports monotonic progress ending at 100%', async () => {
    const percents = [];
    const loadImage = (src) => Promise.resolve({ src, ok: true });
    await preloadImages(['a', 'b', 'c', 'd'], {
      loadImage,
      onProgress: (_l, _t, pct) => percents.push(pct),
    });
    expect(percents[0]).toBe(0);
    expect(percents[percents.length - 1]).toBe(100);
    // non-decreasing
    for (let i = 1; i < percents.length; i++) {
      expect(percents[i]).toBeGreaterThanOrEqual(percents[i - 1]);
    }
  });

  it('collects failures but still resolves (never hangs)', async () => {
    const loadImage = (src) => Promise.resolve({ src, ok: src !== 'bad.png' });
    const res = await preloadImages(['ok.png', 'bad.png'], { loadImage });
    expect(res.loaded).toBe(2);
    expect(res.failed).toEqual(['bad.png']);
  });
});

describe('browserImageLoader', () => {
  it('resolves ok:false when Image is unavailable (node env)', async () => {
    const result = await browserImageLoader('x.png');
    expect(result).toEqual({ src: 'x.png', ok: false });
  });
});
