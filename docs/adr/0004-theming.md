# ADR 0004 — Theming: base-merge resolution + theme-first assets

- **Status:** accepted
- **Date:** 2026-11-10
- **Context:** CodeWash feature mission "Themes".

## Context

Theming existed but was broken: only the Minecraft theme had monster art, other
themes referenced **missing** images (`spy_logo.png`, `*_memorycard.jpg`), the
Spy theme's background pointed at `minecraft.png`, images could never actually be
overridden by a theme, and music/sounds never changed. The mission asks to fix
these, standardize sizing, add two themes, add a scrolling menu, theme the music,
and document how non-developers add a theme.

## Decision

Introduce a **pure theme-resolution layer** (`src/utils/themeUtils.js`):

- `resolveTheme(id)` deep-merges a theme **onto the base (Minecraft) theme**, so
  any key a theme omits is inherited. Broken/missing per-theme assets are simply
  dropped from the config and inherited, instead of 404-ing.
- `resolveMobImage(skillId, mob, theme)` resolves art **theme-first**, then the
  global maps, then a safe fallback. This fixes the root bug (the global maps
  used to win, so themes could never change images).
- `resolveThemeBgm(id)` maps a theme to a subset of the existing BGM tracks;
  `BGMManager.setTracks()` swaps the playlist when the theme changes — music now
  follows the theme without new audio assets.

Two new themes (**Sci-Fi**, **Fantasy**) reuse the already-present `Scifi.png` /
`fantasy.png` backgrounds. The theme menu got a scroll container to fit six
themes. Image sizing is standardized by the existing `object-contain` /
fixed-aspect card boxes.

## Consequences

- Themes now genuinely override what they provide and gracefully inherit the
  rest; a missing asset never breaks the UI.
- The pure layer is 100% line-covered and lets us test theming without a browser.
- **Residual (DEBT-13):** new themes still reuse the default monster/chest art
  (we have no themed art for them); the "crafting table" (cleaning) game is
  re-themeable through `assets.mobs` but ships with default art. The mechanism is
  in place — only artwork and themed audio are missing. Documented in
  `docs/THEMES.md` and the debt register.

## Alternatives considered

- **Per-theme hardcoded components / duplicated asset lists:** rejected — that is
  exactly the duplication and incoherence we were asked to remove.
- **Separate music files per theme:** ideal but we have no themed audio; mapping
  existing tracks is a pragmatic, reversible step that satisfies "music changes".
