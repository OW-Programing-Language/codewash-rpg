import { describe, it, expect } from 'vitest';
import { createPerfTracker } from './perf';

/** Deterministic clock that advances by 1ms each read unless scripted. */
function scriptedClock(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('createPerfTracker', () => {
  it('marks and measures spans between marks', () => {
    const now = scriptedClock([100, 350]);
    const p = createPerfTracker({ now });
    p.mark('start'); // 100
    p.mark('ready'); // 350
    expect(p.measure('start', 'ready')).toBe(250);
  });

  it('measures from a mark to "now" when `to` is omitted', () => {
    const now = scriptedClock([10, 60]);
    const p = createPerfTracker({ now });
    p.mark('a'); // 10
    expect(p.measure('a')).toBe(50); // now() -> 60
  });

  it('returns null for unknown marks', () => {
    const p = createPerfTracker({ now: () => 0 });
    expect(p.measure('nope')).toBeNull();
    expect(p.measure('nope', 'alsonope')).toBeNull();
    expect(p.getMark('nope')).toBeNull();
  });

  it('exposes and resets marks', () => {
    const now = scriptedClock([1, 2]);
    const p = createPerfTracker({ now });
    p.mark('x');
    p.mark('y');
    expect(p.getMarks()).toEqual({ x: 1, y: 2 });
    expect(p.getMark('x')).toBe(1);
    p.reset();
    expect(p.getMarks()).toEqual({});
  });
});
