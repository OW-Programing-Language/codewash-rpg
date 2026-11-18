# Testing strategy

## Why characterization tests first

The project arrived with **zero tests**. Before changing anything, we froze the
*current* behavior with **characterization tests**: they assert what the code
does today (not what it "should" do), so any refactoring that changes a value
fails loudly. This is the CodeWash "pre-wash" step.

## Stack

- **Runner:** [Vitest 3](https://vitest.dev) (native to this Vite project).
- **Coverage:** `@vitest/coverage-v8`.
- Config lives in `vite.config.js` under the `test` key.

> Note: this project depends on `rolldown-vite` (not stock Vite). Vitest **3+**
> is required — Vitest 2 fails with `__vite_ssr_exportName__ is not defined`.
> See `docs/adr/0001-testing-stack.md`.

## Commands

```bash
npm test            # run once
npm run test:watch  # watch mode
npm run coverage    # run + coverage report (fails under thresholds)
```

## Testing code that reads the clock / draws random numbers

A game reads the clock, rolls dice, plays sounds and listens to the mic — none
of that is directly testable. Our approach:

- **Randomness:** pin `Math.random` with `vi.spyOn(Math, 'random').mockReturnValue(x)`
  to make a branch deterministic, **and** separately assert invariants that must
  hold for *any* roll (e.g. "a generated math problem is always arithmetically
  correct", "a random mob is always a valid key"). See
  `src/utils/gameUtils.test.js`.
- **Clock:** inject a fake clock with `vi.useFakeTimers()` + `vi.setSystemTime(...)`.
  See the `recordLoginDate` tests in `src/utils/achievementUtils.test.js`.
- **Audio / mic / storage:** these are I/O boundaries. The plan (DEBT-02/03) is
  to isolate them behind thin modules so the domain logic can be tested without
  them. Until then we test the pure logic around them.

## Coverage thresholds

Thresholds (in `vite.config.js`) currently cover the **utils under test**:

| Metric | Threshold | Current |
|---|---|---|
| Lines | 80% | 98.5% |
| Statements | 80% | 98.5% |
| Functions | 80% | 100% |
| Branches | 40% (baseline floor) | ~44–48% |

Branches is a deliberately honest baseline: the as-received utils are full of
defensive `||` fallbacks that are hard to trigger. Raising it is tracked as debt
(DEBT.md). **Never lower a threshold without adding a debt entry explaining why.**

As we put more modules under test, widen `coverage.include` in `vite.config.js`
and raise the thresholds.
