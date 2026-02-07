import { test, expect } from '@playwright/test';

test.describe('AppMinuta E2E', () => {
    test('homepage has title', async ({ page }) => {
        await page.goto('/');
        // Expect a title "to contain" a substring.
        await expect(page).toHaveTitle(/AppMinuta|Minuta/i);
    });
});
