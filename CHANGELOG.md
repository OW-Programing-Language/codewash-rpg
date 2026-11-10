# Changelog

What changed between the version we received and the one we deliver.
Format loosely follows [Keep a Changelog](https://keepachangelog.com).

## [Unreleased] — CodeWash cleanup

### Added
- **Bug Reporting feature** (mission, DEBT-08): the main-menu Bug button now
  opens a real report form — description, optional email, screenshot
  attachments, and opt-in game-save + error-log bundling. The destination
  webhook and contact email are **configurable** (not hardcoded). Logic lives in
  `src/utils/bugReport.js` + `src/utils/errorLog.js` (pure, injectable transport,
  100% line coverage); UI in `BugReportModal.jsx`. See `docs/FEATURES.md` and
  `docs/adr/0002-bug-reporting.md`. Runtime errors are captured from startup
  (`main.jsx`).
- **Test suite** (Vitest 3 + v8 coverage) runnable in one command:
  `npm test` / `npm run coverage`. First **characterization tests** freeze the
  RPG progression, achievement and mob-display logic (56 tests). (DEBT-01)
- **CI quality gate** `.github/workflows/ci.yml`: lint + tests + coverage +
  build on every pull request; merge blocked on red.
- Documentation handover:
  - `README.md` — install/launch/test in minutes, codebase map.
  - `docs/DEBT.md` — technical debt register (map, baseline metrics, risk
    matrix, phased attack plan).
  - `docs/TESTING.md` — how we test clock/random/IO-bound game code.
  - `docs/adr/0001-testing-stack.md` — why Vitest 3.
  - This `CHANGELOG.md`.
- `npm` scripts: `test`, `test:watch`, `coverage`.

### Changed
- ESLint now ignores build/junk artefacts (`coverage`, `ow`, `**/._*`).

### Fixed
- **DEBT-00:** removed 687 macOS `._*` AppleDouble junk files that broke ESLint
  (28 parse errors → **0**).

### Notes / known debt
- The earlier `ow/` port (rewrite into a custom "OW" language) is **out of scope**
  for the CodeWash refactoring mission and is flagged for removal/archival
  (DEBT-11).
- Minecraft-themed hardcoded content remains (DEBT-10).

### Baseline metrics (as received, 2026-11-10)
- 6,938 LOC in `src/`; largest: App.jsx 1492, GlobalStyles 1302, SkillCard 778.
- 11 functions with cyclomatic complexity > 12 (worst: `SkillCard.jsx` = 107).
- Tests: 0 → 56. Coverage of tested utils: 98.5% lines.
