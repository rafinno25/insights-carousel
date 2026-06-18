// Logika frontend: kirim URL ke /api/generate, tampilkan pratinjau 4 slide,
// lalu arahkan tombol unduh ke /api/download/<id>.

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

function renderResult({ title, slides, id }) {
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
  downloadEl.href = `/api/download/${id}`;
  show(resultEl);
}
