# Insights Carousel Generator

CLI untuk mengubah artikel dari **[insightsdigest.sg](https://www.insightsdigest.sg)** menjadi
**carousel 4 gambar** (Cover, Slide 1, Slide 2, CTA) bergaya brand Insights, lalu membungkusnya
menjadi satu file ZIP siap unggah.

## Cara kerja

1. **Scrape** — slug diambil dari URL, lalu teks artikel diambil dari API publik
   `GET /api/articles?slug=<slug>` (JSON terstruktur: judul, section, paragraf, gambar).
2. **Map** — judul → Cover; dua section pertama (heading + paragraf, dipotong agar muat) → Slide 1 & 2;
   CTA bersifat statik.
3. **Render** — tiap slide dirender dari template HTML/CSS lalu di-screenshot dengan Playwright
   (Chromium headless). Font brand **Poppins** dan logo di-embed sebagai data-URI agar hasil konsisten.
4. **ZIP** — keempat JPG dibungkus menjadi `carousel.zip`.

## Instalasi

```bash
npm install          # juga mengunduh Chromium untuk Playwright (postinstall)
```

> Butuh Node.js 18+ (memakai `fetch` bawaan). Bila Chromium belum terpasang:
> `npx playwright install chromium`.

## Pemakaian

```bash
node src/index.js "https://www.insightsdigest.sg/article/<slug>"
```

Opsi:

| Opsi          | Default      | Keterangan                       |
| ------------- | ------------ | -------------------------------- |
| `--out <dir>` | `./output`   | Folder output                    |
| `--size <WxH>`| `1080x1350`  | Ukuran gambar (rasio 4:5)        |

Contoh:

```bash
node src/index.js "https://www.insightsdigest.sg/article/the-war-nobody-expected-and-the-bill-singapore-will-pay"
```

Hasil di `output/<slug>/`:

```
cover.jpg  slide1.jpg  slide2.jpg  cta.jpg  carousel.zip
```

## Struktur

```
src/
  index.js      CLI: orkestrasi scrape → map → render → zip
  scrape.js     URL → slug, ambil & normalisasi artikel dari API
  content.js    Artikel → model carousel (pemetaan mekanis + pemotongan teks)
  assets.js     Unduh/cache font + logo, gambar → data-URI
  templates.js  4 template HTML/CSS slide
  render.js     Playwright: template → buffer JPG
  zip.js        Bungkus JPG → ZIP
assets/         Cache font (Poppins) + logo (diunduh sekali)
output/
  sample/       Contoh acuan desain
  <slug>/       Hasil generate
```

## Catatan

- Hanya mendukung URL `insightsdigest.sg/article/<slug>`.
- Warna/ukuran font dapat disetel di `PALETTE` & CSS pada `src/templates.js`.
- Bila sebuah gambar artikel gagal diunduh, slide tetap dibuat (memakai latar cadangan).
