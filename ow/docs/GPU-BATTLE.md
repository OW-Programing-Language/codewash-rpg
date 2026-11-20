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
The terminal prints a math problem and four answers. Focus the OpenGL window
and press **W** (first option), **A** (second), **S** (third), **D** (fourth),
or **Esc** to close. Input is edge-triggered (release between repeated keys).
Correct answers use the existing `Game.answer()` and reduce monster HP;
CodeWash's original modular combat logic handles respawns/XP. The bar reflects
remaining monster HP (resetting when a new enemy spawns). The OpenGL window
does not yet display readable questions or accept text input.

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
