// PDF楽譜のベクター読み取り（実験的）
// 画像OMRと違い、ベクターPDFは符頭が音楽フォントのグリフとして正確な座標で得られる。
// 伝統的OMRパイプライン（五線検出→符頭検出→五線からの距離で音程）をベクター上で行う。
// 参考: 伝統的OMR pipeline（staff detection → symbol recognition → pitch from staff position）。
// 音価は、塗り/中抜き符頭・符幹・連桁から推定（4分/8分/2分/全音符）。細部はピアノロールで手なおし。
// musicxml.js（PDFJS_CDN等）/ import.js の後に読み込む。

function pdfMul(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]
  ];
}
function pdfApply(m, x, y) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

// オペレータリストから、グリフ（音楽記号含む）と水平/垂直線分を画面座標（y下向き）で抽出
function extractPageVectors(ol, OPS, pageH) {
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  let curFont = null;
  let tm = [1, 0, 0, 1, 0, 0];
  const glyphs = [];
  const hseg = [];
  const vseg = [];
  const beams = [];
  let pend = [];
  let bbox = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
  for (let i = 0; i < ol.fnArray.length; i += 1) {
    const fn = ol.fnArray[i];
    const args = ol.argsArray[i];
    if (fn === OPS.save) { stack.push(ctm.slice()); }
    else if (fn === OPS.restore) { ctm = stack.pop() || ctm; }
    else if (fn === OPS.transform) { ctm = pdfMul(ctm, args); }
    else if (fn === OPS.setFont) { curFont = args[0]; }
    else if (fn === OPS.setTextMatrix) { tm = args.slice(); }
    else if (fn === OPS.showText) {
      const m = pdfMul(ctm, tm);
      const gs = args[0] || [];
      let adv = 0;
      for (const g of gs) {
        if (typeof g === "number") { adv -= (g / 1000) * (m[0] || 1); continue; }
        const p = pdfApply(m, adv, 0);
        const code = g.fontChar ? g.fontChar.codePointAt(0) : g.unicode;
        glyphs.push({ font: curFont, code, x: p[0], y: pageH - p[1] });
        adv += ((g.width || 0) / 1000) * (m[0] || 1);
      }
    } else if (fn === OPS.constructPath) {
      const ops = args[0];
      const co = args[1];
      let k = 0;
      let cur = null;
      pend = [];
      bbox = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
      const track = (p) => {
        bbox.minx = Math.min(bbox.minx, p[0]); bbox.maxx = Math.max(bbox.maxx, p[0]);
        bbox.miny = Math.min(bbox.miny, p[1]); bbox.maxy = Math.max(bbox.maxy, p[1]);
      };
      for (const op of ops) {
        if (op === OPS.moveTo) { cur = pdfApply(ctm, co[k], co[k + 1]); k += 2; track(cur); }
        else if (op === OPS.lineTo) { const p = pdfApply(ctm, co[k], co[k + 1]); k += 2; if (cur) pend.push([cur, p]); cur = p; track(p); }
        else if (op === OPS.curveTo) { k += 6; cur = pdfApply(ctm, co[k - 2], co[k - 1]); track(cur); }
        else if (op === OPS.rectangle) { const x = co[k]; const y = co[k + 1]; const w = co[k + 2]; const h = co[k + 3]; k += 4; const a = pdfApply(ctm, x, y); const b = pdfApply(ctm, x + w, y + h); pend.push([a, [b[0], a[1]]]); pend.push([a, [a[0], b[1]]]); track(a); track(b); }
      }
    } else if (fn === OPS.stroke || fn === OPS.eoFillStroke || fn === OPS.fill || fn === OPS.eoFill) {
      for (const [a, b] of pend) {
        const dx = Math.abs(b[0] - a[0]);
        const dy = Math.abs(b[1] - a[1]);
        if (dx > 12 && dy < 1.5) hseg.push({ y: pageH - (a[1] + b[1]) / 2, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]) });
        else if (dy > 8 && dx < 1.6) vseg.push({ x: (a[0] + b[0]) / 2, y0: pageH - Math.max(a[1], b[1]), y1: pageH - Math.min(a[1], b[1]) });
      }
      // 連桁（ビーム）候補: 横長・薄い塗り
      if ((fn === OPS.fill || fn === OPS.eoFill) && bbox.maxx > bbox.minx) {
        const w = bbox.maxx - bbox.minx;
        const h = bbox.maxy - bbox.miny;
        if (w >= 6 && w <= 40 && h >= 1 && h <= 6) {
          beams.push({ x0: bbox.minx, x1: bbox.maxx, y: pageH - (bbox.miny + bbox.maxy) / 2 });
        }
      }
      pend = [];
    }
  }
  return { glyphs, hseg, vseg, beams };
}

function medianOfArray(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// 五線検出: 「横長の線（五線）だけ」をYでクラスタし、主要な間隔で等間隔の5本組を見つける。
// 歌詞のベースラインや短い線、ページ枠を除外して誤検出を防ぐ。
function findStaves(hseg, pageWidth, pageHeight) {
  const minSpan = (pageWidth || 595) * 0.3;
  const maxSpan = (pageWidth || 595) * 0.97; // これ以上はページ枠
  // Yでクラスタ（x範囲も集計）
  const sorted = [...hseg].sort((a, b) => a.y - b.y);
  const clusters = [];
  for (const h of sorted) {
    const c = clusters[clusters.length - 1];
    if (c && Math.abs(c.y - h.y) < 1.5) {
      c.ys.push(h.y);
      c.y = c.ys.reduce((s, v) => s + v, 0) / c.ys.length;
      c.x0 = Math.min(c.x0, h.x0);
      c.x1 = Math.max(c.x1, h.x1);
    } else {
      clusters.push({ y: h.y, ys: [h.y], x0: h.x0, x1: h.x1 });
    }
  }
  // 五線らしい線（横長・ページ枠でない）だけ
  const lineYs = clusters
    .filter((c) => {
      const span = c.x1 - c.x0;
      return span > minSpan && span < maxSpan && c.y > 4 && c.y < (pageHeight || 842) - 4;
    })
    .map((c) => c.y)
    .sort((a, b) => a - b);
  if (lineYs.length < 5) {
    return [];
  }
  // 主要な五線間隔（隣接ギャップのうち、線内っぽい小さいもののメディアン）
  const gaps = [];
  for (let i = 1; i < lineYs.length; i += 1) {
    const g = lineYs[i] - lineYs[i - 1];
    if (g > 2 && g < 12) gaps.push(g);
  }
  const spacing = medianOfArray(gaps) || 4.4;
  const tol = spacing * 0.35;
  // 主要間隔で等間隔に並ぶ5本を貪欲に拾う
  const staves = [];
  for (let i = 0; i + 4 < lineYs.length; i += 1) {
    let ok = true;
    for (let j = 1; j < 5; j += 1) {
      if (Math.abs((lineYs[i + j] - lineYs[i + j - 1]) - spacing) > tol) { ok = false; break; }
    }
    if (ok) {
      staves.push({ lines: lineYs.slice(i, i + 5), spacing, top: lineYs[i], bottom: lineYs[i + 4] });
      i += 4;
    }
  }
  return staves;
}

// 符頭y → トレブル譜の音程（bottom line=E4=64、half-spacing=1ダイアトニック）
const PDF_LETTERS = ["E", "F", "G", "A", "B", "C", "D"];
const PDF_SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function staffStepFromY(y, staff) {
  return Math.round((staff.bottom - y) / (staff.spacing / 2)); // 0=bottom line E4
}
function midiFromStaffY(y, staff) {
  const step = staffStepFromY(y, staff);
  const li = ((step % 7) + 7) % 7;
  const letter = PDF_LETTERS[li];
  // E4起点。E,F,G,A,B は同オクターブ、C,D は次オクターブへ繰り上がる
  const octave = 4 + Math.floor((step + 2) / 7);
  return PDF_SEMI[letter] + (octave + 1) * 12;
}

// ===== 調号 =====
// step（E4=0）→ C基準の幹音インデックス（C=0..B=6）
function pdfLetterCFromStep(step) {
  return [2, 3, 4, 5, 6, 0, 1][((step % 7) + 7) % 7];
}
const PDF_NATURAL_PC = [0, 2, 4, 5, 7, 9, 11]; // C,D,E,F,G,A,B
const PDF_SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6]; // F,C,G,D,A,E,B
const PDF_FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];  // B,E,A,D,G,C,F

// 調号 K（五度圏: ♯=正/♭=負）が幹音 letterC に与える変化（-1/0/+1）
function pdfKeyAlter(letterC, K) {
  if (K > 0) return PDF_SHARP_ORDER.slice(0, K).includes(letterC) ? 1 : 0;
  if (K < 0) return PDF_FLAT_ORDER.slice(0, -K).includes(letterC) ? -1 : 0;
  return 0;
}

// 調号グリフの検出。多くのエンジン出力で調号は同一グリフ（font+code）の繰り返し。
// このタイプのPDFでは個々のY座標が潰れて記録されるため、位置でなく
// 「クレフと最初の音符の間に、同じグリフが n 個」という形で個数だけを取る。
// ♭か♯かはあとで調推定（Krumhansl-Kessler）との整合で決める。
function detectKeySigGlyph(glyphs, staves, noteheadKeys) {
  const perStaff = [];
  for (const s of staves) {
    const mine = glyphs.filter((g) => {
      let best = null; let bestD = Infinity;
      for (const t of staves) {
        const d = Math.abs(g.y - (t.top + t.bottom) / 2);
        if (d < bestD) { bestD = d; best = t; }
      }
      return best === s && bestD < s.spacing * 10;
    }).sort((a, b) => a.x - b.x);
    if (!mine.length) continue;
    const heads = mine.filter((g) => noteheadKeys.has(`${g.font}/${g.code}`));
    const firstNoteX = heads.length ? heads[0].x : Infinity;
    const leftmostX = mine[0].x;
    // クレフ（左端グリフ）と最初の音符の間のグリフを font+code でグループ化
    const groups = new Map();
    for (const g of mine) {
      if (g.x <= leftmostX + 2 || g.x >= firstNoteX - 2) continue;
      const k = `${g.font}/${g.code}`;
      if (noteheadKeys.has(k)) continue;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(g);
    }
    for (const [k, gs] of groups) {
      const xs = gs.map((g) => g.x);
      const spread = Math.max(...xs) - Math.min(...xs);
      if (gs.length >= 1 && gs.length <= 7 && spread < staves[0].spacing * 8) {
        perStaff.push({ key: k, count: gs.length, x: Math.min(...xs) });
      }
    }
  }
  if (!perStaff.length) return null;
  // 全段で一貫して現れる（過半数）グループが調号。拍子の数字は最初の段にしか出ない。
  const tally = new Map();
  for (const c of perStaff) {
    const k = `${c.key}#${c.count}`;
    tally.set(k, (tally.get(k) || 0) + 1);
  }
  let best = null;
  for (const [k, n] of tally) {
    if (n >= Math.max(2, staves.length * 0.6) && (!best || n > best.n)) {
      const [key, count] = [k.slice(0, k.lastIndexOf("#")), Number(k.slice(k.lastIndexOf("#") + 1))];
      best = { key, count, n };
    }
  }
  return best ? { glyphKey: best.key, count: best.count } : null;
}

// Krumhansl-Kessler 調プロファイル
const PDF_KK_MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const PDF_KK_MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
// 長調主音pc → 調号（五度圏）。異名同音は複数許容。
const PDF_SIG_OF_MAJOR_PC = [[0], [-5, 7], [2], [-3], [4], [-1], [6, -6], [1], [-4], [3], [-2], [5, -7]];

function pdfCorrelate(hist, profile, tonic) {
  const n = 12;
  let sa = 0; let sb = 0;
  for (let i = 0; i < n; i += 1) { sa += hist[i]; sb += profile[i]; }
  const ma = sa / n; const mb = sb / n;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < n; i += 1) {
    const a = hist[i] - ma;
    const b = profile[((i - tonic) % 12 + 12) % 12] - mb;
    num += a * b; da += a * a; db += b * b;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

// 仮説調号 K ごとに「letters＋K で復元したメロディ」の調をKK推定し、
// 推定調の調号が K 自身と一致する（自己整合する）仮説のうち相関最大を採用。
function choosePdfKeySignature(steps, hypotheses) {
  let best = null;
  for (const K of hypotheses) {
    const hist = new Array(12).fill(0);
    for (const s of steps) {
      const letterC = pdfLetterCFromStep(s.step);
      const pc = ((PDF_NATURAL_PC[letterC] + pdfKeyAlter(letterC, K)) % 12 + 12) % 12;
      hist[pc] += s.beats || 1;
    }
    for (let tonic = 0; tonic < 12; tonic += 1) {
      const candidates = [
        { r: pdfCorrelate(hist, PDF_KK_MAJ, tonic), majorPc: tonic, mode: "major" },
        { r: pdfCorrelate(hist, PDF_KK_MIN, tonic), majorPc: (tonic + 3) % 12, mode: "minor" }
      ];
      for (const c of candidates) {
        if (!PDF_SIG_OF_MAJOR_PC[c.majorPc].includes(K)) continue;
        if (!best || c.r > best.r) best = { r: c.r, fifths: K, tonic, mode: c.mode };
      }
    }
  }
  return best;
}

// ページ単位でベクター譜を読む → メロディノート（実験的）。
// 人間の読譜のプロセスに寄せた構造ベースの記号認識:
//  ・符頭 = 「符幹の端にぶら下がるグリフ」（出現統計でなく構造で同定）
//  ・旗 = 符幹の反対側の端（符頭が付いている端の逆）に付くグリフ → 8分
//  ・白玉/黒玉 = 連桁・旗と共起しないコードが白玉（2分・全音符）
//  ・休符 = 五線の中段に居て符幹に付かないグリフ → 小節内の拍配分に使う
function readVectorScorePage(ol, OPS, pageH, pageW) {
  const { glyphs: rawGlyphs, hseg, vseg, beams } = extractPageVectors(ol, OPS, pageH);
  const staves = findStaves(hseg, pageW, pageH);
  if (!staves.length || !rawGlyphs.length) {
    return { systems: [], staves: 0, keyCand: null };
  }
  const spacing = staves[0].spacing;
  // 注意: 同座標に重なったグリフ（調号の♭4枚など）は正規の表現なので潰さない
  const glyphs = rawGlyphs;
  const keyOf = (g) => `${g.font}/${g.code}`;
  const nearestStaff = (y) => {
    let staff = null;
    let bd = Infinity;
    for (const s of staves) {
      const d = Math.abs(y - (s.top + s.bottom) / 2);
      if (d < bd) { bd = d; staff = s; }
    }
    return { staff, d: bd };
  };

  // 縦線はすべて符幹候補（小節線かどうかは符頭が同定できた後に判定する）
  const stems = [];
  for (const v of vseg) {
    const len = v.y1 - v.y0;
    if (len < 6 || len > 40) continue;
    stems.push(v);
  }
  // グリフが符幹のどちらかの端に付いているか（符頭・旗の位置関係）
  const stemAt = (g) => stems.find((v) => {
    const dx = g.x - v.x;
    if (dx <= -8 || dx >= 4) return false;
    return Math.abs(g.y - v.y0) < 3.2 || Math.abs(g.y - v.y1) < 3.2;
  });
  const beamAtEnd = (v, endY) => beams.some((b) =>
    v.x >= b.x0 - 3 && v.x <= b.x1 + 3 && Math.abs(b.y - endY) < spacing * 1.8);

  // font+code ごとの構造統計
  const stat = new Map();
  for (const g of glyphs) {
    const k = keyOf(g);
    if (!stat.has(k)) stat.set(k, { count: 0, ys: new Set(), stemEnd: 0, beamEnd: 0, flagLike: 0 });
    const s = stat.get(k);
    s.count += 1;
    s.ys.add(Math.round(g.y));
  }
  for (const g of glyphs) {
    const v = stemAt(g);
    if (!v) continue;
    const s = stat.get(keyOf(g));
    const otherY = Math.abs(g.y - v.y0) < 3.2 ? v.y1 : v.y0;
    s.stemEnd += 1;
    if (beamAtEnd(v, otherY)) s.beamEnd += 1;
  }
  // 黒玉（塗り符頭）= 符幹の端に最も多く付くコード
  let filledKey = null;
  let filledBest = 0;
  for (const [k, s] of stat) {
    if (s.ys.size >= 8 && s.stemEnd >= s.count * 0.45 && s.stemEnd > filledBest) {
      filledBest = s.stemEnd;
      filledKey = k;
    }
  }
  if (!filledKey) {
    return { systems: [], staves: staves.length, keyCand: null };
  }
  // 旗らしさ: 符幹の反対側の端に黒玉が付いている（→そのグリフは旗であって符頭ではない）
  const filledGlyphs = glyphs.filter((g) => keyOf(g) === filledKey);
  const filledAtEnd = (v, endY) => filledGlyphs.some((g) =>
    Math.abs(g.y - endY) < 3.2 && g.x - v.x > -8 && g.x - v.x < 4);
  for (const g of glyphs) {
    if (keyOf(g) === filledKey) continue;
    const v = stemAt(g);
    if (!v) continue;
    const otherY = Math.abs(g.y - v.y0) < 3.2 ? v.y1 : v.y0;
    if (filledAtEnd(v, otherY)) stat.get(keyOf(g)).flagLike += 1;
  }
  // 白玉（中抜き符頭）= 符幹の端に付くが、連桁と無縁で、旗でもないコード
  let openKey = null;
  let openBest = 0;
  for (const [k, s] of stat) {
    if (k === filledKey) continue;
    if (s.count >= 3 && s.ys.size >= 3 && s.stemEnd >= s.count * 0.3 &&
        s.beamEnd === 0 && s.flagLike <= s.count * 0.2 && s.stemEnd > openBest) {
      openBest = s.stemEnd;
      openKey = k;
    }
  }

  const headList = glyphs
    .filter((g) => keyOf(g) === filledKey || keyOf(g) === openKey)
    .map((g) => ({ ...g, filled: keyOf(g) === filledKey }));

  // 重なり合うグリフ（調号・拍子の数字などは同座標に積まれる）
  const stackCount = new Map();
  for (const g of glyphs) {
    const k = `${Math.round(g.x)}/${Math.round(g.y)}`;
    stackCount.set(k, (stackCount.get(k) || 0) + 1);
  }
  const isStacked = (g) => (stackCount.get(`${Math.round(g.x)}/${Math.round(g.y)}`) || 0) >= 2;

  const notes = [];
  for (const h of headList) {
    const { staff, d } = nearestStaff(h.y);
    if (!staff || d > staff.spacing * 14) {
      continue;
    }
    const midi = midiFromStaffY(h.y, staff);
    if (midi < 36 || midi > 88) {
      continue;
    }
    const stem = stemAt(h);
    let beamed = false;
    let flagged = false;
    if (stem) {
      const tipY = Math.abs(h.y - stem.y0) < 3.2 ? stem.y1 : stem.y0;
      beamed = beamAtEnd(stem, tipY);
      // 旗: 符幹の先（符頭の反対の端）に付く別グリフ
      flagged = !beamed && glyphs.some((g) =>
        keyOf(g) !== filledKey && keyOf(g) !== openKey &&
        Math.abs(g.y - tipY) < 3.2 && g.x - stem.x > -2 && g.x - stem.x < 7);
    }
    let beats;
    if (!h.filled) {
      beats = stem ? 2 : 4;            // 白玉＋幹=2分、幹なし=全音符
    } else if (beamed || flagged) {
      beats = 0.5;                     // 黒玉＋連桁/旗=8分
    } else {
      beats = 1;                       // 黒玉＋幹=4分（既定）
    }
    notes.push({ x: h.x, y: h.y, staffTop: staff.top, step: staffStepFromY(h.y, staff), midi, beats });
  }
  // 重複符頭の除去
  notes.sort((a, b) => (a.staffTop - b.staffTop) || (a.x - b.x));
  const deduped = [];
  for (const n of notes) {
    const last = deduped[deduped.length - 1];
    if (last && last.staffTop === n.staffTop && Math.abs(last.x - n.x) < 2.5 && last.midi === n.midi) {
      continue;
    }
    deduped.push(n);
  }

  // 休符候補: 符頭と同じ音楽フォントで、五線の中段に居て、符幹に付かず、
  // 重なりグリフ（調号・拍子）でも、符頭の直前の臨時記号でもないコード
  const musicFont = filledKey.slice(0, filledKey.indexOf("/"));
  const restQualifies = (g) => {
    const { staff, d } = nearestStaff(g.y);
    if (!staff || d > spacing * 6) return false;
    const mid = (staff.top + staff.bottom) / 2;
    if (Math.abs(g.y - mid) > spacing * 1.9) return false;
    if (stemAt(g) || isStacked(g)) return false;
    // 直後に符頭がある → 臨時記号
    if (deduped.some((n) => n.x - g.x > 1.5 && n.x - g.x < 11 && Math.abs(n.y - g.y) < 3)) return false;
    // 段の左端（クレフ・調号ゾーン）は除外
    const leftmost = glyphs.reduce((m, o) => {
      const ns = nearestStaff(o.y).staff;
      return ns === staff && o.x < m ? o.x : m;
    }, Infinity);
    if (g.x < leftmost + spacing * 4) return false;
    return true;
  };
  const restCodes = new Set();
  for (const [k, s] of stat) {
    if (k === filledKey || k === openKey) continue;
    if (!k.startsWith(musicFont + "/")) continue;
    if (s.count < 3 || s.flagLike > s.count * 0.2) continue;
    const occ = glyphs.filter((g) => keyOf(g) === k);
    const q = occ.filter(restQualifies);
    if (q.length >= occ.length * 0.7) restCodes.add(k);
  }
  const restList = glyphs.filter((g) => restCodes.has(keyOf(g)) && restQualifies(g));

  // 段（システム）ごとに、小節線で区切る。
  // 小節線＝五線をほぼ縦断する縦線のうち、どちらの端にも符頭が付いていないもの。
  // （上の音から下の音へ伸びる符幹も五線を縦断しうるので、符頭の有無で見分ける＝人間と同じ）
  const headAtEitherEnd = (v) => deduped.some((n) => {
    const dx = n.x - v.x;
    if (dx <= -8 || dx >= 4) return false;
    return Math.abs(n.y - v.y0) < 4 || Math.abs(n.y - v.y1) < 4;
  });
  const systems = staves.map((s) => {
    const sh = s.bottom - s.top;
    const barX = vseg
      .filter((v) => v.y0 <= s.top + sh * 0.2 && v.y1 >= s.bottom - sh * 0.2 && (v.y1 - v.y0) >= sh * 0.7)
      .filter((v) => !headAtEitherEnd(v))
      .map((v) => v.x)
      .filter((x) => x > 6 && x < (pageW || 595) - 6)
      .sort((a, b) => a - b);
    // 近接した小節線をまとめる
    const bars = [];
    for (const x of barX) {
      if (!bars.length || x - bars[bars.length - 1] > 8) bars.push(x);
    }
    return {
      top: s.top,
      bottom: s.bottom,
      bars,
      notes: deduped.filter((n) => n.staffTop === s.top).sort((a, b) => a.x - b.x),
      rests: restList.filter((r) => nearestStaff(r.y).staff === s).sort((a, b) => a.x - b.x)
    };
  });

  // 調号グリフ（個数）と、音符の左に付く同グリフの臨時記号
  const noteheadKeys = new Set([filledKey, openKey].filter(Boolean));
  const keyCand = detectKeySigGlyph(glyphs, staves, noteheadKeys);
  if (keyCand) {
    const keyGlyphs = glyphs.filter((g) => keyOf(g) === keyCand.glyphKey);
    const singles = keyGlyphs.filter((g) => !isStacked(g));
    for (const n of deduped) {
      n.accSame = singles.some((g) => g.x < n.x - 1.5 && g.x > n.x - 11 && Math.abs(g.y - n.y) < 2.5);
    }
  }
  return { systems, staves: staves.length, keyCand };
}

// PDF全ページのベクター譜 → 拍つきメロディ（音価＋小節線で配置。空小節＝休符が前に入る）。
async function extractPdfVectorMelody(file, getDocument, OPS, onProgress, beatsPerBar = 4) {
  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data }).promise;
  const viewport0 = (await pdf.getPage(1)).getViewport({ scale: 1 });
  const pageH = viewport0.viewBox[3];
  const pageW = viewport0.viewBox[2];
  const bpb = Number(beatsPerBar) || 4;
  const allSystems = [];
  const keyCands = [];
  for (let p = 1; p <= pdf.numPages; p += 1) {
    if (onProgress) onProgress(p / pdf.numPages);
    const page = await pdf.getPage(p);
    const ol = await page.getOperatorList();
    const { systems, keyCand } = readVectorScorePage(ol, OPS, pageH, pageW);
    if (keyCand) keyCands.push(keyCand);
    systems.forEach((s) => allSystems.push({ ...s, page: p }));
  }

  // 調号: グリフ個数（ページ多数決）で仮説を絞り、♭か♯かはKK調推定との自己整合で決める
  const allNotes = allSystems.flatMap((s) => s.notes);
  let sigCount = null;
  if (keyCands.length) {
    const tally = new Map();
    for (const c of keyCands) tally.set(c.count, (tally.get(c.count) || 0) + 1);
    sigCount = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  const hypotheses = sigCount ? [-sigCount, sigCount] : [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  const keyPick = allNotes.length ? choosePdfKeySignature(allNotes, hypotheses) : null;
  const fifths = keyPick ? keyPick.fifths : 0;

  // 各システムを上から、システム内は小節（小節線区切り）ごとに。
  // 空小節は休符として beatsPerBar ぶん進める＝出だしの休符小節も正しく前に入る。
  const melody = [];
  let beat = 0;
  let noteCount = 0;
  const keyedMidi = (n) => {
    // 調号による変化。音符の左に調号と同じグリフ（臨時記号）があればそちらを優先
    let alter = pdfKeyAlter(pdfLetterCFromStep(n.step), fifths);
    if (n.accSame && fifths !== 0) alter = fifths < 0 ? -1 : 1;
    return n.midi + alter;
  };
  for (const sys of allSystems) {
    // 小節境界（最初の音符より前の小節線も含めて区切る）
    const edges = sys.bars.slice();
    const place = (n, startBeat) => {
      melody.push({ startBeat, beats: n.beats || 1, midi: keyedMidi(n), page: sys.page, x: n.x, y: n.y });
      noteCount += 1;
    };
    // 小節範囲 [edges[i], edges[i+1]]。小節線が無い場合はシステム全体を1小節扱い。
    if (edges.length < 2) {
      // 小節線なし: 音符を音価順に詰める
      sys.notes.forEach((n) => { place(n, beat); beat += n.beats || 1; });
      continue;
    }
    // 各システムは「最初の小節線より前の領域」も1小節（行頭の小節：ト音記号・調号・拍子・出だしの休符を含む）。
    // 小節範囲を [行頭, edges[0]], [edges[0], edges[1]], ... と作る。
    // 小節内に休符があれば、「小節の合計は拍子ぶん」という制約から逆算して
    // 余り拍を休符に配分する（休符の後の音符が正しい拍に置かれる）。
    const placeBar = (xL, xR) => {
      const inBar = sys.notes.filter((n) => n.x >= xL - 2 && n.x < xR);
      const inRests = (sys.rests || []).filter((r) => r.x >= xL - 2 && r.x < xR);
      const noteSum = inBar.reduce((s, n) => s + (n.beats || 1), 0);
      const gap = bpb - noteSum;
      const restBeats = inRests.length && gap > 0 ? gap / inRests.length : 0;
      const items = inBar.map((n) => ({ rest: false, x: n.x, n }))
        .concat(inRests.map((r) => ({ rest: true, x: r.x })))
        .sort((a, b) => a.x - b.x);
      let local = 0;
      for (const it of items) {
        if (it.rest) {
          local += restBeats;
        } else {
          place(it.n, beat + local);
          local += it.n.beats || 1;
        }
      }
      beat += bpb; // 小節1つぶん進める（空小節＝休符でも進む）
    };
    placeBar(-Infinity, edges[0]); // 行頭の小節
    for (let i = 0; i < edges.length - 1; i += 1) {
      placeBar(edges[i], edges[i + 1]);
    }
  }
  const keySig = keyPick ? { fifths, mode: keyPick.mode, tonic: keyPick.tonic } : null;
  return { melody, noteCount, keySig, pages: pdf.numPages, pageWidth: pageW, pageHeight: pageH };
}
