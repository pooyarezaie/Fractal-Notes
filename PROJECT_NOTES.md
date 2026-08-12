# Project Notes - Fractal Notes

## Project Summary

**Fractal Notes** is a Persian-language mathematical educational website built with Jekyll and hosted on GitHub Pages. The site presents intuitive mathematical notes with a focus on geometric and visual explanations.

## Key Technical Details

### Jekyll Configuration
- **Markdown Engine**: Kramdown with math support (`math_engine: mathjax` outputs `\(...\)` / `\[...\]`)
- **Math Rendering**: KaTeX 0.16.9, **self-hosted** under `assets/katex/` (faster than MathJax, less first-load jank; no CDN)
- **Layout**: Single default layout (`_layouts/default.html`, `<html lang="fa" dir="rtl">`)
- **Math in Markdown**: Inline `$...$`, display `$$...$$` (Kramdown converts to `\(...\)` / `\[...\]` for KaTeX)

### Styling
- **Stylesheet**: `assets/css/fractal.css` — the only one. **Not** `style.css`: the
  `github-pages` gem enables `jekyll-theme-primer` by default, and the theme's
  `assets/css/style.scss` builds to `/assets/css/style.css`. Two files, one output
  path — whichever won the race got shipped. `_config.yml` now sets an empty
  `theme:` so no theme is loaded at all.
- **Colors**: CSS custom properties in `:root`. The accent (`--accent: #4a3184`) is the
  violet of the Sierpiński logo; change that one token to re-tint the whole site.
- **Active-learning components**: `fractal.css` also styles `.pause` (guess-first
  boxes), `details.exercise` (collapsible answers), `.fig-caption`, and `.lab`
  (canvas widgets). The lab logic lives in self-hosted `assets/js/complex-labs.js`
  (multiply / roots / orbit widgets, selected via `data-lab`); it re-initializes
  on every page load because the prerender bakes DOM but not canvas pixels.
  Markup conventions are documented in `AGENTS.md` §6.
- **Font**: Vazirmatn (Persian font), **self-hosted** at `assets/fonts/Vazirmatn-wght.woff2` (preloaded; SW-cached)
- **Direction**: RTL (right-to-left). Never use `letter-spacing` on Persian text — the
  script joins its letters and tracking breaks the joins. Hierarchy comes from size and weight.
- **Font Size**: 17px
- **Line Height**: 1.9
- **Max Width**: 800px

### Asset caching (`sw.js`)
The service worker caches everything under `/assets/`. Fonts and KaTeX are cache-first
forever (their content never changes without the filename changing); the stylesheet is
stale-while-revalidate, and the layout requests it with a `?v={{ site.time }}` build
stamp so the first load after a deploy is already fresh. Without both, a returning
visitor keeps the stylesheet they cached on their first visit — indefinitely. Bump
`CACHE_VERSION` in `sw.js` to force every client to drop its cache.

### Content Structure
- Home page: `index.md`. A short hero, then every `series: true` group as a large card
  (kicker, summary, numbered notes, "start here" button), then the remaining groups as a
  responsive grid of topic cards. All of it is generated from `_data/site_index.yml` — the
  topic and note counts included — so adding a note to that file is the only step needed.
- Notes live as `.md` files inside topic directories: `complex-numbers/`, `induction/`, `trigonometry/`, `pigeonhole-principle/`, `linear-algebra/`, `problems/`, and `problem-solving/{symmetry,recasting}/`.
- **`_data/site_index.yml` is the single source of truth** for the note list and side menu. It is a list of **topic groups**, each with `title`, optional `path`/`series`/`summary`, and an ordered `items` list (title + path, no leading slash, no `.md`). A note must be listed there to be visible.
- **Series (mini-courses):** a group with `series: true` gets numbered notes, a landing page at `<path>/index.md`, and automatic previous/next navigation rendered by `_includes/series-nav.html`. `complex-numbers/` is the reference example. The Persian wording stays neutral — numbered **برگه‌ها**, never «دوره» or «درس»; "series"/"mini-course" is internal vocabulary only.
- `_includes/` holds two small partials: `series-nav.html` (course breadcrumb + prev/next) and `fa-number.html` (integer → Persian-Indic digits).
- **`scripts/prerender-whitelist.json`** lists the directories that get prerendered; add a new topic directory there when you create one. Directory index pages (e.g. `complex-numbers/index.html` → `/complex-numbers/`) are picked up automatically.
- See `AGENTS.md` for the full step-by-step "add a new note" workflow and writing conventions.


### SEO
- **URLs**: `permalink: pretty` in `_config.yml`, so `complex-numbers/nth-roots.md`
  is served at `/complex-numbers/nth-roots/`. This keeps three things identical: the
  URL the templates link, the one `jekyll-seo-tag` declares canonical, and the one in
  `sitemap.xml`. Because `_data/site_index.yml` paths carry no trailing slash, every
  template appends one (`item.path | append: '/' | relative_url`) — drop that and each
  internal link becomes a redirect.
- **Legacy `.html` URLs**: notes were served at `/topic/name.html` until Aug 2026.
  GitHub Pages has no server-side 301, so every note predating that move carries
  `redirect_from: "/topic/name.html"` and `jekyll-redirect-from` emits a stub there
  with a canonical link plus a meta refresh — which Google reads as a permanent
  redirect. New notes never had a `.html` URL and need no `redirect_from`. The stubs
  are the only non-`index.html` files under a note directory, which is exactly how
  `scripts/prerender.js` tells them apart: it prerenders `index.html` only, because
  loading a stub would follow its refresh and overwrite it with a copy of the target.
- **Meta/OG tags**: `jekyll-seo-tag` (title, description, canonical, Open Graph,
  Twitter cards) + `jekyll-sitemap`. `robots.txt` points at `/sitemap.xml`.
  `site.description` in `_config.yml` is deliberately short: `jekyll-seo-tag` builds
  the home page `<title>` as `"{{ site.title }} | {{ site.description }}"`, and Google
  truncates around 60 characters. The long, keyword-rich blurb lives in `index.md`'s
  front matter, serving as the home page's meta description.
- **Unfinished notes**: set `sitemap: false` in the front matter. It keeps the note
  out of `sitemap.xml` and makes the layout emit `noindex, nofollow`, so a draft that
  is already committed can't be indexed before it is registered in `site_index.yml`.
- **Dates**: every note carries `date:` (publish) and `last_modified_at:` front
  matter. This makes `jekyll-seo-tag` emit `og:type=article` + a `BlogPosting`
  JSON-LD with real dates, and feeds the layout's own `Article` JSON-LD
  (`datePublished`/`dateModified`) and the Atom feed. Bump `last_modified_at`
  on substantial edits.
- **Structured data**: `_layouts/default.html` emits a JSON-LD `@graph` with
  `WebSite` (incl. `alternateName: "Fractal Notes"` so Google shows the right
  site name), `BreadcrumbList`, and an enriched `Article` per note.
- **Feed**: `feed.xml` is a hand-rolled Atom template (notes are Jekyll *pages*,
  not posts, so `jekyll-feed` can't see them); it lists every note registered in
  `_data/site_index.yml`, newest first, with an autodiscovery `<link>` in the layout.
- **404**: `404.html` (GitHub Pages picks it up automatically; `noindex`).
- **Excludes**: `_config.yml` `exclude:` keeps internal docs (`AGENTS.md`,
  `CLAUDE.md`, `README.md`, `PROJECT_NOTES.md`), build tooling and configs out of
  `_site` — the `github-pages` optional-front-matter plugin would otherwise
  publish every `.md` in the repo (AGENTS/CLAUDE used to end up in the sitemap).
- Local builds show `http://localhost:4000` URLs — the `github-pages` gem
  overrides `site.url` outside `JEKYLL_ENV=production`; deploys are unaffected.

### Dependencies
- **Ruby**: `github-pages` gem (includes Jekyll and all necessary plugins)
- **Node (for prerender)**: Playwright (Chromium), `serve-handler`; used by GitHub Actions and Docker build

## Content Themes

1. **Complex Numbers**: Geometric approach to complex numbers, emphasizing:
   - Vector representation
   - Addition as vector addition
   - Multiplication as rotation + scaling
   - The imaginary unit $i$ as 90° rotation

2. **Problem Solving - Symmetry**: Demonstrates how adding ambiguity can create symmetry to solve problems, using the "pill problem" as an example.

## Build and deploy

- **GitHub Pages**: GitHub Actions runs Jekyll build → Playwright prerender → deploy `_site`. Set Pages source to **GitHub Actions** in repo Settings.
- **Docker**: Multi-stage image (Jekyll → Node/Playwright prerender → Nginx). Serves the same prerendered HTML/CSS. `make docker-build` then `make docker-up`; site at http://localhost:8080.

## Development Workflow

1. Edit markdown files in root or subdirectories
2. Add images to `assets/img/`
3. Test locally with `bundle exec jekyll serve` (or `make dev`)
4. Full pipeline (with prerender): `make build-prerender` then `make serve` to test
5. Push to GitHub (auto-deploys via GitHub Pages when source is GitHub Actions)
