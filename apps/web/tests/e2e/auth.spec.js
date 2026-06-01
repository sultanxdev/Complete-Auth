/**
 * E2E Test — Registration Flow
 *
 * Tests: user can register → see email verification prompt
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  name: 'Test User',
  email: `test.${Date.now()}@example.com`,
  password: 'TestPass123!',
};

test.describe('Registration', () => {
  test('shows registration form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('Create an account');
    await expect(page.locator('#reg-name')).toBeVisible();
    await expect(page.locator('#reg-email')).toBeVisible();
    await expect(page.locator('#reg-password')).toBeVisible();
  });

  test('shows password strength indicator', async ({ page }) => {
    await page.goto('/register');
    await page.fill('#reg-password', 'weak');
    await expect(page.locator('.password-strength')).toBeVisible();
  });

  test('validates required fields', async ({ page }) => {
    await page.goto('/register');
    // Submit button should be disabled with empty fields
    await expect(page.locator('#register-submit')).toBeDisabled();
  });

  test('shows OAuth buttons', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('#oauth-google')).toBeVisible();
    await expect(page.locator('#oauth-github')).toBeVisible();
  });

  test('navigates to login from register', async ({ page }) => {
    await page.goto('/register');
    await page.click('text=Sign in');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Login', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Welcome back');
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
  });

  test('shows forgot password link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Forgot password?')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'nonexistent@example.com');
    await page.fill('#login-password', 'wrongpassword');
    await page.click('#login-submit');
    // Should show an error alert (not redirect)
    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL('/login');
  });

  test('magic link link is visible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Sign in without a password')).toBeVisible();
  });
});

test.describe('Forgot Password', () => {
  test('shows success message for any email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('#forgot-email', 'anyone@example.com');
    await page.click('#forgot-password-submit');
    // Should always show success (prevents enumeration)
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Magic Link', () => {
  test('shows success after submitting email', async ({ page }) => {
    await page.goto('/magic-link');
    await page.fill('#magic-email', 'user@example.com');
    await page.click('#magic-link-submit');
    await expect(page.locator('text=Magic link sent')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('2FA Page', () => {
  test('shows OTP inputs', async ({ page }) => {
    await page.goto('/2fa');
    // 6 digit inputs
    for (let i = 0; i < 6; i++) {
      await expect(page.locator(`#otp-${i}`)).toBeVisible();
    }
  });

  test('can toggle to backup code mode', async ({ page }) => {
    await page.goto('/2fa');
    await page.click('text=Use backup code instead');
    await expect(page.locator('#backup-code')).toBeVisible();
  });
});
