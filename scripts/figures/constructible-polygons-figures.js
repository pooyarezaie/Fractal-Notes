// Renders the figures of the «چندضلعی‌های منتظمِ ساختنی» note to PNG through
// headless Chromium so the Persian labels get real Vazirmatn shaping and
// correct bidi. Run from the repo root:
//   node scripts/figures/constructible-polygons-figures.js
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
const RULE = '#d9d3ea';

// Digit policy in these figures: Persian digits for things the reader reads as
// Persian prose (the value of n, how many roots, an angle in degrees), Latin
// digits inside algebraic notation (ζ², X² + X − 4 = 0), matching the note.
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
// Latin/mathematical label. Kept in its own helper so no Persian run ever ends
// up sharing a text element with a formula.
const M = (x, y, str, o = {}) =>
  `<text x="${x}" y="${y}" direction="ltr" text-anchor="${o.align === 'left' ? 'start' : o.align === 'right' ? 'end' : 'middle'}" font-size="${o.size || 15}" fill="${o.color || SOFT}"${o.weight ? ` font-weight="${o.weight}"` : ''}>${str}</text>`;

const line = (x1, y1, x2, y2, c = INK, w = 1.5, dash = '') =>
  `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const circ = (cx, cy, r, o = {}) =>
  `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r}" fill="${o.fill || 'none'}" stroke="${o.stroke || 'none'}" stroke-width="${o.w || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
const box = (x, y, w, h, o = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r === undefined ? 8 : o.r}" fill="${o.fill || 'none'}" stroke="${o.stroke || 'none'}" stroke-width="${o.w || 1.4}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;

// Screen point on a circle for a math-convention angle (CCW, y up).
const P = (cx, cy, r, t) => [cx + r * Math.cos(t), cy - r * Math.sin(t)];
const d2r = d => d * Math.PI / 180;
// y is flipped, so an increasing math angle sweeps counter-clockwise = flag 0.
function arcPath(cx, cy, r, t0, t1) {
  const [x0, y0] = P(cx, cy, r, t0), [x1, y1] = P(cx, cy, r, t1);
  const large = Math.abs(t1 - t0) > Math.PI ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} ${t1 > t0 ? 0 : 1} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
const arc = (cx, cy, r, t0, t1, o = {}) =>
  `<path d="${arcPath(cx, cy, r, t0, t1)}" fill="none" stroke="${o.stroke || INK}" stroke-width="${o.w || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
// Filled pie sector from the centre.
const wedge = (cx, cy, r, t0, t1, o = {}) =>
  `<path d="M ${cx} ${cy} L ${arcPath(cx, cy, r, t0, t1).slice(2)} Z" fill="${o.fill || TINT}" fill-opacity="${o.op === undefined ? 1 : o.op}" stroke="${o.stroke || 'none'}" stroke-width="${o.w || 1.2}"/>`;

// Regular n-gon inscribed in a circle, first vertex on the positive real axis.
const polyPoints = (cx, cy, r, n, rot = 0) =>
  Array.from({ length: n }, (_, k) => P(cx, cy, r, rot + 2 * Math.PI * k / n));
const polyPath = pts => pts.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');

// Exact intersections of the segment through a,b with the circle (c, r).
function lineCircle(a, b, c, r) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const fx = a[0] - c[0], fy = a[1] - c[1];
  const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - r * r;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return [];
  const s = Math.sqrt(disc);
  return [(-B - s) / (2 * A), (-B + s) / (2 * A)].map(t => [a[0] + t * dx, a[1] + t * dy]);
}

const ARROW = `
  <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${ACCENT}"/></marker>`;
const arrow = (x1, y1, x2, y2, o = {}) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke || ACCENT}" stroke-width="${o.w || 1.6}" marker-end="url(#ar)"/>`;

function svg(w, h, body) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>${ARROW}</defs><rect width="${w}" height="${h}" fill="#ffffff"/>${body}</svg>`;
}
// Every figure opens with the same right-aligned headline + subtitle pair.
const head = (title, sub) =>
  T(730, 38, title, { size: 17.5, weight: 700, color: INK }) + T(730, 62, sub, { size: 15 });

// Set of constructible n: 2^a times a product of distinct Fermat primes.
const FERMAT = [3, 5, 17, 257, 65537];
function constructible(n) {
  if (n < 3) return false;
  let m = n;
  while (m % 2 === 0) m /= 2;
  if (m === 1) return true;
  let used = 0;
  for (const p of FERMAT) {
    if (m % p === 0) {
      m /= p;
      if (m % p === 0) return false; // a repeated Fermat prime is not allowed
      used++;
    }
  }
  return m === 1 && used > 0;
}

// ---------------------------------------------------------------- figure 0
// Optional cover band: the polygons from 3 to 17, the constructible ones drawn
// solid, the impossible ones left as dashed outlines.
function figCoverBand() {
  const W = 760, H = 172;
  const first = 3, last = 17, count = last - first + 1;
  const pitch = W / count, r = 21, cy = 66;

  let s = '';
  for (let n = first; n <= last; n++) {
    const cx = W - pitch * (n - first) - pitch / 2; // n = 3 sits on the right
    const ok = constructible(n);
    const pts = polyPoints(cx, cy, r, n, Math.PI / 2);
    s += `<polygon points="${polyPath(pts)}" fill="${ok ? TINT : 'none'}"
      stroke="${ok ? ACCENT : FAINT}" stroke-width="${ok ? 1.9 : 1.3}"${ok ? '' : ' stroke-dasharray="3 3"'}/>`;
    s += T(cx, cy + r + 26, fa(n), { align: 'center', size: 14, weight: ok ? 700 : 400, color: ok ? ACCENT : FAINT });
  }
  s += T(W - 20, 152, 'پررنگ‌ها با خط‌کش و پرگار ساختنی‌اند؛ چین‌چین‌ها نه.', { size: 13.5, color: SOFT });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 1
// The vertices of a regular n-gon are the nth roots of unity, and the whole
// figure is generated by repeating the very first step.
function figRootsOfUnity() {
  const W = 760, H = 470;
  const cx = 380, cy = 268, r = 116, n = 9;
  const step = 2 * Math.PI / n;

  let s = head('رأس‌های چندضلعی منتظم، همان ریشه‌های واحدند',
    'هر رأس توانی از ζ است؛ پس رسمِ کل شکل به ساختنِ همان نخستین گام فروکاسته می‌شود.');

  s += line(cx - r - 48, cy, cx + r + 48, cy, RULE, 1.2);
  s += line(cx, cy - r - 38, cx, cy + r + 38, RULE, 1.2);
  s += M(cx + r + 46, cy + 20, 'Re', { align: 'left', size: 13, color: FAINT });
  s += M(cx + 10, cy - r - 42, 'Im', { align: 'left', size: 13, color: FAINT });

  s += circ(cx, cy, r, { stroke: RULE, w: 1.4, dash: '4 4' });
  const pts = polyPoints(cx, cy, r, n);
  s += `<polygon points="${polyPath(pts)}" fill="${TINT}" fill-opacity="0.8" stroke="${ACCENT}" stroke-width="1.9"/>`;

  // the projection of ζ onto the real axis
  const [zx, zy] = pts[1];
  const px = cx + r * Math.cos(step);
  s += line(zx, zy, px, cy, ACCENT, 1.3, '4 3');
  s += circ(px, cy, 4.5, { fill: ACCENT });
  s += M(px, cy + 30, 'cos(2π/n)', { size: 14.5, color: ACCENT, weight: 700 });

  // the central angle between 1 and ζ
  s += arc(cx, cy, 46, 0, step, { stroke: INK, w: 1.4 });
  const [ax, ay] = P(cx, cy, 70, step / 2);
  s += M(ax, ay + 5, '2π/n', { size: 14.5, color: INK });
  s += line(cx, cy, zx, zy, INK, 1.2, '3 3');

  pts.forEach(([x, y], k) => {
    s += circ(x, y, 5.5, { fill: k <= 1 ? ACCENT : '#ffffff', stroke: ACCENT, w: 1.9 });
    if (k === 0) { s += T(cx + r + 18, cy - 16, '۱', { align: 'center', size: 16, weight: 700, color: ACCENT }); return; }
    const [lx, ly] = P(cx, cy, r + 24, step * k);
    s += M(lx, ly + 5, k === 1 ? 'ζ' : `ζ<tspan font-size="10" dy="-6">${k}</tspan>`,
      { size: k === 1 ? 17 : 15, color: k === 1 ? ACCENT : SOFT, weight: k === 1 ? 700 : 400 });
  });
  s += circ(cx, cy, 3, { fill: FAINT });

  s += T(730, 444, 'این نقطه‌ها همیشه وجود دارند؛ پرسش این است که کدامشان با خط‌کش و پرگار به چنگ می‌آیند.', { size: 14, color: SOFT });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 2
// Constructing cos(2π/n) on the real axis is the whole problem: a perpendicular
// then cuts the unit circle at the vertex itself.
function figCosToZeta() {
  const W = 760, H = 420;
  const cx = 470, cy = 232, r = 112, t = 2 * Math.PI / 9;
  const px = cx + r * Math.cos(t);
  const [zx, zy] = P(cx, cy, r, t);

  let s = head('از یک عددِ حقیقی تا رأسِ چندضلعی',
    'اگر آن عدد روی محور ساخته شود، یک عمود بی‌درنگ رأس را می‌دهد.');

  s += line(cx - r - 46, cy, cx + r + 46, cy, RULE, 1.2);
  s += M(cx + r + 50, cy + 20, 'Re', { align: 'left', size: 13, color: FAINT });
  s += circ(cx, cy, r, { stroke: INK, w: 1.6 });
  s += circ(cx, cy, 3, { fill: FAINT });

  // step 1: the number itself, laid along the axis. The label sits on the left
  // of the perpendicular so no text ever crosses that dashed line.
  s += line(cx, cy, px, cy, ACCENT, 4);
  s += circ(px, cy, 5.5, { fill: ACCENT });
  s += M(cx + (px - cx) / 2, cy + 26, 'cos(2π/n)', { size: 14.5, color: ACCENT, weight: 700 });

  // step 2: the perpendicular and its two intersections
  s += line(px, cy - r - 24, px, cy + r + 24, ACCENT, 1.5, '5 4');
  s += circ(zx, zy, 6, { fill: ACCENT });
  s += circ(zx, 2 * cy - zy, 6, { fill: '#ffffff', stroke: ACCENT, w: 1.9 });
  s += M(zx + 20, zy - 2, 'ζ', { align: 'left', size: 18, weight: 700, color: ACCENT });
  s += M(zx + 20, 2 * cy - zy + 16, 'ζ⁻¹', { align: 'left', size: 15, color: SOFT });
  s += line(cx, cy, zx, zy, INK, 1.2, '3 3');

  // the two moves, spelled out in the space to the left of the circle
  const lx0 = 34, lw = 300;
  [['گامِ ۱', 'عددِ cos(2π/n) را روی محور بساز', 152],
   ['گامِ ۲', 'عمود برافراز؛ برخورد با دایره، رأس است', 244]].forEach(([tag, txt, y]) => {
    s += box(lx0, y, lw, 76, { fill: TINT, stroke: RULE });
    s += T(lx0 + lw - 16, y + 28, tag, { size: 15, weight: 700, color: ACCENT });
    s += T(lx0 + lw - 16, y + 52, txt, { size: 12.5, color: SOFT });
  });

  s += T(730, 394, 'پس ساختنِ چندضلعی و ساختنِ آن عددِ حقیقی، یک مسئله‌اند.', { size: 14.5, color: SOFT });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 3
// Every new point comes from an intersection, and the worst equation an
// intersection can raise is a quadratic — which the compass can actually solve.
function figIntersections() {
  const W = 760, H = 360;
  const pw = 168, ph = 168, gap = 16, y0 = 104;
  const x0 = (W - (4 * pw + 3 * gap)) / 2;

  const dot = (x, y) => circ(x, y, 5, { fill: ACCENT, stroke: '#ffffff', w: 1.4 });

  // two straight lines
  let a = line(22, 130, 146, 40, INK, 1.6) + line(22, 48, 146, 136, INK, 1.6) + dot(83.6, 90.5);

  // a line and a circle — intersections solved exactly, not eyeballed
  const bc = [84, 88], br = 52, bp = [[16, 108], [152, 66]];
  let b = circ(bc[0], bc[1], br, { stroke: INK, w: 1.6 }) + line(bp[0][0], bp[0][1], bp[1][0], bp[1][1], INK, 1.6);
  for (const [x, y] of lineCircle(bp[0], bp[1], bc, br)) b += dot(x, y);

  // two circles
  const d = 56, rr = 48, mx = 84, my = 88, hx = Math.sqrt(rr * rr - (d / 2) * (d / 2));
  let c = circ(mx - d / 2, my, rr, { stroke: INK, w: 1.6 }) + circ(mx + d / 2, my, rr, { stroke: INK, w: 1.6 })
    + dot(mx, my - hx) + dot(mx, my + hx);

  // the geometric mean: a semicircle over 1 + a gives √a
  const gy = 126, gx0 = 22, gx1 = 148, gm = 66;
  const gr = (gx1 - gx0) / 2, gc = (gx0 + gx1) / 2;
  const hh = Math.sqrt(Math.max(0, gr * gr - (gm - gc) * (gm - gc)));
  let e = arc(gc, gy, gr, Math.PI, 0, { stroke: INK, w: 1.6 })
    + line(gx0, gy, gx1, gy, INK, 1.6)
    + line(gm, gy, gm, gy - hh, ACCENT, 2) + dot(gm, gy - hh)
    + M(gm - 14, gy - hh / 2 + 4, '√a', { align: 'right', size: 15, color: ACCENT, weight: 700 })
    + M((gx0 + gm) / 2, gy + 18, 'a', { size: 13 }) + M((gm + gx1) / 2, gy + 18, '1', { size: 13 });

  let s = head('نقطه‌های تازه فقط از تقاطع می‌آیند', 'و بدترین معادله‌ای که پیش می‌آید، درجهٔ دو است.');
  const panels = [
    ['دو خط', 'معادلهٔ درجهٔ یک', a, false],
    ['خط و دایره', 'معادلهٔ درجهٔ دو', b, false],
    ['دو دایره', 'معادلهٔ درجهٔ دو', c, false],
    ['واسطهٔ هندسی', 'ریشهٔ دوم در دسترس است', e, true],
  ];
  panels.forEach(([title, note, draw, hot], i) => {
    const x = x0 + (3 - i) * (pw + gap); // right to left
    s += box(x, y0, pw, ph, { fill: TINT, stroke: RULE });
    s += `<g transform="translate(${x},${y0})">${draw}</g>`;
    s += T(x + pw / 2, y0 + ph + 24, title, { align: 'center', size: 14.5, weight: 700, color: INK });
    s += T(x + pw / 2, y0 + ph + 46, note, { align: 'center', size: 13.5, color: hot ? ACCENT : SOFT });
  });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 4
// The tower of quadratic extensions: every rung doubles the possibilities, so
// the degree of anything reachable is a power of two.
function figQuadraticTower() {
  const W = 760, H = 440;
  const bw = 250, bh = 46, cx = W / 2;
  const rows = [
    { y: 344, label: 'K₀ = ℚ', note: 'اعداد گویا' },
    { y: 262, label: 'K₁', note: 'یک ریشهٔ دوم' },
    { y: 180, label: 'K₂', note: 'دو ریشهٔ دوم' },
    { y: 76, label: 'Kₛ', note: 'عددِ ساختنی این‌جاست' },
  ];

  let s = head('برجِ ساخت: هر پله فقط یک ریشهٔ دوم',
    'چون شمارِ امکان‌ها در هر پله دقیقاً دو برابر می‌شود، درجهٔ عدد نهایی توانی از ۲ است.');

  rows.forEach((rw, i) => {
    const top = i === 3;
    s += box(cx - bw / 2, rw.y, bw, bh, { fill: top ? ACCENT : TINT, stroke: top ? ACCENT : RULE });
    s += M(cx - bw / 2 + 30, rw.y + 30, rw.label, { align: 'left', size: 17, weight: 700, color: top ? '#ffffff' : INK });
    s += T(cx + bw / 2 - 16, rw.y + 30, rw.note, { size: 13.5, color: top ? '#e6dff5' : SOFT });
  });

  const rung = (yFrom, yTo, idx) => {
    let g = arrow(cx, yFrom, cx, yTo + 2, { w: 1.6 });
    const my = (yFrom + yTo) / 2 + 5;
    g += M(cx + 16, my, idx, { align: 'left', size: 13.5, color: ACCENT, weight: 700 });
    g += T(cx - 16, my, 'یک انتخابِ درجهٔ دو', { size: 13.5, color: SOFT });
    return g;
  };
  s += rung(rows[0].y, rows[1].y + bh, '[K₁ : K₀] = 2');
  s += rung(rows[1].y, rows[2].y + bh, '[K₂ : K₁] = 2');
  s += T(cx, rows[2].y - 14, '⋮', { align: 'center', size: 20, color: FAINT });
  s += rung(rows[2].y - 30, rows[3].y + bh, '[Kₛ : Kₛ₋₁] = 2');

  s += T(730, 416, 'پس اگر عددی ساختنی باشد، درجه‌اش روی اعداد گویا توانی از ۲ است — هرگز عاملِ فرد ندارد.', { size: 14.5, color: SOFT });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 5
// The same test run on four guesses: an odd factor in phi(n) closes the door.
function figGallery() {
  const W = 760, H = 384;
  const items = [[7, 6], [9, 6], [15, 8], [17, 16]];
  const pw = 168, ph = 168, gap = 16, y0 = 100;
  const x0 = (W - (4 * pw + 3 * gap)) / 2;

  let s = head('همان آزمون، روی چهار حدس', 'هر جا φ(n) عاملِ فرد داشته باشد، رسم با خط‌کش و پرگار ناممکن است.');

  items.forEach(([n, phi], i) => {
    const x = x0 + (3 - i) * (pw + gap); // right to left
    const ok = constructible(n);
    const cx = x + pw / 2, cy = y0 + 74, r = 52;
    s += box(x, y0, pw, ph, { fill: ok ? TINT : '#ffffff', stroke: ok ? ACCENT : RULE });
    const pts = polyPoints(cx, cy, r, n, Math.PI / 2);
    s += `<polygon points="${polyPath(pts)}" fill="${ok ? '#ffffff' : 'none'}"
      stroke="${ok ? ACCENT : FAINT}" stroke-width="${ok ? 2 : 1.4}"${ok ? '' : ' stroke-dasharray="4 4"'}/>`;
    pts.forEach(([vx, vy]) => { s += circ(vx, vy, 3.2, { fill: ok ? ACCENT : FAINT }); });

    s += T(cx, y0 + 152, `${fa(n)}-ضلعی`, { align: 'center', size: 15, weight: 700, color: ok ? ACCENT : SOFT });
    s += M(cx, y0 + ph + 30, `φ(${n}) = ${phi}`, { size: 15, color: ok ? ACCENT : RED, weight: 700 });
    s += T(cx, y0 + ph + 52, ok ? 'ساختنی' : 'ناساختنی', { align: 'center', size: 14, color: ok ? ACCENT : RED });
  });

  s += T(730, 366, 'شکلِ چین‌چین یعنی چندضلعی وجود دارد، اما با این دو ابزار به دست نمی‌آید.', { size: 14, color: SOFT });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 6
// The map of constructibility for 3 <= n <= 62: doubling is always allowed, but
// each new odd factor must be a Fermat prime, used once.
function figMap() {
  const W = 760, H = 400;
  const first = 3, last = 62, perRow = 12;
  const cw = 54, ch = 40, gx = 8, gy = 10;
  const x0 = (W - (perRow * cw + (perRow - 1) * gx)) / 2, y0 = 96;

  let s = head('کدام n‌ها ساختنی‌اند؟',
    'الگو تصادفی نیست: دو برابر کردن همیشه مجاز است، اما هر عاملِ فردِ تازه باید اولِ فرما و بی‌تکرار باشد.');

  for (let n = first; n <= last; n++) {
    const i = n - first;
    const x = x0 + (perRow - 1 - i % perRow) * (cw + gx); // number right-to-left
    const y = y0 + Math.floor(i / perRow) * (ch + gy);
    const ok = constructible(n);
    s += box(x, y, cw, ch, { r: 7, fill: ok ? ACCENT : TINT, stroke: ok ? ACCENT : RULE });
    s += T(x + cw / 2, y + 26, fa(n), { align: 'center', size: 15, weight: ok ? 700 : 400, color: ok ? '#ffffff' : FAINT });
  }

  const ly = y0 + 5 * (ch + gy) + 26;
  s += box(708, ly - 13, 18, 18, { r: 5, fill: ACCENT, stroke: ACCENT });
  s += T(700, ly + 2, 'ساختنی', { size: 14, color: INK });
  s += box(612, ly - 13, 18, 18, { r: 5, fill: TINT, stroke: RULE });
  s += T(604, ly + 2, 'ناساختنی', { size: 14, color: SOFT });
  s += T(430, ly + 2, 'یعنی توانی از ۲ ضربدر اول‌های فرمای متمایز', { size: 13.5, color: FAINT });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 7
// Gauss's first cut for the 17-gon: the sixteen non-zero roots split by
// quadratic residuosity into two halves whose sum and product are both known.
function figGauss17() {
  const W = 760, H = 480;
  const cx = 478, cy = 248, r = 124, p = 17;
  const R = new Set([1, 2, 4, 8, 9, 13, 15, 16]); // quadratic residues mod 17

  let s = head('شانزده ریشهٔ ناصفر، دو دستهٔ متقارنِ هشت‌تایی',
    'مجموعِ دو دسته از پیش معلوم است و حاصل‌ضربشان هم گویا درمی‌آید.');

  s += circ(cx, cy, r, { stroke: RULE, w: 1.4 });
  s += circ(cx, cy, 3, { fill: FAINT });

  for (let k = 0; k < p; k++) {
    const t = Math.PI / 2 - 2 * Math.PI * k / p; // 0 at the top, going clockwise
    const [x, y] = P(cx, cy, r, t);
    const [lx, ly] = P(cx, cy, r + 24, t);
    const isR = R.has(k);
    s += line(cx, cy, x, y, k === 0 ? RULE : isR ? '#cdc2e6' : '#e8c9c7', 1);
    s += k === 0
      ? circ(x, y, 5.5, { fill: '#ffffff', stroke: FAINT, w: 1.7 })
      : circ(x, y, 6, isR ? { fill: ACCENT } : { fill: '#ffffff', stroke: RED, w: 1.9 });
    s += T(lx, ly + 5, fa(k), { align: 'center', size: 13.5, weight: k === 0 ? 400 : 700, color: k === 0 ? FAINT : isR ? ACCENT : RED });
  }

  // legend
  const lx0 = 34, lw = 218;
  s += box(lx0, 152, lw, 62, { fill: TINT, stroke: ACCENT });
  s += circ(lx0 + 26, 175, 6, { fill: ACCENT });
  s += T(lx0 + lw - 14, 180, 'دستهٔ مربعی‌ها', { size: 14.5, weight: 700, color: ACCENT });
  s += M(lx0 + 16, 204, 'U = Σ ζ ʳ ,  r ∈ R', { align: 'left', size: 14.5, color: INK });

  s += box(lx0, 232, lw, 62, { fill: '#ffffff', stroke: RED });
  s += circ(lx0 + 26, 255, 6, { fill: '#ffffff', stroke: RED, w: 1.9 });
  s += T(lx0 + lw - 14, 260, 'دستهٔ نامربعی‌ها', { size: 14.5, weight: 700, color: RED });
  s += M(lx0 + 16, 284, 'V = Σ ζ ʳ ,  r ∈ N', { align: 'left', size: 14.5, color: INK });

  s += T(730, 420, 'شماره‌ها توانِ ζ هستند؛ ضرب در ۲ که خود مربعی است، هر دسته را روی خودش می‌چرخاند.', { size: 13.5, color: FAINT });
  s += box(34, 438, 692, 34, { fill: TINT, stroke: RULE });
  s += M(380, 460, 'U + V = −1   ,   UV = −4   ⟹   X² + X − 4 = 0', { size: 15.5, color: ACCENT, weight: 700 });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 8
// The chain of halvings for p = 17: sixteen roots down to one, four splits,
// four square roots.
function figHalvingTree() {
  const W = 760, H = 424;
  const levels = [1, 2, 4, 8, 16];
  const counts = [16, 8, 4, 2, 1];
  const y0 = 112, dy = 58, spanW = 620, cx = 356;

  let s = head('زنجیرهٔ نیم‌کردن‌ها برای هفده‌ضلعی',
    'هر شکاف فقط یک معادلهٔ درجهٔ دو می‌خواهد؛ چهار شکاف، چهار ریشهٔ دوم.');

  const nodeX = (lvl, i) => cx + spanW * ((i + 0.5) / levels[lvl] - 0.5);

  // edges first so the nodes sit on top
  for (let l = 0; l < levels.length - 1; l++) {
    for (let i = 0; i < levels[l]; i++) {
      for (const child of [2 * i, 2 * i + 1]) {
        s += line(nodeX(l, i), y0 + l * dy + 13, nodeX(l + 1, child), y0 + (l + 1) * dy - 13, RULE, 1.2);
      }
    }
  }
  for (let l = 0; l < levels.length; l++) {
    const w = l === 4 ? 26 : Math.min(96, spanW / levels[l] - 10);
    for (let i = 0; i < levels[l]; i++) {
      const x = nodeX(l, i), y = y0 + l * dy;
      const top = l === 0;
      s += box(x - w / 2, y - 13, w, 26, { r: 7, fill: top ? ACCENT : TINT, stroke: top ? ACCENT : RULE });
      s += T(x, y + 5, fa(counts[l]), { align: 'center', size: l === 4 ? 12.5 : 14, weight: 700, color: top ? '#ffffff' : INK });
    }
  }
  s += T(742, y0 + 5, 'همهٔ ریشه‌های ناصفر', { size: 12.5, color: FAINT });
  for (let l = 0; l < 4; l++) {
    s += T(742, y0 + l * dy + dy / 2 + 5, `ریشهٔ دومِ ${fa(l + 1)}`, { size: 12.5, weight: 700, color: ACCENT });
  }

  s += T(730, 400, 'چون ۱۶ توانی از ۲ است، زنجیره درست به تک‌ریشه‌ها می‌رسد؛ و جمعِ هر جفتِ نهایی، همان کسینوسی است که برای رسم لازم داریم.', { size: 14, color: SOFT });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 9
// Copying, adding and subtracting angles is a straightedge-and-compass move, so
// coprime m and n combine into mn. Read right to left: 144° − 120° = 24°.
function figBezout() {
  const W = 760, H = 396;
  const r = 66, cy = 196;
  const panels = [
    { cx: 612, a: 144, top: '۲ × ۷۲°', sub: 'دو گامِ پنج‌ضلعی', col: ACCENT },
    { cx: 396, a: 120, top: '۱۲۰°', sub: 'یک گامِ مثلث', col: RED },
    { cx: 180, a: 24, top: '۲۴°', sub: 'گامِ پانزده‌ضلعی', col: ACCENT, hot: true },
  ];

  let s = head('دو زاویهٔ ساختنی، یک زاویهٔ تازه',
    'کپی کردن، جمع و تفریقِ زاویه با خط‌کش و پرگار شدنی است.');

  panels.forEach(pn => {
    s += circ(pn.cx, cy, r, { stroke: RULE, w: 1.4 });
    s += wedge(pn.cx, cy, r, 0, d2r(pn.a), { fill: pn.col, op: pn.hot ? 0.85 : 0.16 });
    s += arc(pn.cx, cy, r, 0, d2r(pn.a), { stroke: pn.col, w: 2 });
    s += line(pn.cx, cy, pn.cx + r, cy, pn.col, 1.8);
    const [ex, ey] = P(pn.cx, cy, r, d2r(pn.a));
    s += line(pn.cx, cy, ex, ey, pn.col, 1.8);
    s += circ(pn.cx, cy, 3, { fill: FAINT });
    s += T(pn.cx, cy + r + 34, pn.top, { align: 'center', size: 17, weight: 700, color: pn.col });
    s += T(pn.cx, cy + r + 56, pn.sub, { align: 'center', size: 13.5, color: SOFT });
  });

  s += M(504, cy + 8, '−', { size: 30, color: INK, weight: 700 });
  s += M(288, cy + 8, '=', { size: 30, color: INK, weight: 700 });

  s += box(34, 346, 692, 34, { fill: TINT, stroke: RULE });
  s += M(380, 368, '2 × 72° − 120° = 24° = 360°/15        (2·3 − 1·5 = 1)', { size: 15.5, color: ACCENT, weight: 700 });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- figure 10
// A geometric question, after two translations, becomes an arithmetic condition
// on the factorisation of n.
function figSummary() {
  const W = 760, H = 268;
  const bw = 160, bh = 92, gap = 26;
  const x0 = (W - (4 * bw + 3 * gap)) / 2, y0 = 104;
  const steps = [
    ['رسمِ n-ضلعی منتظم', 'یک مسئلهٔ هندسی'],
    ['ساختنِ cos(2π/n)', 'یک عددِ حقیقی'],
    ['درجه توانی از ۲', 'برجِ ریشه‌های دوم'],
    ['φ(n) توانی از ۲', 'اول‌های فرمای متمایز'],
  ];

  let s = head('مسیرِ استدلال، در یک نگاه',
    'یک مسئلهٔ هندسی، پس از دو ترجمه، به شرطی روی تجزیهٔ n تبدیل می‌شود.');

  steps.forEach(([t, n], i) => {
    const x = x0 + (3 - i) * (bw + gap); // right to left
    const last = i === 3;
    s += box(x, y0, bw, bh, { fill: last ? ACCENT : TINT, stroke: last ? ACCENT : RULE });
    s += T(x + bw / 2, y0 + 42, t, { align: 'center', size: 15, weight: 700, color: last ? '#ffffff' : INK });
    s += T(x + bw / 2, y0 + 66, n, { align: 'center', size: 12.5, color: last ? '#e6dff5' : FAINT });
    if (i < 3) s += arrow(x - 6, y0 + bh / 2, x - gap + 6, y0 + bh / 2, { w: 1.7 });
  });

  s += M(380, y0 + bh + 44, 'n = 2ᵃ · p₁ p₂ ⋯ pₜ', { size: 16, color: ACCENT, weight: 700 });
  return svg(W, H, s);
}


// ---------------------------------------------------------------- warm-up 1
// Euclid I.1: an equilateral triangle on a given segment. Two arcs of radius
// AB, one from each end, meet at the apex.
function figWarmTriangle() {
  const W = 760, H = 380;
  const L = 210, ax = 275, ay = 312, bx = ax + L, by = ay;
  const A = [ax, ay], B = [bx, by];
  const C = [ax + L / 2, ay - L * Math.sqrt(3) / 2];

  let s = head('مثلث متساوی‌الاضلاع روی یک پاره‌خط',
    'نخستین قضیهٔ «اصول»: دو کمان به شعاعِ AB، یکی از هر سر، در رأس سوم به هم می‌رسند.');

  // the two compass traces (only the part a compass would actually leave)
  s += arc(ax, ay, L, d2r(20), d2r(100), { stroke: FAINT, w: 1.3, dash: '5 4' });
  s += arc(bx, by, L, d2r(80), d2r(160), { stroke: FAINT, w: 1.3, dash: '5 4' });
  // the triangle
  s += `<polygon points="${polyPath([A, B, C])}" fill="${TINT}" fill-opacity="0.85" stroke="${ACCENT}" stroke-width="2"/>`;
  s += line(ax, ay, bx, by, INK, 2.2);
  [A, B].forEach(([x, y]) => s += circ(x, y, 5, { fill: INK }));
  s += circ(C[0], C[1], 5.5, { fill: RED });
  s += M(ax - 18, ay + 8, 'A', { size: 17, color: INK, weight: 700 });
  s += M(bx + 18, by + 8, 'B', { size: 17, color: INK, weight: 700 });
  s += M(C[0], C[1] - 16, 'C', { size: 17, color: RED, weight: 700 });
  // step labels beside the arcs
  s += T(ax - 34, ay - 120, 'کمان به مرکز A، به شعاع AB', { align: 'right', size: 13.5, color: FAINT });
  s += T(bx + 34, by - 120, 'کمان به مرکز B، به شعاع AB', { align: 'left', size: 13.5, color: FAINT });
  s += T(730, 352, 'C از برخورد دو کمان پیدا شد؛ AC و BC هر دو به اندازهٔ دهانهٔ پرگار، یعنی AB، هستند.', { size: 14, color: SOFT });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- warm-up 2
// The hexagon: a chord equal to the radius, stepped six times around the
// circle. Every other vertex is the triangle again.
function figWarmHexagon() {
  const W = 760, H = 400;
  const cx = 380, cy = 226, r = 128;
  const pts = polyPoints(cx, cy, r, 6);

  let s = head('شش‌ضلعی: دهانهٔ پرگار به اندازهٔ شعاع',
    'همان دهانه را شش بار دورِ دایره می‌زنیم؛ یک‌درمیانِ رأس‌ها، مثلث است.');

  s += circ(cx, cy, r, { stroke: INK, w: 1.6 });
  // triangle on alternate vertices, then the hexagon outline
  const tri = [pts[0], pts[2], pts[4]];
  s += `<polygon points="${polyPath(tri)}" fill="${TINT}" fill-opacity="0.9" stroke="${ACCENT}" stroke-width="2"/>`;
  s += `<polygon points="${polyPath(pts)}" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
  // the radius the compass copies
  s += line(cx, cy, pts[0][0], pts[0][1], ACCENT, 1.6, '4 3');
  s += circ(cx, cy, 3.2, { fill: INK });
  s += M(cx - 10, cy + 20, 'O', { align: 'right', size: 15, color: INK });
  // six compass traces: centred on vertex k, radius r, cutting the circle at vertex k+1
  pts.forEach(([x, y], k) => {
    const t = Math.PI / 3 * k;
    s += arc(x, y, r, t + d2r(108), t + d2r(132), { stroke: SOFT, w: 1.3, dash: '5 4' });
  });
  pts.forEach(([x, y], k) => {
    s += circ(x, y, 5.5, { fill: k % 2 === 0 ? ACCENT : '#ffffff', stroke: k % 2 === 0 ? ACCENT : INK, w: 1.8 });
  });
  s += M(pts[0][0] + 18, pts[0][1] + 6, 'A', { align: 'left', size: 16, color: INK, weight: 700 });
  s += T(730, 378, 'وترِ برابر با شعاع، زاویهٔ مرکزیِ ۶۰ درجه می‌گیرد — چون مثلثِ O و دو رأسِ کناری متساوی‌الاضلاع است.', { size: 14, color: SOFT });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- warm-up 3
// The square from a diameter and its perpendicular bisector; bisecting an arc
// doubles the number of sides.
function figWarmSquare() {
  const W = 760, H = 420;
  const cx = 380, cy = 240, r = 124;
  const A = [cx - r, cy], B = [cx + r, cy], C = [cx, cy - r], D = [cx, cy + r];
  const R = r * 1.45; // compass opening for the perpendicular bisector

  let s = head('مربع: یک قطر و عمودمنصفش — و بعد، نصف‌کردنِ کمان',
    'دو کمانِ هم‌شعاع از دو سرِ قطر، خطِ عمود را می‌دهند؛ هر نصف‌کردنِ کمان، تعدادِ ضلع‌ها را دو برابر می‌کند.');

  s += circ(cx, cy, r, { stroke: INK, w: 1.6 });
  s += line(A[0], A[1], B[0], B[1], INK, 1.5);
  // arcs for the perpendicular bisector of AB
  const [px, py] = [cx, cy - Math.sqrt(R * R - r * r)];
  const [qx, qy] = [cx, cy + Math.sqrt(R * R - r * r)];
  const tA = Math.acos(r / R), tB = Math.PI - tA;
  s += arc(A[0], A[1], R, tA - d2r(14), tA + d2r(14), { stroke: FAINT, w: 1.3, dash: '5 4' });
  s += arc(A[0], A[1], R, -tA - d2r(14), -tA + d2r(14), { stroke: FAINT, w: 1.3, dash: '5 4' });
  s += arc(B[0], B[1], R, tB - d2r(14), tB + d2r(14), { stroke: FAINT, w: 1.3, dash: '5 4' });
  s += arc(B[0], B[1], R, -tB - d2r(14), -tB + d2r(14), { stroke: FAINT, w: 1.3, dash: '5 4' });
  s += line(px, py, qx, qy, ACCENT, 1.5, '4 3');
  // the square
  s += `<polygon points="${polyPath([A, C, B, D])}" fill="${TINT}" fill-opacity="0.9" stroke="${ACCENT}" stroke-width="2"/>`;
  // bisect the arc CB: arcs from C and B, the bisector passes through O, hits the circle at E
  const E = P(cx, cy, r, Math.PI / 4);
  const Rc = r * 1.05;
  const chord = Math.hypot(B[0] - C[0], B[1] - C[1]);
  const h = Math.sqrt(Rc * Rc - (chord / 2) * (chord / 2));
  const mid = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2];
  const u = [(B[0] - C[0]) / chord, (B[1] - C[1]) / chord]; // unit along CB
  const nrm = [u[1], -u[0]]; // toward the centre side? we want the outer intersection near E
  const X1 = [mid[0] + nrm[0] * h, mid[1] + nrm[1] * h];
  const X2 = [mid[0] - nrm[0] * h, mid[1] - nrm[1] * h];
  const outer = Math.hypot(X1[0] - cx, X1[1] - cy) > Math.hypot(X2[0] - cx, X2[1] - cy) ? X1 : X2;
  const inner = outer === X1 ? X2 : X1;
  const aC = Math.atan2(-(outer[1] - C[1]), outer[0] - C[0]);
  const aB = Math.atan2(-(outer[1] - B[1]), outer[0] - B[0]);
  s += arc(C[0], C[1], Rc, aC - d2r(12), aC + d2r(12), { stroke: FAINT, w: 1.3, dash: '5 4' });
  s += arc(B[0], B[1], Rc, aB - d2r(12), aB + d2r(12), { stroke: FAINT, w: 1.3, dash: '5 4' });
  s += line(cx, cy, outer[0] + (outer[0] - cx) * 0.06, outer[1] + (outer[1] - cy) * 0.06, RED, 1.4, '4 3');
  // the octagon, faint
  const oct = polyPoints(cx, cy, r, 8);
  s += `<polygon points="${polyPath(oct)}" fill="none" stroke="${RED}" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.8"/>`;
  [A, B, C, D].forEach(([x, y]) => s += circ(x, y, 5.5, { fill: ACCENT }));
  s += circ(E[0], E[1], 5.5, { fill: RED });
  s += circ(cx, cy, 3.2, { fill: INK });
  s += M(A[0] - 18, A[1] + 6, 'A', { size: 16, color: INK, weight: 700 });
  s += M(B[0] + 18, B[1] + 6, 'B', { size: 16, color: INK, weight: 700 });
  s += M(C[0] - 16, C[1] - 2, 'C', { align: 'right', size: 16, color: INK, weight: 700 });
  s += M(D[0] - 16, D[1] + 12, 'D', { align: 'right', size: 16, color: INK, weight: 700 });
  s += M(E[0] + 16, E[1] - 8, 'E', { align: 'left', size: 16, color: RED, weight: 700 });
  s += M(cx - 10, cy + 20, 'O', { align: 'right', size: 14, color: INK });
  s += T(730, 396, 'E وسطِ کمانِ CB است؛ با همین حرکت، مربع هشت‌ضلعی می‌شود، هشت‌ضلعی شانزده‌ضلعی، و همین‌طور تا هر توانِ ۲.', { size: 14, color: SOFT });
  return svg(W, H, s);
}

// ---------------------------------------------------------------- warm-up 4
// The pentagon from one auxiliary arc: with M the midpoint of the radius OA
// and the arc of centre M through B, the chord BN is the side of the pentagon.
function figWarmPentagon() {
  const W = 760, H = 440;
  const cx = 380, cy = 248, r = 130;
  const A = [cx + r, cy], B = [cx, cy - r];
  const Mp = [cx + r / 2, cy];
  const RM = Math.hypot(B[0] - Mp[0], B[1] - Mp[1]); // = r*sqrt5/2
  const N = [Mp[0] - RM, cy];
  const side = Math.hypot(N[0] - B[0], N[1] - B[1]); // = 2 r sin 36°

  let s = head('پنج‌ضلعی: یک کمانِ کمکی، ضلع را می‌دهد',
    'M وسطِ شعاع OA است. کمانی به مرکز M از B تا قطر بزنید؛ وترِ BN دقیقاً ضلعِ پنج‌ضلعی است.');

  s += circ(cx, cy, r, { stroke: INK, w: 1.6 });
  s += line(cx - r - 40, cy, cx + r + 40, cy, RULE, 1.2);
  s += line(cx, cy - r - 30, cx, cy + r + 30, RULE, 1.2);
  // the side, stepped around
  const pts = polyPoints(cx, cy, r, 5, Math.PI / 2);
  s += `<polygon points="${polyPath(pts)}" fill="${TINT}" fill-opacity="0.9" stroke="${ACCENT}" stroke-width="2"/>`;
  pts.forEach(([x, y], k) => {
    if (k === 4) return;
    const t = Math.atan2(-(pts[k + 1][1] - y), pts[k + 1][0] - x);
    s += arc(x, y, side, t - d2r(9), t + d2r(9), { stroke: FAINT, w: 1.3, dash: '5 4' });
  });
  // the auxiliary arc, on top of the fill
  const t0 = Math.atan2(-(B[1] - Mp[1]), B[0] - Mp[0]);
  s += arc(Mp[0], Mp[1], RM, t0, Math.PI, { stroke: SOFT, w: 1.4, dash: '5 4' });
  s += line(Mp[0], Mp[1], B[0], B[1], SOFT, 1.2, '3 3');
  s += line(B[0], B[1], N[0], N[1], RED, 2);
  [A, Mp, N].forEach(([x, y]) => s += circ(x, y, 5, { fill: INK }));
  pts.forEach(([x, y]) => s += circ(x, y, 5.5, { fill: ACCENT }));
  s += circ(B[0], B[1], 5.5, { fill: RED });
  s += circ(N[0], N[1], 5.5, { fill: RED });
  s += circ(cx, cy, 3.2, { fill: INK });
  s += M(A[0] + 16, A[1] + 22, 'A', { size: 16, color: INK, weight: 700 });
  s += M(B[0] + 16, B[1] - 8, 'B', { align: 'left', size: 16, color: RED, weight: 700 });
  s += M(Mp[0], Mp[1] + 24, 'M', { size: 16, color: INK, weight: 700 });
  s += M(N[0] - 4, N[1] + 24, 'N', { size: 16, color: RED, weight: 700 });
  s += M(cx + 12, cy + 20, 'O', { align: 'left', size: 14, color: INK });
  s += T(730, 414, 'طولِ MB برابر <tspan direction="ltr" unicode-bidi="isolate">√5 / 2</tspan> شعاع است؛ این ریشهٔ دوم را پرگار می‌سازد، و پنج‌ضلعی دقیقاً به همین عدد نیاز دارد.', { size: 14, color: SOFT });
  return svg(W, H, s);
}

const FIGS = [
  { name: 'complex_constructible_cover_band', svg: figCoverBand(), w: 760, h: 172 },
  { name: 'complex_constructible_warm_triangle', svg: figWarmTriangle(), w: 760, h: 380 },
  { name: 'complex_constructible_warm_hexagon', svg: figWarmHexagon(), w: 760, h: 400 },
  { name: 'complex_constructible_warm_square', svg: figWarmSquare(), w: 760, h: 420 },
  { name: 'complex_constructible_warm_pentagon', svg: figWarmPentagon(), w: 760, h: 440 },
  { name: 'complex_constructible_roots_of_unity', svg: figRootsOfUnity(), w: 760, h: 470 },
  { name: 'complex_constructible_cos_to_zeta', svg: figCosToZeta(), w: 760, h: 420 },
  { name: 'complex_constructible_intersections', svg: figIntersections(), w: 760, h: 360 },
  { name: 'complex_constructible_quadratic_tower', svg: figQuadraticTower(), w: 760, h: 440 },
  { name: 'complex_constructible_gallery', svg: figGallery(), w: 760, h: 384 },
  { name: 'complex_constructible_map', svg: figMap(), w: 760, h: 400 },
  { name: 'complex_constructible_gauss_17gon', svg: figGauss17(), w: 760, h: 480 },
  { name: 'complex_constructible_halving_tree', svg: figHalvingTree(), w: 760, h: 424 },
  { name: 'complex_constructible_bezout_angles', svg: figBezout(), w: 760, h: 396 },
  { name: 'complex_constructible_summary', svg: figSummary(), w: 760, h: 268 },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  const only = process.argv.slice(2);
  for (const f of FIGS) {
    if (only.length && !only.includes(f.name)) continue;
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
