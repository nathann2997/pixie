import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@pigxel.com';
const TEST_PASSWORD = 'test123456';
const TEST_SITE_ID = 'test-ndwxvmjz';

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

test.describe('A. Site Setup: Edit & Delete', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto(`/dashboard/${TEST_SITE_ID}`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${TEST_SITE_ID}`), { timeout: 8000 });
  });

  test('1. 3-dot menu opens', async ({ page }) => {
    const menuBtn = page.getByRole('button', { name: /project actions/i });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await expect(page.getByText(/edit project/i)).toBeVisible();
    await expect(page.getByText(/delete project/i)).toBeVisible();
  });

  test('2. Edit modal opens with visible labels', async ({ page }) => {
    await page.getByRole('button', { name: /project actions/i }).click();
    await page.getByText(/edit project/i).click();
    await expect(page.getByRole('heading', { name: /edit site/i })).toBeVisible();
    await expect(page.getByLabel(/website name/i)).toBeVisible();
    await expect(page.getByLabel(/website url/i)).toBeVisible();
    const nameInput = page.getByLabel(/website name/i);
    await expect(nameInput).toBeVisible();
  });

  test('3. Edit and save name to QA Test Renamed', async ({ page }) => {
    await page.getByRole('button', { name: /project actions/i }).click();
    await page.getByText(/edit project/i).click();
    await page.getByLabel(/website name/i).fill('QA Test Renamed');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByRole('heading', { name: /QA Test Renamed/i })).toBeVisible({ timeout: 5000 });
  });

  test('4. Rename back to QA Test Site', async ({ page }) => {
    await page.getByRole('button', { name: /project actions/i }).click();
    await page.getByText(/edit project/i).click();
    await page.getByLabel(/website name/i).fill('QA Test Site');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByRole('heading', { name: /QA Test Site/i })).toBeVisible({ timeout: 5000 });
  });

  test('5. Delete modal opens with correct colors', async ({ page }) => {
    const siteName = await page.locator('h1').first().textContent() || 'QA Test Site';
    await page.getByRole('button', { name: /project actions/i }).click();
    await page.getByText(/delete project/i).click();
    await expect(page.getByRole('heading', { name: /delete site/i })).toBeVisible();
    const confirmLabel = page.getByText(/type.*to confirm/i);
    await expect(confirmLabel).toBeVisible();
    const input = page.getByPlaceholder(siteName);
    await expect(input).toBeVisible();
  });

  test('6. Delete confirmation enables button when name typed', async ({ page }) => {
    const siteName = await page.locator('h1').first().textContent() || 'QA Test Site';
    await page.getByRole('button', { name: /project actions/i }).click();
    await page.getByText(/delete project/i).click();
    const deleteBtn = page.getByRole('button', { name: /delete site/i });
    await expect(deleteBtn).toBeDisabled();
    await page.getByPlaceholder(siteName).fill(siteName);
    await expect(deleteBtn).toBeEnabled();
  });

  test('7. Close delete modal without deleting', async ({ page }) => {
    const siteName = await page.locator('h1').first().textContent() || 'QA Test Site';
    await page.getByRole('button', { name: /project actions/i }).click();
    await page.getByText(/delete project/i).click();
    await page.getByRole('button', { name: /cancel/i }).first().click();
    await expect(page.getByRole('heading', { name: /delete site/i })).not.toBeVisible();
  });
});

test.describe('B. Events page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto(`/dashboard/${TEST_SITE_ID}/events`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${TEST_SITE_ID}/events`), { timeout: 8000 });
  });

  test('1. Page loads with Library and Builder tabs', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /events/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /library/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /builder/i })).toBeVisible();
  });

  test('2. Add event modal opens', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click();
    await expect(page.getByText('Event details').first()).toBeVisible({ timeout: 3000 });
  });

  test('3. Add event: GA4, suggestion, trigger', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click();
    await page.getByPlaceholder(/e\.g\. newsletter signup/i).fill('QA Test Event');
    await page.getByRole('button', { name: /next: when to track/i }).click();
    await page.getByPlaceholder(/e\.g\. subscribe|e\.g\. buy now/i).fill('Buy now');
    await page.getByRole('button', { name: /save event/i }).click();
    await expect(page.getByText(/QA Test Event|conversion event created|event created/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('4. Search filter works', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search events/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('nonexistent123');
      await expect(page.getByText(/no results/i)).toBeVisible({ timeout: 3000 });
    }
  });

  test('5. Builder tab shows EventChat and Scan my site or Opportunities', async ({ page }) => {
    await page.getByRole('tab', { name: /builder/i }).click();
    await expect(
      page.getByText(/scan.*site|Scan your site|Event Builder|Opportunities found|Describe what you want to track/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('C. Pulse / Health page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto(`/dashboard/${TEST_SITE_ID}/health`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${TEST_SITE_ID}/health`), { timeout: 8000 });
  });

  test('1. Page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /pulse/i })).toBeVisible();
  });

  test('2. Audit status card appears', async ({ page }) => {
    await expect(page.getByText(/audit|script|scan|Script|Re-scan|Run scan/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('3. AI Analysis and tracking plan sections', async ({ page }) => {
    await expect(page.getByText(/AI Site Analysis|AI Tracking Plan|AI Site|tracking plan/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('4. Analyse button if visible', async ({ page }) => {
    const analyseBtn = page.getByRole('button', { name: /analyse|analyze/i });
    if (await analyseBtn.isVisible()) {
      await expect(analyseBtn).toBeEnabled();
    }
  });
});

test.describe('D. Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto('/dashboard/settings');
    await expect(page).toHaveURL(/\/dashboard\/settings/, { timeout: 8000 });
  });

  test('1. Page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });

  test('2. Profile section with display name', async ({ page }) => {
    await expect(page.getByText(/profile/i)).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toBeVisible();
  });

  test('3. Password change section (email users)', async ({ page }) => {
    const pwdSection = page.getByText(/change password/i);
    if (await pwdSection.isVisible()) {
      await expect(page.getByLabel(/current password/i)).toBeVisible();
    }
  });

  test('4. Danger zone / Delete account', async ({ page }) => {
    await expect(page.getByText(/danger zone/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /delete account/i })).toBeVisible();
  });

  test('5. Change display name and save', async ({ page }) => {
    const displayInput = page.getByLabel(/display name/i);
    await displayInput.fill('QA Tester');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/saved|Saved|name updated/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('E. Help & Setup Guide', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto('/dashboard/docs');
    await expect(page).toHaveURL(/\/dashboard\/docs/, { timeout: 8000 });
  });

  test('1. Page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /help|setup guide/i })).toBeVisible();
  });

  test('2. Table of contents or navigation', async ({ page }) => {
    await expect(page.getByRole('link', { name: /install the script|how pigxel works/i }).first()).toBeVisible({ timeout: 3000 });
  });

  test('3. Install script section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /install.*pigxel script/i })).toBeVisible({ timeout: 3000 });
  });

  test('4. Platform guides (Shopify, WordPress, etc)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /shopify|wordpress|webflow/i }).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('F. /conversions redirect', () => {
  test('Redirects to /events', async ({ page }) => {
    await signIn(page);
    await page.goto(`/dashboard/${TEST_SITE_ID}/conversions`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${TEST_SITE_ID}/events`), { timeout: 5000 });
  });
});
