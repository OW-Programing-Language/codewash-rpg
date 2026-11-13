# Level Up! — from vibe-coded JS to a refactored OW Lang port

This repository documents and ships a **full rewrite** of an educational RPG
mini-game. The game started life as a React/JavaScript prototype that was
*vibe-coded* — generated and bolted together feature by feature until it ran,
with no architecture, no tests, and game rules tangled directly into the UI.
We took that prototype, pinned down what it actually did, refactored the logic
out of the views, and **migrated the whole game to OW Lang** as a browser app
whose rules, state, combat, scoring and HTML are all written in OW.

The playable entry point is `ow/src/main_ui.ow`. Everything under `ow/` is the
port; `public/assets/` holds the original artwork, sprites and audio; the three
files kept under `src/` are the *only* pieces of the original JS that survive,
and they survive as **data**, not as logic (see
[Why three JS files remain](#why-three-js-files-remain)).

---

## Table of contents

1. [The starting point: a vibe-coded game](#the-starting-point-a-vibe-coded-game)
2. [Why migrate to OW Lang](#why-migrate-to-ow-lang)
3. [What we actually did](#what-we-actually-did)
4. [Architecture of the OW port](#architecture-of-the-ow-port)
5. [The flOW module framework](#the-flow-module-framework)
6. [JS → OW migration map](#js--ow-migration-map)
7. [Why three JS files remain](#why-three-js-files-remain)
8. [Correctness: proving the port matches the original](#correctness-proving-the-port-matches-the-original)
9. [Bugs the migration found and fixed](#bugs-the-migration-found-and-fixed)
10. [Run it](#run-it)
11. [Test it](#test-it)
12. [Project layout](#project-layout)
13. [Known boundaries and trade-offs](#known-boundaries-and-trade-offs)

---

## The starting point: a vibe-coded game

The original was a single-page React app. It worked on screen, but underneath
it had every symptom of code written to *look* finished rather than to *be*
maintainable:

- **Logic lived inside components.** Progression math, XP curves, combat
  resolution, memory-deck and Simon-sequence state, achievement conditions and
  mob selection were all written inline in JSX render functions and event
  handlers. The rules could not be run, read or tested without a browser.
- **Giant files, giant functions.** The orchestrator `App.jsx` was ~1,500
  lines; `GlobalStyles.jsx` ~1,300 lines; the skill card had a single function
  with a **cyclomatic complexity of 107**. Eleven functions scored complexity
  > 12.
- **Zero tests.** There was no way to change anything safely — no
  characterization of the existing behaviour, so any edit was a guess.
- **Truth leaked to the client.** Because the browser *was* the game, the
  answer keys, the memory deck and the math solutions all lived in the page.
  Nothing validated server-side; the UI trusted itself.
- **Junk in the tree.** Hundreds of macOS `._*` AppleDouble files were
  committed, breaking even a basic lint pass with parse errors.

In short: it ran, but it was un-ownable. You could not state precisely what the
XP formula was, or change a theme, without reverse-engineering render code.

## Why migrate to OW Lang

Refactoring in place would have improved the JS, but it would not have forced
the one property we wanted most: **a hard wall between game rules and
presentation.** OW Lang gave us that for free, because the OW web runtime makes
the rules a *server* and the browser a *thin client*:

- The browser never receives the memory deck, the math answer key or the Simon
  solution. It posts events (`POST /api/event`) and renders HTML that **OW**
  produced. OW validates every answer and every card choice.
- Game state is a real object graph in OW (`World`, `Hero`, profiles), persisted
  to JSON on disk — not scattered React state and `localStorage`.
- Rewriting every formula from scratch in a different language is the strongest
  possible characterization test: if the OW output disagrees with the JS output
  on any of 1,400 cases, the port is wrong. That forced us to *understand* the
  original instead of copying it.

The result is a functional browser port — not a pixel-identical React DOM clone,
but the same game, with the rules now readable, runnable and verified.

## What we actually did

1. **Froze the behaviour.** Read the JS, extracted the real formulas and content
   (word pools, difficulties, mob tables, XP/combat math), and treated them as a
   specification.
2. **Rebuilt the rules in OW.** `src/full/` contains the ported game: world
   orchestration, progression math, all six activities, achievements and HTML
   composition — ~2,700 lines of OW across focused files, none of them a
   1,500-line monster.
3. **Made the browser a transport.** `ow/web/client.js` sends events and renders
   OW-produced HTML, plays audio/animations, and wires speech recognition and
   fullscreen. `ow/web/game.css` plus the original cosmetic CSS style it.
4. **Kept the assets, dropped the logic.** `public/assets/` ships unchanged. The
   content *definitions* (which words, which mobs, which difficulty) are pulled
   out of the original JS into JSON by a build step; the original *rules* are
   gone, reimplemented in OW.
5. **Built a verification harness.** 1,400 formula-parity cases against the
   original JS functions, plus a headless browser test exercising all six
   activities, bosses, profiles, themes, saves and HTML escaping.
6. **Introduced a small application framework (flOW)** so cross-cutting features
   (sound, achievements) are decoupled, runtime-manageable modules instead of
   inline code.

## Architecture of the OW port

The OW app is a local single-player web server. The browser is a dumb terminal.

```
Browser (web/client.js)                 OW runtime (main_ui.ow)
  |  GET /            ------------------>  returns the prebuilt HTML page
  |  GET /api/state   ------------------>  GameView.state()  -> JSON snapshot
  |  POST /api/event  --{action,value,   >  World.dispatch(action, value)
  |                      token,revision}     validates, mutates, persists
  |  <----------------  new state / 403 (bad token) / 409 (stale revision)
  |  GET /api/export  ------------------>  all profiles as JSON
```

Key pieces:

- **`src/full/World.ow`** — the orchestrator (the real replacement for
  `App.jsx`). Owns profiles, current hero, the event dispatch, save/load, and a
  per-state `revision` + session `token` so stale or forged clicks are rejected
  (`409` / `403`).
- **`src/full/Rules.ow`** — pure progression math: XP curves, level-ups,
  difficulty penalties, combat damage. This is the code that is checked against
  the JS formulas case-for-case.
- **`src/full/Challenges.ow`** — the six activities: reading, math, writing,
  cleaning, memory (deck state and mismatch reveal), patterns (Simon
  sequences). The answer key never leaves OW.
- **`src/full/Awards.ow`** — achievement and badge conditions.
- **`src/full/GameView.ow`** — composes the HTML and the JSON state snapshot the
  browser renders (the replacement for the React component tree).
- **`src/full/Helpers.ow`** — shared utilities, including HTML escaping.
- **`ow/scripts/build-web.mjs`** — the only build step. It reads the original
  content out of the three remaining JS files, emits `catalog.json` (words,
  mobs, difficulties, music playlists) and the single-file HTML `page.json`, and
  **verifies that every referenced media file exists** under `public/assets/`.
  It executes no game rules.

## The flOW module framework

Cross-cutting concerns were the worst offenders in the original (audio and
achievement logic smeared across components). The port introduces **flOW**, a
tiny application-context framework under `src/flow/`:

- **`Module.ow`** — the contract every module implements: `name()`,
  `requires()`, `register(app)`, `start(app)`, `on_event(type, payload)`,
  `reload(app)`.
- **`App.ow`** — the application context: a service registry, a config store,
  and an event bus. It boots modules in a `register → verify (deps) → start`
  lifecycle and delivers every emitted event to each **enabled** module, so a
  publisher never references its subscribers.
- **`Registry.ow` / `Functor.ow`** — the service container and an OCaml-style
  functor (`app.apply(f)` builds a configured module from the app context).

Modules can be **parameterized** (`app.config_or("sound.track", default)`),
**enabled/disabled** at runtime (a disabled module receives no events), and
**reloaded** (reset in place). Current modules:

- `src/modules/sound/SoundModule.ow` — audio reacts to events; the game logic no
  longer knows about playback.
- `src/modules/achievements/AchievementsModule.ow` — achievement tracking as an
  event subscriber.

## JS → OW migration map

| Original JavaScript | OW implementation |
| --- | --- |
| `App.jsx` orchestration | `src/full/World.ow` |
| `gameUtils.js` progression/combat math | `src/full/Rules.ow` |
| Word banks, artwork, difficulty content (`gameData.jsx`) | Catalog generated into `catalog.json` by `build-web.mjs` |
| Math, reading, writing activities | `src/full/Challenges.ow` |
| Memory deck & Simon state (inside `SkillCard.jsx`) | `src/full/Challenges.ow` |
| Achievement conditions | `src/full/Awards.ow` |
| Cards, drawers, dialogs (component tree) | `src/full/GameView.ow` |
| Animations and border effects | Original CSS + `web/game.css` |
| Browser APIs (audio, mic, fullscreen, download) | `web/client.js` adapter |
| Browser `localStorage` | Three OW profiles saved to JSON on disk |

## Why three JS files remain

Only three original files are kept, and only for their **data**, never their
logic:

- `src/constants/gameData.jsx` — the content tables (skills, themes, mob rosters,
  word pools, difficulty content).
- `src/utils/gameUtils.js` — kept as the **reference oracle** the OW math is
  tested against, and as the source of the PEMDAS / nightmare problem lists.
- `src/components/ui/GlobalStyles.jsx` — the original cosmetic CSS (border
  effects, animations), inlined into the page so the port keeps the original
  look.

`build-web.mjs` parses these into JSON at build time. They are not executed as
game rules at runtime — the rules are OW.

## Correctness: proving the port matches the original

The port is not "trust me, I rewrote it." It is checked:

- **1,400 formula-parity cases.** `ow/scripts/test.mjs` compares the OW
  progression/combat output against the original JS functions across **levels
  1–200 × seven difficulties**. A single disagreement fails the run.
- **Headless browser test.** `ow/scripts/browser-test.cjs` (run under Electron)
  starts a throwaway OW server on a random port with disposable saves, then
  drives real UI actions: all six activities, bosses, minibosses,
  death/recovery, three profiles, six themes, French menus, awards, mobile
  layout, save reload, image loading, and request-revision rejection. It writes
  screenshots and results under `ow/generated/`.
- **HTML escaping** is exercised so OW-composed HTML can't be broken by content.

## Bugs the migration found and fixed

Rewriting against a reference oracle surfaced real defects in the original that
the vibe-coded version shipped:

- **Perfect-memory achievement never fired.** The JS UI *defined* the
  perfect-game achievement but never wired the counter update. The OW port
  increments it correctly.
- **Eighth badge was unreachable.** The JS award loop stopped at seven badges
  even though the UI displayed eight tiers. In OW the eighth badge is attainable
  after its boss.
- **Client-trusted answer keys.** The original exposed answers to the browser.
  The port validates every answer and card selection in OW; the browser only
  ever receives what it needs to render.

## Run it

Requirements: **Node.js**, **Java 17+**, and an OW runtime that supports
`web_ui`, HTTP routes, JSON records, floating-point arithmetic, file persistence
and the math builtins (`floor`/`ceil`).

### Windows (one click)

Double-click **`Lancer-jeu-OW.cmd`** in the repository root, or from PowerShell:

```powershell
.\run-ow.ps1
.\run-ow.ps1 -Port 5182
```

The launcher builds the catalog/page, picks a compatible OW compiler JAR, sets
the asset working directory, and opens <http://127.0.0.1:5180/>. Keep it running
while you play. Point it at a specific runtime with:

```powershell
.\run-ow.ps1 -RuntimeJar C:\path\to\OwIDE.jar
```

### Any platform

```sh
node ow/scripts/build-web.mjs
cd ow
java -jar /absolute/path/to/OwIDE.jar run src/main_ui.ow
```

Set `OW_JAR` (env) or `-RuntimeJar` if your OW compiler lives elsewhere. See
`ow/README.md` for the full launch notes and `ow/docs/PORTING.md` for the
porting status.

## Test it

```sh
npm run ow:build        # build catalog + page, verify every referenced asset
npm run ow:test         # build, then run the 1,400-case formula parity suite
```

Headless browser test (needs this project's Electron dependency):

```powershell
.\node_modules\electron\dist\electron.exe ow/scripts/browser-test.cjs
```

Set `OW_JAR` when the compiler is not on the default path.

## Project layout

```
.
├── Lancer-jeu-OW.cmd          # Windows one-click launcher
├── run-ow.ps1                 # build + launch script
├── package.json               # ow:build / ow:test scripts
├── ow/
│   ├── README.md              # launch + architecture notes
│   ├── docs/PORTING.md        # porting status and differences from the original
│   ├── scripts/
│   │   ├── build-web.mjs       # content -> JSON catalog + single-file HTML page
│   │   ├── test.mjs            # 1,400-case JS↔OW formula parity suite
│   │   └── browser-test.cjs    # headless Electron UI test
│   ├── src/
│   │   ├── main_ui.ow          # entry point: web server + routes
│   │   ├── flow/               # flOW module framework (App/Module/Registry/Functor)
│   │   ├── full/               # the ported game (World/Rules/Challenges/Awards/GameView)
│   │   ├── modules/            # sound + achievements modules
│   │   └── *.ow                # earlier engine/UI prototypes kept for reference
│   ├── tests/core.ow
│   └── web/                    # client.js transport + game.css
├── src/                        # the only surviving JS — used as DATA, not logic
│   ├── constants/gameData.jsx  # content tables
│   ├── utils/gameUtils.js      # reference oracle for formula parity
│   └── components/ui/GlobalStyles.jsx  # original cosmetic CSS
├── public/assets/              # original artwork, sprites, audio (unchanged)
└── docs/OW-PACKAGING.md        # standalone packaging notes
```

> `ow/generated/` (build output, logs, screenshots) and `ow/save/` (local
> profiles) are regenerated on every run and are intentionally not committed.

## Known boundaries and trade-offs

- **Functional port, not a DOM clone.** Layout and controls are rebuilt in OW;
  this is not a pixel-for-pixel React re-creation.
- **Integer range.** OW's integer/floor builtins are 32-bit, so arbitrarily high
  endgame XP beyond that range is not guaranteed to match; the checked range is
  levels 1–200.
- **Voice input** depends on the browser's speech service and permission; a
  keyboard fallback is always available. Microphone hardware and offline speech
  are not claimed as tested.
- **Saves are OW's.** Profiles live in `ow/save/profiles.json` (previous save
  kept as `.backup`). These are independent of the original React
  `localStorage`; existing saves are not silently imported.
- **Partial French.** Controls and help are translated; original challenge
  words, skill descriptions, mob and achievement names remain English.
- **The `.packaging/` runtime is local tooling**, not a tracked dependency; build
  or supply your own OW compiler JAR.
