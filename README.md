# Level Up RPG — CodeWash

> An educational desktop RPG where a child defeats monsters by answering
> **math, reading, writing, memory and pattern** challenges, earning XP, levels,
> badges, achievements and cosmetics.
>
> This repository is a **CodeWash** legacy-cleanup project: the app was entirely
> *vibe-coded* by a non-developer. We are stabilizing and cleaning it following
> the Code Wash Inc. protocol. **We do not rewrite it — we refactor it in small,
> reversible, test-backed steps.** See [`docs/DEBT.md`](docs/DEBT.md).

---

## 1. Quick start (newcomer, zero questions asked)

**Prerequisites:** [Node.js 20+](https://nodejs.org) (includes `npm`). Windows,
macOS or Linux for development; the shipped game targets **Windows**.

```bash
npm install        # install dependencies
npm run dev        # start the game in your browser (http://localhost:5173)
```

That's it — the game runs in the browser for development. To run it as the real
desktop (Electron) app:

```bash
npm run electron:dev   # builds, then opens the Electron window
```

## 2. Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload (browser) |
| `npm run build` | Production web build into `dist/` |
| `npm run electron:dev` | Build + launch the Electron desktop app |
| `npm run electron:build` | Package the Windows portable `.exe` into `release/` |
| `npm run lint` | ESLint (0 errors expected) |
| `npm test` | Run the test suite once (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run coverage` | Tests + coverage report (fails under thresholds) |

A full green check is: `npm run lint && npm test && npm run build`.

## 3. What the game is

- **Platform:** React 19 + Vite, wrapped in **Electron** for a Windows desktop
  build. Styling via Tailwind.
- **Players:** 3 local profiles, stored in the browser `localStorage`
  (no server, no account).
- **Skills:** `math`, `reading`, `writing`, `memory`, `patterns`, `cleaning`.
  Each has its own level, difficulty (1–7), badges and current monster.
- **Combat:** answer challenges to damage a monster (tuned for ~5 hits/kill);
  every 10th level is a **miniboss**, every 20th a **boss**.
- **Extras:** achievements (tiered + one-off), cosmetic **themes**, sound/music,
  optional **microphone** voice input for the reading skill, a parental
  verification gate, and a (currently stub) **bug report** button.

> ℹ️ The game art and many identifiers are currently **Minecraft-themed**
> (Zombie, Creeper, Ender Chest, …). This is pre-existing content from the
> vibe-coded original, tracked as debt — see [`docs/DEBT.md`](docs/DEBT.md).

## 4. Where things live

```
src/
  App.jsx                 # root component + most game state/orchestration (BIG — see DEBT)
  main.jsx                # React entry point
  components/
    skills/SkillCard.jsx  # the per-skill game screen (BIG — see DEBT)
    drawers/              # menu, settings, cosmetics side panels
    modals/               # reset, bug report, parental verification
    ui/                   # GlobalStyles, toasts, SafeImage, hearts…
  constants/              # gameData, achievements, assets (content/config)
  utils/                  # pure logic: gameUtils, achievementUtils, mobDisplayUtils,
                          #             soundManager (audio I/O boundary)
electron/                 # Electron main process (desktop shell)
public/assets/            # images, sounds, music
docs/                     # DEBT register, TESTING, ADRs, this handover material
.github/workflows/        # CI pipelines
```

For the full architecture map, state locations and I/O boundaries, read
[`docs/DEBT.md`](docs/DEBT.md).

## 5. Tests & quality

We froze the current behavior with **characterization tests** before touching
anything. Run them with `npm test`; see [`docs/TESTING.md`](docs/TESTING.md) for
how we test code that reads the clock or draws random numbers.

Quality gates (also enforced in CI on every pull request):
- `npm run lint` — 0 ESLint errors
- `npm test` — all tests green
- `npm run coverage` — fails below the configured thresholds

## 6. Project documentation

- [`docs/DEBT.md`](docs/DEBT.md) — technical debt register (codebase map,
  baseline metrics, risk matrix, attack plan). **Start here.**
- [`docs/TESTING.md`](docs/TESTING.md) — testing strategy.
- [`docs/adr/`](docs/adr/) — Architecture Decision Records (why, not just what).
- [`CHANGELOG.md`](CHANGELOG.md) — what changed vs. the version we received.

> An earlier experimental port into a custom "OW" language lives under `ow/` and
> is **out of scope** for this refactoring mission — tracked for removal as
> DEBT-11 in `docs/DEBT.md`.
