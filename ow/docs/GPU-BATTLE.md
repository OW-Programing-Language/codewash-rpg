# OW Graphics + OW Engine: experimental GPU battle (PR #2)

This prototype renders a **real OpenGL 3.3 scene** through OW Engine's ECS
`RenderWorld` and OW Graphics' GLFW/LWJGL bridge. It does **not** replace the
CodeWash legacy-refactoring application, the existing OW browser game, or its
profile saves. The preview intentionally demonstrates only the modular
`MathSkill`/combat loop; the six-skill `src/full/` browser port remains intact.

## Play

The GPU preview opens a 640x480 window and draws four separate ECS entities:
cyan hero, orange monster, green health bar and blue-gray floor. These are
**procedural cube placeholders**, not final art or game sprite conversions.
The OpenGL HUD displays the math problem, four answer cards, level and foe HP.
Use **W/A/S/D** to answer immediately, or **arrow keys** + **Space** to
highlight and submit a choice. Press **Esc** to exit. Input is edge-triggered.
Correct answers use the existing `Game.answer()` and reduce monster HP;
CodeWash's original modular combat logic handles respawns/XP. The bar reflects
remaining monster HP (resetting when a new enemy spawns). The OpenGL window displays bitmap text but does not yet accept free-text input.

## Build and run

Requires Java 17+, Maven, Git, GLFW/OpenGL 3.3 and an active desktop session.
Check out `ow-lang`, `OW-Graphics` and `codewash-rpg` as siblings. Build
the compiler and OW Graphics native provider **at the exact Graphics revision
pinned in `ow/dependencies.yml`**, rather than mixing native versions:

```sh
mvn -f ../ow-lang/pom.xml -DskipTests install
cd ow
java -jar ../../ow-lang/target/OwIDE.jar deps install
java -jar ../../ow-lang/target/OwIDE.jar check src/engine/battle_gpu.ow
# Build provider from pinned OW Graphics checkout (in sibling directory):
mvn -f ../../OW-Graphics/native-bridge/pom.xml package dependency:copy-dependencies -DoutputDirectory=target/lib
java -cp "../../ow-lang/target/OwIDE.jar:../../OW-Graphics/native-bridge/target/classes:../../OW-Graphics/native-bridge/target/lib/*" dev.oreo.Main run src/engine/battle_gpu.ow
```

On Windows PowerShell, use `;` rather than `:` in the classpath; Maven's
Windows profile supplies LWJGL native Windows artifacts. Bare `ow run`
without the provider cannot run the GPU example. The command must be invoked
from `codewash-rpg/ow` so `@engine`/`@graphics` resolve from that manifest.

## Verification

```sh
cd ow
ow deps install
ow test tests/BattleSceneRenderTest.ow
ow test tests/
```

- OWUnit: headless ECS scene composition, mesh references, actual RenderWorld
  draw calls against a headless renderer, right/wrong answers and input validation.
- CI native smoke: compile real OpenGL bridge + Mesa/Xvfb, render one frame,
  read red/cyan/dark pixels from the **actual framebuffer**, submit a math
  answer and render again. The test-only Java SPI pixel probe lives under
  `tests/gpu` and is not part of any release build.
- Existing React/Vite/Electron quality and OW browser tests remain unchanged.

### Next steps

The engine/graphics seam is ready for a real battle UI, reusable 2D text and
buttons, artwork loading, frame-independent animation, and all six learning
activities. We have **not** migrated audio, menus, local profile storage, or
accessibility into OpenGL. Existing production entrypoints stay as-is.

## PR #3: animated combat feedback

The opt-in GPU preview now shows a gold hit marker and monster recoil for a
correct math answer, or a pink miss marker and hero recoil for an incorrect
answer. Both are OW Engine ECS entities drawn by OW Graphics. At idle, six
entities exist but only four have bound meshes; one effect appears (five draws)
for 12 rendered frames, then automatically vanishes. Later answers replace
earlier feedback without stale GPU meshes, and health/XP/respawns remain owned
by the original OW `Game.answer()` method.

**Current limitation:** animation is deterministic but frame-stepped, not
time-scaled. Effects speed up or slow down with FPS. They are procedural cube
placeholders; no text/2D GUI, migrated artwork, audio or save migration yet.

`BattleFeedbackTest.ow` checks hit/miss recoil, correct/wrong damage, effect
expiration and replacement headlessly. The Mesa/Xvfb native smoke reads real
gold and pink framebuffer pixels and verifies both effects disappear.

## PR #4 — GPU HUD and graphical choice cards

The native 640x480 battle preview now displays **level, monster HP, current
math question and all four answer values in the OpenGL window**. OW builds
vertices for a small, original 5x7 uppercase ASCII font. OW Graphics uploads
and renders those glyphs as triangles after the ECS world, without Swing,
browser overlays, or a Java font engine. Unsupported glyphs fall back to `?`.

The four answer cards have a dark blue background, with the current selection
highlighted in teal. **W/A/S/D** still answers immediately; alternatively,
use **arrow keys** to move the selection and **Space** to submit. Escape quits.
Key-edge tracking prevents automatic repeated submissions.

The on-screen HUD is refreshed after an answer changes the problem. Replaced
text meshes are freed after successful new uploads, and all HUD shader and
mesh resources are destroyed before closing the graphics context.

### Automated verification

`BattleHudTest.ow` verifies glyph bounds, operator support, the 2x2
directional selection grid, invalid choices and reuse of the existing
`Game.answer()` logic. GPU CI builds the pinned OW Graphics native bridge,
renders the HUD with Mesa/Xvfb, samples real framebuffer pixels for
text/selected-card highlights and checks hit/miss feedback still renders.

### Known limitations

This is still an **opt-in MathSkill 3D prototype**. Current OW Graphics input
has arrow keys, Space, W/A/S/D and mouse button state, but it does not expose
reliable absolute cursor coordinates; therefore the cards are keyboard
operable, **not mouse-clickable**. Native text input, accessibility,
the other five learning activities, original sprites, audio and save migration
are not implemented. The existing CodeWash browser/Electron games are intact.

## PR #5 — Reproducible native preview launcher and lifecycle gate

This is an **opt-in developer launcher**, not a self-contained Windows EXE or
macOS/Linux installer. It builds the current local OW compiler and the
**commit-pinned** OW Graphics native LWJGL bridge, resolves the existing
`ow/dependencies.lock.yml`, checks OW source, then opens the 640×480 GPU
battle. It never modifies the browser launcher, its runtime jar, or the
React/Electron game.

### Local prerequisites

- Node.js 20+, Java JDK 17+, Maven 3.9+, Git and an OpenGL 3.3-capable desktop.
- Three sibling clones: `codewash-rpg`, `ow-lang` and `OW-Graphics`.
- `OW-Graphics` **must be checked out** to the exact SHA listed under
  `graphics` in `ow/dependencies.yml`. The launcher fails rather than silently
  compiling from a newer, incompatible checkout. Work in a separate cloned
  copy if your OW Graphics source contains other in-progress changes.

From the CodeWash repository root, first prepare the native provider:

```sh
# Confirm the pinned graphics SHA in ow/dependencies.yml, then check it out
git -C ../OW-Graphics checkout <PINNED_GRAPHICS_SHA>
npm run ow:gpu:prepare
npm run ow:gpu:check
npm run ow:gpu
```

Specify different checkout locations using the underlying command:

```sh
node ow/scripts/gpu-preview.mjs --run --compiler-dir ../ow-lang --graphics-dir ../OW-Graphics
node ow/scripts/gpu-preview.mjs --check --no-build
node --test ow/scripts/gpu-preview.test.mjs
```

The launcher uses the JVM/OS classpath separator automatically and respects
the working directory required by OW imports. It **does not download or
install Git repos**, overwrite a git checkout, or silently regenerate the
committed OW lockfile. Windows Maven runs through `mvn.cmd`; users need the
Maven command on `PATH`. The Windows/macOS interactive desktop launch
is not yet validated in GitHub Actions, which runs Linux Mesa/Xvfb.

### Lifecycle/cleanup gate

The `battle_lifecycle_smoke.ow` smoke starts one GPU game, refreshes its HUD,
answers a problem, and verifies the GPU mesh/shader handles are released by
`stop()`. It then starts a **new OpenGL context in the same process**, checks
its ECS/HUD state starts fresh, and shuts it down again. Both sessions run with
the real native provider under Mesa/Xvfb in CI. The existing pixel smoke still
verifies text, cards, colors and combat outcomes.

### Completion and remaining work

PRs 1–5 establish a separate, testable **native math battle vertical slice**
rather than shipping a fully migrated game. More work is required to replace
the six-skill browser version:

- Port the other five activities (reading, writing, cleaning, memory, patterns).
- Replace block placeholders with original models, textures, animation and audio.
- Build native menus, profiles/saves, settings, themes and achievements.
- Add accessible text input, mouse support, responsive UI, Windows/macOS
  desktop CI, and actual distributable signed/native packages.
- Resolve and document the web runtime vs. dependency/test runtime split
  without breaking the existing OW browser game.

The native launcher should not be advertised as a complete release until
these feature-parity and packaging requirements are met.

## Phase 2, PR #6 — Native menu and activity router

The GPU preview now **opens at a native OpenGL main menu**, not automatically
in math combat. The same OW 5x7 bitmap shader and four highlighted GPU choice
cards power menu, activities, settings and battle; the cards are only placeholders,
not a mouse interface. Use **W/A/S/D** for direct selection, **arrow keys + Space**
to choose an active card, **Escape** to return to the main menu, and Escape on
the main menu (or Quit) to close the preview. Keys are edge-debounced.

**Play Math** starts the existing native MathSkill battle. **Activities** is
a two-page list with **Math, Reading, Writing, Cleaning, Memory and Patterns**:
only Math is playable in this preview. The other five display **COMING SOON**
rather than falsely suggesting a native port. **Settings** is a nonfunctional
preview with explicitly labeled unavailable options and a working Back button.

`NativeMenuRouter.ow` handles state transitions using OW Engine's real
`SceneManager.activate`; the inactive battle scene retains its six ECS
entities, but the renderer draws **zero** battle meshes on menu, activity and
settings screens. Existing combat state, math answers and native HUD are
preserved across menu/battle transitions. No new Java, Swing or browser UI code
is involved.

OWUnit covers scene transitions, all six activity slots, disabled choices,
the quit/back policy and menu glyph geometry. The additional `menu_smoke.ow`
uses Mesa/Xvfb's **real OpenGL framebuffer** to check menu/card rendering,
scene isolation and return to the math battle. The existing GPU gameplay and
repeatable lifecycle smokes remain in CI.

The non-math activities, functional settings, profiles, audio, mouse support
and a native game distribution are **future PRs**, not implemented by PR #6.

## Phase 2 PR #7 — Native Reading word matching

**Reading** is now playable from **Activities → Reading** in the separate
OW Engine + OW Graphics preview. Its text prompt and **four word choices**
are drawn inside the real OpenGL window using the existing 5×7 bitmap HUD.
Use **W/A/S/D** or arrow keys plus Space to choose the word matching the
target. The challenge and distractors use the existing
`ow/src/modules/skills/api/ReadingSkill.ow` word pools for difficulty
tiers 1–7; the playable native run begins at difficulty 1 and continues
with the existing `Game` progression/combat system.

A Reading run has a **separate Game instance and separate OW Engine scene**;
it does not overwrite Math HP, progression, question or status. Each
challenge's four randomized options are now **cached** in `BattleScene`
until the player submits an answer. This fixes a consistency issue when
using ReadingSkill: generating the options twice could display different
distractors from the ones actually accepted as the answer. Math keeps the
same existing answer ordering and damage behavior.

On a correct Reading answer, the same existing combat service damages
the enemy, awards XP/levels as appropriate, and displays a gold hit effect;
incorrect answers show the pink miss effect without damage. Escape returns
to the main menu. Switching to Math and back preserves both run states.

### Important scope and accessibility limitations

This is an **on-screen visual word-matching mode**, *not* microphone-based
reading. The React/browser version contains voice/speech recognition and
homophone handling; that microphone interaction is **not ported** to this
native OpenGL preview. The bitmap HUD uses an uppercase ASCII font; answer
cards clip long words after the first 20 characters on-screen, while
the current word prompt can show up to 45 characters. Long words are still
checked against their full original values by the ReadingSkill.

OWUnit verifies source-pool integration, stable distractors, correct/wrong
damage, independent Math and Reading states, and pause/resume scene isolation.
The Mesa/Xvfb smoke checks the real word glyph pixels, 3D reading scene,
selected cards and hit/miss graphics as well as switching to Math and back.
The complete six-skill browser game, microphone support and profile save
formats remain unchanged.

## Phase 2 PR #8 — Native Writing and on-screen spelling keyboard

The separate native OpenGL preview now offers **Activities → Writing**. It uses
the existing `WritingSkill` word pools, a third independent `Game` instance,
OW Engine scene isolation and the same `Game.answer()` combat rules.

**This is a word-copying/typing exercise, not full original image-based
spelling parity.** The source `WritingSkill` provides a word as both the prompt
and expected answer; since the native preview has not loaded the original
Minecraft item images, the HUD explicitly displays `COPY WORD <target>`.
Players construct their answer letter by letter on a **seven-page onscreen
virtual keyboard** using OW Graphics' existing supported input keys.

- **Left/Right arrows** select a letter page (1–7). **W/A/S/D** directly
  chooses one of four cells on the current page. Alternatively **Up/Down
  arrows** move through the four highlighted cells and **Space** selects one.
- Pages 1–6 offer **A–X**, and page 7 offers **Y**, **Z**, **CHECK** and
  **DELETE**. CHECK submits a nonempty word; DELETE removes its last letter.
  The input is bounded to 16 letters and never attempts an empty submission.
- Esc returns to the main menu. Math, Reading and Writing preserve independent
  monsters/health, questions and XP when switching. On Writing submission the
  original combat service applies damage/rewards, with native gold/pink effects.

The current SHA-pinned OW Graphics native bridge only accepts the named keys
W/A/S/D, arrows, Space, Left Shift and Escape; it **does not support arbitrary
A–Z physical keyboard events, Enter or Backspace**. This PR therefore does not
pretend that a hardware text box or full text-input abstraction exists. A later
graphics-runtime/API update can add Unicode character callbacks, IME, paste,
keyboard layouts and real image-based spelling clues.

`NativeWritingTest.ow` tests all seven pages, bounds, Delete/Check, text
composition via the virtual keyboard, correct/wrong Game damage and
Math/Reading state isolation. The Mesa/Xvfb `writing_smoke.ow` renders the
real virtual keyboard and sampled OpenGL framebuffer, submits an incorrect and
a correctly composed word, and verifies combat visuals and scene isolation.
The existing OW browser game and original React/Electron application are
unmodified.

## Phase 2 PR #9 — Native Cleaning (self-reported chore acknowledgement)

**Activities → Next → Cleaning** now opens an independent OW Engine scene
powered by the existing `CleaningSkill` task list and chest/container names.
The same OW Graphics 5×7 bitmap HUD displays the task text, chest label,
monster HP and four selectable buttons. Controls are W/A/S/D, arrow keys +
Space, and Escape to return to the main menu.

Cleaning is **not a quiz**. The interface requires pressing **Start Task**
before **Mark Done** becomes available. Mark Done submits the original
CleaningSkill answer `DONE` through the existing `Game.answer()` service,
which applies damage/XP and advances the chore prompt. Cancel gives no credit;
Help explicitly states that completion is self-reported, not parent verified.
A second Mark Done cannot submit the same task without another Start. Math,
Reading, Writing and Cleaning keep separate ECS scenes, combat state and
progression.

**Safety and parity limitation:** This native prototype does not sense
physical cleaning, contact parents, provide a trusted adult confirmation, or
offer an abuse-resistant reward system. It only records the player's own
acknowledgement, and displays generic procedural 3D geometry rather than a
migrated chest model. Never represent self-reporting as validated completion.

`NativeCleaningTest.ow` covers actual CleaningSkill integration, Start/Done
gating, cancellation, explicit Help text, independent Math state and inactive
ECS scene isolation. The Mesa/Xvfb `cleaning_smoke.ow` verifies task HUD
pixels, combat feedback and safe menu return, alongside all earlier GPU tests.
The full browser version and React/Electron deliverable remain unchanged.

## Phase 2 PR #10 — Native Memory matching (eight cards / four pairs)

**Activities → Next → Memory** now launches a fifth independent OW Engine
activity. The gameplay calls the existing `MemorySkill` (real randomized
shuffled eight-card deck, reveal, matches, pending mismatch, board cleared)
rather than implementing an alternate memory algorithm.

Due to the current four-card OW Graphics HUD, the **eight-card board appears
in two pages of four**. Left/Right switches pages. W/A/S/D selects an
individual card on the current page; arrows plus Space can also select a
highlighted card. Only revealed or permanently matched faces display their
word; unrevealed cards display `?`. A first flip reveals a word, a match
keeps two faces up and awards one combat hit, and a mismatch temporarily
reveals both until the next card flip. Completed matches cannot be scored
again. After four pairs, a new shuffled board is dealt, and combat/XP
progression persists in its own `Game` instance.

Unlike choice-based Math/Reading, matching a pair invokes `Game.hit()`
directly; **never call `Game.answer("")`** for Memory, because the memory
placeholder problem has an empty solution and that would regenerate the deck
after each hit. The board is intentionally renewed only after all four pairs
have been matched. The existing golden hit/pink miss effects are shared.

The renderer uses the existing OW 5×7 bitmap-glyph OpenGL shader; word faces,
page labels, match counters and the enemy HUD are updated in-place with
bounded geometry. No hidden card values are sent to visible HUD text.

`NativeMemoryTest.ow` checks the original pool's four unique pairs, hidden
cards, cross-page matching, duplicate-hit prevention, mismatch pending
cleanup, full board completion and isolation from Math. The real Mesa/Xvfb
`memory_smoke.ow` checks rendered HUD/card pixels, matching damage, hit
feedback and menu return. Existing web/Electron gameplay is unaffected.

This is still keyboard-based and shows **four cards at once**; migrating a
responsive eight-card native grid, textures, mouse input and full accessibility
remain subsequent improvements. **Patterns** is now covered by PR #11's study/recall adapter, described below.

## Phase 2 PR #11 — Native Patterns / sequence recall (sixth activity)

The **sixth and final native activity adapter** is accessible at
**Activities → Next → Patterns**. It uses the existing OW
`PatternsSkill`, which generates a repeating sequence of color names
and four candidate next colors. The OW Engine `patterns` scene has its own
`Game`, enemy HP and progression, independent of the five other native
activities. The same OW Graphics GPU shader/5×7 bitmap HUD renders the prompt,
the current stage and four highlighted action cards.

This port introduces an explicit two-step **Study → Recall** flow:

1. **Study** shows the repeating color sequence, potentially across two
   text rows. The buttons are Recall, Replay, Help and Menu. Replay keeps
   the same pattern visible and does not score; Recall hides the displayed
   sequence and begins the answer stage.
2. **Recall** displays four candidate colors. Select with W/A/S/D or the
   highlighted option using arrows plus Space. The original `Game.answer()`
   determines correctness, damage and XP, and generates the next sequence.
   Incorrect answers cause pink miss feedback without damage; correct
   answers cause gold hit feedback and normal combat progression.
3. Esc returns to the main menu and resumes the current stage unchanged.
   Invalid input never scores, and observing/help/replay never awards hits.

The four candidate colors remain **cached for each question**, so a displayed
choice always matches the value submitted to combat. `NativePatternsTest.ow`
covers all six routes, original `PatternsSkill` difficulty palette scaling,
study/recall gating, hidden prompt, correct/wrong combat behavior, independent
game state, and bounded GPU text geometry. The Mesa/Xvfb framebuffer smoke
tests actual HUD pixels, menu-to-Patterns routing, wrong/pink and correct/gold
feedback, and pause/resume isolation.

**Important distinction:** the original React Simon-Says game uses timed
flashing colors and audio. The current OW `PatternsSkill` itself provides
**text-based next-color sequence completion**, not timed flashing or sound.
This native PR implements and tests that existing OW behavior with a manual
study/recall stage. Timed visual sequences, sound cues, mouse/touch input,
original art and full React gameplay parity remain future work.

### Native migration status after PR #11

All **six activity entry points** now function in the opt-in OW Engine +
OW Graphics preview: Math, Reading, Writing, Cleaning, Memory and Patterns.
This marks the end of the first **activity migration** phase, not completion
of a shipping game. The native UI still needs a full asset pipeline,
real text/voice input, original image and audio challenges, mouse/touch
accessibility, durable profiles/saves, settings and cross-platform installers.
The existing complete React/Electron and browser games remain unchanged.

## Phase 3 PR #12 — Original sprite art and deterministic animation

The separate experimental OW Engine + OW Graphics preview now draws **actual
original repository PNG/JPEG imagery** as GPU-textured portraits, without
changing the existing source artwork or six-skill rules. Each playable activity
has a distinct badge: the existing Math, Writing, Cleaning/farm and Patterns
icons, the book/map reading item, and the wood badge for Memory. A mob portrait
uses the **actual current enemy name** where a PNG is present (Creeper, Zombie,
Skeleton, etc.); mobs whose only files are GIF/WebP show a neutral egg emblem
instead of a misleading other mob. These art billboards coexist with the
existing 3D block proxies and text-based battle HUD.

The pinned OW Graphics native decoder **rejects parent path traversal**:
`../public/assets/...` cannot load from the `ow/` interpreter root. New
`ow/scripts/stage-native-assets.mjs` reads a restricted allowlist from
`NativeArtCatalog.ow`, verifies those original images, and copies them
to the ignored `ow/assets/native/` directory. The developer launcher
stages them automatically for prepare/check/run; CI stages before GPU tests.
No binary duplication is committed.

`NativeBattleArt.ow` binds real `GRAPHICS_TEXTURE` and
`GRAPHICS_MESH` services, decodes PNGs into GPU textures once, uses a
bounded 2-triangle billboard mesh with alpha discard, animates a gentle
deterministic idle bob, and briefly shifts/tints the portrait on hit/miss.
The current mob image is replaced and the previous GPU texture is freed when
a new foe spawns. Both the six-icon cache and active enemy portrait, quad
and shader are explicitly destroyed **before closing the OpenGL context**,
also when two independent sessions are started sequentially.

The real Mesa/Xvfb `native_art_smoke.ow` validates original image handles,
billboard framebuffer pixels, visual animation, image switching and cleanup.
Pure OWUnit tests validate the asset catalog; Node tests verify the staging
allowlist, safe paths and byte-preserving copies. Existing GPU and OWUnit
tests remain active.

### Remaining native art and gameplay parity

This PR integrates **original 2D portraits and first native animation passes**,
not mesh-based character-model import, animated GIF decoding, skeletal
animation, timed Simon-Says, full sound playback or a complete art pipeline.
The existing cubes are still procedural placeholders. Advanced 3D models,
animation blending, audio, saves, accessible input and desktop packaging
require further PRs.

## Phase 3 PR #13 — Bundled native desktop distributions

See [Native desktop packages](NATIVE-DESKTOP.md) for Windows EXE, Linux and
macOS app-image downloads, the startup splash and the offline cached OW
modules. The installed native app never builds OW or Graphics on launch.
