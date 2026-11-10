# ADR 0001 — Testing stack: Vitest 3 + v8 coverage

- **Status:** accepted
- **Date:** 2026-11-10
- **Context:** CodeWash "build your safety net" task.

## Context

The project had no tests and no CI quality gate. We must add a test suite that
runs in a single command, with coverage, before merging any refactoring. The
project is built with **Vite** — more precisely with the `rolldown-vite` drop-in
(`vite: npm:rolldown-vite@7.2.5` in `package.json`, also pinned via `overrides`).

## Decision

Use **Vitest** as the test runner with **`@vitest/coverage-v8`** for coverage,
configured inside the existing `vite.config.js`.

We pin **Vitest 3+**. Vitest 2 crashes on this repo with
`ReferenceError: __vite_ssr_exportName__ is not defined`, because `rolldown-vite`
emits SSR module output that only Vitest 3's runtime understands. Vitest 3.2.7
runs the suite cleanly.

## Consequences

- One command for everyone: `npm test` / `npm run coverage`.
- Zero new build tooling — Vitest reuses the Vite pipeline, so tests see the
  exact same transforms as the app.
- Coverage thresholds in `vite.config.js` act as a merge gate (enforced in CI).
- We are tied to Vitest 3+ for as long as `rolldown-vite` is the Vite provider.
  If the project ever switches back to stock Vite, Vitest 2 would also work, but
  there is no reason to downgrade.

## Alternatives considered

- **Jest:** would need a separate Babel/transform setup and would not share the
  Vite config; more moving parts, more drift risk. Rejected.
- **Stay on Vitest 2 + downgrade Vite:** rejected — changing the app's build
  tool to satisfy the test runner is the wrong trade-off and risks regressions.
