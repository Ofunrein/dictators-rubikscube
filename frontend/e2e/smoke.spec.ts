import { expect, test } from '@playwright/test';

test('landing page presents the product and primary call to action', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/The Dictators/i);
  await expect(page.getByText('INTERACTIVE LEARNING PLATFORM')).toBeVisible();
  await expect(page.getByRole('button', { name: /start solving/i }).first()).toBeVisible();
});

test('learn page loads the guided learning shell', async ({ page }) => {
  await page.goto('/learn');

  await expect(page.getByText(/learn the cube/i)).toBeVisible();
  await expect(page.getByLabel('Learning guide slides')).toBeVisible();
});

test('profile route handles signed-out users without Supabase credentials', async ({ page }) => {
  await page.goto('/profile');

  await expect(page.getByText(/not logged in/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /go home/i })).toBeVisible();
});
