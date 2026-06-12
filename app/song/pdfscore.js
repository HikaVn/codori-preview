// PDF楽譜のベクター読み取り（実験的）
// 画像OMRと違い、ベクターPDFは符頭が音楽フォントのグリフとして正確な座標で得られる。
// 伝統的OMRパイプライン（五線検出→符頭検出→五線からの距離で音程）をベクター上で行う。
// 参考: 伝統的OMR pipeline（staff detection → symbol recognition → pitch from staff position）。
// 音価（音符の長さ）は符頭位置だけからは復元できないので一律にし、ピアノロールで手なおしする前提。
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
  let pend = [];
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
      for (const op of ops) {
        if (op === OPS.moveTo) { cur = pdfApply(ctm, co[k], co[k + 1]); k += 2; }
        else if (op === OPS.lineTo) { const p = pdfApply(ctm, co[k], co[k + 1]); k += 2; if (cur) pend.push([cur, p]); cur = p; }
        else if (op === OPS.curveTo) { k += 6; cur = pdfApply(ctm, co[k - 2], co[k - 1]); }
        else if (op === OPS.rectangle) { const x = co[k]; const y = co[k + 1]; const w = co[k + 2]; const h = co[k + 3]; k += 4; const a = pdfApply(ctm, x, y); const b = pdfApply(ctm, x + w, y + h); pend.push([a, [b[0], a[1]]]); pend.push([a, [a[0], b[1]]]); }
      }
    } else if (fn === OPS.stroke || fn === OPS.eoFillStroke || fn === OPS.fill || fn === OPS.eoFill) {
      for (const [a, b] of pend) {
        const dx = Math.abs(b[0] - a[0]);
        const dy = Math.abs(b[1] - a[1]);
        if (dx > 12 && dy < 1.5) hseg.push({ y: pageH - (a[1] + b[1]) / 2, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]) });
        else if (dy > 8 && dx < 1.6) vseg.push({ x: (a[0] + b[0]) / 2, y0: pageH - Math.max(a[1], b[1]), y1: pageH - Math.min(a[1], b[1]) });
      }
      pend = [];
    }
  }
  return { glyphs, hseg, vseg };
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
function midiFromStaffY(y, staff) {
  const step = Math.round((staff.bottom - y) / (staff.spacing / 2)); // 0=bottom line E4
  const li = ((step % 7) + 7) % 7;
  const letter = PDF_LETTERS[li];
  // E4起点。E,F,G,A,B は同オクターブ、C,D は次オクターブへ繰り上がる
  const octave = 4 + Math.floor((step + 2) / 7);
  return PDF_SEMI[letter] + (octave + 1) * 12;
}

// ページ単位でベクター譜を読む → メロディノート（実験的）
function readVectorScorePage(ol, OPS, pageH, pageW) {
  const { glyphs, hseg } = extractPageVectors(ol, OPS, pageH);
  const staves = findStaves(hseg, pageW, pageH);
  if (!staves.length || !glyphs.length) {
    return { notes: [], staves: 0 };
  }
  // 符頭グリフ = 縦位置の種類が最も多いコード（音楽フォントの最頻記号）
  const byCode = {};
  for (const g of glyphs) {
    byCode[g.code] = byCode[g.code] || new Set();
    byCode[g.code].add(Math.round(g.y));
  }
  const headCode = Object.entries(byCode).sort((a, b) => b[1].size - a[1].size)[0][0];
  const heads = glyphs.filter((g) => String(g.code) === headCode);

  const notes = [];
  for (const h of heads) {
    // 最も近い五線に割り当て（中心が±2オクターブ＝加線範囲内のものだけ）
    let staff = null;
    let bestD = Infinity;
    for (const s of staves) {
      const c = (s.top + s.bottom) / 2;
      const d = Math.abs(h.y - c);
      if (d < bestD) { bestD = d; staff = s; }
    }
    if (!staff || bestD > staff.spacing * 14) {
      continue; // 五線から遠すぎる＝誤検出
    }
    const midi = midiFromStaffY(h.y, staff);
    if (midi < 36 || midi > 88) {
      continue; // 声域外＝誤り
    }
    notes.push({ x: h.x, staffTop: staff.top, midi });
  }
  // 重複符頭の除去（同じ段で x がほぼ同じ＆同音＝二重検出や付点を1つに）
  notes.sort((a, b) => (a.staffTop - b.staffTop) || (a.x - b.x));
  const deduped = [];
  for (const n of notes) {
    const last = deduped[deduped.length - 1];
    if (last && last.staffTop === n.staffTop && Math.abs(last.x - n.x) < 2.5 && last.midi === n.midi) {
      continue;
    }
    deduped.push(n);
  }
  return { notes: deduped, staves: staves.length };
}

// PDF全ページのベクター譜 → 拍つきメロディ。
// 譜段（システム）を上から順、その中はx昇順で読み、ノートを一律の音価で並べる。
async function extractPdfVectorMelody(file, getDocument, OPS, onProgress) {
  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data }).promise;
  const viewport0 = (await pdf.getPage(1)).getViewport({ scale: 1 });
  const pageH = viewport0.viewBox[3];
  const pageW = viewport0.viewBox[2];
  const ordered = [];
  for (let p = 1; p <= pdf.numPages; p += 1) {
    if (onProgress) onProgress(p / pdf.numPages);
    const page = await pdf.getPage(p);
    const ol = await page.getOperatorList();
    const { notes } = readVectorScorePage(ol, OPS, pageH, pageW);
    // システム（譜段）ごと＝staffTopでグルーピングし、上から、各段内はx昇順
    notes.sort((a, b) => (a.staffTop - b.staffTop) || (a.x - b.x));
    notes.forEach((n) => ordered.push({ page: p, ...n }));
  }
  // 読み順に1音1拍で並べる（音価はあとでピアノロール／手なおし）
  const melody = ordered.map((n, i) => ({ startBeat: i, beats: 1, midi: n.midi }));
  return { melody, noteCount: ordered.length };
}
