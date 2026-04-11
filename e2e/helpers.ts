import type { Page } from '@playwright/test'

import { AppShellPage } from './pages/AppShellPage'
import { AuthPage, type RegisterOpts } from './pages/AuthPage'

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

/** Delegates to {@link AuthPage.register} (Page Object Model). */
export async function registerAndLandOnDashboard(page: Page, opts: RegisterOpts) {
  await new AuthPage(page).register(opts)
}

/** Delegates to {@link AuthPage.login}. */
export async function fillLogin(page: Page, email: string, password: string) {
  await new AuthPage(page).login(email, password)
}

/** Delegates to {@link AppShellPage.signOut}. */
export async function signOut(page: Page) {
  await new AppShellPage(page).signOut()
}

/** Sidebar workspace navigation (same as `AppShellPage#workspaceNav()`). */
export function workspaceNav(page: Page) {
  return new AppShellPage(page).workspaceNav()
}
