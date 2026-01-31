import { test, expect } from '@playwright/test'
import { mockAuthSession } from './helpers/auth'

test.describe('Settings Page - Unauthenticated', () => {
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

test.describe('Settings Page - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)

    await page.route('**/api/settings', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      })
    })

    await page.route('**/api/integrations*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    })

    await page.route('**/api/templates*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    })
  })

  test('renders settings page with heading', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('h1')).toContainText('Settings')
  })

  test('displays all three tabs', async ({ page }) => {
    await page.goto('/settings')
    const tabs = page.locator('[role="tab"]')
    await expect(tabs).toHaveCount(3)
    await expect(tabs.nth(0)).toContainText('Integrations')
    await expect(tabs.nth(1)).toContainText('Templates')
    await expect(tabs.nth(2)).toContainText('Automation')
  })

  test('Integrations tab is active by default', async ({ page }) => {
    await page.goto('/settings')
    const integrationsTab = page.locator('[role="tab"]', { hasText: 'Integrations' })
    await expect(integrationsTab).toHaveAttribute('aria-selected', 'true')
  })

  test('switches to Templates tab', async ({ page }) => {
    await page.goto('/settings')
    await page.locator('[role="tab"]', { hasText: 'Templates' }).click()
    const templatesTab = page.locator('[role="tab"]', { hasText: 'Templates' })
    await expect(templatesTab).toHaveAttribute('aria-selected', 'true')
  })

  test('switches to Automation tab', async ({ page }) => {
    await page.goto('/settings')
    await page.locator('[role="tab"]', { hasText: 'Automation' }).click()
    const automationTab = page.locator('[role="tab"]', { hasText: 'Automation' })
    await expect(automationTab).toHaveAttribute('aria-selected', 'true')
  })
})
