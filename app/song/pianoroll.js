// メロディ編集用ピアノロール（canvas）
// ボーカル起こしのノートを、長さ・位置・音程で手なおしして、声をクリーンアップする。
// 取り込み画面の作業中メロディ（importState.workingScore.melody）を編集する。
// song.js（playTone, ensureAudioContext, midiToFrequency）の後に読み込む。

const ROLL_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function createPianoRoll(canvas, options = {}) {
  const ctx = canvas.getContext("2d");
  const state = {
    melody: [],
    bpm: options.bpm || 100,
    beatsPerBar: options.beatsPerBar || 4,
    quantUnit: options.quantUnit || 0.25,
    pxPerBeat: options.pxPerBeat || 64,
    rowH: 14,
    playheadBeat: null,   // 再生位置（拍）。nullなら非表示
    onChange: options.onChange || (() => {}),
    minMidi: 55,
    maxMidi: 79,
    drag: null,
    scrollX: 0
  };

  function recomputeRange() {
    if (!state.melody.length) {
      state.minMidi = 57;
      state.maxMidi = 79;
      return;
    }
    const midis = state.melody.map((n) => n.midi);
    state.minMidi = Math.min(...midis) - 3;
    state.maxMidi = Math.max(...midis) + 3;
    if (state.maxMidi - state.minMidi < 14) {
      state.maxMidi = state.minMidi + 14;
    }
  }

  function totalBeats() {
    return state.melody.reduce((max, n) => Math.max(max, n.startBeat + n.beats), 8);
  }

  function rows() {
    return state.maxMidi - state.minMidi + 1;
  }

  function layout() {
    const labelW = 34;
    const height = rows() * state.rowH;
    canvas.height = height;
    canvas.width = Math.max(canvas.parentElement.clientWidth - 2, 320);
    return { labelW, height, width: canvas.width };
  }

  function midiToY(midi, height) {
    return height - (midi - state.minMidi + 1) * state.rowH;
  }

  function yToMidi(y, height) {
    return state.maxMidi - Math.floor(y / state.rowH);
  }

  function beatToX(beat, labelW) {
    return labelW + beat * state.pxPerBeat - state.scrollX;
  }

  function xToBeat(x, labelW) {
    return (x - labelW + state.scrollX) / state.pxPerBeat;
  }

  function snapUnit() {
    return Array.isArray(state.quantUnit) ? Math.min(...state.quantUnit) : state.quantUnit;
  }

  function snap(beat) {
    const unit = snapUnit() || 0.25;
    return Math.max(0, Math.round(beat / unit) * unit);
  }

  function render() {
    recomputeRange();
    const { labelW, height, width } = layout();
    ctx.clearRect(0, 0, width, height);

    // 行（鍵盤）
    for (let midi = state.minMidi; midi <= state.maxMidi; midi += 1) {
      const y = midiToY(midi, height);
      const isBlack = [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
      ctx.fillStyle = isBlack ? "#eef2f6" : "#ffffff";
      ctx.fillRect(labelW, y, width - labelW, state.rowH);
      if (((midi % 12) + 12) % 12 === 0) {
        ctx.fillStyle = "#62717d";
        ctx.font = "10px sans-serif";
        ctx.fillText(`C${Math.floor(midi / 12) - 1}`, 4, y + state.rowH - 3);
      }
    }
    // 鍵盤ラベル列の枠
    ctx.strokeStyle = "#d9e3e8";
    ctx.beginPath();
    ctx.moveTo(labelW, 0);
    ctx.lineTo(labelW, height);
    ctx.stroke();

    // 小節・拍の縦線
    const beats = totalBeats() + 2;
    for (let b = 0; b <= beats; b += 1) {
      const x = beatToX(b, labelW);
      if (x < labelW || x > width) {
        continue;
      }
      const isBar = b % state.beatsPerBar === 0;
      ctx.strokeStyle = isBar ? "rgba(31,41,51,0.22)" : "rgba(31,41,51,0.08)";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      if (isBar) {
        ctx.fillStyle = "rgba(31,41,51,0.35)";
        ctx.font = "10px sans-serif";
        ctx.fillText(String(b / state.beatsPerBar + 1), x + 2, 11);
      }
    }

    // ノート
    state.melody.forEach((note, index) => {
      const x = beatToX(note.startBeat, labelW);
      const w = Math.max(6, note.beats * state.pxPerBeat - 1);
      const y = midiToY(note.midi, height);
      ctx.fillStyle = state.drag?.index === index ? "#d89b2b" : "#1e5aa8";
      ctx.fillRect(x, y + 1, w, state.rowH - 2);
      if (note.lyric) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px sans-serif";
        ctx.fillText(note.lyric, x + 2, y + state.rowH - 3);
      }
      // 右端のリサイズハンドル
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(x + w - 3, y + 1, 3, state.rowH - 2);
    });

    // 再生位置の縦線（プレイヘッド）
    if (state.playheadBeat !== null) {
      const px = beatToX(state.playheadBeat, labelW);
      if (px >= labelW && px <= width) {
        ctx.strokeStyle = "#e0533a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();
      }
    }
  }

  function hitTest(mx, my) {
    const { labelW, height } = layout();
    for (let i = state.melody.length - 1; i >= 0; i -= 1) {
      const note = state.melody[i];
      const x = beatToX(note.startBeat, labelW);
      const w = Math.max(6, note.beats * state.pxPerBeat - 1);
      const y = midiToY(note.midi, height);
      if (mx >= x && mx <= x + w && my >= y && my <= y + state.rowH) {
        const onEdge = mx >= x + w - 6;
        return { index: i, mode: onEdge ? "resize" : "move" };
      }
    }
    return null;
  }

  function pointerPos(event) {
    const rect = canvas.getBoundingClientRect();
    return { mx: event.clientX - rect.left, my: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (event) => {
    const { mx, my } = pointerPos(event);
    const { labelW, height } = layout();
    if (mx < labelW) {
      return;
    }
    const hit = hitTest(mx, my);
    if (event.altKey || event.button === 2) {
      // 削除
      if (hit) {
        state.melody.splice(hit.index, 1);
        commit();
      }
      return;
    }
    if (hit) {
      const note = state.melody[hit.index];
      state.drag = {
        index: hit.index,
        mode: hit.mode,
        grabBeat: xToBeat(mx, labelW) - note.startBeat,
        startMidi: note.midi
      };
    } else {
      // 空白 → 新規ノート
      const beat = snap(xToBeat(mx, labelW));
      const midi = yToMidi(my, height);
      state.melody.push({ startBeat: beat, beats: snapUnit() * 2, midi });
      state.melody.sort((a, b) => a.startBeat - b.startBeat);
      const index = state.melody.findIndex((n) => n.startBeat === beat && n.midi === midi);
      state.drag = { index, mode: "resize", grabBeat: 0, startMidi: midi };
    }
    canvas.setPointerCapture(event.pointerId);
    render();
  });

  canvas.addEventListener("pointermove", (event) => {
    const { mx, my } = pointerPos(event);
    const { labelW, height } = layout();
    if (!state.drag) {
      const hit = hitTest(mx, my);
      canvas.style.cursor = hit ? (hit.mode === "resize" ? "ew-resize" : "move") : "crosshair";
      return;
    }
    const note = state.melody[state.drag.index];
    if (!note) {
      return;
    }
    if (state.drag.mode === "resize") {
      const endBeat = snap(xToBeat(mx, labelW));
      note.beats = Math.max(snapUnit(), endBeat - note.startBeat);
    } else {
      note.startBeat = snap(xToBeat(mx, labelW) - state.drag.grabBeat);
      note.midi = Math.max(state.minMidi - 6, Math.min(state.maxMidi + 6, yToMidi(my, height)));
    }
    render();
  });

  function endDrag(event) {
    if (state.drag) {
      state.melody.sort((a, b) => a.startBeat - b.startBeat);
      state.drag = null;
      commit();
    }
    if (event && event.pointerId != null && canvas.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  function commit() {
    render();
    state.onChange(state.melody);
  }

  let previewTimer = null;
  function play() {
    stop();
    const audio = ensureAudioContext();
    const now = audio.currentTime + 0.1;
    const spb = 60 / state.bpm;
    state.melody.forEach((note) => {
      const beats = Number(note.beats) || snapUnit() || 0.25;
      if (!Number.isFinite(note.midi) || !Number.isFinite(note.startBeat)) {
        return;
      }
      playTone(midiToFrequency(note.midi), now + note.startBeat * spb, Math.max(0.1, beats * spb * 0.95), 0.16, "triangle");
    });
    const totalMs = (totalBeats() * spb + 0.3) * 1000;
    previewTimer = window.setTimeout(stop, totalMs);
  }
  function stop() {
    if (previewTimer) {
      window.clearTimeout(previewTimer);
      previewTimer = null;
    }
  }

  return {
    setMelody(melody, opts = {}) {
      state.melody = melody;
      if (opts.bpm) state.bpm = opts.bpm;
      if (opts.beatsPerBar) state.beatsPerBar = opts.beatsPerBar;
      if (opts.quantUnit) state.quantUnit = opts.quantUnit;
      render();
    },
    setScale(opts = {}) {
      if (opts.bpm) state.bpm = opts.bpm;
      if (opts.beatsPerBar) state.beatsPerBar = opts.beatsPerBar;
      if (opts.quantUnit) state.quantUnit = opts.quantUnit;
      render();
    },
    getMelody() {
      return state.melody;
    },
    // 再生位置ラインの表示/移動（拍）。null で消す。
    setPlayhead(beat) {
      state.playheadBeat = beat;
      render();
    },
    render,
    play,
    stop
  };
}
