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
- **Font**: Vazirmatn (Persian font), **self-hosted** at `assets/fonts/Vazirmatn-wght.woff2` (preloaded; SW-cached)
- **Direction**: RTL (right-to-left)
- **Font Size**: 17px
- **Line Height**: 1.9
- **Max Width**: 800px
- **Background**: #fdfdfd

### Content Structure
- Home page: `index.md` (Persian intro); it loops over `_data/site_index.yml` and renders one block per topic group.
- Notes live as `.md` files inside topic directories: `complex-numbers/`, `induction/`, `trigonometry/`, `pigeonhole-principle/`, `linear-algebra/`, `problems/`, and `problem-solving/{symmetry,recasting}/`.
- **`_data/site_index.yml` is the single source of truth** for the note list and side menu. It is a list of **topic groups**, each with `title`, optional `path`/`series`/`summary`, and an ordered `items` list (title + path, no leading slash, no `.md`). A note must be listed there to be visible.
- **Series (mini-courses):** a group with `series: true` gets numbered notes, a landing page at `<path>/index.md`, and automatic previous/next navigation rendered by `_includes/series-nav.html`. `complex-numbers/` is the reference example. The Persian wording stays neutral — numbered **برگه‌ها**, never «دوره» or «درس»; "series"/"mini-course" is internal vocabulary only.
- `_includes/` holds two small partials: `series-nav.html` (course breadcrumb + prev/next) and `fa-number.html` (integer → Persian-Indic digits).
- **`scripts/prerender-whitelist.json`** lists the directories that get prerendered; add a new topic directory there when you create one. Directory index pages (e.g. `complex-numbers/index.html` → `/complex-numbers/`) are picked up automatically.
- See `AGENTS.md` for the full step-by-step "add a new note" workflow and writing conventions.


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
