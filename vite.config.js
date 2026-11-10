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
      ],
      // Baseline thresholds for the modules under test. Raise, never lower,
      // without logging a debt entry (subject: "no merge on red").
      thresholds: {
        lines: 80,
        functions: 80,
        // Honest baseline floor: the as-received utils are full of defensive
        // `||` fallbacks and even dead branches (e.g. mobDisplayUtils.js:36,
        // unreachable because every aura has an adjective). Current ~44-48%.
        // Raising this is a tracked debt item (DEBT.md); never lower it without
        // a new debt entry.
        branches: 40,
        statements: 80,
      },
    },
  },
})
