/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for Electron compatibility
  test: {
    // Characterization & unit tests. See docs/TESTING.md.
    environment: 'node', // pure utils; component tests opt into jsdom per-file
    globals: true,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Only measure the modules we have put under test so far. As coverage
      // grows (see docs/DEBT.md), widen this include list.
      include: [
        'src/utils/gameUtils.js',
        'src/utils/achievementUtils.js',
        'src/utils/mobDisplayUtils.js',
        'src/utils/bugReport.js',
        'src/utils/errorLog.js',
        'src/i18n/translate.js',
        'src/i18n/config.js',
        'src/utils/themeUtils.js',
      ],
      // Baseline thresholds for the modules under test. Raise, never lower,
      // without logging a debt entry (subject: "no merge on red").
      thresholds: {
        lines: 80,
        functions: 80,
        // Baseline floor, ratcheted up as coverage grows. The as-received utils
        // have defensive `||` fallbacks and even dead branches (e.g.
        // mobDisplayUtils.js:36) that pull this down; the newer, well-tested
        // modules push it up. Current ~65%. Never lower without a debt entry.
        branches: 60,
        statements: 80,
      },
    },
  },
})
