# Features guide

How to discover and use each feature we added. One section per CodeWash mission.

---

## Bug Reporting

**Where:** the red 🐞 button at the bottom-right of the main screen.

### For players
1. Click the Bug button.
2. Describe what happened (required).
3. Optionally: add your email, attach screenshot(s), and choose whether to
   include your game save files and recent error logs.
4. Click **Send report**. On success you get a confirmation with a **reference
   id**.

### For whoever runs the game (one-time setup)
The report destination is **not hardcoded** — you configure it once:

1. Open the Bug Report modal → **Configure report destination**.
2. Set:
   - **Report endpoint URL** — any HTTP endpoint that accepts a JSON `POST`.
     Easiest options: a [Formspree](https://formspree.io) form URL, a Discord/
     Slack incoming webhook, or a test inbox like
     [`https://webhook.site`](https://webhook.site).
   - **Support contact email** — shown to players as where reports go.
3. The settings persist in `localStorage` (`bugReportConfig_v1`).

### What gets sent
A JSON document:
```jsonc
{
  "description": "…",
  "reporterEmail": "…",
  "attachments": [{ "name": "shot.png", "type": "image/png", "dataUrl": "data:…" }],
  "logs": [{ "message": "…", "source": "…", "stack": "…", "at": "ISO-8601" }],
  "saveData": { "heroSkills_v23_p1": "…", "currentProfile_v1": "1", "…": "…" },
  "meta": { "createdAt": "…", "appVersion": "…", "userAgent": "…", "url": "…" }
}
```

### How we test it was received
`sendBugReport` uses an **injectable transport**, so unit tests assert the exact
payload and simulate "received / failed" without any network (see
`src/utils/bugReport.test.js`). A report counts as received only on an HTTP 2xx;
the reference id comes from the server response (`id`/`ticketId`) or is generated
locally. For a live end-to-end check, point the endpoint at `https://webhook.site`
and watch the delivered JSON appear.

### Implementation
- Logic: `src/utils/bugReport.js`, `src/utils/errorLog.js` (pure, 100% line
  coverage).
- UI: `src/components/modals/BugReportModal.jsx`.
- Design rationale: `docs/adr/0002-bug-reporting.md`.
