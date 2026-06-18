// Aset: unduh & cache font brand (Poppins) + logo dari insightsdigest.sg,
// dan ubah gambar artikel menjadi data-URI agar template HTML sepenuhnya mandiri
// (tidak ada network/CORS saat Playwright melakukan screenshot).

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = path.join(__dirname, '..', 'assets');
const SITE = 'https://www.insightsdigest.sg';

// Font brand = Poppins (subset latin yang dipreload situs), per weight.
const FONT_FILES = {
  'Poppins-400': '/_next/static/media/eafabf029ad39a43-s.p.woff2',
  'Poppins-500': '/_next/static/media/8888a3826f4a3af4-s.p.woff2',
  'Poppins-600': '/_next/static/media/0484562807a97172-s.p.woff2',
  'Poppins-700': '/_next/static/media/b957ea75a84b6ea7-s.p.woff2',
};

const LOGO_FILES = {
  teal: '/images/insights-logo.webp',
  white: '/images/insight-logo-white.webp',
};

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Unduh dengan cache di assets/ (file font & logo stabil, jadi cukup sekali). */
async function cachedDownload(url, filename) {
  await mkdir(ASSET_DIR, { recursive: true });
  const fp = path.join(ASSET_DIR, filename);
  if (await exists(fp)) return readFile(fp);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal unduh aset ${url} (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(fp, buf);
  return buf;
}

function dataUri(buf, mime) {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/** Muat font (data-URI woff2 per weight) + logo (data-URI webp). */
export async function loadBrandAssets() {
  const fonts = {};
  for (const [key, p] of Object.entries(FONT_FILES)) {
    const buf = await cachedDownload(SITE + p, `${key}.woff2`);
    fonts[key] = dataUri(buf, 'font/woff2');
  }
  const logos = {};
  for (const [key, p] of Object.entries(LOGO_FILES)) {
    const buf = await cachedDownload(SITE + p, `logo-${key}.webp`);
    logos[key] = dataUri(buf, 'image/webp');
  }
  return { fonts, logos };
}

/** Ambil sebuah gambar (URL apa pun) sebagai data-URI. Null bila gagal (slide tetap jalan). */
export async function fetchImageDataUri(url, cache = new Map()) {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url);
  let uri = null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
    const buf = Buffer.from(await res.arrayBuffer());
    uri = dataUri(buf, mime);
  } catch (e) {
    console.warn(`  ! Lewati gambar (gagal diunduh): ${url} — ${e.message}`);
  }
  cache.set(url, uri);
  return uri;
}
