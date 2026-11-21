# Native OW desktop packages

The **OW Engine + OW Graphics** native CodeWash RPG has a separate
distribution pipeline; it does **not** use or replace Electron.

## Downloads

After the **Native OW Desktop Packages** GitHub Actions workflow is green,
download and extract the complete per-platform artifact:

| Target | Archive | Open |
|---|---|---|
| Windows x64 | `CodeWashRPG-Windows-x64.zip` | `CodeWashRPG/CodeWashRPG.exe` |
| Linux x64 | `CodeWashRPG-Linux-x64.tar.gz` | `CodeWashRPG/bin/CodeWashRPG` |
| macOS ARM64 (Apple Silicon) | `CodeWashRPG-macOS-arm64.tar.gz` | `CodeWashRPG.app` |

**Keep all files together.** The Windows .exe is not a single-file
executable: it requires the sibling bundled runtime and app directories.
Unlike the separate `LevelUpRPG-Portable.exe` Electron distribution,
the new app starts the OW Engine + OW Graphics prototype.

On macOS these builds are unsigned and not notarized. Linux requires normal
desktop GPU/OpenGL system libraries. Intel macOS (x64) and native installers are future
improvements.

## Build once, run without development tools

On the GitHub Actions build runner, the pipeline builds OW, the pinned
OW Graphics native provider for that OS, resolves all five OW modules
(`@math`, `@flow`, `@owunit`, `@graphics`, `@engine`), stages approved
PNG assets, compiles a small Java splash launcher and invokes `jpackage`
with a private Java runtime.

At every subsequent **double-click**, the platform-native launcher:

1. Displays a lightweight splash before OW Engine initialization.
2. Launches `dev.oreo.Main run src/engine/battle_gpu.ow` using the **bundled**
   Java and LWJGL binaries, with the correct working directory.
3. Loads the bundled OW source and cached modules. The OW compiler's
   `DependencyManager` recognizes the `.ow-resolved` commit markers
   and never invokes Git or the network for valid pinned dependencies.
4. Removes the splash once the game reports startup completion.

It performs **no Maven, Git, Node, download or build operation** during
startup. It intentionally uses a second JVM for the game because the pinned
Graphics PNG loader uses the process working directory. This design
significantly reduces work compared to the development launcher, but actual
cold-start time varies with machine and antivirus.

The resulting OS-native executable is a **jpackage Java launcher running OW
source through the interpreter**, not an LLVM-compiled machine-code game.

## Building yourself

Requires Java 17+ **JDK** with `jpackage`/`javac`/`jar`, Maven, Node
20+, Git and two sibling clones `../ow-lang` and `../OW-Graphics`.
Check out exactly `4f00a5b4da076b3062269c9861878fcb34b590e8` in Graphics.

```bash
mvn -B -DskipTests -f ../ow-lang/pom.xml install
mvn -B -DskipTests -f ../OW-Graphics/native-bridge/pom.xml package dependency:copy-dependencies -DoutputDirectory=target/lib
cd ow
java -jar ../../ow-lang/target/OwIDE.jar deps install
cd ..
npm run ow:native:test
npm run ow:native:package
node ow/scripts/verify-native-image.mjs
```

With custom clone paths:

```bash
node ow/scripts/package-native.mjs --compiler-dir /path/to/ow-lang --graphics-dir /path/to/OW-Graphics
```

Build on **each target OS**: native LWJGL binaries are OS-specific. The GitHub
Actions workflow runs on Windows, Linux and Apple Silicon macOS, archives the complete
application directories and uploads the resulting bundles.

## Packaging verification

The packaged launcher accepts `--self-test` (checks files and pinned import
markers), `--check` (executes OW module checks completely offline), and
`--smoke` (runs existing two-window OpenGL resource-cleanup smoke).
CI runs self-test/check for all platforms and Mesa/Xvfb smoke for Linux.

This does not yet implement original React audio/UI parity, fully native
3D artwork, an autosave system or a code-signed installer.

## Windows: splash closes without the game window

Versions before 1.13.1 could hide all OW/OpenGL errors behind the loading
screen. **Version 1.13.1 and newer** writes a diagnostic log before launching
the JVM, shows a blocking startup-error dialog if the child process crashes
or closes before presenting the first rendered frame, and displays an OpenGL
3.3-specific hint if GLFW cannot create its window. The splash only closes
automatically after the successful first OpenGL frame.

**Where the log is saved:**

```text
%LOCALAPPDATA%\OreoStudios\CodeWashRPG\logs\latest.log
```

Press `Win + R`, paste that path, and open the file in Notepad. On
subsequent launches the previous startup log is replaced. For bug reports,
copy the entire text, particularly the final `GPU STARTUP:` marker and the
first Java exception. Logs remain local and are never uploaded automatically.

The GitHub Windows CI graphics diagnostic on November 20, 2026 confirmed
that the bundled OW JVM and Windows LWJGL DLLs can load, but its Windows
Server 2025 runner could not create a **GLFW OpenGL 3.3 window**. That
virtualized CI machine may expose insufficient graphics support; this
is not proof that every Windows desktop has the same driver limitation.
The Windows GPU diagnostic remains nonblocking for this reason, and the
Windows package is released after its EXE self-test and offline import check.
The Linux package receives a mandatory real Mesa/Xvfb startup and rendering
test.

If your log includes:

```text
Unable to create a GLFW OpenGL 3.3 window
```

make sure you have current Intel/NVIDIA/AMD graphics drivers installed
from the hardware vendor and are launching in a local graphical session
rather than an incompatible Remote Desktop or virtual machine. Some older
GPUs may not support OpenGL 3.3 at all. The launcher cannot upgrade your
video driver; software-rendering fallback has not been implemented.

If you are running an old package and it exits without a dialog, you can
inspect the original Java exception through PowerShell using the packaged
runtime (replace the path with your extracted `CodeWashRPG` folder):

```powershell
cd "C:\path\to\CodeWashRPG\app\payload\ow"
& "..\..\..\runtime\bin\java.exe" -cp "..\..\OwIDE.jar;..\..\ow-graphics-native.jar;..\..\lib\*" dev.oreo.Main run src/engine/battle_gpu.ow
```

This uses the bundled Java installation and source dependencies; it does
not require Maven, Git, a JDK, or Node. If a GLFW exception is raised, copy
the stack trace instead of assuming a missing texture.

## Windows startup classpath bug fix (v1.13.2)

An actual Windows 11 crash report identified
`java.nio.file.InvalidPathException: Illegal char <*> at index 0: *`
inside `NativeLauncher.launch`. The previous code invoked
`appDir.resolve("lib").resolve("*")`, which Windows rejects before the
OW runtime ever starts. The fixed launcher appends the wildcard to a
**string classpath**, without using `Path.resolve("*")`; the Windows packaged
`--self-test` now builds and validates the same JVM classpath string.

**Download the build from the new PR #30 workflow run**. Do not reuse an
older `1.13.1` archive, which still contains the invalid wildcard path.
A valid Java classpath does not by itself guarantee that OpenGL 3.3 is
available on an individual's graphics driver; a separate JVM or GLFW error
will now be captured in `latest.log`.

## PR #32 wide-screen menu

Packages now include the original `themes/minecraft_logo.png` and
`themes/minecraft.png` PNGs and start the native OW game in a 1280×720
window. A centered menu card region, side panels and decorative heart strip
are drawn by OW Graphics directly. Packaged Windows/Linux/macOS builds
validate the original assets and all six native activity screens. The pinned
GLFW window adapter does not yet provide a fullscreen or resizable-window
API; those require a later OW Graphics extension.

## PR #33 — Animated carousel

Windows/Linux/macOS native app images include the OW-only six-card
carousel. Use **Left/Right** to navigate the central featured card,
**Space** to launch that skill, or W/A/S/D to use the existing quick menu.
Original skill icons remain packaged locally and are never reloaded during
the 12-frame smoothstep transition. GPU card geometry and artwork use
matching eased clip-space coordinates. This is not full Electron
monster-card parity and does not yet implement mouse or touch input.

## PR #34 native card UI

The native Windows/Linux/macOS app-images automatically include all
allowlisted PNG resources needed by the six rich Minecraft-style cards,
including existing monster portraits and their neutral egg fallback.
Card levels and HP come from the running native Game, not from static
preview literals. Portraits, colored headers, HP rails, descriptions and
action labels are rendered through OW Graphics/OpenGL. No Electron
resources, web downloads or build tools are used at launch.

## PR #35 — v1.13.3 Polish and Enter fixes

Download the new **v1.13.3** native Windows ZIP rather than an older
archive. The package uses a newly pinned OW Graphics bridge that accepts
`ENTER` and `KP_ENTER` alongside Space, includes a more compact GPU
font layout and preserves actual source image proportions. Mob portraits,
skill emblems and the logo use transparent **contain** fitting; the
theme background uses centered **cover** cropping without stretching.
None of this requires an Internet connection at launch.

## PR #36 — Native pointer input and hover / arrow controls

The native GLFW adapter now exposes `input.cursor_ndc()`, which transforms
logical window pointer positions into OpenGL normalized device coordinates.
The CodeWash menu uses the *same* `NativeMenuLayout.card_rect()` bounds for
drawing and hit-testing, including the center and two adjacent cards.

- Click the **center card** or its CTA to launch the actual native OW skill.
- Click a **side card**, or the left/right chevrons, to move by one skill.
- Click any of the four **footer actions** to perform the matching W/A/S/D menu choice.
- The selected control receives a smooth five-frame cyan hover outline,
  plus a subtle GPU-color pulse. Carousel sliding remains a separate
  twelve-frame eased animation.
- Mouse clicks have their own press-edge latch; holding/dragging does not
  repeatedly activate actions. Keyboard Enter, Space, ESC, and arrow keys
  stay supported. The mouse is menu-only; gameplay mouse interaction is
  not incorrectly advertised.

The new OW Graphics input commit is SHA-pinned in both lockfiles and native
build workflows so the Windows, Linux and macOS packaged JAR uses exactly the
same implementation as the interpreter. No Electron or browser processes.
Cursor hit testing is calibrated for the current fixed 1280x720 native
window. Fullscreen/resizing and more advanced transitions remain future work.

CI: `ow test tests/` includes `NativeMenuPointerTest.ow`, and the Linux
Mesa/OpenGL workflow runs `menu_pointer_smoke.ow` to check GPU hover
pixels, carousel/hover coexistence and GPU mesh cleanup.

## PR #37 — Electron-reference native visual composition (v1.13.5)

This is a **visual improvement**, not a claim of complete Electron parity.

The user-supplied reference was compared with the native menu and the native
renderer now places **five simultaneously visible cards** in a much tighter,
portrait-height arrangement. The selected card is tallest with a gold
two-stage GPU ring; two near cards and two darker outer cards flank it.
The carousel samples seven OW candidates while moving so entering edge
artwork is visible *before* the final selection rebase.

The original Minecraft logo is followed by a large golden `LEVEL UP!`
pixel headline. The giant bottom quick-action bars are removed in favor
of four compact **top-corner W/A/S/D** actions, while a small bottom line
explains arrow and Enter navigation. Ten pixel hearts remain in the footer.
Pointer hit boxes are rebuilt from the same layout functions as the GPU
quads (on top of PR #36).

**Fixed repeated egg images:** the live game mob label is now passed to the
case-sensitive PNG lookup without being uppercased. Only displayed text is
uppercased. For legitimate GIF-only original enemies (Ghast, Blaze, Warden,
Guardian, Phantom, Elder Guardian and Ender Dragon), Java 17 ImageIO converts
the *first source GIF frame* to PNG strictly at native build time. This uses
the project-owned `public/assets` originals and an explicit path allowlist;
no unrelated placeholder or new runtime decoder is shipped.

CI includes native OWUnit layout tests, Node stage/decoder tests, the
existing Mesa UI smoke checks with updated calibrated coordinates, and a new
`menu_visual_parity_smoke.ow` that verifies original textures, five cards,
gold GPU outline and preserved hearts. Windows, Linux and macOS packaging
remains a gate; Windows physical-device inspection remains **unchecked**.

**Still missing**: true font/SDF rendering, soft blur/compositing and layered
gradient effects, animated GIF playback (the conversion is a still frame),
fullscreen/DPI-resize support, rounded vector UI, and full Electron art/UI
parity. No unsupported completeness claim.

## Native Electron parity: restored toolbar and safe card headings (v1.13.6)

The original React/Electron source is the contract:
`src/App.jsx` defines Settings + Cosmetics on the upper-left, Fullscreen
+ Menu on the upper-right, and Bug Report at the bottom-right.
`src/components/skills/SkillCard.jsx` places a two-line
`skill name / fantasy title` block opposite a distinct level badge.

The native OW GPU UI now **renders all five controls using native geometry**
instead of four misleading W/A/S/D placeholder boxes. Mouse hitboxes are
shared with the actual GPU layout and never launch the wrong activity.
Settings opens a native drawer, Cosmetics opens a native theme selector
that switches among six real `THEME_CONFIG` background assets (and uses
dedicated logos where the Electron theme has them), Menu opens an
activities/help panel, and Bug Report opens a report/instructions panel.
Press Escape or the on-screen BACK action to return. Keyboard shortcuts
remain usable for the native game.

The fantasy title now occupies a dedicated fitted line *below* the skill
category; a separate reserved badge column always contains `LVL N`.
`NativeCardLabelFitTest` checks the entire unabridged Electron title
catalogue at all five card scales against the actual badge boundary.

**Honest parity status:** the original Electron Settings drawer includes
sound, profile, parental controls and other functionality that is not yet
ported. Native Bug Report currently provides GitHub reporting guidance,
not the original submission form. Fullscreen is visible but its action
opens a truthful explanatory Settings panel until the OW Graphics
GLFW window contract supports fullscreen. The alternative themes swap
the authentic backgrounds/logos but do not yet fully reskin mob artwork.
Rounded corners, gradients, fonts, dynamic scaling and screenshot-level
visual parity remain outstanding. No false 1:1-complete claim.

The native build still packages offline without Maven/Git at launch,
and runs `menu_toolbar_smoke.ow` under Mesa as well as OWUnit
and Windows/Linux/macOS portable packaging checks.

## PR #40 — Source-exact Electron card materials (v1.13.7)

Reference: `src/components/skills/SkillCard.jsx` (`h-[55%]` upper card,
`bg-[#3a3a3a]` lower panel, translucent cube pattern overlay,
dark monster label, border/glow styling) and
`src/constants/gameData.jsx` (six `colorStyle.background` gradients).

Native OW now uses its **own OpenGL 3.3 material shader** to reproduce the
same six CSS top/bottom gradient stops per activity, a 55% upper material,
dark lower panel, 6-pixel equivalent rounded clipping, a darker HP rail,
and deliberate center / near / far card brightness tiers.
The **original 67x100 transparent Cubes PNG**, referenced verbatim in
Electron from `https://www.transparenttextures.com/patterns/cubes.png`,
is vendored under `public/assets/patterns/cubes.png`, copied into the
native offline asset sandbox, and sampled as a seamlessly tiled repeating
`sampler2D` in GPU materials. No network dependency at runtime.
Because OW Graphics clamps GL texture edges, tiling is done with
`fract()` in GLSL.

Legacy solid-body and rectangle portrait backdrops have been removed so
the gradient is visible. The Minecraft mob portrait now sits in the upper
55%; the name, HP, two-line description and CTA are shifted into zones
corresponding more closely to their Electron layout.
The existing carousel advances and uploads texture/frame positions **once
per frame** in the same HUD pass: no texture lag during sliding.
Side-card text uses tagged native bitmap glyphs with near/far brightness
scales, preserving the old font and all keyboard controls.

Upstream cube pattern attribution: **Cubes** by **Sander Ottens**, via
Transparent Textures (https://www.transparenttextures.com/patterns/cubes.png).
Original source copy: https://github.com/mfurlend/transparenttextures/blob/master/cubes.png.
Review the original pattern's applicable redistribution terms before
shipping this bundled texture commercially; credit is retained here.

**Still not exact screenshot parity:** the rounded glass badges, polished
SDF/TTF glyphs, CSS-quality anti-aliased outer shadow compositing, actual
sprite GIF animation, dynamic scale, and complete Electron panel behavior
still need native ports. Do not claim full visual or functional parity.

Regression tests verify the original pattern bytes/dimensions and offline
staging. A Mesa/OpenGL smoke tests CSS-derived red/purple/blue surfaces,
lower dark material, all six cards, carousel animation and resource cleanup.

## PR #41 — Screenshot-based header, icon and label corrections (v1.13.8)

User's Windows native screenshot revealed several regressions after the
source-based Cubes material pass. The fixes here target those exact pixels:

- All five toolbar buttons now use `NativeToolbarArt.ow`, a dedicated
  OpenGL 3.3 signed-distance icon shader. It draws a toothed gear, two
  pointed sparkles, four fullscreen brackets, three round-ended menu
  lines and a six-legged bug. This replaces the chunky orange/green
  rectangles that mimicked icons but did not match React's Lucide UI.
- Rounded graphite buttons use clear white/gray, purple and pink icon
  palettes matching the Electron header. Their **real** click targets
  remain shared with `NativeMenuLayout` and `NativeMenuPointer`.
- The Bug Report control is raised and resized to stay completely
  within the 1280x720 window framebuffer instead of falling below
  the window/taskbar boundary.
- The overlaid activity emblems are removed from the card headers.
  Electron `SkillCard.jsx` shows category/fantasy text only there.
- Long fantasy titles wrap naturally at original word boundaries,
  leaving the level badge a separate safe column. Bitmap glyph
  spacing is capped so short words do not stretch the full panel.
  Monster name and CTA text are centered in their actual card pills.
- All scene navigation remains available: Settings, Themes, Menu, Bug
  Report, carousel and game input; existing functionality gaps in
  those panels/fullscreen are not misrepresented as completed.

OWUnit geometry regression tests cover title/badge clearance at all
five carousel depths. Mesa/OpenGL toolbar smoke probes visible
fullscreen/menu/sparkle/bug pixels, tests drawer navigation and verifies
shader/mesh cleanup. The full Windows, Linux and macOS packaging
matrix remains required.

**This is a correction PR, not a declaration of 1:1 Electron parity.**
Font rendering, real dynamic full-screen behavior, full settings and
report forms, and exact blurred glass/lighting need further work.

## PR #42 — Actual Electron VT323 typography in native OW (v1.13.9)

The user supplied a screenshot showing tiny 5x7, overly spaced and often
unreadable labels in the five native cards. The original Electron UI uses
`'VT323', monospace` (see `src/index.css`, `src/App.jsx` and
`src/components/ui/GlobalStyles.jsx`). Simply resizing the 5x7 bitmap
cannot reproduce its strokes and character shapes.

This native upgrade uses the **real VT323 Regular font**, licensed under
SIL Open Font License 1.1, from the Google Fonts repository:
`https://github.com/google/fonts/tree/main/ofl/vt323`.
The font and verbatim `OFL.txt` license are retained under
`ow/assets/fonts/` for reproducible native build-time rasterization.

During packaging, `ow/scripts/Vt323Atlas.java` renders a deterministic
10x8 / 220x320 RGBA character atlas with 76 glyphs, including lowercase
letters, digits, punctuation and the apostrophe in *Match n' Hatch*.
`ow/scripts/stage-native-assets.mjs` places the **PNG only** under
`ow/assets/native/fonts/vt323-atlas.png`, so the app loads it using the
existing OW Graphics ImageIO/OpenGL texture API **offline**, without
Electron, browser, font APIs or network calls at runtime.

Native `BattleHudText` distinguishes VT323 menu glyphs from original
5x7 gameplay glyphs with explicit GPU vertex tags, preserving game HUD
compatibility and gold/shaded text. Cards have a consistent typographic
hierarchy: uppercase small activity label, readable mixed-case fantasy
name (split on word boundaries), independent `Lvl 1` badge, title-case
mob name in the pill and a centered CTA. Long headings on far cards are
summarized instead of crushed into illegible characters. The gameplay
mode still uses its existing font, with no extra runtime dependency.

Tests: OWUnit glyph-code/case/fade regressions; full card/badge geometry
tests; deterministic VT323 atlas staging & PNG dimensions; Mesa/OpenGL
rendering, carousel animation and texture cleanup; offline Windows,
macOS and Linux native packaging.

Remaining for exact 1:1: full antialiased font blending at arbitrary
DPI, subpixel layout, original Electron panel logic, proper fullscreen,
and physical Windows screenshot comparison. These remain unchecked.

### VT323 correction following Windows visual feedback (v1.13.10)

The first VT323 Windows screenshot revealed a **severe legibility regression**:
characters were as little as five actual ink pixels wide with giant
inter-character tracking. Initial automated checks tested presence of
glyph geometry and atlas sampling but did not constrain physical ink size.

Fixes: 32pt VT323 with a narrower 22×40 cell, glyph quads sized at
112% of their advance to compensate for the internal VT323 side bearings,
a tighter 0.026-NDC maximum advance, a substantially larger hero headline,
drawer body text and button labels, and less aggressive near/far dimming.
The glyph-right-edge badge test remains unchanged. OWUnit now asserts
actual minimum glyph quad width, headline height, spacing and card title
geometry, preventing the same tiny/over-spaced regression.

**Physical Windows GPU screenshot comparison remains mandatory.**
