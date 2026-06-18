// Scraping: ubah URL artikel insightsdigest.sg menjadi objek artikel ternormalisasi.
// Situs memakai Next.js (konten dirender client-side), tetapi menyediakan API publik
// /api/articles?slug=<slug> yang mengembalikan JSON terstruktur — itu yang kita pakai.

const SITE = 'https://www.insightsdigest.sg';

/** Ambil slug dari URL artikel. Lempar error jelas bila bukan URL artikel insightsdigest.sg. */
export function slugFromUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`URL tidak valid: "${input}"`);
  }
  if (!/(^|\.)insightsdigest\.sg$/i.test(url.hostname)) {
    throw new Error(`Bukan URL insightsdigest.sg (host: ${url.hostname}).`);
  }
  const m = url.pathname.match(/\/article\/([^/?#]+)/);
  if (!m) {
    throw new Error(`URL bukan halaman artikel — harus mengandung "/article/<slug>": ${input}`);
  }
  return decodeURIComponent(m[1]);
}

/** Ambil & normalisasi artikel dari API berdasarkan slug. */
export async function fetchArticle(slug) {
  const api = `${SITE}/api/articles?slug=${encodeURIComponent(slug)}`;
  let res;
  try {
    res = await fetch(api, { headers: { accept: 'application/json' } });
  } catch (e) {
    throw new Error(`Gagal menghubungi insightsdigest.sg: ${e.message}`);
  }
  if (!res.ok) {
    throw new Error(`Artikel "${slug}" tidak ditemukan (HTTP ${res.status}).`);
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Respons API bukan JSON yang valid untuk slug "${slug}".`);
  }
  if (!data || !data.title) {
    throw new Error(`Artikel "${slug}" tidak ditemukan atau kosong.`);
  }
  return normalize(data);
}

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;|&#8212;/g, '—')
    .replace(/&ndash;|&#8211;/g, '–')
    .replace(/&hellip;|&#8230;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripTags(html) {
  return decodeEntities(String(html).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImgSrc(html) {
  const srcs = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) srcs.push(m[1]);
  return srcs;
}

function normalize(data) {
  const sections = (data.sections || []).map((sec) => {
    const images = [];
    const textParagraphs = [];
    for (const p of sec.paragraphs || []) {
      const imgs = extractImgSrc(p);
      if (imgs.length) {
        // Paragraf yang berisi <img> diperlakukan sebagai gambar (bukan teks/caption).
        images.push(...imgs);
        continue;
      }
      const text = stripTags(p);
      if (text) textParagraphs.push(text);
    }
    return { heading: stripTags(sec.heading || ''), textParagraphs, images };
  });

  return {
    title: stripTags(data.title || ''),
    excerpt: stripTags(data.excerpt || ''),
    heroImage: data.image || null,
    date: stripTags(data.date || ''),
    category: stripTags(data.category || ''),
    readTime: stripTags(data.readTime || ''),
    slug: data.slug || '',
    sections,
  };
}
