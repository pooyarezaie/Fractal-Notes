#!/usr/bin/env node
/**
 * Prerender _site with a headless browser so KaTeX and inline JS are already
 * applied in the final HTML. Run after `jekyll build`. Overwrites HTML files in place.
 *
 * Usage: SITE_DIR=_site PORT=3000 node scripts/prerender.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { createServer } = require('http');
const handler = require('serve-handler');

const SITE_DIR = path.resolve(process.cwd(), process.env.SITE_DIR || '_site');
const PORT = parseInt(process.env.PORT || '3000', 10);
const BASE = `http://127.0.0.1:${PORT}`;

function collectHtmlFiles(dir, base = '') {
  const entries = fs.readdirSync(path.join(dir, base), { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    const full = path.join(dir, rel);
    if (e.isDirectory()) {
      out.push(...collectHtmlFiles(dir, rel));
    } else if (e.isFile() && e.name.endsWith('.html')) {
      const urlPath = e.name === 'index.html'
        ? (base ? `/${base}/` : '/')
        : `/${rel}`;
      out.push({ filePath: path.join(SITE_DIR, rel), urlPath });
    }
  }
  return out;
}

async function main() {
  if (!fs.existsSync(SITE_DIR)) {
    console.error('SITE_DIR not found:', SITE_DIR);
    process.exit(1);
  }

  const pages = collectHtmlFiles(SITE_DIR);
  console.log('Prerendering', pages.length, 'page(s)...');

  const server = createServer((req, res) => {
    return handler(req, res, { public: SITE_DIR, cleanUrls: false });
  });
  server.listen(PORT, '127.0.0.1');

  await new Promise((resolve) => server.once('listening', resolve));

  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });

  try {
    for (const { filePath, urlPath } of pages) {
      const url = BASE + urlPath;
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        // Wait for KaTeX when present; otherwise short delay so defer scripts run
        await Promise.race([
          page.waitForSelector('.katex', { timeout: 4500 }),
          new Promise((r) => setTimeout(r, 600))
        ]).catch(() => {});
        await new Promise((r) => setTimeout(r, 300));
        const html = await page.content();
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, html, 'utf8');
        console.log('  ', urlPath);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
