// Server web minimal (node:http, tanpa framework) untuk Insights Carousel Generator.
//
// Alur: pengguna tempel URL artikel -> POST /api/generate menjalankan pipeline sekali
// dan menyimpan hasilnya di memori -> GET /api/download/:id membungkus hasil itu jadi ZIP.
//
// Jalankan: npm run web  (lalu buka http://localhost:3000)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCarousel } from './src/generate.js';
import { createZipBuffer } from './src/zip.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 3000;

const RESULTS = new Map();          // id -> { slug, files, expires }
const TTL_MS = 10 * 60 * 1000;      // hasil kedaluwarsa setelah 10 menit
const MAX_BODY = 4 * 1024;          // body JSON {url} sangat kecil; tolak yang lebih besar
const MAX_CONCURRENT = 2;           // batasi peluncuran Chromium bersamaan
let inFlight = 0;

// Static file diserve dari allowlist tetap -> tidak ada risiko path traversal.
const STATIC = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/style.css': { file: 'style.css', type: 'text/css; charset=utf-8' },
  '/app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
};

function sweep() {
  const now = Date.now();
  for (const [k, v] of RESULTS) if (v.expires < now) RESULTS.delete(k);
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) {
      const e = new Error('Payload terlalu besar.');
      e.code = 'TOO_BIG';
      throw e;
    }
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function serveStatic(res, entry) {
  try {
    const buf = await readFile(path.join(PUBLIC, entry.file));
    res.writeHead(200, { 'content-type': entry.type });
    res.end(buf);
  } catch {
    sendJson(res, 404, { error: 'Berkas tidak ditemukan.' });
  }
}

async function handleGenerate(req, res) {
  if (inFlight >= MAX_CONCURRENT) {
    return sendJson(res, 503, { error: 'Server sibuk memproses permintaan lain. Coba lagi sebentar.' });
  }

  let url;
  try {
    ({ url } = JSON.parse(await readBody(req)));
  } catch (e) {
    return sendJson(res, e.code === 'TOO_BIG' ? 413 : 400, { error: 'Body permintaan tidak valid.' });
  }
  if (!url || typeof url !== 'string') {
    return sendJson(res, 400, { error: 'URL wajib diisi.' });
  }

  inFlight++;
  try {
    sweep();
    const { slug, title, files } = await generateCarousel(url);
    const id = randomUUID();
    RESULTS.set(id, { slug, files, expires: Date.now() + TTL_MS });
    sendJson(res, 200, {
      id,
      slug,
      title,
      slides: files.map((f) => ({
        name: f.name,
        dataUri: `data:image/jpeg;base64,${f.buffer.toString('base64')}`,
      })),
    });
  } catch (e) {
    // Pesan error pipeline sudah ramah-pengguna -> teruskan sebagai 400.
    let msg = e.message || 'Terjadi kesalahan saat membuat carousel.';
    if (/executable|chromium|browser/i.test(msg)) {
      msg += ' (Jalankan: npx playwright install chromium)';
    }
    sendJson(res, 400, { error: msg });
  } finally {
    inFlight--;
  }
}

async function handleDownload(res, id) {
  const entry = RESULTS.get(id);
  if (!entry) {
    return sendJson(res, 404, { error: 'Hasil kedaluwarsa atau tidak ditemukan. Silakan generate ulang.' });
  }
  try {
    const zip = await createZipBuffer(entry.files);
    res.writeHead(200, {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="carousel-${entry.slug}.zip"`,
      'content-length': zip.length,
    });
    res.end(zip);
  } catch (e) {
    sendJson(res, 500, { error: `Gagal membuat ZIP: ${e.message}` });
  }
}

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && STATIC[pathname]) return serveStatic(res, STATIC[pathname]);
    if (req.method === 'POST' && pathname === '/api/generate') return handleGenerate(req, res);
    if (req.method === 'GET' && pathname.startsWith('/api/download/')) {
      return handleDownload(res, decodeURIComponent(pathname.slice('/api/download/'.length)));
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (e) {
    sendJson(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`Insights Carousel Generator — Web UI: http://localhost:${PORT}`);
});
