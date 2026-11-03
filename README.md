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
| `src/Game.ow`        | Orchestrates the combat loop and leveling. |
| `src/main.ow`        | Console entry point (I/O only). |

## Status

⚠️ **Unverified build.** This code is written to Ow syntax/stdlib
confirmed from the official example repos, but has **not yet been run
through `ow run`**. Opened as a draft until verified on an Ow install.
A CI workflow (install Ow + run) is a TODO — see `docs/PORTING.md`.

## Credits

Ported from the "Code Wash" educational RPG (a JavaScript/React/Electron
project). This repo contains the Ow engine port only.
