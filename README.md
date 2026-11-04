# Code Wash RPG — in Ow

An educational RPG mini-game written in the
[Ow programming language](https://github.com/OW-Programing-Language):
object-oriented, **one class per file**, logic in classes and I/O in
`main` — the same style as the official `tictactoe`, `connect4` and
`guess-the-number` examples.

Answer challenges to defeat foes, earn XP and level up. It ports the
*engine* of a larger educational RPG (progression maths, difficulty
tiers, a mob bestiary, the combat loop and leveling) with **all six
skills** — Math, Reading (voice), Writing, Patterns, Cleaning and a
Memory mini-game — plus saved progress, achievements and themes.

> Not a 1:1 port of the original React app — Ow has no browser/React
> target. See [`docs/PORTING.md`](docs/PORTING.md) for the full
> scope/parity matrix and the deliberate deviations.

## Run it

1. Install Ow from the
   [ow-lang releases page](https://github.com/OW-Programing-Language/ow-lang/releases).
2. From the repo root:

   ```bash
   ow run src/main.ow
   ```

   Or open `src/main.ow` in **OwIDE** and click **Run ▶**.

Solve each problem to damage the current foe; clear foes to earn XP and
level up. Reach level 6 to finish the shift. **Your progress is saved** —
next run you resume where you left off (see Saves & achievements below).

## Voice + audio mode

A second entry point, `src/main_av.ow`, is a **reading** skill: each turn
shows a word and you **read it aloud** to attack. It uses the Ow audio
builtins for sound effects + looping music, and `mic_transcribe` for
offline speech recognition.

```bash
ow run src/main_av.ow
```

Requirements:
- **Ow with the audio/voice builtins** (`audio_play`, `audio_music`,
  `audio_stop`, `mic_transcribe`) and the function-scope fix — i.e. a
  build from current `ow-lang` `main`.
- **Speakers and a microphone.**
- A **Vosk model** unzipped at `models/vosk-en` (not included — ~40 MB).
  Get a small English model from <https://alphacephei.com/vosk/models>,
  e.g. `vosk-model-small-en-us-0.15`, and rename its folder to `vosk-en`.

Original sound effects live in `assets/sounds/` and are bundled in the repo. Running
with no audio device? Construct `Sound` and call `mute` (the default
`main_av` keeps sound on).

## Spelling (writing) mode

A third entry point, `src/main_wr.ow`, is the **Writing** skill: the foe's
word is shown with its letters **scrambled**, and you type the correctly-
spelled word to attack.

```bash
ow run src/main_wr.ow
```

Typed, so it needs no mic or audio — just a terminal. Shares the same
engine and saved progress as the other modes.

## Graphical mode

A fourth entry point, `src/main_ui.ow`, runs the spelling skill in a
**window**: it shows the foe's original image, the scrambled
word, a text field, and a "New foe" button — built with the Ow
`ui_image` / `ui_input` widgets.

```bash
ow run src/main_ui.ow                    # web page (default)
OW_UI_MODE=native ow run src/main_ui.ow  # native desktop window
```

Type the unscrambled word and press Enter to attack. Same engine and
saved progress as the other modes.

## Patterns mode

`src/main_pat.ow` is the **pattern-recognition** skill: read an arithmetic
sequence and type the next number to attack. The step size grows with
difficulty.

```bash
ow run src/main_pat.ow
```

Built on `GameTyped.ow`, a generic typed-combat loop that drives any skill
implementing `next` / `prompt` / `check` / `target` — so new typed skills
are just a small skill class.

## Cleaning mode

`src/main_clean.ow` is the **cleaning** skill (on brand for Code Wash):
the word is shown "dirty" — its letters split by junk characters — and
you type it clean to scrub it. The junk gets messier with difficulty.

```bash
ow run src/main_clean.ow
```

Also built on `GameTyped.ow`, using the string builtins to read through
the noise.

## Memory match (mini-game)

`src/main_mem.ow` is a standalone graphical **memory** game: a 4×4-ish grid
of face-down cards — click two to find matching pairs. Matches stay up,
mismatches flip back on your next click; clear the board (shown with your
move count), then click to reshuffle. Built from `ui_grid` + `ui_button`.

```bash
ow run src/main_mem.ow
```

## Difficulty

Difficulty **scales with your level** — one tier harder every 2 levels,
capped at tier 7. Higher tiers mean tougher problems/words and beefier
foes (mob HP and your damage grow together, so fights stay ~5 hits but
the numbers — and XP — climb). This is centralized in `Hero.scale()`, so
every mode scales the same way. The current tier is shown in the HUD.

## Themes

The bestiary is **themed**. New saves use the original mob artwork. Pick a theme and it
applies to every mode — the foe names and the graphical foe image:

```bash
ow run src/main_theme.ow   # 0 = Dungeon, 1 = Space, 2 = Original (default)
```

The choice is saved to `save/theme.json`. *Dungeon* fields goblins,
ogres and dragons; *Space* fields drones, mechs and motherships. Adding
another theme is a new method in `Theme.ow` (name pools + an image) and a
new id — no changes to the game modes.

## Saves & achievements

Both modes share the same saved progress (via the Ow `save`/`load`
builtins). After every kill the hero's `[level, xp, difficulty]` is
written to `save/progress.json`, and achievements are tracked in
`save/achievements.json`. On start the game resumes automatically
("Welcome back at level N!").

Achievements: **First Blood** (1st kill), **Apprentice** (lvl 2),
**Journeyman** (lvl 3), **Veteran** (lvl 5), **Sharpshooter** (10 kills).
Delete the `save/` folder to start over. See
[`docs/saves-achievements.md`](docs/saves-achievements.md).

## Cosmetics

Earning achievements unlocks cosmetic **hero badges**. Open the wardrobe
to equip one; the equipped badge then shows in **every mode's HUD** — as
a name tag (`<Veteran>`) in the console modes and as an emoji icon in the
graphical mode.

```bash
ow run src/main_cosmetics.ow   # view & equip unlocked badges
```

Badges map to the five achievements (e.g. *First Blood* → 🩸, *Veteran*
→ 🛡). The choice is saved to `save/cosmetic.json`; locked badges can't be
equipped until you earn their achievement.

## Module map (one class per file)

| File | Responsibility |
|------|----------------|
| `src/mathlib.ow`     | Free integer helpers (`imod`, `idiv`, `ipow`, `imin`) — no floats. |
| `src/Progression.ow` | Progression maths: damage, mob HP, XP, difficulty, encounter cycle. |
| `src/Problem.ow`     | Value object: a question string + its integer answer. |
| `src/MathSkill.ow`   | Generates problems per difficulty tier (1–7). |
| `src/Mob.ow`         | A single enemy: name + hit points. |
| `src/MobPool.ow`     | The bestiary (hostile / miniboss / boss name pools). |
| `src/Hero.ow`        | The player: level, XP, difficulty, health. |
| `src/Game.ow`        | Orchestrates the math combat loop and leveling. |
| `src/main.ow`        | Math-mode console entry point (I/O only). |
| `src/Sound.ow`       | SFX + music wrappers over the Ow audio builtins. |
| `src/ReadingWords.ow`| Word bank for the voice reading skill. |
| `src/GameAV.ow`      | Voice-mode combat loop (reads words aloud, plays sound). |
| `src/main_av.ow`     | Voice + audio entry point. |
| `src/store.ow`       | Save/load helpers for progress & achievements. |
| `src/Achievements.ow`| Achievement flags: check / persist / count. |
| `src/WritingSkill.ow`| Spelling skill: picks a word and scrambles its letters. |
| `src/GameWriting.ow` | Spelling-mode combat loop (type the unscrambled word). |
| `src/main_wr.ow`     | Spelling entry point. |
| `src/GameTyped.ow`   | Generic typed-combat loop driving any skill (`next`/`prompt`/`check`/`target`). |
| `src/PatternSkill.ow`| Pattern skill: arithmetic sequence, next number. |
| `src/main_pat.ow`    | Patterns entry point. |
| `src/CleaningSkill.ow`| Cleaning skill: read a word through inserted junk. |
| `src/main_clean.ow`  | Cleaning entry point. |
| `src/GameUI.ow`      | Graphical spelling game: renders a widget tree, reacts to events. |
| `src/main_ui.ow`     | Graphical (windowed) entry point. |
| `src/MemoryGame.ow`  | Memory match mini-game (clickable grid of cards). |
| `src/main_mem.ow`    | Memory match entry point. |
| `src/Theme.ow`       | Themed bestiary + foe image + title (selectable). |
| `src/MobPool.ow`     | The bestiary — now sourced from the active `Theme`. |
| `src/main_theme.ow`  | Theme selector (saves the choice). |
| `src/Cosmetics.ow`   | Hero badges unlocked by achievements; equip/persist. |
| `src/main_cosmetics.ow`| Wardrobe: view & equip cosmetic badges. |

## Status

✅ **Runs on `ow run`.** Both modes were exercised end-to-end: the math
game (combat, kills, XP, level-ups), and the voice game's engine + sound
effects. `mic_transcribe` recognition was verified separately with a Vosk
model. Requires a current `ow-lang` build (audio/voice builtins + the
function-scope fix).

## Packaging as a standalone .exe

`ow package` bundles the game (plus a Java runtime) into a double-click
app — no `ow run` or Java install needed on the target machine:

```bash
ow package src/main.ow --name CodeWashRPG --type console --out dist
# -> dist/CodeWashRPG/CodeWashRPG.exe  (self-contained app-image)
```

- `--type console` keeps a terminal for the typed modes (Math, Writing,
  Patterns, Cleaning); `--type gui` runs the graphical mode in a window.
- The packaged launcher runs the exact entry selected on the command line,
  even when `main.ow` is also present.

The graphical build uses the original Code Wash assets:

```bash
ow package src/main_ui.ow --name CodeWashRPG --type gui --out dist
```

Requires an ow-lang build with asset packaging and selected-entry support.
`assets/` and optional `models/` are copied recursively into `app/game/`.
Distribute the **whole `dist/CodeWashRPG/` folder**, not just its executable.
No Java installation is needed. Keep this folder writable: packaged saves are
stored under `app/game/save/`. Relative media paths work from any launch folder.
For voice mode, place the downloaded Vosk model in `models/vosk-en/` before
packaging `src/main_av.ow --type console`; no speech model is included here.

### Original artwork and audio

All 240 asset files from the original React game's `public/assets/` are included
byte-for-byte, excluding macOS `._*` metadata. `assets/original-manifest.json`
records their sizes and SHA-256 hashes. The original asset set is about 241 MiB;
the full app-image also includes its Java runtime.

New saves default to the Original theme: each hostile, miniboss and boss uses its
own original artwork. The graphical spelling game uses the original writing
icon, badge art, mob hurt/death sounds, UI effects and one of the six music tracks.
GIFs animate; `breeze.gif` is a 50-frame compatibility conversion of the retained
original WebP. The Sound on/off button mutes audio, and unavailable audio devices
do not prevent play. Existing Dungeon/Space saves keep their theme; select `2`
with `src/main_theme.ow` to switch to Original.

The complete asset set includes resources for React features not yet ported to
Ow, such as the axolotl collection. Bundling them does not add those mechanics.
To refresh the source assets and generated bestiary:

```bash
node scripts/import-original-assets.mjs /path/to/original/CodeWashGame
```

Keep `breeze.gif` alongside the imported WebP. No asset generation is needed.

### Validation

`node scripts/verify-assets.mjs` checks every original file by SHA-256 and all
literal media references. Pass `dist/CodeWashRPG/app/game` to check the package.
For a Windows GUI smoke check (requires a development JDK):

```powershell
javac -cp dist/CodeWashRPG/app/OwIDE.jar scripts/GuiSmoke.java
java -Dow.ui.mode=native -cp "scripts;dist/CodeWashRPG/app/OwIDE.jar" GuiSmoke gui-check.png
```

The check opens the packaged game, verifies all three displayed images, submits
wrong and correct answers, checks combat damage and the New foe button, saves
a screenshot, and closes the window. It does not require a microphone.

## Credits

Ported from the "Code Wash" educational RPG (a JavaScript/React/Electron
project). This repo contains the Ow engine port and a voice/audio mode.
