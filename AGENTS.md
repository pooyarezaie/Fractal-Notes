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
collection of short, intuitive notes — «برگه‌هایی برای دیدن», *sheets for seeing* —
each carrying one idea and opening a window onto a bigger one. The author's method:
to learn (or re-learn) something, write about it so simply that anyone would
understand it, and share the excitement.

That phrase is the site's own description of itself, so keep new copy faithful to it:
a note's job is to make an idea **visible**, not to be memorised.

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
index.md                     Homepage. Hero, then each series as a card, then the other
                             topic groups as a grid — all from site_index.yml.
_config.yml                  Jekyll config (title, SEO, kramdown math, plugins).
_data/site_index.yml         ★ SINGLE SOURCE OF TRUTH for the note list / menu.
_layouts/default.html        The only layout (head, KaTeX loader, nav, SEO JSON-LD).
_includes/series-nav.html    Course breadcrumb + previous/next lesson links.
_includes/fa-number.html     Integer (0–99) → Persian-Indic digits.
scripts/prerender.js         Playwright prerender script.
scripts/prerender-whitelist.json  Directories that get prerendered.
assets/
  css/fractal.css            All styling (RTL, typography, image/table handling).
                             NOT style.css — that path collides with the github-pages
                             default theme (primer), which silently overwrites it.
  katex/                     Self-hosted KaTeX (js, css, fonts).
  fonts/                     Self-hosted Vazirmatn.
  img/                       All note images (PNG diagrams).
Makefile                     All dev/build/docker commands (`make help`).
Dockerfile / compose.yml     Multi-stage prerendered image + Nginx.

Content directories (each holds topic notes as .md files):
  complex-numbers/           اعداد مختلط — a SERIES; complex-numbers/index.md is its landing page
  induction/                 استقرای ریاضی
  trigonometry/              مثلثات
  pigeonhole-principle/      اصل لانهٔ کبوتر
  linear-algebra/            جبر خطی
  problems/                  مسئله‌ها (standalone problems)
  problem-solving/
    symmetry/                تقارن
    recasting/               تغییر نگاه به مسئله
```

All navigation flows through `_data/site_index.yml`. Most topic directories have
**no** index page of their own; the exception is a *series* (§5), which gets a
landing page at `<topic-dir>/index.md` serving as the course cover.

---

## 4. ★ How to add a new note (the core workflow)

This is the most common task. Follow every step or the note won't appear/render.

1. **Create the file** as `<topic-dir>/<kebab-case-name>.md` (English filename,
   even though the content is Persian). Put it in the right topic directory, or
   create a new directory for a new topic (see step 5). The quickest start is to
   copy the ready-made skeleton at `_templates/note-template.md`.

2. **Write the front matter** (YAML). `title` and `description` are required;
   `image` is optional (used for social/SEO cards); `date` is the publish date
   and feeds structured data (`article` metadata, dates in search results) and
   the Atom feed — set it when the note first goes live, and bump
   `last_modified_at` on substantial edits:
   ```yaml
   ---
   title: "عنوان یادداشت"          # short Persian title (no "# " here)
   description: "یک جملهٔ توصیفی برای SEO و کارت‌های اشتراک‌گذاری."
   image: "/assets/img/logo.png"   # optional; a relevant diagram is better
   date: 2026-08-05                # publish date (YYYY-MM-DD)
   last_modified_at: 2026-08-05    # bump on substantial edits
   ---
   ```

3. **Write the body** following the note conventions in §5.

4. **Register the note** in `_data/site_index.yml`, inside the right **topic
   group**, so it shows on the homepage and in the side menu. Add it **in the
   reading order you want**:
   ```yaml
   - title: "استقرای ریاضی"          # the group supplies the topic name
     summary: "یک جملهٔ کوتاه دربارهٔ این موضوع."   # optional, homepage only
     items:
       - title: "عنوان یادداشت"                    # short title, NO topic prefix
         path: "topic-dir/kebab-case-name"         # NO leading slash, NO .md
   ```
   Item titles are **prefix-free** (`"مسئله‌ی قرص‌ها"`, not `"تقارن؛ مسئله‌ی قرص‌ها"`) —
   the group heading already says the topic. The front-matter `title` may keep the
   prefix; it feeds `<title>`/SEO, where the extra context helps.
   Paths here carry no trailing slash, but pages are served at `/topic-dir/name/`
   (`permalink: pretty`), so every template appends one when it builds an href.
   Follow that when adding a link: `{{ item.path | append: '/' | relative_url }}`.

   **A note not listed here is invisible on the site** (though the URL still works
   once built). An unlisted draft is still built and would otherwise appear in
   `sitemap.xml`, so give it `sitemap: false` in its front matter until it is ready —
   that also makes the layout emit `noindex`. Example of an existing unlisted draft:
   `problem-solving/recasting/putnam-icosahedron-problem.md`.

   To start a brand-new group, add a top-level entry with `title` + `items`.
   Grouping is presentational: a note's group does **not** have to match its
   directory (e.g. `trigonometry/double-angle-formula-cosine` is listed under
   «تغییر نگاه به مسئله»).

5. **New topic directory?** Add its path to `scripts/prerender-whitelist.json`
   (e.g. `"number-theory"` or `"problem-solving/invariants"`), otherwise pages
   under it are served un-prerendered (math renders in-browser with a small
   delay). Files added under an already-listed directory are picked up
   automatically.

   Do **not** add `redirect_from` to a new note. That front matter exists only on
   notes written before Aug 2026, when the site served `/topic/name.html`; it
   emits a stub at the old URL so the move doesn't 404. A new note has no old URL
   to redirect from. See the SEO section of `PROJECT_NOTES.md`.

6. **Verify locally:** `make dev`, open `http://localhost:4000`, confirm the note
   appears under the right group, the math renders, and RTL/images look right.

---

## 5. Series (mini-courses)

Some topics are not a bag of independent notes but an **ordered sequence**. Mark
the group `series: true` and give it a `path`, and the site does the rest: the
notes are numbered, each one gets a breadcrumb («اعداد مختلط · برگهٔ ۳ از ۵») and
previous/next links, and the homepage frames the group as one unit with a link to
its landing page.

**Wording rule:** the Persian UI never calls it a دوره (course) and never calls a
note a درس (lesson) — the reader only ever sees numbered **برگه‌ها**. «Series» /
«mini-course» is internal vocabulary for this guide and the code, not for the
site. Keep new copy in that register.

`complex-numbers/` is the reference implementation. To build another one:

1. **Mark the group** in `_data/site_index.yml`. Give every item a `summary` —
   one line, shown on the landing page:
   ```yaml
   - title: "اعداد مختلط"
     path: "complex-numbers"      # the landing page, no leading slash
     series: true
     summary: "یک جملهٔ کوتاه دربارهٔ کل مجموعه."
     items:
       - title: "آشنایی کوتاه با اعداد مختلط"
         path: "complex-numbers/introduction"
         summary: "یک جملهٔ کوتاه دربارهٔ این برگه."
   ```

2. **Write the landing page** at `<topic-dir>/index.md` — the cover: the question
   the sequence answers, the thread running through it, prerequisites, the
   generated «فهرست برگه‌ها», and where it leads next. Copy the structure of
   `complex-numbers/index.md`.

3. **Drop the topic prefix from each note's H1.** The breadcrumb above the title
   already names the topic, so `# توان‌ها و ریشه‌های واحد` — not
   `# اعداد مختلط؛ توان‌ها و ریشه‌های واحد`. Leave the front-matter `title` alone.

**Raw HTML inside a note is fragile.** The generated note list is an HTML block
in a Markdown file, and Kramdown is picky: the opening tag must start at column 0
on its own line, no line inside may be indented 4+ spaces (Kramdown turns it into
a code block), and Liquid whitespace trimming (the hyphenated tag delimiters)
must not glue the opening tag onto the previous line. If a block silently renders
as escaped text, this is why.

Note that `AGENTS.md`, `README.md` and `PROJECT_NOTES.md` are themselves rendered
by Jekyll, so a literal Liquid tag written in their prose will break the build.

---

## 6. Note writing conventions (match the house style)

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

**Purpose first**
- Before adding any section or paragraph, name its job in one sentence — «هر
  بخشی اضافه می‌کنیم اول بپرسیم هدفش چیست؟ بعد بنویسیم.» If the job is unclear,
  or already done elsewhere, cut instead of polishing. A series landing page has
  exactly one goal: get the reader into برگهٔ ۱ — end it on that link.

**Complexity has a cost**
- Every complex paragraph makes a note more complete, but it charges a price:
  it takes the reader's focus and occupies their mind. Only pay that price with
  a firm purpose. When a precise formulation or full proof mainly serves the
  deeper reader, don't inline it: state the claim briefly (one precise remark,
  perhaps with a hint), and leave the rest to the curious reader or a separate
  note. The core idea of the برگه must stay visible and the prose fluent.
- Corner cases come *after* the core, never in its path. Caveats and edge
  cases (degenerate values, uniqueness fine print, …) go at the end of the
  section — or in a short passage before the next one — not between the main
  idea and its development. First let the reader see the principle; then
  notify them of the fine print.

**No spoilers in series copy**
- Landing pages and TOC blurbs motivate with the question and the value; they
  never reveal a note's punchline or mechanism — «پرسش و ارزش را بگو، جواب و
  مکانیزم را نگه دار.» Naming a payoff («اتحادها خودشان بیرون می‌افتند») is
  fine; showing *how* is not. Don't use «لو دادن» in reader-facing copy; prefer
  phrasing like «باقی را باید سرِ راه دید».

**Never cut the author's prose silently**
- Trimming redundant copy is welcome, but every removed or replaced passage
  must be listed explicitly when reporting the work, along with the job it was
  doing (or failing to do). The notes are the product and the voice is the
  author's — a change he can't see is a change he can't judge.

**Math** (KaTeX via Kramdown)
- Inline: `$ ... $`  ·  Display: `$$ ... $$` on their own lines.
- Standard LaTeX. Persian text and LaTeX mix freely on a line.
- **Never put Persian inside a formula** (e.g. `\text{ثابت}`): KaTeX has no
  metrics for Persian glyphs and renders broken gray boxes. Keep the Persian
  words outside the math (`$y < m$ و $z < m$`) or use a symbol (`= c`).
- Avoid escaping `*` as `\*` inside math — Kramdown leaves it as `\*` in
  `$$ ... $$` blocks and KaTeX fails on it. Write `z^{\ast}` instead.
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

**Active learning (the series template)**
Every series برگه follows this pattern (see any `complex-numbers/*.md`):
- One guess-first box mid-note:
  `<div class="pause" markdown="1">` containing
  `**پیش از ادامه، حدس بزنید.** …` and (optionally) a collapsible answer.
- A `## تمرین‌ها` section before جمع‌بندی: a ramp from consolidation to
  one transfer problem deliberately *not* isomorphic to the worked
  examples. Each exercise carries a role label after its number
  (`**تمرین ۱ — تثبیتِ ایده.**`, …, `**تمرین ۶ — پیشرفته، مناسبِ
  دانشجویان.**`) and unfolds in three staged boxes — small hint, main
  idea, full solution. The `reveal-step` class hides each later box until
  the previous one has been opened once (wired in `_layouts/default.html`;
  without JS all boxes simply show):
  ```html
  <details class="exercise reveal-step" markdown="1">
  <summary>راهنمای کوچک</summary>

  …
  </details>

  <details class="exercise reveal-step" markdown="1">
  <summary>ایدهٔ اصلی</summary>

  …
  </details>

  <details class="exercise reveal-step" markdown="1">
  <summary>راه‌حلِ کامل</summary>

  …markdown + math…

  </details>
  ```
  Standalone answer boxes (the guess box, optional asides) keep a single
  `<details class="exercise" markdown="1">` with `<summary>پاسخ</summary>`.
- After the جمع‌بندی bullets, a one-paragraph `**اکنون باید بتوانید…**`
  can-do list (skills, not topics).
- Figures get a one-line caption right after the image block:
  `<p class="fig-caption">…</p>`. Diagrams label their axes Re/Im.
- Interactive labs are `.lab` divs (`data-lab="multiply" | "roots" | "orbit"`)
  powered by self-hosted `assets/js/complex-labs.js` + one
  `<script defer>` tag per page. The prerender bakes post-JS DOM and canvas
  pixels are not serialized, so lab code must re-initialize on every load
  and must not persist state in DOM attributes.
Remember the column-0 rule for all this raw HTML (§5), and that complexity
has a cost — keep every box short.

---

## 7. Build & run commands

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

## 8. Guardrails for agents

- **Prefer content work.** The default task is writing/editing notes. Touch
  `_layouts/`, `assets/css/`, `scripts/`, `Dockerfile`, or CI only when the task
  is explicitly about infrastructure.
- **Keep the three docs in sync.** If you change build steps or structure, update
  `README.md`, `PROJECT_NOTES.md`, and this file together.
- **Never hand-edit generated output** (`_site/`, `Gemfile.lock`,
  `node_modules/` — all gitignored).
- **Two registries must agree with reality:** every visible note is in
  `_data/site_index.yml` (inside a group); every content directory is in the
  prerender whitelist.
- **Don't hand-write course navigation.** Lesson numbers, breadcrumbs and
  previous/next links are derived from `_data/site_index.yml`. Reorder the
  `items` list; never type a "next lesson" link into a note.
- **Don't add external CDNs.** KaTeX and the font are self-hosted on purpose
  (reliability + no first-load jank). Keep new assets local.
- **Style with the tokens, not raw hex.** `assets/css/fractal.css` defines the palette
  as custom properties in `:root`; new rules should use them. And never put
  `letter-spacing` on Persian text — it breaks the letter joins.
- **Don't create `assets/css/style.css`.** That path belongs to the github-pages
  default theme and silently overwrites (or gets overwritten by) your file.
- **Verify math renders** in a local preview before considering a note done —
  it's the single most common silent failure.
- **This is a personal learning project.** When the author is "learning something
  together" with you, the goal is a clear, correct, delightful note — accuracy of
  the math matters more than speed.
