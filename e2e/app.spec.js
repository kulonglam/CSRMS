const { test, expect } = require('@playwright/test');

async function openLogin(page) {
  await page.goto('/');
  await page.waitForSelector('#loginBtn', { state: 'visible' });
}

async function loginAsDirector(page) {
  await openLogin(page);
  await page.fill('#username', 'director');
  await page.fill('#password', 'Director@123');
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login')),
    page.click('#loginBtn'),
  ]);
  expect(response.ok()).toBeTruthy();
  await page.waitForURL(/dashboard-director\.html/, { timeout: 20000 });
}

test.describe('CSRMS login flow', () => {
  test('shows login page', async ({ page }) => {
    await openLogin(page);
    await expect(page.locator('.brand-text')).toContainText('Welcome back');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('director can log in and reach dashboard', async ({ page }) => {
    await loginAsDirector(page);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('rejects invalid credentials', async ({ page }) => {
    await openLogin(page);
    await page.fill('#username', 'director');
    await page.fill('#password', 'wrong-password');
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/login')),
      page.click('#loginBtn'),
    ]);
    expect(response.ok()).toBeFalsy();
    await expect(page.locator('.alert-danger')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/?$/);
  });
});

test.describe('CSRMS navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDirector(page);
  });

  test('sidebar links to products page', async ({ page }) => {
    await page.click('a[href="products.html"]');
    await page.waitForURL(/products\.html/);
    await expect(page.locator('h1')).toContainText('Products');
  });
});

test.describe('CSRMS API', () => {
  test('health endpoint responds', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
