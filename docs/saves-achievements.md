# Saved progress & achievements

The math game now **remembers your hero between runs** and unlocks
achievements, using the Ow `save` / `load` builtins. This closes two of
the gaps with the original JavaScript game (which used `localStorage`).

## What persists

Two files are written under `save/` in the working directory:

| File | Contents |
|------|----------|
| `save/progress.json` | `[level, xp, difficulty]` |
| `save/achievements.json` | an array of 0/1 flags, one per achievement |

- On `start`, if `save/progress.json` exists the hero resumes from it
  ("Welcome back at level N!"); otherwise a fresh hero clocks in.
- After **every** kill, progress is saved and any newly-earned
  achievements are unlocked and announced in the game message.

## Achievements

| # | Name | Earned by |
|---|------|-----------|
| 0 | First Blood | your first kill |
| 1 | Apprentice | reaching level 2 |
| 2 | Journeyman | reaching level 3 |
| 3 | Veteran | reaching level 5 |
| 4 | Sharpshooter | defeating 10 foes |

The end-of-shift summary shows `N/5` unlocked.

## Reset

Delete the `save/` folder to start over.

## Files

| File | Responsibility |
|------|----------------|
| `src/store.ow` | `save_progress` / `load_progress` / `save_achievements` / `load_achievements` over the `save`/`load` builtins |
| `src/Achievements.ow` | fixed array of 0/1 flags; `check`/`persist`/`count_unlocked` |
| `src/Hero.ow` | added `restore(level, xp, difficulty)` |
| `src/Game.ow` | loads on `start`, saves + checks achievements in `reward` |

## Notes

- Achievements are a **fixed** set stored as a flag array, so no dynamic
  lists or maps are needed. Field arrays are mutated with the alias
  pattern (`set f: this.flags` then `set f[i]: 1`), matching the official
  OW example games.
- Verified across two sessions in one process: a fresh run leveled to 3
  and unlocked First Blood / Apprentice / Journeyman, writing
  `[3,0,1]` and `[1,1,1,0,0]`; a second `Game` then resumed at level 3
  with 3/5 achievements.
