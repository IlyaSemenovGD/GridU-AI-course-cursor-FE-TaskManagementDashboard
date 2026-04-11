import type { Page } from '@playwright/test'

/** Base for all page objects — holds the Playwright `Page` and shared navigation. */
export abstract class BasePage {
  constructor(readonly page: Page) {}

  async goto(path = '/') {
    await this.page.goto(path, { waitUntil: 'load' })
  }
}
