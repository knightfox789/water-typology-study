const { test, expect } = require('@playwright/test');
const SITE = 'http://127.0.0.1:8123';

test('Story opens and links to the district Explorer', async ({ page }) => {
  await page.goto(SITE + '/index.html');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explorer', exact: true })).toBeVisible();
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

test('Explorer filters reset and demand threshold can be restored', async ({ page }) => {
  await page.goto(SITE + '/explorer.html');
  const count = page.locator('#lcount');
  await expect(count).toHaveText('33 districts');
  await page.locator('#fsupply').selectOption('High');
  await expect(count).toContainText('of 33 districts match');
  await page.locator('#fclear').click();
  await expect(count).toHaveText('33 districts');

  const initial = await page.locator('#thrcount').innerText();
  const slider = page.locator('#thr');
  await slider.focus();
  await slider.press('End');
  await expect(page.locator('#thrcount')).not.toHaveText(initial);
  await page.locator('#thrreset').click();
  await expect(page.locator('#thrcount')).toHaveText(initial);
});

test('District deep links select the correct card', async ({ page }) => {
  await page.goto(SITE + '/explorer.html#/dahod');
  await expect(page.locator('#card')).toContainText('Dahod');
});

test('Touch selection opens a district card', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(SITE + '/explorer.html');
  await page.locator('#q').fill('Surat');
  await page.locator('#results [role="option"]').first().tap();
  await expect(page.locator('#card')).toContainText('Surat');
  await context.close();
});

test('No document-level horizontal overflow at reference widths', async ({ page }) => {
  for (const width of [320, 375, 768]) {
    await page.setViewportSize({ width, height: 812 });
    for (const url of ['/index.html', '/explorer.html']) {
      await page.goto(SITE + url);
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }));
      expect(dimensions.scroll, `${url} at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 2);
    }
  }
});
