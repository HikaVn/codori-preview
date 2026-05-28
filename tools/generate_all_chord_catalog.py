#!/usr/bin/env python3
from __future__ import annotations

import json
from itertools import product
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DATA = ROOT / "assets/app/data/all-main-chords.json"
OUT_SVG_DIR = ROOT / "assets/app/fingering/all-main-chords"

NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
NOTE_TO_PC = {name: index for index, name in enumerate(NOTE_NAMES)}
PC_TO_NOTE = {index: name for index, name in enumerate(NOTE_NAMES)}
STRING_NAMES = ["G", "C", "E", "A"]
OPEN_PITCHES = [67, 60, 64, 69]
OPEN_PCS = [pitch % 12 for pitch in OPEN_PITCHES]

FAMILIES = [
    {
        "family": "Major",
        "suffix": "",
        "intervals": [0, 4, 7],
        "required": [0, 4, 7],
        "character_asset": "assets/approved/characters/major.png",
        "learning_note": "ほっと帰れる明るさ",
        "hint": "{name}は、Majorアクションの安心した響き。コード名と運指で、明るい基準の場所を覚えよう。",
    },
    {
        "family": "minor",
        "suffix": "m",
        "intervals": [0, 3, 7],
        "required": [0, 3, 7],
        "character_asset": "assets/approved/characters/major.png",
        "learning_note": "静かに寄り添う",
        "hint": "{name}は、minorアクションの静かな響き。Majorより少し内側へ向かう感じを覚えよう。",
    },
    {
        "family": "7",
        "suffix": "7",
        "intervals": [0, 4, 7, 10],
        "required": [0, 4, 10],
        "character_asset": "assets/approved/characters/major.png",
        "learning_note": "次へ進みたくなる",
        "hint": "{name}は、7アクションが次へ案内する音。少しそわっと進む感じを覚えよう。",
    },
    {
        "family": "add9",
        "suffix": "add9",
        "intervals": [0, 2, 4, 7],
        "required": [0, 2, 4],
        "character_asset": "assets/approved/characters/major.png",
        "learning_note": "空気がふわっと広がる",
        "hint": "{name}は、add9アクションのきらっとした響き。明るさに小さな風が入る感じを覚えよう。",
    },
    {
        "family": "m7",
        "suffix": "m7",
        "intervals": [0, 3, 7, 10],
        "required": [0, 3, 10],
        "character_asset": "assets/approved/characters/major.png",
        "learning_note": "夜にふっとほどける",
        "hint": "{name}は、m7アクションの夜の余韻。minorより少しほどける感じを覚えよう。",
    },
    {
        "family": "maj7",
        "suffix": "maj7",
        "intervals": [0, 4, 7, 11],
        "required": [0, 4, 11],
        "character_asset": "assets/approved/characters/major.png",
        "learning_note": "透明にすっと落ち着く",
        "hint": "{name}は、maj7アクションの上品な響き。Majorより少し大人っぽい透明感を覚えよう。",
    },
    {
        "family": "mM7",
        "suffix": "mM7",
        "intervals": [0, 3, 7, 11],
        "required": [0, 3, 7, 11],
        "character_asset": "assets/approved/characters/major.png",
        "learning_note": "宿命を静かに見つめる",
        "hint": "{name}は、mM7アクションのミステリーな響き。minorの静けさに、maj7の張りつめた光が混ざる感じを覚えよう。",
    },
    {
        "family": "sus4",
        "suffix": "sus4",
        "intervals": [0, 5, 7],
        "required": [0, 5, 7],
        "character_asset": "assets/approved/characters/major.png",
        "learning_note": "まだ着地しない",
        "hint": "{name}は、sus4アクションの浮いた響き。まだ戻りきらない感じを覚えよう。",
    },
    {
        "family": "m7-5",
        "suffix": "m7-5",
        "intervals": [0, 3, 6, 10],
        "required": [0, 3, 6, 10],
        "character_asset": "assets/approved/characters/major.png",
        "learning_note": "不安定にゆれる",
        "hint": "{name}は、m7-5アクションの都会の夜みたいな緊張感。少し不安定に次へ流れる感じを覚えよう。",
    },
    {
        "family": "dim",
        "suffix": "dim",
        "intervals": [0, 3, 6, 9],
        "required": [0, 3, 6, 9],
        "character_asset": "assets/approved/characters/major.png",
        "learning_note": "きゅっと不穏になる",
        "hint": "{name}は、dimアクションのミステリーな響き。小さく緊張する感じを覚えよう。",
    },
    {
        "family": "aug",
        "suffix": "aug",
        "intervals": [0, 4, 8],
        "required": [0, 4, 8],
        "character_asset": "assets/approved/characters/major.png",
        "learning_note": "ふしぎにふくらむ",
        "hint": "{name}は、augアクションの夢みたいな響き。いつもの明るさが少し異世界へ広がる感じを覚えよう。",
    },
]


def pitch_name(pc: int) -> str:
    return PC_TO_NOTE[pc % 12]


def chord_name(root: str, suffix: str) -> str:
    return f"{root}{suffix}"


def chord_pitch_classes(root: str, intervals: list[int]) -> set[int]:
    base = NOTE_TO_PC[root]
    return {(base + interval) % 12 for interval in intervals}


def interval_classes(root: str, frets: tuple[int, int, int, int]) -> set[int]:
    base = NOTE_TO_PC[root]
    return {((OPEN_PCS[index] + fret) - base) % 12 for index, fret in enumerate(frets)}


def choose_fingering(root: str, family: dict) -> tuple[int, int, int, int]:
    allowed_pcs = chord_pitch_classes(root, family["intervals"])
    required = set(family["required"])
    candidates: list[tuple[tuple[int, ...], tuple[int, int, int, int]]] = []

    for frets in product(range(0, 6), repeat=4):
        pcs = {(OPEN_PCS[index] + fret) % 12 for index, fret in enumerate(frets)}
        if not pcs <= allowed_pcs:
            continue
        intervals = interval_classes(root, frets)
        if not required <= intervals:
            continue

        fretted = [fret for fret in frets if fret > 0]
        span = max(fretted) - min(fretted) if fretted else 0
        root_count = sum(1 for index, fret in enumerate(frets) if (OPEN_PCS[index] + fret) % 12 == NOTE_TO_PC[root])
        open_count = sum(1 for fret in frets if fret == 0)
        max_fret = max(frets)
        total = sum(frets)
        # Lower score is better. Favor compact, low-fret, open, root-present shapes.
        score = (
            span * 100,
            max_fret * 40,
            total * 10,
            -open_count * 4,
            -root_count * 8,
            frets,
        )
        candidates.append((score, frets))

    if not candidates:
        raise RuntimeError(f"No fingering found for {root} {family['family']}")
    candidates.sort(key=lambda item: item[0])
    return candidates[0][1]


def temp_audio_notes(root: str, intervals: list[int]) -> list[float]:
    base_midi = 60 + NOTE_TO_PC[root]
    while base_midi < 60:
        base_midi += 12
    notes = []
    for interval in intervals:
        midi = base_midi + interval
        if midi < 60:
            midi += 12
        notes.append(round(440.0 * (2 ** ((midi - 69) / 12)), 2))
    return notes


def dot_y(fret: int) -> int:
    if fret == 0:
        return 69
    return 82 + (fret - 0.5) * 38


def render_svg(name: str, frets: tuple[int, int, int, int], path: Path) -> None:
    x_positions = [54, 98, 142, 186]
    dots = []
    labels = []
    for index, fret in enumerate(frets):
        x = x_positions[index]
        if fret == 0:
            dots.append(f'<circle cx="{x}" cy="69" r="9" fill="#FFFFFF" stroke="#263238" stroke-width="3"/>')
        else:
            y = dot_y(fret)
            dots.append(f'<circle cx="{x}" cy="{y:.0f}" r="15" fill="#1E5AA8" stroke="#FFFFFF" stroke-width="5"/>')
            labels.append(f'<text x="{x}" y="{y + 5:.0f}">{fret}</text>')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 240 320" role="img" aria-label="{name} ukulele fingering, vertical strings">
  <rect width="240" height="320" rx="18" fill="#FFFFFF"/>
  <text x="120" y="34" text-anchor="middle" font-family="Hiragino Sans, Arial, sans-serif" font-size="28" font-weight="700" fill="#1E5AA8">{name}</text>
  <text x="120" y="58" text-anchor="middle" font-family="Hiragino Sans, Arial, sans-serif" font-size="12" font-weight="600" fill="#5A6870">G C E A</text>
  <g stroke="#D8E2E8" stroke-width="3" stroke-linecap="round">
    <line x1="42" y1="82" x2="198" y2="82"/>
    <line x1="42" y1="120" x2="198" y2="120"/>
    <line x1="42" y1="158" x2="198" y2="158"/>
    <line x1="42" y1="196" x2="198" y2="196"/>
    <line x1="42" y1="234" x2="198" y2="234"/>
    <line x1="42" y1="272" x2="198" y2="272"/>
  </g>
  <line x1="42" y1="82" x2="198" y2="82" stroke="#263238" stroke-width="6" stroke-linecap="round"/>
  <g stroke="#263238" stroke-width="4" stroke-linecap="round">
    <line x1="54" y1="82" x2="54" y2="272"/>
    <line x1="98" y1="82" x2="98" y2="272"/>
    <line x1="142" y1="82" x2="142" y2="272"/>
    <line x1="186" y1="82" x2="186" y2="272"/>
  </g>
  <g font-family="Hiragino Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#5A6870" text-anchor="middle">
    <text x="54" y="291">G</text>
    <text x="98" y="291">C</text>
    <text x="142" y="291">E</text>
    <text x="186" y="291">A</text>
  </g>
  {"".join(dots)}
  <g font-family="Hiragino Sans, Arial, sans-serif" font-size="13" font-weight="700" fill="#FFFFFF" text-anchor="middle">
    {"".join(labels)}
  </g>
  <text x="120" y="312" text-anchor="middle" font-family="Hiragino Sans, Arial, sans-serif" font-size="13" font-weight="600" fill="#5A6870">{"".join(str(fret) for fret in frets)}</text>
</svg>
'''
    path.write_text(svg, encoding="utf-8")


def safe_filename(name: str) -> str:
    return name.replace("#", "sharp").replace("b", "b").replace("/", "_").replace("-", "_")


def main() -> None:
    OUT_SVG_DIR.mkdir(parents=True, exist_ok=True)
    records = []
    for root in NOTE_NAMES:
        for family in FAMILIES:
            name = chord_name(root, family["suffix"])
            frets = choose_fingering(root, family)
            svg_name = f"ukulele_{safe_filename(name)}_vertical_strings.svg"
            svg_path = OUT_SVG_DIR / svg_name
            render_svg(name, frets, svg_path)
            records.append(
                {
                    "code_id": f"{root}_{family['family']}".replace("-", "_"),
                    "display_name": name,
                    "root": root,
                    "family": family["family"],
                    "ukulele_fingering": "".join(str(fret) for fret in frets),
                    "fingering_asset": f"assets/app/fingering/all-main-chords/{svg_name}",
                    "string_direction": "vertical",
                    "tuning": "GCEA",
                    "sound_file": f"assets/sound/source/codori_sound_{len(records) + 1:03d}_{safe_filename(name)}_ukulele.wav",
                    "sound_file_ready": False,
                    "character_asset": family["character_asset"],
                    "key_accent": root,
                    "learning_note": family["learning_note"],
                    "memory_hint": family["hint"].format(name=name),
                    "temp_audio_notes": temp_audio_notes(root, family["intervals"]),
                    "expansion_set": "all-main-chords",
                    "difficulty": "catalog",
                    "generated": True,
                }
            )

    OUT_DATA.parent.mkdir(parents=True, exist_ok=True)
    OUT_DATA.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    readme = OUT_SVG_DIR / "README.md"
    readme.write_text(
        "# All Main Chords Fingering SVG\n\n"
        "Codoriアプリ用に自動生成した、12音 x 主要11コード種類の運指SVGです。\n\n"
        "生成元:\n\n"
        "```text\n"
        "tools/generate_all_chord_catalog.py\n"
        "```\n\n"
        "注意:\n\n"
        "- 弦は上下方向です。\n"
        "- 弦の並びは左から `G / C / E / A` です。\n"
        "- 0〜5フレット内で自動選択した代表フォームです。\n"
        "- すべてのフォームは、正式教材化前に人間が確認します。\n",
        encoding="utf-8",
    )

    print(f"Generated {len(records)} chord records")
    print(f"Data: {OUT_DATA.relative_to(ROOT)}")
    print(f"SVG dir: {OUT_SVG_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
