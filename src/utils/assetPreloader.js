/**
 * assetPreloader — preload images and report progress (0–100%).
 *
 * Used by the startup loading screen so the game can show a real percentage and
 * only reveal the menu once the heavy theme/background art is decoded (no more
 * "did I press the right button?" blank wait).
 *
 * Pure & injectable: the image loader is a parameter, so this is unit-tested
 * without a browser. A failed/missing image counts as "done" (never hangs).
 */

/** Default browser image loader: resolves on load OR error (so we never hang). */
export const browserImageLoader = (src) =>
  new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve({ src, ok: false });
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ src, ok: true });
    img.onerror = () => resolve({ src, ok: false });
    img.src = src;
  });

/** Clamp + round a 0..1 ratio into a 0..100 integer percentage. */
export const toPercent = (loaded, total) => {
  if (!total || total <= 0) return 100;
  const pct = Math.round((loaded / total) * 100);
  return Math.max(0, Math.min(100, pct));
};

/**
 * Preload a list of image URLs.
 *
 * @param urls     array of image URLs (falsy/duplicate entries are ignored)
 * @param options  { onProgress(loaded,total,percent), loadImage }
 * @returns Promise<{ total, loaded, failed: string[] }>
 */
export const preloadImages = (urls = [], { onProgress, loadImage = browserImageLoader } = {}) => {
  const unique = [...new Set((urls || []).filter(Boolean))];
  const total = unique.length;
  let loaded = 0;
  const failed = [];

  if (total === 0) {
    if (onProgress) onProgress(0, 0, 100);
    return Promise.resolve({ total: 0, loaded: 0, failed });
  }

  if (onProgress) onProgress(0, total, 0);

  return Promise.all(
    unique.map((src) =>
      Promise.resolve(loadImage(src)).then((result) => {
        loaded += 1;
        if (result && result.ok === false) failed.push(src);
        if (onProgress) onProgress(loaded, total, toPercent(loaded, total));
      }),
    ),
  ).then(() => ({ total, loaded, failed }));
};
