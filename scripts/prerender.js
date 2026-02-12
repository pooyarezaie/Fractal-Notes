#!/usr/bin/env node
/**
 * Prerender _site with a headless browser so KaTeX and inline JS are already
 * applied in the final HTML. Run after `jekyll build`. Overwrites HTML files in place.
 * Only pages listed in scripts/prerender-whitelist.json are prerendered.
 *
 * Usage: SITE_DIR=_site PORT=3000 node scripts/prerender.js
 */

const fs = require('fs');
const path = require('path');
const { createServer } = require('http');
const handler = require('serve-handler');

const SITE_DIR = path.resolve(process.cwd(), process.env.SITE_DIR || '_site');
const PORT = parseInt(process.env.PORT || '3000', 10);
const BASE = `http://127.0.0.1:${PORT}`;

const WHITELIST_PATH = path.resolve(__dirname, 'prerender-whitelist.json');

function loadWhitelist() {
  const raw = fs.readFileSync(WHITELIST_PATH, 'utf8');
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) throw new Error('prerender-whitelist.json must be a JSON array of path strings');
  return list.map((p) => (typeof p === 'string' ? p.trim() : String(p)));
}

/** Collect all HTML pages under dir (relative to SITE_DIR), return { filePath, urlPath }[]. */
function collectHtmlUnder(dirRel) {
  const dir = path.join(SITE_DIR, dirRel);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = dirRel ? `${dirRel}/${e.name}` : e.name;
    const full = path.join(SITE_DIR, rel);
    if (e.isDirectory()) {
      out.push(...collectHtmlUnder(rel));
    } else if (e.isFile() && e.name.endsWith('.html')) {
      const urlPath = e.name === 'index.html'
        ? (dirRel ? `/${dirRel}/` : '/')
        : `/${rel}`;
      out.push({ filePath: full, urlPath });
    }
  }
  return out;
}

/** Expand whitelist (directories + "" for root) into { filePath, urlPath }[]. */
function pagesFromWhitelist(whitelist) {
  const pages = [];
  for (const p of whitelist) {
    const norm = p.replace(/^\/|\/$/g, '');
    if (norm === '') {
      const indexPath = path.join(SITE_DIR, 'index.html');
      if (fs.existsSync(indexPath)) pages.push({ filePath: indexPath, urlPath: '/' });
    } else {
      pages.push(...collectHtmlUnder(norm));
    }
  }
  return pages;
}

async function main() {
  if (!fs.existsSync(SITE_DIR)) {
    console.error('SITE_DIR not found:', SITE_DIR);
    process.exit(1);
  }

  const whitelist = loadWhitelist();
  const pages = pagesFromWhitelist(whitelist);
  console.log('Prerendering', pages.length, 'page(s) (whitelist)...');

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
