// Renders the figures of the «عددهای غایب!» statistics note to PNG through
// headless Chromium so the Persian labels get real Vazirmatn shaping and
// correct bidi. Run from the repo root: node scripts/figures/little-figures-figures.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const REPO = path.join(__dirname, '..', '..');
const OUT = path.join(REPO, 'assets/img');
// Inline the font as a data URI. A file:// @font-face src is blocked in a page
// created via setContent (its origin is about:blank), and the failure is silent:
// Chromium just falls back to its default sans and the Persian renders wrong.
const FONT = 'data:font/woff2;base64,' +
  fs.readFileSync(path.join(REPO, 'assets/fonts/Vazirmatn-wght.woff2')).toString('base64');

const INK = '#14121c';
const SOFT = '#55516a';
const FAINT = '#8b869f';
const ACCENT = '#4a3184';
const TINT = '#f3f0fa';
const RED = '#b4322e';

// Persian digits
const fa = n => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

// Bidi-safe text. align is always the VISUAL result: 'right' = the text's right
// edge sits at x, 'left' = its left edge sits at x, 'center' = centred on x.
// Persian is laid out RTL by default; pass ltr:true for Latin labels.
function T(x, y, str, o = {}) {
  const dir = o.ltr ? 'ltr' : 'rtl';
  const anchor = o.align === 'center' ? 'middle'
    : o.align === 'left' ? (o.ltr ? 'start' : 'end')
    : (o.ltr ? 'end' : 'start');
  const a = [
    `x="${x}"`, `y="${y}"`, `direction="${dir}"`, `text-anchor="${anchor}"`,
    `font-size="${o.size || 15}"`, `fill="${o.color || SOFT}"`,
  ];
  if (o.weight) a.push(`font-weight="${o.weight}"`);
  if (o.opacity) a.push(`opacity="${o.opacity}"`);
  return `<text ${a.join(' ')}>${str}</text>`;
}
const line = (x1, y1, x2, y2, c = INK, w = 1.5) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}"/>`;

function svg(w, h, body, defs = '') {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>${defs}</defs><rect width="${w}" height="${h}" fill="#ffffff"/>${body}</svg>`;
}

// ---------------------------------------------------------------- figure 1
// Share of heads when the coin experiment itself is repeated: 10 tosses give
// chance a wide playground, 1000 tosses pin the share near one half.
function figCoin() {
  const W = 760, H = 420;
  const x0 = 62, x1 = 706, base = 330, top = 108;
  const X = p => x0 + p * (x1 - x0);
  const plotH = base - top;

  let s = '';
  s += T(x1, 38, 'اگر آزمایشِ پرتاب سکه را بارها تکرار کنیم، سهم شیر کجا می‌افتد؟', { size: 17.5, weight: 700, color: INK });
  s += T(x1, 62, 'بلندیِ هر نمودار جداگانه هم‌مقیاس شده است؛ آنچه مهم است پهنای آن‌هاست.', { size: 15 });

  // axis
  s += line(x0 - 8, base, x1 + 4, base, INK);
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    s += line(X(p), base, X(p), base + 7, INK);
    s += T(X(p), base + 28, fa(Math.round(p * 100)) + '٪', { align: 'center', size: 14 });
  }
  s += T((x0 + x1) / 2, base + 56, 'سهم شیر از کل پرتاب‌ها', { align: 'center', size: 14.5 });

  // 10 tosses: binomial(10, 1/2), one bar per possible share
  const pmf10 = [1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1].map(v => v / 1024);
  const max10 = Math.max(...pmf10);
  const bw = 30;
  pmf10.forEach((p, k) => {
    const h = (p / max10) * plotH;
    const hot = k === 8;
    s += `<rect x="${X(k / 10) - bw / 2}" y="${base - h}" width="${bw}" height="${h}" rx="3"
      fill="${hot ? RED : TINT}" fill-opacity="${hot ? 0.9 : 1}" stroke="${hot ? RED : '#c9bfe4'}" stroke-width="1.4"/>`;
  });

  // 1000 tosses: a narrow normal spike around one half
  const sg = 0.0158;
  const pts = [];
  for (let i = 0; i <= 400; i++) {
    const p = 0.40 + 0.20 * (i / 400);
    const y = Math.exp(-Math.pow(p - 0.5, 2) / (2 * sg * sg));
    pts.push(`${X(p).toFixed(2)},${(base - y * plotH).toFixed(2)}`);
  }
  s += `<path d="M ${X(0.40)},${base} L ${pts.join(' L ')} L ${X(0.60)},${base} Z" fill="${ACCENT}" fill-opacity="0.88"/>`;

  // labels for the two experiments
  s += T(X(0.5) + 66, top + 26, '۱۰۰۰ پرتاب', { align: 'left', size: 16, weight: 700, color: ACCENT });
  s += T(X(0.5) + 66, top + 48, 'تقریباً همیشه نزدیک ۵۰٪', { align: 'left', size: 13.5, color: SOFT });
  s += line(X(0.5) + 62, top + 30, X(0.517), top + 46, ACCENT, 1.1);

  s += T(X(0.16), top + 78, '۱۰ پرتاب', { align: 'center', size: 16, weight: 700, color: '#8a7ab0' });
  s += T(X(0.16), top + 100, 'پهن و پراکنده', { align: 'center', size: 13.5, color: SOFT });
  s += line(X(0.183), top + 106, X(0.27), base - 0.45 * plotH, '#8a7ab0', 1.1);

  // the 8-of-10 headline bar
  const h8 = (pmf10[8] / max10) * plotH;
  s += T(X(0.8), base - h8 - 52, '۸ شیر از ۱۰ پرتاب', { align: 'center', size: 15, weight: 700, color: RED });
  s += T(X(0.8), base - h8 - 32, 'اصلاً عجیب نیست', { align: 'center', size: 13.5, color: RED });
  s += line(X(0.8), base - h8 - 24, X(0.8), base - h8 - 8, RED, 1.2);

  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 2
// The dead-salmon study: the same data, before and after correcting for
// thousands of voxel-level tests. The fish is a clip path for the voxel grid.
function figSalmon() {
  const W = 760, H = 400;

  // one fish drawn in a local 300x130 box, nose to the right, tail to the left
  const fishPath = 'M 24 65 C 60 18 150 8 216 30 C 246 40 268 52 282 65 C 268 78 246 90 216 100 C 150 122 60 112 24 65 Z';
  const tailPath = 'M 8 65 L 40 40 L 30 65 L 40 90 Z';

  function panel(ox, oy, id, hot) {
    let p = `<g transform="translate(${ox},${oy})">`;
    p += `<clipPath id="fish${id}"><path d="${fishPath}"/></clipPath>`;
    p += `<path d="${fishPath}" fill="#efedf6" stroke="${SOFT}" stroke-width="1.6"/>`;
    p += `<path d="${tailPath}" fill="#efedf6" stroke="${SOFT}" stroke-width="1.6"/>`;
    // voxel grid, clipped to the body
    let g = `<g clip-path="url(#fish${id})">`;
    for (let x = 8; x <= 288; x += 16) g += line(x, 0, x, 130, '#cfc9e2', 0.9);
    for (let y = 5; y <= 125; y += 16) g += line(0, y, 300, y, '#cfc9e2', 0.9);
    // "active" voxels: two in the head cavity, one on the spine
    if (hot) {
      for (const [cx, cy, c] of [[216, 53, RED], [232, 69, '#d4622a'], [120, 53, RED]]) {
        g += `<rect x="${cx - 8}" y="${cy - 8}" width="16" height="16" fill="${c}" fill-opacity="0.92"/>`;
      }
    }
    g += '</g>';
    p += g;
    p += `<circle cx="248" cy="57" r="4" fill="${SOFT}"/>`; // eye
    p += '</g>';
    return p;
  }

  let s = '';
  s += T(706, 38, 'تحلیل fMRI روی یک ماهی آزادِ مرده', { size: 17.5, weight: 700, color: INK });
  s += T(706, 62, 'هزاران وکسل، هزاران آزمون جداگانه — یک بار بدون اصلاح و یک بار با اصلاح.', { size: 15 });

  // right panel first (RTL reading order): uncorrected
  s += panel(408, 120, 'A', true);
  s += T(558, 300, 'بدون اصلاح برای آزمون‌های متعدد', { align: 'center', size: 15.5, weight: 700, color: INK });
  s += T(558, 324, 'چند وکسل «فعال» به نظر می‌رسند', { align: 'center', size: 14, color: RED });

  s += panel(52, 120, 'B', false);
  s += T(202, 300, 'با اصلاحِ آزمون‌های متعدد', { align: 'center', size: 15.5, weight: 700, color: INK });
  s += T(202, 324, 'هیچ «فعالیتی» باقی نمی‌ماند', { align: 'center', size: 14, color: SOFT });

  s += T(380, 372, 'ماهی در هر دو تصویر همان ماهی است؛ فقط شمارِ فرصت‌های شانس حساب شده است.', { align: 'center', size: 14.5, color: SOFT });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 3
// Twenty independent tests of a treatment with no effect: one of them comes
// up "significant" anyway.
function figTwenty() {
  const W = 760, H = 355;
  const cols = 5, rows = 4, cw = 100, ch = 46, gap = 14;
  const gridW = cols * cw + (cols - 1) * gap;
  const x0 = (W - gridW) / 2, y0 = 104;
  const HOT = 13; // the lucky test

  let s = '';
  s += T(706, 38, 'بیست آزمونِ مستقل روی اثری که وجود ندارد', { size: 17.5, weight: 700, color: INK });
  s += T(706, 62, 'در هر آزمون، احتمال مثبتِ کاذب فقط ۵ درصد است.', { size: 15 });

  for (let i = 0; i < 20; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    const x = x0 + (cols - 1 - c) * (cw + gap); // number right-to-left
    const y = y0 + r * (ch + gap);
    const hot = i + 1 === HOT;
    s += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="7"
      fill="${hot ? RED : TINT}" stroke="${hot ? RED : '#d9d3ea'}" stroke-width="1.4"/>`;
    if (hot) {
      s += T(x + cw / 2, y + 20, `آزمون ${fa(i + 1)}`, { align: 'center', size: 13.5, weight: 700, color: '#ffffff' });
      s += T(x + cw / 2, y + 38, 'p < 0.05', { align: 'center', size: 13.5, weight: 700, color: '#ffffff', ltr: true });
    } else {
      s += T(x + cw / 2, y + 29, `آزمون ${fa(i + 1)}`, { align: 'center', size: 14, color: SOFT });
    }
  }

  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 4
// Relative vs absolute risk: 1 case in 7000 versus 2 cases in 7000, each
// group drawn as an actual field of 7000 dots.
function figRisk() {
  const W = 760, H = 452;
  const cols = 175, rows = 40, pitch = 3.6;
  const gx = 65;

  function field(oy, hotCells) {
    let f = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        f += `<circle cx="${(gx + c * pitch).toFixed(1)}" cy="${(oy + r * pitch).toFixed(1)}" r="1.1" fill="#d4cfe3"/>`;
      }
    }
    for (const [c, r] of hotCells) {
      f += `<circle cx="${(gx + c * pitch).toFixed(1)}" cy="${(oy + r * pitch).toFixed(1)}" r="4" fill="${RED}" stroke="#ffffff" stroke-width="1.2"/>`;
    }
    return f;
  }

  let s = '';
  s += T(706, 36, 'دو برابر شدنِ خطر، از نزدیک', { size: 17.5, weight: 700, color: INK });

  s += T(706, 74, 'قرص‌های نسل پیشین: یک مورد لخته در ۷۰۰۰ نفر', { size: 15, weight: 600, color: INK });
  s += field(92, [[47, 17]]);

  s += T(706, 282, 'قرص‌های نسل سوم: دو مورد لخته در ۷۰۰۰ نفر', { size: 15, weight: 600, color: INK });
  s += field(300, [[30, 9], [121, 28]]);

  return svg(W, H, s);
}

const FIGS = [
  { name: 'statistics_coin_share_spread', svg: figCoin(), w: 760, h: 420 },
  { name: 'statistics_dead_salmon_correction', svg: figSalmon(), w: 760, h: 400 },
  { name: 'statistics_twenty_tests_one_hit', svg: figTwenty(), w: 760, h: 355 },
  { name: 'statistics_absolute_relative_risk', svg: figRisk(), w: 760, h: 452 },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  for (const f of FIGS) {
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      @font-face { font-family: "Vazirmatn"; src: url("${FONT}") format("woff2"); font-weight: 100 900; }
      * { margin:0; padding:0; } body { background:#fff; }
      svg { display:block; font-family:"Vazirmatn", sans-serif; }
    </style></head><body>${f.svg}</body></html>`;
    await page.setViewportSize({ width: f.w, height: f.h });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await (await page.$('svg')).screenshot({ path: path.join(OUT, f.name + '.png') });
    console.log('wrote', f.name + '.png', f.w + 'x' + f.h);
  }
  await browser.close();
})();
