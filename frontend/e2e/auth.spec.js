import { expect, test } from '@playwright/test';

test.describe('Auth modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('auth modal opens and shows login tab by default', async ({ page }) => {
    // Click the first Log In / Sign Up button in the navbar
    await page.getByRole('button', { name: /log in/i }).first().click();

    await expect(page.getByTestId('auth-modal')).toBeVisible();
    await expect(page.getByTestId('auth-tab-login')).toBeVisible();
    await expect(page.getByTestId('auth-tab-signup')).toBeVisible();
  });

  test('login form has email and password fields', async ({ page }) => {
    await page.getByRole('button', { name: /log in/i }).first().click();

    await expect(page.getByTestId('auth-email-input')).toBeVisible();
    await expect(page.getByTestId('auth-password-input')).toBeVisible();
    await expect(page.getByTestId('auth-submit-btn')).toBeVisible();
  });

  test('switching to signup tab reveals username field', async ({ page }) => {
    await page.getByRole('button', { name: /log in/i }).first().click();
    await page.getByTestId('auth-tab-signup').click();

    await expect(page.getByTestId('auth-username-input')).toBeVisible();
    await expect(page.getByTestId('auth-email-input')).toBeVisible();
    await expect(page.getByTestId('auth-password-input')).toBeVisible();
  });

  test('submitting empty login form shows validation error', async ({ page }) => {
    await page.getByRole('button', { name: /log in/i }).first().click();
    await page.getByTestId('auth-submit-btn').click();

    // Should show an error message without closing the modal
    await expect(page.getByTestId('auth-modal')).toBeVisible();
    await expect(page.locator('text=Please fill in all fields')).toBeVisible();
  });

  test('pressing Escape closes the modal', async ({ page }) => {
    await page.getByRole('button', { name: /log in/i }).first().click();
    await expect(page.getByTestId('auth-modal')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByTestId('auth-modal')).not.toBeVisible();
  });

  test('clicking outside the modal closes it', async ({ page }) => {
    await page.getByRole('button', { name: /log in/i }).first().click();
    await expect(page.getByTestId('auth-modal')).toBeVisible();

    // Click the backdrop (the overlay div itself, outside the card)
    await page.mouse.click(10, 10);

    await expect(page.getByTestId('auth-modal')).not.toBeVisible();
  });
});
