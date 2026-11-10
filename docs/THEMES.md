# Adding a theme (no coding needed)

A **theme** changes the game's background, logo, skill names, monster art and
background music. This guide is written for non-developers. You only edit **two
files** and drop in a few images.

> You don't need to translate or understand the code. Copy an existing theme and
> change the values.

## Step 1 — Add your images

Put your images in `public/assets/themes/`. At minimum you need a **background**
image (used both as the game background and as the menu thumbnail). Recommended:

| Image | What it is | Example file |
|---|---|---|
| Background | Full-screen background + menu card | `mytheme.png` |
| Logo (optional) | Shown above the title | `mytheme_logo.png` |
| Memory card back (optional) | Back of the Memory game cards | `mytheme_card.jpg` |

**Image size tips** (so nothing looks stretched):
- Background: landscape, at least 1280×720. The game crops it to fill, so keep
  important content centered.
- Logo: a wide PNG with a transparent background.
- Anything you don't provide is automatically borrowed from the default theme —
  the game never shows a broken image.

## Step 2 — Register the theme

Open **`src/i18n`… no** — open **`src/constants/gameData.jsx`**, find
`THEME_CONFIG`, copy an existing block (for example `'spy'`) and change the
values:

```js
'mytheme': {
    name: 'My Theme',
    style: { backgroundImage: `url('assets/themes/mytheme.png')`, backgroundSize: 'cover', backgroundPosition: 'center' },
    assets: { mobs: {} },                       // leave empty to reuse default art
    skills: {
        reading:  { name: 'My Reading Name' },
        math:     { name: 'My Math Name' },
        writing:  { name: 'My Writing Name' },
        cleaning: { name: 'My Cleaning Name' },
        memory:   { name: 'My Memory Name' },
        patterns: { name: 'My Patterns Name' },
    },
},
```

Then, just below, add it to **`THEMES_LIST`** so it shows up in the menu:

```js
{ id: 'mytheme', name: 'My Theme', img: 'assets/themes/mytheme.png' },
```

> The `id` (`'mytheme'`) must be the **same** in both places.

## Step 3 (optional) — Themed music

To give the theme its own music, open `src/utils/themeUtils.js`, find `THEME_BGM`
and add a line choosing from the existing tracks
(`calm1`–`calm3`, `piano1`–`piano3`):

```js
mytheme: ['piano1', 'piano2'],
```

If you skip this, the theme uses the default music.

## That's it

Open the game → **Themes & Cosmetics** panel (the sparkles menu) → your theme is
in the scrollable list. Pick it: the background, logo, skill names and music
update immediately, and the choice is saved per profile.

---

### For developers: how it works
- `THEME_CONFIG` entries are **merged onto the base theme** by
  `resolveTheme()` (`src/utils/themeUtils.js`), so any key you omit is inherited.
- Monster images resolve **theme-first** via `resolveMobImage()` — a theme that
  ships its own art in `assets.mobs` overrides the default automatically.
- Music is chosen by `resolveThemeBgm()` and applied through
  `BGMManager.setTracks()`.
- All three functions are pure and unit-tested (`src/utils/themeUtils.test.js`).
- **Known limitation (DEBT-13):** new themes currently reuse the default monster
  art unless you provide themed images in `assets.mobs`. The mechanism is ready;
  only the art is missing.
