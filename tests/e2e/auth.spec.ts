import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test('renders sign-in heading', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('renders email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('renders sign-in button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('renders OAuth provider buttons', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Google' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'GitHub' })).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('nonexistent@test.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Authentication Guard', () => {
  test('unauthenticated user is redirected from /home to /login', async ({ page }) => {
    await page.goto('/home')
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected from /sheets to /login', async ({ page }) => {
    await page.goto('/sheets')
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected from /settings to /login', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })
})
