import { expect, test } from '@playwright/test';

test('loads the login screen', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: /Entra y prepárate/i })).toBeVisible();
});