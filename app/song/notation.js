// 五線譜レンダラー（canvas）— 読み取った楽譜の再現と、音符クリック/ドラッグでの修正。
// PDF/MusicXMLから取り込んだメロディを五線譜で再現し、元の紙面と見くらべて直せるようにする。
// 音符クリックで選択（onSelect で対応表と連動）、上下ドラッグで線・間にスナップして音高を変更（onChange）。
// song.js（playTone, ensureAudioContext, midiToFrequency）の後に読み込む。

// midi → 五線上の位置（ト音記号、下第1線=E4 を step 0 とする幹音段数と♯の有無）
const NOTATION_PC_LETTER = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // C基準の幹音インデックス
const NOTATION_PC_SHARP = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const NOTATION_E_OFFSETS = [0, 1, 3, 5, 7, 8, 10]; // E,F,G,A,B,C,D の E からの半音数

function notationMidiToStaff(midi) {
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  const step = (oct - 4) * 7 + (NOTATION_PC_LETTER[pc] - 2); // E4 = step 0
  return { step, sharp: NOTATION_PC_SHARP[pc] === 1 };
}

function notationStaffStepToMidi(step) {
  const idx = ((step % 7) + 7) % 7;
  const oct = Math.floor(step / 7);
  return 64 + oct * 12 + NOTATION_E_OFFSETS[idx];
}

function createScoreNotation(canvas, options = {}) {
  const ctx = canvas.getContext("2d");
  const state = {
    melody: [],
    beatsPerBar: options.beatsPerBar || 4,
    onChange: options.onChange || (() => {}),
    onSelect: options.onSelect || (() => {}),
    selected: null,   // note オブジェクト参照
    drag: null,
    layouts: []       // render 時に確定した {note, x, y, step}
  };

  const SPACING = 9;             // 五線の線間
  const STAFF_H = SPACING * 4;
  const TOP_PAD = 30;            // 上加線・小節番号のための余白
  const BOTTOM_PAD = 34;         // 下加線・歌詞のための余白
  const LINE_H = TOP_PAD + STAFF_H + BOTTOM_PAD;
  const CLEF_W = 30;
  const MIN_MEASURE_W = 110;

  function totalBars() {
    const end = state.melody.reduce((m, n) => Math.max(m, n.startBeat + (n.beats || 1)), 0);
    return Math.max(1, Math.ceil(end / state.beatsPerBar || 1));
  }

  function layoutMetrics() {
    const cssW = Math.max(canvas.parentElement?.clientWidth || 320, 280);
    const bars = totalBars();
    const perLine = Math.max(1, Math.min(bars, Math.floor((cssW - CLEF_W - 6) / MIN_MEASURE_W)));
    const measureW = (cssW - CLEF_W - 6) / perLine;
    const lines = Math.ceil(bars / perLine);
    return { cssW, cssH: lines * LINE_H + 6, bars, perLine, measureW, lines };
  }

  function barOrigin(bar, m) {
    const line = Math.floor(bar / m.perLine);
    const col = bar % m.perLine;
    return { x: CLEF_W + col * m.measureW, top: line * LINE_H + TOP_PAD, col, line };
  }

  function stepToY(step, staffTop) {
    return staffTop + STAFF_H - step * (SPACING / 2);
  }

  // 簡易ト音記号（フォント依存を避けてベジェで描く）
  function drawClef(x, top) {
    const cx = x + 9;
    ctx.strokeStyle = "#1f2933";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, top - 6);
    ctx.bezierCurveTo(cx + 9, top + 2, cx - 8, top + STAFF_H * 0.55, cx + 1, top + STAFF_H * 0.8);
    ctx.bezierCurveTo(cx + 8, top + STAFF_H + 2, cx - 2, top + STAFF_H + 8, cx - 4, top + STAFF_H + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 1, top + STAFF_H * 0.75, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = "#1f2933";
    ctx.fill();
    ctx.lineWidth = 1;
  }

  function render() {
    const m = layoutMetrics();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(m.cssW * dpr);
    canvas.height = Math.round(m.cssH * dpr);
    canvas.style.width = `${m.cssW}px`;
    canvas.style.height = `${m.cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, m.cssW, m.cssH);
    state.layouts = [];
    if (!state.melody.length) {
      ctx.fillStyle = "#62717d";
      ctx.font = "12px sans-serif";
      ctx.fillText("メロディが入ると、ここに五線譜で再現するよ", 8, 22);
      return;
    }

    // 五線・小節線・記号
    for (let line = 0; line < m.lines; line += 1) {
      const top = line * LINE_H + TOP_PAD;
      const barsInLine = Math.min(m.perLine, m.bars - line * m.perLine);
      const right = CLEF_W + barsInLine * m.measureW;
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
      for (let c = 0; c <= barsInLine; c += 1) {
        const x = CLEF_W + c * m.measureW;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, top + STAFF_H);
        ctx.stroke();
      }
      // 小節番号
      ctx.fillStyle = "#62717d";
      ctx.font = "9px sans-serif";
      for (let c = 0; c < barsInLine; c += 1) {
        ctx.fillText(String(line * m.perLine + c + 1), CLEF_W + c * m.measureW + 2, top - 6);
      }
    }

    // 小節ごとに音符を置く（空小節は全休符）
    const bpb = state.beatsPerBar;
    const byBar = new Map();
    state.melody.forEach((n) => {
      const bar = Math.floor(n.startBeat / bpb);
      if (!byBar.has(bar)) byBar.set(bar, []);
      byBar.get(bar).push(n);
    });
    for (let bar = 0; bar < m.bars; bar += 1) {
      const o = barOrigin(bar, m);
      const notes = byBar.get(bar);
      if (!notes || !notes.length) {
        // 全休符（上から2本目の線の下にぶら下げる）
        ctx.fillStyle = "#1f2933";
        ctx.fillRect(o.x + m.measureW / 2 - 6, o.top + SPACING, 12, SPACING * 0.5);
        continue;
      }
      const pad = 14;
      for (const note of notes) {
        const offset = note.startBeat - bar * bpb;
        const x = o.x + pad + (offset / bpb) * (m.measureW - pad * 2);
        drawNote(note, x, o.top);
      }
    }
  }

  function drawNote(note, x, staffTop) {
    const { step, sharp } = notationMidiToStaff(note.midi);
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

    // 臨時記号
    if (sharp) {
      ctx.fillStyle = color;
      ctx.font = "11px sans-serif";
      ctx.fillText("♯", x - 14, y + 4);
    }

    // 符頭（2拍以上は白玉、4拍以上は全音符=符幹なし）
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 3.6, 0, 0, Math.PI * 2);
    if (beats >= 2) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();

    // 符幹と旗
    if (beats < 4) {
      const up = step < 4; // 第3線(B4)より下は上向き
      const sx = up ? x + 4.6 : x - 4.6;
      const sy = up ? y - 26 : y + 26;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, sy); ctx.stroke();
      const flags = beats <= 0.26 ? 2 : beats <= 0.51 ? 1 : 0;
      for (let f = 0; f < flags; f += 1) {
        const fy = sy + (up ? f * 5 : -f * 5);
        ctx.beginPath();
        ctx.moveTo(sx, fy);
        ctx.quadraticCurveTo(sx + 7, fy + (up ? 5 : -5), sx + 4, fy + (up ? 12 : -12));
        ctx.stroke();
      }
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

  function pointerPos(event) {
    const rect = canvas.getBoundingClientRect();
    return { mx: event.clientX - rect.left, my: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (event) => {
    const { mx, my } = pointerPos(event);
    const hit = hitTest(mx, my);
    if (!hit) return;
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
    // 線・間にスナップ（幹音）。半音の微調整は対応表の±で。
    const startStep = notationMidiToStaff(state.drag.startMidi).step;
    state.drag.layout.note.midi = notationStaffStepToMidi(startStep + dSteps);
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
    render
  };
}

// Nodeテスト用
if (typeof module !== "undefined" && module.exports) {
  module.exports = { notationMidiToStaff, notationStaffStepToMidi };
}
