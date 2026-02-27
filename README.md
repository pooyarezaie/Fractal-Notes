# Fractal Notes

**Fractal Notes**  is a mathematical educational website that presents short, intuitive, and sometimes deep notes about mathematics. Just as a fractal emerges from repeating simple patterns at different scales, these notes are small windows into deeper mathematical structures.

## Overview

This project is a Jekyll-based static website hosted on GitHub Pages. The site is written in Persian and features right-to-left (RTL) layout. It aims to collect ideas, definitions, exercises, and inspiring proofs in a simple and accessible format.

The notes are not meant to replace textbooks, but rather serve as **small sheets of understanding** that each introduce you to a larger topic from a small perspective.

## Website

🌐 **Live Site**: [fractalnotes.com](https://fractalnotes.com)

## Setup and Development

### Prerequisites

- **Ruby** (with Bundler) — required for Jekyll
- **Node.js** (with npm) — required for the prerender step (local pipeline and Docker build)
- **Git**
- **Docker** (optional) — for building and running the prerendered site in a container

### Installation

1. Clone the repository:
```bash
git clone https://github.com/pooyarezaie/Fractal-Notes.git
cd Fractal-Notes
```

2. Install dependencies:
```bash
make install        # Ruby gems only
make install-deps   # Ruby + Node (needed for prerender)
```

3. Build and serve locally:
```bash
make dev            # Jekyll with livereload at http://localhost:4000
# Or: bundle exec jekyll serve
```

## Build and deploy (GitHub Pages)

The repo uses **GitHub Actions** to build and deploy:

1. **Jekyll** builds the site into `_site`.
2. A **prerender** step runs a headless browser (Playwright) on each page so KaTeX and inline JS (tables, nav, lightbox) are already applied in the HTML—no first-load delay.
3. The resulting `_site` is deployed to GitHub Pages.

**Required:** In the repo **Settings → Pages**, set **Source** to **GitHub Actions**.

### Switching between prerendered and default mode

| Mode | Settings → Pages → Source | What you get |
|------|---------------------------|--------------|
| **Prerendered** | **GitHub Actions** | Build runs Jekyll + prerender; deployed HTML already has KaTeX and JS applied. No first-load delay. |
| **Default (Jekyll only)** | **Deploy from a branch** → choose branch (e.g. `main`) and folder (e.g. `/ (root)`) | GitHub builds the site with Jekyll only (no prerender). KaTeX runs in the browser after load; you may see a short delay. |

To switch: go to the repo **Settings → Pages**, then change **Source** to either **GitHub Actions** (prerendered) or **Deploy from a branch** (default). After saving, the next deploy will use the chosen mode.

To check if the live site is prerendered, run:

```bash
make check-prerender
# Or with a custom URL: make check-prerender SITE_URL=https://username.github.io/Fractal-Notes
```

To run the full pipeline locally (build + prerender):

```bash
make build-prerender
# Or step by step: make build && make prerender (after make install-node)
# _site now contains prerendered HTML
```

Only pages under the **directories** listed in **`scripts/prerender-whitelist.json`** are prerendered. Use `""` for the site root (homepage only) and directory paths like `"complex-numbers"` or `"problem-solving/symmetry"` to include every HTML page under that path. New markdown files under a whitelisted directory are prerendered automatically; add a new directory to the list to include a new section.

## Docker (Prerendered + Nginx)

The Docker image builds the same **prerendered** site as GitHub Actions (Jekyll → Playwright prerender), then serves it with **Nginx** as static HTML/CSS only—no first-load delay for math or JS.

**Build and run:**

```bash
make docker-build    # Build the image
make docker-up       # Run at http://localhost:8080 (detached)
```

Or with Compose directly:

```bash
docker compose up --build -d
```

**Other commands:** `make docker-down` (stop), `make docker-logs` (tail logs).

The site will be available at **http://localhost:8080**.

For all available commands (build, prerender, Docker, etc.), run **`make help`**.

## Contributing

This is a personal educational project. Contributions, suggestions, and improvements are welcome!

## License

This work is licensed under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/).

You are free to:
- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material for any purpose, even commercially

Under the following terms:
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

See the [LICENSE](LICENSE) file for the full license text.
