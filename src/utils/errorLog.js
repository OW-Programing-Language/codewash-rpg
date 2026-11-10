/**
 * errorLog — a tiny in-memory ring buffer of runtime errors.
 *
 * Why: a bug report is far more useful with the last few errors attached.
 * We keep this an isolated I/O boundary (see docs/DEBT.md DEBT-03) so it can be
 * unit-tested without a real browser: the capture target is injectable.
 */

const DEFAULT_CAPACITY = 50;

let buffer = [];
let capacity = DEFAULT_CAPACITY;

/** Record one error entry (kept at most `capacity`, newest last). */
export const recordError = (entry) => {
  // Only read fields off real objects: a string entry has String.prototype.at,
  // which would otherwise leak a function into `at`.
  const obj = entry && typeof entry === 'object' ? entry : {};
  const normalized = {
    message: String(obj.message ?? entry ?? 'Unknown error'),
    source: obj.source ?? null,
    stack: obj.stack ?? null,
    at: obj.at ?? new Date().toISOString(),
  };
  buffer.push(normalized);
  if (buffer.length > capacity) {
    buffer = buffer.slice(buffer.length - capacity);
  }
  return normalized;
};

/** Return a copy of the current error log (never the live array). */
export const getErrorLogs = () => buffer.slice();

/** Clear the buffer (e.g. after a report is sent). */
export const clearErrorLogs = () => {
  buffer = [];
};

/** Change the ring-buffer capacity (mostly for tests). */
export const setErrorLogCapacity = (n) => {
  capacity = Math.max(1, Math.floor(n));
  if (buffer.length > capacity) {
    buffer = buffer.slice(buffer.length - capacity);
  }
};

/**
 * Hook global error listeners on `target` (default: window).
 * Returns an uninstall function. Safe to call with no window (returns no-op).
 */
export const installErrorCapture = (target = typeof window !== 'undefined' ? window : undefined) => {
  if (!target || typeof target.addEventListener !== 'function') {
    return () => {};
  }

  const onError = (event) => {
    recordError({
      message: event?.message ?? 'window error',
      source: event?.filename ?? null,
      stack: event?.error?.stack ?? null,
    });
  };

  const onRejection = (event) => {
    const reason = event?.reason;
    recordError({
      message: reason?.message ?? String(reason ?? 'unhandled rejection'),
      source: 'unhandledrejection',
      stack: reason?.stack ?? null,
    });
  };

  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);

  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
  };
};
