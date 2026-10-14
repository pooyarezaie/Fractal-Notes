# Complex numbers — first-sheet film

An original Persian animation of `complex-numbers/introduction.md`, using
[Grant Sanderson's original Manim engine](https://github.com/3b1b/manim),
installed as **manimgl**, with `from manimlib import *`.
The engine revision is pinned in `requirements.txt`; this is not Manim Community.
The visual approach uses moving arrows, geometric transformations, sparse
formulas and a dark background. No 3Blue1Brown footage, music, characters, or
video scripts are copied. The author’s note is the mathematical source.

## What the film covers

One number line becomes a plane; a point becomes an arrow; addition is
head-to-tail motion; multiplication rotates and scales a family of arrows;
negative multiplication becomes a half-turn. A guess-first pause leads to
the quarter-turn `i` and then `i² = −1`. A final question transfers the rule
to `(0, 2) × (0, 3) = (−6, 0)`.

The source intentionally follows the first sheet's geometry-first sequence.
It does not introduce Euler's formula or move content from later sheets into
this one. The fixed reference grid stays still while a family of arrows
undergoes the same complex multiplication.

## Install

Use Python 3.12 and an isolated environment. On Ubuntu/Debian, Manim's native
text dependency needs Cairo/Pango headers and pkg-config at install time:

```bash
sudo apt-get install ffmpeg pkg-config libcairo2-dev libpango1.0-dev python3-dev python3-venv
cd scripts/videos/complex_numbers
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.lock.txt
```

Rendering needs a working graphics backend supported by the pinned upstream
engine (including software rendering when supported by the host). This engine
revision uses wgpu. No LaTeX distribution, external font download, API key,
paid service, or network access is needed at render time. The site's existing
Vazirmatn WOFF2 is converted to a temporary TTF and registered with Pango just
for this process. Formulas use Unicode through DejaVu Sans; Persian stays
outside the formulas. Pango handles joins, ligatures and bidi.

`requirements.lock.txt` records the Python 3.12 environment used for the verified
render. `requirements.txt` lists the direct dependencies for future upgrades.

## Render

Run from the repository root with the virtual environment activated:

```bash
python scripts/videos/complex_numbers/render.py --quality preview
python scripts/videos/complex_numbers/render.py --quality final
```

- Preview: 854 × 480, 15 fps, full duration.
- Final: 1920 × 1080, 30 fps, full duration.
- `--speed 12` produces a short visual QA pass. Do not use it for delivery.
- `--script-only` exports the script, captions and chapters using Python's
  standard library, without installing Manim.

Generated files stay in `output/` (gitignored, and under the already-excluded
`scripts/` directory, so Jekyll never copies the movie or Python environment):

- `introduction.mp4`: H.264/yuv420p with Persian captions drawn in the picture,
  a separately switchable Persian subtitle track, and named chapters.
- `introduction.fa.srt`: UTF-8 subtitles for other players/editors.
- `recording-script.fa.txt`: time-coded Persian narration, written to speak.
- `chapters.json`: timeline for editing or publishing.
- `render-info.json`: resolution, duration, stream and chapter verification.

**The default video has no audio.** The narration script is ready to record;
the render does not impersonate any presenter or silently call a speech API.
Record against the full-duration picture and attach the recording:

```bash
python scripts/videos/complex_numbers/render.py --quality final --audio /path/to/narration.wav
```

The recording must match the film duration within one second. Narration audio
is encoded to AAC; the picture is copied without another lossy video encode.

## Edit and verify

`cues.json` is the single timeline for the animation, recording script, captions
and chapters. Each cue has a short visible caption and a longer spoken line.
`lesson.py` consumes those cues in order and fails if an animation overruns its
cue or if the total scene time drifts. Keep chapter names contiguous.

`render.py` checks the final H.264 format, timing and chapter count. Inspect
frames from every chapter and watch the full movie before publishing: check
Persian joins, arrow endpoints, caption readability and pauses. The exercise
uses a wider axis so the answer at −6 remains visible.

For an interactive Manim editing session:

```bash
cd scripts/videos/complex_numbers
manimgl lesson.py ComplexIntroduction --config_file custom_config.yml
```

Dependencies belong to this optional video tool; neither the site's Makefile
nor its normal publishing pipeline installs or runs them. More sheet films
can reuse the same font, caption and export helpers with their own timelines.
