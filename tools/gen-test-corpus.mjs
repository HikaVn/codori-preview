// 楽譜認識テスト用コーパス生成器。
// 「正解（ground truth）つきのテスト譜」を作る。出力:
//   tools/corpus/<name>.musicxml  … Sibelius等で開いてPDF化 → Codoriで認識する元
//   tools/corpus/<name>.truth.json … 完璧な認識が返すべきデータ（音価・休符・調・拍子）
// 使い方: node tools/gen-test-corpus.mjs
//
// 音価・付点・各種休符（付点4分休符含む）・臨時記号・タイ・連桁・調号・拍子を網羅し、
// 1小節=1パターンでラベル付け。MusicXML自体が正解なので、認識結果と機械的に照合できる。

import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const DIV = 8; // 4分音符あたりの分割数（16分=2, 32分=1 まで整数で扱える）
const TYPE_DIV = { whole: 32, half: 16, quarter: 8, eighth: 4, "16th": 2, "32nd": 1 };
const TYPE_JP = { whole: "全", half: "2分", quarter: "4分", eighth: "8分", "16th": "16分", "32nd": "32分" };

// 音価（divisions）= 種類 × 付点係数（付点1つ=1.5, 2つ=1.75）
function durOf(type, dots = 0) {
  const f = dots === 2 ? 1.75 : dots === 1 ? 1.5 : 1;
  return Math.round(TYPE_DIV[type] * f);
}
// 種類＋付点 → 休符の種別キー（描画/照合で使う統一名）
function restKind(type, dots) {
  return (dots ? "dotted-" : "") + type;
}

// イベント定義ヘルパー
function n(pitch, type, opts = {}) { return { kind: "note", pitch, type, ...opts }; }
function r(type, opts = {}) { return { kind: "rest", type, ...opts }; }

const STEP_SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function pitchToMidi(p) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(p);
  const alter = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return STEP_SEMI[m[1]] + alter + (parseInt(m[3], 10) + 1) * 12;
}

// ===== コーパス本体（1小節=1ケース）=====
const measures = [
  { key: 0, time: [4, 4], label: "4分音符×4", events: [n("C4", "quarter"), n("D4", "quarter"), n("E4", "quarter"), n("F4", "quarter")] },
  { label: "8分音符×8（連桁）", events: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"].map((p) => n(p, "eighth", { beam: true })) },
  { label: "16分音符×16（連桁）", events: Array.from({ length: 16 }, (_, i) => n(["C4", "D4", "E4", "F4"][i % 4], "16th", { beam: true })) },
  { label: "2分+4分+4分", events: [n("C4", "half"), n("D4", "quarter"), n("E4", "quarter")] },
  { label: "全音符", events: [n("C4", "whole")] },
  { label: "付点4分+8分+2分", events: [n("C4", "quarter", { dots: 1 }), n("D4", "eighth"), n("E4", "half")] },
  { label: "付点2分+4分", events: [n("C4", "half", { dots: 1 }), n("D4", "quarter")] },
  { label: "付点8分+16分（付点リズム）×2", events: [n("C4", "eighth", { dots: 1 }), n("D4", "16th"), n("E4", "eighth", { dots: 1 }), n("F4", "16th")] },
  // ---- 休符 ----
  { label: "4分音符と4分休符", events: [n("C4", "quarter"), r("quarter"), n("E4", "quarter"), r("quarter")] },
  { label: "8分休符＋8分音符×4", events: [r("eighth"), n("C4", "eighth"), r("eighth"), n("D4", "eighth"), r("eighth"), n("E4", "eighth"), r("eighth"), n("F4", "eighth")] },
  { label: "★付点4分休符（4分音符+付点4分休符+8分音符+4分音符）", events: [n("C4", "quarter"), r("quarter", { dots: 1 }), n("D4", "eighth"), n("E4", "quarter")] },
  { label: "2分休符＋2分音符", events: [r("half"), n("C4", "half")] },
  { label: "全休符（1小節）", events: [r("whole")] },
  { label: "付点2分休符＋4分音符", events: [r("half", { dots: 1 }), n("C4", "quarter")] },
  // ---- 臨時記号 ----
  { label: "臨時記号（♯♭♮）", events: [n("C4", "quarter"), n("C#4", "quarter", { acc: "sharp" }), n("D4", "quarter"), n("Db4", "quarter", { acc: "flat" })] },
  // ---- タイ ----
  { label: "タイ（4分→4分＝2分の長さ）と4分×2", events: [n("C4", "quarter", { tie: "start" }), n("C4", "quarter", { tie: "stop" }), n("D4", "quarter"), n("E4", "quarter")] },
  // ---- 調号（2♯）----
  { key: 2, label: "調号2♯（Dメジャー）4分×4", events: [n("D4", "quarter"), n("E4", "quarter"), n("F#4", "quarter"), n("G4", "quarter")] },
  // ---- 3/4拍子 ----
  { time: [3, 4], key: 0, label: "3/4：4分×3", events: [n("C4", "quarter"), n("D4", "quarter"), n("E4", "quarter")] },
  { time: [3, 4], label: "3/4：全休符（1小節=3拍）", events: [r("whole")] },
];

// ===== MusicXML 出力 =====
function noteXml(ev, divisions) {
  const dur = durOf(ev.type, ev.dots || 0);
  const dotsXml = (ev.dots ? "<dot/>".repeat(ev.dots) : "");
  const beamXml = ev.beam ? `<beam number="1">${ev.beamPos}</beam>` : "";
  if (ev.kind === "rest") {
    return `      <note><rest/><duration>${dur}</duration><type>${ev.type}</type>${dotsXml}</note>\n`;
  }
  const m = /^([A-G])([#b]?)(\d)$/.exec(ev.pitch);
  const alter = m[2] === "#" ? "<alter>1</alter>" : m[2] === "b" ? "<alter>-1</alter>" : "";
  const accXml = ev.acc ? `<accidental>${ev.acc}</accidental>` : "";
  let tieXml = "";
  let tiedXml = "";
  if (ev.tie === "start") { tieXml = `<tie type="start"/>`; tiedXml = `<notations><tied type="start"/></notations>`; }
  if (ev.tie === "stop") { tieXml = `<tie type="stop"/>`; tiedXml = `<notations><tied type="stop"/></notations>`; }
  return `      <note><pitch><step>${m[1]}</step>${alter}<octave>${m[3]}</octave></pitch>` +
    `<duration>${dur}</duration>${tieXml}<type>${ev.type}</type>${dotsXml}${accXml}${beamXml}${tiedXml}</note>\n`;
}

function buildMusicXml(measures) {
  let curKey = 0;
  let curTime = [4, 4];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n`;
  xml += `<score-partwise version="3.1">\n  <movement-title>Codori 認識テスト</movement-title>\n  <part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list>\n  <part id="P1">\n`;
  measures.forEach((mez, i) => {
    const key = mez.key !== undefined ? mez.key : curKey;
    const time = mez.time || curTime;
    // 連桁の begin/continue/end を割り当て
    const beamEvents = mez.events.filter((e) => e.beam);
    beamEvents.forEach((e, j) => { e.beamPos = j === 0 ? "begin" : j === beamEvents.length - 1 ? "end" : "continue"; });
    xml += `    <measure number="${i + 1}">\n`;
    if (i === 0 || key !== curKey || time[0] !== curTime[0] || time[1] !== curTime[1]) {
      xml += `      <attributes>\n`;
      if (i === 0) xml += `        <divisions>${DIV}</divisions>\n`;
      xml += `        <key><fifths>${key}</fifths></key>\n`;
      xml += `        <time><beats>${time[0]}</beats><beat-type>${time[1]}</beat-type></time>\n`;
      if (i === 0) xml += `        <clef><sign>G</sign><line>2</line></clef>\n`;
      xml += `      </attributes>\n`;
    }
    // 小節名（リハーサルマーク代わりにテキスト）
    xml += `      <direction placement="above"><direction-type><words>${escapeXml(mez.label)}</words></direction-type></direction>\n`;
    for (const ev of mez.events) xml += noteXml(ev, DIV);
    xml += `    </measure>\n`;
    curKey = key; curTime = time;
  });
  xml += `  </part>\n</score-partwise>\n`;
  return xml;
}

function escapeXml(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

// ===== 正解（ground truth）出力：Codoriが返すべきデータ形 =====
function buildTruth(measures) {
  let curKey = 0;
  let curTime = [4, 4];
  let beat = 0;
  const notes = [];   // {beat, beats, midi}（タイは結合）
  const rests = [];   // {beat, beats, kind}（kind=4分/付点4分…）
  const cases = [];   // ラベル別の期待（人が見て確認用）
  measures.forEach((mez) => {
    const key = mez.key !== undefined ? mez.key : curKey;
    const time = mez.time || curTime;
    const startBeat = beat;
    const caseNotes = [];
    const caseRests = [];
    for (const ev of mez.events) {
      const beats = durOf(ev.type, ev.dots || 0) / DIV;
      if (ev.kind === "rest") {
        const kind = restKind(ev.type, ev.dots || 0);
        rests.push({ beat: round(beat), beats: round(beats), kind });
        caseRests.push({ kind, beats: round(beats) });
        beat += beats;
      } else if (ev.tie === "stop") {
        // 直前の音へ結合（タイ）
        const prev = notes[notes.length - 1];
        if (prev) prev.beats = round(prev.beats + beats);
        beat += beats;
      } else {
        notes.push({ beat: round(beat), beats: round(beats), midi: pitchToMidi(ev.pitch) });
        caseNotes.push({ pitch: ev.pitch, type: (ev.dots ? "付点" : "") + TYPE_JP[ev.type], midi: pitchToMidi(ev.pitch) });
        beat += beats;
      }
    }
    cases.push({ measure: cases.length + 1, label: mez.label, key, time: time.join("/"), notes: caseNotes, rests: caseRests, startBeat: round(startBeat) });
    curKey = key; curTime = time;
  });
  return {
    format: "codori-test-truth", version: 1,
    beatsPerBar: measures[0].time ? measures[0].time[0] : 4,
    fifths: measures[0].key || 0,
    noteCount: notes.length, restCount: rests.length,
    notes, rests, cases
  };
}

function round(x) { return Math.round(x * 1000) / 1000; }

// ===== 実行 =====
const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, "corpus");
mkdirSync(outDir, { recursive: true });
const xml = buildMusicXml(measures);
const truth = buildTruth(measures);
writeFileSync(join(outDir, "rhythm-test.musicxml"), xml, "utf8");
writeFileSync(join(outDir, "rhythm-test.truth.json"), JSON.stringify(truth, null, 2), "utf8");
console.log(`生成: tools/corpus/rhythm-test.musicxml（${measures.length}小節）`);
console.log(`生成: tools/corpus/rhythm-test.truth.json（音${truth.noteCount} / 休符${truth.restCount}）`);
console.log(`休符の種別: ${[...new Set(truth.rests.map((r) => r.kind))].join(", ")}`);

export { measures, buildMusicXml, buildTruth };
