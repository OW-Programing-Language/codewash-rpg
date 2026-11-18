/**
 * perf — a tiny startup/latency tracker.
 *
 * Lets us put real numbers behind the "Improve performance" work: mark named
 * moments (app-mount, assets-loaded, menu-ready) and measure the spans between
 * them. Injectable clock → deterministic unit tests. See docs/PERFORMANCE.md.
 */

const defaultNow = () =>
  typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

/** Create an isolated tracker (used in tests). The app uses the shared one below. */
export const createPerfTracker = ({ now = defaultNow } = {}) => {
  const marks = new Map();

  const mark = (name) => {
    const t = now();
    marks.set(name, t);
    return t;
  };

  /** Duration in ms between two marks (or from a mark to "now" if `to` omitted). */
  const measure = (from, to) => {
    if (!marks.has(from)) return null;
    const end = to === undefined ? now() : marks.get(to);
    if (end === undefined) return null;
    return end - marks.get(from);
  };

  const getMark = (name) => (marks.has(name) ? marks.get(name) : null);
  const getMarks = () => Object.fromEntries(marks);
  const reset = () => marks.clear();

  return { mark, measure, getMark, getMarks, reset };
};

/** Shared tracker for the running app. */
export const perf = createPerfTracker();
