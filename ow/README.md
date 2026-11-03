# Code Wash RPG — OW port

An object-oriented port of the Code Wash RPG **engine** into the
[OW programming language](https://github.com/OW-Programing-Language).
It reimplements the game's progression maths, difficulty tiers, mob
bestiary and combat loop as a modular, one-class-per-file OW program,
runnable from the command line.

> **Scope:** this is a faithful port of the *engine*, driven by the
> **Math** skill as a complete vertical slice. It is **not** a 1:1
> rewrite of the React app — OW has no browser/React target. See
> [`docs/PORTING.md`](docs/PORTING.md) for exactly what is and isn't
> ported, and why.

## Run it

1. Install OW from the
   [ow-lang releases page](https://github.com/OW-Programing-Language/ow-lang/releases)
   (a native installer is available, no Java required).
2. From this `ow/` folder:

   ```bash
   ow run src/main.ow
   ```

   Or open `src/main.ow` in **OwIDE** and click **Run ▶**.

You'll get a console loop: solve each problem to damage the current
foe, clear foes to earn XP, and level up. Reach level 4 to finish the
shift.

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

The design follows the official OW example games (`tictactoe`,
`connect4`, `guess-the-number`): logic lives in classes, I/O lives in
`main`, and free helper functions sit in their own file.

## Source of truth

Ported from the JavaScript original in this repo:

- `src/utils/gameUtils.js` → `Progression.ow`, `MathSkill.ow`
- `src/constants/gameData.jsx` → `MobPool.ow`, difficulty tiers in `MathSkill.ow`
- gameplay wiring in `src/App.jsx` → `Game.ow`
