// Renders the statistics-note figures to PNG through headless Chromium so the
// Persian labels get real Vazirmatn shaping and correct bidi. Run: node figs.js
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
const dash = (x1, y1, x2, y2, c = INK) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
const line = (x1, y1, x2, y2, c = INK, w = 1.5) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}"/>`;

function svg(w, h, body, defs = '') {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>${defs}</defs><rect width="${w}" height="${h}" fill="#ffffff"/>${body}</svg>`;
}

// ---------------------------------------------------------------- figure 1
// Ten salaries on a number line, and the three centres they produce.
function figSalaries() {
  const W = 760, H = 272;
  const x0 = 100, x1 = 715, base = 212, xmax = 430;
  const X = v => x0 + (v / xmax) * (x1 - x0);
  const data = [30, 30, 30, 35, 40, 45, 50, 60, 70, 400];

  const seen = {};
  let s = '';

  // axis + ticks — Latin labels only; the Persian caption carries the units
  s += line(x0 - 10, base, x1, base, INK);
  for (const t of [0, 100, 200, 300, 400]) {
    s += line(X(t), base, X(t), base + 7, INK);
    s += T(X(t), base + 27, String(t), { align: 'center', size: 15, ltr: true });
  }

  // dots
  for (const v of data) {
    seen[v] = (seen[v] || 0) + 1;
    const y = base - 13 - (seen[v] - 1) * 16;
    s += `<circle cx="${X(v)}" cy="${y}" r="6.5" fill="${v === 400 ? '#b4322e' : ACCENT}" fill-opacity="0.85"/>`;
  }

  // the three centres — highest label on the rightmost marker so no
  // dashed line ever crosses a label that sits below it
  const marks = [
    { v: 79, label: 'mean 79', ly: 62, top: 72, cx: 213 },
    { v: 42.5, label: 'median 42.5', ly: 107, top: 117, cx: 152 },
    { v: 30, label: 'mode 30', ly: 148, top: 158, cx: 112 },
  ];
  for (const m of marks) {
    s += dash(X(m.v), base, X(m.v), m.top);
    if (Math.abs(m.cx - X(m.v)) > 4) s += line(m.cx + 24, m.ly + 6, X(m.v), m.top, INK, 1.1);
    s += T(m.cx, m.ly, m.label, { align: 'center', size: 17, weight: 600, color: INK, ltr: true });
  }

  // the outlier
  s += T(X(400), base - 30, '400', { align: 'center', size: 15, color: '#b4322e', weight: 600, ltr: true });

  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 2
// A right-skewed income curve: the three centres pull apart.
function figSkew() {
  const W = 760, H = 400;
  const x0 = 70, x1 = 700, base = 268, top = 74;
  const sg = 0.72;
  const pdf = t => (1 / (t * sg * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(Math.log(t), 2) / (2 * sg * sg));
  const mode = Math.exp(-sg * sg), median = 1, mean = Math.exp(sg * sg / 2);
  const tmax = 5.2;
  const X = t => x0 + (t / tmax) * (x1 - x0);
  const peak = pdf(mode);
  const Y = p => base - (p / peak) * (base - top);

  let s = '';
  // long-tail shading, from the mean rightwards
  let tail = `M ${X(mean)},${base} `;
  for (let i = 0; i <= 300; i++) {
    const t = mean + (tmax - mean) * (i / 300);
    tail += `L ${X(t).toFixed(2)},${Y(pdf(t)).toFixed(2)} `;
  }
  s += `<path d="${tail}L ${X(tmax)},${base} Z" fill="${TINT}"/>`;

  const pts = [];
  for (let i = 0; i <= 600; i++) {
    const t = 0.02 + (tmax - 0.02) * (i / 600);
    pts.push(`${X(t).toFixed(2)},${Y(pdf(t)).toFixed(2)}`);
  }
  s += `<polyline points="${pts.join(' ')}" fill="none" stroke="${ACCENT}" stroke-width="2.6"/>`;
  s += line(x0 - 8, base, x1, base, INK);

  s += T(x0, 44, 'households at each income level', { align: 'left', size: 15.5, ltr: true });
  s += T(x1, base + 26, 'income →', { align: 'right', size: 15, ltr: true });

  // centres labelled under the axis, on three staggered rows
  const marks = [
    { t: mode, label: 'mode', row: 1, cx: X(mode) },
    { t: median, label: 'median', row: 2, cx: X(median) + 4 },
    { t: mean, label: 'mean', row: 3, cx: X(mean) + 10 },
  ];
  for (const m of marks) {
    const ly = base + 26 * m.row;
    s += dash(X(m.t), base, X(m.t), Y(pdf(m.t)));
    s += `<circle cx="${X(m.t)}" cy="${Y(pdf(m.t))}" r="4.5" fill="${INK}"/>`;
    s += line(X(m.t), base, X(m.t), ly - 12, FAINT, 1.1);
    s += T(m.cx, ly, m.label, { align: 'center', size: 17, weight: 600, color: INK, ltr: true });
  }

  // the tail
  s += T(X(3.95), base - 78, 'long tail', { align: 'center', size: 16, color: SOFT, ltr: true });
  s += `<path d="M ${X(3.95)} ${base - 68} L ${X(3.95)} ${base - 24}" stroke="${SOFT}" stroke-width="1.2" marker-end="url(#ar)"/>`;

  return svg(W, H, s,
    `<marker id="ar" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${SOFT}"/></marker>`);
}

// ---------------------------------------------------------------- figure 3
// Daniels' funnel: how many airmen stay "average" as the conditions pile up.
function figFunnel(rows) {
  const W = 760, H = 500;
  const labelX = 730, numX = 575, barRight = 515, barMin = 55;
  const max = rows[0].n;
  const Wd = v => (v / max) * (barRight - barMin);
  const RED = '#b4322e';

  let s = '';
  s += T(labelX, 32, 'چند نفر از ۴۰۶۳ خلبان هنوز «تقریباً متوسط»‌اند؟', { size: 17.5, weight: 700, color: INK });
  s += T(labelX, 56, 'با هر اندازه‌ی تازه، شرط‌ها روی هم جمع می‌شوند.', { size: 15, color: SOFT });

  const y0 = 88, rowH = 33;
  rows.forEach((r, i) => {
    const y = y0 + i * rowH;
    const zero = r.n === 0;
    s += T(labelX, y + 15, r.label, { size: 15.5, color: zero ? RED : SOFT, weight: zero ? 700 : 400 });
    if (zero) {
      s += `<line x1="${barRight}" y1="${y + 2}" x2="${barRight}" y2="${y + 20}" stroke="${RED}" stroke-width="2.5"/>`;
      s += T(numX, y + 17, '۰', { size: 17, weight: 700, color: RED });
      s += T(barRight - 12, y + 17, 'هیچ‌کس', { size: 16, weight: 700, color: RED });
    } else {
      const w = Math.max(Wd(r.n), 2);
      s += `<rect x="${barRight - w}" y="${y + 3}" width="${w}" height="17" rx="2" fill="${i === 0 ? '#a99cc9' : ACCENT}" fill-opacity="${i === 0 ? 1 : 0.82}"/>`;
      s += T(numX, y + 17, fa(r.n), { size: 15.5, weight: 600, color: INK });
    }
  });

  s += T(labelX, H - 24, 'هر شرط به‌تنهایی آسان است؛ همه با هم، ناممکن.', { size: 15.5, color: SOFT });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 4
// Berkeley 1973: where each sex applied, tinted by the department's odds.
function figSimpson(depts) {
  const W = 760, H = 440;
  const right = 700, left = 120;
  const barW = right - left;
  const col = d => `hsl(258 30% ${92 - 62 * Math.max(0, Math.min(1, (0.66 - d.rate) / 0.66))}%)`;
  const txtCol = d => (d.rate > 0.34 ? INK : '#ffffff');

  const rows = [
    { key: 'men', label: 'مردان', total: 'پذیرش در همین شش گروه: ۴۴٫۵٪', y: 116 },
    { key: 'women', label: 'زنان', total: 'پذیرش در همین شش گروه: ۳۰٫۴٪', y: 232 },
  ];

  let s = '';
  s += T(right, 40, 'هر جنس، درخواست‌هایش را کجا فرستاده بود؟', { size: 17.5, weight: 700, color: INK });
  s += T(right, 66, 'شش گروه بزرگ دانشگاه؛ پهنای هر تکه: سهم آن گروه از درخواست‌های همان جنس', { size: 15 });

  for (const r of rows) {
    const tot = depts.reduce((a, d) => a + d[r.key], 0);
    let x = right;
    s += T(right, r.y - 12, r.label, { size: 17, weight: 700, color: INK });
    s += T(left, r.y - 12, r.total, { align: 'left', size: 15 });
    for (const d of depts) {
      const w = (d[r.key] / tot) * barW;
      s += `<rect x="${x - w}" y="${r.y}" width="${w}" height="58" fill="${col(d)}" stroke="#ffffff" stroke-width="1.5"/>`;
      if (w > 30) {
        s += T(x - w / 2, r.y + 26, d.name, { align: 'center', size: 16, weight: 700, color: txtCol(d) });
        s += T(x - w / 2, r.y + 46, fa(Math.round((d[r.key] / tot) * 100)) + '٪', { align: 'center', size: 13.5, color: txtCol(d), opacity: 0.9 });
      }
      x -= w;
    }
  }

  const ly = 348;
  s += T(right, ly - 12, 'نرخ پذیرش هر گروه — از پرپذیرش تا کم‌پذیرش:', { size: 15 });
  let lx = right, cw = 92;
  for (const d of depts) {
    s += `<rect x="${lx - cw + 4}" y="${ly}" width="${cw - 8}" height="30" fill="${col(d)}" rx="3"/>`;
    s += T(lx - cw / 2, ly + 20, `${d.name}: ${fa(Math.round(d.rate * 100))}٪`, { align: 'center', size: 14, weight: 600, color: txtCol(d) });
    lx -= cw;
  }
  s += T(right, ly + 62, 'درخواست‌های مردان بیش‌تر در گروه‌های آسان‌تر جمع شده بود و درخواست‌های زنان در گروه‌های سخت‌تر.', { size: 15.5, color: SOFT });

  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 5
// A week of 5-minute windows: per-window success rate on top, traffic below.
// The naive average of the windows hugs 100% because the failure occupies a
// sliver of *time* — even though that sliver carries a fifth of the *requests*.
function figUptime() {
  const W = 760, H = 452;
  const x0 = 70, x1 = 706;
  const tTop = 88, tBase = 212;   // success panel, 40..100 %
  const bTop = 268, bBase = 408;  // traffic panel
  const days = 7;
  const RED = '#b4322e';
  const X = t => x0 + (t / days) * (x1 - x0);
  const Ys = p => tBase - ((p - 40) / 60) * (tBase - tTop);

  // traffic: one hump per day; day 4 is the heavy day, and the incident
  // sits exactly on its crest
  const inc0 = 3.42, inc1 = 3.58;
  const vol = t => {
    const d = Math.floor(t), f = t - d;
    return 0.05 + (d === 3 ? 2.1 : 0.5) * Math.pow(Math.sin(Math.PI * f), 2);
  };
  const vmax = vol(3.5);
  const Yv = v => bBase - (v / vmax) * (bBase - bTop);

  let s = '';
  s += T(x1, 34, 'یک هفته، دو عددِ «نرخ پاسخ‌گویی»', { size: 17.5, weight: 700, color: INK });
  s += T(x1, 58, 'خرابی کوتاه بود، اما درست وقتی رخ داد که سرویس شلوغ بود.', { size: 15 });

  // the incident band, across both panels
  s += `<rect x="${X(inc0)}" y="${tTop - 6}" width="${X(inc1) - X(inc0)}" height="${bBase - tTop + 6}" fill="${RED}" fill-opacity="0.07"/>`;

  // ---- success panel
  const y100 = Ys(100), y90 = Ys(90), y50 = Ys(50);
  s += line(x0 - 8, tBase, x1, tBase, INK);
  s += T(x0 - 14, y100 + 5, '۱۰۰٪', { size: 13 });
  s += `<polyline points="${X(0)},${y100} ${X(inc0)},${y100} ${X(inc0)},${y50} ${X(inc1)},${y50} ${X(inc1)},${y100} ${X(days)},${y100}" fill="none" stroke="${ACCENT}" stroke-width="2.4"/>`;
  s += T(x1, y100 - 10, 'سهم درخواست‌های موفق در هر پنجره', { size: 14, color: SOFT });
  s += T(X(1.1), y100 - 10, 'میانگینِ ساده‌ی پنجره‌ها: ۹۹٪', { align: 'center', size: 15, weight: 600, color: ACCENT });
  s += T(X(inc1) + 8, y50 + 5, '۵۰٪', { align: 'left', size: 13, color: ACCENT });
  s += dash(x0, y90, x1, y90, RED);
  s += T(X(5.15), y90 + 24, 'وقتی هر درخواست یک رأی دارد: ۹۰٪', { align: 'center', size: 15, weight: 600, color: RED });

  // ---- traffic panel
  let area = `M ${X(0)},${bBase} `;
  for (let i = 0; i <= 700; i++) {
    const t = days * (i / 700);
    area += `L ${X(t).toFixed(2)},${Yv(vol(t)).toFixed(2)} `;
  }
  s += `<path d="${area}L ${X(days)},${bBase} Z" fill="${TINT}" stroke="${ACCENT}" stroke-width="1.8"/>`;
  // the incident's slice of traffic, in red
  let slice = `M ${X(inc0)},${bBase} `;
  for (let i = 0; i <= 60; i++) {
    const t = inc0 + (inc1 - inc0) * (i / 60);
    slice += `L ${X(t).toFixed(2)},${Yv(vol(t)).toFixed(2)} `;
  }
  s += `<path d="${slice}L ${X(inc1)},${bBase} Z" fill="${RED}" fill-opacity="0.55"/>`;

  s += line(x0 - 8, bBase, x1, bBase, INK);
  for (let d = 0; d <= days; d++) s += line(X(d), bBase, X(d), bBase + 6, INK, 1);
  s += T(x1, bTop - 10, 'شمار درخواست‌ها در هر پنجره', { size: 14, color: SOFT });
  s += T((x0 + x1) / 2, bBase + 26, 'روزهای هفته', { align: 'center', size: 14 });

  s += T(X(3.28), bTop + 26, 'خرابی، درست در اوجِ بار', { size: 15, weight: 600, color: RED });
  s += line(X(3.3), bTop + 28, X(3.44), Yv(vol(3.44)) + 4, RED, 1.1);

  return svg(W, H, s);
}

// ---------------------------------------------------------------- data
const FUNNEL = [
  { label: 'همه‌ی خلبانان', n: 4063 },
  { label: '۱. قد', n: 1055 },
  { label: '۲. + دور سینه', n: 302 },
  { label: '۳. + طول آستین', n: 143 },
  { label: '۴. + ارتفاع فاق', n: 73 },
  { label: '۵. + دور تنه', n: 28 },
  { label: '۶. + دور باسن', n: 12 },
  { label: '۷. + دور گردن', n: 6 },
  { label: '۸. + دور کمر', n: 3 },
  { label: '۹. + دور ران', n: 2 },
  { label: '۱۰. + طول فاق', n: 0 },
];

const DEPTS = [
  { name: 'A', men: 825, women: 108, rate: 0.64 },
  { name: 'B', men: 560, women: 25, rate: 0.63 },
  { name: 'C', men: 325, women: 593, rate: 0.35 },
  { name: 'D', men: 417, women: 375, rate: 0.34 },
  { name: 'E', men: 191, women: 393, rate: 0.25 },
  { name: 'F', men: 373, women: 341, rate: 0.06 },
];

const FIGS = [
  { name: 'statistics_three_centers_salaries', svg: figSalaries(), w: 760, h: 272 },
  { name: 'statistics_skewed_income_centers', svg: figSkew(), w: 760, h: 400 },
  { name: 'statistics_average_man_funnel', svg: figFunnel(FUNNEL), w: 760, h: 500 },
  { name: 'statistics_simpson_berkeley', svg: figSimpson(DEPTS), w: 760, h: 440 },
  { name: 'statistics_uptime_window_average', svg: figUptime(), w: 760, h: 452 },
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
