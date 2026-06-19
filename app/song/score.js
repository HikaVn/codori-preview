// 楽譜とりこみ（MusicXML / PDF）— 音源取り込みとは完全に独立した画面・状態。
// メロディ・コード・歌詞を取り込み、ピアノロールと「音符↔音」対応表で手なおしして譜面化する。
// song.js（applyImportedSong, midiToFrequency, playTone, ensureAudioContext）
// musicxml.js / pdfscore.js（loadMusicXmlFile, extractPdfLyrics, parseScoreText, extractPdfVectorMelody, loadPdfjs, toHiragana）
// pianoroll.js（createPianoRoll）/ dsp.js（fitLyricsToMelody, groupLyricsToMelody）の後に読み込む。

const SCORE_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCORE_NOTE_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const scoreState = {
  title: "",
  bpm: 100,
  beatsPerBar: 4,
  events: [],       // [{type:'section'|'chord', chord, beats, ...}]
  melody: [],       // [{startBeat, beats, midi, origMidi, lyric}]
  lyricLines: [],
  keySig: null,     // {fifths, mode, tonic} | null（PDF読み取りの調号）
  chordEvents: [],  // 認識どおりの絶対拍位置のコード [{startBeat, chord}]（試聴用）
  repeatStructure: null, // 繰り返し構造（リピート/D.C./D.S.）| null
  playOrder: null,  // 繰り返し展開した再生順（拍区間の並び）| null
  pianoRoll: null,
  notation: null,
  overlayPages: []  // PDF重ね合わせの {pageNum, marks, scale, dispScale}
};

const scoreEl = {
  tab: document.querySelector("#tab-score"),
  view: document.querySelector("#score-view"),
  dropzone: document.querySelector("#score-dropzone"),
  musicxmlButton: document.querySelector("#score-musicxml-button"),
  musicxmlInput: document.querySelector("#score-musicxml"),
  pdfButton: document.querySelector("#score-pdf-button"),
  pdfInput: document.querySelector("#score-pdf"),
  status: document.querySelector("#score-load-status"),
  progress: document.querySelector("#score-progress"),
  progressLabel: document.querySelector("#score-progress-label"),
  result: document.querySelector("#score-result"),
  summary: document.querySelector("#score-summary"),
  bpm: document.querySelector("#score-bpm"),
  beatsPerBar: document.querySelector("#score-beats-per-bar"),
  playMelody: document.querySelector("#score-play-melody"),
  playChords: document.querySelector("#score-play-chords"),
  swingToggle: document.querySelector("#score-swing-toggle"),
  seek: document.querySelector("#score-seek"),
  speed: document.querySelector("#score-speed"),
  speedLabel: document.querySelector("#score-speed-label"),
  chordEditor: document.querySelector("#score-chord-editor"),
  notationCanvas: document.querySelector("#score-notation"),
  overlayBlock: document.querySelector("#score-overlay-block"),
  overlay: document.querySelector("#score-overlay"),
  canvas: document.querySelector("#score-pianoroll"),
  noteTable: document.querySelector("#score-note-table"),
  lyrics: document.querySelector("#score-lyrics"),
  toHiragana: document.querySelector("#score-to-hiragana"),
  fitLyrics: document.querySelector("#score-fit-lyrics"),
  lyricsSummary: document.querySelector("#score-lyrics-summary"),
  convert: document.querySelector("#score-convert")
};

function scoreMidiToName(midi) {
  if (!Number.isFinite(midi)) return "";
  const names = scoreState.keySig?.fifths < 0 ? SCORE_NOTE_NAMES_FLAT : SCORE_NOTE_NAMES;
  return names[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

function scoreKeySigName() {
  const k = scoreState.keySig;
  if (!k) return "";
  const names = k.fifths < 0 ? SCORE_NOTE_NAMES_FLAT : SCORE_NOTE_NAMES;
  const acc = k.fifths === 0 ? "" : k.fifths > 0 ? `（♯${k.fifths}）` : `（♭${-k.fifths}）`;
  return `${names[k.tonic % 12]}${k.mode === "minor" ? "マイナー" : "メジャー"}${acc}`;
}

function scoreNameToMidi(name) {
  const m = String(name || "").trim().match(/^([A-Ga-g])([#b]?)(-?\d{1,2})$/);
  if (!m) return null;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()];
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  const oct = parseInt(m[3], 10);
  return base + acc + (oct + 1) * 12;
}

function setScoreProgress(label) {
  scoreEl.progress.classList.remove("is-hidden");
  scoreEl.progressLabel.textContent = label;
}
function hideScoreProgress() {
  scoreEl.progress.classList.add("is-hidden");
}

function recomputeScoreStartBeats() {
  let beat = 0;
  scoreState.events.forEach((event) => {
    event.startBeat = beat;
    if (event.type === "chord") {
      beat += Number(event.beats) || 0;
    }
  });
  return beat;
}

// 取り込んだ楽譜データを scoreState へ
function loadScoreData(parsed, kind) {
  if (typeof scorePreviewStop === "function") scorePreviewStop();
  scoreState.title = parsed.title || kind;
  scoreState.bpm = parsed.bpm || 100;
  scoreState.beatsPerBar = parsed.beatsPerBar || 4;
  scoreState.keySig = parsed.keySig || null;
  scoreState.beatCheck = parsed.beatCheck || null; // 拍検算（小節ごとの拍合計が拍子に合うか）
  scoreState.verification = parsed.verification || null; // 相互チェック（拍・臨時記号・調号の整合）
  scoreState.layout = parsed.layout || null;       // 学習した元譜の配置（あれば元の配置で再現）
  scoreState.repeatStructure = parsed.repeatStructure || null; // 繰り返し構造（リピート/D.C./D.S.）
  // 繰り返しの「再生順」（拍区間の並び）。記号があれば展開、無ければnull（通常再生）。
  scoreState.playOrder = (scoreState.repeatStructure && typeof expandRepeats === "function")
    ? expandRepeats(scoreState.repeatStructure) : null;
  // コード列 → events（startBeatは隣との差で拍数化）
  const chords = [...(parsed.chordEvents || [])].sort((a, b) => a.startBeat - b.startBeat);
  // 試聴用に「認識どおりの絶対拍位置」も保持する（events のギャップ拍数化では
  // 先頭コードの絶対位置が失われ、メロディ（絶対拍）と試聴がずれるため）。
  scoreState.chordEvents = chords.map((c) => ({ startBeat: c.startBeat, chord: c.chord }));
  scoreState.events = [{ type: "section", label: kind, beats: 0, lineIndex: 0 }];
  if (chords.length) {
    chords.forEach((c, i) => {
      const next = chords[i + 1];
      const beats = next ? Math.max(0.25, next.startBeat - c.startBeat) : scoreState.beatsPerBar;
      scoreState.events.push({ type: "chord", chord: c.chord, lyric: "", beats, lineIndex: 1 });
    });
  } else {
    scoreState.events.push({ type: "chord", chord: null, lyric: "", beats: scoreState.beatsPerBar, lineIndex: 1 });
  }
  // メロディ（元推定値 origMidi と、PDF上の位置 page/x/y を保持）
  scoreState.melody = (parsed.melody || [])
    .map((n) => ({ startBeat: n.startBeat, beats: n.beats, midi: n.midi, origMidi: n.midi, lyric: n.lyric || "", page: n.page, x: n.x, y: n.y, keyFifths: n.keyFifths, slurId: n.slurId, slurRole: n.slurRole, artic: n.artic }))
    .sort((a, b) => a.startBeat - b.startBeat);
  // 歌詞
  if (parsed.words && parsed.words.length) {
    scoreState.lyricLines = [parsed.words.map((w) => w.text).join(" ")];
  } else {
    scoreState.lyricLines = parsed.lyricLines || [];
  }

  scoreEl.bpm.value = String(Math.round(scoreState.bpm * 10) / 10);
  scoreEl.beatsPerBar.value = String(scoreState.beatsPerBar);
  scoreEl.lyrics.value = scoreState.lyricLines.join("\n");
  scoreEl.result.classList.remove("is-hidden");
  scoreEl.status.textContent = `${scoreState.title} を読み込んだよ`;
  renderScore();
  scoreEl.result.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderScore() {
  recomputeScoreStartBeats();
  const chordCount = scoreState.events.filter((e) => e.type === "chord" && e.chord).length;
  const keyName = scoreKeySigName();
  const bc = scoreState.beatCheck;
  let beatNote = "";
  if (bc && bc.measures) {
    beatNote = bc.problemCount === 0
      ? ` / 拍検算: 全${bc.measures}小節OK`
      : ` / 拍検算: ${bc.balanced}/${bc.measures}小節OK（残り${bc.problemCount}はリズムを自動補正）`;
  }
  let repeatNote = "";
  const rs = scoreState.repeatStructure;
  if (rs) {
    const parts = [];
    if (rs.repeats && rs.repeats.length) parts.push(`リピート${rs.repeats.length}`);
    if (rs.dcAlFine) parts.push("D.C. al Fine");
    if (rs.dsAlCoda) parts.push("D.S. al Coda");
    if (parts.length) repeatNote = ` / 繰り返し: ${parts.join("・")}（再生時に展開）`;
  }
  // 相互チェック（臨時記号の前後矛盾・調号の取り違え疑い）を要確認として表示。
  let checkNote = "";
  const vf = scoreState.verification;
  if (vf) {
    const parts = [];
    if (vf.accidentals && vf.accidentals.count > 0) {
      parts.push(`臨時記号の前後矛盾${vf.accidentals.count}件（要確認）`);
    }
    if (vf.key && vf.key.suspect) {
      parts.push(`調号の取り違え疑い（スケール外音${Math.round(vf.key.noteOutOfScaleRatio * 100)}%・別調号候補あり）`);
    }
    if (parts.length) checkNote = ` / ⚠ ${parts.join(" / ")}`;
  }
  scoreEl.summary.textContent = `コード${chordCount}個 / メロディ${scoreState.melody.length}音 / 歌詞${scoreState.lyricLines.length}行${keyName ? ` / 調: ${keyName}` : ""}${beatNote}${repeatNote}${checkNote}`;
  renderScoreChordEditor();
  syncScoreNotation();
  syncScorePianoRoll();
  renderScoreNoteTable();
}

// --- 五線譜（読み取り再現・クリックで修正） ---
function syncScoreNotation() {
  if (!scoreEl.notationCanvas || typeof createScoreNotation !== "function") return;
  if (!scoreState.notation) {
    scoreState.notation = createScoreNotation(scoreEl.notationCanvas, {
      beatsPerBar: scoreState.beatsPerBar,
      keySig: scoreState.keySig,
      onChange: () => { afterNoteEdit(); },
      onSelect: (note) => { renderScoreNoteTable(); drawScoreOverlayMarks(); scrollScoreNoteIntoView(note); },
      onMeasureClick: (beat) => { scorePlayChordAt(beat); }
    });
  }
  scoreState.notation.setMelody(scoreState.melody, { beatsPerBar: scoreState.beatsPerBar, keySig: scoreState.keySig, layout: scoreState.layout });
}

function scrollScoreNoteIntoView(note) {
  const sorted = [...scoreState.melody].sort((a, b) => a.startBeat - b.startBeat);
  const index = sorted.indexOf(note);
  if (index < 0) return;
  const row = scoreEl.noteTable.children[index];
  row?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// --- PDF重ね合わせ（検出位置を元の紙面に丸で表示・クリックで選択） ---
async function buildScoreOverlay(lib, file) {
  if (!scoreEl.overlayBlock || !lib || !file) return;
  // 同じファイルでページ描画済みなら、印だけ描き直す（拍子変更の再解析など）
  if (scoreState.overlayFile === file && scoreState.overlayPages.length) {
    drawScoreOverlayMarks();
    return;
  }
  scoreState.overlayFile = file;
  scoreState.overlayPages = [];
  scoreEl.overlay.innerHTML = "";
  try {
    const data = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data }).promise;
    for (let p = 1; p <= pdf.numPages; p += 1) {
      const page = await pdf.getPage(p);
      const scale = 1.6;
      const vp = page.getViewport({ scale });
      const wrap = document.createElement("div");
      wrap.className = "overlay-page";
      const base = document.createElement("canvas");
      base.width = vp.width;
      base.height = vp.height;
      const marks = document.createElement("canvas");
      marks.width = vp.width;
      marks.height = vp.height;
      marks.className = "overlay-marks";
      wrap.appendChild(base);
      wrap.appendChild(marks);
      scoreEl.overlay.appendChild(wrap);
      await page.render({ canvasContext: base.getContext("2d"), viewport: vp }).promise;
      scoreState.overlayPages.push({ pageNum: p, marks, scale });
      marks.addEventListener("pointerdown", (e) => scoreOverlayClick(e, p, marks, scale));
    }
    scoreEl.overlayBlock.classList.remove("is-hidden");
    drawScoreOverlayMarks();
  } catch (e) {
    console.warn("overlay render failed", e);
    scoreEl.overlayBlock.classList.add("is-hidden");
  }
}

function hideScoreOverlay() {
  scoreState.overlayFile = null;
  scoreState.overlayPages = [];
  if (scoreEl.overlay) scoreEl.overlay.innerHTML = "";
  scoreEl.overlayBlock?.classList.add("is-hidden");
}

function drawScoreOverlayMarks() {
  for (const op of scoreState.overlayPages) {
    const ctx = op.marks.getContext("2d");
    ctx.clearRect(0, 0, op.marks.width, op.marks.height);
    for (const note of scoreState.melody) {
      if (note.page !== op.pageNum || !Number.isFinite(note.x)) continue;
      const selected = scoreState.notation?.getSelected() === note;
      const changed = Number.isFinite(note.origMidi) && note.origMidi !== note.midi;
      ctx.beginPath();
      ctx.arc(note.x * op.scale, note.y * op.scale, 7, 0, Math.PI * 2);
      ctx.lineWidth = selected ? 3 : 1.6;
      ctx.strokeStyle = selected ? "#d89b2b" : changed ? "#2e8b57" : "rgba(30,90,168,0.8)";
      ctx.stroke();
      if (selected) {
        ctx.fillStyle = "rgba(216,155,43,0.25)";
        ctx.fill();
      }
    }
  }
}

function scoreOverlayClick(event, pageNum, marks, scale) {
  const rect = marks.getBoundingClientRect();
  const ratio = marks.width / rect.width; // CSSで縮小表示されているぶんを戻す
  const px = ((event.clientX - rect.left) * ratio) / scale;
  const py = ((event.clientY - rect.top) * ratio) / scale;
  let best = null;
  let bestD = 9 * 9;
  for (const note of scoreState.melody) {
    if (note.page !== pageNum || !Number.isFinite(note.x)) continue;
    const d = (note.x - px) * (note.x - px) + (note.y - py) * (note.y - py);
    if (d < bestD) { bestD = d; best = note; }
  }
  if (best) {
    scoreState.notation?.select(best);
    renderScoreNoteTable();
    drawScoreOverlayMarks();
    scrollScoreNoteIntoView(best);
  }
}

// --- コード編集表 ---
function renderScoreChordEditor() {
  const beatsPerBar = scoreState.beatsPerBar;
  recomputeScoreStartBeats();
  const chordEvents = scoreState.events.filter((e) => e.type === "chord");
  scoreEl.chordEditor.innerHTML = "";
  let runBeat = 0;
  chordEvents.forEach((event) => {
    const bar = Math.floor(runBeat / beatsPerBar) + 1;
    const beatInBar = (runBeat % beatsPerBar) + 1;
    runBeat += Number(event.beats) || 0;
    const row = document.createElement("div");
    row.className = "chord-edit-row";
    row.innerHTML = `
      <span class="chord-edit-pos">${bar}-${Number.isInteger(beatInBar) ? beatInBar : beatInBar.toFixed(1)}</span>
      <input class="chord-edit-name" type="text" value="${escapeHtml(event.chord || "")}" placeholder="(なし)" aria-label="コード">
      <input class="chord-edit-beats" type="number" min="0.25" max="32" step="0.25" value="${event.beats}" aria-label="拍数">
      <button class="chord-edit-del" type="button" title="削除">✕</button>`;
    row.querySelector(".chord-edit-name").addEventListener("input", (e) => { event.chord = e.target.value.trim() || null; });
    row.querySelector(".chord-edit-beats").addEventListener("change", (e) => { event.beats = Math.max(0.25, Number(e.target.value) || 0.25); renderScoreChordEditor(); });
    row.querySelector(".chord-edit-del").addEventListener("click", () => { const i = scoreState.events.indexOf(event); if (i >= 0) { scoreState.events.splice(i, 1); renderScoreChordEditor(); } });
    scoreEl.chordEditor.appendChild(row);
  });
}

// --- ピアノロール ---
function syncScorePianoRoll() {
  if (!scoreEl.canvas) return;
  const opts = { bpm: Number(scoreEl.bpm.value) || 100, beatsPerBar: scoreState.beatsPerBar, quantUnit: 0.25 };
  if (!scoreState.pianoRoll) {
    scoreState.pianoRoll = createPianoRoll(scoreEl.canvas, {
      ...opts,
      onChange: () => {
        scoreState.notation?.setMelody(scoreState.melody, { beatsPerBar: scoreState.beatsPerBar });
        renderScoreNoteTable();
      }
    });
  }
  scoreState.pianoRoll.setMelody(scoreState.melody, opts);
}

// --- 音符↔音 対応表（手動修正の主役） ---
function renderScoreNoteTable() {
  const notes = [...scoreState.melody].sort((a, b) => a.startBeat - b.startBeat);
  const beatsPerBar = scoreState.beatsPerBar;
  scoreEl.noteTable.innerHTML = "";
  notes.forEach((note, index) => {
    const bar = Math.floor(note.startBeat / beatsPerBar) + 1;
    const beatInBar = (note.startBeat % beatsPerBar) + 1;
    const changed = Number.isFinite(note.origMidi) && note.origMidi !== note.midi;
    const selected = scoreState.notation?.getSelected() === note;
    const row = document.createElement("div");
    row.className = "score-note-row" + (changed ? " is-changed" : "") + (selected ? " is-selected" : "");
    row.innerHTML = `
      <span class="score-note-idx">${index + 1}</span>
      <span class="score-note-pos">${bar}-${Number.isInteger(beatInBar) ? beatInBar : beatInBar.toFixed(1)}</span>
      <span class="score-note-orig">${Number.isFinite(note.origMidi) ? "元:" + scoreMidiToName(note.origMidi) : ""}</span>
      <button class="score-note-step" data-d="-1" type="button">−</button>
      <input class="score-note-name" type="text" value="${scoreMidiToName(note.midi)}" aria-label="音名">
      <button class="score-note-step" data-d="1" type="button">＋</button>
      <span class="score-note-lyric">${escapeHtml(note.lyric || "")}</span>`;
    row.querySelector('[data-d="-1"]').addEventListener("click", () => { note.midi -= 1; afterNoteEdit(); });
    row.querySelector('[data-d="1"]').addEventListener("click", () => { note.midi += 1; afterNoteEdit(); });
    row.querySelector(".score-note-name").addEventListener("change", (e) => {
      const m = scoreNameToMidi(e.target.value);
      if (m !== null) { note.midi = m; }
      afterNoteEdit();
    });
    // 行クリック → 五線譜・PDF側でも選択（入力・ボタン操作は除く）
    row.addEventListener("click", (e) => {
      if (e.target.closest("button, input")) return;
      scoreState.notation?.select(note);
      drawScoreOverlayMarks();
      renderScoreNoteTable();
    });
    scoreEl.noteTable.appendChild(row);
  });
}

function afterNoteEdit() {
  scoreState.pianoRoll?.setMelody(scoreState.melody, { bpm: Number(scoreEl.bpm.value) || 100, beatsPerBar: scoreState.beatsPerBar });
  scoreState.notation?.setMelody(scoreState.melody, { beatsPerBar: scoreState.beatsPerBar, keySig: scoreState.keySig });
  drawScoreOverlayMarks();
  renderScoreNoteTable();
}

// --- 歌詞を音にはめる ---
function scoreFitLyrics() {
  if (!scoreState.melody.length) { scoreEl.lyricsSummary.textContent = "先にメロディが必要だよ。"; return; }
  const lines = scoreEl.lyrics.value.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) { scoreEl.lyricsSummary.textContent = "歌詞を入れてね。"; return; }
  const result = fitLyricsToMelody(lines, scoreState.melody);
  const sorted = [...scoreState.melody].sort((a, b) => a.startBeat - b.startBeat);
  sorted.forEach((n) => { n.lyric = ""; });
  result.noteAssignments.forEach((a) => { if (sorted[a.noteIndex]) sorted[a.noteIndex].lyric = a.text; });
  scoreState.lyricEvents = result.lineEvents;
  scoreState.pianoRoll?.render();
  renderScoreNoteTable();
  scoreEl.lyricsSummary.textContent = `音にはめたよ（のばし${result.stats.melisma}・つめ${result.stats.crammed}）。`;
}

// --- 譜面化（エディット/プレイへ） ---
function scoreToSong() {
  if (typeof scorePreviewStop === "function") scorePreviewStop();
  recomputeScoreStartBeats();
  const bpm = Math.max(40, Math.min(240, Number(scoreEl.bpm.value) || 100));
  const events = scoreState.events.map((e) => ({ ...e }));
  // 繰り返し記号があれば、再生順(playOrder)に従ってメロディを展開する。
  // 記号が無ければ playOrder=null で従来どおり（無影響）。
  let playMelody = scoreState.melody;
  if (scoreState.playOrder && scoreState.playOrder.length && typeof applyPlayOrder === "function") {
    const exp = applyPlayOrder(scoreState.melody, scoreState.playOrder);
    if (exp.length) playMelody = exp;
  }
  // 歌詞: 行イベントがあればタイミング割り付け、なければ貼り付けをN小節割り付け
  if (scoreState.lyricEvents && scoreState.lyricEvents.length) {
    assignTimedLyricsToEvents(events, scoreState.lyricEvents.map((w) => ({ startBeat: w.startBeat, text: w.text })));
  } else if (scoreEl.lyrics.value.trim()) {
    assignLyricsToEvents(events, scoreEl.lyrics.value, scoreState.beatsPerBar, 2);
  }
  applyImportedSong({
    title: scoreState.title,
    artist: "",
    bpm: Math.round(bpm * 10) / 10,
    beatsPerBar: scoreState.beatsPerBar,
    defaultBeats: 2,
    transpose: 0,
    source: "",
    events,
    melody: playMelody.map((n) => ({ startBeat: n.startBeat, beats: n.beats, midi: n.midi, artic: n.artic })),
    rhythmPattern: "whole"
  }, null);
  setMode("edit");
}

// --- 試聴プレイヤー（停止可能・再生位置ライン・シーク・速度変更・持続音メロディ＋コード）---
const scorePreview = {
  playing: false,
  mode: null,      // "melody" | "chords" | "chord"
  nodes: [],       // {oscs:[], gain} 鳴っているノード（停止用に保持）
  raf: 0,
  startTime: 0,
  originBeat: 0,   // 再生中の基準拍（シーク・速度変更でずらせる）
  totalBeats: 0,   // 曲全体の終端拍（シークの目盛り・停止判定）
  spb: 0.6,        // 実効の1拍秒（baseSpb / speed）
  baseSpb: 0.6,    // テンポ（BPM）由来の1拍秒
  speed: 1,        // 速度倍率（スライダー）
  seeking: false,  // シークバー操作中はバーの自動追従を止める
  melodyCache: [], // [{startBeat, beats, midi}]（繰り返し展開済み）
  chordCache: []   // [{startBeat, end, freqs}]
};
const MELODY_PARTIALS = [[1, 1], [2, 0.35], [3, 0.18]]; // 基音＋2倍音＋3倍音
const CHORD_PARTIALS = [[1, 1], [2, 0.22]];

// 試聴のスウィング: 拍の8分ウラ（後半）を後ろへずらしてハネさせる。拍頭は動かさない。
function scoreSwingBeat(beat) {
  if (!scoreEl.swingToggle?.checked) return beat;
  const ratio = (typeof SWING_RATIO !== "undefined") ? SWING_RATIO : 0.64;
  const whole = Math.floor(beat);
  const f = beat - whole;
  const sf = f <= 0.5 ? f * (ratio / 0.5) : ratio + (f - 0.5) * ((1 - ratio) / 0.5);
  return whole + sf;
}

// 速度スライダーの倍率（0.5〜1.5x など）。無ければ1.0。
function scoreCurrentSpeed() {
  const v = Number(scoreEl.speed?.value);
  return Number.isFinite(v) && v > 0 ? v / 100 : 1;
}

// 再生位置ライン（ピアノロール）＋シークバーを動かす。終端で停止。
function scorePreviewRunPlayhead(ctx) {
  const tick = () => {
    if (!scorePreview.playing) return;
    const beat = scorePreview.originBeat + (ctx.currentTime - scorePreview.startTime) / scorePreview.spb;
    if (beat >= scorePreview.totalBeats + 0.25) { scorePreviewStop(); return; }
    scoreState.pianoRoll?.setPlayhead(Math.max(0, beat));
    if (scoreEl.seek && !scorePreview.seeking) {
      scoreEl.seek.value = String(Math.round((beat / Math.max(0.001, scorePreview.totalBeats)) * 1000));
    }
    scorePreview.raf = requestAnimationFrame(tick);
  };
  scorePreview.raf = requestAnimationFrame(tick);
}

// 持続音の1声を鳴らす。アタックは柔らかめ、指定倍音までを重ねる。停止できるよう保持する。
function scorePreviewVoice(freq, start, dur, gain, partials) {
  const ctx = ensureAudioContext();
  const peak = Math.max(0.0001, gain);
  const atk = 0.03;  // 柔らかいアタック
  const rel = 0.09;  // 末尾リリース（プチッ音の防止）
  const hold = Math.max(0.06, dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.linearRampToValueAtTime(peak, start + atk);                  // ソフトアタック
  env.gain.setValueAtTime(peak, start + Math.max(atk, hold - rel));     // 持続
  env.gain.exponentialRampToValueAtTime(0.0001, start + hold + rel);    // リリース
  env.connect(ctx.destination);
  const oscs = [];
  for (const [mult, amp] of partials) {
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * mult;
    og.gain.value = amp;
    osc.connect(og); og.connect(env);
    osc.start(start);
    osc.stop(start + hold + rel + 0.05);
    oscs.push(osc);
  }
  scorePreview.nodes.push({ oscs, gain: env });
}

// 鳴っているノードだけ止める（再生状態・RAFは触らない＝シーク/速度変更で使う）
function scoreStopNodes() {
  const ctx = typeof audioCtx !== "undefined" ? audioCtx : null;
  const now = ctx ? ctx.currentTime : 0;
  for (const n of scorePreview.nodes) {
    try {
      n.gain.gain.cancelScheduledValues(now);
      n.gain.gain.setValueAtTime(Math.max(0.0001, n.gain.gain.value), now);
      n.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      for (const o of n.oscs) o.stop(now + 0.06);
    } catch (e) { /* 既に停止済み */ }
  }
  scorePreview.nodes = [];
}

function scorePreviewStop() {
  if (scorePreview.raf) cancelAnimationFrame(scorePreview.raf);
  scorePreview.raf = 0;
  scoreStopNodes();
  scorePreview.playing = false;
  scorePreview.mode = null;
  scoreState.pianoRoll?.setPlayhead(null);
  updateScorePreviewButtons();
}

function updateScorePreviewButtons() {
  const m = scorePreview.playing && scorePreview.mode === "melody";
  const c = scorePreview.playing && scorePreview.mode === "chords";
  if (scoreEl.playMelody) scoreEl.playMelody.textContent = m ? "⏹ 停止" : "▶ メロディを聞く";
  if (scoreEl.playChords) scoreEl.playChords.textContent = c ? "⏹ 停止" : "▶ コードも試聴";
}

// fromBeat 以降のメロディ／コードを、いまの速度で鳴らし直す（シーク・速度変更の心臓部）。
// fromBeat の途中にかかる音/コードは残りぶんだけ鳴らす。
function scoreScheduleFrom(fromBeat) {
  scoreStopNodes();
  const ctx = ensureAudioContext();
  if (ctx.state === "suspended") ctx.resume();
  const spb = scorePreview.baseSpb / Math.max(0.25, scorePreview.speed);
  const start = ctx.currentTime + 0.06;
  const ref = scoreSwingBeat(fromBeat);
  for (const nt of scorePreview.melodyCache) {
    if (nt.startBeat + nt.beats <= fromBeat + 1e-6) continue; // もう終わった音
    const ps = Math.max(nt.startBeat, fromBeat);
    const t = start + (scoreSwingBeat(ps) - ref) * spb;
    scorePreviewVoice(midiToFrequency(nt.midi), t, ((nt.startBeat + nt.beats) - ps) * spb, 0.16, MELODY_PARTIALS);
  }
  if (scorePreview.mode === "chords") {
    for (const c of scorePreview.chordCache) {
      if (c.end <= fromBeat + 1e-6) continue;
      const ps = Math.max(c.startBeat, fromBeat);
      const t = start + (scoreSwingBeat(ps) - ref) * spb;
      for (const f of c.freqs) scorePreviewVoice(f, t, (c.end - ps) * spb, 0.05, CHORD_PARTIALS);
    }
  }
  scorePreview.startTime = start;
  scorePreview.originBeat = fromBeat;
  scorePreview.spb = spb;
}

function scorePreviewStart(mode) {
  // トグル: 同じモードが再生中なら停止
  if (scorePreview.playing && scorePreview.mode === mode) { scorePreviewStop(); return; }
  scorePreviewStop();
  recomputeScoreStartBeats(); // コードの startBeat を最新化
  const ctx = ensureAudioContext();
  if (ctx.state === "suspended") ctx.resume();
  const bpm = Math.max(40, Math.min(240, Number(scoreEl.bpm.value) || scoreState.bpm || 100));
  scorePreview.baseSpb = 60 / bpm;
  scorePreview.speed = scoreCurrentSpeed();
  // 繰り返しがあれば再生順に展開
  const playOrder = (scoreState.playOrder && scoreState.playOrder.length) ? scoreState.playOrder : null;
  let melody = scoreState.melody;
  if (playOrder && typeof applyPlayOrder === "function") {
    const exp = applyPlayOrder(scoreState.melody, playOrder);
    if (exp.length) melody = exp;
  }
  scorePreview.melodyCache = melody
    .filter((nt) => Number.isFinite(nt.midi) && Number.isFinite(nt.startBeat))
    .map((nt) => ({ startBeat: nt.startBeat, beats: Number(nt.beats) || 1, midi: nt.midi }));
  const melodyEnd = scorePreview.melodyCache.reduce((m, n) => Math.max(m, n.startBeat + n.beats), 0);
  // コード（絶対拍・次のコードまで持続・最後はメロディ末尾まで）
  let src = (scoreState.chordEvents || []).filter((c) => c.chord)
    .map((c) => ({ startBeat: c.startBeat, chord: c.chord })).sort((a, b) => a.startBeat - b.startBeat);
  if (playOrder && typeof applyPlayOrder === "function") src = applyPlayOrder(src, playOrder);
  scorePreview.chordCache = src.map((c, i) => {
    const next = src[i + 1];
    const end = next ? next.startBeat : Math.max(melodyEnd, c.startBeat + scoreState.beatsPerBar);
    return { startBeat: c.startBeat, end, freqs: typeof chordFrequencies === "function" ? chordFrequencies(c.chord) : null };
  }).filter((c) => c.freqs && c.end > c.startBeat);
  let total = melodyEnd;
  if (mode === "chords") total = scorePreview.chordCache.reduce((m, c) => Math.max(m, c.end), total);
  if (!(total > 0)) return; // 鳴らすものが無い
  scorePreview.totalBeats = total;
  scorePreview.mode = mode;
  scorePreview.playing = true;
  updateScorePreviewButtons();
  scoreScheduleFrom(0);
  scorePreviewRunPlayhead(ctx);
}

// シークバー（0〜1000）→ その位置へ。再生中のみ。
function scorePreviewSeek(ratio) {
  if (!scorePreview.playing) return;
  const beat = Math.max(0, Math.min(scorePreview.totalBeats, ratio * scorePreview.totalBeats));
  scoreScheduleFrom(beat);
}

// 速度倍率を変更。再生中なら現在位置から鳴らし直して即反映。
function scorePreviewSetSpeed() {
  scorePreview.speed = scoreCurrentSpeed();
  if (scoreEl.speedLabel) scoreEl.speedLabel.textContent = `${scorePreview.speed.toFixed(2)}x`;
  if (scorePreview.playing) {
    const cur = scorePreview.originBeat + (audioCtx.currentTime - scorePreview.startTime) / scorePreview.spb;
    scoreScheduleFrom(Math.max(0, Math.min(scorePreview.totalBeats, cur)));
  }
}

function scorePlayMelody() { scorePreviewStart("melody"); }
function scorePlayChords() { scorePreviewStart("chords"); }

// 五線譜の小節（音符以外）をクリック→その拍に効いているコードを、長さぶん鳴らす。
function scorePlayChordAt(beat) {
  scorePreviewStop();
  const chords = (scoreState.chordEvents || []).filter((c) => c.chord)
    .sort((a, b) => a.startBeat - b.startBeat);
  if (!chords.length) return;
  // beat に効いているコード＝開始拍が beat 以下で最も後ろのもの
  let idx = 0;
  for (let i = 0; i < chords.length; i += 1) {
    if (chords[i].startBeat <= beat + 1e-6) idx = i; else break;
  }
  const c = chords[idx];
  const next = chords[idx + 1];
  const melodyEnd = scoreState.melody.reduce((m, n) => Math.max(m, (Number(n.startBeat) || 0) + (Number(n.beats) || 0)), 0);
  const end = next ? next.startBeat : Math.max(melodyEnd, c.startBeat + scoreState.beatsPerBar);
  const lenBeats = Math.max(0.5, end - c.startBeat);
  const freqs = typeof chordFrequencies === "function" ? chordFrequencies(c.chord) : null;
  if (!freqs) return;
  const ctx = ensureAudioContext();
  if (ctx.state === "suspended") ctx.resume();
  const bpm = Math.max(40, Math.min(240, Number(scoreEl.bpm.value) || scoreState.bpm || 100));
  const spb = 60 / bpm;
  const start = ctx.currentTime + 0.05;
  for (const f of freqs) scorePreviewVoice(f, start, lenBeats * spb, 0.06, CHORD_PARTIALS);
  if (!scorePreview.nodes.length) return;
  scorePreview.playing = true;
  scorePreview.mode = "chord";
  scorePreview.startTime = start;
  scorePreview.originBeat = c.startBeat;
  scorePreview.totalBeats = c.startBeat + lenBeats; // 終端は絶対拍（停止判定に合わせる）
  scorePreview.spb = spb;
  updateScorePreviewButtons();
  scorePreviewRunPlayhead(ctx);
}

// ===== ファイル読み込み =====
async function scoreLoadMusicXml(file) {
  setScoreProgress("MusicXMLを読み込んでる…");
  try {
    const parsed = await loadMusicXmlFile(file);
    if (!parsed) throw new Error("empty");
    hideScoreProgress();
    scoreState.lastPdfFile = null;
    hideScoreOverlay();
    loadScoreData(parsed, "MusicXML");
  } catch (error) {
    hideScoreProgress();
    console.warn("score musicxml failed", error);
    window.alert("MusicXMLを読めなかった。MuseScore/Sibelius等で書き出したファイルを選んでね。");
  }
}

async function scoreLoadPdf(file, beatsPerBar) {
  setScoreProgress("PDFを読み込んでる…（pdf.jsをダウンロード）");
  scoreState.lastPdfFile = file;
  // beatsPerBar 明示指定があれば固定、なければ拍子を自動検出させる（null）
  const explicit = Number(beatsPerBar) > 0 ? Number(beatsPerBar) : null;
  try {
    const text = await extractPdfLyrics(file);
    const parsed = parseScoreText(text);
    let vectorMelody = [];
    let keySig = null;
    let pdfLib = null;
    let bpb = explicit || 4;
    let bpm = parsed.bpm || 100;
    let vectorChords = null;
    let vectorBeatCheck = null;
    let vectorLayout = null;
    let vectorRepeats = null;
    try {
      pdfLib = await loadPdfjs();
      const res = await extractPdfVectorMelody(file, pdfLib.getDocument.bind(pdfLib), pdfLib.OPS, null, explicit);
      vectorMelody = res.melody || [];
      keySig = res.keySig || null;
      vectorBeatCheck = res.beatCheck || null;        // 拍検算サマリ
      vectorLayout = res.layout || null;              // 学習レイアウト（元の配置）
      vectorRepeats = res.repeatStructure || null;    // 繰り返し構造
      if (res.beatsPerBar) bpb = res.beatsPerBar;     // 自動検出した拍子
      if (res.tempo) bpm = res.tempo;                 // 自動検出したテンポ
      if (res.chordEvents && res.chordEvents.length) vectorChords = res.chordEvents; // ♭グリフ込みのコード
    } catch (e) {
      console.warn("vector note read failed", e);
    }
    hideScoreProgress();
    if (!parsed.chords.length && !vectorMelody.length && !parsed.lyricLines.length) {
      window.alert("PDFから読めなかった。スキャン画像のPDFはテキストが取れないんだ。");
      return;
    }
    // コードはベクター再構成（♭/♯グリフ込み・小節位置つき）を優先、無ければテキスト解析
    const chordEvents = vectorChords || parsed.chords.map((c, i) => ({ startBeat: i * bpb, chord: c }));
    loadScoreData({
      title: parsed.title,
      bpm,
      beatsPerBar: bpb,
      keySig,
      melody: vectorMelody,
      chordEvents,
      beatCheck: vectorBeatCheck,
      layout: vectorLayout,
      repeatStructure: vectorRepeats,
      words: [],
      lyricLines: parsed.lyricLines
    }, "PDF楽譜");
    if (pdfLib && vectorMelody.length) buildScoreOverlay(pdfLib, file);
    else hideScoreOverlay();
  } catch (error) {
    hideScoreProgress();
    console.warn("score pdf failed", error);
    window.alert("PDFを読めなかった（pdf.jsの読み込み失敗か、対応外の形式かも）。");
  }
}

function scoreRouteFile(file) {
  if (!file) return;
  if (/\.(xml|musicxml|mxl)$/i.test(file.name)) scoreLoadMusicXml(file);
  else if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") scoreLoadPdf(file);
  else if (/\.svg$/i.test(file.name) || file.type === "image/svg+xml") scoreLoadSvg(file);
  else window.alert("MusicXML / PDF / SVG を入れてね。");
}

// 自己完結SVG（楽譜データ埋め込み）→ 楽譜を復元
async function scoreLoadSvg(file) {
  try {
    const text = await file.text();
    const data = typeof parseScoreSVG === "function" ? parseScoreSVG(text) : null;
    if (!data || !data.melody) { window.alert("このSVGには楽譜データが埋め込まれていないよ。Codoriで書き出したSVGを入れてね。"); return; }
    loadScoreData({
      title: data.title || file.name.replace(/\.svg$/i, ""),
      bpm: data.bpm || scoreState.bpm || 100,
      beatsPerBar: data.beatsPerBar || 4,
      keySig: data.keySig || null,
      melody: data.melody,
      chordEvents: data.chordEvents || [],
      layout: data.layout || null,
      repeatStructure: data.repeatStructure || null,
      words: [],
      lyricLines: data.lyricLines || []
    }, "SVG楽譜");
    hideScoreOverlay();
  } catch (e) {
    window.warn?.("svg load failed", e);
    window.alert("SVGを読めなかった。");
  }
}

// 楽譜データを埋め込んだ自己完結SVGを書き出す（表示＋完全復元できる可逆フォーマット）
function scoreExportSvg() {
  if (!scoreState.notation || !scoreState.melody.length) { window.alert("先に楽譜を読み込んでね。"); return; }
  let svg = scoreState.notation.getSVG();
  // 描画器が埋めた melody だけのデータを、コード・歌詞・テンポも含む完全版に差し替え
  const full = {
    format: "codori-notation", version: 1,
    title: scoreState.title, bpm: scoreState.bpm,
    beatsPerBar: scoreState.beatsPerBar, fifths: scoreState.keySig?.fifths, keySig: scoreState.keySig,
    layout: scoreState.layout || undefined,
    repeatStructure: scoreState.repeatStructure || undefined,
    melody: scoreState.melody.map((n) => ({
      startBeat: n.startBeat, beats: n.beats, midi: n.midi, origMidi: n.origMidi,
      keyFifths: n.keyFifths, slurId: n.slurId, slurRole: n.slurRole, artic: n.artic, lyric: n.lyric, page: n.page, x: n.x, y: n.y
    })),
    chordEvents: scoreState.events.filter((e) => e.type === "chord" && e.chord).map((e) => ({ startBeat: e.startBeat, chord: e.chord })),
    lyricLines: scoreState.lyricLines
  };
  const json = JSON.stringify(full).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  svg = svg.replace(/<metadata id="codori-score-data">[\s\S]*?<\/metadata>/, `<metadata id="codori-score-data">${json}</metadata>`);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${(scoreState.title || "score").replace(/[\\/:*?"<>|]/g, "_")}.svg`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ===== イベント =====
scoreEl.musicxmlButton?.addEventListener("click", () => scoreEl.musicxmlInput.click());
scoreEl.musicxmlInput?.addEventListener("change", (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) scoreLoadMusicXml(f); });
scoreEl.pdfButton?.addEventListener("click", () => scoreEl.pdfInput.click());
scoreEl.pdfInput?.addEventListener("change", (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) scoreLoadPdf(f); });
document.querySelector("#score-export-svg")?.addEventListener("click", scoreExportSvg);
document.querySelector("#score-import-svg-button")?.addEventListener("click", () => document.querySelector("#score-import-svg").click());
document.querySelector("#score-import-svg")?.addEventListener("change", (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) scoreLoadSvg(f); });

scoreEl.bpm?.addEventListener("change", () => { scoreState.bpm = Number(scoreEl.bpm.value) || 100; syncScorePianoRoll(); });
scoreEl.beatsPerBar?.addEventListener("change", () => {
  scoreState.beatsPerBar = Number(scoreEl.beatsPerBar.value) || 4;
  // PDFは小節割りが拍子に依存するので、PDFなら拍子を変えたら読み直す
  if (scoreState.lastPdfFile) {
    scoreLoadPdf(scoreState.lastPdfFile, scoreState.beatsPerBar);
  } else {
    renderScore();
  }
});
scoreEl.playMelody?.addEventListener("click", scorePlayMelody);
scoreEl.playChords?.addEventListener("click", scorePlayChords);
// シークバー: ドラッグ中はライン追従を止めて位置プレビュー、離したら実シーク
scoreEl.seek?.addEventListener("input", () => {
  scorePreview.seeking = true;
  if (scorePreview.playing) {
    const beat = (Number(scoreEl.seek.value) / 1000) * scorePreview.totalBeats;
    scoreState.pianoRoll?.setPlayhead(Math.max(0, beat));
  }
});
scoreEl.seek?.addEventListener("change", () => {
  scorePreviewSeek(Number(scoreEl.seek.value) / 1000);
  scorePreview.seeking = false;
});
// 速度スライダー: ラベルは即時、再生中は現在位置から鳴らし直して反映
scoreEl.speed?.addEventListener("input", () => {
  if (scoreEl.speedLabel) scoreEl.speedLabel.textContent = `${(scoreCurrentSpeed()).toFixed(2)}x`;
});
scoreEl.speed?.addEventListener("change", scorePreviewSetSpeed);
scoreEl.fitLyrics?.addEventListener("click", scoreFitLyrics);
scoreEl.convert?.addEventListener("click", scoreToSong);
scoreEl.toHiragana?.addEventListener("click", async () => {
  if (!scoreEl.lyrics.value.trim() || typeof toHiragana !== "function") return;
  const lines = scoreEl.lyrics.value.split("\n");
  const out = [];
  for (const l of lines) out.push(await toHiragana(l));
  scoreEl.lyrics.value = out.join("\n");
});

// ドロップゾーン
if (scoreEl.dropzone) {
  let depth = 0;
  const setOn = (on) => scoreEl.dropzone.classList.toggle("is-dragover", on);
  scoreEl.dropzone.addEventListener("dragenter", (e) => { e.preventDefault(); depth += 1; setOn(true); });
  scoreEl.dropzone.addEventListener("dragover", (e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; });
  scoreEl.dropzone.addEventListener("dragleave", (e) => { e.preventDefault(); depth = Math.max(0, depth - 1); if (depth === 0) setOn(false); });
  scoreEl.dropzone.addEventListener("drop", (e) => { e.preventDefault(); depth = 0; setOn(false); const f = e.dataTransfer?.files?.[0]; if (f) scoreRouteFile(f); });
}

scoreEl.tab?.addEventListener("click", () => { if (typeof setMode === "function") setMode("score"); });
