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

The vendored `src/flow/` copy of the framework has been removed — flOW now comes
from `@flow`. The game's two modules (`src/modules/sound`,
`src/modules/achievements`) declare the upstream interface nominally
(`class SoundModule(Module):`) and implement its lifecycle (`start`/`stop`).
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
