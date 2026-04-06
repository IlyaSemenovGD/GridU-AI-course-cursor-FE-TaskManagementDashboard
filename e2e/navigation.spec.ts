import { expect, test, type Page } from '@playwright/test'
import {
  clearClientStorage,
  registerAndLandOnDashboard,
  uniqueEmail,
} from './helpers'

function workspaceNav(page: Page) {
  return page.getByRole('navigation', { name: 'Workspace' })
}

test.describe('Sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await clearClientStorage(page)
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('reaches each main view from the workspace sidebar', async ({ page }, testInfo) => {
    const email = uniqueEmail(testInfo.workerIndex)
    await page.goto('/')
    await registerAndLandOnDashboard(page, {
      name: 'Nav User',
      email,
      password: 'navpass123',
    })

    const nav = workspaceNav(page)

    await nav.getByRole('button', { name: 'My tasks' }).click()
    await expect(page.getByRole('heading', { name: 'My tasks' })).toBeVisible()
    await expect(page.getByTestId('tasks-workspace')).toBeVisible()

    await nav.getByRole('button', { name: 'Board', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Board', exact: true })).toBeVisible()
    await expect(page.getByTestId('kanban-board')).toBeVisible()

    await nav.getByRole('button', { name: 'Calendar' }).click()
    await expect(page.getByTestId('calendar-placeholder')).toBeVisible()

    await nav.getByRole('button', { name: 'Team' }).click()
    await expect(page.getByTestId('team-page')).toBeVisible()

    await nav.getByRole('button', { name: 'Dashboard' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByTestId('dashboard-content')).toBeVisible()

    await nav.getByRole('button', { name: 'Settings', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Profile' })).toBeVisible()
  })

  test('dashboard quick action opens settings', async ({ page }, testInfo) => {
    const email = uniqueEmail(testInfo.workerIndex)
    await page.goto('/')
    await registerAndLandOnDashboard(page, {
      name: 'Quick User',
      email,
      password: 'quickpass1',
    })

    await page.getByTestId('quick-actions').getByRole('button', { name: 'Workspace settings' }).click()
    await expect(page.getByRole('tab', { name: 'Appearance' })).toBeVisible()
  })
})
