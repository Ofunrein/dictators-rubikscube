import { expect, test } from '@playwright/test';

test.describe('Page navigation', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/dictator|rubik/i);
  });

  test('simulator page loads without crashing', async ({ page }) => {
    await page.goto('/simulator');
    await expect(page.getByTestId('scramble-btn')).toBeVisible({ timeout: 10000 });
  });

  test('leaderboard page loads and shows tab options', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.getByRole('button', { name: /3x3/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /2x2/i })).toBeVisible();
  });

  test('unknown route redirects to landing page', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    await expect(page).toHaveURL('/');
  });
});
