# Code Wash RPG — in Ow

An educational RPG mini-game written in the
[Ow programming language](https://github.com/OW-Programing-Language):
object-oriented, **one class per file**, logic in classes and I/O in
`main` — the same style as the official `tictactoe`, `connect4` and
`guess-the-number` examples.

Answer math problems to defeat foes, earn XP and level up. It ports the
*engine* of a larger educational RPG (progression maths, difficulty
tiers, a mob bestiary, the combat loop and leveling), driven by the
**Math** skill as a complete vertical slice.

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
level up. Reach level 4 to finish the shift.

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

## Status

✅ **Runs on `ow run`.** Both modes were exercised end-to-end: the math
game (combat, kills, XP, level-ups), and the voice game's engine + sound
effects. `mic_transcribe` recognition was verified separately with a Vosk
model. Requires a current `ow-lang` build (audio/voice builtins + the
function-scope fix).

## Credits

Ported from the "Code Wash" educational RPG (a JavaScript/React/Electron
project). This repo contains the Ow engine port and a voice/audio mode.
