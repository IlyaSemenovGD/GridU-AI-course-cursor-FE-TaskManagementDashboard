import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  clearClientStorage,
  registerAndLandOnDashboard,
  uniqueEmail,
} from './helpers'

function seriousViolations(
  violations: { impact?: string | null; id: string; help: string }[],
) {
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await clearClientStorage(page)
  })

  test('auth screen has no serious or critical axe violations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' })
    await expect(page.getByTestId('auth-screen')).toBeVisible({ timeout: 20_000 })

    const results = await new AxeBuilder({ page })
      .disableRules(['meta-viewport', 'color-contrast'])
      .analyze()

    expect(seriousViolations(results.violations)).toEqual([])
  })

  test('dashboard has no serious or critical axe violations after login', async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail(testInfo.workerIndex)
    await page.goto('/')
    await registerAndLandOnDashboard(page, {
      name: 'A11y User',
      email,
      password: 'a11ypass12',
    })

    await page.getByTestId('task-title').fill('Accessible task')
    await page.getByTestId('task-submit').click()
    await expect(page.getByTestId('task-card').first()).toBeVisible()

    const results = await new AxeBuilder({ page })
      .include('#main-content')
      .disableRules(['color-contrast'])
      .analyze()
    expect(seriousViolations(results.violations)).toEqual([])
  })

  test('skip link is focusable and points to main content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' })
    await expect(page.getByTestId('auth-screen')).toBeVisible({ timeout: 20_000 })

    const skip = page.getByRole('link', { name: /skip to main content/i })
    await skip.focus()
    await expect(skip).toBeFocused()
    await expect(skip).toHaveAttribute('href', '#main-content')
  })
})
