import { expect, type Page } from '@playwright/test'

export function uniqueEmail(workerIndex: number) {
  return `e2e-w${workerIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@test.local`
}

/**
 * Ensures a logged-out app state. Storage must be cleared *before* the bundle runs,
 * otherwise React may read `tm-session` on first paint. `addInitScript` runs prior to page scripts.
 */
export async function clearClientStorage(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      /* ignore */
    }
  })
  await page.goto('/', { waitUntil: 'load' })
  await page.evaluate(() => {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('tm-')) localStorage.removeItem(k)
      }
      sessionStorage.clear()
    } catch {
      /* ignore */
    }
  })
  await page.reload({ waitUntil: 'load' })
}

export async function registerAndLandOnDashboard(
  page: Page,
  opts: { name: string; email: string; password: string },
) {
  await page.getByTestId('auth-tab-register').click()
  await page.getByTestId('register-name').fill(opts.name)
  await page.getByTestId('register-email').fill(opts.email)
  await page.getByTestId('register-password').fill(opts.password)
  await page.getByTestId('register-password-confirm').fill(opts.password)
  await page.getByTestId('register-submit').click()
  await expect(page.getByTestId('app-shell')).toBeVisible()
}

export async function fillLogin(page: Page, email: string, password: string) {
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
}

export async function signOut(page: Page) {
  await page.getByTestId('user-menu-button').click()
  await page.getByTestId('sign-out-button').click()
  await expect(page.getByTestId('auth-screen')).toBeVisible()
}
