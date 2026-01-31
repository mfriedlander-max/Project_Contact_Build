import { test, expect } from '@playwright/test'
import { mockAuthSession } from './helpers/auth'

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)
  })

  test('displays error when contacts API fails', async ({ page }) => {
    await page.route('**/api/crm/contacts*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })

    await page.route('**/api/saved-views*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    })

    await page.goto('/sheets')
    const alert = page.locator('[role="alert"]')
    await expect(alert).toBeVisible({ timeout: 10000 })
  })

  test('toast container is present in the DOM', async ({ page }) => {
    await page.route('**/api/crm/contacts*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contacts: [],
          total: 0,
          page: 1,
          totalPages: 0,
        }),
      })
    })

    await page.route('**/api/saved-views*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    })

    await page.goto('/sheets')
    const toastContainer = page.locator('[aria-live="polite"]')
    await expect(toastContainer).toBeAttached({ timeout: 10000 })
  })
})
