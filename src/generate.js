// Pipeline inti: URL artikel -> 4 buffer JPG carousel, sepenuhnya di memori.
// Dipakai bersama oleh CLI (src/index.js) dan server web (server.js) supaya
// logika scrape -> build -> aset -> template -> render tidak terduplikasi.

import { slugFromUrl, fetchArticle } from './scrape.js';
import { buildCarousel } from './content.js';
import { loadBrandAssets, fetchImageDataUri } from './assets.js';
import { renderTemplates } from './templates.js';
import { renderSlides } from './render.js';

export const SLIDE_ORDER = ['cover', 'slide1', 'slide2', 'cta'];

/**
 * Jalankan pipeline scrape->render tanpa menyentuh filesystem (kecuali cache aset).
 * @param {string} url URL artikel insightsdigest.sg
 * @param {object} [opts]
 * @param {number} [opts.width=1080]
 * @param {number} [opts.height=1350]
 * @param {(step: 'scrape'|'assets'|'render') => void} [opts.onProgress]
 *        Callback opsional untuk progres (CLI memakainya untuk console.log).
 * @returns {Promise<{ slug: string, title: string, files: Array<{name: string, buffer: Buffer}> }>}
 *          files urut sesuai SLIDE_ORDER, name = "<slide>.jpg".
 */
export async function generateCarousel(url, { width = 1080, height = 1350, onProgress } = {}) {
  const note = (step) => { if (onProgress) onProgress(step); };

  note('scrape');
  const slug = slugFromUrl(url);            // lempar error jelas bila URL tidak valid
  const article = await fetchArticle(slug); // lempar error bila 404 / JSON tidak valid

  const carousel = buildCarousel(article);

  note('assets');
  const { fonts, logos } = await loadBrandAssets();
  const cache = new Map();
  const [cover, slide1, slide2] = await Promise.all([
    fetchImageDataUri(carousel.cover.image, cache),
    fetchImageDataUri(carousel.slide1.image, cache),
    fetchImageDataUri(carousel.slide2.image, cache),
  ]);

  const html = renderTemplates({
    carousel,
    fonts,
    logos,
    images: { cover, slide1, slide2 },
    width,
    height,
  });

  note('render');
  const buffers = await renderSlides(html, { width, height, scale: 2 });

  const files = SLIDE_ORDER.map((name) => ({ name: `${name}.jpg`, buffer: buffers[name] }));
  return { slug, title: carousel.cover.title, files };
}
