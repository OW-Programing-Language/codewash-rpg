# Porting notes: Code Wash RPG → OW

This document records the scope of the OW port, the decisions behind
it, and the debt left for whoever continues it. (Scout rule: leave it
better documented than you found it.)

## Scope

**What CAN be ported to OW** — and is, here: the game's *engine* —
progression maths, difficulty tiers, mob bestiary, combat loop,
leveling — as a clean modular OOP program (one class per file, exactly
the convention of OW's own example games), runnable with `ow run`.

**What CANNOT be ported** (and is deliberately not faked): the React
DOM UI, Web Audio, the microphone / speech recognition, `localStorage`
saves, themes, images / sprites, and animations. OW has no
browser/React target, and its confirmed UI widgets
(`ui_button`, `ui_text`, `ui_grid`, `ui_row`, `ui_col`, `ui_disc`)
have **no free-text input field**, which the typed-answer skills
require.

Because of that, the port implements the **Math** skill as a complete,
real vertical slice (it is the only skill that needs no image/audio
assets), and documents the rest below rather than stubbing fake
versions of them.

## Feature parity matrix

| Original feature | Status in OW port | Note |
|------------------|-------------------|------|
| Progression maths (damage, mob HP, XP, difficulty) | ✅ Ported | `Progression.ow` |
| Difficulty tiers 1–7 (math) | ✅ Ported | `MathSkill.ow` |
| Encounter cycle (hostile / miniboss / boss) | ✅ Ported | `Progression.encounter` + `MobPool` |
| Mob bestiary (names) | ✅ Ported | `MobPool.ow`, names only |
| Combat loop + leveling | ✅ Ported | `Game.ow` |
| Math skill end-to-end | ✅ Ported | console shell in `main.ow` |
| Reading / Writing skills | ⛔ Not ported | need string compare + word/image assets |
| Patterns / Memory / Cleaning skills | ⛔ Not ported | need sprites, grids of images, audio |
| React DOM UI, animations | ⛔ Not portable | OW has no browser/React target |
| Web Audio (music / SFX) | ⛔ Not portable | no audio API in OW |
| Microphone / speech recognition | ⛔ Not portable | no Web Speech API in OW |
| `localStorage` profiles / saves | ⛔ Not ported | no persistence used in this slice |
| Themes / cosmetics / achievements | ⛔ Not ported | asset- and UI-bound |

## Deliberate deviations (and why)

1. **Integer-only XP.** The JS uses float scaling
   (`1.035^(level-1)`) and a `0.3^gap` penalty. OW's float behaviour
   is unverified in this hobby language, so the port uses the integer
   backward-compatible formulas (`xp_to_level = 100 × 3^(d-1)`) and an
   integer `/3`-per-gap penalty. This preserves the original's core
   invariant — *at the expected difficulty, one kill = one level* —
   without depending on floats.
2. **ASCII operators.** Problems render `*` and `/` instead of the
   unicode `×` / `÷` glyphs, for a clean console. Trivially swappable.
3. **Nightmare/PEMDAS tables trimmed to 12 each** (the JS has 25
   nightmare problems). The structure is identical; adding the rest is
   copy/paste into `MathSkill.nightmare`.
4. **Mob names kept Minecraft-themed verbatim** for a faithful port.
   The CodeWash brief flags hardcoded Minecraft names as debt to be
   re-branded — see "Residual debt" below.

## Residual debt / next steps

- **Re-theme mob names** in `MobPool.ow` to neutral branding (tracked
  by the CodeWash brief).
- **Port the Reading skill** once an OW string-equality check is
  confirmed; it is the next-cleanest skill (word in, typed word out).
- **A clickable UI** would require either an OW text-input widget (not
  currently available) or reworking answers into multiple-choice
  buttons using `ui_button` + `ui_grid`.
- **Restore float XP scaling** if/when OW's float semantics are
  verified, to match the JS curve exactly.

## OW stdlib used (confirmed from official examples)

`rand(n)` (0..n-1), `input("prompt")`, `int(str)`, `print:`,
`array(n, default)`, list literals `[ ... ]`, string concatenation
with `+` (ints auto-convert), `switch`/`case`/`default`, `if`/`else`,
`while`. Negative values are written `0 - 1` (unary minus avoided),
and `>=`/`<=` are rewritten with `>`/`<` on integers.
