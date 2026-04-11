/**
 * Playwright test fixture wiring Page Object Model instances.
 * Use: `import { test, expect } from './fixtures'`
 */
import { test as base, expect } from '@playwright/test'

import { AppShellPage } from './pages/AppShellPage'
import { AuthPage } from './pages/AuthPage'

export const test = base.extend<{ authPage: AuthPage; appShell: AppShellPage }>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page))
  },
  appShell: async ({ page }, use) => {
    await use(new AppShellPage(page))
  },
})

export { expect }
