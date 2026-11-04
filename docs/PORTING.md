# Porting notes: Code Wash RPG → OW

This document records the scope of the OW port, the decisions behind
it, and the debt left for whoever continues it. (Scout rule: leave it
better documented than you found it.)

## Scope

**What CAN be ported to OW** — and is, here: the game's *engine* —
progression maths, difficulty tiers, mob bestiary, combat loop,
leveling — as a clean modular OOP program (one class per file, exactly
the convention of OW's own example games), runnable with `ow run`.

**Now possible via new ow-lang builtins:** audio (SFX + music) and the
microphone/speech reading skill. These were originally "not portable",
but `audio_play` / `audio_music` / `audio_stop` and `mic_transcribe`
(offline Vosk) were added to the language, so this repo now ships a
**voice + audio mode** (`main_av.ow`). See the parity matrix below.

**What still cannot be ported** (and is deliberately not faked): the
React DOM UI, `localStorage` saves, themes, images / sprites, and
animations. OW has no browser/React target, and its confirmed UI
widgets (`ui_button`, `ui_text`, `ui_grid`, `ui_row`, `ui_col`,
`ui_disc`) have **no free-text input field**, so typed-answer skills
run as a console shell.

The port implements the **Math** skill (typed, `main.ow`) and the
**Reading** skill (spoken, `main_av.ow`) as complete vertical slices,
and documents the rest below rather than stubbing fake versions.

## Feature parity matrix

| Original feature | Status in OW port | Note |
|------------------|-------------------|------|
| Progression maths (damage, mob HP, XP, difficulty) | ✅ Ported | `Progression.ow` |
| Difficulty tiers 1–7 (math) | ✅ Ported | `MathSkill.ow` |
| Encounter cycle (hostile / miniboss / boss) | ✅ Ported | `Progression.encounter` + `MobPool` |
| Mob bestiary (names) | ✅ Ported | `MobPool.ow`, names only |
| Combat loop + leveling | ✅ Ported | `Game.ow` |
| Math skill end-to-end | ✅ Ported | console shell in `main.ow` |
| Reading skill (voice) | ✅ Ported | `GameAV.ow` + `main_av.ow` — read the word aloud |
| Writing skill | ⛔ Not ported | needs word/image assets |
| Patterns / Memory / Cleaning skills | ⛔ Not ported | need sprites, grids of images |
| React DOM UI, animations | ⛔ Not portable | OW has no browser/React target |
| Sound effects / music | ✅ Ported | `Sound.ow` via `audio_play` / `audio_music` (added to ow-lang) |
| Microphone / speech recognition | ✅ Ported | `mic_transcribe` (offline Vosk, added to ow-lang) |
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
- **A clickable UI** would require either an OW text-input widget (not
  currently available) or reworking answers into multiple-choice
  buttons using `ui_button` + `ui_grid`.
- **Restore float XP scaling** if/when OW's float semantics are
  verified, to match the JS curve exactly.

### Done since the first version

- **Reading skill (voice)** — implemented in `GameAV.ow` / `main_av.ow`
  using the `mic_transcribe` builtin that was added to `ow-lang`.
- **Sound & music** — `Sound.ow` over `audio_play` / `audio_music`;
  effects ship in `assets/*.wav`.
- These closed the two biggest gaps from the original matrix (audio and
  microphone/speech), which were previously "not portable" until the
  builtins were added to the language.

## OW stdlib used (confirmed from official examples)

`rand(n)` (0..n-1), `input("prompt")`, `int(str)`, `print:`,
`array(n, default)`, list literals `[ ... ]`, string concatenation
with `+` (ints auto-convert), `switch`/`case`/`default`, `if`/`else`,
`while`. Negative values are written `0 - 1` (unary minus avoided),
and `>=`/`<=` are rewritten with `>`/`<` on integers.
