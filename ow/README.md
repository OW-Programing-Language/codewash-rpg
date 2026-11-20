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
`.packaging/ow-dictionaries/target/OwIDE.jar`, sets the working directory, and opens
http://127.0.0.1:5180/. Keep the launcher running while playing.

Requirements: Node.js, Java 17+, and an OW runtime with `web_ui`, HTTP routes,
native dictionaries (`map_get`, `map_set`, `map_has`, `map_keys`, `map_size`),
JSON records, floating-point arithmetic, file persistence and math builtins.
The local runtime combines ow-lang PR #43 with this game's existing browser
support. The older `.packaging/ow-lang` checkout is retained unchanged.
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

## Two runtimes (important)

This project needs **two** OW runtime jars, because the game's browser support
(`web_ui`, HTTP routes, `serve`) is a local patch (`.packaging/runtime-browser.patch`)
that is **not** in upstream ow-lang, while `ow deps` / `ow test` / the new
dictionary & array literals are **only** in upstream:

| Jar | Has | Used for |
|-----|-----|----------|
| `.packaging/ow-dictionaries/target/OwIDE.jar` | `web_ui` + HTTP server | **running the web game** (`run-ow.ps1`) |
| `.packaging/ow-dictionaries/target/OwIDE-deps.jar` | `ow deps` + `ow test` + dict/array literals | **dependencies & tests** (`ow deps install`, `ow test tests/`) |

Do **not** overwrite the web jar with an upstream build — it loses `web_ui` and
the web game then fails with "connection refused" (nothing binds). Unifying both
into one jar means re-applying `runtime-browser.patch` onto upstream and resolving
conflicts; not done here.

> **The OwIDE "Run web" button does not work for this game.** It runs the file
> from the wrong working directory and skips the Node pre-build, so
> `generated/page.json` / `../public` can't be found and the server never starts
> ("127.0.0.1 refused to connect"). Launch with `run-ow.ps1` or
> `Lancer-jeu-OW.cmd` instead — they build the catalog and set the cwd to `ow/`.

## Using OwIDE (the OW editor)

OwIDE is the graphical editor/runner that ships with the OW language.

### Install

1. **Java 17+** is required (`java -version`).
2. **Get the `OwIDE.jar`.** Build it from the OW language repo with Maven:
   ```sh
   git clone https://github.com/OW-Programing-Language/ow-lang
   cd ow-lang
   mvn -q -DskipTests package      # produces target/OwIDE.jar
   ```
   (This repo also keeps prebuilt jars under
   `.packaging/ow-dictionaries/target/` — `OwIDE.jar` for the web game and
   `OwIDE-deps.jar` for `deps`/`test`; `.packaging/` is git-ignored, so a fresh
   clone builds its own jar as above.)
3. **Launch the IDE:**
   ```sh
   java -jar target/OwIDE.jar ide      # or: ow ide  (if `ow` is on PATH)
   ```
   Running the jar with no arguments also opens the IDE.

### Open the project

`File → Open Folder…` and select this repo's **`ow/`** folder. The file tree
shows `src/` (modules) and `tests/`. Before running anything that uses the
libraries, resolve dependencies once from a terminal in `ow/` (the IDE has no
deps button):

```sh
java -jar ../.packaging/ow-dictionaries/target/OwIDE-deps.jar deps install
```

### Run an OW program in OwIDE

Open a file that defines a `main:` block and use **Run ▶ (interpret)** from the
Run menu (or the toolbar). Good targets:

- `src/main.ow` — the console slice (`new Game()` combat loop).
- A one-line entry that boots the modular game, e.g. create `src/app/run.ow`:
  ```ow
  import "UiGame.ow"
  main:
    set ui: new UiGame()
    call: ui.begin_math()
    print: "flOW booted; achievements=" + str(ui.ach_count())
  ```
  Run ▶ (interpret) prints `flOW: booted 11 module(s)` — a quick in-IDE smoke
  that every module wires up.

> The full **browser game** is *not* launched from OwIDE's "Run UI (web)" button:
> it needs `node ow/scripts/build-web.mjs` first and the working directory set to
> `ow/`. Use `run-ow.ps1` / `Lancer-jeu-OW.cmd` for the real game (see above).

### Test the game

OWUnit suites run with the test runner on the **deps** jar (OwIDE itself has no
test button — use a terminal, e.g. the IDE's built-in one or any shell, in `ow/`):

```sh
JAR=../.packaging/ow-dictionaries/target/OwIDE-deps.jar
java -jar $JAR test tests/                     # all 11 module suites (32 tests)
java -jar $JAR test tests/CombatModuleTest.ow  # one suite
```

Each module has its own suite (`tests/<Module>Test.ow`). A green run prints
`[PASS] …` per test and `OW tests: N passed, 0 failed.`

## Dependencies (dependencies.yml)

The OW sources now pull reusable libraries through the compiler's own package
manager instead of vendoring copies. `dependencies.yml` declares three:

| alias     | repository                                   | used by                              |
|-----------|----------------------------------------------|--------------------------------------|
| `@flow`   | `OW-Programing-Language/flOW---OW-Modular-Framework` | `src/UiGame.ow`, `src/modules/*`     |
| `@math`   | `OW-Programing-Language/ow-math-questions`    | `src/MathSkill.ow`                    |
| `@owunit` | `OW-Programing-Language/OWUnit`               | `tests/*Test.ow`                      |

Resolve them (clones the locked commits into `ow/.ow/deps/`, writes
`dependencies.lock.yml`):

```sh
cd ow
# use the deps/test jar (see "Two runtimes" above)
java -jar ../.packaging/ow-dictionaries/target/OwIDE-deps.jar deps install
java -jar ../.packaging/ow-dictionaries/target/OwIDE-deps.jar deps list
```

Imports use the `@alias/path` form, e.g. `import "@math/src/MathQuestions.ow"`
or `import "@flow/src/App.ow"`. Relative imports (`import "Game.ow"`) are
unchanged. `.ow/deps/` is git-ignored; the lockfile is committed so installs are
reproducible. `run-ow.ps1` runs `ow deps install` automatically before launch.

### Spring-Modulith layout

The whole slice is modularised (Spring-Modulith style): **every class lives
inside a module** under `src/modules/<name>/`, split into two zones:

- `api/` — the module's **published** types: its service interface plus any
  reusable classes other modules may import.
- `infra/` — the **implementation**: the flOW `Module` (`class X(Module, XApi):`,
  full `start`/`stop`/`reload` lifecycle) and a **functor** (`class XFunctor(Functor)`)
  that builds the module from the app context.

The compiler's Loader **enforces** the boundary: a file in `api/` (or any other
module) may not import another module's `infra/` — only its `api/`. Only the
**composition root** (`src/app/UiGame.ow`, which sits outside any api/infra zone)
imports `infra/`, and it wires every module with a functor:
`app.apply(new SoundFunctor())`. Config is injected before boot via flOW config
(`sound.track`, `save.interval`, `i18n.lang`) and read inside the functors.

Eleven modules:

| module | provides | reacts to |
|--------|----------|-----------|
| `sound` | audio playback (track injected by functor) | `music.start`, `turn`, `hero.levelup` |
| `achievements` | unlocks | `turn`, `hero.levelup` |
| `theme` | active theme (backdrop/logo/name) | `theme.change` |
| `stats` | play metrics | `turn`, `hero.levelup` |
| `save` | autosave policy (interval injected) | `turn`, `game.save` |
| `bugreport` | diagnostic error buffer | `error` |
| `i18n` | FR/EN translation | `lang.change` |
| `progression` | RPG maths service | — |
| `mob` | bestiary sprite service | — |
| `skills` | skill factory (`make(id)`) | — |
| `combat` | the running `Game` (`game` service) | — |

`UiGame` holds no domain logic: it emits events and reads services (the theme
backdrop from `theme`, foe sprites from `mob`, XP curve from `progression`, the
active game from `combat`, skills from `skills`). Every module has its own OWUnit
suite under `tests/` (`<Module>Test.ow`) — 32 tests, run with
`java -jar ../.packaging/ow-dictionaries/target/OwIDE-deps.jar test tests/`.
`MathSkill` keeps the game's per-tier difficulty policy but builds each question
through `@math`'s `MathQuestions.from_operands()`.

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

Unit tests use **OWUnit** (`@owunit`) and run with the compiler's test runner
(files ending in `Test.ow` / `_test.ow`, `@Test` / `@BeforeEach` methods):

```sh
cd ow
JAR=../.packaging/ow-dictionaries/target/OwIDE-deps.jar
java -jar $JAR deps install
java -jar $JAR test tests/                       # all suites
java -jar $JAR test tests/MathSkillTest.ow       # one file
```

`tests/MathSkillTest.ow` checks the `@math`-backed question generation and
answer options; `tests/FlowAppTest.ow` boots the two flOW modules on an `App`
from `@flow` and asserts event delivery and enable/disable. The parity harness
below is the original end-to-end check:

```sh
npm run ow:test
```

This builds the catalog, checks registry, module, theme and border lookups,
compares OW against **1,400 original JS formula
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

## Experimental engine integration (opt-in)

For an isolated, GPU-free integration of **OW Engine**, **OW Graphics**, and
the existing CodeWash combat modules, see [Engine integration](docs/ENGINE-INTEGRATION.md).
It does not modify the working OW browser game or the original React/Electron
CodeWash deliverable; the new bridge has its own OWUnit integration tests.

## Experimental GPU battle (PR #2)

[Battle preview instructions](docs/GPU-BATTLE.md) cover the opt-in native
OpenGL scene combining **OW Engine** ECS, **OW Graphics** and the existing
OW math-combat service. The separate `src/engine/battle_gpu.ow` entrypoint
uses procedural block placeholders and an in-window math HUD; it does
not replace `src/main_ui.ow` or the React/Electron deliverable.

## PR #3: native battle feedback

The [experimental GPU battle](docs/GPU-BATTLE.md) now adds gold/pink hit/miss
markers and recoil, with OWUnit and actual Mesa framebuffer pixel tests.
No production browser/Electron game code or save formats are changed.

## Experimental OpenGL battle HUD (PR #4)

The opt-in [OW Engine + OW Graphics battle preview](docs/GPU-BATTLE.md)
now draws level/monster HP, math questions and four highlighted answer cards
in the native OpenGL window. The text uses an original 5x7 OW bitmap mesh;
W/A/S/D answers directly, or use arrows + Space to select. The full browser
game, React/Electron app and saves remain unchanged.

## GPU math battle — repeatable developer launcher (PR #5)

From a clean source checkout with sibling `ow-lang` and **SHA-pinned**
`OW-Graphics` clones plus JDK 17+, Maven and Node.js:

```sh
npm run ow:gpu:prepare
npm run ow:gpu:check
npm run ow:gpu
npm run ow:gpu:test
```

[Full setup, runtime constraints and feature-parity status](docs/GPU-BATTLE.md).
This launches the **experimental OpenGL MathSkill slice only** — it does not
package a standalone EXE or replace the full OW browser/Electron game.

## Phase 2 — Native menu and activity selection (PR #6)

The [experimental OpenGL preview](docs/GPU-BATTLE.md) opens with **Play Math,
Activities, Settings and Quit**. An OW Engine scene router switches between
these screens, preserves battle state and offers a two-page list of all six
activities. Only **Math** is implemented; the others and settings are clearly
marked unavailable. Use W/A/S/D or arrow keys plus Space; Escape returns to
the menu. The original OW browser/React game is unchanged.

## Phase 2 PR #7 — Native Reading activity

Native [OW Graphics Reading mode](docs/GPU-BATTLE.md) is now selectable from
**Activities → Reading**. It uses the original `ReadingSkill` word pools,
four stable choices, independent Math/Reading combat progression, and
visible GPU hit/miss feedback. It is a **keyboard word-matching adaptation**,
not the browser's microphone/speech-recognition mode. No original browser
game or React/Electron behavior is replaced.

## Phase 2 PR #8 — Native Writing (virtual keyboard)

Open [native Writing](docs/GPU-BATTLE.md) through **Activities → Writing** to
copy a source word using the original OW `WritingSkill`, OW Engine ECS and
OW Graphics framebuffer HUD. Left/Right navigates seven character pages;
W/A/S/D selects letters, Check submits and Delete edits. This is an explicit
word-copy prototype: original item-image clues and general OS text input are
not available in the pinned graphics runtime yet. Math, Reading and Writing
remain independent; the browser and React/Electron games are unaffected.

## Phase 2 PR #9 — Native Cleaning activity

The [native OpenGL activity catalog](docs/GPU-BATTLE.md) now supports
**Cleaning** on the second Activities page. Each task uses the existing
`CleaningSkill` list and an independent OW Engine/Game run, with Start →
Mark Done, Cancel, and Help buttons rendered by OW Graphics. This is
**self-reported** completion, without parent verification or real-world
detection. All prior game modes, tests and browser deliverables remain intact.
