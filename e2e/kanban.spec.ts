import { expect, test } from './fixtures'
import {
  clearClientStorage,
  registerAndLandOnDashboard,
  uniqueEmail,
} from './helpers'

test.describe('Kanban board', () => {
  test.beforeEach(async ({ page }) => {
    await clearClientStorage(page)
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('moves a task from To do to In progress via drag and drop', async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail(testInfo.workerIndex)
    await page.goto('/')
    await registerAndLandOnDashboard(page, {
      name: 'Kanban User',
      email,
      password: 'kanbanpass1',
    })

    await page.getByTestId('task-title').fill('Drag me to progress')
    await page.getByTestId('task-submit').click()
    await expect(page.getByTestId('task-card')).toContainText('Drag me to progress')

    await page
      .getByRole('navigation', { name: 'Workspace' })
      .getByRole('button', { name: 'Board', exact: true })
      .click()
    await expect(page.getByTestId('kanban-board')).toBeVisible()

    const card = page.getByTestId('kanban-task-card').filter({ hasText: 'Drag me to progress' })
    await expect(card).toHaveCount(1)

    const todoColumn = page.locator('[data-kanban-column="todo"]')
    const inProgressColumn = page.locator('[data-kanban-column="in-progress"]')

    await expect(todoColumn.getByTestId('kanban-task-card')).toHaveCount(1)
    await expect(inProgressColumn.getByTestId('kanban-task-card')).toHaveCount(0)

    await card.dragTo(inProgressColumn)

    await expect(todoColumn.getByTestId('kanban-task-card')).toHaveCount(0)
    await expect(inProgressColumn.getByTestId('kanban-task-card')).toHaveCount(1)
    await expect(inProgressColumn.getByText('Drag me to progress')).toBeVisible()
  })

  test('moves task to Done column and syncs with task card status', async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail(testInfo.workerIndex)
    await page.goto('/')
    await registerAndLandOnDashboard(page, {
      name: 'Done User',
      email,
      password: 'donepass12',
    })

    await page.getByTestId('task-title').fill('Finish on board')
    await page.getByTestId('task-submit').click()

    await page
      .getByRole('navigation', { name: 'Workspace' })
      .getByRole('button', { name: 'Board', exact: true })
      .click()

    const card = page.getByTestId('kanban-task-card').filter({ hasText: 'Finish on board' })
    const doneColumn = page.locator('[data-kanban-column="done"]')
    await card.dragTo(doneColumn)

    await expect(doneColumn.getByTestId('kanban-task-card')).toHaveCount(1)

    await page.getByRole('navigation', { name: 'Workspace' }).getByRole('button', { name: 'My tasks' }).click()
    await expect(page.getByTestId('task-status').first()).toHaveText('Done')
  })
})
