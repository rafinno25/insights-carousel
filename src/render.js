// Render: HTML (data-URI mandiri) -> buffer JPG via Playwright/Chromium headless.

import { chromium } from 'playwright';

export async function renderSlides(htmlBySlide, { width = 1080, height = 1350, scale = 2 } = {}) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: scale,
    });
    const out = {};
    for (const [name, html] of Object.entries(htmlBySlide)) {
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      // Pastikan font @font-face (data-URI) selesai dimuat sebelum screenshot.
      await page.evaluate(() => document.fonts.ready);
      // Pastikan semua <img> (data-URI) ter-decode.
      await page.evaluate(() =>
        Promise.all(
          Array.from(document.images).map((img) =>
            img.complete ? Promise.resolve() : img.decode().catch(() => {}),
          ),
        ),
      );
      out[name] = await page.screenshot({ type: 'jpeg', quality: 92 });
      await page.close();
    }
    return out;
  } finally {
    await browser.close();
  }
}
