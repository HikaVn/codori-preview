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
  let tlm = [1, 0, 0, 1, 0, 0]; // テキスト行マトリクス（Td/Tm/BTで更新）
  const glyphs = [];
  const hseg = [];
  const vseg = [];
  const beams = [];
  const arcs = []; // タイ/スラー候補（曲線パス）
  let pend = [];
  let pts = [];
  let hasCurve = false;
  let bbox = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
  for (let i = 0; i < ol.fnArray.length; i += 1) {
    const fn = ol.fnArray[i];
    const args = ol.argsArray[i];
    if (fn === OPS.save) { stack.push(ctm.slice()); }
    else if (fn === OPS.restore) { ctm = stack.pop() || ctm; }
    else if (fn === OPS.transform) { ctm = pdfMul(ctm, args); }
    else if (fn === OPS.setFont) { curFont = args[0]; }
    else if (fn === OPS.beginText) { tm = [1, 0, 0, 1, 0, 0]; tlm = [1, 0, 0, 1, 0, 0]; }
    else if (fn === OPS.setTextMatrix) { tm = args.slice(); tlm = args.slice(); }
    // Td/TD（テキスト行の移動）。各グリフがこれで配置されるType3譜面では必須。
    else if (fn === OPS.moveText || fn === OPS.setLeadingMoveText) {
      tlm = pdfMul(tlm, [1, 0, 0, 1, args[0], args[1]]);
      tm = tlm.slice();
    }
    else if (fn === OPS.nextLine) { tlm = pdfMul(tlm, [1, 0, 0, 1, 0, 0]); tm = tlm.slice(); }
    else if (fn === OPS.showText) {
      const m = pdfMul(ctm, tm);
      const gs = args[0] || [];
      let adv = 0;
      for (const g of gs) {
        if (typeof g === "number") { adv -= (g / 1000) * (m[0] || 1); continue; }
        const p = pdfApply(m, adv, 0);
        const code = g.fontChar ? g.fontChar.codePointAt(0) : g.unicode;
        // SMuFL コードポイント（音楽フォントの意味コード）。あれば記号の種類が確定する。
        const smufl = g.unicode ? g.unicode.codePointAt(0) : 0;
        glyphs.push({ font: curFont, code, smufl, x: p[0], y: pageH - p[1] });
        adv += ((g.width || 0) / 1000) * (m[0] || 1);
      }
    } else if (fn === OPS.constructPath) {
      const ops = args[0];
      const co = args[1];
      let k = 0;
      let cur = null;
      pend = [];
      pts = [];
      hasCurve = false;
      bbox = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
      const track = (p) => {
        bbox.minx = Math.min(bbox.minx, p[0]); bbox.maxx = Math.max(bbox.maxx, p[0]);
        bbox.miny = Math.min(bbox.miny, p[1]); bbox.maxy = Math.max(bbox.maxy, p[1]);
        pts.push(p);
      };
      for (const op of ops) {
        if (op === OPS.moveTo) { cur = pdfApply(ctm, co[k], co[k + 1]); k += 2; track(cur); }
        else if (op === OPS.lineTo) { const p = pdfApply(ctm, co[k], co[k + 1]); k += 2; if (cur) pend.push([cur, p]); cur = p; track(p); }
        else if (op === OPS.curveTo) { hasCurve = true; k += 6; cur = pdfApply(ctm, co[k - 2], co[k - 1]); track(cur); }
        else if (op === OPS.rectangle) { const x = co[k]; const y = co[k + 1]; const w = co[k + 2]; const h = co[k + 3]; k += 4; const a = pdfApply(ctm, x, y); const b = pdfApply(ctm, x + w, y + h); pend.push([a, [b[0], a[1]]]); pend.push([a, [a[0], b[1]]]); track(a); track(b); }
      }
    } else if (fn === OPS.stroke || fn === OPS.eoFillStroke || fn === OPS.fill || fn === OPS.eoFill) {
      for (const [a, b] of pend) {
        const dx = Math.abs(b[0] - a[0]);
        const dy = Math.abs(b[1] - a[1]);
        if (dx > 12 && dy < 1.5) hseg.push({ y: pageH - (a[1] + b[1]) / 2, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]) });
        else if (dy > 8 && dx < 1.6) vseg.push({ x: (a[0] + b[0]) / 2, y0: pageH - Math.max(a[1], b[1]), y1: pageH - Math.min(a[1], b[1]) });
      }
      // 連桁（ビーム）候補: 横長で薄い「平行四辺形」（傾いていてもよい）。
      // 直線エッジ(hasCurve=false)で、左右の端の縦幅（連桁の太さ）が小さいものだけ。
      // 傾き付きで両端のyを記録し、後でstem位置のyを補間して当てる。
      if ((fn === OPS.fill || fn === OPS.eoFill) && !hasCurve && bbox.maxx - bbox.minx >= 6 && bbox.maxx - bbox.minx <= 50) {
        const x0 = bbox.minx;
        const x1 = bbox.maxx;
        const near = (px) => pts.filter((p) => Math.abs(p[0] - px) < 2).map((p) => p[1]);
        const lY = near(x0);
        const rY = near(x1);
        if (lY.length && rY.length) {
          const span = (a) => Math.max(...a) - Math.min(...a);
          const thick = Math.max(span(lY), span(rY)); // 連桁の太さ（縦）
          if (thick <= 4.5) {
            const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
            beams.push({
              x0, x1,
              y0: pageH - avg(lY), // 左端の中心y（画面座標）
              y1: pageH - avg(rY), // 右端の中心y
              y: pageH - (avg(lY) + avg(rY)) / 2
            });
          }
        }
      }
      // タイ/スラー候補: 曲線を含む横長・薄い弧
      if (hasCurve && bbox.maxx - bbox.minx > 8 && bbox.maxx - bbox.minx < 120 && bbox.maxy - bbox.miny < 8) {
        arcs.push({ x0: bbox.minx, x1: bbox.maxx, y: pageH - (bbox.miny + bbox.maxy) / 2 });
      }
      pend = [];
    }
  }
  return { glyphs, hseg, vseg, beams, arcs };
}

// ===== SMuFL（音楽記号の標準コードポイント）=====
// 多くの記譜ソフトの書き出しPDFは、グリフに標準SMuFLコードを unicode として持つ。
// あれば符頭・休符・臨時記号・付点・拍子が確実に判別できる。
const SMUFL = {
  noteheadBlack: 0xe0a4, noteheadHalf: 0xe0a3, noteheadWhole: 0xe0a2, noteheadDoubleWhole: 0xe0a0,
  flag8thUp: 0xe240, flag8thDown: 0xe241, flag16thUp: 0xe242, flag16thDown: 0xe243,
  flag32ndUp: 0xe244, flag32ndDown: 0xe245,
  accFlat: 0xe260, accNatural: 0xe261, accSharp: 0xe262, accDoubleSharp: 0xe263, accDoubleFlat: 0xe264,
  augmentationDot: 0xe1e7,
  restWhole: 0xe4e3, restHalf: 0xe4e4, restQuarter: 0xe4e5, rest8th: 0xe4e6, rest16th: 0xe4e7,
  gClef: 0xe050, fClef: 0xe062
};
// 臨時記号 → 半音変化（♮は0＝幹音そのもの、調号を打ち消す）
const SMUFL_ACC_ALTER = { 0xe260: -1, 0xe261: 0, 0xe262: 1, 0xe263: 2, 0xe264: -2 };
// 休符 → 拍数（4分=1）
const SMUFL_REST_BEATS = { 0xe4e3: 4, 0xe4e4: 2, 0xe4e5: 1, 0xe4e6: 0.5, 0xe4e7: 0.25 };
const SMUFL_FLAG_BEATS = { 0xe240: 0.5, 0xe241: 0.5, 0xe242: 0.25, 0xe243: 0.25, 0xe244: 0.125, 0xe245: 0.125 };
function isSmuflNotehead(u) { return u === SMUFL.noteheadBlack || u === SMUFL.noteheadHalf || u === SMUFL.noteheadWhole || u === SMUFL.noteheadDoubleWhole; }
function isSmuflFilled(u) { return u === SMUFL.noteheadBlack; }

// 拍子グリフ（U+E080〜E089 = timeSig 0〜9）→ 数字
function smuflTimeSigDigit(u) { return (u >= 0xe080 && u <= 0xe089) ? u - 0xe080 : null; }

// コード記号の文字（SMuFL csym臨時記号 ED60/61/62 と ASCII）→ 文字。コード以外は null。
// 一部の浄書ソフトのコード記号フォントは toUnicode が壊れ、修飾文字（♭・m・maj・sus・dim・
// half-dim）を ASCII 外の妙なコードに割り当てる。実譜で確認した対応を補う（標準フォントには無害）。
const CHORD_FONT_FALLBACK = {
  0xa8: "b",        // ♭ flat
  0x2039: "m",      // m（マイナー）
  0x152: "m",       // m（"maj" の m）
  0x201e: "a",      // a（"maj"）
  0x160: "j",       // j（"maj"）
  0xba: "°",   // ° dim
  0xd8: "ø",   // ø half-diminished
  0x201c: "sus"     // sus
};
function chordCharFromSmufl(u) {
  if (u === 0xed60) return "b"; // csymAccidentalFlat ♭
  if (u === 0xed62) return "#"; // csymAccidentalSharp ♯
  if (u === 0xed61) return "n"; // csymAccidentalNatural（コード名では稀）
  if (CHORD_FONT_FALLBACK[u] !== undefined) return CHORD_FONT_FALLBACK[u]; // 非標準コードフォント
  if (u >= 0x20 && u <= 0x7e) return String.fromCodePoint(u); // ASCII（英字・数字・記号）
  return null;
}
// 再構成したコード文字列が妥当か（A〜Gで始まる）
function looksLikeChordToken(t) {
  return /^[A-G][#b]?(maj|min|m|M|dim|aug|sus|add|°|ø|\+|\d|\/|\(|\)|[#b])*$/.test(t) && t.length <= 12;
}
// コード表記を整える（M7→maj7, ø→m7-5, 括弧除去 など。表示はそのままでも可）
function normalizeChordText(t) {
  return String(t || "")
    .replace(/M7/g, "maj7")
    .replace(/ø7?/g, "m7-5")  // half-diminished（7は冗長なので吸収）
    .replace(/°/g, "dim")
    .replace(/[()]/g, "")      // C(sus4) → Csus4
    .trim();
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
  const valid = clusters.filter((c) => {
    const span = c.x1 - c.x0;
    return span > minSpan && span < maxSpan && c.y > 4 && c.y < (pageHeight || 842) - 4;
  });
  // スラー/タイは「真ん中ほど太い」弧で、水平部分が五線候補に混入する（部分幅）。
  // 五線は用紙幅の広い範囲（段の全幅）に渡る線なので、用紙幅の7割未満の短い線は除外する。
  const pw = pageWidth || 595;
  let lineYs = valid
    .filter((c) => (c.x1 - c.x0) > pw * 0.7)
    .map((c) => c.y)
    .sort((a, b) => a - b);
  // 段組みが細く（余白が広く）7割に満たない譜面では、検出された最長線基準にフォールバック
  if (lineYs.length < 5) {
    const maxObserved = valid.reduce((m, c) => Math.max(m, c.x1 - c.x0), 1);
    lineYs = valid
      .filter((c) => (c.x1 - c.x0) > maxObserved * 0.8)
      .map((c) => c.y)
      .sort((a, b) => a - b);
  }
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
  const used = new Array(lineYs.length).fill(false);
  for (let i = 0; i + 4 < lineYs.length; i += 1) {
    if (used[i]) continue;
    let ok = true;
    for (let j = 1; j < 5; j += 1) {
      if (Math.abs((lineYs[i + j] - lineYs[i + j - 1]) - spacing) > tol) { ok = false; break; }
    }
    if (ok) {
      staves.push({ lines: lineYs.slice(i, i + 5), spacing, top: lineYs[i], bottom: lineYs[i + 4] });
      for (let j = 0; j < 5; j += 1) used[i + j] = true;
      i += 4;
    }
  }
  // 五線抽出漏れ対策: 5本そろわず「4本だけ等間隔」に並ぶ段（=PDFの描画都合で1本が
  // 1本の横線セグメントにならず抽出漏れした段）を救済する。欠けた線の位置を上下に外挿し、
  // その近くに（部分幅でも）横線セグメントの痕跡があれば五線として復元する。
  // これが無いとページ先頭段などが丸ごと欠落し、以降の小節番号・コード割当がずれる。
  const segNear = (y) => hseg.some((h) => Math.abs(h.y - y) < spacing * 0.6 && (h.x1 - h.x0) > spacing * 2);
  for (let i = 0; i < lineYs.length;) {
    if (used[i]) { i += 1; continue; }
    let j = i;
    while (j + 1 < lineYs.length && !used[j + 1] && Math.abs((lineYs[j + 1] - lineYs[j]) - spacing) <= tol) j += 1;
    if (j - i + 1 === 4) {
      const p = lineYs.slice(i, i + 4);
      const topCand = p[0] - spacing; // 上端の線が欠けている場合
      const botCand = p[3] + spacing; // 下端の線が欠けている場合
      const topOk = topCand > 2 && segNear(topCand);
      const botOk = botCand < (pageHeight || 842) - 2 && segNear(botCand);
      if (topOk) staves.push({ lines: [topCand, ...p], spacing, top: topCand, bottom: p[3] });
      else if (botOk) staves.push({ lines: [...p, botCand], spacing, top: p[0], bottom: botCand });
      for (let k = i; k <= j; k += 1) used[k] = true;
    }
    i = j + 1;
  }
  staves.sort((a, b) => a.top - b.top);
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

// ===== 認識結果の相互チェック（自己検証）用ヘルパー =====
// 調号 fifths（♯=正/♭=負）の長音階の構成音（pitch class 集合）。
// 短調は平行長調と同じ7音なので mode に依らず同じ集合でよい。
function pdfScalePcs(fifths) {
  const tonic = ((7 * (fifths || 0)) % 12 + 12) % 12; // 長調主音のpc
  const set = new Set();
  for (const iv of [0, 2, 4, 5, 7, 9, 11]) set.add((tonic + iv) % 12);
  return set;
}
// コード名の根音 pitch class（先頭の音名＋♯/♭）。取れなければ null。
function pdfChordRootPc(text) {
  if (!text) return null;
  const m = /^([A-G])([#b♭♯]?)/.exec(text.trim());
  if (!m) return null;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  let pc = base;
  if (m[2] === "#" || m[2] === "♯") pc += 1;
  else if (m[2] === "b" || m[2] === "♭") pc -= 1;
  return ((pc % 12) + 12) % 12;
}

// 認識結果の3つの相互チェック（拍・臨時記号・調号）。検出（と安全な範囲の補正）を行い、
// レポート {beats, accidentals, key} を返す。melody要素は step/accidental を持つ前提。
function verifyScoreConsistency(melody, chords, keySig, bpb, barChecks) {
  const fifths = keySig ? keySig.fifths : 0;
  const mNo = (b) => Math.floor(b / bpb) + 1; // 1始まり小節番号

  // 音符・コードに「低確度」の理由を登録するヘルパー（握りつぶさず人が後で確認・確定できるように）。
  const addNoteFlag = (n, reason) => {
    if (!n.uncertain) n.uncertain = [];
    if (!n.uncertain.includes(reason)) n.uncertain.push(reason);
  };

  // (1) 拍検算の再チェック: 記号音価合計が拍子と合わない小節を列挙。
  //     合わない小節は配置時にx位置比で自動補正済みだが、リズムは要確認。
  //     リズムは本質的に小節単位の概念なので音符ごとには付けず、小節番号のリストとして
  //     登録し、五線譜で該当小節をハイライトする（人が後で確認・確定）。
  const beatProblems = (barChecks || [])
    .filter((b) => !b.consistent && b.items > 0)
    .map((b) => ({ measure: mNo(b.startBeat), total: b.symTotal, expected: bpb }));
  const beats = {
    measures: (barChecks || []).length,
    balanced: (barChecks || []).filter((b) => b.consistent).length,
    rechecked: beatProblems.length,
    problemMeasures: beatProblems.map((p) => p.measure),
    problems: beatProblems.slice(0, 50)
  };

  // (2) 臨時記号の前後矛盾チェック: 同じ五線位置(step)の音が、隣り合う小節で
  //     反対の臨時記号で現れる（異名・対斜）＝読み違いが疑われる箇所。該当音に
  //     低確度フラグ "accidental" を登録する。
  const byMeasure = new Map(); // 小節→(step→{alter, notes[]})
  for (const n of melody) {
    if (n.step === undefined) continue;
    const m = mNo(n.startBeat);
    if (!byMeasure.has(m)) byMeasure.set(m, new Map());
    const degMap = byMeasure.get(m);
    const alt = n.accidental;
    if (alt !== undefined) {
      if (!degMap.has(n.step)) degMap.set(n.step, { alter: alt, notes: [] });
      degMap.get(n.step).notes.push(n);
    }
  }
  const accContradictions = [];
  const measuresWithAcc = [...byMeasure.keys()].sort((a, b) => a - b);
  for (const m of measuresWithAcc) {
    const degs = byMeasure.get(m);
    for (const [step, info] of degs) {
      // 後ろ隣の小節とだけ比べる（1組を1回だけ報告＝両方向の重複を防ぐ）。
      const nd = byMeasure.get(m + 1);
      if (nd && nd.has(step) && nd.get(step).alter !== info.alter) {
        accContradictions.push({ measure: m, neighbor: m + 1, step, alter: info.alter, neighborAlter: nd.get(step).alter });
        for (const n of info.notes) addNoteFlag(n, "accidental");
        for (const n of nd.get(step).notes) addNoteFlag(n, "accidental");
      }
    }
  }
  const accidentals = { contradictions: accContradictions.slice(0, 50), count: accContradictions.length };

  // (3) 調号との相互チェック: スケール外の音・ノンダイアトニックなコードの割合を見て、
  //     調号の取り違えが疑われるか判定。握りつぶさず、別調号候補つきで低確度を登録し、
  //     ノンダイアトニックなコードには低確度フラグを付ける（人が後で確定）。
  const scale = pdfScalePcs(fifths);
  let inW = 0; let outW = 0;
  for (const n of melody) {
    const pc = ((n.midi % 12) + 12) % 12;
    const w = n.beats || 1;
    if (scale.has(pc)) inW += w; else outW += w;
  }
  const noteOutRatio = (inW + outW) > 0 ? outW / (inW + outW) : 0;
  let cDiat = 0; let cNon = 0;
  for (const c of (chords || [])) {
    const root = pdfChordRootPc(c.chord);
    if (root === null) continue;
    if (scale.has(root)) { cDiat += 1; } else { cNon += 1; c.uncertain = true; }
  }
  const chordNonRatio = (cDiat + cNon) > 0 ? cNon / (cDiat + cNon) : 0;
  // 別の調号仮説でノンダイアトニックなコードがどれだけ減るか（コード根音ベースの最尤調号）。
  let bestK = fifths; let bestNon = cNon;
  for (let K = -7; K <= 7; K += 1) {
    const sc = pdfScalePcs(K);
    let non = 0;
    for (const c of (chords || [])) { const r = pdfChordRootPc(c.chord); if (r !== null && !sc.has(r)) non += 1; }
    if (non < bestNon) { bestNon = non; bestK = K; }
  }
  // 別調号の方が明確に合う、または外れが大きいなら調号を低確度として登録（人が確定）。
  const hasAlt = bestK !== fifths && bestNon + 1 < cNon;
  const suspect = hasAlt && (noteOutRatio > 0.30 || chordNonRatio > 0.30);
  if (keySig) { keySig.uncertain = suspect; keySig.altFifths = hasAlt ? bestK : null; }
  const key = {
    fifths,
    noteOutOfScaleRatio: Math.round(noteOutRatio * 100) / 100,
    chordNonDiatonicRatio: Math.round(chordNonRatio * 100) / 100,
    suspect,
    suggestedFifths: hasAlt ? bestK : null
  };

  return { beats, accidentals, key };
}

// ページ単位でベクター譜を読む → メロディノート（実験的）。
// 人間の読譜のプロセスに寄せた構造ベースの記号認識:
//  ・符頭 = 「符幹の端にぶら下がるグリフ」（出現統計でなく構造で同定）
//  ・旗 = 符幹の反対側の端（符頭が付いている端の逆）に付くグリフ → 8分
//  ・白玉/黒玉 = 連桁・旗と共起しないコードが白玉（2分・全音符）
//  ・休符 = 五線の中段に居て符幹に付かないグリフ → 小節内の拍配分に使う
function readVectorScorePage(ol, OPS, pageH, pageW) {
  const { glyphs: rawGlyphs, hseg, vseg, beams, arcs } = extractPageVectors(ol, OPS, pageH);
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
  // 連桁 b の、x における y（傾きを補間）
  const beamYAt = (b, x) => (b.y0 !== undefined ? b.y0 + (b.y1 - b.y0) * ((x - b.x0) / ((b.x1 - b.x0) || 1)) : b.y);
  const beamAtEnd = (v, endY) => beams.some((b) =>
    v.x >= b.x0 - 3 && v.x <= b.x1 + 3 && Math.abs(beamYAt(b, v.x) - endY) < spacing * 1.8);

  // font+code ごとの構造統計
  const stat = new Map();
  for (const g of glyphs) {
    const k = keyOf(g);
    if (!stat.has(k)) stat.set(k, { count: 0, ys: new Set(), xs: new Set(), stemEnd: 0, beamEnd: 0, flagLike: 0 });
    const s = stat.get(k);
    s.count += 1;
    s.ys.add(Math.round(g.y));
    s.xs.add(Math.round(g.x));
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
  // 音符が少ないページ（最終ページなど）は構造ヒューリスティック(ys≥8)が効かない。
  // SMuFLコードがあれば黒玉コードを直接決める（取りこぼし防止）。
  if (!filledKey) {
    const sb = glyphs.find((g) => g.smufl === SMUFL.noteheadBlack);
    if (sb) filledKey = keyOf(sb);
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
  // 旗らしさ(符幹非依存): そのコードのグリフから縦に約符幹ぶん離れた近xに黒玉(自分の符頭)が
  // あれば旗。旗は符幹の先端にあり stemAt が符幹を拾えず「符幹なし＝全/白玉」と誤判定されやすい。
  const looksLikeFlag = (g) => filledGlyphs.some((f) =>
    Math.abs(f.x - g.x) < spacing * 1.8 && Math.abs(f.y - g.y) > spacing * 1.5 && Math.abs(f.y - g.y) < spacing * 9);
  // 楽譜エリア（五線群の上下端±余白）。旗は符幹の先＝五線の上下に出るので広めに取る。
  // ページ上部のタイトル等で同コードが流用されても薄まらないよう、ヘッダ/フッタだけ除く。
  const staffYs = staves.flatMap((s) => [s.top, s.bottom]);
  const musicYLo = (staffYs.length ? Math.min(...staffYs) : 0) - spacing * 6;
  const musicYHi = (staffYs.length ? Math.max(...staffYs) : Infinity) + spacing * 6;
  const inMusicArea = (g) => g.y > musicYLo && g.y < musicYHi;
  // 旗率は楽譜エリアのグリフだけで測る
  const flagRate = (k) => {
    const gg = glyphs.filter((x) => keyOf(x) === k && inMusicArea(x));
    return gg.length ? gg.filter(looksLikeFlag).length / gg.length : 0;
  };
  // 臨時記号らしさ: すぐ右隣（同じ高さ）に黒玉(符頭)があるグリフ＝♯♭♮などの臨時記号。
  // 符幹が無く各音高にばらけるので全/白玉と誤判定されやすい（符頭の隣に幻の音符を生む）。
  const looksLikeAccidental = (g) => filledGlyphs.some((f) =>
    f.x - g.x > 1 && f.x - g.x < spacing * 2.6 && Math.abs(f.y - g.y) < spacing * 0.8);
  const accRate = (k) => {
    const gg = glyphs.filter((x) => keyOf(x) === k && inMusicArea(x));
    return gg.length ? gg.filter(looksLikeAccidental).length / gg.length : 0;
  };
  // 白玉（中抜き符頭）= 符幹の端に付くが、連桁と無縁で、旗でもないコード
  let openKey = null;
  let openBest = 0;
  for (const [k, s] of stat) {
    if (k === filledKey) continue;
    if (s.count >= 3 && s.ys.size >= 3 && s.stemEnd >= s.count * 0.3 &&
        s.beamEnd === 0 && s.flagLike <= s.count * 0.2 && flagRate(k) < 0.3 && accRate(k) < 0.4 && s.stemEnd > openBest) {
      openBest = s.stemEnd;
      openKey = k;
    }
  }
  if (!openKey) { // SMuFLフォールバック（疎なページ）
    const sh = glyphs.find((g) => g.smufl === SMUFL.noteheadHalf);
    if (sh) openKey = keyOf(sh);
  }
  // 全音符（符幹なしの開放符頭）= 符幹がほぼ無く、音高(y)も位置(x)もばらける符頭。
  // フォントは符頭コードを近い番号に固めるので、黒玉/白玉に番号が近いものを選ぶ
  // （調号の♭やクレフは同じxに固まる＝xがばらけない、で除外できる）。
  const fontOf = (k) => k.slice(0, k.lastIndexOf("/"));
  const numOf = (k) => parseInt(k.slice(k.lastIndexOf("/") + 1), 10) || 0;
  const fNum = numOf(filledKey);
  const oNum = openKey ? numOf(openKey) : fNum;
  let wholeKey = null;
  let wholeDist = Infinity;
  for (const [k, s] of stat) {
    if (k === filledKey || k === openKey) continue;
    if (fontOf(k) !== fontOf(filledKey)) continue;
    const stemRate = s.stemEnd / s.count;
    const yDiv = s.ys.size / s.count;
    const xDiv = s.xs.size / s.count;
    if (s.count >= 2 && stemRate < 0.25 && yDiv > 0.5 && xDiv > 0.6 && flagRate(k) < 0.3 && accRate(k) < 0.4) {
      const dist = Math.min(Math.abs(numOf(k) - fNum), Math.abs(numOf(k) - oNum));
      if (dist <= 3 && dist < wholeDist) { wholeDist = dist; wholeKey = k; }
    }
  }
  if (!wholeKey) { // SMuFLフォールバック（疎なページ）
    const sw = glyphs.find((g) => g.smufl === SMUFL.noteheadWhole);
    if (sw) wholeKey = keyOf(sw);
  }

  const headList = glyphs
    .filter((g) => keyOf(g) === filledKey || keyOf(g) === openKey || keyOf(g) === wholeKey)
    .map((g) => ({ ...g, filled: keyOf(g) === filledKey }));

  // 重なり合うグリフ（調号・拍子の数字などは同座標に積まれる）
  const stackCount = new Map();
  for (const g of glyphs) {
    const k = `${Math.round(g.x)}/${Math.round(g.y)}`;
    stackCount.set(k, (stackCount.get(k) || 0) + 1);
  }
  const isStacked = (g) => (stackCount.get(`${Math.round(g.x)}/${Math.round(g.y)}`) || 0) >= 2;

  // ===== 自己キャリブレーション =====
  // 明瞭な同種記号（旗・連桁）を見比べ、「障害物がない標準の形・位置」を学ぶ。
  // 学んだ基準で、重なりなどで曖昧な音符の音価（8分/16分/32分）を確度高く判定する。
  // 旗: 符幹の先に付く SMuFL 旗グリフ(E240-E245)。その標準的な水平オフセットを学習。
  const flagGlyphs = glyphs.filter((g) => SMUFL_FLAG_BEATS[g.smufl] !== undefined);
  const flagDx = [];
  for (const g of flagGlyphs) {
    const v = stemAt(g);
    if (v) flagDx.push(g.x - v.x);
  }
  const medFlagDx = flagDx.length ? medianOfArray(flagDx) : 0;
  const flagDxLo = medFlagDx - spacing * 1.6;
  const flagDxHi = medFlagDx + spacing * 1.6;
  // 連桁の縦間隔（二重連桁＝16分の判定用）。重なる連桁から学習、無ければ既定 0.9*spacing。
  const beamGaps = [];
  for (const b of beams) {
    for (const o of beams) {
      if (o === b || o.x1 < b.x0 || o.x0 > b.x1) continue;
      const dy = b.y - o.y;
      if (dy > spacing * 0.25 && dy < spacing * 2) beamGaps.push(dy);
    }
  }
  const beamGap = beamGaps.length ? medianOfArray(beamGaps) : spacing * 0.9;
  // 符幹の先 tipY に付く旗の音価（SMuFL→拍）。無ければ null。
  const flagBeatsAt = (v, tipY) => {
    const f = flagGlyphs.find((g) => g.x - v.x > flagDxLo && g.x - v.x < flagDxHi && Math.abs(g.y - tipY) < spacing * 1.8);
    return f ? SMUFL_FLAG_BEATS[f.smufl] : null;
  };
  // 符幹の先 tipY に重なる連桁の本数（1=8分,2=16分,3=32分）。学習した縦間隔で段数を数える。
  const beamLevelsAt = (v, tipY) => {
    const ys = beams
      .filter((b) => v.x >= b.x0 - 3 && v.x <= b.x1 + 3 && Math.abs(beamYAt(b, v.x) - tipY) < beamGap * 2.5 + spacing)
      .map((b) => beamYAt(b, v.x))
      .sort((a, b) => a - b);
    let levels = 0;
    let prev = -Infinity;
    for (const y of ys) {
      if (y - prev > beamGap * 0.5) { levels += 1; prev = y; }
    }
    return levels;
  };
  const BEAM_LEVEL_BEATS = { 1: 0.5, 2: 0.25, 3: 0.125 };

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
    let beats;
    if (!h.filled) {
      beats = stem ? 2 : 4;            // 白玉＋幹=2分、幹なし=全音符
    } else if (stem) {
      const tipY = Math.abs(h.y - stem.y0) < 3.2 ? stem.y1 : stem.y0;
      // 連桁の本数を優先（学習した縦間隔で段数を数える）、無ければ旗のSMuFLコード、
      // どちらも無ければ4分。これで8分/16分/32分を取り違えない。
      const levels = beamLevelsAt(stem, tipY);
      const flagBeats = flagBeatsAt(stem, tipY);
      // 非標準フォントで旗がSMuFL範囲外でも8分は拾う（先端に符頭でない別グリフ）。
      const flagLike = flagBeats === null && glyphs.some((g) =>
        keyOf(g) !== filledKey && keyOf(g) !== openKey &&
        Math.abs(g.y - tipY) < 3.2 && g.x - stem.x > -2 && g.x - stem.x < 7);
      if (levels >= 1) beats = BEAM_LEVEL_BEATS[Math.min(levels, 3)];
      else if (flagBeats !== null) beats = flagBeats;
      else if (flagLike) beats = 0.5;  // 旗あり（コード不明）=8分
      else beats = 1;                  // 黒玉＋幹のみ=4分
    } else {
      beats = 1;                       // 幹なし黒玉=4分扱い
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

  // 連符（3連符など）: SMuFLの連符数字グリフ(U+E880-E889)があれば、その近くの音符の
  // 音価を normal/actual 倍する（3連符なら×2/3）。連符グリフが無ければ何もしない＝安全。
  applyTuplets(deduped, glyphs, nearestStaff, spacing);

  // アーティキュレーション（スタッカート/アクセント/テヌート/マルカート/フェルマータ）を符頭に付与。
  applyArticulations(deduped, glyphs, nearestStaff, spacing);

  // タイ/スラー: 横長の弧。
  //  ・隣り合う同じ高さ(=同音)の2符頭の間に弧の中心があれば タイ → 音価を結合
  //    （弧の端を符頭に対応づける方式だと、弧が左右にずれたとき両端が同じ符頭に
  //     当たって取りこぼす。特にシンコペーションの同音タイで顕著だった。
  //     「弧が同音2符頭の間にかかっているか」で見るほうが頑健。）
  //  ・それ以外（音をまたいで弧を描く）＝スラー → x範囲の音にIDを付け、表示だけ曲線で結ぶ
  let slurSeq = 0;
  for (const a of arcs || []) {
    const cx = (a.x0 + a.x1) / 2;
    // 弧とほぼ同じ高さ帯（=同じ音程の符頭）を左から
    const onY = deduped
      .filter((n) => Math.abs(n.y - a.y) < spacing * 1.4)
      .sort((p, q) => p.x - q.x);
    // 隣り合う同音ペアで、弧の中心がその間にあるもの＝タイ
    let tiedPair = null;
    for (let i = 0; i + 1 < onY.length; i += 1) {
      const L = onY[i];
      const R = onY[i + 1];
      if (L.midi !== R.midi) continue;
      if (R.x - L.x > spacing * 14) continue; // 離れすぎは別物
      if (cx >= L.x - spacing * 0.5 && cx <= R.x + spacing * 0.5) { tiedPair = R; break; }
    }
    if (tiedPair) { tiedPair.tiedFromPrev = true; continue; }
    // スラー: 弧のx範囲・近い高さ帯にある音符をまとめ、先頭と末尾に同じIDを振る
    const inSpan = deduped
      .filter((n) => n.x >= a.x0 - 5 && n.x <= a.x1 + 5 && Math.abs(n.y - a.y) < spacing * 7)
      .sort((p, q) => p.x - q.x);
    if (inSpan.length >= 2) {
      const id = `slur:${Math.round(a.x0)}:${Math.round(a.y)}:${++slurSeq}`;
      inSpan[0].slurId = id; inSpan[0].slurRole = "start";
      inSpan[inSpan.length - 1].slurId = id; inSpan[inSpan.length - 1].slurRole = "end";
    }
  }

  // 休符候補: 符頭と同じ音楽フォントで、五線の中段に居て、符幹に付かないコード。
  // 臨時記号(♯♭♮)との区別はコード単位で行う＝臨時記号は「直後に必ず同じ高さの符頭が付く」
  // （accFrac≈1.0）。8分休符は直後に音符が来ることはあっても一部だけ（accFrac≈0.3）。
  // 以前は per-instance で「直後に符頭→除外」していたため、音符の直前に置かれた
  // 8分休符まで臨時記号と誤判定して落としていた。
  const musicFont = filledKey.slice(0, filledKey.indexOf("/"));
  const leftmostOf = (staff) => glyphs.reduce((m, o) => {
    const ns = nearestStaff(o.y).staff;
    return ns === staff && o.x < m ? o.x : m;
  }, Infinity);
  const restQualifies = (g) => {
    const { staff, d } = nearestStaff(g.y);
    if (!staff || d > spacing * 6) return false;
    const mid = (staff.top + staff.bottom) / 2;
    if (Math.abs(g.y - mid) > spacing * 1.9) return false;
    if (stemAt(g) || isStacked(g)) return false;
    // 段の左端（クレフ・調号・拍子ゾーン）は除外
    if (g.x < leftmostOf(staff) + spacing * 4) return false;
    return true;
  };
  // そのコードが「臨時記号」か（直後に同じ高さの符頭が付く割合）
  const accidentalFrac = (occ) => occ.filter((g) =>
    deduped.some((n) => n.x - g.x > 1.5 && n.x - g.x < 12 && Math.abs(n.y - g.y) < 3)).length / Math.max(1, occ.length);
  const restCodes = new Set();
  for (const [k, s] of stat) {
    if (k === filledKey || k === openKey || k === wholeKey) continue; // 符頭は休符にしない
    if (!k.startsWith(musicFont + "/")) continue;
    if (s.count < 3) continue;
    // 調号の♭/♯は段ごとに同じx列に固まる（x分散が小さい）。休符は小節内の色々なxに出る。
    if (s.xs.size / s.count < 0.35) continue;
    const occ = glyphs.filter((g) => keyOf(g) === k);
    if (accidentalFrac(occ) >= 0.5) continue; // 臨時記号コードは休符にしない
    const q = occ.filter(restQualifies);
    if (q.length >= occ.length * 0.6) restCodes.add(k);
  }
  let restList = glyphs.filter((g) => restCodes.has(keyOf(g)) && restQualifies(g));
  // 非SMuFL（ASCIIマップ音楽フォント）の休符グリフ→音価。実譜で確認した対応:
  // ‰(0x2030)=8分休符(0.5)・Œ(0x152)=4分休符(1)・∑(0x2211)=全休符(=小節まるごと, 別処理)。
  // 旗 'j'(0x6a) が休符に混じることがあるので除外する。
  const FONT_REST_BEATS = { 0x2030: 0.5, 0x152: 1 };
  restList = restList
    .filter((g) => g.smufl !== 0x6a)
    .map((g) => (FONT_REST_BEATS[g.smufl] != null ? { ...g, restBeats: FONT_REST_BEATS[g.smufl] } : g));

  // ===== SMuFL があれば、休符の拍数・臨時記号・付点を確定する =====
  const hasSmufl = glyphs.some((g) => isSmuflNotehead(g.smufl));
  if (hasSmufl) {
    // 休符は SMuFL コードで拾い直す（拍数つき・五線中段・左端ゾーン除外）。
    // 付点休符（付点4分休符など）は右の付点グリフで1.5倍にする（音符と同じ扱い）。
    restList = glyphs
      .filter((g) => SMUFL_REST_BEATS[g.smufl] !== undefined && restQualifies(g))
      .map((g) => {
        const dot = glyphs.find((d) => d.smufl === SMUFL.augmentationDot &&
          d.x - g.x > 1.5 && d.x - g.x < 12 && Math.abs(d.y - g.y) < spacing * 1.2);
        return { ...g, restBeats: SMUFL_REST_BEATS[g.smufl] * (dot ? 1.5 : 1), dotted: !!dot };
      });
    for (const n of deduped) {
      // 臨時記号: 音符の左 1.5〜13px・ほぼ同高（調号ゾーンは離れているので拾わない）
      const acc = glyphs.find((g) => SMUFL_ACC_ALTER[g.smufl] !== undefined &&
        n.x - g.x > 1.5 && n.x - g.x < 13 && Math.abs(g.y - n.y) < 3);
      if (acc) n.accidental = SMUFL_ACC_ALTER[acc.smufl];
      // 付点: 音符の右 2〜11px・同高〜やや上（線上の音符は半間上にずれる）
      const dot = glyphs.find((g) => g.smufl === SMUFL.augmentationDot &&
        g.x - n.x > 2 && g.x - n.x < 11 && Math.abs(g.y - n.y) < spacing * 0.85);
      if (dot) { n.beats = (n.beats || 1) * 1.5; n.dotted = true; }
    }
  } else {
    // 非SMuFL（ASCIIマップ音楽フォント）の臨時記号を音高に反映。符頭のすぐ左・同じ高さに
    // 'b'=♭(-1)/'n'=♮(0)/'#'=♯(+1)。調号の♭は離れた左端ゾーンなので拾わない（x窓が狭い）。
    const ASCII_ACC = { 0x62: -1, 0x6e: 0, 0x23: 1 };
    for (const n of deduped) {
      if (n.accidental !== undefined) continue;
      const acc = glyphs.find((g) => ASCII_ACC[g.smufl] !== undefined &&
        n.x - g.x > 1 && n.x - g.x < spacing * 2.8 && Math.abs(g.y - n.y) < spacing * 0.8);
      if (acc) n.accidental = ASCII_ACC[acc.smufl];
      // 付点: 音符の右の小さな点グリフ（このフォントでは uni 0x2122='™' にマップ）。音価1.5倍。
      const dot = glyphs.find((g) => g.smufl === 0x2122 &&
        g.x - n.x > spacing * 0.6 && g.x - n.x < spacing * 2.6 && Math.abs(g.y - n.y) < spacing * 1.0);
      if (dot && !n.dotted) { n.beats = (n.beats || 1) * 1.5; n.dotted = true; }
    }
  }

  // 拍子: 最上段の左端（クレフ・調号の後、最初の符頭より左）の、五線帯内に縦に並ぶ2桁。
  // SMuFL数字(E080-E089)でも、ASCII数字(0x30-0x39 にtoUnicodeされる埋め込み音楽フォント)でも拾う。
  let timeSig = null;
  {
    const digitOf = (u) => (u >= 0xe080 && u <= 0xe089) ? u - 0xe080
      : (u >= 0x30 && u <= 0x39) ? u - 0x30 : null;
    const st = staves.slice().sort((a, b) => a.top - b.top)[0];
    if (st) {
      const mid = (st.top + st.bottom) / 2;
      const heads = deduped.filter((n) => n.staffTop === st.top).map((n) => n.x);
      const firstNoteX = heads.length ? Math.min(...heads) : Infinity;
      const tsDigits = glyphs
        .map((g) => ({ d: digitOf(g.smufl), x: g.x, y: g.y }))
        .filter((t) => t.d !== null && Math.abs(t.y - mid) < spacing * 4 && t.x < firstNoteX - 1)
        .sort((a, b) => a.x - b.x || a.y - b.y);
      if (tsDigits.length >= 2) {
        // 同じx付近の上下2つ＝分子(上=yが小)・分母(下=yが大)
        const x0 = tsDigits[0].x;
        const col = tsDigits.filter((t) => Math.abs(t.x - x0) < spacing * 1.5).sort((a, b) => a.y - b.y);
        if (col.length >= 2) timeSig = { numerator: col[0].d, denominator: col[col.length - 1].d };
      }
    }
  }

  // 段（システム）ごとに、小節線で区切る。
  // 小節線＝五線をほぼ縦断する縦線のうち、符幹でないもの。符幹は符頭が線の片端に「向き整合」で
  // 付く（上向き＝符頭は下端で線の左／下向き＝符頭は上端で線の右）。小節線は次小節の音符が
  // 端の逆側に来ても符幹ではない＝小節線と見分ける（人間と同じ）。
  const headAtEitherEnd = (v) => deduped.some((n) => {
    const dx = n.x - v.x;
    const atTop = Math.abs(n.y - v.y0) < 4;
    const atBottom = Math.abs(n.y - v.y1) < 4;
    const upStem = atBottom && dx > -spacing * 1.5 && dx < 1;   // 下端・線の左＝上向き符幹
    const downStem = atTop && dx < spacing * 1.5 && dx > -1;    // 上端・線の右＝下向き符幹
    return upStem || downStem;
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
    // コード記号: 五線のすぐ上の帯にある英字・数字・csym臨時記号グリフを
    // x順に集め、x間隔でトークンに割る。各トークン＝1コード。
    // コードは五線の2間ほど上。帯を広げすぎるとテンポ表記(♩=120 Swing 等)を拾うので4間まで。
    const bandTop = s.top - spacing * 4;
    const bandBot = s.top - spacing * 0.8;
    const chordGlyphs = glyphs
      .filter((g) => g.y >= bandTop && g.y < bandBot && chordCharFromSmufl(g.smufl) !== null)
      .sort((a, b) => a.x - b.x);
    const tokens = [];
    for (const g of chordGlyphs) {
      const ch = chordCharFromSmufl(g.smufl);
      const last = tokens[tokens.length - 1];
      // 1つのコードは同じフォントで描かれる。フォントが変わったら別トークン
      // （リハーサル記号[A]等が隣のコードに連結して壊すのを防ぐ）。
      if (last && g.x - last.lastX < spacing * 2.4 && g.font === last.font) { last.text += ch; last.lastX = g.x; }
      else tokens.push({ x: g.x, lastX: g.x, text: ch, font: g.font });
    }
    // コードらしいトークンのうち、多数派フォント＝コードのフォント。別フォントの単独文字
    // （リハーサル記号[A]等は別フォントで描かれる）はコードにしない。
    const chordLike = tokens.filter((t) => looksLikeChordToken(t.text.replace(/n$/, "").trim()));
    const fontFreq = {};
    for (const t of chordLike) fontFreq[t.font] = (fontFreq[t.font] || 0) + 1;
    let chordFont = null; let chordFontN = 0;
    for (const f in fontFreq) if (fontFreq[f] > chordFontN) { chordFontN = fontFreq[f]; chordFont = f; }
    const chords = chordLike
      .filter((t) => t.font === chordFont || t.text.replace(/n$/, "").trim().length >= 2)
      .map((t) => ({ x: t.x, lastX: t.lastX, text: t.text.replace(/n$/, "").trim() }));
    return {
      top: s.top,
      bottom: s.bottom,
      spacing,
      clefX: leftmostStaffX(glyphs, staves, nearestStaff, s),
      bars,
      chords,
      fifths: detectStaffFifths(glyphs, s, nearestStaff, spacing, deduped),
      notes: deduped.filter((n) => n.staffTop === s.top).sort((a, b) => a.x - b.x),
      rests: restList.filter((r) => nearestStaff(r.y).staff === s).sort((a, b) => a.x - b.x)
    };
  });

  // 臨時記号は同小節・同音位置(step)に有効。バーラインで解除（楽典どおり）。
  // 符頭に直接付いた臨時記号(n.accidental)を、同じ小節の後続の同step音符へ伝播する。
  // タイで次小節へ持ち越す分は、後段のタイ統合（同y統合）が音を連結するので別途不要。
  for (const sy of systems) {
    const bars = (sy.bars || []).slice().sort((a, b) => a - b);
    const stepAcc = {};
    let bi = 0;
    for (const n of sy.notes) {
      while (bi < bars.length && n.x >= bars[bi]) { for (const k in stepAcc) delete stepAcc[k]; bi++; }
      if (n.accidental !== undefined) stepAcc[n.step] = n.accidental;
      else if (stepAcc[n.step] !== undefined) n.accidental = stepAcc[n.step];
    }
  }

  // 調号: 段ごとの fifths（♭/♯グリフの数。SMuFL/ASCII音楽フォント両対応）の多数決。
  // 0以外が多数なら採用（転調も段ごとに反映済み）、全段0なら構造的クラスタ検出にフォールバック。
  const noteheadKeys = new Set([filledKey, openKey].filter(Boolean));
  const counts = new Map();
  for (const sy of systems) counts.set(sy.fifths, (counts.get(sy.fifths) || 0) + 1);
  let bestKey = 0; let bestN = -1;
  for (const [k, n] of counts) if (n > bestN) { bestN = n; bestKey = k; }
  let keyCand;
  if (bestKey !== 0 || hasSmufl) {
    // SMuFL譜は fifths カウントを常に信頼（0=ハ長調も正しい）。ASCII譜は♭/♯が見つかれば採用。
    keyCand = { smuflFifths: bestKey };
  } else {
    keyCand = detectKeySigGlyph(glyphs, staves, noteheadKeys);
    if (keyCand) {
      const keyGlyphs = glyphs.filter((g) => keyOf(g) === keyCand.glyphKey);
      const singles = keyGlyphs.filter((g) => !isStacked(g));
      for (const n of deduped) {
        n.accSame = singles.some((g) => g.x < n.x - 1.5 && g.x > n.x - 11 && Math.abs(g.y - n.y) < 2.5);
      }
    }
  }
  // 繰り返し記号（SMuFL）: 反復バーライン・segno・coda・D.S.・D.C.、および
  // テキスト "Fine"/"Coda"/"D.C."/"D.S." を拾う（再生順の展開に使う）。
  const repeatMarks = detectRepeatMarks(glyphs, staves, nearestStaff, spacing);
  return { systems, staves: staves.length, keyCand, timeSig, repeatMarks };
}

// 繰り返し記号の検出。各マークの {type, x, y} を返す（type: repeatStart/repeatEnd/
// segno/coda/dalSegno/daCapo/fine/toCoda）。見つからなければ空＝既存譜面に無影響。
function detectRepeatMarks(glyphs, staves, nearestStaff, spacing) {
  const marks = [];
  const SM = { 0xe040: "repeatStart", 0xe041: "repeatEnd", 0xe045: "dalSegno", 0xe046: "daCapo", 0xe047: "segno", 0xe048: "coda" };
  for (const g of glyphs) {
    if (SM[g.smufl]) marks.push({ type: SM[g.smufl], x: g.x, y: g.y });
  }
  // 反復ドット（repeatDots E043）が小節線の左右にある場合も反復バーライン
  for (const g of glyphs) {
    if (g.smufl === 0xe043) marks.push({ type: "repeatDots", x: g.x, y: g.y });
  }
  // テキストの "Fine"/"Coda"/"D.C."/"D.S."/"To Coda"（ASCIIグリフを近接連結）
  const asc = glyphs.filter((g) => g.code >= 0x20 && g.code <= 0x7e && (!g.smufl || g.smufl < 0xe000))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  let run = null;
  const flush = () => {
    if (!run) return;
    const t = run.text.replace(/\s+/g, " ").trim();
    const lc = t.toLowerCase();
    let type = null;
    if (/^fine\b/i.test(t)) type = "fine";
    else if (/to\s*coda/i.test(t)) type = "toCoda";
    else if (/d\.?\s*c\./i.test(t) || /da\s*capo/i.test(t)) type = "daCapo";
    else if (/d\.?\s*s\./i.test(t) || /dal\s*segno/i.test(t)) type = "dalSegno";
    else if (/^coda\b/i.test(t)) type = "coda";
    if (type) marks.push({ type, x: run.x0, y: run.y });
    run = null;
  };
  for (const g of asc) {
    const ch = String.fromCodePoint(g.code);
    if (run && Math.abs(g.y - run.y) < 3 && g.x - run.lastX < spacing * 2.5) {
      run.text += (g.x - run.lastX > spacing ? " " : "") + ch; run.lastX = g.x;
    } else { flush(); run = { text: ch, x0: g.x, lastX: g.x, y: g.y }; }
  }
  flush();
  return marks;
}

// 段 s の五線の左端x（クレフ・調号の開始位置の目安）
function leftmostStaffX(glyphs, staves, nearestStaff, s) {
  let min = Infinity;
  for (const g of glyphs) {
    if (nearestStaff(g.y).staff === s && g.x < min) min = g.x;
  }
  return min;
}

// 段 s の調号（五度圏 fifths: ♯=正/♭=負）。SMuFL前提。
// クレフと最初の符頭の間には音符が無い＝音符の臨時記号も無いので、その帯（かつ
// 五線のすぐ近く）にある♭/♯の数がそのまま調号の数になる。
// （遠い位置の臨時記号や隣段のものは五線帯フィルタと最初の符頭手前で除外）
// ♭/♯ の判定。SMuFL専用コードに加え、ASCIIにtoUnicodeされる埋め込み音楽フォント
// （♭→'b'=0x62, ♯→'#'=0x23）や本来のUnicode記号(♭=0x266D, ♯=0x266F)も拾う。
function isFlatGlyph(u) { return u === SMUFL.accFlat || u === 0x266d || u === 0x62; }
function isSharpGlyph(u) { return u === SMUFL.accSharp || u === 0x266f || u === 0x23; }
function detectStaffFifths(glyphs, staff, nearestStaff, spacing, deduped) {
  const clefs = glyphs.filter((g) => (g.smufl === SMUFL.gClef || g.smufl === SMUFL.fClef) && nearestStaff(g.y).staff === staff).map((g) => g.x);
  const clefX = clefs.length ? Math.min(...clefs) : -Infinity;
  const heads = deduped.filter((n) => n.staffTop === staff.top).map((n) => n.x);
  const firstNoteX = heads.length ? Math.min(...heads) : (clefX + spacing * 12);
  const mid = (staff.top + staff.bottom) / 2;
  const countKeySig = (pred) => glyphs.filter((g) =>
    pred(g.smufl) &&
    g.x > clefX && g.x < firstNoteX - spacing * 1.2 && // クレフ〜最初の符頭の手前
    Math.abs(g.y - mid) < spacing * 5 &&               // 五線の近く（遠い臨時記号を除外）
    nearestStaff(g.y).staff === staff
  ).length;
  const f = countKeySig(isFlatGlyph);
  const s = countKeySig(isSharpGlyph);
  return s > f ? s : -f;
}

// アーティキュレーション（スタッカート・アクセント・テヌート・マルカート・フェルマータ）。
// 記号は符頭の真上/真下に置かれるので、同じ段でxが最も近い符頭へ artic を付ける。
// 記号が無ければ何もしない（既存譜面に無影響）。再生はscore/songが gate/強さに反映する。
function applyArticulations(notes, glyphs, nearestStaff, spacing) {
  const AM = {
    0xe4a0: "accent", 0xe4a1: "accent",
    0xe4a2: "staccato", 0xe4a3: "staccato",
    0xe4a4: "tenuto", 0xe4a5: "tenuto",
    0xe4a6: "staccatissimo", 0xe4a7: "staccatissimo",
    0xe4a8: "staccatissimo", 0xe4a9: "staccatissimo",
    0xe4aa: "staccatissimo", 0xe4ab: "staccatissimo",
    0xe4ac: "marcato", 0xe4ad: "marcato",
    0xe4c0: "fermata", 0xe4c1: "fermata"
  };
  for (const g of (glyphs || [])) {
    const kind = AM[g.smufl];
    if (!kind) continue;
    const st = nearestStaff(g.y).staff;
    if (!st) continue;
    let best = null; let bd = Infinity;
    for (const n of notes) {
      if (n.staffTop !== st.top) continue;
      const dx = Math.abs(n.x - g.x);
      if (dx < spacing * 1.4 && dx < bd) { bd = dx; best = n; }
    }
    // フェルマータは最強、それ以外は短い記号が優先（スタッカート＋アクセント等）
    if (best && (!best.artic || kind === "fermata")) best.artic = kind;
  }
}

// 連符（3連符など）の音価補正。SMuFLの連符数字グリフ(U+E880=0 … U+E889=9)の近くの
// 音符を actual 個、音価を normal/actual 倍する（3連符 actual=3 → normal=2 → ×2/3）。
// 連符グリフが無ければ何もしない（既存譜面に無影響）。
function applyTuplets(notes, glyphs, nearestStaff, spacing) {
  const tupGlyphs = (glyphs || []).filter((g) => g.smufl >= 0xe880 && g.smufl <= 0xe889);
  for (const tg of tupGlyphs) {
    const actual = tg.smufl - 0xe880; // 連符の数（3=3連符）
    if (actual < 2) continue;
    const normal = Math.pow(2, Math.floor(Math.log2(actual))); // 3→2, 5→4, 6→4, 7→4, 9→8
    const ratio = normal / actual;
    const st = nearestStaff(tg.y).staff;
    if (!st) continue;
    // 同じ段で連符数字のxに近い音符を actual 個集めて連符化
    const group = notes
      .filter((n) => n.staffTop === st.top && Math.abs(n.x - tg.x) < spacing * 9)
      .sort((a, b) => Math.abs(a.x - tg.x) - Math.abs(b.x - tg.x))
      .slice(0, actual);
    for (const n of group) {
      n.beats = Math.round(n.beats * ratio * 1000) / 1000;
      n.tuplet = actual;
    }
  }
}

// PDF全ページのベクター譜 → 拍つきメロディ（音価＋小節線で配置。空小節＝休符が前に入る）。
async function extractPdfVectorMelody(file, getDocument, OPS, onProgress, beatsPerBar = null) {
  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data }).promise;
  const viewport0 = (await pdf.getPage(1)).getViewport({ scale: 1 });
  const pageH = viewport0.viewBox[3];
  const pageW = viewport0.viewBox[2];
  const allSystems = [];
  const keyCands = [];
  const allRepeatMarks = []; // {type, x, y, page}
  let detectedTS = null;
  for (let p = 1; p <= pdf.numPages; p += 1) {
    if (onProgress) onProgress(p / pdf.numPages);
    const page = await pdf.getPage(p);
    const ol = await page.getOperatorList();
    const { systems, keyCand, timeSig, repeatMarks } = readVectorScorePage(ol, OPS, pageH, pageW);
    if (keyCand) keyCands.push(keyCand);
    if (timeSig && !detectedTS) detectedTS = timeSig;
    systems.forEach((s) => allSystems.push({ ...s, page: p }));
    for (const m of repeatMarks || []) allRepeatMarks.push({ ...m, page: p });
  }

  // テンポ: 1ページ目のテキストから「= 120」を拾う
  let tempo = null;
  try {
    const tc = await (await pdf.getPage(1)).getTextContent();
    for (const it of tc.items) {
      const mt = /=\s*(\d{2,3})\b/.exec(it.str || "");
      if (mt) { tempo = Number(mt[1]); break; }
    }
  } catch (e) { /* テンポ無しでもよい */ }

  // 拍子: SMuFLで検出できていれば分子を採用。明示指定があればそちら優先。
  const bpb = Number(beatsPerBar) > 0 ? Number(beatsPerBar) : (detectedTS && detectedTS.numerator) || 4;

  // 調号: SMuFLの♭/♯個数があれば最優先、無ければグリフ個数（ページ多数決）。
  // ♭か♯か・長短調は KK 調推定で確定する。
  const allNotes = allSystems.flatMap((s) => s.notes);
  const smuflKey = keyCands.find((c) => c.smuflFifths !== undefined);
  let hypotheses;
  if (smuflKey) {
    hypotheses = [smuflKey.smuflFifths];
  } else {
    let sigCount = null;
    if (keyCands.length) {
      const tally = new Map();
      for (const c of keyCands) tally.set(c.count, (tally.get(c.count) || 0) + 1);
      sigCount = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    // 調号グリフの数はヒント（♭か♯か不明）。ただし非SMuFLでは誤検出もあるので
    // 無調号(0)も必ず候補に入れ、KK推定で最も合う調を選ぶ（無調号曲の誤検出対策）。
    hypotheses = sigCount ? [-sigCount, 0, sigCount] : [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  }
  const keyPick = allNotes.length ? choosePdfKeySignature(allNotes, hypotheses) : null;
  const fifths = keyPick ? keyPick.fifths : 0;

  // 各システムを上から、システム内は小節（小節線区切り）ごとに。
  // 空小節は休符として beatsPerBar ぶん進める＝出だしの休符小節も正しく前に入る。
  const melody = [];
  const chordEvents = [];
  const barChecks = []; // 拍検算: 各小節の記号音価合計が拍子ぶんに合うか
  const barlineBeats = []; // 各小節線の {page, x, beat}（繰り返し検出用）
  let beat = 0;
  let noteCount = 0;
  // 段ごとの調号 fifths を適用（転調対応）。段に検出値が無ければ代表調号 fifths。
  const keyedMidi = (n, sysFifths) => {
    // 明示的な臨時記号(♯♭♮)があれば絶対指定として最優先（調号を上書き）
    if (n.accidental !== undefined) return n.midi + n.accidental;
    const kf = (sysFifths === null || sysFifths === undefined) ? fifths : sysFifths;
    let alter = pdfKeyAlter(pdfLetterCFromStep(n.step), kf);
    if (n.accSame && kf !== 0) alter = kf < 0 ? -1 : 1; // SMuFL無しPDF用フォールバック
    return n.midi + alter;
  };
  // 全休符の正規化: 各システムの各小節（小節線区切り）で、音符が無く休符が1個だけなら
  // 全休符（小節まるごと）＝拍子ぶん。配置・描画(layout)の両方で正しく扱えるよう先にマーク。
  for (const sys of allSystems) {
    const edges = (sys.bars || []).slice().sort((a, b) => a - b);
    const bounds = [-Infinity, ...edges, Infinity];
    for (let i = 0; i < bounds.length - 1; i += 1) {
      const notesIn = (sys.notes || []).filter((n) => n.x >= bounds[i] - 2 && n.x < bounds[i + 1]);
      const restsIn = (sys.rests || []).filter((r) => r.x >= bounds[i] - 2 && r.x < bounds[i + 1]);
      if (notesIn.length === 0 && restsIn.length === 1) {
        restsIn[0].restBeats = bpb;
        restsIn[0].fullMeasure = true;
      }
    }
  }
  for (const sys of allSystems) {
    const sysFifths = (sys.fifths === null || sys.fifths === undefined) ? fifths : sys.fifths;
    sys._startMeasure = Math.round(beat / bpb) + 1; // この段の先頭小節番号（1始まり）
    // 小節境界（最初の音符より前の小節線も含めて区切る）
    const edges = sys.bars.slice();
    const sysMeasures = []; // {xL, xR, startBeat} コードを小節へ割り当てるため
    const sysOnsets = []; // {x, beat} 音符・休符のオンセット（コードの吸着に休符も使う）
    const place = (n, startBeat) => {
      melody.push({ startBeat, beats: n.beats || 1, midi: keyedMidi(n, sysFifths), page: sys.page, x: n.x, y: n.y, step: n.step, accidental: n.accidental, tiedFromPrev: n.tiedFromPrev, slurId: n.slurId, slurRole: n.slurRole, keyFifths: sysFifths, artic: n.artic });
      noteCount += 1;
    };
    const assignChords = () => {
      // コードの所属ルール: まずコードが入る小節を決め、その小節内で「コードの中心xに最も近い
      // オンセット（音符・休符）」の拍に属させる。休符も対象にするので、小節頭の休符の上に
      // あるコードは小節頭の拍に付く。同じ小節に複数コードがあるときは別の拍へ割り当てる。
      const usedByMeasure = new Map(); // 小節ごとに使った拍／コード名
      for (const c of (sys.chords || []).slice().sort((a, b) => a.x - b.x)) {
        // 小節判定はコードの「中心x」で行う。コードのxはテキスト左端なので、幅の広いコード
        // （Dbmaj7等）だと左端が小節線の左に出て前の小節に誤割り当てされる。中心なら正しい小節。
        const cx = (c.x + (c.lastX != null ? c.lastX : c.x)) / 2 + sys.spacing * 0.6;
        let m = sysMeasures.find((mm) => cx >= mm.xL && cx < mm.xR);
        if (!m && sysMeasures.length) {
          m = sysMeasures.reduce((best, mm) => Math.abs((mm.xL + mm.xR) / 2 - c.x) < Math.abs((best.xL + best.xR) / 2 - c.x) ? mm : best);
        }
        if (!m) continue;
        if (!usedByMeasure.has(m)) usedByMeasure.set(m, { beats: new Set(), assigned: [] });
        const used = usedByMeasure.get(m);
        const text = normalizeChordText(c.text);
        // 同名コードが同じ位置（±spacing*4）に重複検出されたときだけ1つに。
        // C–G–C のように同小節内で同名・別位置のコードに戻る進行は残す。
        if (used.assigned.some((a) => a.text === text && Math.abs(a.x - c.x) < sys.spacing * 4)) continue;
        // 小節内のオンセット（音符＋休符）から、コードの中心xに最も近いものへ吸着する。
        // 休符を含めることで、小節頭の休符の上にあるコードが小節頭の拍に付く
        // （後ろの音符に引っぱられない）。同じ拍に既出なら右の空きオンセット→後ろの空き拍へ。
        const cCenter = (c.x + (c.lastX != null ? c.lastX : c.x)) / 2;
        const onsetsIn = sysOnsets.filter((o) => o.x >= m.xL - 2 && o.x < m.xR).sort((a, b) => a.x - b.x);
        let beat; let beatX;
        if (onsetsIn.length) {
          let best = onsetsIn[0]; let bd = Infinity;
          for (const o of onsetsIn) { const d = Math.abs(o.x - cCenter); if (d < bd) { bd = d; best = o; } }
          beat = best.beat; beatX = best.x;
          if (used.beats.has(beat)) {
            const free = onsetsIn.find((o) => o.x >= c.x - sys.spacing && !used.beats.has(o.beat));
            if (free) { beat = free.beat; beatX = free.x; }
            else { while (used.beats.has(beat)) beat += 0.5; }
          }
        } else if (Number.isFinite(m.xL) && Number.isFinite(m.xR) && m.xR - m.xL > 1) {
          // オンセットなし: x位置から小節内の拍を推定（0.5グリッド）、衝突は後ろへ
          const frac = Math.max(0, Math.min(0.99, (c.x - m.xL) / (m.xR - m.xL)));
          beat = m.startBeat + Math.round(frac * bpb / 0.5) * 0.5;
          while (used.beats.has(beat)) beat += 0.5;
          beatX = Math.max(m.xL, c.x);
        } else {
          // 小節範囲が無限/不定: 小節頭から空き拍へ（NaN防止）
          beat = m.startBeat;
          while (used.beats.has(beat)) beat += 0.5;
          beatX = Number.isFinite(c.x) ? c.x : m.startBeat;
        }
        used.beats.add(beat); used.assigned.push({ text, x: c.x });
        chordEvents.push({ startBeat: beat, chord: text });
        c.beatX = beatX;
      }
    };
    // 小節範囲 [edges[i], edges[i+1]]。小節線が無い場合はシステム全体を1小節扱い。
    if (edges.length < 2) {
      // 小節線なし: 音符を音価順に詰める
      sysMeasures.push({ xL: -Infinity, xR: Infinity, startBeat: beat });
      sys.notes.forEach((n) => { place(n, beat); beat += n.beats || 1; });
      assignChords();
      continue;
    }
    // 各システムは「最初の小節線より前の領域」も1小節（行頭の小節：ト音記号・調号・拍子・出だしの休符を含む）。
    // 小節範囲を [行頭, edges[0]], [edges[0], edges[1]], ... と作る。
    // 小節内に休符があれば、「小節の合計は拍子ぶん」という制約から逆算して
    // 余り拍を休符に配分する（休符の後の音符が正しい拍に置かれる）。
    // さらに譜刻の性質「小節内の音符間隔 ≒ だいたい実時間比」を使い、
    // 記号ベースの拍（音価累積）とx位置比例の拍をブレンドして配置する。
    const placeBar = (xL, xR) => {
      sysMeasures.push({ xL, xR, startBeat: beat });
      const inBar = sys.notes.filter((n) => n.x >= xL - 2 && n.x < xR);
      // 全休符は拍子に関係なく「1小節まるごと休み」の慣習＝拍子ぶん（3/4なら3拍）。
      const inRests = (sys.rests || [])
        .filter((r) => r.x >= xL - 2 && r.x < xR)
        .map((r) => (r.smufl === SMUFL.restWhole ? { ...r, restBeats: bpb } : r));
      // 音符が無く休符が1個だけの小節＝全休符（小節まるごと）＝拍子ぶん。
      // フォントの休符グリフがSMuFLでなくても、空小節の全休符を正しく拾える。
      if (inBar.length === 0 && inRests.length === 1) {
        inRests[0] = { ...inRests[0], restBeats: bpb, dotted: false };
      }
      // 同じx（±3px）の符頭は和音＝同時発音。1アイテムにまとめて同じ拍へ置く。
      const noteGroups = [];
      for (const n of inBar.slice().sort((a, b) => a.x - b.x)) {
        const last = noteGroups[noteGroups.length - 1];
        if (last && Math.abs(n.x - last.x) < 3) last.ns.push(n);
        else noteGroups.push({ rest: false, x: n.x, ns: [n] });
      }
      const items = noteGroups
        .concat(inRests.map((r) => ({ rest: true, x: r.x, restBeats: r.restBeats })))
        .sort((a, b) => a.x - b.x);
      if (!items.length) {
        beat += bpb; // 空小節＝休符でも進む
        return;
      }
      // 記号ベース: 音価を累積。和音グループは代表値（最大音価）で1回だけ進める。
      const groupBeats = (g) => Math.max(...g.ns.map((n) => n.beats || 1));
      const noteSum = noteGroups.reduce((s, g) => s + groupBeats(g), 0);
      const knownRest = inRests.reduce((s, r) => s + (r.restBeats || 0), 0);
      const unknownRests = inRests.filter((r) => !(r.restBeats > 0)).length;
      const gap = bpb - noteSum - knownRest;
      const fillBeats = unknownRests && gap > 0 ? gap / unknownRests : 0;
      let acc = 0;
      for (const it of items) {
        it.symOnset = acc;
        acc += it.rest ? (it.restBeats > 0 ? it.restBeats : fillBeats) : groupBeats(it);
      }
      // 休符の確定音価を元の sys.rests へ伝播（描画が8分/4分など正しい休符種を出せるように）。
      for (const it of items) {
        if (!it.rest) continue;
        const fb = it.restBeats > 0 ? it.restBeats : fillBeats;
        const orig = (sys.rests || []).find((r) => Math.abs(r.x - it.x) < 1 && !r._beatsSet);
        if (orig && fb > 0) { orig.restBeats = fb; orig._beatsSet = true; }
      }
      // 実時間比ベース: 小節は先頭アイテム（拍0）〜小節線で拍子ぶん、と線形対応。
      // 記号の足し算が自己整合する小節（合計=拍子）は記号を信頼し、
      // 合わない小節（休符の見逃し・音価の読み違い）だけ実時間比で補正する。
      const x0 = items[0].x;
      const span = xR - x0;
      const useX = Number.isFinite(span) && span > 4;
      const symTotal = noteSum + knownRest + fillBeats * unknownRests;
      const consistent = Math.abs(bpb - symTotal) < 0.26;
      // 拍検算の記録（合わない小節＝認識が怪しい小節）
      barChecks.push({ page: sys.page, startBeat: beat, symTotal: Math.round(symTotal * 100) / 100, consistent, items: items.length });
      // 合わない小節はx位置比を強めに信頼（記号の音価/休符に取りこぼしがある）
      const wX = useX && !consistent ? 0.75 : 0;
      // グリッド: 拍子ぶんを割り切れる細かさに丸める（8分=0.5、3連や16分が要れば0.25）
      const gridUnit = (items.some((it) => (it.restBeats === 0.25) || (!it.rest && it.ns.some((n) => (n.beats || 1) <= 0.3)))) ? 0.25 : 0.5;
      const snap = (v) => Math.round(v / gridUnit) * gridUnit;
      let prev = 0;
      for (const it of items) {
        const xOnset = useX ? ((it.x - x0) / span) * bpb : it.symOnset;
        let onset = consistent ? Math.round(it.symOnset * 4) / 4 : snap(it.symOnset * (1 - wX) + xOnset * wX);
        onset = Math.max(prev, Math.min(onset, bpb - gridUnit));
        it.onset = onset;
        prev = onset;
      }
      // 音符・休符のオンセットを記録（コードを小節頭の休符にも吸着できるように）。
      for (const it of items) sysOnsets.push({ x: it.x, beat: beat + it.onset });
      const noteItems = items.filter((it) => !it.rest);
      for (let i = 0; i < noteItems.length; i += 1) {
        const it = noteItems[i];
        // 次イベント（音 or 休符）までを上限に。整合小節は記号音価を尊重、
        // 不整合小節は「拍検算で割り出したオンセット差」を実音価として使う（小節が拍子ぶんに収まる）。
        const nextItem = items.find((o) => o.onset > it.onset);
        const limit = Math.max(0.25, (nextItem ? nextItem.onset : bpb) - it.onset);
        for (const n of it.ns) {
          const beats = consistent ? Math.min(n.beats || 1, limit) : limit;
          melody.push({ startBeat: beat + it.onset, beats, midi: keyedMidi(n, sysFifths), page: sys.page, x: n.x, y: n.y, step: n.step, accidental: n.accidental, tiedFromPrev: n.tiedFromPrev, slurId: n.slurId, slurRole: n.slurRole, keyFifths: sysFifths, artic: n.artic });
          noteCount += 1;
        }
      }
      beat += bpb;
      if (Number.isFinite(xR)) barlineBeats.push({ page: sys.page, x: xR, beat });
    };
    placeBar(-Infinity, edges[0]); // 行頭の小節
    for (let i = 0; i < edges.length - 1; i += 1) {
      placeBar(edges[i], edges[i + 1]);
    }
    assignChords();
  }

  // タイの結合: タイ印のある音を、直前の同音へまとめる（音価を加算し、別onsetを消す）。
  // タイは必ず同じ五線位置(同y)同士なので、臨時記号で最終midiがずれても同yなら結合する
  // （結合後は前の音＝臨時記号が適用された音高・音価になり、後ろの音にも臨時記号が効く）。
  melody.sort((a, b) => a.startBeat - b.startBeat);
  const tied = [];
  for (const n of melody) {
    const prev = tied[tied.length - 1];
    if (n.tiedFromPrev && prev && (prev.midi === n.midi || Math.abs(prev.y - n.y) < 3) &&
        Math.abs(prev.startBeat + prev.beats - n.startBeat) < 0.3) {
      prev.beats += n.beats; // 1音に結合
      noteCount -= 1;
      continue;
    }
    tied.push(n);
  }
  melody.length = 0;
  melody.push(...tied);

  // 同じ小節に重複するコードは1つに（最初のもの）
  chordEvents.sort((a, b) => a.startBeat - b.startBeat);
  const dedupChords = [];
  for (const c of chordEvents) {
    const last = dedupChords[dedupChords.length - 1];
    if (last && last.startBeat === c.startBeat) continue;
    if (c.chord) dedupChords.push(c);
  }
  const keySig = keyPick ? { fifths, mode: keyPick.mode, tonic: keyPick.tonic } : null;
  // 転調: メロディの keyFifths が変わる位置を記録
  const keyChanges = [];
  for (const n of melody) {
    const kf = n.keyFifths;
    if (kf === null || kf === undefined) continue;
    const last = keyChanges[keyChanges.length - 1];
    if (!last || last.fifths !== kf) keyChanges.push({ startBeat: n.startBeat, fifths: kf });
  }
  // 拍検算サマリ: 拍子ぶんに合わない小節＝音価/休符の取りこぼしが疑われる小節
  const balanced = barChecks.filter((b) => b.consistent).length;
  const problems = barChecks
    .map((b, i) => ({ ...b, index: i }))
    .filter((b) => !b.consistent && b.items > 0);
  const beatCheck = {
    measures: barChecks.length,
    balanced,
    problemCount: problems.length,
    problems: problems.slice(0, 50)
  };
  // 認識結果の相互チェック（自己検証）: 拍・臨時記号・調号の整合を確認しレポート化。
  const verification = verifyScoreConsistency(melody, dedupChords, keySig, bpb, barChecks);
  // 繰り返し構造: 検出した反復記号(allRepeatMarks)を拍位置に写像し、再生順展開用の
  // structure を組み立てる。記号が無ければ空（既存譜面に無影響）。
  const totalEnd = melody.reduce((m, n) => Math.max(m, n.startBeat + n.beats), 0);
  const markBeat = (m) => {
    // 同ページの小節線のうち x が最も近いものの拍位置（反復記号は小節線上にある）
    let best = null; let bestDx = Infinity;
    for (const b of barlineBeats) {
      if (b.page !== m.page) continue;
      const dx = Math.abs(b.x - m.x);
      if (dx < bestDx) { bestDx = dx; best = b; }
    }
    return best ? best.beat : null;
  };
  const beatsOf = (type) => allRepeatMarks.filter((m) => m.type === type)
    .map(markBeat).filter((b) => b !== null).sort((a, b) => a - b);
  const repeatStartBeats = beatsOf("repeatStart");
  const repeatEndBeats = beatsOf("repeatEnd");
  const repeats = [];
  for (const e of repeatEndBeats) {
    // この反復終端より手前で最も近い開始（無ければ曲頭0）
    const starts = repeatStartBeats.filter((s) => s <= e + 1e-6);
    const start = starts.length ? starts[starts.length - 1] : 0;
    if (e > start + 1e-6) repeats.push({ start, end: e, times: 2 });
  }
  const first = (type) => { const a = beatsOf(type); return a.length ? a[0] : null; };
  const daCapoAt = first("daCapo");
  const dalSegnoAt = first("dalSegno");
  const fineAt = first("fine");
  const segnoAt = first("segno");
  const toCodaAt = first("toCoda");
  const codaAt = first("coda");
  let dcAlFine = null; let dsAlCoda = null;
  if (daCapoAt !== null && fineAt !== null) dcAlFine = { dcAt: daCapoAt, fineAt };
  else if (dalSegnoAt !== null && segnoAt !== null && toCodaAt !== null && codaAt !== null) {
    dsAlCoda = { dsAt: dalSegnoAt, segnoAt, toCodaAt, codaAt };
  }
  const repeatStructure = (repeats.length || dcAlFine || dsAlCoda)
    ? { end: totalEnd, repeats, dcAlFine, dsAlCoda } : null;
  // レイアウト（学習した元譜の配置）: 各システムの五線位置・小節線・調号・休符・コードを
  // そのまま渡し、描画側で「拍から再構築」せず元の配置で再現できるようにする。
  const layout = {
    pageWidth: pageW, pageHeight: pageH, pages: pdf.numPages,
    systems: allSystems.map((s) => ({
      page: s.page, top: s.top, bottom: s.bottom, spacing: s.spacing, clefX: s.clefX,
      measureStart: s._startMeasure || 1,
      fifths: (s.fifths === null || s.fifths === undefined) ? fifths : s.fifths,
      bars: s.bars,
      chords: s.chords,
      rests: (s.rests || []).map((r) => ({ x: r.x, beats: (r.fullMeasure || r.smufl === SMUFL.restWhole ? bpb : r.restBeats) || 1, smufl: r.fullMeasure ? SMUFL.restWhole : r.smufl, dotted: r.fullMeasure ? false : !!r.dotted }))
    }))
  };
  return {
    melody, noteCount, keySig, tempo, chordEvents: dedupChords, keyChanges, beatCheck, verification, layout,
    repeatStructure,
    timeSig: detectedTS, beatsPerBar: bpb,
    pages: pdf.numPages, pageWidth: pageW, pageHeight: pageH
  };
}
