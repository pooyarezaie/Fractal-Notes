"""Geometric introduction, using Grant Sanderson's original manimlib API.

Each beat consumes one cue from cues.json. Scene time and subtitle time share
that source of truth; animations must fit inside their cue's duration.
Persian text is shaped by Pango with the site's own Vazirmatn font.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import manimpango
from fontTools.ttLib import TTFont
from manimlib import *

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CUES = json.loads((HERE / "cues.json").read_text(encoding="utf-8"))
BY_ID = {cue["id"]: cue for cue in CUES}
BLUE = "#58c4dd"
GOLD = "#f5cb72"
GREEN = "#83c167"
VIOLET = "#b69be4"
INK = "#edf0f7"
MUTED = "#94a0b8"
GRID = "#30394c"
ORIGIN = np.array([-2.1, -0.15, 0.0])
UNIT = 0.72


def register_site_font():
    """Convert the existing WOFF2 locally; never install a system font."""
    target = HERE / "output" / "Vazirmatn.ttf"
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        font = TTFont(ROOT / "assets/fonts/Vazirmatn-wght.woff2")
        font.flavor = None
        font.save(target)
    if not manimpango.register_font(str(target)):
        raise RuntimeError("Pango could not register the site's Vazirmatn font")


def fa(text, size=32, color=INK, max_width=None):
    # Fade the entire shaped string; drawing individual glyphs would break
    # the reading rhythm and ligatures of Persian script.
    mob = Text(text, font="Vazirmatn", font_size=size, color=color,
               alignment="CENTER")
    if max_width is not None and mob.get_width() > max_width:
        mob.set_width(max_width)
    return mob


def math_label(text, size=34, color=INK):
    # These elementary formulas use real Unicode math glyphs through Pango,
    # avoiding a heavyweight TeX install and keeping Persian out of formulas.
    return Text(text, font="DejaVu Sans", font_size=size, color=color)


def point(x, y):
    return ORIGIN + UNIT * np.array([x, y, 0.0])


def arrow(x, y, color=BLUE, start=None):
    anchor = ORIGIN if start is None else start
    return Arrow(anchor, anchor + UNIT * np.array([x, y, 0.0]),
                 buff=0, stroke_width=5, color=color)


class ComplexIntroduction(Scene):
    def construct(self):
        register_site_font()
        self.speed = float(os.environ.get("FRACTAL_VIDEO_SPEED", "1"))
        self.cue_index = 0
        self.caption = None
        self.heading = None
        self.brand = fa("یادداشت‌های فرکتالی", 20, MUTED).to_corner(UL, buff=0.38)
        self.divider = Line([-6.7, -2.88, 0], [6.7, -2.88, 0],
                            color=GRID, stroke_width=1)
        self.add(self.brand, self.divider)
        self.opening()
        self.numbers_in_plane()
        self.addition()
        self.multiplication()
        self.negative_numbers()
        self.imaginary_unit()
        self.exercise()
        self.recap()
        if self.cue_index != len(CUES):
            raise RuntimeError("Not all narration cues were consumed")
        expected = sum(cue["duration"] for cue in CUES) / self.speed
        if abs(self.time - expected) > 0.1:
            raise RuntimeError(f"Timeline drift: {self.time:.3f}, expected {expected:.3f}")

    def animate(self, *animations, seconds=1.5, **kwargs):
        self.play(*animations, run_time=seconds / self.speed, **kwargs)

    def beat(self, cue_id, action=lambda: None):
        cue = BY_ID[cue_id]
        if CUES[self.cue_index]["id"] != cue_id:
            raise RuntimeError(f"Cue out of order: {cue_id}")
        self.cue_index += 1
        if self.caption is not None:
            self.remove(self.caption)
        self.caption = fa(cue["caption"], 28, INK, max_width=12.7)
        self.caption.move_to([0, -3.42, 0])
        self.add(self.caption)
        if self.heading is None or cue["chapter"] != self.chapter:
            if self.heading is not None:
                self.remove(self.heading)
            self.chapter = cue["chapter"]
            self.heading = fa(self.chapter, 32, INK, max_width=8.5)
            self.heading.to_corner(UR, buff=0.38)
            self.add(self.heading)
        action()
        # Aim at absolute cue boundaries so sub-frame rounding does not
        # accumulate across the accelerated QA pass.
        target_time = sum(c["duration"] for c in CUES[:self.cue_index]) / self.speed
        remaining = target_time - self.time
        if remaining < -0.01:
            raise RuntimeError(f"Animation exceeds cue {cue_id} by {-remaining:.2f}s")
        if remaining > 0:
            self.wait(max(remaining - 1e-7, 1e-8))

    def clear_content(self):
        keep = [self.brand, self.divider, self.caption, self.heading]
        self.remove(*[mob for mob in self.mobjects if all(mob is not k for k in keep)])

    def plane(self, x_radius=4, y_radius=3, x_right=None):
        x_right = x_radius if x_right is None else x_right
        grid = VGroup()
        for x in range(-x_radius, x_right + 1):
            grid.add(Line(point(x, -y_radius), point(x, y_radius),
                          color=GRID, stroke_width=1))
        for y in range(-y_radius, y_radius + 1):
            grid.add(Line(point(-x_radius, y), point(x_right, y),
                          color=GRID, stroke_width=1))
        axes = VGroup(
            Arrow(point(-x_radius - .2, 0), point(x_right + .3, 0),
                  buff=0, color=MUTED, stroke_width=2),
            Arrow(point(0, -y_radius - .2), point(0, y_radius + .3),
                  buff=0, color=MUTED, stroke_width=2),
        )
        labels = VGroup(
            math_label("Re", 24, MUTED).next_to(axes[0].get_end(), RIGHT, buff=.1),
            math_label("Im", 24, MUTED).next_to(axes[1].get_end(), UP, buff=.1),
            math_label("0", 22, MUTED).next_to(ORIGIN, DL, buff=.12),
        )
        for x in range(-x_radius, x_right + 1):
            if x != 0:
                labels.add(math_label(str(x).replace("-", "−"), 19, MUTED)
                           .move_to(point(x, -.3)))
        return VGroup(grid, axes, labels)

    def panel(self, *rows):
        group = VGroup(*rows).arrange(DOWN, buff=.4)
        if group.get_width() > 4.1:
            group.set_width(4.1)
        group.move_to([4.1, .15, 0])
        return group

    def opening(self):
        title = fa("عددها، بیرون از خط", 64, INK, max_width=10.5).move_to([0, 1.45, 0])
        subtitle = fa("آشنایی کوتاه با اعداد مختلط", 34, VIOLET).move_to([0, .45, 0])
        line = Line([-4.3, -.8, 0], [4.3, -.8, 0], color=MUTED)
        dots = VGroup(*[Dot([x, -.8, 0], color=BLUE, radius=.055)
                        for x in range(-4, 5)])
        self.beat("opening-question", lambda: self.animate(
            FadeIn(title), FadeIn(subtitle), ShowCreation(line), FadeIn(dots), seconds=2))
        field = VGroup(*[Dot([x, y - .8, 0], color=VIOLET, radius=.04)
                         for x in range(-4, 5) for y in [-1, 1]])
        self.beat("opening-promise", lambda: self.animate(
            LaggedStart(*[FadeIn(dot) for dot in field], lag_ratio=.06), seconds=3))

    def numbers_in_plane(self):
        self.clear_content()
        plane = self.plane()
        dot = Dot(point(3, 2), color=BLUE, radius=.08)
        horizontal = DashedLine(ORIGIN, point(3, 0), color=GOLD)
        vertical = DashedLine(point(3, 0), point(3, 2), color=VIOLET)
        label = math_label("z = (3, 2)", 40, BLUE).move_to([4.1, 1.4, 0])
        self.beat("point", lambda: self.animate(FadeIn(plane),
            ShowCreation(horizontal), ShowCreation(vertical), FadeIn(dot), FadeIn(label), seconds=3))
        vector = arrow(3, 2)
        self.beat("vector", lambda: self.animate(GrowArrow(vector), seconds=2))
        real = arrow(3, 0, GOLD)
        parts = self.panel(fa("قسمت حقیقی: افقی", 28, GOLD),
                           fa("قسمت موهومی: عمودی", 28, VIOLET),
                           math_label("3 = (3, 0)", 32, GOLD))
        self.beat("real-axis", lambda: self.animate(FadeOut(label), FadeIn(parts),
            GrowArrow(real), seconds=2.5))

    def addition(self):
        self.clear_content()
        self.add(self.plane())
        a = arrow(2, 1, BLUE)
        b = arrow(1, 2, GOLD)
        label_a = math_label("z₁", 28, BLUE).next_to(point(2, 1), DR, buff=.1)
        label_b = math_label("z₂", 28, GOLD).next_to(point(1, 2), UL, buff=.1)
        inputs = self.panel(math_label("z₁ = (2, 1)", 32, BLUE),
                            math_label("z₂ = (1, 2)", 32, GOLD))
        self.beat("addition-start", lambda: self.animate(
            GrowArrow(a), GrowArrow(b), FadeIn(inputs), FadeIn(label_a), FadeIn(label_b), seconds=2))
        ghost = b.copy().set_opacity(.22)
        self.add(ghost)
        self.beat("addition-shift", lambda: self.animate(
            b.animate.shift(point(2, 1) - ORIGIN),
            label_b.animate.shift(point(2, 1) - ORIGIN), seconds=3))
        result = arrow(3, 3, GREEN)
        result_label = math_label("z₁ + z₂", 27, GREEN).next_to(point(3, 3), RIGHT, buff=.1)
        self.beat("addition-result", lambda: self.animate(
            GrowArrow(result), FadeIn(result_label), seconds=2))
        rule = self.panel(math_label("(2, 1) + (1, 2)", 29),
                          math_label("= (3, 3)", 42, GREEN),
                          fa("جمعِ دو حرکت", 32, GREEN))
        self.beat("addition-rule", lambda: self.animate(
            FadeOut(inputs), FadeIn(rule), seconds=1.5))

    def multiplication(self):
        self.clear_content()
        self.add(self.plane())
        theta = PI / 6
        z_coords = (1.5 * np.cos(theta), 1.5 * np.sin(theta))
        z = arrow(*z_coords, BLUE)
        one = arrow(1, 0, GOLD)
        sample = VGroup(arrow(-1, 1, VIOLET), arrow(-1.6, -1, MUTED),
                        arrow(1, -1.5, GREEN))
        moving = VGroup(z, one, sample)
        z_label = math_label("z", 28, BLUE).next_to(z.get_end(), UP, buff=.12)
        question = self.panel(fa("یک حرکت برای کل صفحه", 30),
                              math_label("1 × w = w", 38, GOLD))
        self.beat("multiply-question", lambda: self.animate(
            GrowArrow(z), GrowArrow(one), FadeIn(sample), FadeIn(z_label), FadeIn(question), seconds=2))
        w = arrow(2 * np.cos(theta), 2 * np.sin(theta), GOLD).set_opacity(.3)
        w_label = math_label("w", 28, GOLD).next_to(w.get_end(), RIGHT, buff=.12)
        spec = self.panel(math_label("|w| = 2", 36, GOLD),
                          math_label("θw = 30°", 36, GOLD),
                          math_label("|z| = 1.5", 29, BLUE),
                          math_label("θz = 30°", 29, BLUE))
        self.beat("multiply-anchor", lambda: self.animate(
            FadeOut(question), FadeIn(spec), FadeIn(w), FadeIn(w_label), seconds=2))
        rotation_arc = Arc(radius=UNIT * .95, start_angle=theta,
                           angle=theta, arc_center=ORIGIN, color=BLUE, stroke_width=3)
        self.beat("multiply-rotate", lambda: self.animate(
            Rotate(moving, theta, about_point=ORIGIN), ShowCreation(rotation_arc),
            FadeOut(z_label), seconds=3))
        final_spec = self.panel(math_label("|zw| = 1.5 × 2", 28, BLUE),
                                math_label("= 3", 40, BLUE),
                                math_label("θzw = 30° + 30°", 28, GOLD),
                                math_label("= 60°", 40, GOLD))
        self.beat("multiply-scale", lambda: self.animate(
            moving.animate.scale(2, about_point=ORIGIN),
            FadeOut(spec), FadeIn(final_spec), seconds=3))
        final_label = math_label("zw", 28, BLUE).next_to(point(1.5, 3*np.sqrt(3)/2), UP, buff=.1)
        # Every moving arrow is transformed by the same z -> w*z map. The
        # fixed grid remains a reference so the rotation is actually visible.
        rule = self.panel(fa("طول‌ها: ضرب", 35, BLUE),
                          fa("زاویه‌ها: جمع", 35, GOLD),
                          math_label("0 × z = 0", 25, MUTED))
        self.beat("multiply-rule", lambda: self.animate(
            FadeOut(final_spec), FadeIn(rule), FadeIn(final_label), seconds=2))

    def negative_numbers(self):
        self.clear_content()
        self.add(self.plane())
        vector = arrow(2, 0, BLUE)
        ghost = vector.copy().set_opacity(.2)
        self.add(vector, ghost)
        half_turn = Arc(radius=UNIT*1.3, angle=PI, arc_center=ORIGIN,
                        color=GOLD, stroke_width=3)
        rule = self.panel(math_label("2 × (−1) = −2", 32, GOLD),
                          fa("نیم‌دور", 40, GOLD))
        self.beat("negative-once", lambda: self.animate(
            Rotate(vector, PI, about_point=ORIGIN), ShowCreation(half_turn), FadeIn(rule), seconds=3))
        full_turn = Arc(radius=UNIT*1.3, start_angle=PI, angle=PI,
                        arc_center=ORIGIN, color=GREEN, stroke_width=3)
        answer = self.panel(math_label("(−2) × (−1) = 2", 32, GREEN),
                            fa("یک دور کامل", 36, GREEN))
        self.beat("negative-twice", lambda: self.animate(
            Rotate(vector, PI, about_point=ORIGIN), ShowCreation(full_turn),
            FadeOut(rule), FadeIn(answer), seconds=3))

    def imaginary_unit(self):
        self.clear_content()
        self.add(self.plane())
        circle = Circle(radius=UNIT, color=GRID, stroke_width=2).move_to(ORIGIN)
        question = self.panel(math_label("| ? | = 1", 40, GOLD),
                              math_label("θ = 90°", 40, GOLD), fa("کدام عدد؟", 38))
        self.beat("guess", lambda: self.animate(FadeIn(circle), FadeIn(question), seconds=1.5))
        i_dot = Dot(point(0, 1), radius=.07, color=VIOLET)
        i_label = math_label("i", 32, VIOLET).next_to(point(0, 1), UL, buff=.12)
        definition = self.panel(math_label("i = (0, 1)", 42, VIOLET),
                                fa("فقط یک‌چهارم دور", 30, VIOLET))
        self.beat("i-answer", lambda: self.animate(
            FadeOut(question), FadeIn(definition), FadeIn(i_dot), FadeIn(i_label), seconds=2))
        vector = arrow(1, 0, BLUE)
        one_label = math_label("1", 27, BLUE).next_to(point(1, 0), DOWN, buff=.15)
        self.add(vector, one_label)
        first_arc = Arc(radius=UNIT*1.6, angle=PI/2, arc_center=ORIGIN,
                        color=BLUE, stroke_width=3)
        first = self.panel(math_label("1 × i = i", 42, BLUE), math_label("90°", 34, BLUE))
        self.beat("i-first-turn", lambda: self.animate(
            Rotate(vector, PI/2, about_point=ORIGIN), ShowCreation(first_arc),
            FadeOut(definition), FadeIn(first), seconds=3))
        second_arc = Arc(radius=UNIT*1.6, start_angle=PI/2, angle=PI/2,
                         arc_center=ORIGIN, color=GOLD, stroke_width=3)
        minus_label = math_label("−1", 27, GOLD).next_to(point(-1, 0), DOWN, buff=.15)
        second = self.panel(math_label("i × i = −1", 42, GOLD), math_label("90° + 90°", 30, GOLD))
        self.beat("i-second-turn", lambda: self.animate(
            Rotate(vector, PI/2, about_point=ORIGIN), ShowCreation(second_arc),
            FadeIn(minus_label), FadeOut(first), FadeIn(second), seconds=3))
        square = self.panel(math_label("i² = −1", 64, GOLD),
                            fa("دو یک‌چهارم دور", 30), math_label("180°", 35, GOLD))
        self.beat("i-square", lambda: self.animate(
            FadeOut(second), FadeIn(square, scale=.9), seconds=2))

    def exercise(self):
        self.clear_content()
        # A wider domain is necessary: the answer -6 must stay on screen.
        self.add(self.plane(x_radius=6, x_right=3))
        a = arrow(0, 2, BLUE)
        b = arrow(0, 3, GOLD)
        inputs = self.panel(math_label("(0, 2) × (0, 3)", 35),
                            fa("اول جهت را حدس بزنید", 28, GOLD))
        self.beat("exercise-guess", lambda: self.animate(
            GrowArrow(b), GrowArrow(a), FadeIn(inputs), seconds=2))
        result = arrow(-6, 0, GREEN)
        answer = self.panel(math_label("2 × 3 = 6", 34, GREEN),
                            math_label("90° + 90° = 180°", 27, GOLD),
                            math_label("(−6, 0)", 46, GREEN))
        self.beat("exercise-answer", lambda: self.animate(
            GrowArrow(result), FadeOut(inputs), FadeIn(answer), seconds=3))

    def recap(self):
        self.clear_content()
        summary = VGroup(fa("جمع: دنبال کردنِ دو حرکت", 40, BLUE),
                         fa("ضرب: دوران و کشش", 40, GOLD),
                         math_label("i² = −1", 55, VIOLET),
                         fa("برگه‌هایی برای دیدن", 30, MUTED),
                         math_label("fractalnotes.com", 25, MUTED)).arrange(DOWN, buff=.4)
        summary.move_to([0, .15, 0])
        self.beat("recap", lambda: self.animate(
            LaggedStart(*[FadeIn(row, shift=UP*.1) for row in summary], lag_ratio=.2), seconds=3))
