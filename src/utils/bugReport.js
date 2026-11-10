/**
 * bugReport — build, validate and send a complete bug report.
 *
 * Design (see docs/adr/0002-bug-reporting.md):
 *  - The report destination (an HTTP webhook endpoint) and a human contact email
 *    are CONFIGURABLE, never hardcoded. Stored in localStorage.
 *  - `buildBugReport` is a pure function → trivially unit-testable.
 *  - `sendBugReport` takes an injectable `transport`, so tests assert the exact
 *    payload and simulate "received / not received" without any network.
 */

import { getErrorLogs } from './errorLog';

export const BUG_REPORT_CONFIG_KEY = 'bugReportConfig_v1';

/** localStorage keys that make up a game save, bundled as "game files". */
const SAVE_KEY_PREFIXES = ['heroSkills', 'heroProfileNames', 'heroParentStatus', 'currentProfile', 'heroStats'];

const safeStorage = (storage) =>
  storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);

/** Load the report config { endpoint, contactEmail }. Defaults are empty. */
export const loadBugReportConfig = (storage) => {
  const s = safeStorage(storage);
  const fallback = { endpoint: '', contactEmail: '' };
  if (!s) return fallback;
  try {
    const raw = s.getItem(BUG_REPORT_CONFIG_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      endpoint: typeof parsed.endpoint === 'string' ? parsed.endpoint : '',
      contactEmail: typeof parsed.contactEmail === 'string' ? parsed.contactEmail : '',
    };
  } catch {
    return fallback;
  }
};

/** Persist the report config. Returns the normalized config. */
export const saveBugReportConfig = (config, storage) => {
  const s = safeStorage(storage);
  const normalized = {
    endpoint: (config?.endpoint ?? '').trim(),
    contactEmail: (config?.contactEmail ?? '').trim(),
  };
  if (s) s.setItem(BUG_REPORT_CONFIG_KEY, JSON.stringify(normalized));
  return normalized;
};

/** Collect the game save data (the "game files") from storage. */
export const collectSaveData = (storage) => {
  const s = safeStorage(storage);
  if (!s) return {};
  const out = {};
  const length = typeof s.length === 'number' ? s.length : 0;
  for (let i = 0; i < length; i++) {
    const key = s.key(i);
    if (key && SAVE_KEY_PREFIXES.some((p) => key.startsWith(p))) {
      out[key] = s.getItem(key);
    }
  }
  return out;
};

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Build a structured, serializable bug report.
 * Pure: every environment value can be injected (meta) for deterministic tests.
 */
export const buildBugReport = ({
  description,
  reporterEmail = '',
  attachments = [],
  includeLogs = true,
  includeSaveData = true,
  logs,
  saveData,
  meta = {},
} = {}) => {
  const now = meta.now ?? new Date().toISOString();
  return {
    description: (description ?? '').trim(),
    reporterEmail: (reporterEmail ?? '').trim(),
    attachments: attachments.map((a) => ({
      name: a?.name ?? 'attachment',
      type: a?.type ?? 'application/octet-stream',
      dataUrl: a?.dataUrl ?? null,
    })),
    logs: includeLogs ? (logs ?? getErrorLogs()) : [],
    saveData: includeSaveData ? (saveData ?? {}) : {},
    meta: {
      createdAt: now,
      appVersion: meta.appVersion ?? 'unknown',
      userAgent: meta.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'),
      url: meta.url ?? (typeof location !== 'undefined' ? location.href : 'unknown'),
    },
  };
};

/** Validate a report before sending. Returns { valid, errors }. */
export const validateBugReport = (report) => {
  const errors = [];
  if (!isNonEmptyString(report?.description)) {
    errors.push('A description is required.');
  }
  if (report?.reporterEmail && !EMAIL_RE.test(report.reporterEmail)) {
    errors.push('The reporter email is not a valid address.');
  }
  return { valid: errors.length === 0, errors };
};

/** Default transport: POST the report as JSON to the endpoint via fetch. */
export const fetchTransport = async (endpoint, report, fetchImpl) => {
  const f = fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : null);
  if (!f) throw new Error('No fetch implementation available.');
  const res = await f(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
};

/**
 * Send a bug report.
 *
 * @param report   output of buildBugReport
 * @param options  { endpoint, transport }
 *   - endpoint: destination URL (defaults to the configured one)
 *   - transport: async (endpoint, report) => { ok, status, body }
 *                injectable so delivery can be tested without a network.
 * @returns { ok, ticketId, status, error }
 *
 * "Received?" check: a report counts as delivered only when the transport
 * reports `ok` (HTTP 2xx). The ticketId comes from the server response when
 * provided, otherwise a local id is generated so the user has a reference.
 */
export const sendBugReport = async (report, { endpoint, transport } = {}) => {
  const validation = validateBugReport(report);
  if (!validation.valid) {
    return { ok: false, error: validation.errors.join(' '), status: 0, ticketId: null };
  }

  const target = endpoint ?? loadBugReportConfig().endpoint;
  if (!isNonEmptyString(target)) {
    return {
      ok: false,
      error: 'No bug-report endpoint is configured.',
      status: 0,
      ticketId: null,
    };
  }

  const send = transport ?? ((ep, r) => fetchTransport(ep, r));
  try {
    const result = await send(target, report);
    if (!result?.ok) {
      return {
        ok: false,
        error: `Delivery failed (status ${result?.status ?? 'unknown'}).`,
        status: result?.status ?? 0,
        ticketId: null,
      };
    }
    const ticketId =
      result.body?.id ?? result.body?.ticketId ?? `local-${Date.now().toString(36)}`;
    return { ok: true, ticketId, status: result.status ?? 200, error: null };
  } catch (err) {
    return { ok: false, error: err?.message ?? 'Network error.', status: 0, ticketId: null };
  }
};

/** Read a File/Blob as a data URL (for screenshot attachments). Browser only. */
export const fileToAttachment = (file, FileReaderImpl) =>
  new Promise((resolve, reject) => {
    const Impl = FileReaderImpl ?? (typeof FileReader !== 'undefined' ? FileReader : null);
    if (!Impl) {
      reject(new Error('FileReader is not available.'));
      return;
    }
    const reader = new Impl();
    reader.onload = () =>
      resolve({ name: file.name, type: file.type, dataUrl: reader.result });
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
