import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/home')
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page is accessible after redirect', async ({ page }) => {
    const response = await page.goto('/home')
    // Redirect chain ends at login, which returns 200
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })
})
