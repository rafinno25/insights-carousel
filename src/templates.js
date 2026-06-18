// Template HTML/CSS untuk tiap slide carousel. Dirender oleh Playwright lalu di-screenshot.
// Gaya mengikuti sample di output/sample/ : rasio 4:5, palet teal + krem + putih, Poppins.

const PALETTE = {
  teal: '#0E3D38',
  tealDeep: '#0B302C',
  creamBg: '#D7D1C0', // latar Slide 2 (tan)
  creamBox: '#ECE7D9', // kotak CTA / aksen terang
  white: '#FFFFFF',
};

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fontFaces(fonts) {
  const weight = { 400: 'Poppins-400', 500: 'Poppins-500', 600: 'Poppins-600', 700: 'Poppins-700' };
  return Object.entries(weight)
    .map(
      ([w, key]) => `@font-face{font-family:'Poppins';font-style:normal;font-weight:${w};
        font-display:block;src:url('${fonts[key]}') format('woff2');}`,
    )
    .join('\n');
}

function baseCss(fonts, width, height) {
  return `
    ${fontFaces(fonts)}
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:${width}px;height:${height}px;}
    body{font-family:'Poppins',system-ui,-apple-system,sans-serif;
      -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
    .frame{position:relative;width:${width}px;height:${height}px;overflow:hidden;}
    .logo{height:46px;width:auto;display:block;}
    p{margin:0;}
  `;
}

function doc(css, body, { fonts, width, height }) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>${baseCss(fonts, width, height)}\n${css}</style></head>
<body>${body}</body></html>`;
}

function paragraphs(body) {
  return (body || []).map((p) => `<p>${esc(p)}</p>`).join('');
}

// ---- Cover: foto full-bleed + overlay gelap + logo teal + judul putih besar di bawah ----
function coverHtml(data, ctx) {
  const { cover, logos, images } = data;
  const bg = images.cover
    ? `<img class="bg" src="${images.cover}">`
    : '<div class="bg bg-fallback"></div>';
  const css = `
    .cover .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
    .cover .bg-fallback{background:${PALETTE.teal};}
    .cover .overlay{position:absolute;inset:0;background:linear-gradient(to bottom,
      rgba(11,48,44,0.10) 0%, rgba(11,48,44,0.02) 30%,
      rgba(11,48,44,0.55) 72%, rgba(11,48,44,0.88) 100%);}
    .cover .logo{position:absolute;top:64px;left:72px;height:42px;}
    .cover .title{position:absolute;left:72px;right:80px;bottom:92px;color:${PALETTE.white};
      font-weight:700;font-size:84px;line-height:1.06;letter-spacing:-0.015em;}
  `;
  const body = `<div class="frame cover">${bg}<div class="overlay"></div>
    <img class="logo" src="${logos.teal}">
    <h1 class="title">${esc(cover.title)}</h1></div>`;
  return doc(css, body, ctx);
}

// ---- Slide 1: latar teal solid + logo putih + headline + body + foto menempel tepi bawah ----
function slide1Html(data, ctx) {
  const { slide1, logos, images } = data;
  const photo = images.slide1
    ? `<img class="photo" src="${images.slide1}">`
    : '';
  const css = `
    .slide1{background:${PALETTE.teal};display:flex;flex-direction:column;}
    .slide1 .text{padding:64px 72px 40px;flex:1;display:flex;flex-direction:column;min-height:0;}
    .slide1 .logo{align-self:flex-start;margin-bottom:60px;}
    .slide1 .headline{color:${PALETTE.white};font-weight:700;font-size:58px;
      line-height:1.1;letter-spacing:-0.01em;margin-bottom:34px;}
    .slide1 .body{color:rgba(255,255,255,0.90);font-weight:400;font-size:31px;line-height:1.5;}
    .slide1 .body p + p{margin-top:26px;}
    .slide1 .photo{width:100%;height:430px;object-fit:cover;display:block;flex:none;}
  `;
  const body = `<div class="frame slide1">
    <div class="text">
      <img class="logo" src="${logos.white}">
      <h2 class="headline">${esc(slide1.heading)}</h2>
      <div class="body">${paragraphs(slide1.body)}</div>
    </div>${photo}</div>`;
  return doc(css, body, ctx);
}

// ---- Slide 2: latar krem + logo teal + foto (rounded) di atas + headline & body teal ----
function slide2Html(data, ctx) {
  const { slide2, logos, images } = data;
  const photo = images.slide2
    ? `<img class="photo" src="${images.slide2}">`
    : '<div class="photo photo-fallback"></div>';
  const css = `
    .slide2{background:${PALETTE.creamBg};display:flex;flex-direction:column;
      padding:64px 72px 72px;}
    .slide2 .logo{align-self:flex-start;}
    .slide2 .photo{margin-top:42px;width:100%;height:470px;object-fit:cover;
      border-radius:6px;display:block;flex:none;}
    .slide2 .photo-fallback{background:${PALETTE.teal};opacity:0.25;}
    .slide2 .headline{margin-top:46px;color:${PALETTE.teal};font-weight:700;
      font-size:56px;line-height:1.1;letter-spacing:-0.01em;}
    .slide2 .body{margin-top:28px;color:${PALETTE.teal};font-weight:400;
      font-size:31px;line-height:1.5;}
    .slide2 .body p + p{margin-top:26px;}
  `;
  const body = `<div class="frame slide2">
    <img class="logo" src="${logos.teal}">
    ${photo}
    <h2 class="headline">${esc(slide2.heading)}</h2>
    <div class="body">${paragraphs(slide2.body)}</div></div>`;
  return doc(css, body, ctx);
}

// ---- CTA: latar teal + kotak krem berundak + "Follow us" + logo putih (statik) ----
function ctaHtml(data, ctx) {
  const { cta, logos } = data;
  const css = `
    .cta{background:${PALETTE.teal};}
    .cta .callout{position:absolute;left:92px;top:50%;transform:translateY(-50%);
      display:inline-flex;flex-direction:column;align-items:flex-start;}
    .cta .cta-top{background:${PALETTE.creamBox};color:${PALETTE.teal};font-weight:600;
      font-size:36px;padding:10px 24px;}
    .cta .cta-domain{background:${PALETTE.creamBox};color:${PALETTE.teal};font-weight:700;
      font-size:66px;letter-spacing:-0.01em;padding:6px 26px 10px;}
    .cta .follow{position:absolute;left:92px;bottom:84px;color:${PALETTE.white};
      font-weight:500;font-size:46px;}
    .cta .logo{position:absolute;right:92px;bottom:82px;height:58px;}
  `;
  const body = `<div class="frame cta">
    <div class="callout">
      <span class="cta-top">${esc(cta.label)}</span>
      <span class="cta-domain">${esc(cta.domain)}</span>
    </div>
    <span class="follow">${esc(cta.follow)}</span>
    <img class="logo" src="${logos.white}"></div>`;
  return doc(css, body, ctx);
}

/** Bangun HTML keempat slide. `images` = { cover, slide1, slide2 } data-URI (boleh null). */
export function renderTemplates({ carousel, fonts, logos, images, width = 1080, height = 1350 }) {
  const data = { ...carousel, logos, images };
  const ctx = { fonts, width, height };
  return {
    cover: coverHtml(data, ctx),
    slide1: slide1Html(data, ctx),
    slide2: slide2Html(data, ctx),
    cta: ctaHtml(data, ctx),
  };
}
