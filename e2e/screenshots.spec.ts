import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

test.beforeAll(async () => {
  // Ensure screenshots directory exists
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

// Use a longer timeout for the full screenshot flow
test.setTimeout(120_000);

async function takeScreenshot(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

test.describe('App Screenshots', () => {
  test('capture screenshots of all pages', async ({ page }) => {
    // Step 1: Trigger database migration so tables exist
    const migrateResponse = await page.request.get('/auth/migrate');
    expect(migrateResponse.ok()).toBeTruthy();

    // Step 2: Screenshot the landing page (unauthenticated)
    await page.goto('/');
    await page.waitForLoadState('load');
    await takeScreenshot(page, '01-landing');

    // Step 3: Screenshot the signup page
    // Note: Don't use 'networkidle' here because the Turnstile widget keeps polling
    await page.goto('/signup');
    await page.waitForLoadState('load');
    await page.waitForSelector('input[name="name"]');
    await takeScreenshot(page, '02-signup');

    // Step 4: Fill in signup form and submit
    await page.fill('input[name="name"]', 'Test User');
    await page.click('a.button.is-primary:has-text("Create")');

    // Wait for signup to complete - recovery code should appear
    await page.waitForSelector('.box .title', { timeout: 30_000 });
    await takeScreenshot(page, '03-signup-success');

    // Step 5: Navigate home - should now show the dashboard
    await page.goto('/');
    await page.waitForLoadState('load');
    await takeScreenshot(page, '04-home-dashboard');

    // Step 6: Screenshot authenticated pages
    const authenticatedPages = [
      { path: '/chores', name: '05-chores' },
      { path: '/recipes', name: '06-recipes' },
      { path: '/projects', name: '07-projects' },
      { path: '/household', name: '08-household' },
    ];

    for (const { path: pagePath, name } of authenticatedPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('load');
      await takeScreenshot(page, name);
    }
  });
});
