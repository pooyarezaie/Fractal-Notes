# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

**➡️ Read [`AGENTS.md`](AGENTS.md) first.** It is the full agent guide: what the
project is, the tech stack, the repository map, and — most importantly — the
step-by-step workflow and style conventions for writing new math notes. This file
only adds a few Claude-Code-specific reminders on top of it.

## The one-minute version

- **Fractal Notes** is a Persian (RTL) math-education site built with Jekyll +
  self-hosted KaTeX, deployed to GitHub Pages. The **notes are the product**; the
  code just publishes them.
- **Most tasks are writing or editing `.md` notes**, not changing infrastructure.
- To add a note: create `<topic>/<name>.md` with `title` + `description` front
  matter, write it in the house style, then register it under the right topic
  group in `_data/site_index.yml` (and add the directory to
  `scripts/prerender-whitelist.json` if it's a new topic). Full checklist in
  `AGENTS.md` §4.
- Notes are grouped by topic, and a group can be a **series** — an ordered
  mini-course with a landing page and automatic previous/next navigation
  (`complex-numbers/` is the example). Never hand-write those links; they come
  from `_data/site_index.yml`. See `AGENTS.md` §5.

## Working here as Claude Code

- **Preview before finishing.** After editing a note, run `make dev` and confirm
  at `http://localhost:4000` that it lists correctly, the math renders, and RTL +
  images look right. Broken math delimiters fail silently — always check.
- **Don't run heavy build/install steps unprompted.** `make install-deps`,
  `make build-prerender`, and Docker commands are slow; only run them when the
  task calls for it. For routine note edits, `make dev` is enough.
- **Never edit generated/ignored files:** `_site/`, `Gemfile.lock`,
  `node_modules/`.
- **Keep docs in sync.** If you change how the site is built or structured, update
  `README.md`, `PROJECT_NOTES.md`, and `AGENTS.md` together.
- **Math correctness first.** This is a learning project — when drafting a note,
  get the mathematics right and the explanation intuitive before optimizing
  anything else.

## Quick reference

```bash
make dev              # Local server + livereload (day-to-day)
make build            # Build to _site/
make build-prerender  # Full pipeline (build + prerender)
make help             # All commands
```

Key files: `_data/site_index.yml` (note list), `scripts/prerender-whitelist.json`
(prerendered dirs), `_layouts/default.html` (only layout),
`assets/css/fractal.css` (all styling).
