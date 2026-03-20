import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@pigxel.com';
const TEST_PASSWORD = 'test123456';

test.describe('1. Authentication page', () => {
  test('loads correctly at /login', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveTitle(/Pigxel/);
  });

  test('shows logo/branding', async ({ page }) => {
    await page.goto('/login');
    const logo = page.locator('img[alt="Pigxel"]');
    await expect(logo).toBeVisible();
  });

  test('shows Google sign-in button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('shows email/password form with proper labels', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('empty fields show validation (required)', async ({ page }) => {
    await page.goto('/login');
    const submitBtn = page.getByRole('button', { name: /sign in/i });
    await submitBtn.click();
    // HTML5 validation should prevent submit - check form still visible
    await expect(page.getByLabel(/email address/i)).toBeVisible();
  });

  test('wrong credentials show user-friendly error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('wrong@test.com');
    await page.getByLabel(/^password$/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/incorrect email or password/i)).toBeVisible({ timeout: 5000 });
    // Should NOT show raw Firebase error codes
    await expect(page.getByText(/auth\/invalid-credential/i)).not.toBeVisible();
    await expect(page.getByText(/auth\/user-not-found/i)).not.toBeVisible();
  });

  test('sign-up toggle shows Create workspace form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/welcome back/i)).toBeVisible();
    await page.getByRole('button', { name: /sign up free/i }).click();
    await expect(page.getByText(/create your workspace/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create workspace/i })).toBeVisible();
  });
});

test.describe('2. Sign in with test account', () => {
  test('sign in or sign up with test@pigxel.com / test123456', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill(TEST_EMAIL);
    await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    // Wait for either redirect to dashboard or error message
    await Promise.race([
      page.waitForURL(/\/dashboard/, { timeout: 8000 }),
      page.getByText(/incorrect email or password/i).waitFor({ state: 'visible', timeout: 8000 }),
    ]).catch(() => {});
    if (page.url().includes('/login')) {
      await page.getByRole('button', { name: /sign up free/i }).click();
      await page.getByLabel(/email address/i).fill(TEST_EMAIL);
      await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /create workspace/i }).click();
    }
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});

test.describe('3. Dashboard / My Sites page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill(TEST_EMAIL);
    await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('redirects to /dashboard after sign-in', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('sidebar shows nav items: Setup, Events, Pulse, Settings, Help', async ({ page }) => {
    // When on /dashboard with no site selected, site-level nav may be hidden
    // Go to a site to see Setup, Events, Pulse
    const siteCards = page.locator('div.grid button');
    if (await siteCards.count() > 0) {
      await siteCards.first().click();
      await expect(page).toHaveURL(/\/dashboard\/[^/]+$/, { timeout: 5000 });
      await expect(page.getByRole('button', { name: 'Setup', exact: true })).toBeVisible({ timeout: 3000 });
      await expect(page.getByRole('button', { name: /^Events$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Pulse$/ })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /help/i })).toBeVisible();
  });

  test('New project button exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new project/i })).toBeVisible();
  });

  test('site switcher works when on a site', async ({ page }) => {
    const siteCards = page.locator('div.grid button');
    if (await siteCards.count() > 0) {
      await siteCards.first().click();
      await expect(page).toHaveURL(/\/dashboard\/[^/]+$/);
      const switcher = page.locator('button:has(svg.lucide-chevron-down)').first();
      await switcher.click();
      await expect(page.getByText(/add new site/i)).toBeVisible();
    }
  });
});

test.describe('4. Add Site Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill(TEST_EMAIL);
    await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('New project opens modal', async ({ page }) => {
    await page.getByRole('button', { name: /new project/i }).click();
    await expect(page.getByRole('heading', { name: /new project block/i })).toBeVisible();
    await expect(page.getByLabel(/project name/i)).toBeVisible();
    await expect(page.getByLabel(/website url/i)).toBeVisible();
  });

  test('create site and redirect to setup', async ({ page }) => {
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project name/i).fill('QA Test Site');
    await page.getByLabel(/website url/i).fill('https://qa-test.example.com');
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/[^/]+$/, { timeout: 8000 });
    await expect(page.getByRole('heading', { name: /QA Test Site/i })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('5. Site Setup page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill(TEST_EMAIL);
    await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    const siteCards = page.locator('div.grid button');
    const count = await siteCards.count();
    if (count > 0) {
      await siteCards.first().click();
    } else {
      await page.getByRole('button', { name: /new project/i }).click();
      await page.getByLabel(/project name/i).fill('QA Test Site');
      await page.getByLabel(/website url/i).fill('https://qa-test.example.com');
      await page.getByRole('button', { name: /create project/i }).click();
    }
    await expect(page).toHaveURL(/\/dashboard\/[^/]+$/, { timeout: 8000 });
  });

  test('shows site name, status badge, and URL', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByText(/live|setup|paused/i).first()).toBeVisible();
    await expect(page.locator('a[href^="http"]')).toBeVisible();
  });

  test('script install section with code block', async ({ page }) => {
    await expect(page.getByText(/install the pigxel script/i)).toBeVisible();
    await expect(page.locator('pre code')).toBeVisible();
    await expect(page.locator('pre').filter({ hasText: /script/ })).toBeVisible();
  });

  test('copy button for script tag', async ({ page }) => {
    await expect(page.getByRole('button', { name: /copy/i })).toBeVisible();
  });

  test('analytics IDs form shows GA4 and Meta Pixel fields', async ({ page }) => {
    await expect(page.getByText(/connect your analytics/i)).toBeVisible();
    await expect(page.getByLabel(/google analytics 4/i)).toBeVisible();
    await expect(page.getByLabel(/facebook.*meta pixel/i)).toBeVisible();
  });

  test('status toggle (Live/Paused)', async ({ page }) => {
    const toggle = page.getByRole('switch', { name: /toggle tracking/i });
    await expect(toggle).toBeVisible();
  });

  test('3-dot menu for Edit/Delete', async ({ page }) => {
    const menuBtn = page.getByRole('button', { name: /project actions/i });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await expect(page.getByText(/edit project/i)).toBeVisible();
    await expect(page.getByText(/delete project/i)).toBeVisible();
  });
});
