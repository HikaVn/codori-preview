// 五線譜レンダラー（canvas）— 読み取った楽譜の再現と、音符クリック/ドラッグでの修正。
// PDF/MusicXMLから取り込んだメロディを五線譜で再現し、元の紙面と見くらべて直せるようにする。
// 音符クリックで選択（onSelect で対応表と連動）、上下ドラッグで線・間にスナップして音高を変更（onChange）。
// song.js（playTone, ensureAudioContext, midiToFrequency）の後に読み込む。

// midi → 五線上の位置（ト音記号、下第1線=E4 を step 0 とする幹音段数と変化記号）
// ♯系（既定）と♭系（フラット調）の2通りの綴りに対応する。
const NOTATION_PC_LETTER = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];       // C基準の幹音（♯綴り）
const NOTATION_PC_ALT = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];          // ♯綴りでの変化（+1）
const NOTATION_PC_LETTER_FLAT = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];  // ♭綴り
const NOTATION_PC_ALT_FLAT = [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0];
const NOTATION_E_OFFSETS = [0, 1, 3, 5, 7, 8, 10]; // E,F,G,A,B,C,D の E からの半音数
const NOTATION_STEP_LETTER_C = [2, 3, 4, 5, 6, 0, 1]; // step%7 → C基準の幹音
const NOTATION_SHARP_LETTERS = [3, 0, 4, 1, 5, 2, 6]; // F,C,G,D,A,E,B
const NOTATION_FLAT_LETTERS = [6, 2, 5, 1, 4, 0, 3];  // B,E,A,D,G,C,F
const NOTATION_SHARP_STEPS = [8, 5, 9, 6, 3, 7, 4];   // 調号の♯の描画位置（step）
const NOTATION_FLAT_STEPS = [4, 7, 3, 6, 2, 5, 1];    // 調号の♭の描画位置（step）

function notationMidiToStaff(midi, useFlats) {
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  const letter = useFlats ? NOTATION_PC_LETTER_FLAT[pc] : NOTATION_PC_LETTER[pc];
  const alt = useFlats ? NOTATION_PC_ALT_FLAT[pc] : NOTATION_PC_ALT[pc];
  const step = (oct - 4) * 7 + (letter - 2); // E4 = step 0
  return { step, alt };
}

function notationStaffStepToMidi(step) {
  const idx = ((step % 7) + 7) % 7;
  const oct = Math.floor(step / 7);
  return 64 + oct * 12 + NOTATION_E_OFFSETS[idx];
}

// 調号（五度圏 fifths）が幹音に与える変化
function notationKeyAlter(letterC, fifths) {
  if (fifths > 0) return NOTATION_SHARP_LETTERS.slice(0, fifths).includes(letterC) ? 1 : 0;
  if (fifths < 0) return NOTATION_FLAT_LETTERS.slice(0, -fifths).includes(letterC) ? -1 : 0;
  return 0;
}

// canvas 2D の使う分だけを模した SVG 出力シム。
// 描画コードは canvas のまま書け、出力は真のベクター(SVG)になる（拡大で滲まない・書き出せる）。
function makeSvgCtx() {
  const out = [];
  const base = () => ({ stroke: "#000", fill: "#000", lw: 1, font: 11, t: [1, 0, 0, 1, 0, 0] });
  let cur = base();
  const stack = [];
  let path = "";
  let pend = null; // 直近の ellipse（stroke/fill で確定）
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const ap = (x, y) => { const t = cur.t; return [t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5]]; };
  const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  const r2 = (v) => Math.round(v * 100) / 100;
  const ellSvg = (extra) => `<ellipse cx="${r2(pend.cx)}" cy="${r2(pend.cy)}" rx="${r2(pend.rx)}" ry="${r2(pend.ry)}" transform="rotate(${r2(pend.ang)} ${r2(pend.cx)} ${r2(pend.cy)})" ${extra}/>`;
  return {
    clear() { out.length = 0; path = ""; pend = null; stack.length = 0; cur = base(); },
    flush() { return out.join(""); },
    set strokeStyle(v) { cur.stroke = v; },
    set fillStyle(v) { cur.fill = v; },
    set lineWidth(v) { cur.lw = v; },
    get lineWidth() { return cur.lw; },
    set font(v) { const m = /(\d+(?:\.\d+)?)px/.exec(v); cur.font = m ? parseFloat(m[1]) : 11; },
    beginPath() { path = ""; pend = null; },
    moveTo(x, y) { const p = ap(x, y); path += `M${r2(p[0])} ${r2(p[1])}`; },
    lineTo(x, y) { const p = ap(x, y); path += `L${r2(p[0])} ${r2(p[1])}`; },
    bezierCurveTo(x1, y1, x2, y2, x, y) { const a = ap(x1, y1), b = ap(x2, y2), c = ap(x, y); path += `C${r2(a[0])} ${r2(a[1])} ${r2(b[0])} ${r2(b[1])} ${r2(c[0])} ${r2(c[1])}`; },
    quadraticCurveTo(cx, cy, x, y) { const a = ap(cx, cy), b = ap(x, y); path += `Q${r2(a[0])} ${r2(a[1])} ${r2(b[0])} ${r2(b[1])}`; },
    arc(x, y, rad) { const p = ap(x, y); path += `M${r2(p[0] + rad)} ${r2(p[1])}A${r2(rad)} ${r2(rad)} 0 1 0 ${r2(p[0] - rad)} ${r2(p[1])}A${r2(rad)} ${r2(rad)} 0 1 0 ${r2(p[0] + rad)} ${r2(p[1])}`; },
    ellipse(x, y, rx, ry) { const c = ap(x, y); const ang = Math.atan2(cur.t[1], cur.t[0]) * 180 / Math.PI; pend = { cx: c[0], cy: c[1], rx, ry, ang }; },
    fillRect(x, y, w, h) { const p = ap(x, y); out.push(`<rect x="${r2(p[0])}" y="${r2(p[1])}" width="${r2(w)}" height="${r2(h)}" fill="${cur.fill}"/>`); },
    stroke() { if (pend) { out.push(ellSvg(`fill="none" stroke="${cur.stroke}" stroke-width="${cur.lw}"`)); pend = null; return; } if (path) out.push(`<path d="${path}" fill="none" stroke="${cur.stroke}" stroke-width="${cur.lw}" stroke-linecap="round" stroke-linejoin="round"/>`); },
    fill() { if (pend) { out.push(ellSvg(`fill="${cur.fill}"`)); pend = null; return; } if (path) out.push(`<path d="${path}" fill="${cur.fill}"/>`); },
    fillText(t, x, y) { const p = ap(x, y); out.push(`<text x="${r2(p[0])}" y="${r2(p[1])}" fill="${cur.fill}" font-size="${cur.font}" font-family="sans-serif">${esc(t)}</text>`); },
    // SMuFL音楽グリフ（Bravura）。codeはコードポイント。anchor: start/middle/end。
    // attrs を渡すと data-* 等の属性を付けられる（可逆性: 符頭に音楽データを持たせる）。
    smufl(code, x, y, size, anchor, fill, attrs) {
      const p = ap(x, y);
      let a = "";
      if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) a += ` ${k}="${esc(String(attrs[k]))}"`;
      out.push(`<text x="${r2(p[0])}" y="${r2(p[1])}" fill="${fill || cur.fill}" font-size="${r2(size)}" font-family="BravuraSub" text-anchor="${anchor || "start"}"${a}>&#x${code.toString(16)};</text>`);
    },
    // 生のSVGマークアップを直接追加（metadata等）
    raw(s) { out.push(s); },
    save() { stack.push({ ...cur, t: cur.t.slice() }); },
    restore() { const s = stack.pop(); if (s) cur = s; },
    translate(x, y) { cur.t = mul(cur.t, [1, 0, 0, 1, x, y]); },
    rotate(a) { const c = Math.cos(a), s = Math.sin(a); cur.t = mul(cur.t, [c, s, -s, c, 0, 0]); }
  };
}

function createScoreNotation(canvas, options = {}) {
  const ctx = makeSvgCtx(); // canvas は <svg> 要素。描画は canvas風に書いてSVGを出力。
  const state = {
    melody: [],
    beatsPerBar: options.beatsPerBar || 4,
    fifths: options.keySig?.fifths || 0,   // 調号（五度圏: ♯=正/♭=負）
    onChange: options.onChange || (() => {}),
    onSelect: options.onSelect || (() => {}),
    onMeasureClick: options.onMeasureClick || null, // 音符以外（小節の余白）クリック→その拍を渡す
    selected: null,   // note オブジェクト参照
    drag: null,
    layout: options.layout || null, // 学習した元譜の配置（あれば元の配置で描く）
    layouts: [],      // render 時に確定した {note, x, y, step}
    measureZones: []  // クリック用の小節ゾーン {x0,x1,yTop,yBot,startBeat}（全休符小節も拾える）
  };

  const SPACING = 9;             // 五線の線間
  const STAFF_H = SPACING * 4;
  const TOP_PAD = 30;            // 上加線・小節番号のための余白
  const BOTTOM_PAD = 34;         // 下加線・歌詞のための余白
  const LINE_H = TOP_PAD + STAFF_H + BOTTOM_PAD;
  const CLEF_W = 30;
  // SMuFL（Bravura）: 1em = 五線の高さ(4間)。符頭・記号をプロの字形で描く。
  const MUSIC = STAFF_H;
  const HEAD_HALF = SPACING * 0.58; // 符頭の半幅（符幹の付け根）
  const SMUFL = {
    gClef: 0xe050, headBlack: 0xe0a4, headHalf: 0xe0a3, headWhole: 0xe0a2,
    flag8Up: 0xe240, flag8Down: 0xe241, flag16Up: 0xe242, flag16Down: 0xe243,
    flag32Up: 0xe244, flag32Down: 0xe245,
    restWhole: 0xe4e3, restHalf: 0xe4e4, restQuarter: 0xe4e5, rest8: 0xe4e6, rest16: 0xe4e7,
    accFlat: 0xe260, accNatural: 0xe261, accSharp: 0xe262, dot: 0xe1e7
  };
  const SMUFL_REST_CODES = new Set([0xe4e3, 0xe4e4, 0xe4e5, 0xe4e6, 0xe4e7]);
  const MIN_MEASURE_W = 110;

  function maxAbsFifths() {
    let mx = Math.abs(state.fifths);
    for (const n of state.melody) if (Number.isFinite(n.keyFifths)) mx = Math.max(mx, Math.abs(n.keyFifths));
    return mx;
  }
  function leftW() {
    return CLEF_W + maxAbsFifths() * 11 + (maxAbsFifths() ? 9 : 0);
  }

  function totalBars() {
    const end = state.melody.reduce((m, n) => Math.max(m, n.startBeat + (n.beats || 1)), 0);
    return Math.max(1, Math.ceil(end / state.beatsPerBar || 1));
  }

  function layoutMetrics() {
    const cssW = Math.max(canvas.parentElement?.clientWidth || 320, 280);
    const bars = totalBars();
    const lw = leftW();
    const perLine = Math.max(1, Math.min(bars, Math.floor((cssW - lw - 6) / MIN_MEASURE_W)));
    const measureW = (cssW - lw - 6) / perLine;
    const lines = Math.ceil(bars / perLine);
    return { cssW, cssH: lines * LINE_H + 6, bars, perLine, measureW, lines, lw };
  }

  function barOrigin(bar, m) {
    const line = Math.floor(bar / m.perLine);
    const col = bar % m.perLine;
    return { x: m.lw + col * m.measureW, top: line * LINE_H + TOP_PAD, col, line };
  }

  function stepToY(step, staffTop) {
    return staffTop + STAFF_H - step * (SPACING / 2);
  }

  // ト音記号（SMuFL gClef。baselineはG線＝下から2本目）
  function drawClef(x, top) {
    ctx.smufl(SMUFL.gClef, x + 2, top + 3 * SPACING, MUSIC, "start", "#1f2933");
  }

  function flush(m) {
    canvas.setAttribute("width", m.cssW);
    canvas.setAttribute("height", m.cssH);
    canvas.setAttribute("viewBox", `0 0 ${m.cssW} ${m.cssH}`);
    canvas.style.width = `${m.cssW}px`;
    canvas.style.height = `${m.cssH}px`;
    // 可逆性: 全音楽データを <metadata> にJSONで埋め込む（SVG単体から完全復元できる）
    // 先頭に透明な全面rectを敷く: 空白（音符以外の小節部分）クリックも拾えるようにする。
    const hitRect = `<rect x="0" y="0" width="${m.cssW}" height="${m.cssH}" fill="transparent" pointer-events="all"/>`;
    canvas.innerHTML = buildMetadata() + hitRect + ctx.flush();
  }

  // SVGに埋め込む権威データ（これだけで楽譜を完全復元できる）
  function buildMetadata() {
    const data = {
      format: "codori-notation",
      version: 1,
      beatsPerBar: state.beatsPerBar,
      fifths: state.fifths,
      layout: state.layout || undefined,
      melody: state.melody.map((n) => ({
        startBeat: n.startBeat, beats: n.beats, midi: n.midi, origMidi: n.origMidi,
        keyFifths: n.keyFifths, slurId: n.slurId, slurRole: n.slurRole,
        lyric: n.lyric, page: n.page, x: n.x, y: n.y
      }))
    };
    const json = JSON.stringify(data).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    return `<metadata id="codori-score-data">${json}</metadata>`;
  }

  function render() {
    // 学習レイアウトがあれば、元譜の配置（システム・x位置・小節線）で再現する。
    // 音高はMIDIから音楽的に再構築するので模写ではない。位置が無い場合は拍ベースで構築。
    if (state.layout && state.layout.systems && state.layout.systems.length && state.melody.length) {
      renderFromLayout();
      return;
    }
    const m = layoutMetrics();
    ctx.clear();
    state.layouts = [];
    state.measureZones = [];
    if (!state.melody.length) {
      ctx.fillStyle = "#62717d";
      ctx.font = "12px sans-serif";
      ctx.fillText("メロディが入ると、ここに五線譜で再現するよ", 8, 22);
      flush(m);
      return;
    }

    // 小節ごとに音符を分け、各小節の調号 fifths を先に求める（行ヘッダで使う＝転調対応）
    const bpb = state.beatsPerBar;
    const byBar = new Map();
    state.melody.forEach((n) => {
      const bar = Math.floor(n.startBeat / bpb);
      if (!byBar.has(bar)) byBar.set(bar, []);
      byBar.get(bar).push(n);
    });
    const barFifths = [];
    let curF = state.fifths;
    for (let bar = 0; bar < m.bars; bar += 1) {
      const ns = byBar.get(bar);
      if (ns && ns.length && Number.isFinite(ns[0].keyFifths)) curF = ns[0].keyFifths;
      barFifths[bar] = curF;
    }
    const lineFifths = (line) => barFifths[line * m.perLine] || 0;

    // 五線・小節線・記号
    for (let line = 0; line < m.lines; line += 1) {
      const top = line * LINE_H + TOP_PAD;
      const barsInLine = Math.min(m.perLine, m.bars - line * m.perLine);
      const right = m.lw + barsInLine * m.measureW;
      ctx.strokeStyle = "#9aa7b0";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i += 1) {
        const y = top + i * SPACING;
        ctx.beginPath();
        ctx.moveTo(4, y);
        ctx.lineTo(right, y);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(4, top);
      ctx.lineTo(4, top + STAFF_H);
      ctx.stroke();
      drawClef(6, top);
      // 調号（行ごと。転調する曲はラインで変わる）
      const lf = lineFifths(line);
      if (lf) {
        const steps = lf > 0 ? NOTATION_SHARP_STEPS : NOTATION_FLAT_STEPS;
        const accCode = lf > 0 ? SMUFL.accSharp : SMUFL.accFlat;
        for (let i = 0; i < Math.abs(lf); i += 1) {
          ctx.smufl(accCode, CLEF_W + i * 8, stepToY(steps[i], top), MUSIC, "start", "#1f2933");
        }
      }
      for (let c = 0; c <= barsInLine; c += 1) {
        const x = m.lw + c * m.measureW;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, top + STAFF_H);
        ctx.stroke();
      }
      // 小節番号
      ctx.fillStyle = "#62717d";
      ctx.font = "9px sans-serif";
      for (let c = 0; c < barsInLine; c += 1) {
        ctx.fillText(String(line * m.perLine + c + 1), m.lw + c * m.measureW + 2, top - 6);
      }
    }

    // 小節ごとに音符を置く（空小節は全休符）
    // タイ等で前の小節から保持される音が、この小節をどこまで覆うか（拍）
    const heldCoverEnd = (barStart) => {
      let end = barStart;
      for (const n of state.melody) {
        if (n.startBeat < barStart && n.startBeat + (n.beats || 1) > end) {
          end = Math.min(barStart + bpb, n.startBeat + n.beats);
        }
      }
      return end - barStart; // 0〜bpb
    };
    for (let bar = 0; bar < m.bars; bar += 1) {
      const o = barOrigin(bar, m);
      const notes = byBar.get(bar);
      const held = heldCoverEnd(bar * bpb); // この小節の頭から覆われている拍
      if (!notes || !notes.length) {
        // 保持音で小節全体が覆われていれば休符は描かない（タイの続き）
        if (held < bpb - 0.15) {
          ctx.fillStyle = "#1f2933";
          ctx.fillRect(o.x + m.measureW / 2 - 6, o.top + SPACING, 12, SPACING * 0.5);
        }
        continue;
      }
      const pad = 14;
      const localToX = (lb) => o.x + pad + (lb / bpb) * (m.measureW - pad * 2);
      const baseOf = (b) => ((b === 0.75 || b === 1.5 || b === 3 || b === 6) ? b / 1.5 : b);
      const sorted = notes.slice().sort((a, b) => a.startBeat - b.startBeat);
      const placed = sorted.map((note) => {
        const local = note.startBeat - bar * bpb;
        return { note, local, x: localToX(local), base: baseOf(Number(note.beats) || 1) };
      });
      // 休符（音符間・小節端の隙間）。小節頭が保持音で覆われている分は飛ばす。
      let cursor = held;
      for (const d of placed) {
        if (d.local - cursor > 0.15) drawRest(localToX((cursor + d.local) / 2), o.top, d.local - cursor);
        cursor = Math.max(cursor, d.local + (Number(d.note.beats) || 1));
      }
      if (bpb - cursor > 0.15) drawRest(localToX((cursor + bpb) / 2), o.top, bpb - cursor);

      // 連桁グループ: 同じ拍内に連続する8分以下(base<=0.5)の音符をまとめる
      const groups = [];
      let run = null;
      for (const d of placed) {
        const beamable = d.base <= 0.5 + 1e-6;
        const beat = Math.floor(d.local + 1e-6);
        if (beamable && run && run.beat === beat) run.items.push(d);
        else { if (run) groups.push(run); run = beamable ? { beat, items: [d] } : null; if (!beamable) groups.push({ items: [d], single: true }); }
      }
      if (run) groups.push(run);

      for (const g of groups) {
        if (g.single || g.items.length < 2) {
          for (const d of g.items) drawNote(d.note, d.x, o.top, null);
          continue;
        }
        // 連桁: 向きを多数決し、符幹の先を揃えて直線の連桁を引く
        const steps = g.items.map((d) => notationMidiToStaff(d.note.midi, state.fifths < 0).step);
        const up = steps.reduce((s, v) => s + v, 0) / steps.length < 4;
        const ys = g.items.map((d, i) => stepToY(steps[i], o.top));
        const tipY = up ? Math.min(...ys) - 24 : Math.max(...ys) + 24;
        for (const d of g.items) drawNote(d.note, d.x, o.top, { up, tipY });
        const x0 = (up ? g.items[0].x + HEAD_HALF : g.items[0].x - HEAD_HALF);
        const x1 = (up ? g.items[g.items.length - 1].x + HEAD_HALF : g.items[g.items.length - 1].x - HEAD_HALF);
        ctx.strokeStyle = state.selected && g.items.some((d) => d.note === state.selected) ? "#d89b2b" : "#1f2933";
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(x0, tipY); ctx.lineTo(x1, tipY); ctx.stroke();
        ctx.lineWidth = 1;
      }
    }

    // スラー: 同じ slurId の始点・終点（同じ行のみ）を曲線で結ぶ
    drawSlurs();

    flush(m);
  }

  // 学習レイアウトでの描画。元譜のシステム構成・x位置・小節線・休符・コードを使い、
  // 音高(縦位置)はMIDIから音楽的に再構築する（＝模写でなく、音楽的理解＋元の配置）。
  function renderFromLayout() {
    const layout = state.layout;
    const systems = layout.systems;
    const cssW = Math.max(canvas.parentElement?.clientWidth || 320, 280);
    const lw = leftW();
    const renderRight = cssW - 12;
    const m = { cssW, cssH: systems.length * LINE_H + 6 };
    ctx.clear();
    state.layouts = [];
    state.measureZones = [];

    // 各音符を「同じページで縦位置(y)が最も近いシステム」へ割り当てる
    const notesBySys = systems.map(() => []);
    for (const n of state.melody) {
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < systems.length; i += 1) {
        if (systems[i].page !== n.page) continue;
        const c = (systems[i].top + systems[i].bottom) / 2;
        const d = Math.abs(n.y - c);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best >= 0) notesBySys[best].push(n);
    }

    for (let si = 0; si < systems.length; si += 1) {
      const sys = systems[si];
      const top = si * LINE_H + TOP_PAD;
      const notes = notesBySys[si].slice().sort((a, b) => a.x - b.x);
      // コンテンツのx範囲（音符・小節線・休符）→ 描画幅へ線形写像（元の相対間隔を保つ）
      const xs = [];
      for (const n of notes) xs.push(n.x);
      for (const b of sys.bars || []) xs.push(b);
      for (const r of sys.rests || []) xs.push(r.x);
      const contentLeft = (xs.length ? Math.min(...xs) : (sys.clefX + 30)) - 3;
      const contentRight = (xs.length ? Math.max(...xs) : (layout.pageWidth - 20)) + 7;
      const span = Math.max(1, contentRight - contentLeft);
      const mapX = (x) => lw + ((x - contentLeft) / span) * (renderRight - lw);

      // 小節ゾーン（クリック→その小節の開始拍）。小節線で区切り、音符のある小節から開始拍を
      // 求め、全休符など音符の無い小節は前後から連番（1小節=拍子ぶん）で補完する。
      {
        const bpb = state.beatsPerBar || 4;
        const barXs = (sys.bars || []).map(mapX).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
        const bounds = [4, ...barXs, renderRight];
        const zs = new Array(Math.max(0, bounds.length - 1)).fill(null);
        for (const n of notes) {
          const zx = mapX(n.x);
          for (let i = 0; i < bounds.length - 1; i += 1) {
            if (zx >= bounds[i] - 1 && zx < bounds[i + 1]) {
              const ms = Math.floor((n.startBeat + 1e-6) / bpb) * bpb;
              if (zs[i] === null || ms < zs[i]) zs[i] = ms;
              break;
            }
          }
        }
        for (let i = 1; i < zs.length; i += 1) if (zs[i] === null && zs[i - 1] !== null) zs[i] = zs[i - 1] + bpb;
        for (let i = zs.length - 2; i >= 0; i -= 1) if (zs[i] === null && zs[i + 1] !== null) zs[i] = Math.max(0, zs[i + 1] - bpb);
        const yTop = si * LINE_H; const yBot = (si + 1) * LINE_H;
        for (let i = 0; i < zs.length; i += 1) {
          if (zs[i] === null || bounds[i + 1] - bounds[i] < 2) continue;
          state.measureZones.push({ x0: bounds[i], x1: bounds[i + 1], yTop, yBot, startBeat: zs[i] });
        }
      }

      // 五線
      ctx.strokeStyle = "#9aa7b0"; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i += 1) {
        const y = top + i * SPACING;
        ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(renderRight, y); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(4, top); ctx.lineTo(4, top + STAFF_H); ctx.stroke();
      drawClef(6, top);
      // 調号
      const lf = sys.fifths || 0;
      if (lf) {
        const steps = lf > 0 ? NOTATION_SHARP_STEPS : NOTATION_FLAT_STEPS;
        const accCode = lf > 0 ? SMUFL.accSharp : SMUFL.accFlat;
        for (let i = 0; i < Math.abs(lf); i += 1) ctx.smufl(accCode, CLEF_W + i * 8, stepToY(steps[i], top), MUSIC, "start", "#1f2933");
      }
      // 小節線
      ctx.strokeStyle = "#9aa7b0"; ctx.lineWidth = 1;
      for (const bx of sys.bars || []) {
        const x = mapX(bx);
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + STAFF_H); ctx.stroke();
      }
      // 段番号
      ctx.fillStyle = "#62717d"; ctx.font = "9px sans-serif";
      ctx.fillText(String(si + 1), 6, top - 6);
      // 休符（学習位置・学習した休符の種類で）
      for (const r of sys.rests || []) drawRest(mapX(r.x), top, r.beats, r);
      // コード（学習位置・五線の上）
      if (sys.chords && sys.chords.length) {
        ctx.fillStyle = "#1f6f4f"; ctx.font = "11px sans-serif";
        for (const c of sys.chords) ctx.fillText(c.text, mapX(c.x) - 4, top - 16);
      }
      // 音符: 連桁は「同じ拍で連続する8分以下」でまとめる（音楽的グルーピング）
      const placed = notes.map((n) => ({
        note: n, x: mapX(n.x),
        base: (n.beats === 0.75 || n.beats === 1.5 || n.beats === 3 || n.beats === 6) ? n.beats / 1.5 : n.beats
      }));
      const groups = [];
      let run = null;
      for (const d of placed) {
        const beamable = d.base <= 0.5 + 1e-6;
        const beat = Math.floor((d.note.startBeat || 0) + 1e-6);
        if (beamable && run && run.beat === beat) run.items.push(d);
        else { if (run) groups.push(run); run = beamable ? { beat, items: [d] } : null; if (!beamable) groups.push({ items: [d], single: true }); }
      }
      if (run) groups.push(run);
      for (const g of groups) {
        if (g.single || g.items.length < 2) { for (const d of g.items) drawNote(d.note, d.x, top, null); continue; }
        const steps = g.items.map((d) => notationMidiToStaff(d.note.midi, (Number.isFinite(d.note.keyFifths) ? d.note.keyFifths : state.fifths) < 0).step);
        const up = steps.reduce((s, v) => s + v, 0) / steps.length < 4;
        const ys = g.items.map((d, i) => stepToY(steps[i], top));
        const tipY = up ? Math.min(...ys) - 24 : Math.max(...ys) + 24;
        for (const d of g.items) drawNote(d.note, d.x, top, { up, tipY });
        const x0 = up ? g.items[0].x + HEAD_HALF : g.items[0].x - HEAD_HALF;
        const x1 = up ? g.items[g.items.length - 1].x + HEAD_HALF : g.items[g.items.length - 1].x - HEAD_HALF;
        ctx.strokeStyle = state.selected && g.items.some((d) => d.note === state.selected) ? "#d89b2b" : "#1f2933";
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(x0, tipY); ctx.lineTo(x1, tipY); ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
    drawSlurs();
    flush(m);
  }

  // スラー描画（state.layouts の start/end を結ぶ。行が違う場合は省略）
  function drawSlurs() {
    const byId = new Map();
    for (const l of state.layouts) {
      if (!l.note.slurId) continue;
      if (!byId.has(l.note.slurId)) byId.set(l.note.slurId, {});
      byId.get(l.note.slurId)[l.note.slurRole] = l;
    }
    ctx.strokeStyle = "#62717d";
    ctx.lineWidth = 1.3;
    for (const { start, end } of byId.values()) {
      if (!start || !end) continue;
      if (Math.abs(start.staffTop - end.staffTop) > 1 || end.x <= start.x) continue; // 行またぎは省略
      const yTop = Math.min(start.y, end.y) - 9;
      const midX = (start.x + end.x) / 2;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y - 6);
      ctx.quadraticCurveTo(midX, yTop, end.x, end.y - 6);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }
  // info（学習した休符）= {smufl, dotted}。あればその種類で描く。無ければ拍数から推定。
  function drawRest(x, staffTop, beats, info) {
    const midY = staffTop + 2 * SPACING; // 第3線（SMuFL休符の基準）
    let code;
    let dotted;
    if (info && info.smufl && SMUFL_REST_CODES.has(info.smufl)) {
      code = info.smufl;       // 学習した実際の休符グリフ（付点4分休符=4分休符＋点 など）
      dotted = !!info.dotted;
    } else if (Math.abs(beats - state.beatsPerBar) < 0.1) {
      code = SMUFL.restWhole;  // 1小節まるごと＝全休符の慣習
      dotted = false;
    } else {
      dotted = beats === 0.75 || beats === 1.5 || beats === 3 || beats === 6;
      const base = dotted ? beats / 1.5 : beats;
      code = base >= 4 ? SMUFL.restWhole : base >= 2 ? SMUFL.restHalf : base >= 1 ? SMUFL.restQuarter : base >= 0.5 ? SMUFL.rest8 : SMUFL.rest16;
    }
    ctx.smufl(code, x, midY, MUSIC, "middle", "#8a96a0");
    if (dotted) ctx.smufl(SMUFL.dot, x + HEAD_HALF + 1, midY - SPACING * 0.5, MUSIC, "start", "#8a96a0");
  }

  // アーティキュレーション記号をベクターで描く（フォント非依存）。
  function drawArtic(artic, x, y, stemUp, staffTop, color) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.1;
    if (artic === "fermata") {
      const ay = staffTop - SPACING * 1.6;
      ctx.beginPath(); ctx.moveTo(x - 6, ay + 2); ctx.quadraticCurveTo(x, ay - 7, x + 6, ay + 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, ay - 1.5, 1.2); ctx.fill();
      return;
    }
    // 符幹と反対側（符幹が上なら下、下なら上）に置く
    const ay = stemUp ? y + SPACING * 1.7 : y - SPACING * 1.7;
    if (artic === "staccato") {
      ctx.beginPath(); ctx.arc(x, ay, 1.3); ctx.fill();
    } else if (artic === "staccatissimo") {
      const d = stemUp ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(x, ay - 3 * d); ctx.lineTo(x - 2, ay + 2 * d); ctx.lineTo(x + 2, ay + 2 * d); ctx.fill();
    } else if (artic === "tenuto") {
      ctx.beginPath(); ctx.moveTo(x - 3.5, ay); ctx.lineTo(x + 3.5, ay); ctx.stroke();
    } else if (artic === "accent") {
      ctx.beginPath(); ctx.moveTo(x - 4, ay - 2.5); ctx.lineTo(x + 4, ay); ctx.lineTo(x - 4, ay + 2.5); ctx.stroke();
    } else if (artic === "marcato") {
      const d = stemUp ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(x - 3, ay + 3 * d); ctx.lineTo(x, ay - 3 * d); ctx.lineTo(x + 3, ay + 3 * d); ctx.stroke();
    }
  }

  function drawNote(note, x, staffTop, beam) {
    const fifths = Number.isFinite(note.keyFifths) ? note.keyFifths : state.fifths;
    const { step, alt } = notationMidiToStaff(note.midi, fifths < 0);
    const y = stepToY(step, staffTop);
    const beats = Number(note.beats) || 1;
    const changed = Number.isFinite(note.origMidi) && note.origMidi !== note.midi;
    const color = state.selected === note ? "#d89b2b" : changed ? "#1e5aa8" : "#1f2933";

    // 加線
    ctx.strokeStyle = "#9aa7b0";
    ctx.lineWidth = 1;
    for (let s = -2; s >= step; s -= 2) {
      const ly = stepToY(s, staffTop);
      ctx.beginPath(); ctx.moveTo(x - 7, ly); ctx.lineTo(x + 7, ly); ctx.stroke();
    }
    for (let s = 10; s <= step; s += 2) {
      const ly = stepToY(s, staffTop);
      ctx.beginPath(); ctx.moveTo(x - 7, ly); ctx.lineTo(x + 7, ly); ctx.stroke();
    }

    // 臨時記号（調号で説明できる変化は描かない。調号の変化を打ち消すときは♮）
    const keyA = notationKeyAlter(NOTATION_STEP_LETTER_C[((step % 7) + 7) % 7], fifths);
    if (alt !== keyA) {
      const accCode = alt === 1 ? SMUFL.accSharp : alt === -1 ? SMUFL.accFlat : SMUFL.accNatural;
      ctx.smufl(accCode, x - SPACING * 1.7, y, MUSIC, "start", color);
    }

    // 符頭（SMuFL: 4拍以上=全音符、2拍以上=2分、それ未満=黒玉）。
    // 可逆性: 各符頭に音楽データ(data-*)を持たせ、SVG単体から音を識別できるようにする。
    const headCode = beats >= 4 ? SMUFL.headWhole : beats >= 2 ? SMUFL.headHalf : SMUFL.headBlack;
    ctx.smufl(headCode, x, y, MUSIC, "middle", color, {
      "class": "note-head",
      "data-midi": note.midi,
      "data-beat": Math.round(note.startBeat * 1000) / 1000,
      "data-beats": note.beats,
      "data-key-fifths": Number.isFinite(note.keyFifths) ? note.keyFifths : undefined,
      "data-lyric": note.lyric || undefined,
      "data-slur-id": note.slurId || undefined,
      "data-slur-role": note.slurRole || undefined
    });

    // 付点（付点音価は基準値×1.5）。符頭の右に付点グリフ。
    const dotted = beats === 0.75 || beats === 1.5 || beats === 3 || beats === 6;
    const base = dotted ? beats / 1.5 : beats;
    if (dotted) {
      const onLine = ((step % 2) + 2) % 2 === 0;
      ctx.smufl(SMUFL.dot, x + HEAD_HALF + 2, y - (onLine ? SPACING / 2 : 0), MUSIC, "start", color);
    }

    // 符幹と旗（連桁グループのときは旗を描かず、符幹を連桁の高さまで伸ばす）
    if (base < 4) {
      const up = beam ? beam.up : step < 4; // 第3線(B4)より下は上向き
      const sx = up ? x + HEAD_HALF : x - HEAD_HALF;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      if (beam) {
        ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, beam.tipY); ctx.stroke();
      } else {
        const sy = up ? y - SPACING * 3.3 : y + SPACING * 3.3;
        ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, sy); ctx.stroke();
        // 旗（SMuFL）。符幹の先に付く。
        const flagCode = base <= 0.13 ? (up ? SMUFL.flag32Up : SMUFL.flag32Down)
          : base <= 0.26 ? (up ? SMUFL.flag16Up : SMUFL.flag16Down)
            : base <= 0.51 ? (up ? SMUFL.flag8Up : SMUFL.flag8Down) : null;
        if (flagCode) ctx.smufl(flagCode, sx, sy, MUSIC, "start", color);
      }
    }

    // アーティキュレーション記号（符頭の符幹と反対側、フェルマータは五線の上）。
    // フォントサブセット非依存にするためベクター原図形で描く。
    if (note.artic) {
      const stemUp = base < 4 ? (beam ? beam.up : step < 4) : step < 4;
      drawArtic(note.artic, x, y, stemUp, staffTop, color);
    }

    // 歌詞
    if (note.lyric) {
      ctx.fillStyle = "#62717d";
      ctx.font = "10px sans-serif";
      ctx.fillText(note.lyric, x - 5, staffTop + STAFF_H + 26);
    }

    state.layouts.push({ note, x, y, staffTop, step });
  }

  function hitTest(mx, my) {
    let best = null;
    let bestD = 81; // 9px
    for (const l of state.layouts) {
      const d = (l.x - mx) * (l.x - mx) + (l.y - my) * (l.y - my);
      if (d < bestD) { bestD = d; best = l; }
    }
    return best;
  }

  // クリック位置に最も近い音符（同じ段＝y帯のなかでx最近）。小節クリックの拍特定に使う。
  function nearestNote(mx, my) {
    let best = null;
    let bestD = Infinity;
    for (const l of state.layouts) {
      if (Math.abs(l.y - my) > LINE_H * 0.6) continue; // だいたい同じ段
      const d = Math.abs(l.x - mx);
      if (d < bestD) { bestD = d; best = l; }
    }
    return best;
  }

  // クリック位置の小節の開始拍。小節ゾーンを優先（全休符小節も正しく拾える）、
  // 無ければ最寄り音符の拍にフォールバック。該当なしは null。
  function measureBeatAt(mx, my) {
    for (const z of state.measureZones) {
      if (mx >= z.x0 && mx < z.x1 && my >= z.yTop && my < z.yBot) return z.startBeat;
    }
    const near = nearestNote(mx, my);
    return near && Number.isFinite(near.note.startBeat) ? near.note.startBeat : null;
  }

  function pointerPos(event) {
    const rect = canvas.getBoundingClientRect();
    return { mx: event.clientX - rect.left, my: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (event) => {
    const { mx, my } = pointerPos(event);
    const hit = hitTest(mx, my);
    if (!hit) {
      // 音符以外（小節の余白）をクリック → その小節のコードを試聴する
      if (state.onMeasureClick) {
        const beat = measureBeatAt(mx, my);
        if (beat !== null) {
          event.preventDefault();
          state.onMeasureClick(beat);
        }
      }
      return;
    }
    event.preventDefault();
    state.selected = hit.note;
    state.drag = { layout: hit, startY: my, startMidi: hit.note.midi, moved: false };
    canvas.setPointerCapture(event.pointerId);
    render();
    state.onSelect(hit.note);
  });

  canvas.addEventListener("pointermove", (event) => {
    const { mx, my } = pointerPos(event);
    if (!state.drag) {
      canvas.style.cursor = hitTest(mx, my) ? "ns-resize" : "default";
      return;
    }
    const dSteps = Math.round((state.drag.startY - my) / (SPACING / 2));
    if (dSteps !== 0) state.drag.moved = true;
    // 線・間にスナップ（調号を反映した音）。半音の微調整は対応表の±で。
    const startStep = notationMidiToStaff(state.drag.startMidi, state.fifths < 0).step;
    const step = startStep + dSteps;
    const keyA = notationKeyAlter(NOTATION_STEP_LETTER_C[((step % 7) + 7) % 7], state.fifths);
    state.drag.layout.note.midi = notationStaffStepToMidi(step) + keyA;
    render();
  });

  function endDrag(event) {
    if (state.drag) {
      const note = state.drag.layout.note;
      const moved = state.drag.moved && note.midi !== state.drag.startMidi;
      state.drag = null;
      if (moved) {
        state.onChange(note);
      }
      try {
        if (typeof playTone === "function" && typeof midiToFrequency === "function") {
          const audio = ensureAudioContext();
          playTone(midiToFrequency(note.midi), audio.currentTime + 0.02, 0.35, 0.15, "triangle");
        }
      } catch (e) { /* 試聴は失敗してもよい */ }
    }
    if (event && event.pointerId != null && canvas.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  return {
    setMelody(melody, opts = {}) {
      state.melody = melody;
      if (opts.beatsPerBar) state.beatsPerBar = opts.beatsPerBar;
      if (opts.keySig !== undefined) state.fifths = opts.keySig?.fifths || 0;
      if (opts.layout !== undefined) state.layout = opts.layout;
      if (!melody.includes(state.selected)) state.selected = null;
      render();
    },
    select(note) {
      state.selected = note;
      render();
    },
    getSelected() {
      return state.selected;
    },
    // 自己完結SVG（音楽データ埋め込み済み）を文字列で取り出す
    getSVG() {
      render();
      return new XMLSerializer().serializeToString(canvas);
    },
    render
  };
}

// SVG（自己完結フォーマット）→ 音楽データへ可逆復元する。
// 文字列でもSVG要素でも受け取れる。{ beatsPerBar, fifths, melody } を返す（無ければ null）。
function parseScoreSVG(svgOrText) {
  let json = null;
  if (typeof svgOrText === "string") {
    const m = svgOrText.match(/<metadata id="codori-score-data">([\s\S]*?)<\/metadata>/);
    if (m) json = m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  } else if (svgOrText && svgOrText.querySelector) {
    const el = svgOrText.querySelector("#codori-score-data");
    if (el) json = el.textContent;
  }
  if (!json) return null;
  try {
    const data = JSON.parse(json);
    return {
      title: data.title,
      bpm: data.bpm,
      beatsPerBar: data.beatsPerBar,
      fifths: data.fifths,
      keySig: data.keySig || (Number.isFinite(data.fifths) ? { fifths: data.fifths } : null),
      layout: data.layout || null,
      repeatStructure: data.repeatStructure || null,
      melody: data.melody || [],
      chordEvents: data.chordEvents || [],
      lyricLines: data.lyricLines || []
    };
  } catch (e) {
    return null;
  }
}

// Nodeテスト用
if (typeof module !== "undefined" && module.exports) {
  module.exports = { notationMidiToStaff, notationStaffStepToMidi, notationKeyAlter, parseScoreSVG };
}
