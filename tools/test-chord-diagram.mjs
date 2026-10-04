import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { keyboardNotesForChord, keyboardSvg, diagramNoteAt } = require("../app/chord-forms.js");

function checkChord(name, expected) {
  assert.deepEqual(keyboardNotesForChord(name)?.noteNames, expected, name);
}

checkChord("C", ["C", "E", "G"]);
checkChord("Cadd9", ["C", "E", "G", "D"]);
checkChord("F", ["F", "A", "C"]);
checkChord("Bb", ["Bb", "D", "F"]);
checkChord("C7", ["C", "E", "G", "Bb"]);
checkChord("Cdim", ["C", "Eb", "Gb", "A"]);
assert.equal(keyboardNotesForChord("C<script>"), null);

const svg = keyboardSvg("Cadd9");
assert.match(svg, /<svg /);
assert.match(svg, /C · E · G · D\(9\)/);
assert.equal((svg.match(/data-selected="true"/g) || []).length, 4);
assert.equal((keyboardSvg("Cadd9", { compact: true }).match(/data-selected="true"/g) || []).length, 4);

assert.deepEqual(diagramNoteAt("ukulele", 54, 160, { frets: "0003" }), { midi: 67, label: "G弦", index: 0 });
assert.deepEqual(diagramNoteAt("ukulele", 186, 160, { frets: "0003" }), { midi: 72, label: "A弦", index: 3 });
assert.deepEqual(diagramNoteAt("ukulele", 54, 160, { frets: [5, 4, 3, 3] }), { midi: 72, label: "G弦", index: 0 });
assert.equal(diagramNoteAt("ukulele", 54, 160, { frets: "invalid" }), null);
assert.deepEqual(diagramNoteAt("piano", 25, 60), { midi: 60, label: "C" });
assert.deepEqual(diagramNoteAt("piano", 45, 60), { midi: 61, label: "Db" });
assert.deepEqual(diagramNoteAt("piano", 45, 110), { midi: 60, label: "C" });
assert.deepEqual(diagramNoteAt("piano", 232, 30, { compact: true }), { midi: 71, label: "B" });
assert.equal(diagramNoteAt("piano", 25, 5), null);

let checked = 0;
let voicingsWithOmissions = 0;
for (const file of [
  "initial-four-chords.json",
  "expansion-set-01.json",
  "m7-set-01.json",
  "all-main-chords.json"
]) {
  const chords = JSON.parse(readFileSync(new URL(`../assets/app/data/${file}`, import.meta.url), "utf8"));
  for (const chord of chords) {
    const keyboard = keyboardNotesForChord(chord.display_name);
    assert.ok(keyboard, `${file}: ${chord.display_name} has a keyboard diagram`);
    const actual = [...new Set(chord.temp_audio_notes.map((frequency) =>
      ((Math.round(69 + 12 * Math.log2(frequency / 440)) % 12) + 12) % 12
    ))].sort((a, b) => a - b);
    const expected = [...keyboard.pitchClasses].sort((a, b) => a - b);
    assert.ok(actual.every((pitchClass) => expected.includes(pitchClass)),
      `${file}: ${chord.display_name} audio stays within its chord tones`);
    if (actual.length < expected.length) {
      voicingsWithOmissions += 1;
    }
    checked += 1;
  }
}

console.log(`Keyboard diagrams verified for ${checked} chords (${voicingsWithOmissions} audio voicings omit a chord tone).`);
