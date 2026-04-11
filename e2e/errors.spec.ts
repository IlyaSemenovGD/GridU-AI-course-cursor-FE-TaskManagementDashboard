import { expect, test } from './fixtures'
import {
  clearClientStorage,
  fillLogin,
  registerAndLandOnDashboard,
  signOut,
  uniqueEmail,
} from './helpers'

test.describe('Validation and error handling', () => {
  test.beforeEach(async ({ page }) => {
    await clearClientStorage(page)
  })

  test('shows error when login password is wrong', async ({ page }, testInfo) => {
    const email = uniqueEmail(testInfo.workerIndex)
    const password = 'correctpass1'

    await page.goto('/')
    await registerAndLandOnDashboard(page, {
      name: 'Err User',
      email,
      password,
    })
    await signOut(page)

    await fillLogin(page, email, 'wrongpassword')
    await expect(page.getByTestId('login-error')).toContainText('Incorrect password')
  })

  test('shows error when email is not registered', async ({ page }) => {
    await page.goto('/')
    await fillLogin(page, 'nobody-ever@test.local', 'somepassword1')
    await expect(page.getByTestId('login-error')).toContainText('No account found')
  })

  test('shows error when register passwords do not match', async ({ page }, testInfo) => {
    const email = uniqueEmail(testInfo.workerIndex)
    await page.goto('/')
    await page.getByTestId('auth-tab-register').click()
    await page.getByTestId('register-name').fill('Mismatch User')
    await page.getByTestId('register-email').fill(email)
    await page.getByTestId('register-password').fill('password12')
    await page.getByTestId('register-password-confirm').fill('password34')
    await page.getByTestId('register-submit').click()
    await expect(page.getByTestId('register-error')).toContainText('do not match')
  })

  test('shows error when email is already registered', async ({ page }, testInfo) => {
    const email = uniqueEmail(testInfo.workerIndex)
    const password = 'duplicate12'

    await page.goto('/')
    await registerAndLandOnDashboard(page, {
      name: 'First User',
      email,
      password,
    })
    await signOut(page)

    await page.getByTestId('auth-tab-register').click()
    await page.getByTestId('register-name').fill('Second User')
    await page.getByTestId('register-email').fill(email)
    await page.getByTestId('register-password').fill(password)
    await page.getByTestId('register-password-confirm').fill(password)
    await page.getByTestId('register-submit').click()
    await expect(page.getByTestId('register-error')).toContainText('already exists')
  })
})
