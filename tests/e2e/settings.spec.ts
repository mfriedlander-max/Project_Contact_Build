import { test, expect } from '@playwright/test'

test.describe('Settings Page', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page is accessible after redirect', async ({ page }) => {
    const response = await page.goto('/settings')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })
})
