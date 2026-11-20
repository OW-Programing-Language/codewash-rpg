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
