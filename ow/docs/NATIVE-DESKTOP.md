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
| macOS x64 (Intel) | `CodeWashRPG-macOS-x64.tar.gz` | `CodeWashRPG.app` |

**Keep all files together.** The Windows .exe is not a single-file
executable: it requires the sibling bundled runtime and app directories.
Unlike the separate `LevelUpRPG-Portable.exe` Electron distribution,
the new app starts the OW Engine + OW Graphics prototype.

On macOS these builds are unsigned and not notarized. Linux requires normal
desktop GPU/OpenGL system libraries. ARM64 and native installers are future
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
Actions workflow runs on Windows, Linux and Intel macOS, archives the complete
application directories and uploads the resulting bundles.

## Packaging verification

The packaged launcher accepts `--self-test` (checks files and pinned import
markers), `--check` (executes OW module checks completely offline), and
`--smoke` (runs existing two-window OpenGL resource-cleanup smoke).
CI runs self-test/check for all platforms and Mesa/Xvfb smoke for Linux.

This does not yet implement original React audio/UI parity, fully native
3D artwork, an autosave system or a code-signed installer.
