# AGENTS.md — Guide for AI Assistants

This file orients an AI coding/writing agent working in **Fractal Notes**. Read it
before editing. It describes what the project is, how it is built, and — most
importantly — the conventions for writing new math notes so they match the
existing voice and render correctly.

> **Human note:** `README.md` is the human-facing setup guide, `PROJECT_NOTES.md`
> is the technical cheat-sheet, and this file is the agent-facing map. Keep the
> three consistent when you change build steps or structure.

---

## 1. What this project is

**Fractal Notes** ([fractalnotes.com](https://fractalnotes.com)) is a
**Persian-language (Farsi), right-to-left** math education website. It is a
collection of short, intuitive notes — "small sheets of understanding" — that
each open a window onto a bigger idea. The author's method: to learn (or
re-learn) something, write about it so simply that anyone would understand it,
and share the excitement.

**The content is the product.** The code (Jekyll, prerender, Docker) exists only
to publish the notes cleanly. Most work here is **writing and editing `.md`
notes**, not changing infrastructure.

- **Language of the notes:** Persian (فارسی), RTL. Math is universal (LaTeX).
- **Language of the docs/code/comments:** English.
- **Tone:** warm, curious, conversational, intuition-first. Prefer a picture or a
  concrete example over a formal definition. Rigor is welcome but never at the
  cost of clarity.

---

## 2. Tech stack (the short version)

| Piece | What it is |
|-------|-----------|
| **Jekyll** | Static site generator. Turns `.md` → `_site/` HTML. |
| **Kramdown** | Markdown engine. `math_engine: mathjax` emits `\(...\)` / `\[...\]`. |
| **KaTeX 0.16.9** | Math rendering, **self-hosted** under `assets/katex/` (not a CDN). |
| **Vazirmatn** | Persian font, **self-hosted** at `assets/fonts/Vazirmatn-wght.woff2`. |
| **Playwright** | Headless-browser **prerender** step: bakes KaTeX + inline JS into the HTML so there is no first-load flash. |
| **GitHub Pages** | Hosting. GitHub Actions runs Jekyll → prerender → deploy. |
| **Docker + Nginx** | Optional: serves the same prerendered HTML locally. |

Single layout: `_layouts/default.html` (`<html lang="fa" dir="rtl">`).

---

## 3. Repository map

```
index.md                     Homepage. Lists every note by looping over site_index.yml.
_config.yml                  Jekyll config (title, SEO, kramdown math, plugins).
_data/site_index.yml         ★ SINGLE SOURCE OF TRUTH for the note list / menu.
_layouts/default.html        The only layout (head, KaTeX loader, nav, SEO JSON-LD).
scripts/prerender.js         Playwright prerender script.
scripts/prerender-whitelist.json  Directories that get prerendered.
assets/
  css/style.css              All styling (RTL, typography, image/table handling).
  katex/                     Self-hosted KaTeX (js, css, fonts).
  fonts/                     Self-hosted Vazirmatn.
  img/                       All note images (PNG diagrams).
Makefile                     All dev/build/docker commands (`make help`).
Dockerfile / compose.yml     Multi-stage prerendered image + Nginx.

Content directories (each holds topic notes as .md files):
  complex-numbers/           اعداد مختلط
  induction/                 استقرای ریاضی
  trigonometry/              مثلثات
  pigeonhole-principle/      اصل لانهٔ کبوتر
  linear-algebra/            جبر خطی
  problems/                  مسئله‌ها (standalone problems)
  problem-solving/
    symmetry/                تقارن
    recasting/               تغییر نگاه به مسئله
```

There is **only one `index.md`** (the site root). Sub-directories do **not** have
their own index pages; all navigation flows through `_data/site_index.yml`.

---

## 4. ★ How to add a new note (the core workflow)

This is the most common task. Follow every step or the note won't appear/render.

1. **Create the file** as `<topic-dir>/<kebab-case-name>.md` (English filename,
   even though the content is Persian). Put it in the right topic directory, or
   create a new directory for a new topic (see step 5). The quickest start is to
   copy the ready-made skeleton at `_templates/note-template.md`.

2. **Write the front matter** (YAML). `title` and `description` are required;
   `image` is optional (used for social/SEO cards):
   ```yaml
   ---
   title: "عنوان یادداشت"          # short Persian title (no "# " here)
   description: "یک جملهٔ توصیفی برای SEO و کارت‌های اشتراک‌گذاری."
   image: "/assets/img/logo.png"   # optional; a relevant diagram is better
   ---
   ```

3. **Write the body** following the note conventions in §5.

4. **Register the note** in `_data/site_index.yml` so it shows on the homepage and
   in the side menu. Add an entry **in the reading order you want**:
   ```yaml
   - title: "عنوان یادداشت"                      # can match the front-matter title
     path: "topic-dir/kebab-case-name"           # NO leading slash, NO .md
   ```
   Titles here often carry a topic prefix, e.g. `"استقرای ریاضی؛ مسئلهٔ ..."`.
   **A note not listed here is invisible on the site** (though the URL still works
   once built). Example of an existing unlisted draft:
   `problem-solving/recasting/putnam-icosahedron-problem.md`.

5. **New topic directory?** Add its path to `scripts/prerender-whitelist.json`
   (e.g. `"number-theory"` or `"problem-solving/invariants"`), otherwise pages
   under it are served un-prerendered (math renders in-browser with a small
   delay). Files added under an already-listed directory are picked up
   automatically.

6. **Verify locally:** `make dev`, open `http://localhost:4000`, confirm the note
   appears in the list, the math renders, and RTL/images look right.

---

## 5. Note writing conventions (match the house style)

Study an existing note before writing — good models:
`complex-numbers/introduction.md`, `problems/sum_of_power_1.md`,
`problem-solving/symmetry/pill-problem.md`.

**Structure**
- Start the body with an H1 title and a **bold one-line subtitle**, then an intro
  paragraph:
  ```markdown
  # عنوان اصلی
  **یک زیرعنوانِ کوتاه و گیرا**

  یک یا دو جملهٔ مقدماتی که خواننده را وارد فضای مسئله می‌کند.
  ```
- Separate major sections with a horizontal rule `---` and `## headings`.
- Use `>` blockquotes for a key principle, a quote (e.g. Pólya), or a punchline.
- Keep paragraphs short. Intuition first, formalism second.

**Math** (KaTeX via Kramdown)
- Inline: `$ ... $`  ·  Display: `$$ ... $$` on their own lines.
- Standard LaTeX. Persian text and LaTeX mix freely on a line.
- Test every formula in the local preview — a broken delimiter silently fails to
  render.

**Images**
- Store PNGs in `assets/img/` with descriptive `snake_case` names.
- Center them and **always set `width` and `height`** (prevents layout shift):
  ```html
  <p align="center">
    <img src="/assets/img/your_diagram.png" alt="توضیح فارسی تصویر" width="320" height="320">
  </p>
  ```
- Use absolute `/assets/img/...` paths. Write a meaningful Persian `alt`.

**Language**
- Body text in Persian with correct RTL punctuation; use the ZWNJ (نیم‌فاصله)
  where Persian requires it (e.g. «می‌شود», «یادداشت‌ها»).
- Do not translate standard math terms awkwardly — keep the note readable.

---

## 6. Build & run commands

Run `make help` for the full list. Most-used:

```bash
make install-deps     # Ruby gems + Node/Playwright (first-time setup)
make dev              # Local Jekyll server + livereload → localhost:4000
make build            # Build static site into _site/
make build-prerender  # Full pipeline: build + Playwright prerender
make serve            # Serve the prerendered _site to test it
make check-prerender  # Verify the LIVE site is serving prerendered HTML
make docker-up        # Build + run the Nginx image → localhost:8080
```

Deployment is automatic: pushing to `main` triggers GitHub Actions
(Jekyll → prerender → deploy) when Pages source is set to **GitHub Actions**.

---

## 7. Guardrails for agents

- **Prefer content work.** The default task is writing/editing notes. Touch
  `_layouts/`, `assets/css/`, `scripts/`, `Dockerfile`, or CI only when the task
  is explicitly about infrastructure.
- **Keep the three docs in sync.** If you change build steps or structure, update
  `README.md`, `PROJECT_NOTES.md`, and this file together.
- **Never hand-edit generated output** (`_site/`, `Gemfile.lock`,
  `node_modules/` — all gitignored).
- **Two registries must agree with reality:** every visible note is in
  `_data/site_index.yml`; every content directory is in the prerender whitelist.
- **Don't add external CDNs.** KaTeX and the font are self-hosted on purpose
  (reliability + no first-load jank). Keep new assets local.
- **Verify math renders** in a local preview before considering a note done —
  it's the single most common silent failure.
- **This is a personal learning project.** When the author is "learning something
  together" with you, the goal is a clear, correct, delightful note — accuracy of
  the math matters more than speed.
