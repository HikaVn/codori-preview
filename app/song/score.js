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
  scoreState.title = parsed.title || kind;
  scoreState.bpm = parsed.bpm || 100;
  scoreState.beatsPerBar = parsed.beatsPerBar || 4;
  scoreState.keySig = parsed.keySig || null;
  // コード列 → events（startBeatは隣との差で拍数化）
  const chords = [...(parsed.chordEvents || [])].sort((a, b) => a.startBeat - b.startBeat);
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
    .map((n) => ({ startBeat: n.startBeat, beats: n.beats, midi: n.midi, origMidi: n.midi, lyric: n.lyric || "", page: n.page, x: n.x, y: n.y }))
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
  scoreEl.summary.textContent = `コード${chordCount}個 / メロディ${scoreState.melody.length}音 / 歌詞${scoreState.lyricLines.length}行${keyName ? ` / 調: ${keyName}` : ""}`;
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
      onSelect: (note) => { renderScoreNoteTable(); drawScoreOverlayMarks(); scrollScoreNoteIntoView(note); }
    });
  }
  scoreState.notation.setMelody(scoreState.melody, { beatsPerBar: scoreState.beatsPerBar, keySig: scoreState.keySig });
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
  recomputeScoreStartBeats();
  const bpm = Math.max(40, Math.min(240, Number(scoreEl.bpm.value) || 100));
  const events = scoreState.events.map((e) => ({ ...e }));
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
    melody: scoreState.melody.map((n) => ({ startBeat: n.startBeat, beats: n.beats, midi: n.midi })),
    rhythmPattern: "whole"
  }, null);
  setMode("edit");
}

// --- メロディ試聴 ---
function scorePlayMelody() {
  scoreState.pianoRoll?.play();
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
  const bpb = beatsPerBar || Number(scoreEl.beatsPerBar.value) || 4;
  try {
    const text = await extractPdfLyrics(file);
    const parsed = parseScoreText(text);
    let vectorMelody = [];
    let keySig = null;
    let pdfLib = null;
    try {
      pdfLib = await loadPdfjs();
      const res = await extractPdfVectorMelody(file, pdfLib.getDocument.bind(pdfLib), pdfLib.OPS, null, bpb);
      vectorMelody = res.melody || [];
      keySig = res.keySig || null;
    } catch (e) {
      console.warn("vector note read failed", e);
    }
    hideScoreProgress();
    if (!parsed.chords.length && !vectorMelody.length && !parsed.lyricLines.length) {
      window.alert("PDFから読めなかった。スキャン画像のPDFはテキストが取れないんだ。");
      return;
    }
    loadScoreData({
      title: parsed.title,
      bpm: parsed.bpm,
      beatsPerBar: bpb,
      keySig,
      melody: vectorMelody,
      chordEvents: parsed.chords.map((c, i) => ({ startBeat: i, chord: c })),
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
  else window.alert("MusicXML か PDF を入れてね。");
}

// ===== イベント =====
scoreEl.musicxmlButton?.addEventListener("click", () => scoreEl.musicxmlInput.click());
scoreEl.musicxmlInput?.addEventListener("change", (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) scoreLoadMusicXml(f); });
scoreEl.pdfButton?.addEventListener("click", () => scoreEl.pdfInput.click());
scoreEl.pdfInput?.addEventListener("change", (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) scoreLoadPdf(f); });

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
