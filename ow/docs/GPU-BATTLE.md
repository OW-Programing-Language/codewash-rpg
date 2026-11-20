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
