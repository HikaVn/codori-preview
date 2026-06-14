// 認識結果 vs 正解(ground truth) の自動照合ハーネス。
// Codoriの認識結果（PDF認識 or MusicXML取り込み）を正解と突き合わせ、
// 音符・休符が記号別に合っているか（付点4分休符=OK/NG 等）をレポートする。
//
// 使い方（プログラムから）:
//   import { normalizeRecognized, compareToTruth } from './compare.mjs';
//   const rep = compareToTruth(normalizeRecognized(codoriResult), truth);

// SMuFL休符コード → 種別名
const SMUFL_REST_KIND = { 0xe4e3: "whole", 0xe4e4: "half", 0xe4e5: "quarter", 0xe4e6: "eighth", 0xe4e7: "16th" };
// 拍数 → 種別名（SMuFLが無いとき/MusicXML用のフォールバック）
function kindFromBeats(beats, beatsPerBar) {
  if (Math.abs(beats - beatsPerBar) < 0.01) return "whole"; // 1小節まるごと
  const dotted = [0.75, 1.5, 3, 6].some((v) => Math.abs(beats - v) < 0.01);
  const base = dotted ? beats / 1.5 : beats;
  const t = base >= 4 ? "whole" : base >= 2 ? "half" : base >= 1 ? "quarter" : base >= 0.5 ? "eighth" : base >= 0.25 ? "16th" : "32nd";
  return (dotted ? "dotted-" : "") + t;
}

// Codoriの結果（PDF認識 res / MusicXML取り込み parsed）を共通形へ
export function normalizeRecognized(res) {
  const beatsPerBar = res.beatsPerBar || 4;
  const fifths = res.keySig ? res.keySig.fifths : (res.fifths ?? null);
  const notes = (res.melody || []).map((n) => ({ beat: round(n.startBeat), beats: round(n.beats), midi: n.midi }))
    .sort((a, b) => a.beat - b.beat || a.midi - b.midi);
  // 休符: PDFは layout.systems[].rests（smufl/dotted/x）。x順→拍は推定せず、種別だけ集計に使う。
  const rests = [];
  if (res.layout && res.layout.systems) {
    for (const sy of res.layout.systems) {
      for (const r of sy.rests || []) {
        const kind = (r.smufl && SMUFL_REST_KIND[r.smufl]) ? ((r.dotted ? "dotted-" : "") + SMUFL_REST_KIND[r.smufl]) : kindFromBeats(r.beats, beatsPerBar);
        rests.push({ kind, beats: round(r.beats) });
      }
    }
  }
  return { beatsPerBar, fifths, notes, rests };
}

function round(x) { return Math.round(x * 1000) / 1000; }

// 音符列の照合（拍の近いものを貪欲マッチ。音高と音価を確認）
function matchNotes(truth, got) {
  const used = new Set();
  let ok = 0; const wrongDur = []; const missing = [];
  for (const t of truth) {
    let best = -1; let bestD = 0.6; // 拍の許容
    for (let i = 0; i < got.length; i++) {
      if (used.has(i)) continue;
      if (got[i].midi !== t.midi) continue;
      const d = Math.abs(got[i].beat - t.beat);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) { missing.push(t); continue; }
    used.add(best);
    if (Math.abs(got[best].beats - t.beats) < 0.01) ok += 1;
    else wrongDur.push({ truth: t, got: got[best] });
  }
  const extra = got.filter((_, i) => !used.has(i));
  return { total: truth.length, ok, wrongDur, missing, extra };
}

// 休符の照合（種別ごとの個数で照合：付点4分休符が出ているか等）
function matchRests(truth, got) {
  const count = (arr) => { const m = {}; for (const r of arr) m[r.kind] = (m[r.kind] || 0) + 1; return m; };
  const tc = count(truth); const gc = count(got);
  const kinds = [...new Set([...Object.keys(tc), ...Object.keys(gc)])].sort();
  const rows = kinds.map((k) => ({ kind: k, truth: tc[k] || 0, got: gc[k] || 0, ok: (tc[k] || 0) === (gc[k] || 0) }));
  return rows;
}

export function compareToTruth(recognized, truth) {
  const notes = matchNotes(truth.notes, recognized.notes);
  const rests = matchRests(truth.rests, recognized.rests);
  const keyOK = recognized.fifths === null || recognized.fifths === undefined ? "(不明)" : (recognized.fifths === truth.fifths ? "OK" : `NG(認識${recognized.fifths}/正解${truth.fifths})`);
  const meterOK = recognized.beatsPerBar === truth.beatsPerBar ? "OK" : `NG(認識${recognized.beatsPerBar}/正解${truth.beatsPerBar})`;
  return { notes, rests, keyOK, meterOK };
}

// レポート整形
export function formatReport(rep) {
  const L = [];
  L.push("=== 音符 ===");
  L.push(`  一致 ${rep.notes.ok}/${rep.notes.total}  音価ちがい ${rep.notes.wrongDur.length}  欠落 ${rep.notes.missing.length}  余分 ${rep.notes.extra.length}`);
  if (rep.notes.wrongDur.length) for (const w of rep.notes.wrongDur.slice(0, 8)) L.push(`    拍${w.truth.beat} midi${w.truth.midi}: 正解${w.truth.beats}拍→認識${w.got.beats}拍`);
  L.push("=== 休符（種別ごとの個数）===");
  if (!rep.rests.length) L.push("  (認識結果に休符データなし＝MusicXML取り込み経路。休符はPDF認識経路で照合)");
  for (const r of rep.rests) L.push(`  ${r.ok ? "OK " : "NG "} ${r.kind}: 正解${r.truth} / 認識${r.got}`);
  L.push(`=== 調号: ${rep.keyOK}  拍子: ${rep.meterOK} ===`);
  return L.join("\n");
}

// ===== CLI: node tools/compare.mjs <recognized.svg|.json> <truth.json> =====
// recognized は CodoriのSVG書き出し（metadata埋め込み）か、認識データJSON。
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import("fs");
  const [recPath, truthPath] = process.argv.slice(2);
  if (!recPath || !truthPath) {
    console.error("使い方: node tools/compare.mjs <認識結果.svg|.json> <正解.json>");
    process.exit(1);
  }
  const raw = fs.readFileSync(recPath, "utf8");
  let rec;
  if (recPath.endsWith(".svg")) {
    const m = raw.match(/<metadata id="codori-score-data">([\s\S]*?)<\/metadata>/);
    if (!m) { console.error("SVGに楽譜データ(metadata)が見つからない"); process.exit(1); }
    rec = JSON.parse(m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
    rec.melody = rec.melody.map((n) => ({ startBeat: n.startBeat ?? n.beat, beats: n.beats, midi: n.midi }));
  } else {
    rec = JSON.parse(raw);
  }
  const truth = JSON.parse(fs.readFileSync(truthPath, "utf8"));
  const rep = compareToTruth(normalizeRecognized(rec), truth);
  console.log(formatReport(rep));
}

