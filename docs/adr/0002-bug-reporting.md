# ADR 0002 — Bug reporting: configurable webhook + injectable transport

- **Status:** accepted
- **Date:** 2026-11-10
- **Context:** CodeWash feature mission "Bug Reporting" (DEBT-08).

## Context

The main menu had a Bug button opening a modal that only displayed "Whoa… that
sucks". We must let users send a **complete** bug report (description,
screenshots, game files, error logs), let the **contact be configured**, and be
able to **test that the report was received** — all with full unit coverage for
new code.

The app runs both in the browser (dev) and inside Electron (desktop). We have no
backend of our own.

## Decision

1. **Separate domain from I/O** (DEBT-02/03). All logic lives in
   `src/utils/bugReport.js` and `src/utils/errorLog.js` as pure, injectable
   functions. The React modal only holds form state.
2. **Transport is HTTP POST to a configurable webhook endpoint.** The endpoint
   URL and a human contact email are stored in `localStorage`
   (`bugReportConfig_v1`) and edited in the modal — **nothing is hardcoded**
   (the subject forbids hardcoding in this legacy project). A webhook (e.g.
   Formspree, a Discord/Slack webhook, or any HTTP inbox) needs no server from us.
3. **Delivery is verifiable.** `sendBugReport(report, { endpoint, transport })`
   takes an **injectable transport**. In tests we pass a fake transport and
   assert the exact payload and simulate success/failure — so "was it received?"
   is a unit-testable contract (`ok` + `ticketId`). For a live check, point the
   endpoint at an inbox like `https://webhook.site` and observe the JSON.
4. **Error logs** are captured by a small ring buffer (`errorLog.js`) installed
   at startup in `main.jsx`, attached to the report on demand.

## Consequences

- New code is 100% line-covered; the feature works without any backend we own.
- Reports are plain JSON (screenshots as base64 data URLs), so any webhook can
  consume them.
- The configuration step is a deliberate trade-off: the person deploying the
  game sets the endpoint once. This is documented in `docs/FEATURES.md`.
- Large screenshots inflate the JSON payload; acceptable for a kids' game with
  occasional reports. If it ever matters, switch to `multipart/form-data` behind
  the same `transport` seam — no domain change.

## Alternatives considered

- **`mailto:` link:** cannot reliably attach files or auto-collect logs, and is
  impossible to test for receipt. Rejected.
- **Hardcoded email/endpoint:** forbidden by the subject and not configurable.
  Rejected.
- **Electron main-process SMTP (nodemailer):** would not work in the browser dev
  build and needs mail credentials. Rejected for now; the transport seam leaves
  the door open.
