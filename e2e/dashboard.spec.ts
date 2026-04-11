import { expect, test } from './fixtures'
import {
  clearClientStorage,
  registerAndLandOnDashboard,
  uniqueEmail,
} from './helpers'

test.describe('Dashboard collaboration', () => {
  test.beforeEach(async ({ page }) => {
    await clearClientStorage(page)
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('shows project overview and key dashboard sections', async ({ page, authPage }, testInfo) => {
    const email = uniqueEmail(testInfo.workerIndex)
    await page.goto('/')
    await authPage.register({
      name: 'Dash User',
      email,
      password: 'dashpass12',
    })

    await expect(page.getByTestId('project-overview')).toBeVisible()
    await expect(page.getByTestId('quick-actions')).toBeVisible()
    await expect(page.getByTestId('team-avatars')).toBeVisible()
    await expect(page.getByTestId('dashboard-stats')).toBeVisible()
    await expect(page.getByTestId('task-progress-charts')).toBeVisible()
    await expect(page.getByTestId('activity-feed')).toBeVisible()
  })

  test('records task creation in the activity feed', async ({ page }, testInfo) => {
    const email = uniqueEmail(testInfo.workerIndex)
    await page.goto('/')
    await registerAndLandOnDashboard(page, {
      name: 'Activity User',
      email,
      password: 'actpass123',
    })

    await expect(page.getByTestId('activity-feed')).toContainText('No activity yet')

    await page.getByTestId('task-title').fill('Feed visibility test')
    await page.getByTestId('task-submit').click()

    await expect(page.getByTestId('activity-feed')).toContainText('Feed visibility test')
    await expect(page.getByTestId('activity-feed')).toContainText('Created')
  })

  test('toggles theme from the header', async ({ page }, testInfo) => {
    const email = uniqueEmail(testInfo.workerIndex)
    await page.goto('/')
    await registerAndLandOnDashboard(page, {
      name: 'Theme User',
      email,
      password: 'themepass1',
    })

    const isDark = () =>
      page.evaluate(() => document.documentElement.classList.contains('dark'))

    const start = await isDark()
    await page
      .getByRole('button', { name: start ? 'Switch to light mode' : 'Switch to dark mode' })
      .click()
    await expect.poll(isDark).toBe(!start)
    await page
      .getByRole('button', { name: (await isDark()) ? 'Switch to light mode' : 'Switch to dark mode' })
      .click()
    await expect.poll(isDark).toBe(start)
  })
})
