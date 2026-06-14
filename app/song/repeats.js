// 繰り返し（リピート/1番2番/D.C./D.S./Coda）の「再生順」展開エンジン。
// 認識した構造(structure)から、実際に演奏される拍区間の並び(playOrder)を計算する。
// 純ロジックなので単体テスト可能。認識(pdfscore)が structure を埋める。
//
// structure = {
//   end,                                  // 総拍数
//   repeats: [{ start, end, times }],     // 𝄆start … 𝄇end を times 回（既定2）
//   voltas:  [{ start, end, passes }],    // 1番/2番括弧（passes=[1] はその区間を1回目のみ）
//   dcAlFine: { fineAt } | null,          // D.C. al Fine（曲頭へ戻り Fine で終了）
//   dsAlCoda: { segnoAt, toCodaAt, codaAt } | null // D.S. al Coda
// }

function mergeSegs(segs) {
  // 連続する区間（from が直前の to に一致）をまとめる
  const out = [];
  for (const s of segs) {
    if (s.to - s.from < 1e-6) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last.to - s.from) < 1e-6) last.to = s.to;
    else out.push({ from: s.from, to: s.to });
  }
  return out;
}

function expandRepeats(structure) {
  const s = structure || {};
  const end = s.end || 0;
  // D.C./D.S. の指示位置までが「本体」。指定が無ければ曲末まで（D.C.は通常曲末）。
  const bodyEnd = (s.dcAlFine && s.dcAlFine.dcAt != null) ? s.dcAlFine.dcAt
    : (s.dsAlCoda && s.dsAlCoda.dsAt != null) ? s.dsAlCoda.dsAt
      : end;
  const repeats = (s.repeats || []).filter((r) => r.start < bodyEnd + 1e-6).sort((a, b) => a.start - b.start);
  const voltas = s.voltas || [];
  const segs = [];
  let pos = 0;
  let ri = 0;
  let guard = 0;
  while (pos < bodyEnd - 1e-6 && guard++ < 100000) {
    let rep = repeats[ri];
    while (rep && pos > rep.start + 1e-6) { ri += 1; rep = repeats[ri]; } // 通り過ぎた反復は捨てる
    if (rep && Math.abs(pos - rep.start) < 1e-6) {
      const times = rep.times || 2;
      // この反復に属する volta（共通部の後、各パスで切り替わる）
      const vs = voltas
        .filter((v) => v.start >= rep.start - 1e-6 && v.start <= rep.end + 1e-6)
        .sort((a, b) => a.start - b.start);
      let lastEnd = rep.end;
      for (let pass = 1; pass <= times; pass += 1) {
        if (!vs.length) {
          segs.push({ from: rep.start, to: rep.end });
        } else {
          segs.push({ from: rep.start, to: vs[0].start }); // 共通部
          const v = vs.find((vv) => vv.passes.includes(pass)) || vs[vs.length - 1];
          segs.push({ from: v.start, to: v.end });
          lastEnd = Math.max(lastEnd, v.end);
        }
      }
      pos = lastEnd;
      ri += 1;
    } else {
      const nextStart = rep ? rep.start : bodyEnd;
      if (nextStart > pos + 1e-6) segs.push({ from: pos, to: nextStart });
      pos = nextStart;
    }
  }
  // D.C. al Fine / D.S. al Coda（本体の後に付ける）
  if (s.dcAlFine) {
    segs.push({ from: 0, to: s.dcAlFine.fineAt });
  } else if (s.dsAlCoda) {
    segs.push({ from: s.dsAlCoda.segnoAt, to: s.dsAlCoda.toCodaAt });
    segs.push({ from: s.dsAlCoda.codaAt, to: end });
  }
  return mergeSegs(segs);
}

// playOrder に従って、拍つきイベント列（melody/chord）を展開した並びへ写像する。
// 各イベント {startBeat, ...} を、それが入る区間ぶん複製し、新しい startBeat を振り直す。
function applyPlayOrder(events, playOrder) {
  if (!playOrder || !playOrder.length) return events.slice();
  const out = [];
  let outBeat = 0;
  for (const seg of playOrder) {
    const len = seg.to - seg.from;
    for (const ev of events) {
      const b = ev.startBeat;
      if (b >= seg.from - 1e-6 && b < seg.to - 1e-6) {
        out.push({ ...ev, startBeat: Math.round((outBeat + (b - seg.from)) * 1000) / 1000 });
      }
    }
    outBeat += len;
  }
  out.sort((a, b) => a.startBeat - b.startBeat);
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { expandRepeats, applyPlayOrder, mergeSegs };
}
