import { test, expect } from '@playwright/test'

test.describe('Sheets Page', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/sheets')
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page is accessible after redirect', async ({ page }) => {
    const response = await page.goto('/sheets')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })
})
