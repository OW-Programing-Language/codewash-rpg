# Experimental OW Engine integration — PR #1

This is an **opt-in migration spike**, not a replacement of the CodeWash refactoring deliverable.
The shipping React/Vite/Electron application and the working OW browser entry
point `src/main_ui.ow` are unchanged. In particular, do **not** delete or archive
the original app or change its save format as part of this PR.

## Dependency graph

```text
CodeWash OW (this directory)
  ├── @flow    (SHA pinned; same commit as Engine and Graphics)
  ├── @owunit  (SHA pinned; OWUnit test runner)
  ├── @math    (existing question generator)
  ├── @engine  (SHA pinned; ECS, scenes, fixed-step runtime)
  └── @graphics (SHA pinned; matches Engine's own Graphics dependency)
```

The `dependencies.yml` and `dependencies.lock.yml` commits are intentionally
identical for each dependency. All three projects share one `@flow` version;
no library source is vendored into the game.

## Current integration boundary

- `src/engine/CodeWashEngine.ow` is a **headless** flOW composition root.
- OW Engine provides `entities`, `scenes` and a 16 ms `runtime`.
- OW Graphics provides the `GRAPHICS_RENDERER` headless service, with **no GPU**.
- The existing CodeWash `SkillsFunctor` and `CombatFunctor` provide
  `skills` and `game`; original math/combat rules remain authoritative.
- Scene names `menu` and `battle` are prepared for a future graphical UI.
- The browser game is **not yet connected** to this adapter. No OpenGL window,
  sprite migration or performance gain is claimed in this PR.

## Verify

Use the upstream OW compiler with dependency and OWUnit support (Java 17+):

```sh
cd ow
ow deps install
ow test tests/CodeWashEngineIntegrationTest.ow
ow test tests/
```

The new OWUnit test checks that the game and engine services boot together,
scene ticks remain isolated, original combat damages a monster, and Graphics
can render headlessly. The existing GitHub Actions `ow-tests` job runs all tests.
The unchanged JS app still uses `npm run lint && npm test && npm run build`.

## Next PR

Use the opt-in adapter for a small rendered battle scene. Keep `World.ow`
and the current browser and Electron builds intact until equivalent UI,
audio, persistence and accessibility behavior are tested. GPU tests must
validate actual pixels before real rendering is presented as supported.
