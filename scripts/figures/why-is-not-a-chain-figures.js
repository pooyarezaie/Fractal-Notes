// Renders the two cause-tree figures of the ««چرا؟» یک زنجیره نیست» note to PNG
// through headless Chromium so the Persian labels get real Vazirmatn shaping
// and correct bidi. Run from the repo root:
//   node scripts/figures/why-is-not-a-chain-figures.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const REPO = path.join(__dirname, '..', '..');
const OUT = path.join(REPO, 'assets/img');
// Inline the font as a data URI: a file:// @font-face src is blocked in a page
// created via setContent, and the fallback to the default sans is silent.
const FONT = 'data:font/woff2;base64,' +
  fs.readFileSync(path.join(REPO, 'assets/fonts/Vazirmatn-wght.woff2')).toString('base64');

const INK = '#14121c';
const SOFT = '#55516a';
const FAINT = '#8b869f';
const ACCENT = '#4a3184';
const RED = '#b4322e';
const RULE = '#c9c3dc';

const W = 700;        // figure width, same as the other notes' figures
const M = 28;         // right margin
const IND = 30;       // indent per depth, toward the left
const ROW = 32;       // row pitch
const PAD = 20;       // top/bottom padding
const BUL = 11;       // gap between bullet center and the text's right edge

// A node is [label, children?] or [label, mark, children?] where mark is one of
// 'yes' (✓), 'no' (×), 'maybe' (؟). Labels that end in «؟» are hypotheses and
// are drawn softer than stated facts.
// Flattens the tree into rows (one per line, top to bottom) and returns the
// node for `def`; each node keeps its child nodes in `kids`.
function tree(def, rows, depth = 0) {
  const [label, a, b] = def;
  const mark = typeof a === 'string' ? a : null;
  const kids = Array.isArray(a) ? a : (Array.isArray(b) ? b : []);
  const row = { label, mark, depth, y: PAD + ROW / 2 + rows.length * ROW, kids: [] };
  rows.push(row);
  for (const k of kids) row.kids.push(tree(k, rows, depth + 1));
  return row;
}

const xr = d => W - M - d * IND;          // right edge of the text
const bx = d => xr(d) + BUL;              // bullet center

function text(x, y, str, o = {}) {
  return `<text x="${x}" y="${y}" direction="rtl" text-anchor="start" dominant-baseline="middle"` +
    ` font-size="${o.size || 15}" fill="${o.color || INK}"${o.weight ? ` font-weight="${o.weight}"` : ''}>${str}</text>`;
}
const line = (x1, y1, x2, y2, c = RULE, w = 1.5) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;

function marker(cx, cy, kind) {
  if (kind === 'yes') {
    return `<circle cx="${cx}" cy="${cy}" r="8.5" fill="${ACCENT}"/>` +
      `<polyline points="${cx - 4},${cy} ${cx - 1.2},${cy + 3} ${cx + 4.2},${cy - 3.2}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (kind === 'no') {
    return `<circle cx="${cx}" cy="${cy}" r="8.5" fill="${RED}"/>` +
      line(cx - 3.4, cy - 3.4, cx + 3.4, cy + 3.4, '#fff', 2) + line(cx - 3.4, cy + 3.4, cx + 3.4, cy - 3.4, '#fff', 2);
  }
  if (kind === 'maybe') {
    return `<circle cx="${cx}" cy="${cy}" r="8.5" fill="#fff" stroke="${FAINT}" stroke-width="1.6"/>` +
      `<text x="${cx}" y="${cy + 0.5}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700" fill="${FAINT}">؟</text>`;
  }
  return '';
}

function render(def) {
  const rows = [];
  tree(def, rows);
  const H = PAD * 2 + rows.length * ROW;
  let s = `<rect width="${W}" height="${H}" fill="#fff"/>`;
  // Trunks first, so bullets sit on top of them.
  for (const r of rows) {
    if (!r.kids.length) continue;
    const last = r.kids[r.kids.length - 1];
    s += line(bx(r.depth + 1), r.y + 9, bx(r.depth + 1), last.y);
  }
  for (const r of rows) {
    const hyp = /؟$/.test(r.label);
    const root = r.depth === 0;
    if (r.mark) {
      s += marker(bx(r.depth), r.y, r.mark);
    } else {
      s += `<circle cx="${bx(r.depth)}" cy="${r.y}" r="${root ? 5 : hyp ? 3.2 : 4}" fill="${root ? INK : hyp ? '#fff' : SOFT}"` +
        (hyp ? ` stroke="${FAINT}" stroke-width="1.5"` : '') + '/>';
    }
    s += text(xr(r.depth), r.y, r.label, {
      color: root ? INK : hyp ? SOFT : INK,
      weight: root ? 700 : undefined,
      size: root ? 16 : 15,
    });
  }
  return { svg: `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`, h: H };
}

// Figure 1: the full tree of hypotheses, three directions under one incident.
const HYPOTHESES = ['ثبت آگهی برای ده دقیقه ممکن نبود', [
  ['دیسک پر شده بود', [
    ['لاگ‌ها بسیار بزرگ شده بودند', [
      ['سطح لاگ‌گیری زیاد بود؟'],
      ['ترافیک بیشتر شده بود؟'],
    ]],
    ['چرخش لاگ کار نمی‌کرد', [
      ['تنظیم در استقرار جا افتاده بود؟'],
      ['فرایند چرخش خطا داده بود؟'],
    ]],
    ['فضای کافی باقی نمانده بود', [
      ['فایل پشتیبان موقت پاک نشده بود؟'],
    ]],
  ]],
  ['پرشدن دیسک ثبت آگهی را متوقف کرد', [
    ['برنامه نمی‌توانست خطای نوشتن را تحمل کند؟'],
  ]],
  ['پیش از خرابی هشداری دریافت نشد', [
    ['هشدار ظرفیت نداشتیم؟'],
    ['هشدار داشتیم اما به کسی نرسید؟'],
  ]],
]];

// Figure 2: the same kind of tree after checking each branch against evidence.
const EVIDENCE = ['دیسک پر شد', 'yes', [
  ['لاگ‌ها ۸۲ گیگابایت بودند', 'yes'],
  ['چرخش لاگ خاموش بود', 'yes', [
    ['در استقرار دیروز حذف شده بود', 'maybe'],
  ]],
  ['فایل پشتیبان بزرگ روی همان دیسک بود', 'no'],
]];

const FIGS = [
  { name: 'why_tree_hypotheses', ...render(HYPOTHESES) },
  { name: 'why_tree_evidence', ...render(EVIDENCE) },
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
    await page.setViewportSize({ width: W, height: f.h });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await (await page.$('svg')).screenshot({ path: path.join(OUT, f.name + '.png') });
    console.log('wrote', f.name + '.png', W + 'x' + f.h);
  }
  await browser.close();
})();
