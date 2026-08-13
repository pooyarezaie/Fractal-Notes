#!/usr/bin/env node
/**
 * Prerender _site with a headless browser so KaTeX and inline JS are already
 * applied in the final HTML. Run after `jekyll build`. Overwrites HTML files in place.
 * Only pages listed in scripts/prerender-whitelist.json are prerendered.
 *
 * Incremental: each page's prerendered HTML is cached under .prerender-cache,
 * keyed by a hash of everything that can change the result. A page whose key is
 * already in the cache is restored from disk instead of being driven through the
 * browser, so editing one note reprerenders one page. See cacheKey() below.
 *
 * Usage: SITE_DIR=_site PORT=3000 node scripts/prerender.js
 *   PRERENDER_FORCE=1    ignore the cache and prerender every page
 *   PRERENDER_DRY_RUN=1  report how many pages need the browser, then exit
 *   PRERENDER_CACHE=dir  cache location (default .prerender-cache)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createServer } = require('http');
const handler = require('serve-handler');

const SITE_DIR = path.resolve(process.cwd(), process.env.SITE_DIR || '_site');
const PORT = parseInt(process.env.PORT || '3000', 10);
const BASE = `http://127.0.0.1:${PORT}`;

const WHITELIST_PATH = path.resolve(__dirname, 'prerender-whitelist.json');

const CACHE_DIR = path.resolve(process.cwd(), process.env.PRERENDER_CACHE || '.prerender-cache');
const FORCE = process.env.PRERENDER_FORCE === '1';
const DRY_RUN = process.env.PRERENDER_DRY_RUN === '1';
const CACHE_TTL_DAYS = parseFloat(process.env.PRERENDER_CACHE_TTL_DAYS || '14');

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
    } else if (e.isFile() && e.name === 'index.html') {
      // Only index.html. With `permalink: pretty` every real page is a
      // directory's index.html; the other .html files here are the legacy
      // redirect stubs jekyll-redirect-from emits for each note's `redirect_from`
      // front matter. Prerendering one would follow its meta refresh and
      // overwrite the stub with a copy of the target page — turning a redirect
      // into duplicate content.
      //
      // Always request the literal file path. The local server runs with
      // cleanUrls:false, so asking for a directory ("/complex-numbers/") gets a
      // generated directory listing instead of its index.html — which would then
      // be written over the real page.
      out.push({ filePath: full, urlPath: `/${rel}` });
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
      if (fs.existsSync(indexPath)) pages.push({ filePath: indexPath, urlPath: '/index.html' });
    } else {
      pages.push(...collectHtmlUnder(norm));
    }
  }
  return pages;
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Assets that can change what the browser leaves in the DOM, and therefore have
 * to invalidate every cached page when they change.
 *
 * CSS is in here, which is not obvious: the inline wrapTables() in
 * _layouts/default.html compares each table's scrollWidth against the width of
 * <main>, and wraps the overflowing ones in a div. Change a width in the
 * stylesheet and that decision — a real DOM node — can flip. KaTeX's fonts are
 * left out on purpose: they change how the page looks, never its markup.
 */
const GLOBAL_ASSET_DIRS = ['assets/css', 'assets/js'];
const GLOBAL_ASSET_FILES = [
  'assets/katex/katex.min.js',
  'assets/katex/auto-render.min.js',
  'assets/katex/katex.min.css'
];

function walkFiles(dirRel, out = []) {
  const dir = path.join(SITE_DIR, dirRel);
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const rel = `${dirRel}/${e.name}`;
    if (e.isDirectory()) walkFiles(rel, out);
    else if (e.isFile()) out.push(rel);
  }
  return out;
}

/** One hash standing for "the site-wide inputs to rendering". */
function globalFingerprint() {
  const h = crypto.createHash('sha256');
  // This script's own waiting/serialising logic decides what the output looks
  // like, so it counts as an input too.
  h.update(fs.readFileSync(__filename));
  const files = [...GLOBAL_ASSET_DIRS.flatMap((d) => walkFiles(d)), ...GLOBAL_ASSET_FILES];
  for (const rel of files.sort()) {
    const full = path.join(SITE_DIR, rel);
    if (!fs.existsSync(full)) continue;
    h.update(rel);
    h.update(fs.readFileSync(full));
  }
  return h.digest('hex');
}

// The stylesheet is requested as fractal.css?v={{ site.time }}, so every build
// stamps a fresh number into every page. Hash the pages with the stamp blanked
// out, or nothing would ever hit the cache; put the current build's stamp back
// when restoring, or the deploy would ship a stale cache-busting URL.
const STAMP_RE = /\?v=\d{8,}/g;
const STAMP_PLACEHOLDER = '?v=__BUILD__';
const PLACEHOLDER_RE = /\?v=__BUILD__/g;

function withoutStamp(html) {
  return html.replace(STAMP_RE, STAMP_PLACEHOLDER);
}

function withStampFrom(cachedHtml, builtHtml) {
  const m = builtHtml.match(/\?v=(\d{8,})/);
  return m ? cachedHtml.replace(PLACEHOLDER_RE, `?v=${m[1]}`) : cachedHtml;
}

/** Everything that can change this page's prerendered output, in one string. */
function cacheKey(builtHtml, globalHash) {
  return sha256(`${globalHash}\n${withoutStamp(builtHtml)}`);
}

/**
 * urlPath -> hash of the prerendered HTML last written there.
 *
 * Prerendering overwrites each page in place, so a second run over the same
 * _site reads its own output back as if it were fresh build output — every key
 * misses and the whole site renders again for nothing. Recognising a page as
 * already-prerendered makes `npm run prerender` idempotent.
 */
const MANIFEST_PATH = path.join(CACHE_DIR, 'manifest.json');

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (_) {
    return {};
  }
}

/**
 * Drop cache objects nothing has asked for in a while, so the cache stays
 * bounded. Age rather than "not used by this build": a full generation is ~5 MB,
 * and keeping the recent past means reverting an edit, or redeploying an older
 * commit, costs no browser time at all.
 */
function pruneCache() {
  if (!fs.existsSync(CACHE_DIR)) return 0;
  const cutoff = Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const name of fs.readdirSync(CACHE_DIR)) {
    if (!name.endsWith('.html')) continue;
    const full = path.join(CACHE_DIR, name);
    if (fs.statSync(full).mtimeMs >= cutoff) continue;
    fs.rmSync(full);
    removed++;
  }
  return removed;
}

async function main() {
  if (!fs.existsSync(SITE_DIR)) {
    console.error('SITE_DIR not found:', SITE_DIR);
    process.exit(1);
  }

  const whitelist = loadWhitelist();
  const pages = pagesFromWhitelist(whitelist);
  const globalHash = globalFingerprint();

  // Sort the whitelist into "already prerendered", "the cache has this exact
  // page" and "the browser has to render it", before paying for a browser at all.
  const manifest = loadManifest();
  const nextManifest = {};
  const done = [];
  const cached = [];
  const todo = [];
  for (const page of pages) {
    page.builtHtml = fs.readFileSync(page.filePath, 'utf8');
    const seen = manifest[page.urlPath];
    if (!FORCE && seen && seen.out === sha256(withoutStamp(page.builtHtml))) {
      nextManifest[page.urlPath] = seen;
      done.push(page);
      continue;
    }
    page.key = cacheKey(page.builtHtml, globalHash);
    page.cachePath = path.join(CACHE_DIR, `${page.key}.html`);
    if (!FORCE && fs.existsSync(page.cachePath)) cached.push(page);
    else todo.push(page);
  }

  if (DRY_RUN) {
    console.log(`${todo.length} of ${pages.length} page(s) need prerendering; ${cached.length} cached.`);
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `pending=${todo.length}\n`);
    }
    return;
  }

  console.log(
    `Prerendering ${todo.length} of ${pages.length} whitelisted page(s); ` +
      `${cached.length} from cache${done.length ? `, ${done.length} already prerendered` : ''}.`
  );

  const now = new Date();
  for (const { filePath, urlPath, key, cachePath, builtHtml } of cached) {
    const object = fs.readFileSync(cachePath, 'utf8');
    fs.writeFileSync(filePath, withStampFrom(object, builtHtml), 'utf8');
    fs.utimesSync(cachePath, now, now); // mark used, so pruning ages out only what nothing wants
    nextManifest[urlPath] = { in: key, out: sha256(object) };
  }

  if (todo.length) {
    const server = createServer((req, res) => {
      return handler(req, res, { public: SITE_DIR, cleanUrls: false });
    });
    server.listen(PORT, '127.0.0.1');

    await new Promise((resolve) => server.once('listening', resolve));

    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });

    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      for (const { filePath, urlPath, key, cachePath } of todo) {
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
          // Store it stamp-free: the next build's stamp differs, and
          // withStampFrom() patches the current one back in on restore.
          const object = withoutStamp(html);
          fs.writeFileSync(cachePath, object, 'utf8');
          nextManifest[urlPath] = { in: key, out: sha256(object) };
          console.log('  ', urlPath);
        } finally {
          await page.close();
        }
      }
    } finally {
      await browser.close();
      server.close();
    }
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(nextManifest, null, 2), 'utf8');

  const pruned = pruneCache();
  if (pruned) console.log(`Pruned ${pruned} cache entr${pruned === 1 ? 'y' : 'ies'} unused for ${CACHE_TTL_DAYS} days.`);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
