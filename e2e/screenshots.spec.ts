import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

test.beforeAll(async () => {
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
  test('capture screenshots of all pages', async ({ page, context }) => {
    // Step 1: Trigger database migration so tables exist
    const migrateResponse = await page.request.get('/auth/migrate');
    expect(migrateResponse.ok()).toBeTruthy();

    // Step 2: Screenshot the landing page (unauthenticated)
    await page.goto('/');
    await page.waitForLoadState('load');
    await takeScreenshot(page, '01-landing');

    // Step 3: Screenshot the signup page
    await page.goto('/signup');
    await page.waitForLoadState('load');
    await page.waitForSelector('input[name="name"]');
    await takeScreenshot(page, '02-signup');

    // Step 4: Sign up via API (more reliable than clicking through the
    // Turnstile-guarded form - Turnstile widget may not resolve in CI)
    const signupResponse = await page.request.post('/auth/signup', {
      data: { name: 'Test User' },
    });
    expect(signupResponse.ok()).toBeTruthy();
    const signupData = await signupResponse.json();
    expect(signupData.user_id).toBeTruthy();

    // The API response sets auth cookies via Set-Cookie headers.
    // page.request shares the cookie jar with the browser context,
    // but we need to explicitly copy them so page navigations use them.
    const responseHeaders = signupResponse.headers();
    const setCookies = responseHeaders['set-cookie'];
    if (setCookies) {
      const cookieStrings = setCookies.split(/,(?=\s*\w+=)/);
      for (const cookieStr of cookieStrings) {
        const [nameVal] = cookieStr.trim().split(';');
        const eqIdx = nameVal.indexOf('=');
        if (eqIdx !== -1) {
          const cookieName = nameVal.substring(0, eqIdx).trim();
          const cookieValue = nameVal.substring(eqIdx + 1).trim();
          await context.addCookies([{
            name: cookieName,
            value: cookieValue,
            domain: 'localhost',
            path: '/',
          }]);
        }
      }
    }

    // Step 5: Navigate home - should now show the authenticated dashboard
    await page.goto('/');
    await page.waitForLoadState('load');
    await takeScreenshot(page, '03-home-dashboard');

    // Step 6: Screenshot authenticated pages
    const authenticatedPages = [
      { path: '/chores', name: '04-chores' },
      { path: '/recipes', name: '05-recipes' },
      { path: '/projects', name: '06-projects' },
      { path: '/household', name: '07-household' },
    ];

    for (const { path: pagePath, name } of authenticatedPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('load');
      await takeScreenshot(page, name);
    }
  });
});
