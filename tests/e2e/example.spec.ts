import { test, expect } from '@playwright/test';

test('basic e2e test', async ({ page }) => {
    // Navigate to the base URL (which should be running on localhost:5000)
    await page.goto('/');
    // Basic assertion to ensure page loads (assuming there's a title with Trade Automator)
    // Just checking that something renders for now
    await expect(page).toHaveTitle(/Trade Automator|Vite/);
});
