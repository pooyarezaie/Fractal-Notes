/**
 * Interactive labs for the «چگونه با آمار دروغ بگوییم؟» series.
 * Vanilla JS + inline SVG, self-hosted (no CDN). Widgets selected by data-lab
 * on a .lab container:
 *   data-lab="frames" — Huff's gee-whiz graph: one year of national income
 *                       (20 → 22 billion) shown in three frames — axis from
 *                       zero, truncated axis, truncated axis in a tall narrow
 *                       frame — with an animated transition between them.
 *
 * Prerender note: the site bakes post-JS DOM into HTML (scripts/prerender.js),
 * so this script must (re)initialize on every real page load: it removes
 * anything it built earlier and rebuilds from scratch, and keeps no state in
 * DOM attributes.
 */
(function () {
  'use strict';

  var bound = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;
  var NS = 'http://www.w3.org/2000/svg';

  function fa(n) {
    return String(n).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[+d]; }).replace(/\./g, '٫');
  }

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ---------------------------------------------------------- frames lab */

  var DATA = [20.0, 20.1, 20.3, 20.4, 20.6, 20.9, 21.0, 21.2, 21.3, 21.6, 21.8, 22.0];
  var MODES = [
    { label: 'محور از صفر', ymin: 0, ymax: 24, w: 520, h: 260, ticks: [0, 6, 12, 18, 24] },
    { label: 'محور بریده', ymin: 19.8, ymax: 22.2, w: 520, h: 260, ticks: [20, 21, 22] },
    { label: 'قاب بلند و باریک', ymin: 19.8, ymax: 22.2, w: 180, h: 360, ticks: [20, 21, 22] }
  ];
  var VW = 640, VH = 430;   // viewBox
  var CX = 350, CY = 200;   // plot-area centre (room on the left for tick labels)
  var DURATION = 700;

  function initFrames(root) {
    // rebuild from scratch (prerendered DOM may already hold a stale copy)
    Array.prototype.forEach.call(root.querySelectorAll('.lab-built'), function (n) { n.parentNode.removeChild(n); });
    var anchor = root.querySelector('noscript');

    // --- controls
    var tabs = document.createElement('div');
    tabs.className = 'lab-tabs lab-built';
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'انتخاب قاب نمودار');
    var buttons = MODES.map(function (m, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = m.label;
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () { setMode(i); });
      tabs.appendChild(b);
      return b;
    });
    root.insertBefore(tabs, anchor);

    // --- stage
    var svg = el('svg', { viewBox: '0 0 ' + VW + ' ' + VH, role: 'img',
      'aria-label': 'نمودار خطی درآمد ملی در دوازده ماه، از ۲۰ به ۲۲ میلیارد دلار؛ قاب و محور با دکمه‌ها عوض می‌شود.' });
    svg.setAttribute('class', 'lab-stage lab-built');
    root.insertBefore(svg, anchor);

    var frame = el('rect', { fill: 'var(--accent-tint)', 'fill-opacity': '0.55', stroke: 'var(--line)' }, svg);
    var tickGroups = MODES.map(function (m) {
      var g = el('g', {}, svg);
      g._items = m.ticks.map(function (v) {
        return {
          v: v,
          line: el('line', { stroke: 'var(--line)', 'stroke-width': '1' }, g),
          text: el('text', { 'font-size': '13', fill: 'var(--ink-faint)', 'text-anchor': 'end', direction: 'rtl' }, g)
        };
      });
      g._items.forEach(function (it) { it.text.textContent = fa(it.v); });
      return g;
    });
    var axisY = el('line', { stroke: 'var(--ink)', 'stroke-width': '1.4' }, svg);
    var axisX = el('line', { stroke: 'var(--ink)', 'stroke-width': '1.4' }, svg);
    var path = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': '2.6', 'stroke-linejoin': 'round' }, svg);
    var dots = DATA.map(function () { return el('circle', { r: '3', fill: 'var(--accent)' }, svg); });
    var lblStart = el('text', { 'font-size': '13', 'font-weight': '700', fill: 'var(--accent)', 'text-anchor': 'start', direction: 'ltr' }, svg);
    var lblEnd = el('text', { 'font-size': '13', 'font-weight': '700', fill: 'var(--accent)', 'text-anchor': 'middle' }, svg);
    lblStart.textContent = fa(20);
    lblEnd.textContent = fa(22);
    var titleX = el('text', { 'font-size': '13', fill: 'var(--ink-soft)', 'text-anchor': 'middle', direction: 'rtl', x: CX }, svg);
    titleX.textContent = 'ماه‌های سال';
    var titleY = el('text', { 'font-size': '13', fill: 'var(--ink-soft)', 'text-anchor': 'middle', direction: 'rtl' }, svg);
    titleY.textContent = 'میلیارد دلار';

    // --- readout
    var readout = document.createElement('p');
    readout.className = 'lab-readout fa lab-built';
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
    root.insertBefore(readout, anchor);

    // --- state
    var cur = { ymin: MODES[0].ymin, ymax: MODES[0].ymax, w: MODES[0].w, h: MODES[0].h, op: [1, 0, 0] };
    var mode = 0;
    var anim = null;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function render(s) {
      var left = CX - s.w / 2, top = CY - s.h / 2, right = left + s.w, bottom = top + s.h;
      var X = function (i) { return left + (i / (DATA.length - 1)) * s.w; };
      var Y = function (v) { return bottom - ((v - s.ymin) / (s.ymax - s.ymin)) * s.h; };

      frame.setAttribute('x', left); frame.setAttribute('y', top);
      frame.setAttribute('width', s.w); frame.setAttribute('height', s.h);
      axisY.setAttribute('x1', left); axisY.setAttribute('x2', left); axisY.setAttribute('y1', top); axisY.setAttribute('y2', bottom);
      axisX.setAttribute('x1', left); axisX.setAttribute('x2', right); axisX.setAttribute('y1', bottom); axisX.setAttribute('y2', bottom);

      tickGroups.forEach(function (g, k) {
        g.setAttribute('opacity', s.op[k].toFixed(3));
        g._items.forEach(function (it) {
          var y = Y(it.v);
          it.line.setAttribute('x1', left); it.line.setAttribute('x2', right);
          it.line.setAttribute('y1', y); it.line.setAttribute('y2', y);
          it.text.setAttribute('x', left - 8); it.text.setAttribute('y', y + 4.5);
        });
      });

      var d = '';
      DATA.forEach(function (v, i) {
        var x = X(i), y = Y(v);
        d += (i ? ' L ' : 'M ') + x.toFixed(1) + ',' + y.toFixed(1);
        dots[i].setAttribute('cx', x); dots[i].setAttribute('cy', y);
      });
      path.setAttribute('d', d);
      lblStart.setAttribute('x', X(0) + 9); lblStart.setAttribute('y', Y(DATA[0]) - 9);
      lblEnd.setAttribute('x', X(DATA.length - 1)); lblEnd.setAttribute('y', Y(DATA[DATA.length - 1]) - 10);
      titleX.setAttribute('y', bottom + 30);
      var ty = left - 44;
      titleY.setAttribute('transform', 'rotate(-90 ' + ty + ' ' + CY + ')');
      titleY.setAttribute('x', ty); titleY.setAttribute('y', CY);

      // what the eye gets: share of the frame's height taken by the rise, and
      // the apparent slope of the whole year, in degrees
      var rise = (DATA[DATA.length - 1] - DATA[0]) / (s.ymax - s.ymin);
      var share = Math.round(rise * 100);
      var deg = Math.round(Math.atan2(rise * s.h, s.w) * 180 / Math.PI);
      readout.textContent = 'همان افزایش ده‌درصدی — روی صفحه: ' + fa(share) + '٪ از ارتفاع قاب، با شیبی حدود ' + fa(deg) + ' درجه.';
    }

    function setMode(i) {
      mode = i;
      buttons.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      var from = { ymin: cur.ymin, ymax: cur.ymax, w: cur.w, h: cur.h, op: cur.op.slice() };
      var to = MODES[i];
      var toOp = MODES.map(function (_, k) { return k === i ? 1 : 0; });
      if (anim) cancelAnimationFrame(anim);
      if (reduce) {
        cur = { ymin: to.ymin, ymax: to.ymax, w: to.w, h: to.h, op: toOp };
        render(cur);
        return;
      }
      var t0 = null;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / DURATION);
        var e = ease(t);
        cur = {
          ymin: lerp(from.ymin, to.ymin, e), ymax: lerp(from.ymax, to.ymax, e),
          w: lerp(from.w, to.w, e), h: lerp(from.h, to.h, e),
          op: from.op.map(function (o, k) { return lerp(o, toOp[k], e); })
        };
        render(cur);
        if (t < 1) anim = requestAnimationFrame(step); else anim = null;
      }
      anim = requestAnimationFrame(step);
    }

    render(cur);
  }

  /* ---------------------------------------------------------- boot */

  function initLab(root) {
    if (bound) {
      if (bound.has(root)) return;
      bound.add(root);
    }
    var kind = root.getAttribute('data-lab');
    if (kind === 'frames') initFrames(root);
  }

  function init() {
    document.querySelectorAll('.lab[data-lab]').forEach(initLab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
