# Level Up! — OW browser port

The graphical entry point is now `src/main_ui.ow`. It replaces the old
spelling-only demo with the original theme art, carousel, six activities,
per-skill progression, three profiles, achievements, cosmetics and audio.

## Launch on this Windows checkout

Double-click **Lancer-jeu-OW.cmd** in the repository root, or run:

```powershell
.\run-ow.ps1
.\run-ow.ps1 -Port 5182
```

The launcher builds the catalog/page, selects the compatible local compiler at
`.packaging/ow-lang/target/OwIDE.jar`, sets the working directory, and opens
http://127.0.0.1:5180/. Keep the launcher running while playing.

Requirements: Node.js, Java 17+, and an OW runtime with `web_ui`, HTTP routes,
JSON records, floating-point arithmetic, file persistence and math builtins.
The old `ow` on this machine's PATH lacks the required APIs. Choose another JAR:

```powershell
.\run-ow.ps1 -RuntimeJar C:\path\to\OwIDE.jar
```

On another checkout, build an appropriate OW compiler or provide OW_JAR.
The .packaging directory is local build tooling, not a tracked dependency.
Direct cross-platform launch, from the repository root:

```sh
node ow/scripts/build-web.mjs
cd ow
java -jar /absolute/path/to/OwIDE.jar run src/main_ui.ow
```

## Architecture

All game state, random challenges, validation, combat, memory matching, Simon
sequences, profile mutations, awards and HTML composition are written in OW in
src/full/. The browser does not run the original React app. web/client.js is
the browser adapter: it sends events, displays HTML produced by OW, plays
audio/animations, accesses speech recognition and fullscreen, and downloads
exports. web/game.css styles that HTML; the build imports the original cosmetic
effects from GlobalStyles.jsx.

scripts/build-web.mjs copies content definitions from the original JS into
JSON and checks every referenced media file. It does not execute JS game rules
at runtime. public/assets remains the shared source for original artwork,
animated GIF/WebP sprites and sounds.

## Activities and progression

- Reading: original seven word pools and homophones, voice or keyboard.
- Math: seven difficulties, all 12 PEMDAS and 25 nightmare problems.
- Writing: original difficulty pools and item images; spaces/case normalized.
- Cleaning: chest progression and the original floppy-disk parent challenge.
- Memory: 3–10 pairs, original friendly-mob images, mismatch reveal delay,
  complete-board rewards and perfect-game tracking.
- Patterns: Simon Says with 2–8 animated axolotls, notes, progressive tempo,
  growing sequences and difficulty-7 sequence regeneration.
- Combat: partial XP, five-hit normal fights, one-hit minibosses, harder
  miniboss questions, boss healing on error, death/recovery, tier unlocks and
  badges. Exponential XP and difficulty penalties match the original formulas.
- Three named profiles, six themes, fifteen border effects, nineteen
  achievements, tiered awards, phantom bonuses, music/SFX volumes, fullscreen,
  help and downloadable diagnostic reports.

## Saves

Profiles live in ow/save/profiles.json; the previous save is retained as
profiles.json.backup. Reset confirmation affects only the selected profile.
Settings can export all profiles. These files are independent of React's
browser localStorage and the old native spelling demo's save format.
Existing saves are not silently imported or overwritten.

This is a local single-player process. Multiple windows share its current
profile/state; revision checks reject stale clicks. It is not multiplayer.

## Validation

```sh
npm run ow:test
```

This builds the catalog, compares OW against **1,400 original JS formula
cases** (levels 1–200 × seven difficulties), and exercises all six activities,
bosses, minibosses, death/recovery, profiles, awards, save reload and HTML escaping.
Set OW_JAR when the compiler lives elsewhere.

With this project's Electron dependency installed:

```powershell
.\node_modules\electron\dist\electron.exe ow/scripts/browser-test.cjs
```

The browser test starts a separate OW server on a random port and disposable
saves under ow/generated/. It checks UI actions, six themes, profiles, French
menus, awards, mobile layout, reload, images and request revisions.
Screenshots and results are written under ow/generated/.

The old terminal engine and UI prototype remain under src/ for reference.
The supported graphical entry is main_ui.ow; this port is a browser app,
not a Swing recreation. See [porting notes](docs/PORTING.md).
