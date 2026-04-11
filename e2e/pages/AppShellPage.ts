import { expect } from '@playwright/test'

import { BasePage } from './BasePage'

/**
 * Authenticated shell: sidebar, header, dashboard / tasks / kanban, etc.
 */
export class AppShellPage extends BasePage {
  readonly shell = this.page.getByTestId('app-shell')

  workspaceNav() {
    return this.page.getByRole('navigation', { name: 'Workspace' })
  }

  async expectShellVisible() {
    await expect(this.shell).toBeVisible()
  }

  async signOut() {
    await this.page.getByTestId('user-menu-button').click()
    await this.page.getByTestId('sign-out-button').click()
    await expect(this.page.getByTestId('auth-screen')).toBeVisible()
  }

  /** Task creation (dashboard quick create). */
  taskTitle() {
    return this.page.getByTestId('task-title')
  }

  taskSubmit() {
    return this.page.getByTestId('task-submit')
  }

  activityFeed() {
    return this.page.getByTestId('activity-feed')
  }
}
