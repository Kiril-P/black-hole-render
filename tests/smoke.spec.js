import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

async function expectCanvasHasPixels(page) {
  const screenshot = await page.locator('canvas').screenshot();
  const png = PNG.sync.read(screenshot);
  let brightPixels = 0;
  const stride = 16;

  for (let y = 0; y < png.height; y += stride) {
    for (let x = 0; x < png.width; x += stride) {
      const index = (png.width * y + x) * 4;
      if (png.data[index] + png.data[index + 1] + png.data[index + 2] > 18) {
        brightPixels += 1;
      }
    }
  }

  expect(brightPixels).toBeGreaterThan(20);
}

test.describe('black hole render', () => {
  test('loads and renders on desktop', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByLabel('Visual preset')).toHaveValue('Cinematic');
    await expectCanvasHasPixels(page);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'export' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^black-hole-.+\.png$/);
    expect(consoleErrors).toEqual([]);
  });

  test('keeps mobile controls usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByLabel('Black hole render controls')).toBeVisible();
    await page.getByLabel('Visual preset').selectOption('High Energy');
    await expect(page.getByLabel('Visual preset')).toHaveValue('High Energy');
    await expectCanvasHasPixels(page);
  });
});
