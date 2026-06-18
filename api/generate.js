// Vercel serverless function: POST /api/generate
//
// Lingkungan serverless bersifat stateless — tidak bisa menyimpan hasil antar-request.
// Maka fungsi ini menjalankan pipeline sekali lalu mengembalikan 4 gambar (data-URI)
// dalam satu respons. Browser yang membuat ZIP-nya (lihat public/app.js, JSZip),
// jadi tidak perlu endpoint download terpisah maupun penyimpanan di server.

import { generateCarousel } from '../src/generate.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  // Vercel mem-parse body JSON ke req.body; fallback parse manual bila berupa string.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const url = body && body.url;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL wajib diisi.' });
    return;
  }

  try {
    const { slug, title, files } = await generateCarousel(url);
    res.status(200).json({
      slug,
      title,
      slides: files.map((f) => ({
        name: f.name,
        dataUri: `data:image/jpeg;base64,${f.buffer.toString('base64')}`,
      })),
    });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Gagal membuat carousel.' });
  }
}
