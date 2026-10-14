/* Run after make build-prerender. Automated coverage, not a conformance claim. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('node:http');
const { chromium } = require('playwright');
const handler = require('serve-handler');
const axe = require('axe-core');

const pages = [
  '/', '/complex-numbers/', '/complex-numbers/introduction/',
  '/complex-numbers/nth-roots/', '/complex-numbers/julia-mandelbrot/',
  '/how-to-lie-with-statistics/the-gee-whiz-graph/',
  '/art-of-problem-solving/how-do-we-know-it-is-solved/',
  '/authors/pooyarezaie/', '/404.html'
];
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const baseline = process.env.A11Y_BASELINE === '1';

async function unclippedMain(page) {
  return page.locator('main').evaluate(main => {
    const bounds = main.getBoundingClientRect();
    return [...main.querySelectorAll('*')].every(el => {
      // Decorative artwork is deliberately cropped; math/tables/code have
      // their own keyboard-accessible scroll areas rather than page overflow.
      if (el.closest('[aria-hidden="true"], .home-hero-mark, .katex-mathml, .katex-display, .scroll-wrapper, pre')) return true;
      const rect = el.getBoundingClientRect();
      return !rect.width || (rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1);
    });
  });
}

async function interactiveChecks(browser, base, report) {
  const context = await browser.newContext({ viewport: { width: 320, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const visit = route => page.goto(base + route + 'index.html', { waitUntil: 'networkidle' });
  const focused = selector => page.locator(selector).evaluate(el => el === document.activeElement);
  const snapshot = async name => {
    if (!process.env.A11Y_SCREENSHOTS) return;
    fs.mkdirSync(process.env.A11Y_SCREENSHOTS, { recursive: true });
    await page.screenshot({ path: path.join(process.env.A11Y_SCREENSHOTS, `${name}.png`) });
  };
  const check = async (name, run) => { await run(); report.interactions.push(name); console.log(`PASS ${name}`); };
  try {
    await visit('/complex-numbers/introduction/');
    await check('Persian page language, RTL prose and isolated LTR math', async () => {
      assert.equal(await page.locator('html').getAttribute('lang'), 'fa');
      assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
      assert.equal(await page.locator('.katex').first().evaluate(el => getComputedStyle(el).direction), 'ltr');
      assert.ok(await page.locator('.katex-mathml math').count() > 0);
      assert.equal(await page.locator('.katex-error').count(), 0);
    });
    await check('First Tab reveals skip link; Enter focuses main', async () => {
      await page.keyboard.press('Tab');
      assert.ok(await focused('.skip-link'));
      const box = await page.locator('.skip-link').boundingBox();
      assert.ok(box.y >= 0);
      await page.keyboard.press('Enter');
      assert.ok(await focused('main'));
    });
    await check('Closed mobile menu is inert; open menu contains keyboard focus', async () => {
      assert.ok(await page.locator('#side-nav').evaluate(el => el.inert));
      await page.locator('#nav-toggle').focus();
      await page.keyboard.press('Enter');
      assert.ok(await focused('#side-nav-close'));
      assert.equal(await page.locator('#side-nav').getAttribute('aria-modal'), 'true');
      assert.ok(await page.locator('main').evaluate(el => el.inert));
      await page.keyboard.press('Shift+Tab');
      assert.ok(await page.locator('#side-nav a').last().evaluate(el => el === document.activeElement));
      await page.keyboard.press('Tab');
      assert.ok(await focused('#side-nav-close'));
      await page.evaluate(axe.source);
      const result = await page.evaluate(tags => axe.run(document, { runOnly: { type: 'tag', values: tags } }), tags);
      assert.equal(result.violations.length, 0, JSON.stringify(result.violations.map(v => v.id)));
      await snapshot('mobile-menu');
      await page.keyboard.press('Escape');
      assert.ok(await focused('#nav-toggle'));
      assert.equal(await page.locator('#nav-toggle').getAttribute('aria-expanded'), 'false');
      assert.ok(!await page.locator('main').evaluate(el => el.inert));
    });
    await check('Menu breakpoint changes restore access and do not leave hidden focus', async () => {
      await page.locator('#nav-toggle').click();
      await page.setViewportSize({ width: 1280, height: 900 });
      assert.equal(await page.locator('#side-nav').getAttribute('role'), null);
      assert.ok(!await page.locator('#side-nav').evaluate(el => el.inert));
      assert.ok(!await page.locator('main').evaluate(el => el.inert));
      await page.locator('#side-nav a').first().focus();
      await page.setViewportSize({ width: 320, height: 900 });
      assert.ok(await focused('#nav-toggle'));
    });
    await check('Figure enlargement opens with keyboard, traps focus and restores it', async () => {
      const trigger = page.locator('.image-zoom').first();
      await trigger.focus();
      await page.keyboard.press('Enter');
      assert.ok(await focused('.image-lightbox-close'));
      assert.equal(await page.locator('dialog').evaluate(el => el.open && el.matches(':modal')), true);
      await snapshot('image-dialog');
      await page.evaluate(axe.source);
      const result = await page.evaluate(tags => axe.run(document, { runOnly: { type: 'tag', values: tags } }), tags);
      assert.equal(result.violations.length, 0, JSON.stringify(result.violations.map(v => v.id)));
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      assert.ok(await page.locator('dialog').evaluate(el => el.contains(document.activeElement)));
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog').count(), 0);
      assert.ok(await trigger.evaluate(el => el === document.activeElement));
      await page.keyboard.press('Space');
      await page.locator('.image-lightbox-close').click();
      assert.ok(await trigger.evaluate(el => el === document.activeElement));
      assert.equal(await trigger.locator('.image-zoom').count(), 0);
    });
    await check('Wide equations scroll using arrow keys and retain MathML', async () => {
      const math = page.locator('.katex-display[data-scroll-region]').first();
      await math.focus();
      const before = await math.evaluate(el => el.scrollLeft);
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(el => el.scrollLeft > 0, await math.elementHandle());
      assert.ok(await math.evaluate(el => el.scrollLeft > 0));
      assert.equal(before, 0);
      assert.ok(await math.locator('math').count() > 0);
    });
    await check('Exercise answers open and close with keyboard', async () => {
      const first = page.locator('details.exercise').first();
      await first.locator('summary').focus();
      await page.keyboard.press('Enter');
      assert.ok(await first.evaluate(el => el.open));
      await page.keyboard.press('Space');
      assert.ok(!await first.evaluate(el => el.open));
    });
    for (const [route, kind, count] of [
      ['/complex-numbers/introduction/', 'multiply', 4],
      ['/complex-numbers/nth-roots/', 'roots', 2],
      ['/complex-numbers/julia-mandelbrot/', 'orbit', 4]
    ]) {
      await visit(route);
      await check(`${kind}: labeled fields and single-click buttons update the lab`, async () => {
        const root = page.locator(`.lab[data-lab="${kind}"]`);
        assert.equal(await root.getByRole('spinbutton').count(), count);
        const input = root.getByRole('spinbutton').first();
        const readout = root.locator('.lab-readout');
        const before = await readout.innerText();
        await input.fill('0.7');
        assert.notEqual(await readout.innerText(), before);
        await input.press('ArrowUp');
        assert.equal(Number(await input.inputValue()), 0.8);
        await root.getByRole('button', { name: /افزایش بخش حقیقی/ }).first().click();
        assert.equal(Number(await input.inputValue()), 0.9);
        for (const button of await root.locator('.lab-coordinate-row button').all()) {
          const box = await button.boundingBox();
          assert.ok(box.width >= 24 && box.height >= 24);
        }
        if (kind === 'roots') {
          await root.getByRole('slider').focus();
          await page.keyboard.press('ArrowRight');
          // Native RTL sliders decrease with ArrowRight and increase with ArrowLeft.
          assert.equal(await root.locator('.lab-n').innerText(), '4');
          await page.keyboard.press('ArrowLeft');
          assert.equal(await root.locator('.lab-n').innerText(), '5');
        }
        if (kind === 'orbit') {
          await root.getByRole('radio', { name: 'ژولیا' }).check();
          await root.getByRole('spinbutton').nth(2).fill('0.5');
          assert.match(await readout.innerText(), /z₀ = 0.50/);
        }
        await root.scrollIntoViewIfNeeded();
        await snapshot(`${kind}-controls`);
      });
    }
    await visit('/how-to-lie-with-statistics/the-gee-whiz-graph/');
    await check('Statistics controls expose selection and honor reduced motion', async () => {
      const root = page.locator('.lab[data-lab="frames"]');
      await root.getByRole('button', { name: 'قاب بلند و باریک' }).focus();
      await page.keyboard.press('Enter');
      assert.equal(await root.getByRole('button', { name: 'قاب بلند و باریک' }).getAttribute('aria-pressed'), 'true');
      assert.equal(await root.locator('svg rect').getAttribute('width'), '180');
      assert.equal(await root.locator('svg.lab-stage').count(), 1);
      await snapshot('statistics-reduced-motion');
      await page.locator('#nav-toggle').click();
      assert.equal(await page.locator('#side-nav').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await page.keyboard.press('Escape');
    });
    await check('200% text resize and 320 CSS pixel reflow retain content', async () => {
      for (const route of ['/', '/authors/pooyarezaie/', '/complex-numbers/nth-roots/']) {
        await visit(route);
        await page.evaluate(() => {
          const sizes = [...document.querySelectorAll('body, body *')].map(el => [el, parseFloat(getComputedStyle(el).fontSize)]);
          sizes.forEach(([el, size]) => el.style.setProperty('font-size', `${size * 2}px`, 'important'));
        });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.ok(await unclippedMain(page), route);
      }
    });
    assert.deepEqual(errors, [], 'Browser runtime errors');
  } finally { await context.close(); }
}

async function main() {
  const server = createServer((req, res) => handler(req, res, {
    public: path.resolve('_site'), cleanUrls: false
  }));
  if (!process.env.AUDIT_URL) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.AUDIT_URL || `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const report = { base, axe: axe.version, playwright: require('playwright/package.json').version, scans: [], interactions: [] };
  try {
    for (const width of (process.env.A11Y_INTERACTIONS_ONLY ? [] : [1280, 320])) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      for (const route of pages) {
        const response = await page.goto(base + route + (route.endsWith('/') && !process.env.AUDIT_URL ? 'index.html' : ''), { waitUntil: 'networkidle' });
        assert.ok(response.ok() || route === '/404.html', `Load failed: ${route}`);
        await page.evaluate(axe.source);
        const results = await page.evaluate(tags => axe.run(document, { runOnly: { type: 'tag', values: tags } }), tags);
        const scan = { route, width, violations: results.violations.map(v => ({ id: v.id, impact: v.impact, criteria: v.tags.filter(t => /^wcag\d/.test(t)), nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: results.incomplete.map(v => ({ id: v.id, nodes: v.nodes.length })) };
        report.scans.push(scan);
        console.log(`${width} ${route}: ${scan.violations.length} axe violation type(s)`);
        if (!baseline) assert.equal(scan.violations.length, 0, JSON.stringify(scan));
        if (!baseline) {
          assert.ok(await unclippedMain(page), `Clipped main content: ${route} at ${width}`);
          assert.equal(await page.locator('.katex-error').count(), 0);
          for (const image of await page.locator('main img').all()) assert.ok(await image.evaluate(el => el.complete && el.naturalWidth > 0), `Broken image: ${route}`);
        }
      }
      await context.close();
    }
    if (!baseline && !process.env.AUDIT_URL) await interactiveChecks(browser, base, report);
  } finally {
    await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    if (process.env.A11Y_REPORT) fs.writeFileSync(process.env.A11Y_REPORT, JSON.stringify(report, null, 2));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
