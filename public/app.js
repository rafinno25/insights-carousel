// Logika frontend: kirim URL ke /api/generate, tampilkan pratinjau 4 slide,
// lalu bungkus 4 gambar itu menjadi ZIP di sisi browser (JSZip) saat tombol unduh ditekan.
// Pendekatan client-side ini bebas-state sehingga jalan baik di server lokal maupun
// di Vercel serverless (yang tidak bisa menyimpan hasil antar-request).

const form = document.getElementById('gen');
const urlInput = document.getElementById('url');
const submitBtn = document.getElementById('submit');
const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error');
const resultEl = document.getElementById('result');
const titleEl = document.getElementById('title');
const gridEl = document.getElementById('grid');
const downloadEl = document.getElementById('download');

const RENDER_TIMEOUT_MS = 90_000; // render Playwright bisa beberapa detik

let current = null; // { slug, slides: [{ name, dataUri }] }

function show(el, text) {
  if (text !== undefined) el.textContent = text;
  el.hidden = false;
}
function hide(el) { el.hidden = true; }

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const url = urlInput.value.trim();
  if (!url) return;

  // Reset tampilan
  hide(errorEl);
  hide(resultEl);
  show(statusEl, 'Rendering…');
  submitBtn.disabled = true;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `Gagal (HTTP ${res.status}).`);
    }

    renderResult(data);
    hide(statusEl);
  } catch (err) {
    hide(statusEl);
    const msg = err.name === 'AbortError'
      ? 'Waktu habis — render terlalu lama. Coba lagi.'
      : err.message;
    show(errorEl, msg);
  } finally {
    clearTimeout(timer);
    submitBtn.disabled = false;
  }
});

function renderResult({ title, slug, slides }) {
  current = { slug: slug || 'carousel', slides };
  titleEl.textContent = title || '';
  gridEl.replaceChildren();
  for (const slide of slides) {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.src = slide.dataUri;
    img.alt = slide.name;
    img.loading = 'lazy';
    const cap = document.createElement('figcaption');
    cap.textContent = slide.name;
    fig.append(img, cap);
    gridEl.append(fig);
  }
  show(resultEl);
}

downloadEl.addEventListener('click', async () => {
  if (!current) return;
  downloadEl.disabled = true;
  const original = downloadEl.textContent;
  downloadEl.textContent = 'Membungkus ZIP…';
  try {
    const zip = new JSZip();
    for (const slide of current.slides) {
      const base64 = slide.dataUri.split(',')[1];
      zip.file(slide.name, base64, { base64: true });
    }
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `carousel-${current.slug}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  } finally {
    downloadEl.disabled = false;
    downloadEl.textContent = original;
  }
});
