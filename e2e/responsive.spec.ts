import { expect, test } from './fixtures'
import {
  clearClientStorage,
  registerAndLandOnDashboard,
  uniqueEmail,
} from './helpers'

test.describe('Responsive layout', () => {
  test.beforeEach(async ({ page }) => {
    await clearClientStorage(page)
  })

  test('mobile viewport shows menu control and opens sidebar', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const email = uniqueEmail(testInfo.workerIndex)

    await page.goto('/')
    await registerAndLandOnDashboard(page, {
      name: 'Mobile User',
      email,
      password: 'mobilepass1',
    })

    const openNav = page.getByRole('button', { name: 'Open navigation menu' })
    await expect(openNav).toBeVisible()

    await openNav.click()
    await expect(page.getByRole('navigation', { name: 'Workspace' })).toBeVisible()
    await page.getByRole('button', { name: 'Close navigation menu' }).click()
  })

  test('desktop viewport keeps sidebar visible without menu button', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    const email = uniqueEmail(testInfo.workerIndex)

    await page.goto('/')
    await registerAndLandOnDashboard(page, {
      name: 'Desktop User',
      email,
      password: 'deskpass12',
    })

    await expect(page.getByRole('navigation', { name: 'Workspace' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Open navigation menu' }),
    ).not.toBeVisible()
  })

  test('settings panel tabs scroll on narrow screens', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 360, height: 640 })
    const email = uniqueEmail(testInfo.workerIndex)

    await page.goto('/')
    await registerAndLandOnDashboard(page, {
      name: 'Settings User',
      email,
      password: 'setpass12',
    })

    await page.getByRole('button', { name: 'Open navigation menu' }).click()
    await page
      .getByRole('navigation', { name: 'Workspace' })
      .getByRole('button', { name: 'Settings', exact: true })
      .click()
    await expect(page.getByRole('tab', { name: 'Appearance' })).toBeVisible()
    await page.getByRole('tab', { name: 'Appearance' }).click()
    await expect(page.getByRole('combobox', { name: 'Theme' })).toBeVisible()
  })
})
