import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: './qa-reports/coverage-frontend',
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/test/**', 'e2e/**'],
    },
    reporters: ['default', 'json', 'junit'],
    outputFile: {
      json: './qa-reports/vitest-results.json',
      junit: './qa-reports/vitest-junit.xml',
    },
  },
})
