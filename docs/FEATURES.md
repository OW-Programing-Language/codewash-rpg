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

---

## Translation (change the language)

**Where:** the **Settings** panel → **Language** section. Pick a language; the
choice is saved and applied immediately.

Currently shipped: **English** and **Français**. The Settings panel, the Bug
Report modal and the language selector are translated; the rest of the in-game
text is being migrated incrementally (tracked as DEBT-12).

### Adding a new language (no coding required beyond a JSON file)
1. Copy `src/i18n/locales/en.json` to `src/i18n/locales/<code>.json` (e.g.
   `es.json`) and translate the values. Keep the keys unchanged.
2. Register it in `src/i18n/translations.js`:
   ```js
   import es from './locales/es.json';
   export const translations = { en, fr, es };
   ```
3. Add one entry to `LANGUAGES` in `src/i18n/config.js`:
   ```js
   { code: 'es', label: 'Español', flag: '🇪🇸' },
   ```
That's it — a new button appears in the selector automatically. A missing key
falls back to English, then to the key itself, so a partial translation never
breaks the UI.

### Implementation
- Pure core: `src/i18n/translate.js` (lookup + interpolation + fallback) and
  `src/i18n/config.js` (language registry + persistence) — 100% line coverage.
- React binding: `src/i18n/I18nContext.jsx` (`useI18n()` → `t(key, vars)`),
  `src/components/ui/LanguageSelector.jsx`.
- Design rationale: `docs/adr/0003-i18n.md`.

---

## Themes

**Where:** the **Themes & Cosmetics** panel (the ✨ sparkles menu) → **Theme
Select** (a scrollable list).

Ships **six** themes: Minecraft (default), K-Pop Demon Hunters, Pokémon, Spy,
**Sci-Fi** and **Fantasy** (the last two are new). Picking a theme updates the
background, logo, skill names and **background music** immediately, and the
choice is saved per profile.

### What was fixed
- Themes can now actually **override** images (previously the default art always
  won). A theme inherits anything it doesn't provide, so no more broken images.
- Fixed the Spy theme's background (was showing the Minecraft background) and the
  broken logo/memory-card references.
- **Music now changes with the theme.**

### Adding a theme
Non-developer guide: **`docs/THEMES.md`** (two files + a few images, no coding).

### Implementation
- Pure engine: `src/utils/themeUtils.js` — `resolveTheme` (base-merge),
  `resolveMobImage` (theme-first), `resolveThemeBgm` (themed music). 100% line
  coverage.
- Music swap: `BGMManager.setTracks()` in `src/utils/soundManager.js`.
- Design rationale: `docs/adr/0004-theming.md`.
- Known limitation: new themes reuse default monster art until themed images are
  added (DEBT-13).
