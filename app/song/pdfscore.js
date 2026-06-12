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
function midiFromStaffY(y, staff) {
  const step = Math.round((staff.bottom - y) / (staff.spacing / 2)); // 0=bottom line E4
  const li = ((step % 7) + 7) % 7;
  const letter = PDF_LETTERS[li];
  // E4起点。E,F,G,A,B は同オクターブ、C,D は次オクターブへ繰り上がる
  const octave = 4 + Math.floor((step + 2) / 7);
  return PDF_SEMI[letter] + (octave + 1) * 12;
}

// ページ単位でベクター譜を読む → メロディノート（実験的）。音価も推定する。
function readVectorScorePage(ol, OPS, pageH, pageW) {
  const { glyphs, hseg, vseg, beams } = extractPageVectors(ol, OPS, pageH);
  const staves = findStaves(hseg, pageW, pageH);
  if (!staves.length || !glyphs.length) {
    return { notes: [], staves: 0 };
  }
  // 符頭グリフ: 縦位置の種類が多い上位2コード（塗り＝4分/8分、中抜き＝2分/全音符）
  const byCode = {};
  for (const g of glyphs) {
    byCode[g.code] = byCode[g.code] || { ys: new Set(), n: 0 };
    byCode[g.code].ys.add(Math.round(g.y));
    byCode[g.code].n += 1;
  }
  const ranked = Object.entries(byCode).sort((a, b) => b[1].ys.size - a[1].ys.size);
  const filledCode = ranked[0] ? ranked[0][0] : null;
  const openCode = ranked[1] && ranked[1][1].ys.size >= 10 ? ranked[1][0] : null;
  const filled = glyphs.filter((g) => String(g.code) === filledCode);
  const openGlyphs = openCode ? glyphs.filter((g) => String(g.code) === openCode) : [];
  // 中抜き候補が「臨時記号」でないか: すぐ右(2〜10px)に塗り符頭が同じYであればNG
  const openHeads = openGlyphs.filter((o) =>
    !filled.some((f) => Math.abs(f.y - o.y) < 3 && f.x - o.x > 1.5 && f.x - o.x < 11));

  const stems = vseg.filter((v) => { const len = v.y1 - v.y0; return len > 6 && len < 40; });
  const headList = filled.map((g) => ({ ...g, filled: true })).concat(openHeads.map((g) => ({ ...g, filled: false })));

  const notes = [];
  for (const h of headList) {
    let staff = null;
    let bestD = Infinity;
    for (const s of staves) {
      const c = (s.top + s.bottom) / 2;
      const d = Math.abs(h.y - c);
      if (d < bestD) { bestD = d; staff = s; }
    }
    if (!staff || bestD > staff.spacing * 14) {
      continue;
    }
    const midi = midiFromStaffY(h.y, staff);
    if (midi < 36 || midi > 88) {
      continue;
    }
    // 符幹: 符頭のx近く（±4px）で、符頭yから上下に伸びる縦線
    const stem = stems.find((v) => Math.abs(v.x - h.x) < 4 && v.y0 < h.y + 4 && v.y1 > h.y - 4);
    // 連桁: 符頭xの近くで、符頭から少し離れたy（符幹の先）に横長の塗り
    const beamed = stem && beams.some((b) =>
      h.x >= b.x0 - 3 && h.x <= b.x1 + 3 && Math.abs(b.y - h.y) > staff.spacing * 1.5 && Math.abs(b.y - h.y) < staff.spacing * 8);
    let beats;
    if (!h.filled) {
      beats = stem ? 2 : 4;           // 中抜き＋幹=2分、幹なし=全音符
    } else if (beamed) {
      beats = 0.5;                     // 塗り＋連桁=8分
    } else {
      beats = 1;                       // 塗り＋幹=4分（既定）
    }
    notes.push({ x: h.x, staffTop: staff.top, midi, beats });
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

  // 段（システム）ごとに、小節線で区切る。小節線＝五線をほぼ縦断する縦線（ページ枠は除外）。
  const systems = staves.map((s) => {
    const sh = s.bottom - s.top;
    const barX = vseg
      .filter((v) => v.y0 <= s.top + sh * 0.2 && v.y1 >= s.bottom - sh * 0.2 && (v.y1 - v.y0) >= sh * 0.7)
      .map((v) => v.x)
      .filter((x) => x > 6 && x < (pageW || 595) - 6)
      .sort((a, b) => a - b);
    // 近接した小節線をまとめる
    const bars = [];
    for (const x of barX) {
      if (!bars.length || x - bars[bars.length - 1] > 8) bars.push(x);
    }
    return { top: s.top, bottom: s.bottom, bars, notes: deduped.filter((n) => n.staffTop === s.top).sort((a, b) => a.x - b.x) };
  });
  return { systems, staves: staves.length };
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
  for (let p = 1; p <= pdf.numPages; p += 1) {
    if (onProgress) onProgress(p / pdf.numPages);
    const page = await pdf.getPage(p);
    const ol = await page.getOperatorList();
    const { systems } = readVectorScorePage(ol, OPS, pageH, pageW);
    systems.forEach((s) => allSystems.push(s));
  }

  // 各システムを上から、システム内は小節（小節線区切り）ごとに。
  // 空小節は休符として beatsPerBar ぶん進める＝出だしの休符小節も正しく前に入る。
  const melody = [];
  let beat = 0;
  let noteCount = 0;
  for (const sys of allSystems) {
    // 小節境界（最初の音符より前の小節線も含めて区切る）
    const edges = sys.bars.slice();
    // 小節範囲 [edges[i], edges[i+1]]。小節線が無い場合はシステム全体を1小節扱い。
    if (edges.length < 2) {
      // 小節線なし: 音符を音価順に詰める
      sys.notes.forEach((n) => { melody.push({ startBeat: beat, beats: n.beats || 1, midi: n.midi }); beat += n.beats || 1; noteCount += 1; });
      continue;
    }
    // 各システムは「最初の小節線より前の領域」も1小節（行頭の小節：ト音記号・調号・拍子・出だしの休符を含む）。
    // 小節範囲を [行頭, edges[0]], [edges[0], edges[1]], ... と作る。
    const placeBar = (xL, xR) => {
      const inBar = sys.notes.filter((n) => n.x >= xL - 2 && n.x < xR);
      let local = 0;
      for (const n of inBar) {
        melody.push({ startBeat: beat + local, beats: n.beats || 1, midi: n.midi });
        local += n.beats || 1;
        noteCount += 1;
      }
      beat += bpb; // 小節1つぶん進める（空小節＝休符でも進む）
    };
    placeBar(-Infinity, edges[0]); // 行頭の小節
    for (let i = 0; i < edges.length - 1; i += 1) {
      placeBar(edges[i], edges[i + 1]);
    }
  }
  return { melody, noteCount };
}
