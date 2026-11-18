import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordError,
  getErrorLogs,
  clearErrorLogs,
  setErrorLogCapacity,
  installErrorCapture,
} from './errorLog';

/** Minimal EventTarget-like double. */
function makeTarget() {
  const listeners = {};
  return {
    addEventListener: (type, cb) => {
      (listeners[type] = listeners[type] || []).push(cb);
    },
    removeEventListener: (type, cb) => {
      listeners[type] = (listeners[type] || []).filter((l) => l !== cb);
    },
    dispatch: (type, event) => (listeners[type] || []).forEach((l) => l(event)),
    count: (type) => (listeners[type] || []).length,
  };
}

describe('errorLog', () => {
  beforeEach(() => {
    clearErrorLogs();
    setErrorLogCapacity(50);
  });

  it('records normalized entries with a timestamp', () => {
    const entry = recordError({ message: 'boom', source: 'a.js', stack: 'S', at: '2026-01-01T00:00:00Z' });
    expect(entry).toEqual({ message: 'boom', source: 'a.js', stack: 'S', at: '2026-01-01T00:00:00Z' });
    expect(getErrorLogs()).toHaveLength(1);
  });

  it('coerces a bare string/unknown into a message and fills defaults', () => {
    recordError('plain');
    recordError(undefined);
    const logs = getErrorLogs();
    expect(logs[0].message).toBe('plain');
    expect(logs[1].message).toBe('Unknown error');
    expect(typeof logs[0].at).toBe('string');
  });

  it('getErrorLogs returns a copy, not the live buffer', () => {
    recordError('x');
    const a = getErrorLogs();
    a.push('mutation');
    expect(getErrorLogs()).toHaveLength(1);
  });

  it('respects capacity (keeps newest)', () => {
    setErrorLogCapacity(3);
    for (let i = 0; i < 5; i++) recordError(`e${i}`);
    const logs = getErrorLogs();
    expect(logs.map((l) => l.message)).toEqual(['e2', 'e3', 'e4']);
  });

  it('clearErrorLogs empties the buffer', () => {
    recordError('x');
    clearErrorLogs();
    expect(getErrorLogs()).toHaveLength(0);
  });

  describe('installErrorCapture', () => {
    it('returns a no-op when target has no addEventListener', () => {
      const uninstall = installErrorCapture(undefined);
      expect(typeof uninstall).toBe('function');
      expect(() => uninstall()).not.toThrow();
    });

    it('captures error and unhandledrejection events, and uninstalls', () => {
      const target = makeTarget();
      const uninstall = installErrorCapture(target);
      expect(target.count('error')).toBe(1);

      target.dispatch('error', { message: 'win err', filename: 'f.js', error: { stack: 'ST' } });
      target.dispatch('unhandledrejection', { reason: { message: 'rej', stack: 'RS' } });
      target.dispatch('unhandledrejection', { reason: 'stringy' });

      const logs = getErrorLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0]).toMatchObject({ message: 'win err', source: 'f.js', stack: 'ST' });
      expect(logs[1]).toMatchObject({ message: 'rej', source: 'unhandledrejection' });
      expect(logs[2].message).toBe('stringy');

      uninstall();
      expect(target.count('error')).toBe(0);
    });
  });
});
