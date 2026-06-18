#!/usr/bin/env node
// CLI: ubah URL artikel insightsdigest.sg menjadi carousel 4 gambar + ZIP.
//
// Pemakaian:
//   node src/index.js "<url-artikel>" [--out <dir>] [--size 1080x1350]

import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { generateCarousel, SLIDE_ORDER } from './generate.js';
import { createZip } from './zip.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
  const args = argv.slice(2);
  let url = null;
  let out = path.join(ROOT, 'output');
  let size = '1080x1350';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--out') out = path.resolve(args[++i]);
    else if (a === '--size') size = args[++i];
    else if (a === '-h' || a === '--help') return { help: true };
    else if (!a.startsWith('-')) url = a;
  }
  return { url, out, size };
}

function usage() {
  console.log(`Insights Carousel Generator

Pemakaian:
  node src/index.js "<url-artikel-insightsdigest>" [opsi]

Opsi:
  --out <dir>     Folder output (default: ./output)
  --size <WxH>    Ukuran gambar (default: 1080x1350)
  -h, --help      Tampilkan bantuan ini

Contoh:
  node src/index.js "https://www.insightsdigest.sg/article/the-war-nobody-expected-and-the-bill-singapore-will-pay"`);
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help || !opts.url) {
    usage();
    process.exit(opts.help ? 0 : 1);
  }
  const [w, h] = opts.size.split('x').map(Number);
  if (!w || !h) throw new Error(`--size tidak valid: "${opts.size}" (contoh: 1080x1350)`);

  console.log(`→ Scraping artikel: ${opts.url}`);
  const onProgress = (step) => {
    if (step === 'assets') console.log('→ Mengunduh aset brand (font + logo) & gambar artikel…');
    else if (step === 'render') console.log('→ Render 4 gambar (Playwright)…');
  };
  const { slug, title, files } = await generateCarousel(opts.url, {
    width: w,
    height: h,
    onProgress,
  });
  console.log(`  ✓ "${title}"`);

  const outDir = path.join(opts.out, slug);
  await mkdir(outDir, { recursive: true });
  for (const f of files) {
    await writeFile(path.join(outDir, f.name), f.buffer);
  }

  const zipPath = path.join(outDir, 'carousel.zip');
  const bytes = await createZip(zipPath, files);

  const rel = (p) => path.relative(process.cwd(), p);
  console.log(`\n✓ Selesai!`);
  console.log(`  Gambar : ${rel(outDir)}/{${SLIDE_ORDER.join(',')}}.jpg`);
  console.log(`  ZIP    : ${rel(zipPath)} (${(bytes / 1024).toFixed(0)} KB)`);
}

main().catch((e) => {
  console.error(`\n✗ Error: ${e.message}`);
  process.exit(1);
});
