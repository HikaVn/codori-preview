// 繰り返し展開エンジンの単体テスト。 node tools/test-repeats.mjs
import { readFileSync } from "fs";
const src = readFileSync(new URL("../app/song/repeats.js", import.meta.url), "utf8");
const { expandRepeats, applyPlayOrder } = new Function(src.replace(/if \(typeof module[\s\S]*$/, "") + "\nreturn { expandRepeats, applyPlayOrder };")();

let pass = 0; let fail = 0;
function eq(name, got, exp) {
  const g = JSON.stringify(got); const e = JSON.stringify(exp);
  if (g === e) { pass += 1; console.log("OK  " + name); }
  else { fail += 1; console.log("NG  " + name + "\n    got " + g + "\n    exp " + e); }
}
const segs = (a) => a.map(([from, to]) => ({ from, to }));

// 1. 単純な反復 𝄆[4..12]𝄇 ×2、全16拍
//    再生順: 0→12（リードイン＋1回目）, 4→16（2回目＋末尾）。連続区間は結合される。
eq("単純反復", expandRepeats({ end: 16, repeats: [{ start: 4, end: 12, times: 2 }] }),
  segs([[0, 12], [4, 16]]));

// 2. 1番2番括弧: 反復[0..16]、1番[12..16]passes[1]、2番[16..20]passes[2]、全20拍
//    → 1回目 [0,12]+[12,16]、2回目 [0,12]+[16,20]  ＝ [0,16] [0,12] [16,20]
eq("1番2番", expandRepeats({ end: 20, repeats: [{ start: 0, end: 16, times: 2 }],
  voltas: [{ start: 12, end: 16, passes: [1] }, { start: 16, end: 20, passes: [2] }] }),
  segs([[0, 16], [0, 12], [16, 20]]));

// 3. D.C. al Fine: 全24拍、Fine=8 → 本体[0,24]の後、頭から[0,8]
eq("D.C. al Fine", expandRepeats({ end: 24, dcAlFine: { fineAt: 8 } }),
  segs([[0, 24], [0, 8]]));

// 4. D.S. al Coda: 全24拍、D.S.=16、segno=8、toCoda=12、coda=20
//    → 本体[0,16] +(D.S.でsegnoへ)[8,12] +(To Codaでcodaへ)[20,24]
eq("D.S. al Coda", expandRepeats({ end: 24, dsAlCoda: { dsAt: 16, segnoAt: 8, toCodaAt: 12, codaAt: 20 } }),
  segs([[0, 16], [8, 12], [20, 24]]));

// 5. 反復なし → そのまま
eq("反復なし", expandRepeats({ end: 12, repeats: [] }), segs([[0, 12]]));

// 6. applyPlayOrder: イベントが反復で複製され startBeat が振り直される
const ev = [{ startBeat: 0, midi: 60 }, { startBeat: 4, midi: 62 }, { startBeat: 12, midi: 64 }];
const order = expandRepeats({ end: 16, repeats: [{ start: 4, end: 12, times: 2 }] });
eq("applyPlayOrder", applyPlayOrder(ev, order).map((e) => [e.startBeat, e.midi]),
  [[0, 60], [4, 62], [12, 62], [20, 64]]);

console.log(`\n結果: ${pass} OK / ${fail} NG`);
process.exit(fail ? 1 : 0);
