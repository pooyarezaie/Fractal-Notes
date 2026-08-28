// Renders the figures of the «نمودارِ کش‌آمده!» statistics note to PNG through
// headless Chromium so the Persian labels get real Vazirmatn shaping and
// correct bidi. Run from the repo root: node scripts/figures/gee-whiz-figures.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const REPO = path.join(__dirname, '..', '..');
const OUT = path.join(REPO, 'assets/img');
// Inline the font as a data URI: a file:// @font-face src is blocked in a page
// created via setContent (origin about:blank) and the fallback is silent.
const FONT = 'data:font/woff2;base64,' +
  fs.readFileSync(path.join(REPO, 'assets/fonts/Vazirmatn-wght.woff2')).toString('base64');

const INK = '#14121c';
const SOFT = '#55516a';
const FAINT = '#8b869f';
const ACCENT = '#4a3184';
const TINT = '#f3f0fa';
const RED = '#b4322e';
const BLUE = '#2f5fa8';
const GRID = '#e2ddef';

// Persian digits; '.' → '٫'
const fa = n => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]).replace(/\./g, '٫');

// Bidi-safe text. align is always the VISUAL result: 'right' = the text's right
// edge sits at x, 'left' = its left edge sits at x, 'center' = centred on x.
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
  if (o.rotate) a.push(`transform="rotate(${o.rotate} ${x} ${y})"`);
  if (o.halo) a.push(`paint-order="stroke" stroke="#ffffff" stroke-width="5" stroke-linejoin="round"`);
  return `<text ${a.join(' ')}>${str}</text>`;
}
const line = (x1, y1, x2, y2, c = INK, w = 1.5, dash = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;

function svg(w, h, body) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="#ffffff"/>${body}</svg>`;
}

// ---------------------------------------------------------------- figure 1
// Huff's gee-whiz graph: one year of national income, 20 → 22 billion, drawn
// three times — full axis, truncated axis, truncated axis in a tall frame.
function figFrames() {
  const W = 760, H = 450;
  const data = [20.0, 20.1, 20.3, 20.4, 20.6, 20.9, 21.0, 21.2, 21.3, 21.6, 21.8, 22.0];

  let s = '';
  s += T(720, 38, 'درآمد ملی در یک سال از ۲۰ به ۲۲ میلیارد دلار رسیده است', { size: 17.5, weight: 700, color: INK });
  s += T(720, 62, 'همان دوازده عدد، سه بار رسم شده است؛ فقط محور و قاب فرق می‌کند.', { size: 15 });

  function panel(x0, x1, top, bottom, ymin, ymax, ticks, label, hot) {
    let p = '';
    const X = i => x0 + (i / (data.length - 1)) * (x1 - x0);
    const Y = v => bottom - ((v - ymin) / (ymax - ymin)) * (bottom - top);
    // frame + grid
    p += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${bottom - top}" fill="${TINT}" fill-opacity="0.55" stroke="${GRID}"/>`;
    for (const t of ticks) {
      p += line(x0, Y(t), x1, Y(t), GRID, 1);
      p += T(x0 - 7, Y(t) + 5, fa(t), { align: 'left', size: 13, color: SOFT });
    }
    p += line(x0, top, x0, bottom, INK, 1.4);
    p += line(x0, bottom, x1, bottom, INK, 1.4);
    // data
    const pts = data.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' L ');
    p += `<path d="M ${pts}" fill="none" stroke="${hot ? RED : ACCENT}" stroke-width="2.6" stroke-linejoin="round"/>`;
    data.forEach((v, i) => { p += `<circle cx="${X(i)}" cy="${Y(v)}" r="2.6" fill="${hot ? RED : ACCENT}"/>`; });
    // labels
    p += T((x0 + x1) / 2, top - 14, label, { align: 'center', size: 15, weight: 700, color: INK });
    p += T((x0 + x1) / 2, bottom + 22, 'دوازده ماه', { align: 'center', size: 13, color: FAINT });
    return p;
  }

  // read right-to-left: full axis, truncated axis, truncated + tall
  s += panel(500, 720, 120, 330, 0, 24, [0, 6, 12, 18, 24], 'محور از صفر', false);
  s += panel(230, 450, 120, 330, 19.8, 22.2, [20, 21, 22], 'محور بریده', false);
  s += panel(70, 160, 120, 410, 19.8, 22.2, [20, 21, 22], 'بریده و بلند', true);

  // the gee-whiz remark next to the tall panel
  s += T(200, 372, 'واو!', { align: 'center', size: 20, weight: 800, color: RED });
  s += T(200, 396, 'همان ده درصد', { align: 'center', size: 12.5, color: RED });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 2
// Three campaign charts, one colour legend, three different definitions of
// which years count as «تحریم». Year ranges as reported in the draft.
function figTimelines() {
  const W = 760, H = 340;
  const y0 = 2005, y1 = 2024; // axis spans 2005 … 2023 inclusive
  const ax0 = 60, ax1 = 590;
  const X = yr => ax0 + ((yr - y0) / (y1 - y0)) * (ax1 - ax0);

  const rows = [
    { label: 'رشد اقتصادی', red: [[2010, 2013, '۲۰۱۰ تا ۲۰۱۲'], [2016, 2024, 'از ۲۰۱۶ به بعد']] },
    { label: 'تورم', red: [[2005, 2014, '۲۰۰۵ تا ۲۰۱۳'], [2017, 2024, 'از ۲۰۱۷ به بعد']] },
    { label: 'فروش نفت', red: [[2012, 2016, '۲۰۱۲ تا ۲۰۱۵'], [2018, 2024, 'از ۲۰۱۸ به بعد']] },
  ];

  let s = '';
  s += T(720, 38, 'سه نمودار یک کارزار؛ کدام سال‌ها «تحریم» رنگ خورده‌اند؟', { size: 17.5, weight: 700, color: INK });
  // legend
  s += `<rect x="690" y="52" width="30" height="13" rx="3" fill="${BLUE}"/>`;
  s += T(682, 64, 'توافق', { align: 'right', size: 14 });
  s += `<rect x="600" y="52" width="30" height="13" rx="3" fill="${RED}"/>`;
  s += T(592, 64, 'تحریم', { align: 'right', size: 14 });

  const rowY = [118, 176, 234];
  const h = 24;
  rows.forEach((r, k) => {
    const y = rowY[k];
    // blue base, red segments on top
    s += `<rect x="${ax0}" y="${y}" width="${ax1 - ax0}" height="${h}" rx="4" fill="${BLUE}"/>`;
    for (const [a, b, txt] of r.red) {
      s += `<rect x="${X(a)}" y="${y}" width="${X(b) - X(a)}" height="${h}" fill="${RED}"/>`;
      s += T((X(a) + X(b)) / 2, y + h / 2 + 4.5, txt, { align: 'center', size: 11.5, weight: 700, color: '#ffffff' });
    }
    for (const [a, b] of r.red) {
      if (a > y0) s += line(X(a), y - 2, X(a), y + h + 2, '#ffffff', 2);
      if (b < y1) s += line(X(b), y - 2, X(b), y + h + 2, '#ffffff', 2);
    }
    s += `<rect x="${ax0}" y="${y}" width="${ax1 - ax0}" height="${h}" rx="4" fill="none" stroke="#ffffff" stroke-width="1.5"/>`;
    s += T(720, y + h / 2 + 5.5, r.label, { align: 'right', size: 15.5, weight: 700, color: INK });
  });

  // year axis
  const base = 290;
  s += line(ax0, base, ax1, base, INK, 1.2);
  for (let yr = 2005; yr <= 2023; yr += 3) {
    s += line(X(yr) + (ax1 - ax0) / (y1 - y0) / 2, base, X(yr) + (ax1 - ax0) / (y1 - y0) / 2, base + 6, INK, 1);
    s += T(X(yr) + (ax1 - ax0) / (y1 - y0) / 2, base + 24, fa(yr), { align: 'center', size: 12.5, color: FAINT, ltr: true });
  }
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 3
// One A/B result — call rate 10.00 % → 10.20 %, CI +0.06 … +0.34 — told three
// ways: bars from zero, bars from 9.9, and the effect itself against a
// pre-registered threshold.
function figNarratives() {
  const W = 760, H = 450;
  let s = '';
  s += T(720, 38, 'یک آزمایش، سه روایت: نرخ تماس از ۱۰٫۰۰ به ۱۰٫۲۰ درصد', { size: 17.5, weight: 700, color: INK });
  s += T(720, 62, 'از راست: دو میله با محور از صفر؛ همان دو میله با محور بریده؛ نمودارِ خودِ اثر.', { size: 15 });

  function bars(x0, x1, top, bottom, ymin, ymax, ticks, label, hot) {
    let p = '';
    const Y = v => bottom - ((v - ymin) / (ymax - ymin)) * (bottom - top);
    p += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${bottom - top}" fill="${TINT}" fill-opacity="0.55" stroke="${GRID}"/>`;
    for (const t of ticks) {
      p += line(x0, Y(t), x1, Y(t), GRID, 1);
      p += T(x0 - 7, Y(t) + 5, fa(t), { align: 'left', size: 12.5, color: FAINT });
    }
    p += line(x0, top, x0, bottom, INK, 1.4);
    p += line(x0, bottom, x1, bottom, INK, 1.4);
    const bw = 44;
    const cx = [x0 + (x1 - x0) * 0.32, x0 + (x1 - x0) * 0.68];
    const vals = [10.00, 10.20];
    const names = ['کنترل', 'نسخه‌ی جدید'];
    vals.forEach((v, i) => {
      const yv = Y(v);
      p += `<rect x="${cx[i] - bw / 2}" y="${yv}" width="${bw}" height="${bottom - yv}" fill="${i ? (hot ? RED : ACCENT) : '#c9bfe4'}"/>`;
      p += T(cx[i], yv - 8, fa(v.toFixed(2)) + '٪', { align: 'center', size: 12.5, weight: 700, color: i ? (hot ? RED : ACCENT) : SOFT });
      p += T(cx[i], bottom + 22, names[i], { align: 'center', size: 13, color: SOFT });
    });
    p += T((x0 + x1) / 2, top - 14, label, { align: 'center', size: 15, weight: 700, color: INK });
    return p;
  }

  s += bars(560, 720, 130, 350, 0, 11, [0, 5, 10], 'روایت نخست: تقریباً هیچ', false);
  s += bars(355, 515, 130, 350, 9.9, 10.3, [9.9, 10.0, 10.1, 10.2, 10.3], 'روایت دوم: جهشی بزرگ', true);

  // effect plot
  const x0 = 60, x1 = 300, emin = -0.1, emax = 0.4;
  const X = e => x0 + ((e - emin) / (emax - emin)) * (x1 - x0);
  const top = 130, bottom = 350, mid = 250;
  s += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${bottom - top}" fill="${TINT}" fill-opacity="0.55" stroke="${GRID}"/>`;
  s += T((x0 + x1) / 2, top - 14, 'روایت سوم: به‌اندازه‌ی تصمیم', { align: 'center', size: 15, weight: 700, color: INK });
  s += line(x0, bottom, x1, bottom, INK, 1.4);
  for (const t of [-0.1, 0, 0.1, 0.2, 0.3, 0.4]) {
    s += line(X(t), bottom, X(t), bottom + 6, INK, 1);
    s += T(X(t), bottom + 22, fa(t), { align: 'center', size: 12.5, color: FAINT, ltr: true });
  }
  s += T((x0 + x1) / 2, bottom + 44, 'افزایش نرخ تماس (واحد درصد)', { align: 'center', size: 13, color: SOFT });
  // zero line
  s += line(X(0), top, X(0), bottom, SOFT, 1.4);
  s += T(X(0) - 6, top + 20, 'بدون اثر', { align: 'right', size: 12.5, color: SOFT });
  // threshold
  s += line(X(0.15), top, X(0.15), bottom, RED, 1.4, '5 4');
  s += T(X(0.15) + 6, top + 20, 'کمترین اثر ارزشمند', { align: 'left', size: 12.5, color: RED });
  s += T(X(0.15) + 6, top + 38, '۰٫۱۵', { align: 'left', size: 12.5, color: RED });
  // estimate + interval
  s += line(X(0.06), mid, X(0.34), mid, ACCENT, 3);
  s += line(X(0.06), mid - 9, X(0.06), mid + 9, ACCENT, 2.2);
  s += line(X(0.34), mid - 9, X(0.34), mid + 9, ACCENT, 2.2);
  s += `<circle cx="${X(0.20)}" cy="${mid}" r="7" fill="${ACCENT}" stroke="#fff" stroke-width="2"/>`;
  s += T(X(0.20), mid - 20, '۰٫۲۰', { align: 'center', size: 14, weight: 700, color: ACCENT });
  s += T(X(0.06), mid + 30, '۰٫۰۶', { align: 'center', size: 12.5, color: ACCENT });
  s += T(X(0.34), mid + 30, '۰٫۳۴', { align: 'center', size: 12.5, color: ACCENT });
  s += T(X(0.20), mid + 62, 'برآورد و بازه‌ی عدم‌قطعیت', { align: 'center', size: 12.5, color: SOFT, halo: true });

  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 4
// Huff's Columbia Gas ad: cost of living (+60 %) and cost of gas (−4 %) over
// ten years, as index numbers. Once in the ad's frame (axis from 90), once
// with the axis from zero.
function figGasAd() {
  const W = 760, H = 420;
  const living = [100, 104, 109, 113, 120, 128, 135, 142, 150, 156, 160];
  const gas = [100, 101, 100, 99, 99, 98, 97, 97, 96, 96, 96];

  let s = '';
  s += T(720, 38, 'هزینه‌ی زندگی و هزینه‌ی گاز در ده سال، به‌صورت شاخص (سال نخست = ۱۰۰)', { size: 17.5, weight: 700, color: INK });
  s += T(720, 62, 'راست: قاب تبلیغ، محور از ۹۰. چپ: همان دو خط، محور از صفر.', { size: 15 });

  function panel(x0, x1, top, bottom, ymin, ymax, ticks, label) {
    let p = '';
    const n = living.length;
    const X = i => x0 + (i / (n - 1)) * (x1 - x0);
    const Y = v => bottom - ((v - ymin) / (ymax - ymin)) * (bottom - top);
    p += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${bottom - top}" fill="${TINT}" fill-opacity="0.55" stroke="${GRID}"/>`;
    for (const t of ticks) {
      p += line(x0, Y(t), x1, Y(t), GRID, 1);
      p += T(x0 - 7, Y(t) + 5, fa(t), { align: 'left', size: 13, color: SOFT });
    }
    p += line(x0, top, x0, bottom, INK, 1.4);
    p += line(x0, bottom, x1, bottom, INK, 1.4);
    const draw = (arr, c) => {
      const pts = arr.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' L ');
      p += `<path d="M ${pts}" fill="none" stroke="${c}" stroke-width="2.6" stroke-linejoin="round"/>`;
      arr.forEach((v, i) => { p += `<circle cx="${X(i)}" cy="${Y(v)}" r="2.4" fill="${c}"/>`; });
    };
    draw(living, ACCENT);
    draw(gas, RED);
    p += T(X(n - 1) - 8, Y(living[n - 1]) - 10, 'هزینه‌ی زندگی ۱۶۰', { align: 'right', size: 13, weight: 700, color: ACCENT });
    p += T(X(n - 1) - 8, Y(gas[n - 1]) - 10, 'هزینه‌ی گاز ۹۶', { align: 'right', size: 13, weight: 700, color: RED, halo: true });
    p += T((x0 + x1) / 2, top - 14, label, { align: 'center', size: 15, weight: 700, color: INK });
    p += T((x0 + x1) / 2, bottom + 22, 'ده سال', { align: 'center', size: 13, color: FAINT });
    return p;
  }

  s += panel(430, 720, 120, 360, 90, 170, [90, 110, 130, 150, 170], 'قاب تبلیغ: محور از ۹۰');
  s += panel(70, 360, 120, 360, 0, 170, [0, 50, 150], 'همان داده: محور از صفر');
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 5
// Huff's government-pay chart: 19.5 → 20.2 million dollars (< 4 %), once with
// the axis cut just under the data («جهش کرد!»), once from zero.
function figPay() {
  const W = 760, H = 420;
  const pay = [19.5, 19.55, 19.7, 19.8, 19.85, 20.0, 20.1, 20.2];

  let s = '';
  s += T(720, 38, 'حقوق کارکنان دولت: از ۱۹٫۵ به ۲۰٫۲ میلیون دلار — کم‌تر از چهار درصد', { size: 17.5, weight: 700, color: INK });
  s += T(720, 62, 'یک داده، دو تیتر؛ فرق فقط در جایی است که محور عمودی آغاز می‌شود.', { size: 15 });

  function panel(x0, x1, top, bottom, ymin, ymax, ticks, label, hot) {
    let p = '';
    const n = pay.length;
    const X = i => x0 + (i / (n - 1)) * (x1 - x0);
    const Y = v => bottom - ((v - ymin) / (ymax - ymin)) * (bottom - top);
    p += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${bottom - top}" fill="${TINT}" fill-opacity="0.55" stroke="${GRID}"/>`;
    for (const t of ticks) {
      p += line(x0, Y(t), x1, Y(t), GRID, 1);
      p += T(x0 - 7, Y(t) + 5, fa(t), { align: 'left', size: 13, color: SOFT });
    }
    p += line(x0, top, x0, bottom, INK, 1.4);
    p += line(x0, bottom, x1, bottom, INK, 1.4);
    const c = hot ? RED : ACCENT;
    const pts = pay.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' L ');
    p += `<path d="M ${pts}" fill="none" stroke="${c}" stroke-width="2.6" stroke-linejoin="round"/>`;
    pay.forEach((v, i) => { p += `<circle cx="${X(i)}" cy="${Y(v)}" r="2.6" fill="${c}"/>`; });
    p += T(X(0) + 16, Y(pay[0]) - 16, '۱۹٫۵', { align: 'left', size: 13, weight: 700, color: c, halo: true });
    p += T(X(n - 1) - 4, Y(pay[n - 1]) - 10, '۲۰٫۲', { align: 'right', size: 13, weight: 700, color: c, halo: true });
    p += T((x0 + x1) / 2, top - 14, label, { align: 'center', size: 16, weight: 700, color: hot ? RED : INK });
    p += T((x0 + x1) / 2, bottom + 22, 'میلیون دلار', { align: 'center', size: 13, color: FAINT });
    return p;
  }

  s += panel(430, 720, 120, 360, 19.4, 20.3, [19.5, 20.0], 'حقوق کارکنان دولت جهش کرد!', true);
  s += panel(70, 360, 120, 360, 0, 24, [0, 6, 12, 18, 24], 'حقوق کارکنان دولت تقریباً ثابت ماند.', false);
  return svg(W, H, s);
}

const FIGS = [
  { name: 'statistics_gee_whiz_three_frames', svg: figFrames(), w: 760, h: 450 },
  { name: 'statistics_sanction_period_timelines', svg: figTimelines(), w: 760, h: 340 },
  { name: 'statistics_ab_test_three_narratives', svg: figNarratives(), w: 760, h: 450 },
  { name: 'statistics_gas_ad_two_frames', svg: figGasAd(), w: 760, h: 420 },
  { name: 'statistics_government_pay_two_headlines', svg: figPay(), w: 760, h: 420 },
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
