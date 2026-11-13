# Standalone OW game with original assets

Launch `dist/CodeWashRPG/CodeWashRPG.exe`. The complete app folder is about
388 MiB and includes Java; distribute the whole folder. The executable alone
is not sufficient. No Java installation is needed on the target computer.

The build uses the current standalone OW game, checked out locally at
`.packaging/codewash-rpg`, and the compiler at `.packaging/ow-lang`.
These are separate Git repositories. The earlier `ow/` engine port in this
React project is not the source of this executable.

All 240 original files from `public/assets/` are bundled unchanged (excluding
macOS resource-fork metadata). The game uses original per-mob artwork, animated
sprites, writing icon, badges, music, and effects. The original Breeze WebP is
retained with an additional animated GIF for Java compatibility. Assets for
React-only mechanics are included, but those mechanics have not all been ported.

## Rebuild from this directory

Requires JDK 17+ with jpackage and Maven:

```powershell
mvn -B -f .packaging/ow-lang/pom.xml package
java -jar .packaging/ow-lang/target/OwIDE.jar package .packaging/codewash-rpg/src/main_ui.ow --name CodeWashRPG --type gui --out dist
node .packaging/codewash-rpg/scripts/verify-assets.mjs dist/CodeWashRPG/app/game
```

Close the game before rebuilding. Refresh the original asset import with:

```powershell
node .packaging/codewash-rpg/scripts/import-original-assets.mjs .
```

Keep the existing `breeze.gif` compatibility asset when reimporting. If its
source WebP changes, regenerate the animated GIF as well.

Packaged progress is stored in `dist/CodeWashRPG/app/game/save/`, so run the
portable folder from a writable location. Back up saves before rebuilding:
`ow package` replaces the output app-image. A Vosk model is only required for
voice mode; place it in `.packaging/codewash-rpg/models/vosk-en/` before packaging
`src/main_av.ow` with `--type console`.

## Validation and review

Compiler regression tests passed; the asset verifier checked 240 SHA-256 hashes
and 91 literal media references in the final app-image. GUI checks exercised
original images, incorrect/correct spelling, combat damage, and New foe.
The Windows executable opened its native window from an unrelated directory
using the bundled runtime. A GUI screenshot is at
`.packaging/original-assets-gui.png`.

- Compiler PR: https://github.com/OW-Programing-Language/ow-lang/pull/13
- Game/assets PR: https://github.com/OW-Programing-Language/codewash-rpg/pull/15

The executable, runtime, and local build folders are ignored by Git.
