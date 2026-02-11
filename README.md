# Fractal Notes

**Fractal Notes**  is a mathematical educational website that presents short, intuitive, and sometimes deep notes about mathematics. Just as a fractal emerges from repeating simple patterns at different scales, these notes are small windows into deeper mathematical structures.

## Overview

This project is a Jekyll-based static website hosted on GitHub Pages. The site is written in Persian and features right-to-left (RTL) layout. It aims to collect ideas, definitions, exercises, and inspiring proofs in a simple and accessible format.

The notes are not meant to replace textbooks, but rather serve as **small sheets of understanding** that each introduce you to a larger topic from a small perspective.

## Website

🌐 **Live Site**: [fractalnotes.com](https://fractalnotes.com)

## Setup and Development

### Prerequisites

- Ruby (with Bundler)
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/pooyarezaie/Fractal-Notes.git
cd Fractal-Notes
```

2. Install dependencies:
```bash
bundle install
```

3. Build and serve locally:
```bash
bundle exec jekyll serve
```

The site will be available at `http://localhost:4000`

## Build and deploy (GitHub Pages)

The repo uses **GitHub Actions** to build and deploy:

1. **Jekyll** builds the site into `_site`.
2. A **prerender** step runs a headless browser (Playwright) on each page so KaTeX and inline JS (tables, nav, lightbox) are already applied in the HTML—no first-load delay.
3. The resulting `_site` is deployed to GitHub Pages.

**Required:** In the repo **Settings → Pages**, set **Source** to **GitHub Actions**.

To run the full pipeline locally (build + prerender):

```bash
bundle exec jekyll build
npm install
npx playwright install --with-deps chromium
npm run prerender
# _site now contains prerendered HTML
```

## Docker (Static Build)

Build and run the site using Docker and Nginx:

```bash
docker compose up --build -d
```

The site will be available at `http://localhost:8080`


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
