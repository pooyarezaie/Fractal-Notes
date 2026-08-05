/**
 * Interactive labs for the complex-numbers series.
 * Vanilla JS + canvas, self-hosted (no CDN). Three widgets, selected by
 * data-lab on a .lab container:
 *   data-lab="multiply"  — drag z1, z2; watch lengths multiply, angles add
 *   data-lab="roots"     — drag w, slide n; the n-th roots polygon follows
 *   data-lab="orbit"     — click to iterate z^2+c; Mandelbrot / Julia modes
 *
 * Prerender note: the site bakes post-JS DOM into HTML (scripts/prerender.js),
 * and canvas pixels are NOT serialized. So this script must (re)initialize on
 * every real page load and must not rely on state stored in DOM attributes.
 */
(function () {
  'use strict';

  var bound = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;

  /* ---------------------------------------------------------- plumbing */

  function setupCanvas(canvas, range) {
    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || 480;
    var cssH = cssW; // square world
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var scale = cssW / (2 * range);
    return {
      ctx: ctx,
      w: cssW,
      h: cssH,
      range: range,
      toPx: function (z) {
        return [cssW / 2 + z.re * scale, cssH / 2 - z.im * scale];
      },
      toWorld: function (x, y) {
        return { re: (x - cssW / 2) / scale, im: (cssH / 2 - y) / scale };
      }
    };
  }

  function eventPos(canvas, ev) {
    var r = canvas.getBoundingClientRect();
    return [ev.clientX - r.left, ev.clientY - r.top];
  }

  function drawAxes(v, skipClear) {
    var ctx = v.ctx;
    if (!skipClear) ctx.clearRect(0, 0, v.w, v.h);
    ctx.strokeStyle = '#d5cfe6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, v.h / 2); ctx.lineTo(v.w, v.h / 2);
    ctx.moveTo(v.w / 2, 0); ctx.lineTo(v.w / 2, v.h);
    ctx.stroke();
    ctx.fillStyle = '#6f6a86';
    ctx.font = '13px sans-serif';
    ctx.fillText('Re', v.w - 22, v.h / 2 - 6);
    ctx.fillText('Im', v.w / 2 + 6, 14);
    // unit ticks
    var one = v.toPx({ re: 1, im: 0 });
    ctx.fillText('1', one[0] - 3, v.h / 2 + 16);
  }

  function circle(v, r, dashed, color) {
    var ctx = v.ctx;
    var c = v.toPx({ re: 0, im: 0 });
    var pr = v.toPx({ re: r, im: 0 })[0] - c[0];
    ctx.save();
    if (dashed) ctx.setLineDash([5, 5]);
    ctx.strokeStyle = color || '#d5cfe6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c[0], c[1], pr, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function arrow(v, z, color, width) {
    var ctx = v.ctx;
    var o = v.toPx({ re: 0, im: 0 });
    var p = v.toPx(z);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width || 2;
    ctx.beginPath();
    ctx.moveTo(o[0], o[1]);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
    var ang = Math.atan2(p[1] - o[1], p[0] - o[0]);
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] - 10 * Math.cos(ang - 0.4), p[1] - 10 * Math.sin(ang - 0.4));
    ctx.lineTo(p[0] - 10 * Math.cos(ang + 0.4), p[1] - 10 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  function handle(v, z, color, label) {
    var ctx = v.ctx;
    var p = v.toPx(z);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (label) {
      ctx.fillStyle = color;
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(label, p[0] + 10, p[1] - 8);
    }
  }

  function cmul(a, b) {
    return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
  }
  function cabs(z) { return Math.hypot(z.re, z.im); }
  function carg(z) { return Math.atan2(z.im, z.re); }
  function deg(rad) {
    var d = Math.round(rad * 180 / Math.PI);
    if (d <= -180) d += 360;
    return d;
  }
  function fmt(x) { return (Math.round(x * 100) / 100).toFixed(2); }
  function fmtZ(z) {
    return fmt(z.re) + (z.im < 0 ? ' − ' : ' + ') + fmt(Math.abs(z.im)) + 'i';
  }

  function makeDraggable(canvas, getTargets, onMove) {
    var dragging = null;
    canvas.addEventListener('pointerdown', function (ev) {
      var xy = eventPos(canvas, ev);
      var best = null, bestD = 28; // px threshold
      getTargets().forEach(function (t) {
        var d = Math.hypot(t.px[0] - xy[0], t.px[1] - xy[1]);
        if (d < bestD) { bestD = d; best = t.id; }
      });
      if (best !== null) {
        dragging = best;
        canvas.setPointerCapture(ev.pointerId);
        ev.preventDefault();
      }
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (dragging === null) return;
      var xy = eventPos(canvas, ev);
      onMove(dragging, xy[0], xy[1]);
      ev.preventDefault();
    });
    canvas.addEventListener('pointerup', function () { dragging = null; });
    canvas.addEventListener('pointercancel', function () { dragging = null; });
  }

  /* ---------------------------------------------------------- multiply lab */

  function initMultiply(root) {
    var canvas = root.querySelector('canvas');
    var readout = root.querySelector('.lab-readout');
    var z1 = { re: 1.5, im: 0.9 };
    var z2 = { re: 0.4, im: 1.1 };
    var v;

    function draw() {
      v = setupCanvas(canvas, 3.4);
      drawAxes(v);
      circle(v, 1, true);
      var p = cmul(z1, z2);
      arrow(v, p, '#8a86a0', 3);
      handle(v, p, '#8a86a0', 'z₁z₂');
      arrow(v, z1, '#4a3184', 2);
      handle(v, z1, '#4a3184', 'z₁');
      arrow(v, z2, '#a0623a', 2);
      handle(v, z2, '#a0623a', 'z₂');
      if (readout) {
        readout.textContent =
          '|z₁| = ' + fmt(cabs(z1)) + ', θ₁ = ' + deg(carg(z1)) + '°' +
          '   ×   |z₂| = ' + fmt(cabs(z2)) + ', θ₂ = ' + deg(carg(z2)) + '°' +
          '   →   |z₁z₂| = ' + fmt(cabs(p)) + ', θ = ' + deg(carg(p)) + '°';
      }
    }

    makeDraggable(canvas, function () {
      return [
        { id: 1, px: v.toPx(z1) },
        { id: 2, px: v.toPx(z2) }
      ];
    }, function (id, x, y) {
      var w = v.toWorld(x, y);
      if (id === 1) z1 = w; else z2 = w;
      draw();
    });

    window.addEventListener('resize', draw);
    draw();
  }

  /* ---------------------------------------------------------- roots lab */

  function initRoots(root) {
    var canvas = root.querySelector('canvas');
    var readout = root.querySelector('.lab-readout');
    var slider = root.querySelector('input[type="range"]');
    var nLabel = root.querySelector('.lab-n');
    var w = { re: 1.4, im: 1.6 };
    var v;

    function draw() {
      v = setupCanvas(canvas, 2.7);
      drawAxes(v);
      circle(v, 1, true);
      var n = slider ? parseInt(slider.value, 10) : 5;
      if (nLabel) nLabel.textContent = String(n);
      var R = cabs(w), phi = carg(w);
      var r = Math.pow(R, 1 / n);
      circle(v, r, false, '#b9b2d1');
      var ctx = v.ctx;
      // polygon through the roots
      ctx.strokeStyle = '#4a3184';
      ctx.lineWidth = 2;
      ctx.beginPath();
      var pts = [];
      for (var k = 0; k < n; k++) {
        var th = phi / n + 2 * Math.PI * k / n;
        var z = { re: r * Math.cos(th), im: r * Math.sin(th) };
        pts.push(z);
        var p = v.toPx(z);
        if (k === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.closePath();
      ctx.stroke();
      pts.forEach(function (z, k) {
        handle(v, z, k === 0 ? '#4a3184' : '#8a86a0', k === 0 ? 'z₀' : '');
      });
      arrow(v, w, '#a0623a', 2);
      handle(v, w, '#a0623a', 'w');
      if (readout) {
        readout.textContent =
          'w = ' + fmtZ(w) + '   |w| = ' + fmt(R) +
          '   →   |zₖ| = ' + fmt(r) + ',  n = ' + n;
      }
    }

    makeDraggable(canvas, function () {
      return [{ id: 0, px: v.toPx(w) }];
    }, function (id, x, y) {
      var p = v.toWorld(x, y);
      if (cabs(p) > 0.05) { w = p; draw(); }
    });

    if (slider) slider.addEventListener('input', draw);
    window.addEventListener('resize', draw);
    draw();
  }

  /* ---------------------------------------------------------- orbit lab */

  function initOrbit(root) {
    var canvas = root.querySelector('canvas');
    var readout = root.querySelector('.lab-readout');
    var modeInputs = root.querySelectorAll('input[type="radio"]');
    var c = { re: -0.4, im: 0.35 };
    var z0 = { re: 0, im: 0 };
    var v;
    var backdrop = null; // offscreen canvas
    var backdropKey = '';

    function mode() {
      var m = 'm';
      modeInputs.forEach(function (i) { if (i.checked) m = i.value; });
      return m;
    }

    function computeBackdrop() {
      var key = mode() + (mode() === 'j' ? ':' + fmt(c.re) + ',' + fmt(c.im) : '');
      if (key === backdropKey && backdrop) return;
      backdropKey = key;
      var isJ = mode() === 'j';
      // The certain-escape test is |z| > 2 AND |z| >= |c|, so the bailout radius
      // is max(2, |c|). In Mandelbrot mode z0 = 0, and any |c| > 2 already
      // escapes on the first step, so radius 2 is exact there.
      var R = isJ ? Math.max(2, cabs(c)) : 2;
      var N = 240, maxIt = 60, esc = R * R;
      var off = document.createElement('canvas');
      off.width = N; off.height = N;
      var octx = off.getContext('2d');
      var img = octx.createImageData(N, N);
      for (var py = 0; py < N; py++) {
        for (var px = 0; px < N; px++) {
          var re = (px / N) * 4.4 - 2.2;
          var im = 2.2 - (py / N) * 4.4;
          var zr, zi, cr, ci;
          if (isJ) { zr = re; zi = im; cr = c.re; ci = c.im; }
          else { zr = 0; zi = 0; cr = re; ci = im; }
          var it = 0;
          while (it < maxIt && zr * zr + zi * zi <= esc) {
            var t = zr * zr - zi * zi + cr;
            zi = 2 * zr * zi + ci;
            zr = t;
            it++;
          }
          var o = 4 * (py * N + px);
          if (it >= maxIt) { // no escape within maxIt (NOT proof of boundedness)
            img.data[o] = 231; img.data[o + 1] = 225; img.data[o + 2] = 246; img.data[o + 3] = 255;
          } else {
            img.data[o] = 255; img.data[o + 1] = 255; img.data[o + 2] = 255; img.data[o + 3] = 255;
          }
        }
      }
      octx.putImageData(img, 0, 0);
      backdrop = off;
    }

    function draw() {
      v = setupCanvas(canvas, 2.2);
      computeBackdrop();
      v.ctx.clearRect(0, 0, v.w, v.h);
      v.ctx.imageSmoothingEnabled = true;
      v.ctx.drawImage(backdrop, 0, 0, v.w, v.h);
      drawAxes(v, true);
      circle(v, 2, true);
      // Orbit: iterate first, draw second, so the whole path can be coloured by
      // the outcome. The two outcomes are not symmetric — escape is certain,
      // while "still here after 60 steps" only means we stopped looking — so
      // they must not look alike.
      var isJ = mode() === 'j';
      var z = isJ ? { re: z0.re, im: z0.im } : { re: 0, im: 0 };
      var pts = [z];
      var escaped = -1;
      for (var k = 1; k <= 60; k++) {
        z = { re: z.re * z.re - z.im * z.im + c.re, im: 2 * z.re * z.im + c.im };
        pts.push(z);
        if (cabs(z) > 2 && cabs(z) >= cabs(c)) { escaped = k; break; }
      }
      var ctx = v.ctx;
      // violet = has not escaped yet (matches the violet backdrop);
      // orange = escape is certain.
      var orbitColor = escaped < 0 ? '#4a3184' : '#a0623a';
      ctx.strokeStyle = orbitColor;
      ctx.fillStyle = orbitColor;
      ctx.lineWidth = 1.5;
      for (var i = 1; i < pts.length; i++) {
        var a = v.toPx(pts[i - 1]);
        var b = v.toPx(pts[i]);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(b[0], b[1], 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }
      if (escaped >= 0) {
        // ring the step at which escape became certain
        var e = v.toPx(pts[pts.length - 1]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e[0], e[1], 7, 0, 2 * Math.PI);
        ctx.stroke();
      }
      handle(v, c, '#4a3184', 'c');
      if (isJ) handle(v, z0, '#a0623a', 'z₀');
      if (readout) {
        readout.textContent =
          'c = ' + fmtZ(c) + (isJ ? '   z₀ = ' + fmtZ(z0) : '   z₀ = 0') +
          '   →   ' + (escaped < 0 ? 'no escape in 60 steps' : 'escaped at step ' + escaped);
      }
    }

    canvas.addEventListener('pointerdown', function (ev) {
      var xy = eventPos(canvas, ev);
      var p = v.toWorld(xy[0], xy[1]);
      if (mode() === 'j') z0 = p; else c = p;
      draw();
      ev.preventDefault();
    });
    modeInputs.forEach(function (i) { i.addEventListener('change', draw); });
    window.addEventListener('resize', draw);
    draw();
  }

  /* ---------------------------------------------------------- boot */

  function initLab(root) {
    if (bound) {
      if (bound.has(root)) return;
      bound.add(root);
    }
    var kind = root.getAttribute('data-lab');
    if (kind === 'multiply') initMultiply(root);
    else if (kind === 'roots') initRoots(root);
    else if (kind === 'orbit') initOrbit(root);
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
