# Porting status — browser game

The previous document described an early console-only engine and incorrectly
claimed that images, themes and browser rendering could not be supported.
The current entry point (src/main_ui.ow) uses the OW web runtime and renders
the game interface from OW. UiGame.ow is no longer its entry.

| Original | OW implementation |
| --- | --- |
| App.jsx orchestration | src/full/World.ow |
| gameUtils.js progression | src/full/Rules.ow |
| Word banks, artwork, difficulty content | Catalog generated from gameData.jsx |
| Math, reading, writing | src/full/Challenges.ow |
| Memory and Simon state in SkillCard.jsx | src/full/Challenges.ow |
| Achievement conditions | src/full/Awards.ow |
| Cards, drawers, dialogs | src/full/GameView.ow |
| Animations and borders | Original CSS plus web/game.css |
| Browser APIs | web/client.js transport/audio/microphone/fullscreen adapter |
| Browser storage | Three OW profiles saved to JSON on disk |

The browser receives rendered HTML and presentation effects, not the memory
deck or math/writing answer key. OW validates answers and card choices.
Simon playback necessarily transmits its sequence; OW validates selections.

## Differences from the original

- Functional browser port, not a pixel-identical React DOM clone. Layout and
  controls are rebuilt in OW. Text answers submit with Enter or the answer
  button; voice input has a keyboard fallback.
- OW owns file saves. React localStorage and earlier spelling-demo saves remain
  separate. The launcher does not replace the earlier native EXE.
- Perfect memory games increment their achievement counter; the JS UI defined
  that achievement but did not wire this update.
- The eighth badge is attainable after its boss; the JS award loop stopped at
  seven despite showing eight badge tiers.
- French translates controls and help. Original challenge words, skill
  descriptions, mob names and achievement names remain English.
- Reports download locally; neither version has a working remote report backend.

## Runtime and verification boundaries

The launcher uses the compatible local OW JAR instead of the old global ow
command. It requires web_ui, routes, JSON, floating-point literals, floor/ceil
and persistence. No compiler files are modified by this port.

Audio is fetched completely into Blob URLs before playback. This prevents the
existing OW web server's single-thread executor from blocking when an HTML
audio element only partially reads a large WAV file.

Core comparisons cover seven difficulties and levels 1–200 against original
JS functions. OW's integer/floor builtins impose a 32-bit range; arbitrarily
high endgame XP beyond that range is not guaranteed. Browser tests cover UI
interaction and images. Actual voice recognition depends on a supporting
browser, permission and its speech service; physical microphone hardware and
offline speech recognition are not claimed as tested. The original web font
may require network access on first load; a monospace fallback is provided.
