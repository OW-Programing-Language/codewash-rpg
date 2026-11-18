# ADR 0005 — Startup performance: preload + loading screen + perf marks

- **Status:** accepted
- **Date:** 2026-11-10
- **Context:** CodeWash feature mission "Improve performance".

## Context

The menu "felt sluggish": on startup the screen stayed blank while large theme
background images decoded, then popped in — users wondered if the click
registered. The mission asks for an instant feel, a **loading screen with a
percentage**, snappier UX with animations kept, and a **measured** improvement.

## Decision

- Add a pure **asset preloader** (`utils/assetPreloader.js`) that loads the
  critical theme/background art and reports **0–100% progress**; a failed image
  resolves as "done" so it never hangs, with a 3s safety timeout in the app.
- Show a **`LoadingScreen`** overlay with a real percentage bar on first mount,
  revealing the menu only once art is ready — the blank wait and pop-in are gone.
- Add a tiny **perf tracker** (`utils/perf.js`) with an injectable clock to mark
  `app-mount` / `assets-loaded` and log the startup span, giving us a real number
  instead of a vibe.
- Keep all existing animations; only add a short eased transition on the bar.

Both utils are pure and 100% line-covered; the React pieces are thin glue.

## Consequences

- Perceived startup is immediate (a themed bar instead of a blank screen) and the
  menu no longer pops in — the exact complaint is addressed.
- We can quote a runtime number (`[perf] …ms`) and a bundle baseline; the
  before/after method is documented in `docs/PERFORMANCE.md`.
- We deliberately did **not** code-split the drawers: they are always mounted for
  their slide animations, and splitting them without breaking the animation needs
  the god-component refactor (DEBT-05) first. Logged as residual, not done
  silently.

## Alternatives considered

- **Fake/indeterminate spinner:** rejected — the subject explicitly wants a
  percentage, and a real preloader percentage is both honest and useful.
- **Aggressive code-splitting now:** rejected for this mission — highest-value
  split (the drawers) conflicts with "keep the animations" until DEBT-05 is done.
