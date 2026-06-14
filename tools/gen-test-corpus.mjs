// 楽譜認識テスト用コーパス生成器。
// 「正解（ground truth）つきのテスト譜」を作る。出力:
//   tools/corpus/<name>.musicxml  … Sibelius等で開いてPDF化 → Codoriで認識する元
//   tools/corpus/<name>.truth.json … 完璧な認識が返すべきデータ（音価・休符・調・拍子・記号）
// 使い方: node tools/gen-test-corpus.mjs
//
// 網羅: 音価・付点・各種休符（付点4分休符含む）・臨時記号・タイ・連桁・調号・拍子・3連符・
//       アーティキュレーション（スタッカート/アクセント/テヌート/マルカート/スタッカーティシモ/
//       フェルマータ）・繰り返し（1番2番括弧／D.C. al Fine）。1小節=1パターンでラベル付け。

import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// 繰り返し展開エンジン（実装と同じロジック）を読み込み、正解 playOrder を計算する。
const __dir = dirname(fileURLToPath(import.meta.url));
const repeatsSrc = readFileSync(join(__dir, "../app/song/repeats.js"), "utf8");
const { expandRepeats } = new Function(repeatsSrc.replace(/if \(typeof module[\s\S]*$/, "") + "\nreturn { expandRepeats };")();

const DIV = 24; // 4分音符あたりの分割数（3連符＝24/3=8 も整数で扱える）
const TYPE_DIV = { whole: 96, half: 48, quarter: 24, eighth: 12, "16th": 6, "32nd": 3 };
const TYPE_JP = { whole: "全", half: "2分", quarter: "4分", eighth: "8分", "16th": "16分", "32nd": "32分" };
const ARTIC_XML = { staccato: "<staccato/>", accent: "<accent/>", tenuto: "<tenuto/>", marcato: "<strong-accent/>", staccatissimo: "<staccatissimo/>" };

// 音価（divisions）= 種類 × 付点係数（付点1つ=1.5, 2つ=1.75）× 連符係数(normal/actual)
function durOf(type, dots = 0, tuplet = null) {
  const f = dots === 2 ? 1.75 : dots === 1 ? 1.5 : 1;
  const tf = tuplet ? tuplet[1] / tuplet[0] : 1; // 例: 3連符[3,2]→2/3
  return Math.round(TYPE_DIV[type] * f * tf);
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

// ===== コーパス①: リズム/休符/臨時記号/タイ/連桁/調号/拍子/3連符（1小節=1ケース）=====
const rhythmMeasures = [
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
  // ---- 3連符（8分3連×2拍 ＋ 4分×2）----
  { time: [4, 4], key: 0, label: "8分3連符×2＋4分×2", events: [
    n("C4", "eighth", { tuplet: [3, 2], tpos: "start" }), n("D4", "eighth", { tuplet: [3, 2] }), n("E4", "eighth", { tuplet: [3, 2], tpos: "stop" }),
    n("F4", "eighth", { tuplet: [3, 2], tpos: "start" }), n("G4", "eighth", { tuplet: [3, 2] }), n("A4", "eighth", { tuplet: [3, 2], tpos: "stop" }),
    n("C4", "quarter"), n("D4", "quarter")] },
  // ---- 調号（1♭ Fメジャー / 3♭ E♭メジャー）----
  { key: -1, label: "調号1♭（Fメジャー）4分×4", events: [n("F4", "quarter"), n("G4", "quarter"), n("A4", "quarter"), n("Bb4", "quarter")] },
  { key: -3, label: "調号3♭（E♭メジャー）4分×4", events: [n("Eb4", "quarter"), n("F4", "quarter"), n("G4", "quarter"), n("Ab4", "quarter")] },
  // ---- 2/4拍子 ----
  { time: [2, 4], key: 0, label: "2/4：4分×2", events: [n("C4", "quarter"), n("D4", "quarter")] },
  // ---- 6/8拍子（付点4分×2）----
  { time: [6, 8], label: "6/8：付点4分×2", events: [n("C4", "quarter", { dots: 1 }), n("D4", "quarter", { dots: 1 })] },
  { time: [6, 8], label: "6/8：8分×6（連桁）", events: ["C4", "D4", "E4", "F4", "G4", "A4"].map((p) => n(p, "eighth", { beam: true })) },
  // ---- 3/4拍子 ----
  { time: [3, 4], key: 0, label: "3/4：4分×3", events: [n("C4", "quarter"), n("D4", "quarter"), n("E4", "quarter")] },
  { time: [3, 4], label: "3/4：全休符（1小節=3拍）", events: [r("whole")] },
];

// ===== コーパス②: アーティキュレーション（1小節=1記号）=====
const articMeasures = [
  { key: 0, time: [4, 4], label: "スタッカート4分×4", events: ["C5", "D5", "E5", "F5"].map((p) => n(p, "quarter", { artic: "staccato" })) },
  { label: "アクセント4分×4", events: ["C5", "D5", "E5", "F5"].map((p) => n(p, "quarter", { artic: "accent" })) },
  { label: "テヌート4分×4", events: ["C5", "D5", "E5", "F5"].map((p) => n(p, "quarter", { artic: "tenuto" })) },
  { label: "マルカート4分×4", events: ["C5", "D5", "E5", "F5"].map((p) => n(p, "quarter", { artic: "marcato" })) },
  { label: "スタッカーティシモ8分×8", events: ["C5", "D5", "E5", "F5", "G5", "A5", "G5", "F5"].map((p) => n(p, "eighth", { beam: true, artic: "staccatissimo" })) },
  { label: "フェルマータ（全音符）", events: [n("C5", "whole", { artic: "fermata" })] },
];

// ===== コーパス③: 1番2番括弧（リピート＋ending）=====
//   𝄆 m1 m2 |1.括弧 m3 𝄇 |2.括弧 m4 ｜  → 再生順 [0..12](1回目) [0..8]+[12..16](2回目)
const voltaMeasures = [
  { key: 0, time: [4, 4], label: "リピート開始", repeat: "forward", events: [n("C4", "quarter"), n("D4", "quarter"), n("E4", "quarter"), n("F4", "quarter")] },
  { label: "共通部", events: [n("G4", "quarter"), n("A4", "quarter"), n("B4", "quarter"), n("C5", "quarter")] },
  { label: "1番括弧（→リピート戻り）", ending: { number: 1, type: ["start", "stop"] }, repeat: "backward", events: [n("D5", "quarter"), n("C5", "quarter"), n("B4", "quarter"), n("A4", "quarter")] },
  { label: "2番括弧", ending: { number: 2, type: ["start", "discontinue"] }, events: [n("G4", "quarter"), n("F4", "quarter"), n("E4", "quarter"), n("D4", "quarter")] },
];
const voltaStructure = { end: 16, repeats: [{ start: 0, end: 12, times: 2 }], voltas: [{ start: 8, end: 12, passes: [1] }, { start: 12, end: 16, passes: [2] }] };

// ===== コーパス④: D.C. al Fine =====
//   m1(Fine) m2 m3(D.C. al Fine) → 再生順 [0..12](通し) [0..4](頭〜Fine)
const dcFineMeasures = [
  { key: 0, time: [4, 4], label: "頭（Fineはこの小節末）", fineMark: true, events: [n("C4", "quarter"), n("D4", "quarter"), n("E4", "quarter"), n("F4", "quarter")] },
  { label: "中間", events: [n("G4", "quarter"), n("A4", "quarter"), n("B4", "quarter"), n("C5", "quarter")] },
  { label: "末（D.C. al Fine）", endWords: { text: "D.C. al Fine", sound: '<sound dacapo="yes"/>' }, events: [n("D5", "quarter"), n("E5", "quarter"), n("F5", "quarter"), n("G5", "quarter")] },
];
const dcFineStructure = { end: 12, dcAlFine: { fineAt: 4 } };

// ===== MusicXML 出力 =====
function noteXml(ev) {
  const dur = durOf(ev.type, ev.dots || 0, ev.tuplet);
  const dotsXml = (ev.dots ? "<dot/>".repeat(ev.dots) : "");
  const beamXml = ev.beam ? `<beam number="1">${ev.beamPos}</beam>` : "";
  const timeMod = ev.tuplet ? `<time-modification><actual-notes>${ev.tuplet[0]}</actual-notes><normal-notes>${ev.tuplet[1]}</normal-notes></time-modification>` : "";
  if (ev.kind === "rest") {
    return `      <note><rest/><duration>${dur}</duration><type>${ev.type}</type>${dotsXml}${timeMod}</note>\n`;
  }
  const m = /^([A-G])([#b]?)(\d)$/.exec(ev.pitch);
  const alter = m[2] === "#" ? "<alter>1</alter>" : m[2] === "b" ? "<alter>-1</alter>" : "";
  const accXml = ev.acc ? `<accidental>${ev.acc}</accidental>` : "";
  let tieXml = "";
  let notationsInner = "";
  if (ev.tie === "start") { tieXml = `<tie type="start"/>`; notationsInner += `<tied type="start"/>`; }
  if (ev.tie === "stop") { tieXml = `<tie type="stop"/>`; notationsInner += `<tied type="stop"/>`; }
  if (ev.tpos) notationsInner += `<tuplet type="${ev.tpos}"/>`;
  if (ev.artic === "fermata") notationsInner += `<fermata/>`;
  else if (ev.artic) notationsInner += `<articulations>${ARTIC_XML[ev.artic]}</articulations>`;
  const notationsXml = notationsInner ? `<notations>${notationsInner}</notations>` : "";
  return `      <note><pitch><step>${m[1]}</step>${alter}<octave>${m[3]}</octave></pitch>` +
    `<duration>${dur}</duration>${tieXml}<type>${ev.type}</type>${dotsXml}${accXml}${timeMod}${beamXml}${notationsXml}</note>\n`;
}

// 小節の左/右バーライン（リピート・括弧）
function barlineXml(location, mez) {
  const isLeft = location === "left";
  const rep = mez.repeat;
  const wantRepeat = isLeft ? rep === "forward" || rep === "both" : rep === "backward" || rep === "both";
  const endType = mez.ending ? (isLeft ? mez.ending.type[0] : mez.ending.type[1]) : null;
  // 左の ending は start のみ、右は stop/discontinue のみ
  const wantEnding = mez.ending && ((isLeft && endType === "start") || (!isLeft && (endType === "stop" || endType === "discontinue")));
  if (!wantRepeat && !wantEnding) return "";
  let inner = "";
  if (wantEnding) inner += `<ending number="${mez.ending.number}" type="${endType}"/>`;
  if (wantRepeat) inner += `<bar-style>${isLeft ? "heavy-light" : "light-heavy"}</bar-style><repeat direction="${isLeft ? "forward" : "backward"}"/>`;
  return `      <barline location="${location}">${inner}</barline>\n`;
}

function buildMusicXml(measures, title) {
  let curKey = 0;
  let curTime = [4, 4];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n`;
  xml += `<score-partwise version="3.1">\n  <movement-title>${escapeXml(title)}</movement-title>\n  <part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list>\n  <part id="P1">\n`;
  measures.forEach((mez, i) => {
    const key = mez.key !== undefined ? mez.key : curKey;
    const time = mez.time || curTime;
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
    xml += barlineXml("left", mez);
    // セーニョ/コーダ（小節頭）
    if (mez.segnoMark) xml += `      <direction placement="above"><direction-type><segno/></direction-type><sound segno="segno"/></direction>\n`;
    if (mez.codaMark) xml += `      <direction placement="above"><direction-type><coda/></direction-type></direction>\n`;
    // 小節名（リハーサルマーク代わりにテキスト）
    xml += `      <direction placement="above"><direction-type><words>${escapeXml(mez.label)}</words></direction-type></direction>\n`;
    for (const ev of mez.events) xml += noteXml(ev);
    // Fine / To Coda / D.C./D.S.（小節末）
    if (mez.fineMark) xml += `      <direction placement="above"><direction-type><words>Fine</words></direction-type><sound fine="yes"/></direction>\n`;
    if (mez.toCodaMark) xml += `      <direction placement="above"><direction-type><words>To Coda</words></direction-type><sound tocoda="coda"/></direction>\n`;
    if (mez.endWords) xml += `      <direction placement="above"><direction-type><words>${escapeXml(mez.endWords.text)}</words></direction-type>${mez.endWords.sound || ""}</direction>\n`;
    xml += barlineXml("right", mez);
    xml += `    </measure>\n`;
    curKey = key; curTime = time;
  });
  xml += `  </part>\n</score-partwise>\n`;
  return xml;
}

function escapeXml(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

// ===== 正解（ground truth）出力：Codoriが返すべきデータ形 =====
function buildTruth(measures, structure) {
  let curKey = 0;
  let curTime = [4, 4];
  let beat = 0;
  const notes = [];   // {beat, beats, midi, artic?}（タイは結合）
  const rests = [];   // {beat, beats, kind}
  const cases = [];
  measures.forEach((mez) => {
    const key = mez.key !== undefined ? mez.key : curKey;
    const time = mez.time || curTime;
    const startBeat = beat;
    const caseNotes = [];
    const caseRests = [];
    for (const ev of mez.events) {
      const beats = durOf(ev.type, ev.dots || 0, ev.tuplet) / DIV;
      if (ev.kind === "rest") {
        const kind = restKind(ev.type, ev.dots || 0);
        rests.push({ beat: round(beat), beats: round(beats), kind });
        caseRests.push({ kind, beats: round(beats) });
        beat += beats;
      } else if (ev.tie === "stop") {
        const prev = notes[notes.length - 1];
        if (prev) prev.beats = round(prev.beats + beats);
        beat += beats;
      } else {
        const note = { beat: round(beat), beats: round(beats), midi: pitchToMidi(ev.pitch) };
        if (ev.artic) note.artic = ev.artic;
        notes.push(note);
        caseNotes.push({ pitch: ev.pitch, type: (ev.dots ? "付点" : "") + TYPE_JP[ev.type], midi: pitchToMidi(ev.pitch), ...(ev.artic ? { artic: ev.artic } : {}) });
        beat += beats;
      }
    }
    cases.push({ measure: cases.length + 1, label: mez.label, key, time: time.join("/"), notes: caseNotes, rests: caseRests, startBeat: round(startBeat) });
    curKey = key; curTime = time;
  });
  const truth = {
    format: "codori-test-truth", version: 1,
    beatsPerBar: measures[0].time ? measures[0].time[0] : 4,
    fifths: measures[0].key || 0,
    noteCount: notes.length, restCount: rests.length,
    notes, rests, cases
  };
  if (structure) {
    truth.repeatStructure = structure;
    // 実装と同じエンジンで「期待される再生順」を計算して埋め込む（閉ループ）
    truth.playOrder = expandRepeats(structure).map((s) => [s.from, s.to]);
  }
  return truth;
}

function round(x) { return Math.round(x * 1000) / 1000; }

// ===== 実行 =====
const outDir = join(__dir, "corpus");
mkdirSync(outDir, { recursive: true });

const corpora = [
  { name: "rhythm-test", title: "Codori 認識テスト（リズム）", measures: rhythmMeasures, structure: null },
  { name: "artic-test", title: "Codori 認識テスト（アーティキュレーション）", measures: articMeasures, structure: null },
  { name: "repeat-volta-test", title: "Codori 認識テスト（1番2番括弧）", measures: voltaMeasures, structure: voltaStructure },
  { name: "repeat-dcfine-test", title: "Codori 認識テスト（D.C. al Fine）", measures: dcFineMeasures, structure: dcFineStructure },
];

for (const c of corpora) {
  const xml = buildMusicXml(c.measures, c.title);
  const truth = buildTruth(c.measures, c.structure);
  writeFileSync(join(outDir, `${c.name}.musicxml`), xml, "utf8");
  writeFileSync(join(outDir, `${c.name}.truth.json`), JSON.stringify(truth, null, 2), "utf8");
  let extra = `音${truth.noteCount} / 休符${truth.restCount}`;
  if (truth.playOrder) extra += ` / 再生順${JSON.stringify(truth.playOrder)}`;
  console.log(`生成: ${c.name}.musicxml（${c.measures.length}小節） ＋ ${c.name}.truth.json（${extra}）`);
}

export { rhythmMeasures, articMeasures, voltaMeasures, dcFineMeasures, buildMusicXml, buildTruth };
