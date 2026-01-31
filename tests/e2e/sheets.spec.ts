import { test, expect } from '@playwright/test'
import { mockAuthSession } from './helpers/auth'

const MOCK_CONTACTS = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    company: 'Acme Corp',
    connection_stage: 'DRAFTED',
    email_status: 'SENT',
    mobile_phone: '+1234567890',
  },
  {
    id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    company: 'Tech Inc',
    connection_stage: 'DRAFTED',
    email_status: 'DRAFTED',
    mobile_phone: '+0987654321',
  },
]

test.describe('Sheets Page - Unauthenticated', () => {
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

test.describe('Sheets Grid - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page)

    await page.route('**/api/crm/contacts*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contacts: MOCK_CONTACTS,
          total: 2,
          page: 1,
          totalPages: 1,
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
  })

  test('renders sheets page with heading', async ({ page }) => {
    await page.goto('/sheets')
    await expect(page.locator('h1')).toContainText('Sheets')
  })

  test('displays search input', async ({ page }) => {
    await page.goto('/sheets')
    await expect(page.locator('input[placeholder="Search contacts..."]')).toBeVisible()
  })

  test('displays contact data in grid', async ({ page }) => {
    await page.goto('/sheets')
    await expect(page.locator('text=John Doe')).toBeVisible()
    await expect(page.locator('text=Acme Corp')).toBeVisible()
  })

  test('column selector toggle opens dropdown', async ({ page }) => {
    await page.goto('/sheets')
    const columnsButton = page.locator('button', { hasText: 'Columns' })
    await columnsButton.click()
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible()
  })

  test('column selector closes on second click', async ({ page }) => {
    await page.goto('/sheets')
    const columnsButton = page.locator('button', { hasText: 'Columns' })
    await columnsButton.click()
    await expect(page.locator('label', { hasText: 'Company' })).toBeVisible()
    await columnsButton.click()
    await expect(page.locator('label', { hasText: 'Company' })).not.toBeVisible()
  })
})
