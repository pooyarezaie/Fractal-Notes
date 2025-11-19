# Project Notes - Fractal Notes

## Project Summary

**Fractal Notes** is a Persian-language mathematical educational website built with Jekyll and hosted on GitHub Pages. The site presents intuitive mathematical notes with a focus on geometric and visual explanations.

## Key Technical Details

### Jekyll Configuration
- **Markdown Engine**: Kramdown with MathJax support
- **Math Rendering**: MathJax 3 (via CDN)
- **Layout**: Single default layout (`_layouts/default.html`)
- **Math Delimiters**: 
  - Inline: `$...$`
  - Display: `$$...$$`

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
- `github-pages` gem (includes Jekyll and all necessary plugins)

## Content Themes

1. **Complex Numbers**: Geometric approach to complex numbers, emphasizing:
   - Vector representation
   - Addition as vector addition
   - Multiplication as rotation + scaling
   - The imaginary unit $i$ as 90° rotation

2. **Problem Solving - Symmetry**: Demonstrates how adding ambiguity can create symmetry to solve problems, using the "pill problem" as an example.

## Development Workflow

1. Edit markdown files in root or subdirectories
2. Add images to `assets/img/`
3. Test locally with `bundle exec jekyll serve`
4. Push to GitHub (auto-deploys via GitHub Pages)
