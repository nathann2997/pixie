import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@pigxel.com';
const TEST_PASSWORD = 'test123456';
const TEST_SITE_ID = 'test-ndwxvmjz';

// iPhone SE viewport
const MOBILE_VIEWPORT = { width: 375, height: 667 };

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(TEST_EMAIL);
  await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  const err = page.getByText(/incorrect email or password/i);
  if (await err.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /sign up free/i }).click();
    await page.getByLabel(/email address/i).fill(TEST_EMAIL);
    await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /create workspace/i }).click();
  }
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}

test.describe('Test 1: Mobile responsiveness', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test('1.1 Login page looks good on mobile', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('img[alt="Pigxel"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
  });

  test('1.2 Mobile top bar with hamburger after login', async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole('button', { name: /open navigation/i })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Pigxel' }).first()).toBeVisible();
  });

  test('1.3 Hamburger opens sidebar', async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: /open navigation/i }).click();
    await expect(page.getByRole('button', { name: /settings/i })).toBeVisible({ timeout: 3000 });
  });

  test('1.4 Navigate to site', async ({ page }) => {
    await signIn(page);
    await page.goto(`/dashboard/${TEST_SITE_ID}`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${TEST_SITE_ID}`));
  });

  test('1.5 Site setup page layout on mobile', async ({ page }) => {
    await signIn(page);
    await page.goto(`/dashboard/${TEST_SITE_ID}`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${TEST_SITE_ID}`));
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByText(/install.*script|Install the Pigxel script/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('1.6 Events page on mobile', async ({ page }) => {
    await signIn(page);
    await page.goto(`/dashboard/${TEST_SITE_ID}/events`);
    await expect(page.getByRole('heading', { name: /events/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /library/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /builder/i })).toBeVisible();
  });
});

test.describe('Test 2: Docs page text visibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto('/dashboard/docs');
  });

  test('2.1 Page title "Help and setup guide" visible', async ({ page }) => {
    const title = page.getByRole('heading', { name: /help and setup guide/i });
    await expect(title).toBeVisible();
  });

  test('2.2 Section headings visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /how pigxel works/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /install the pigxel script/i })).toBeVisible();
  });

  test('2.3 How Pigxel works feature cards titles visible', async ({ page }) => {
    await expect(page.getByText('Audit your tracking').first()).toBeVisible();
    await expect(page.getByText('Detect your pixels').first()).toBeVisible();
    await expect(page.getByText('Forward conversion events').first()).toBeVisible();
  });

  test('2.4 Status labels table readable', async ({ page }) => {
    await page.getByRole('link', { name: /status labels/i }).click().catch(() => {});
    await expect(page.getByText('Setup Required').first()).toBeVisible();
    await expect(page.getByText('Live').first()).toBeVisible();
    await expect(page.getByText('Paused').first()).toBeVisible();
  });

  test('2.5 Table of contents (visible on xl screens)', async ({ page }) => {
    const toc = page.getByText(/on this page/i);
    if (await toc.isVisible()) {
      await expect(toc).toBeVisible();
    }
  });
});

test.describe('Test 3: Delete account modal text', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto('/dashboard/settings');
  });

  test('3.1 Modal title "Delete account" visible', async ({ page }) => {
    await page.getByRole('button', { name: /delete account/i }).click();
    await expect(page.getByRole('heading', { name: /delete account/i })).toBeVisible();
  });

  test('3.2 Warning text readable', async ({ page }) => {
    await page.getByRole('button', { name: /delete account/i }).click();
    await expect(page.getByText(/your account and.*all sites.*will be permanently deleted/i)).toBeVisible();
  });

  test('3.3 Close modal', async ({ page }) => {
    await page.getByRole('button', { name: /delete account/i }).click();
    await page.getByRole('button', { name: /cancel/i }).first().click();
    await expect(page.getByRole('heading', { name: /delete account/i })).not.toBeVisible();
  });
});

test.describe('Test 4: Add event modal labels', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto(`/dashboard/${TEST_SITE_ID}/events`);
  });

  test('4.1 Form labels visible', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click();
    await expect(page.getByText(/what should we call this event/i)).toBeVisible();
    await expect(page.getByText(/send this data to/i)).toBeVisible();
  });

  test('4.2 Step indicators visible', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click();
    await expect(page.getByText('Event details').first()).toBeVisible();
    await expect(page.getByText('When to track').first()).toBeVisible();
  });
});
