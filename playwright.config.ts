import { defineConfig, devices } from '@playwright/test'

/** Dedicated port so `reuseExistingServer` does not attach to another Vite app on the default 5173. */
const E2E_DEV_PORT = 5174
const e2eOrigin = `http://127.0.0.1:${E2E_DEV_PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ...(process.env.CI ? [['github' as const]] : []),
    ['html', { open: 'never', outputFolder: 'qa-reports/playwright-report' }],
    ['junit', { outputFile: 'qa-reports/playwright-junit.xml' }],
  ],
  use: {
    baseURL: e2eOrigin,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: [
    {
      command:
        'bash -lc "cd backend && python3 -m pip install -q -r requirements.txt && exec python3 run.py"',
      url: 'http://127.0.0.1:5000/health',
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
    },
    {
      command: `npx wait-on http://127.0.0.1:5000/health && npm run dev -- --host 127.0.0.1 --port ${E2E_DEV_PORT}`,
      url: e2eOrigin,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 180_000,
    },
  ],
})
