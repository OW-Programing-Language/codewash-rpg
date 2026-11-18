import { describe, it, expect } from 'vitest';
import {
  BUG_REPORT_CONFIG_KEY,
  loadBugReportConfig,
  saveBugReportConfig,
  collectSaveData,
  buildBugReport,
  validateBugReport,
  sendBugReport,
  fetchTransport,
  fileToAttachment,
} from './bugReport';

/** In-memory localStorage double. */
function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    key: (i) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  };
}

const META = { now: '2026-11-10T12:00:00.000Z', appVersion: '1.0.0', userAgent: 'test-ua', url: 'app://menu' };

describe('config load/save', () => {
  it('returns empty defaults when nothing stored', () => {
    expect(loadBugReportConfig(makeStorage())).toEqual({ endpoint: '', contactEmail: '' });
  });

  it('round-trips and trims config', () => {
    const storage = makeStorage();
    const saved = saveBugReportConfig({ endpoint: '  https://hook.test/x  ', contactEmail: ' qa@team.io ' }, storage);
    expect(saved).toEqual({ endpoint: 'https://hook.test/x', contactEmail: 'qa@team.io' });
    expect(storage.getItem(BUG_REPORT_CONFIG_KEY)).toContain('hook.test');
    expect(loadBugReportConfig(storage)).toEqual(saved);
  });

  it('tolerates corrupt JSON and wrong types', () => {
    const storage = makeStorage({ [BUG_REPORT_CONFIG_KEY]: '{not json' });
    expect(loadBugReportConfig(storage)).toEqual({ endpoint: '', contactEmail: '' });
    const storage2 = makeStorage({ [BUG_REPORT_CONFIG_KEY]: JSON.stringify({ endpoint: 42 }) });
    expect(loadBugReportConfig(storage2)).toEqual({ endpoint: '', contactEmail: '' });
  });

  it('no storage available → defaults, save is a no-op that still normalizes', () => {
    expect(loadBugReportConfig(null)).toEqual({ endpoint: '', contactEmail: '' });
    expect(saveBugReportConfig({ endpoint: ' a ' }, null)).toEqual({ endpoint: 'a', contactEmail: '' });
  });
});

describe('collectSaveData', () => {
  it('collects only game-save keys', () => {
    const storage = makeStorage({
      heroSkills_v23_p1: '{"x":1}',
      heroProfileNames_v1: '{"1":"P"}',
      currentProfile_v1: '1',
      unrelated_key: 'nope',
    });
    const data = collectSaveData(storage);
    expect(Object.keys(data).sort()).toEqual(['currentProfile_v1', 'heroProfileNames_v1', 'heroSkills_v23_p1']);
    expect(data.unrelated_key).toBeUndefined();
  });

  it('returns {} when no storage', () => {
    expect(collectSaveData(null)).toEqual({});
  });
});

describe('buildBugReport', () => {
  it('builds a normalized, serializable report', () => {
    const report = buildBugReport({
      description: '  it crashed  ',
      reporterEmail: ' me@x.io ',
      attachments: [{ name: 'shot.png', type: 'image/png', dataUrl: 'data:...' }],
      logs: [{ message: 'e' }],
      saveData: { k: 'v' },
      meta: META,
    });
    expect(report.description).toBe('it crashed');
    expect(report.reporterEmail).toBe('me@x.io');
    expect(report.attachments[0]).toEqual({ name: 'shot.png', type: 'image/png', dataUrl: 'data:...' });
    expect(report.logs).toEqual([{ message: 'e' }]);
    expect(report.saveData).toEqual({ k: 'v' });
    expect(report.meta).toEqual({ createdAt: META.now, appVersion: '1.0.0', userAgent: 'test-ua', url: 'app://menu' });
    expect(() => JSON.stringify(report)).not.toThrow();
  });

  it('honors include toggles and attachment defaults', () => {
    const report = buildBugReport({
      description: 'x',
      attachments: [{}],
      includeLogs: false,
      includeSaveData: false,
      logs: [{ message: 'e' }],
      saveData: { k: 'v' },
      meta: META,
    });
    expect(report.logs).toEqual([]);
    expect(report.saveData).toEqual({});
    expect(report.attachments[0]).toEqual({ name: 'attachment', type: 'application/octet-stream', dataUrl: null });
  });

  it('works with no arguments', () => {
    const report = buildBugReport();
    expect(report.description).toBe('');
    expect(report.meta.appVersion).toBe('unknown');
  });
});

describe('validateBugReport', () => {
  it('requires a non-empty description', () => {
    expect(validateBugReport({ description: '' }).valid).toBe(false);
    expect(validateBugReport({ description: '   ' }).errors[0]).toMatch(/description/i);
    expect(validateBugReport({ description: 'ok' }).valid).toBe(true);
  });

  it('rejects an invalid reporter email but allows empty', () => {
    expect(validateBugReport({ description: 'ok', reporterEmail: 'bad' }).valid).toBe(false);
    expect(validateBugReport({ description: 'ok', reporterEmail: 'good@x.io' }).valid).toBe(true);
    expect(validateBugReport({ description: 'ok', reporterEmail: '' }).valid).toBe(true);
  });
});

describe('sendBugReport', () => {
  const okReport = { description: 'bug', reporterEmail: '' };

  it('fails validation before any transport call', async () => {
    let called = false;
    const transport = async () => {
      called = true;
      return { ok: true };
    };
    const res = await sendBugReport({ description: '' }, { endpoint: 'https://h', transport });
    expect(res.ok).toBe(false);
    expect(called).toBe(false);
  });

  it('fails when no endpoint is configured', async () => {
    const res = await sendBugReport(okReport, { endpoint: '', transport: async () => ({ ok: true }) });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/endpoint/i);
  });

  it('sends to the endpoint and returns the server ticket id', async () => {
    const seen = {};
    const transport = async (ep, r) => {
      seen.ep = ep;
      seen.r = r;
      return { ok: true, status: 201, body: { id: 'TICKET-7' } };
    };
    const res = await sendBugReport(okReport, { endpoint: 'https://hook.test/x', transport });
    expect(seen.ep).toBe('https://hook.test/x');
    expect(seen.r).toBe(okReport);
    expect(res).toEqual({ ok: true, ticketId: 'TICKET-7', status: 201, error: null });
  });

  it('generates a local ticket id when the server returns none', async () => {
    const res = await sendBugReport(okReport, { endpoint: 'https://h', transport: async () => ({ ok: true, status: 200, body: {} }) });
    expect(res.ok).toBe(true);
    expect(res.ticketId).toMatch(/^local-/);
  });

  it('reports delivery failure on a non-ok response', async () => {
    const res = await sendBugReport(okReport, { endpoint: 'https://h', transport: async () => ({ ok: false, status: 500 }) });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);
    expect(res.error).toMatch(/500/);
  });

  it('catches transport exceptions', async () => {
    const res = await sendBugReport(okReport, {
      endpoint: 'https://h',
      transport: async () => {
        throw new Error('network down');
      },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('network down');
  });
});

describe('fetchTransport', () => {
  it('POSTs JSON and parses the response body', async () => {
    let captured;
    const fakeFetch = async (url, opts) => {
      captured = { url, opts };
      return { ok: true, status: 200, json: async () => ({ id: 'X1' }) };
    };
    const result = await fetchTransport('https://h', { description: 'd' }, fakeFetch);
    expect(captured.url).toBe('https://h');
    expect(captured.opts.method).toBe('POST');
    expect(JSON.parse(captured.opts.body)).toEqual({ description: 'd' });
    expect(result).toEqual({ ok: true, status: 200, body: { id: 'X1' } });
  });

  it('tolerates a non-JSON response body', async () => {
    const fakeFetch = async () => ({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('no body');
      },
    });
    const result = await fetchTransport('https://h', {}, fakeFetch);
    expect(result).toEqual({ ok: true, status: 204, body: null });
  });

  it('throws when no fetch implementation is available', async () => {
    await expect(fetchTransport('https://h', {}, null)).rejects.toThrow(/fetch/i);
  });
});

describe('fileToAttachment', () => {
  it('resolves to a data-url attachment', async () => {
    class FakeReader {
      readAsDataURL() {
        this.result = 'data:image/png;base64,AAA';
        this.onload();
      }
    }
    const att = await fileToAttachment({ name: 'a.png', type: 'image/png' }, FakeReader);
    expect(att).toEqual({ name: 'a.png', type: 'image/png', dataUrl: 'data:image/png;base64,AAA' });
  });

  it('rejects on read error', async () => {
    class FailReader {
      readAsDataURL() {
        this.error = new Error('read fail');
        this.onerror();
      }
    }
    await expect(fileToAttachment({ name: 'a', type: 't' }, FailReader)).rejects.toThrow('read fail');
  });

  it('rejects when FileReader is unavailable', async () => {
    await expect(fileToAttachment({}, null)).rejects.toThrow(/FileReader/);
  });
});
