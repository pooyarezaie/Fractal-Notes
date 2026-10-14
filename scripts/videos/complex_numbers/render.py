#!/usr/bin/env python3
"""Render the lesson, its accessible subtitles, chapters and recording script."""
from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "output"


def timestamp(seconds, srt=False):
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3600000)
    minutes, millis = divmod(millis, 60000)
    whole, millis = divmod(millis, 1000)
    return f"{hours:02}:{minutes:02}:{whole:02}{',' if srt else '.'}{millis:03}"


def load_cues():
    cues = json.loads((HERE / "cues.json").read_text(encoding="utf-8"))
    seen = set()
    for cue in cues:
        if cue["id"] in seen:
            raise ValueError(f"Duplicate cue: {cue['id']}")
        seen.add(cue["id"])
        if not isinstance(cue["duration"], (int, float)) or cue["duration"] <= 0:
            raise ValueError(f"Invalid duration: {cue['id']}")
        for key in ("chapter", "caption", "narration"):
            if not isinstance(cue[key], str) or not cue[key].strip():
                raise ValueError(f"Missing {key}: {cue['id']}")
    return cues


def export_companions(cues, speed):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    subtitles = []
    recording = ["Persian recording script — first complex-numbers sheet",
                 "Record against the normal-speed picture. Times mark cue boundaries.",
                 "Captions are concise; narration expands the same idea.", ""]
    chapters = []
    cursor = 0.0
    for index, cue in enumerate(cues, 1):
        end = cursor + cue["duration"] / speed
        subtitles.append(f"{index}\n{timestamp(cursor, True)} --> {timestamp(end, True)}\n{cue['caption']}\n")
        recording.extend([f"[{timestamp(cursor)} – {timestamp(end)}] {cue['id']}",
                          cue["narration"], ""])
        if not chapters or chapters[-1]["title"] != cue["chapter"]:
            if chapters:
                chapters[-1]["end"] = cursor
            chapters.append({"title": cue["chapter"], "start": cursor, "end": end})
        else:
            chapters[-1]["end"] = end
        cursor = end
    (OUTPUT / "introduction.fa.srt").write_text("\n".join(subtitles), encoding="utf-8")
    (OUTPUT / "recording-script.fa.txt").write_text("\n".join(recording), encoding="utf-8")
    (OUTPUT / "chapters.json").write_text(json.dumps(chapters, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    metadata = [";FFMETADATA1", "title=آشنایی کوتاه با اعداد مختلط",
                "artist=Fractal Notes", "comment=Original animation using github.com/3b1b/manim"]
    for chapter in chapters:
        title = chapter["title"].replace("\\", "\\\\").replace("=", "\\=").replace(";", "\\;").replace("#", "\\#")
        metadata.extend(["[CHAPTER]", "TIMEBASE=1/1000",
                         f"START={round(chapter['start']*1000)}",
                         f"END={round(chapter['end']*1000)}", f"title={title}"])
    (OUTPUT / "chapters.ffmeta").write_text("\n".join(metadata)+"\n", encoding="utf-8")
    return cursor


def probe(path):
    result = subprocess.run(["ffprobe", "-v", "error", "-show_format", "-show_streams",
                             "-show_chapters", "-of", "json", str(path)],
                            check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quality", choices=["preview", "final"], default="preview")
    parser.add_argument("--speed", type=float, default=1,
                        help="Accelerate all cues for visual QA; final delivery uses 1")
    parser.add_argument("--audio", type=Path, help="Optional recorded narration, aligned to this timeline")
    parser.add_argument("--script-only", action="store_true", help="Export captions and recording text without Manim")
    args = parser.parse_args()
    if not math.isfinite(args.speed) or not 0.25 <= args.speed <= 12:
        parser.error("--speed must be a finite number between 0.25 and 12")
    if args.audio and not args.audio.is_file():
        parser.error("--audio must name an existing recording")
    if args.audio and args.speed != 1:
        parser.error("Use normal speed when attaching recorded narration")
    for tool in ([] if args.script_only else ["ffmpeg", "ffprobe", "manimgl"]):
        if shutil.which(tool) is None:
            parser.error(f"{tool} is missing; see README.md beside this script")
    cues = load_cues()
    total = export_companions(cues, args.speed)
    if args.script_only:
        print(f"Exported {len(cues)} cues, {total:g} seconds, to {OUTPUT}")
        return
    if args.audio:
        audio_info = probe(args.audio.resolve())
        if not any(stream["codec_type"] == "audio" for stream in audio_info["streams"]):
            parser.error("The recording has no audio stream")
        length = float(audio_info["format"]["duration"])
        if abs(length - total) > 1:
            parser.error(f"Recording must match the {total:g}-second timeline (got {length:g}s)")
    resolution, fps = ("854x480", 15) if args.quality == "preview" else ("1920x1080", 30)
    raw_dir = OUTPUT / "raw"
    env = dict(os.environ, FRACTAL_VIDEO_SPEED=str(args.speed))
    subprocess.run(["manimgl", str(HERE / "lesson.py"), "ComplexIntroduction", "-w",
                    "--config_file", str(HERE / "custom_config.yml"),
                    "--video_dir", str(raw_dir), "--file_name", "introduction-raw",
                    "-r", resolution, "--fps", str(fps)],
                   cwd=HERE, env=env, check=True)
    candidates = list(raw_dir.rglob("introduction-raw.mp4"))
    if len(candidates) != 1:
        raise RuntimeError(f"Expected one raw video, found {candidates}")
    raw = candidates[0]
    raw_info = probe(raw)
    actual = float(raw_info["format"]["duration"])
    if abs(actual - total) > max(.3, len(cues) / fps):
        raise RuntimeError(f"Rendered timeline drifted: expected {total:.3f}s, got {actual:.3f}s")
    destination = OUTPUT / "introduction.mp4"
    command = ["ffmpeg", "-y", "-v", "warning", "-i", str(raw),
               "-i", str(OUTPUT / "chapters.ffmeta"),
               "-i", str(OUTPUT / "introduction.fa.srt")]
    if args.audio:
        command += ["-i", str(args.audio.resolve())]
    command += ["-map", "0:v:0", "-map", "2:0", "-map_metadata", "1",
                "-map_chapters", "1", "-c:v", "copy", "-c:s", "mov_text",
                "-metadata:s:s:0", "language=fas", "-disposition:s:0", "0"]
    if args.audio:
        command += ["-map", "3:a:0", "-c:a", "aac", "-b:a", "192k",
                    "-af", f"apad,atrim=duration={total}"]
    command += ["-t", str(total), "-movflags", "+faststart", str(destination)]
    subprocess.run(command, check=True)
    info = probe(destination)
    video = next(stream for stream in info["streams"] if stream["codec_type"] == "video")
    if video["codec_name"] != "h264" or video["pix_fmt"] != "yuv420p":
        raise RuntimeError("Expected broadly compatible H.264/yuv420p output")
    if len(info["chapters"]) != len({cue['chapter'] for cue in cues}):
        raise RuntimeError("Chapter metadata is incomplete")
    (OUTPUT / "render-info.json").write_text(json.dumps({
        "quality": args.quality, "speed": args.speed, "expected_duration": total,
        "has_narration": bool(args.audio), "probe": info,
    }, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(f"Rendered {destination} ({video['width']}×{video['height']}, {total:g}s)")


if __name__ == "__main__":
    main()
