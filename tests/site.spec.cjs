const { test, expect } = require('@playwright/test');
const SITE = 'http://127.0.0.1:8123';

test('Story opens and links to the district Explorer', async ({ page }) => {
  await page.goto(SITE + '/index.html');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explorer' })).toBeVisible();
});

test('Explorer loads all districts and allows keyboard map selection', async ({ page }) => {
  await page.goto(SITE + '/explorer.html');
  await expect(page.locator('#count')).toHaveText('33');
  const paths = page.locator('#map path[role="button"]');
  await expect(paths).toHaveCount(33);
  await paths.first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#card')).not.toHaveClass(/is-empty/);
});

test('District search exposes keyboard selection and accessibility states', async ({ page }) => {
  await page.goto(SITE + '/explorer.html');
  const query = page.locator('#q');
  await query.fill('Banaskantha');
  await expect(query).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#results [role="option"]').first()).toBeVisible();
  await query.press('ArrowDown');
  await expect(query).toHaveAttribute('aria-activedescendant', /district-option-/);
  await query.press('Enter');
  await expect(query).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#card')).toContainText('Banaskantha');
  await query.fill('Dahod');
  await query.press('Escape');
  await expect(query).toHaveAttribute('aria-expanded', 'false');
  await expect(query).toBeFocused();
});

test('Explorer reports failed fallback loading and recovers on retry', async ({ page }) => {
  await page.route('**/explorer.html', async route => {
    const response = await route.fetch();
    const original = await response.text();
    const withoutEmbedded = original.replace(
      /<script>window\.__DATA__=[\s\S]*?<\/script>/,
      '<script>window.__DATA__=null;</script>'
    );
    await route.fulfill({ response, body: withoutEmbedded });
  });
  await page.route('**/data/districts.json', route =>
    route.fulfill({ status: 503, contentType: 'text/plain', body: 'Unavailable' })
  );
  await page.goto(SITE + '/explorer.html');
  await expect(page.locator('#explorer-load-error')).toBeVisible();
  await page.unroute('**/data/districts.json');
  await page.getByRole('button', { name: 'Retry loading' }).click();
  await expect(page.locator('#count')).toHaveText('33');
  await expect(page.locator('#map path[role="button"]')).toHaveCount(33);
  await expect(page.locator('#explorer-load-error')).toBeHidden();
});

test('Mobile Story and Explorer retain navigation and district search', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(SITE + '/index.html');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto(SITE + '/explorer.html');
  const query = page.locator('#q');
  await query.fill('Kachchh');
  await expect(page.locator('#results [role="option"]').first()).toBeVisible();
  await query.press('Enter');
  await expect(page.locator('#card')).toContainText('Kachchh');
});
