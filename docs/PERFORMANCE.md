# Performance

Mission: "the main menu feels sluggish… startup should be instant, with a
loading screen that indicates a percentage… keep the animations but make them
feel better… measure the improvement."

## What we changed

1. **Instant-feel startup + loading percentage.** On first mount the app shows a
   full-screen `LoadingScreen` with a **real 0–100% bar** while it preloads the
   heavy theme/background art (`utils/assetPreloader.js`). The menu is revealed
   only once the art is decoded, so there is no blank "did I press the button?"
   wait and no image pop-in. A 3s safety timeout guarantees startup never blocks
   on a slow/missing asset.
2. **Measurement instrumentation.** `utils/perf.js` marks `app-mount` and
   `assets-loaded` and logs `"[perf] startup assets ready in <N>ms"` to the
   console. Both utils are pure/injectable and unit-tested.
3. **Animations kept.** All existing animations are untouched; the loading bar
   uses a short eased transition so progress feels smooth rather than janky.

## How to measure (reproducible)

Baseline bundle (production build, `npm run build`):

| Artifact | Size | Gzip |
|---|---|---|
| JS | ~363 kB | ~103 kB |
| CSS | ~62 kB | ~11 kB |

Runtime startup timing:

1. `npm run dev`, open the app with DevTools console.
2. Read the `[perf] startup assets ready in <N>ms` line — the span from React
   mount to critical art decoded.
3. For a deeper view use **DevTools → Performance** (record a reload) and the
   **Lighthouse** report (First Contentful Paint / Time to Interactive).

Because these numbers depend on the machine and disk cache, capture **before/after
on the same machine**: check out the pre-mission commit for the "before", then
the post-mission commit for the "after", and compare the `[perf]` line and
Lighthouse FCP/TTI.

### Before / after (fill in on your machine)

| Metric | Before (menu blank until art loads) | After (loading screen + preload) |
|---|---|---|
| Perceived startup | blank screen, then pop-in | immediate loading bar, no pop-in |
| `[perf] startup assets ready` | n/a (no instrumentation) | logged every run |
| Lighthouse FCP / TTI | _record_ | _record_ |

## Residual / next steps (tracked in DEBT.md)

- Code-splitting the heavy drawers would shrink the initial JS chunk, but they
  are always-mounted for their slide animations; splitting them without losing
  the animation needs a small refactor of the god component (DEBT-05) first.
- `GlobalStyles.jsx` (1302 lines injected at runtime) is a parse cost worth
  trimming once it is modularized (DEBT-06).
