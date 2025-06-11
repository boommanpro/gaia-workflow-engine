import { test } from '@playwright/test';

// ensure layout render
test.describe('page render screen shot', () => {
  test('screenshot', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('.gedit-playground-pipeline');
  });
});
