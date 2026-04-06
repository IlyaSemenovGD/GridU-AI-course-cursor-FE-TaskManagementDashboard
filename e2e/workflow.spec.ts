import { expect, test } from '@playwright/test'
import {
  clearClientStorage,
  fillLogin,
  registerAndLandOnDashboard,
  signOut,
  uniqueEmail,
} from './helpers'

test.describe('End-to-end user workflow', () => {
  test.beforeEach(async ({ page }) => {
    await clearClientStorage(page)
  })

  test('registers, creates and completes a task, deletes it, and logs out', async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail(testInfo.workerIndex)
    const password = 'testpass12'

    await page.goto('/')
    await expect(page.getByTestId('auth-screen')).toBeVisible()

    await registerAndLandOnDashboard(page, {
      name: 'Workflow User',
      email,
      password,
    })

    await expect(page.getByTestId('dashboard-main')).toBeVisible()
    await expect(page.getByTestId('tasks-empty')).toBeVisible()

    await page.getByTestId('task-title').fill('Ship E2E coverage')
    await page.getByTestId('task-description').fill('Playwright tests for TaskFlow')
    await page.getByTestId('task-priority').selectOption('high')
    await page.getByTestId('task-submit').click()

    await expect(page.getByTestId('task-list')).toBeVisible()
    await expect(page.getByTestId('task-card')).toHaveCount(1)
    await expect(
      page.getByTestId('task-card').getByRole('heading', { name: 'Ship E2E coverage' }),
    ).toBeVisible()

    await page.getByTestId('task-mark-complete').click()
    await expect(page.getByTestId('task-status')).toHaveText('Done')

    await page.getByTestId('task-delete').click()
    await expect(page.getByTestId('tasks-empty')).toBeVisible()

    await signOut(page)
  })

  test('logs in after registration', async ({ page }, testInfo) => {
    const email = uniqueEmail(testInfo.workerIndex)
    const password = 'loginpass12'

    await page.goto('/')
    await registerAndLandOnDashboard(page, {
      name: 'Login User',
      email,
      password,
    })
    await signOut(page)

    await fillLogin(page, email, password)
    await expect(page.getByTestId('app-shell')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })
})
