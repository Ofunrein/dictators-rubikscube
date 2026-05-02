import { expect, test } from '@playwright/test';

test.describe('Simulator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/simulator');
    // Wait for the 3D canvas to mount
    await page.waitForSelector('[data-testid="scramble-btn"]');
  });

  test('loads with scramble, solve, and reset buttons visible', async ({ page }) => {
    await expect(page.getByTestId('scramble-btn')).toBeVisible();
    await expect(page.getByTestId('solve-btn')).toBeVisible();
    await expect(page.getByTestId('reset-btn')).toBeVisible();
  });

  test('size selector shows 2x2 and 3x3 options', async ({ page }) => {
    await expect(page.getByTestId('size-btn-2x2')).toBeVisible();
    await expect(page.getByTestId('size-btn-3x3')).toBeVisible();
  });

  test('scramble button triggers a scramble and enables the solve button', async ({ page }) => {
    // Solve button starts disabled (cube is already solved)
    await expect(page.getByTestId('solve-btn')).toBeDisabled();

    await page.getByTestId('scramble-btn').click();

    // After scramble, solve button should become enabled
    await expect(page.getByTestId('solve-btn')).toBeEnabled({ timeout: 10000 });
  });

  test('scramble followed by solve returns to a solved state', async ({ page }) => {
    await page.getByTestId('scramble-btn').click();
    await expect(page.getByTestId('solve-btn')).toBeEnabled({ timeout: 10000 });

    await page.getByTestId('solve-btn').click();

    // After solving, solve button should become disabled again (cube is solved)
    await expect(page.getByTestId('solve-btn')).toBeDisabled({ timeout: 15000 });
  });

  test('reset button returns cube to solved state', async ({ page }) => {
    await page.getByTestId('scramble-btn').click();
    await expect(page.getByTestId('solve-btn')).toBeEnabled({ timeout: 10000 });

    await page.getByTestId('reset-btn').click();

    // After reset, solve button should be disabled (cube is solved again)
    await expect(page.getByTestId('solve-btn')).toBeDisabled({ timeout: 5000 });
  });

  test('switching to 2x2 keeps scramble button enabled', async ({ page }) => {
    await page.getByTestId('size-btn-2x2').click();
    await expect(page.getByTestId('scramble-btn')).toBeEnabled();
  });

  test('timer start and reset buttons are present', async ({ page }) => {
    await expect(page.getByTestId('timer-action-btn').first()).toBeVisible();
    await expect(page.getByTestId('timer-reset-btn').first()).toBeVisible();
  });
});
