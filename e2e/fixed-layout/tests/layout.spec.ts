import { test, expect } from '@playwright/test';

test('page render test', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForSelector('.gedit-playground-pipeline');
});
