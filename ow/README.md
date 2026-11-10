# Code Wash RPG — OW port

An object-oriented port of the Code Wash RPG **engine** into the
[OW programming language](https://github.com/OW-Programing-Language).
It reimplements the game's progression maths, difficulty tiers, mob
bestiary and combat loop as a modular, one-class-per-file OW program,
runnable from the command line.

> **Scope:** a faithful port of the *engine* with **all six skills** playable —
> Math, Reading, Writing, Memory, Patterns and Cleaning — and a **graphical UI**
> (menu + battle screen) built on the Ow UI runtime. Skills plug into one shared
> combat loop. It renders in the browser (web) and as a native desktop window
> showing the original game art. See [`docs/PORTING.md`](docs/PORTING.md) for
> exactly what is and isn't ported, and why.

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

## Graphical version (menu + battle screen)

```bash
ow run src/main_ui.ow
```

Or open `src/main_ui.ow` in **OwIDE** and click **UI Web ▶** (browser) or
**UI Native ▶** (desktop window with the original art). The flow mirrors the
React app:

- **Menu** — themed background, the game logo, and a skill choice:
  **Math**, **Reading**, **Writing**, **Memory**, **Patterns** or **Cleaning** shift.
- **Battle** — the foe's name, its **sprite** (the original per-mob artwork), a
  red **HP bar**, the current problem, and the answer input — four **buttons**
  for Math/Reading, or a **text field** for Writing (type the word, press Enter;
  case-insensitive). Correct answers damage the foe; clearing foes grants XP and
  levels you up, with a live HUD: an **HP bar**, an **XP bar** toward the next
  level, and **sounds** (looping background music, a click on each action and a
  jingle on level-up — native backend).

The screens are built from the Ow UI primitives (`ui_backdrop`, `ui_card`,
`ui_image`, `ui_bar`, `ui_button`, …) in `UiGame.ow`; all game logic stays in the
engine classes. The native backend loads art from `../public/assets`, so run it
from this `ow/` folder.

## Module map (one class per file)

| File | Responsibility |
|------|----------------|
| `src/mathlib.ow`     | Free integer helpers (`imod`, `idiv`, `ipow`, `imin`) — no floats. |
| `src/Progression.ow` | Progression maths: damage, mob HP, XP, difficulty, encounter cycle. |
| `src/Problem.ow`     | Value object: a question string + its integer answer. |
| `src/MathSkill.ow`   | Generates math problems + answer options per difficulty tier (1–7). |
| `src/ReadingSkill.ow`| Reading word challenge + word options per difficulty (word length 3–8). |
| `src/WritingSkill.ow`| Writing/spelling challenge: type the word (text input), per-length pools. |
| `src/MemorySkill.ow` | Memory mini-game: a 4-pair card board; each match lands a hit. |
| `src/PatternsSkill.ow`| Pattern recognition: complete a repeating colour sequence (pick next). |
| `src/CleaningSkill.ow`| Cleaning: a themed chore card with a Complete! button; the foe is a chest sprite. |
| `src/Mob.ow`         | A single enemy: name + hit points. |
| `src/MobPool.ow`     | The bestiary (hostile / miniboss / boss name pools). |
| `src/Hero.ow`        | The player: level, XP, difficulty, health. |
| `src/Game.ow`        | Orchestrates the combat loop and leveling. |
| `src/main.ow`        | Console entry point (I/O only). |
| `src/MobArt.ow`      | Maps each mob name to its sprite file (ported from the JS asset maps). |
| `src/UiGame.ow`      | Graphical front-end: builds the menu/battle widget trees and handles UI events. |
| `src/main_ui.ow`     | Graphical entry point (opens the UI). |

The design follows the official OW example games (`tictactoe`,
`connect4`, `guess-the-number`): logic lives in classes, I/O lives in
`main`, and free helper functions sit in their own file.

## Source of truth

Ported from the JavaScript original in this repo:

- `src/utils/gameUtils.js` → `Progression.ow`, `MathSkill.ow`
- `src/constants/gameData.jsx` → `MobPool.ow`, difficulty tiers in `MathSkill.ow`
- gameplay wiring in `src/App.jsx` → `Game.ow`
