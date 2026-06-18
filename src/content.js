// Pemetaan mekanis: artikel ternormalisasi -> model carousel 4 slide.
// Cover = judul + hero. Slide 1 & 2 = heading + paragraf dari section artikel (dipotong agar muat).
// CTA = template statik.

const TITLE_MAX = 100;
const HEADLINE_MAX = 64;
const BODY_MAX_CHARS = 380;
const BODY_MAX_PARAS = 2;

export function buildCarousel(article) {
  // Section yang punya heading non-kosong DAN minimal satu paragraf teks.
  const contentSections = article.sections.filter(
    (s) => s.heading && s.textParagraphs.length,
  );

  const used = new Set();
  // Kolam gambar untuk slide: gambar inline artikel lalu hero sebagai cadangan.
  const imagePool = [
    ...article.sections.flatMap((s) => s.images),
    ...(article.heroImage ? [article.heroImage] : []),
  ];

  const sec1 = contentSections[0] || fallbackSection(article, 0);
  const sec2 = contentSections[1] || fallbackSection(article, 1);

  const slide1 = {
    heading: truncate(sec1.heading, HEADLINE_MAX),
    body: clampBody(sec1.textParagraphs),
    image: pickImage(sec1.images[0], imagePool, used),
  };
  const slide2 = {
    heading: truncate(sec2.heading, HEADLINE_MAX),
    body: clampBody(sec2.textParagraphs),
    image: pickImage(sec2.images[0], imagePool, used),
  };

  return {
    cover: {
      title: truncate(article.title, TITLE_MAX),
      image: article.heroImage || imagePool[0] || null,
    },
    slide1,
    slide2,
    cta: {
      label: 'Read the Full Article',
      domain: 'insightsdigest.sg',
      follow: 'Follow us',
    },
  };
}

/** Pilih gambar yang belum dipakai: preferensi dulu, lalu kolam, lalu apa pun. */
function pickImage(preferred, pool, used) {
  if (preferred && !used.has(preferred)) {
    used.add(preferred);
    return preferred;
  }
  for (const img of pool) {
    if (img && !used.has(img)) {
      used.add(img);
      return img;
    }
  }
  return preferred || pool[0] || null;
}

/** Cadangan saat artikel punya < 2 section ber-heading. */
function fallbackSection(article, idx) {
  const withText = article.sections.filter((s) => s.textParagraphs.length);
  const s = withText[idx];
  if (s) {
    return {
      heading: s.heading || (idx === 0 ? 'Key Takeaways' : 'What This Means'),
      textParagraphs: s.textParagraphs,
      images: s.images,
    };
  }
  return {
    heading: idx === 0 ? 'Key Takeaways' : 'What This Means',
    textParagraphs: article.excerpt ? [article.excerpt] : [],
    images: [],
  };
}

/** Ambil hingga BODY_MAX_PARAS paragraf, batasi total karakter agar muat di slide. */
function clampBody(paragraphs, maxChars = BODY_MAX_CHARS, maxParas = BODY_MAX_PARAS) {
  const out = [];
  let total = 0;
  for (const p of paragraphs.slice(0, maxParas)) {
    if (total >= maxChars) break;
    out.push(truncate(p, maxChars - total));
    total += p.length;
  }
  return out;
}

/** Potong di batas kalimat/kata, tambahkan elipsis bila terpotong. */
function truncate(s, max) {
  s = String(s || '').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sentenceEnd = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? '),
  );
  if (sentenceEnd > max * 0.6) return cut.slice(0, sentenceEnd + 1).trim();
  const space = cut.lastIndexOf(' ');
  return (space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:—–-]+$/, '') + '…';
}
