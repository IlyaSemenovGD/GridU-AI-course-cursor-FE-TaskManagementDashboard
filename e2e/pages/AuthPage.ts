import { expect } from '@playwright/test'

import { BasePage } from './BasePage'

export type RegisterOpts = { name: string; email: string; password: string }

/**
 * Login / registration screen (`data-testid="auth-screen"`).
 */
export class AuthPage extends BasePage {
  readonly screen = this.page.getByTestId('auth-screen')

  async expectVisible() {
    await expect(this.screen).toBeVisible()
  }

  async openRegisterTab() {
    await this.page.getByTestId('auth-tab-register').click()
  }

  async openLoginTab() {
    await this.page.getByTestId('auth-tab-login').click()
  }

  /** Full registration flow; lands on authenticated app shell. */
  async register(opts: RegisterOpts) {
    await this.openRegisterTab()
    await this.page.getByTestId('register-name').fill(opts.name)
    await this.page.getByTestId('register-email').fill(opts.email)
    await this.page.getByTestId('register-password').fill(opts.password)
    await this.page.getByTestId('register-password-confirm').fill(opts.password)
    await this.page.getByTestId('register-submit').click()
    await expect(this.page.getByTestId('app-shell')).toBeVisible()
  }

  async login(email: string, password: string) {
    await this.openLoginTab()
    await this.page.getByTestId('login-email').fill(email)
    await this.page.getByTestId('login-password').fill(password)
    await this.page.getByTestId('login-submit').click()
  }
}
