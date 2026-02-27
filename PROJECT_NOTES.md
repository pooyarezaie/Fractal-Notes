# Project Notes - Fractal Notes

## Project Summary

**Fractal Notes** is a Persian-language mathematical educational website built with Jekyll and hosted on GitHub Pages. The site presents intuitive mathematical notes with a focus on geometric and visual explanations.

## Key Technical Details

### Jekyll Configuration
- **Markdown Engine**: Kramdown with math support (`math_engine: mathjax` outputs `\(...\)` / `\[...\]`)
- **Math Rendering**: KaTeX (via CDN; faster than MathJax, less first-load jank)
- **Layout**: Single default layout (`_layouts/default.html`)
- **Math in Markdown**: Inline `$...$`, display `$$...$$` (Kramdown converts to `\(...\)` / `\[...\]` for KaTeX)

### Styling
- **Font**: Vazirmatn (Persian font from Google Fonts)
- **Direction**: RTL (right-to-left)
- **Font Size**: 17px
- **Line Height**: 1.9
- **Max Width**: 800px
- **Background**: #fdfdfd

### Content Structure
- Main page: `index.md` (Persian introduction)
- Complex Numbers: `complex-numbers/index.md`
- Problem Solving > Symmetry: `problem-solving/symmetry/index.md`


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
