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

Sound effects live in `assets/*.wav` and are bundled in the repo. Running
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
**window**: it shows the foe as an image (`assets/foe.png`), the scrambled
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

The bestiary is **themed** rather than hardcoded. Pick a theme and it
applies to every mode — the foe names and the graphical foe image:

```bash
ow run src/main_theme.ow   # choose 0 = Dungeon (fantasy) or 1 = Space (sci-fi)
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

## Status

✅ **Runs on `ow run`.** Both modes were exercised end-to-end: the math
game (combat, kills, XP, level-ups), and the voice game's engine + sound
effects. `mic_transcribe` recognition was verified separately with a Vosk
model. Requires a current `ow-lang` build (audio/voice builtins + the
function-scope fix).

## Credits

Ported from the "Code Wash" educational RPG (a JavaScript/React/Electron
project). This repo contains the Ow engine port and a voice/audio mode.
