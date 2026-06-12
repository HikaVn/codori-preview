// 音源取り込みモード（β）
// 既存の音源ファイルを解析して、コード・リズム・メロディを推定し、
// うた練習の譜面（イベント列）に変換する。
// song.js / dsp.js と同じページで読み込む古典スクリプト（グローバル共有）。

const importEl = {
  file: document.querySelector("#import-file"),
  fileButton: document.querySelector("#import-file-button"),
  fileName: document.querySelector("#import-file-name"),
  quantize: document.querySelector("#import-quantize"),
  lyrics: document.querySelector("#import-lyrics"),
  barsPerLine: document.querySelector("#import-bars-per-line"),
  analyzeButton: document.querySelector("#import-analyze"),
  progress: document.querySelector("#import-progress"),
  progressBar: document.querySelector("#import-progress-bar"),
  progressLabel: document.querySelector("#import-progress-label"),
  progressCancel: document.querySelector("#import-progress-cancel"),
  result: document.querySelector("#import-result"),
  bpm: document.querySelector("#import-bpm"),
  offset: document.querySelector("#import-offset"),
  summary: document.querySelector("#import-summary"),
  chordPreview: document.querySelector("#import-chord-preview"),
  chordEditor: document.querySelector("#import-chord-editor"),
  beatsPerBar: document.querySelector("#import-beats-per-bar"),
  previewOriginal: document.querySelector("#preview-original"),
  previewInst: document.querySelector("#preview-inst"),
  previewVocal: document.querySelector("#preview-vocal"),
  convertButton: document.querySelector("#import-convert"),
  bpmCandidates: document.querySelector("#bpm-candidates"),
  bpmHalf: document.querySelector("#bpm-half"),
  bpmDouble: document.querySelector("#bpm-double"),
  tunePenalty: document.querySelector("#tune-penalty"),
  tunePenaltyVal: document.querySelector("#tune-penalty-val"),
  tuneVocal: document.querySelector("#tune-vocal"),
  tuneVocalVal: document.querySelector("#tune-vocal-val"),
  tuneClarity: document.querySelector("#tune-clarity"),
  tuneClarityVal: document.querySelector("#tune-clarity-val"),
  tuneKey: document.querySelector("#tune-key"),
  tuneKeyVal: document.querySelector("#tune-key-val"),
  separationMethod: document.querySelector("#separation-method"),
  chromaPreset: document.querySelector("#chroma-preset"),
  chromaMinHz: document.querySelector("#chroma-min"),
  chromaMaxHz: document.querySelector("#chroma-max"),
  chromaLog: document.querySelector("#chroma-log"),
  tuneRepet: document.querySelector("#tune-repet"),
  tuneRepetVal: document.querySelector("#tune-repet-val"),
  reanalyzeMelody: document.querySelector("#reanalyze-melody"),
  reanalyzeFull: document.querySelector("#reanalyze-full"),
  exportDebug: document.querySelector("#export-debug"),
  debugFlux: document.querySelector("#debug-flux"),
  debugMelody: document.querySelector("#debug-melody"),
  melodyBlock: document.querySelector("#import-melody-block"),
  melodyCanvas: document.querySelector("#melody-pianoroll"),
  melodyPlay: document.querySelector("#melody-play"),
  melodyClear: document.querySelector("#melody-clear"),
  melodyLyrics: document.querySelector("#melody-lyrics"),
  melodyGroupWords: document.querySelector("#melody-group-words"),
  melodyFitLyrics: document.querySelector("#melody-fit-lyrics"),
  melodyWordsSummary: document.querySelector("#melody-words-summary"),
  melodyWordChips: document.querySelector("#melody-word-chips")
};

let pianoRoll = null;
let importWordEvents = null; // 単語わりつけの結果（譜面化時に歌詞へ）

// 解析チューニングのパラメータ（デバッグパネルから変更できる）
const importTuning = {
  changePenalty: 0.1,
  vocalSideFactor: 1.2,
  clarityThreshold: 0.55,
  separationMethod: "center-repet",
  repetStrength: 1.0,
  chromaPreset: "auto",
  chromaMinHz: 60,
  chromaMaxHz: 5000,
  chromaLogCompress: false,
  beatsPerBar: 4,
  keyStrength: 0.06
};

// コード解析の音域プリセット（楽器ごとに和音が見えやすい帯域へ絞る）
const CHROMA_PRESETS = {
  auto: { label: "おまかせ（60–5000Hz）", minHz: 60, maxHz: 5000 },
  guitar: { label: "ギター / ウクレレ（80–1200Hz）", minHz: 80, maxHz: 1200 },
  piano: { label: "ピアノ（55–2200Hz）", minHz: 55, maxHz: 2200 },
  bass: { label: "低音重視・根音（50–700Hz）", minHz: 50, maxHz: 700 },
  backing: { label: "高音のバッキング（200–2000Hz）", minHz: 200, maxHz: 2000 }
};

const importState = {
  fileName: "",
  selectedFile: null,
  originalBuffer: null,
  midSide: null, // 再解析用に保持
  tempoCandidates: [],
  beatTimes: null,
  useBeatTimes: true,
  workingScore: null,
  analysis: null,
  instBuffer: null,
  vocalBuffer: null,
  previewSource: null,
  previewKind: null,
  busy: false,
  cancelRequested: false
};

const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const IMPORT_RATE = 22050;
const IMPORT_MAX_SECONDS = 360;

function importQuantUnit() {
  switch (importEl.quantize.value) {
    case "4": return 1;
    case "8": return 0.5;
    case "8t": return 1 / 3; // 8分3連
    case "16t": return 1 / 6; // 16分3連
    case "16+t": return [0.25, 1 / 3]; // 16分＋3連（自動スナップ）
    case "16+16t": return [0.25, 1 / 6]; // 16分＋16分3連
    default: return 0.25; // 16分
  }
}

function setImportProgress(label, ratio) {
  importEl.progress.classList.remove("is-hidden");
  importEl.progressLabel.textContent = label;
  importEl.progressBar.style.width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
}

function hideImportProgress() {
  importEl.progress.classList.add("is-hidden");
}

function audioBufferFromArray(data, rate) {
  const ctx = ensureAudioContext();
  const buffer = ctx.createBuffer(1, data.length, rate);
  buffer.getChannelData(0).set(data);
  return buffer;
}

async function decodeImportFile(file) {
  const ctx = ensureAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const decoded = await ctx.decodeAudioData(arrayBuffer);
  let length = decoded.length;
  let truncated = false;
  if (decoded.duration > IMPORT_MAX_SECONDS) {
    length = Math.floor(IMPORT_MAX_SECONDS * decoded.sampleRate);
    truncated = true;
  }
  const left = decoded.getChannelData(0).subarray(0, length);
  const right = decoded.numberOfChannels > 1 ? decoded.getChannelData(1).subarray(0, length) : left;
  return { decoded, left, right, sampleRate: decoded.sampleRate, truncated };
}

// ファイル選択（ボタン / ドラッグ＆ドロップ 共通）
function selectImportFile(file) {
  if (!file) {
    return;
  }
  if (!/^audio\//.test(file.type) && !/\.(wav|mp3|m4a|aac|ogg|flac|webm)$/i.test(file.name)) {
    window.alert("音源ファイル（mp3 / wav / m4a など）を選んでね。");
    return;
  }
  importState.selectedFile = file;
  importEl.fileName.textContent = file.name;
  importEl.result.classList.add("is-hidden");
  stopImportPreview();
  if (typeof resetTranscript === "function") {
    resetTranscript();
  }
}

async function runImportAnalysis() {
  const file = importState.selectedFile || importEl.file.files?.[0];
  if (!file) {
    window.alert("先に音源ファイル（mp3 / wav / m4aなど）を選んでね。");
    return;
  }
  if (importState.busy) {
    return;
  }
  importState.busy = true;
  importState.cancelRequested = false;
  importEl.analyzeButton.disabled = true;
  importEl.progressCancel?.classList.remove("is-hidden");
  importEl.result.classList.add("is-hidden");
  stopImportPreview();

  try {
    setImportProgress("音源を読み込んでる…", 0.02);
    const { decoded, left, right, sampleRate, truncated } = await decodeImportFile(file);
    importState.fileName = file.name.replace(/\.[^.]+$/, "");
    importState.originalBuffer = decoded;

    setImportProgress("ボーカルと伴奏を分けてる…", 0.05);
    const leftDown = resampleLinear(left, sampleRate, IMPORT_RATE);
    const rightDown = resampleLinear(right, sampleRate, IMPORT_RATE);
    const mid = new Float32Array(leftDown.length);
    const side = new Float32Array(leftDown.length);
    for (let i = 0; i < leftDown.length; i += 1) {
      mid[i] = (leftDown[i] + rightDown[i]) / 2;
      side[i] = (leftDown[i] - rightDown[i]) / 2;
    }

    importState.midSide = { mid, side };
    const analysis = await analyzeAudio({
      mid,
      side,
      sampleRate: IMPORT_RATE,
      method: importTuning.separationMethod,
      vocalSideFactor: importTuning.vocalSideFactor,
      repetStrength: importTuning.repetStrength,
      chromaMinHz: importTuning.chromaMinHz,
      chromaMaxHz: importTuning.chromaMaxHz,
      chromaLogCompress: importTuning.chromaLogCompress,
      shouldCancel: () => importState.cancelRequested,
      onProgress: (ratio) => setImportProgress("ボーカルと伴奏を分けてる…", 0.05 + ratio * 0.6)
    });

    setImportProgress("テンポと拍をさがしてる…", 0.68);
    const tempo = estimateTempo(analysis.flux, analysis.frameRate);
    importState.tempoCandidates = tempo.candidates || [];
    importState.beatTimes = trackBeats(
      analysis.flux, analysis.frameRate, tempo.bpm, tempo.beatOffsetSec,
      analysis.frames / analysis.frameRate
    );

    setImportProgress("メロディを聞き取ってる…", 0.72);
    const melody = await trackMelody(
      analysis.vocal,
      IMPORT_RATE,
      (ratio) => setImportProgress("メロディを聞き取ってる…", 0.72 + ratio * 0.22),
      { clarityThreshold: importTuning.clarityThreshold, shouldCancel: () => importState.cancelRequested }
    );
    analysis.pitches = melody.pitches;
    analysis.pitchFrameRate = melody.frameRate;

    setImportProgress("コードを推定してる…", 0.96);
    importState.analysis = analysis;
    importState.instBuffer = audioBufferFromArray(analysis.inst, IMPORT_RATE);
    importState.vocalBuffer = audioBufferFromArray(analysis.vocal, IMPORT_RATE);

    importEl.bpm.value = String(Math.round(tempo.bpm * 10) / 10);
    importEl.offset.value = String(Math.round(tempo.beatOffsetSec * 100) / 100);
    refreshImportPreview();

    hideImportProgress();
    importEl.result.classList.remove("is-hidden");
    if (truncated) {
      importEl.summary.textContent += "（長い曲だったので、最初の6分だけ解析したよ）";
    }
  } catch (error) {
    hideImportProgress();
    if (error === CANCELLED) {
      importEl.summary && (importEl.summary.textContent = "");
    } else {
      console.warn("import analysis failed", error);
      window.alert("解析に失敗しちゃった。別のファイルで試してみてね。");
    }
  } finally {
    importState.busy = false;
    importState.cancelRequested = false;
    importEl.analyzeButton.disabled = false;
    importEl.progressCancel?.classList.add("is-hidden");
  }
}

// BPM・オフセットの手なおしを反映して、変換プレビューを作り直す（軽い処理）
function buildImportScore() {
  if (!importState.analysis) {
    return null;
  }
  const bpm = Math.max(40, Math.min(240, Number(importEl.bpm.value) || 100));
  const beatOffsetSec = Math.max(0, Number(importEl.offset.value) || 0);
  return buildScoreFromAnalysis(importState.analysis, {
    bpm,
    beatOffsetSec,
    beatsPerBar: importTuning.beatsPerBar,
    quantUnit: importQuantUnit(),
    changePenalty: importTuning.changePenalty,
    keyStrength: importTuning.keyStrength,
    // 検出した実拍の位置に従う（テンポはBPMとして再生に使う）。BPM/オフセットを手で変えたら一様グリッドに戻す。
    beatTimes: importState.useBeatTimes === false ? null : importState.beatTimes
  });
}

// イベントの startBeat を beats から振り直す（手なおし後の位置を保つ）
function recomputeStartBeats(events) {
  let beat = 0;
  events.forEach((event) => {
    event.startBeat = beat;
    if (event.type === "chord") {
      beat += Number(event.beats) || 0;
    }
  });
  return beat;
}

function refreshImportPreview() {
  const score = buildImportScore();
  if (!score) {
    importEl.summary.textContent = "解析結果から譜面を作れなかった。BPMやオフセットを調整してみてね。";
    if (importEl.chordEditor) {
      importEl.chordEditor.innerHTML = "";
    }
    importEl.convertButton.disabled = true;
    return;
  }
  importEl.convertButton.disabled = false;
  // 検出しなおしたので、編集中のスコアを置き換える
  importState.workingScore = score;
  renderChordEditor();
  syncPianoRoll();
  renderBpmCandidates();
  drawDebugCanvases(score);
}

// ===== ピアノロール（メロディ手なおし）＋単語わりつけ =====

function syncPianoRoll() {
  const score = importState.workingScore;
  if (!importEl.melodyCanvas || !score) {
    return;
  }
  const bpm = Math.max(40, Math.min(240, Number(importEl.bpm.value) || 100));
  const opts = { bpm, beatsPerBar: importTuning.beatsPerBar, quantUnit: importQuantUnit() };
  if (!pianoRoll) {
    pianoRoll = createPianoRoll(importEl.melodyCanvas, {
      ...opts,
      onChange: (melody) => {
        score.melody = melody;
        importWordEvents = null; // メロディが変わったら単語わりつけはやりなおし
      }
    });
  }
  pianoRoll.setMelody(score.melody, opts);
}

function groupWordsToMelody() {
  const score = importState.workingScore;
  if (!score || !score.melody.length) {
    importEl.melodyWordsSummary.textContent = "先にメロディが必要だよ。";
    return;
  }
  const text = importEl.melodyLyrics.value;
  const { wordEvents, noteLyrics } = groupLyricsToMelody(text, score.melody);
  // ノートに歌詞（モーラ）を乗せる
  const sorted = [...score.melody].sort((a, b) => a.startBeat - b.startBeat);
  sorted.forEach((note, i) => { note.lyric = noteLyrics[i] || ""; });
  importWordEvents = wordEvents;
  pianoRoll?.render();
  importEl.melodyWordsSummary.textContent = `${wordEvents.length}単語をボーカルのタイミングにわりつけたよ。`;
  importEl.melodyWordChips.innerHTML = wordEvents
    .map((w) => `<span class="word-chip">${escapeHtml(w.text)}<small>${formatBeatPos(w.startBeat)}</small></span>`)
    .join("");
}

function fitLyricsToMelodyUI() {
  const score = importState.workingScore;
  if (!score || !score.melody.length) {
    importEl.melodyWordsSummary.textContent = "先にメロディが必要だよ。";
    return;
  }
  const lines = importEl.melodyLyrics.value.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) {
    importEl.melodyWordsSummary.textContent = "歌詞を1行ずつ入れてね。";
    return;
  }
  const result = fitLyricsToMelody(lines, score.melody);
  const sorted = [...score.melody].sort((a, b) => a.startBeat - b.startBeat);
  sorted.forEach((note) => { note.lyric = ""; });
  result.noteAssignments.forEach((a) => {
    if (sorted[a.noteIndex]) {
      sorted[a.noteIndex].lyric = a.text;
    }
  });
  importWordEvents = result.lineEvents; // 行＝歌詞イベント（ボーカルのタイミング）
  pianoRoll?.render();
  importEl.melodyWordsSummary.textContent =
    `音にはめたよ（${result.stats.notes}音 / ${result.stats.morae}文字、のばし${result.stats.melisma}・つめ${result.stats.crammed}）。`;
  importEl.melodyWordChips.innerHTML = result.lineEvents
    .map((w) => `<span class="word-chip">${escapeHtml(w.text)}<small>${formatBeatPos(w.startBeat)}</small></span>`)
    .join("");
}

function formatBeatPos(beat) {
  const bpb = importTuning.beatsPerBar;
  const bar = Math.floor(beat / bpb) + 1;
  const b = (beat % bpb) + 1;
  return `${bar}-${Number.isInteger(b) ? b : b.toFixed(1)}`;
}

// 検出済みコードを、小節-拍つきで手なおしできる表として描く
function renderChordEditor() {
  const score = importState.workingScore;
  if (!score || !importEl.chordEditor) {
    return;
  }
  const beatsPerBar = importTuning.beatsPerBar;
  const totalBeats = recomputeStartBeats(score.events);
  const chordEvents = score.events.filter((event) => event.type === "chord");
  const bars = Math.ceil(totalBeats / beatsPerBar) || 1;
  const keyLabel = score.key ? `${KEY_NAMES[score.key.tonic]}${score.key.mode === "minor" ? "m（短調）" : "（長調）"}` : "?";
  importEl.summary.textContent =
    `全${bars}小節 / コード${chordEvents.filter((e) => e.chord).length}個 / メロディ${score.melody.length}音 / 推定キー: ${keyLabel}。コード名・拍数を手なおしできるよ。`;

  importEl.chordEditor.innerHTML = "";
  let runBeat = 0;
  chordEvents.forEach((event) => {
    const bar = Math.floor(runBeat / beatsPerBar) + 1;
    const beatInBar = (runBeat % beatsPerBar) + 1;
    runBeat += Number(event.beats) || 0;
    const row = document.createElement("div");
    row.className = "chord-edit-row";
    row.innerHTML = `
      <span class="chord-edit-pos">${bar}-${Number.isInteger(beatInBar) ? beatInBar : beatInBar.toFixed(1)}</span>
      <input class="chord-edit-name" type="text" value="${escapeAttr(event.chord || "")}" placeholder="(なし)" aria-label="コード">
      <input class="chord-edit-beats" type="number" min="0.25" max="32" step="0.25" value="${event.beats}" aria-label="拍数">
      <button class="chord-edit-del" type="button" title="削除">✕</button>`;
    row.querySelector(".chord-edit-name").addEventListener("input", (ev) => {
      event.chord = ev.target.value.trim() || null;
    });
    row.querySelector(".chord-edit-beats").addEventListener("change", (ev) => {
      event.beats = Math.max(0.25, Number(ev.target.value) || 0.25);
      renderChordEditor();
    });
    row.querySelector(".chord-edit-del").addEventListener("click", () => {
      const idx = score.events.indexOf(event);
      if (idx >= 0) {
        score.events.splice(idx, 1);
        renderChordEditor();
      }
    });
    importEl.chordEditor.appendChild(row);
  });
}

// ===== チューニング＆デバッグ =====

function renderBpmCandidates() {
  if (!importEl.bpmCandidates) {
    return;
  }
  const current = Number(importEl.bpm.value) || 0;
  importEl.bpmCandidates.innerHTML = "";
  importState.tempoCandidates.forEach((candidate) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bpm-candidate";
    button.classList.toggle("is-active", Math.abs(candidate.bpm - current) < 0.6);
    button.textContent = `${candidate.bpm}`;
    button.title = `スコア ${candidate.score}`;
    button.addEventListener("click", () => {
      importEl.bpm.value = String(candidate.bpm);
      refreshImportPreview();
    });
    importEl.bpmCandidates.appendChild(button);
  });
}

function scaleBpm(factor) {
  const next = Math.max(40, Math.min(240, (Number(importEl.bpm.value) || 100) * factor));
  importEl.bpm.value = String(Math.round(next * 10) / 10);
  refreshImportPreview();
}

function drawDebugCanvases(score) {
  drawFluxCanvas();
  drawMelodyCanvas(score);
}

function drawFluxCanvas() {
  const canvas = importEl.debugFlux;
  const analysis = importState.analysis;
  if (!canvas || !analysis) {
    return;
  }
  const width = canvas.parentElement.clientWidth - 4 || 800;
  canvas.width = width;
  const height = canvas.height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#10212e";
  ctx.fillRect(0, 0, width, height);

  const flux = analysis.flux;
  let max = 0;
  for (let i = 0; i < flux.length; i += 1) {
    max = Math.max(max, flux[i]);
  }
  const durationSec = analysis.frames / analysis.frameRate;

  // 拍グリッド
  const bpm = Number(importEl.bpm.value) || 100;
  const offset = Number(importEl.offset.value) || 0;
  const spb = 60 / bpm;
  ctx.lineWidth = 1;
  let beatIndex = 0;
  for (let t = offset; t < durationSec; t += spb) {
    const x = (t / durationSec) * width;
    const isBarHead = beatIndex % 4 === 0;
    ctx.strokeStyle = isBarHead ? "rgba(216, 155, 43, 0.9)" : "rgba(216, 155, 43, 0.35)";
    ctx.beginPath();
    ctx.moveTo(x, isBarHead ? 0 : height * 0.25);
    ctx.lineTo(x, height);
    ctx.stroke();
    beatIndex += 1;
  }

  // フラックス
  ctx.strokeStyle = "#9ec9f5";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < flux.length; i += 1) {
    const x = (i / flux.length) * width;
    const y = height - (flux[i] / (max || 1)) * (height - 6) - 2;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

function drawMelodyCanvas(score) {
  const canvas = importEl.debugMelody;
  const analysis = importState.analysis;
  if (!canvas || !analysis || !analysis.pitches) {
    return;
  }
  const width = canvas.parentElement.clientWidth - 4 || 800;
  canvas.width = width;
  const height = canvas.height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#10212e";
  ctx.fillRect(0, 0, width, height);

  const pitches = analysis.pitches;
  const durationSec = pitches.length / analysis.pitchFrameRate;
  const voiced = pitches.filter((p) => p !== null);
  if (!voiced.length) {
    ctx.fillStyle = "#9ec9f5";
    ctx.fillText("ピッチが見つからなかった（メロディ感度を下げてみて）", 10, 20);
    return;
  }
  const minMidi = Math.min(...voiced) - 1;
  const maxMidi = Math.max(...voiced) + 1;
  const yFor = (midi) => height - ((midi - minMidi) / (maxMidi - minMidi)) * (height - 8) - 4;

  // 検出ピッチ（点）
  ctx.fillStyle = "rgba(158, 201, 245, 0.8)";
  for (let i = 0; i < pitches.length; i += 1) {
    if (pitches[i] === null) {
      continue;
    }
    const x = (i / pitches.length) * width;
    ctx.fillRect(x, yFor(pitches[i]), 1.6, 1.6);
  }

  // クオンタイズ後ノート（横棒）
  if (score?.melody?.length) {
    const bpm = Number(importEl.bpm.value) || 100;
    const spb = 60 / bpm;
    ctx.fillStyle = "rgba(216, 111, 119, 0.85)";
    score.melody.forEach((note) => {
      const startSec = score.audioOffsetSec + note.startBeat * spb;
      const x = (startSec / durationSec) * width;
      const w = Math.max(2, ((note.beats * spb) / durationSec) * width - 1);
      ctx.fillRect(x, yFor(note.midi) - 1.4, w, 3.2);
    });
  }
}

async function reanalyzeMelodyOnly() {
  if (!importState.analysis || importState.busy) {
    return;
  }
  importState.busy = true;
  importState.cancelRequested = false;
  importEl.progressCancel?.classList.remove("is-hidden");
  try {
    setImportProgress("メロディを聞き取りなおしてる…", 0.2);
    const melody = await trackMelody(
      importState.analysis.vocal,
      IMPORT_RATE,
      (ratio) => setImportProgress("メロディを聞き取りなおしてる…", 0.2 + ratio * 0.75),
      { clarityThreshold: importTuning.clarityThreshold, shouldCancel: () => importState.cancelRequested }
    );
    importState.analysis.pitches = melody.pitches;
    importState.analysis.pitchFrameRate = melody.frameRate;
    hideImportProgress();
    refreshImportPreview();
  } catch (error) {
    hideImportProgress();
    if (error !== CANCELLED) { console.warn("melody reanalyze failed", error); }
  } finally {
    importState.busy = false;
    importState.cancelRequested = false;
    importEl.progressCancel?.classList.add("is-hidden");
  }
}

async function reanalyzeFull() {
  if (!importState.midSide || importState.busy) {
    return;
  }
  importState.busy = true;
  importState.cancelRequested = false;
  importEl.analyzeButton.disabled = true;
  importEl.progressCancel?.classList.remove("is-hidden");
  try {
    const { mid, side } = importState.midSide;
    const analysis = await analyzeAudio({
      mid,
      side,
      sampleRate: IMPORT_RATE,
      method: importTuning.separationMethod,
      vocalSideFactor: importTuning.vocalSideFactor,
      repetStrength: importTuning.repetStrength,
      chromaMinHz: importTuning.chromaMinHz,
      chromaMaxHz: importTuning.chromaMaxHz,
      chromaLogCompress: importTuning.chromaLogCompress,
      shouldCancel: () => importState.cancelRequested,
      onProgress: (ratio) => setImportProgress("分離からやりなおしてる…", ratio * 0.7)
    });
    setImportProgress("メロディを聞き取ってる…", 0.72);
    const melody = await trackMelody(
      analysis.vocal,
      IMPORT_RATE,
      (ratio) => setImportProgress("メロディを聞き取ってる…", 0.72 + ratio * 0.25),
      { clarityThreshold: importTuning.clarityThreshold }
    );
    analysis.pitches = melody.pitches;
    analysis.pitchFrameRate = melody.frameRate;
    importState.analysis = analysis;
    importState.instBuffer = audioBufferFromArray(analysis.inst, IMPORT_RATE);
    importState.vocalBuffer = audioBufferFromArray(analysis.vocal, IMPORT_RATE);
    const reTempo = estimateTempo(analysis.flux, analysis.frameRate);
    importState.beatTimes = trackBeats(analysis.flux, analysis.frameRate, reTempo.bpm, reTempo.beatOffsetSec, analysis.frames / analysis.frameRate);
    importState.useBeatTimes = true;
    hideImportProgress();
    refreshImportPreview();
  } catch (error) {
    hideImportProgress();
    if (error !== CANCELLED) {
      console.warn("reanalyze failed", error);
    }
  } finally {
    importState.busy = false;
    importState.cancelRequested = false;
    importEl.analyzeButton.disabled = false;
    importEl.progressCancel?.classList.add("is-hidden");
  }
}

function exportDebugJson() {
  const analysis = importState.analysis;
  if (!analysis) {
    return;
  }
  const score = buildImportScore();
  const data = {
    fileName: importState.fileName,
    exportedAt: new Date().toISOString(),
    settings: {
      bpm: Number(importEl.bpm.value),
      beatOffsetSec: Number(importEl.offset.value),
      quantize: importEl.quantize.value,
      ...importTuning
    },
    tempoCandidates: importState.tempoCandidates,
    beatLabels: score?.beatLabels || [],
    melody: score?.melody || [],
    audioOffsetSec: score?.audioOffsetSec,
    frameRate: analysis.frameRate,
    flux: Array.from(analysis.flux, (v) => Math.round(v * 100) / 100),
    pitchFrameRate: analysis.pitchFrameRate,
    pitches: (analysis.pitches || []).map((p) => (p === null ? null : Math.round(p * 100) / 100))
  };
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${importState.fileName || "analysis"}-debug.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function stopImportPreview() {
  if (importState.previewSource) {
    try {
      importState.previewSource.stop();
    } catch (error) {
      // 停止済みなら無視
    }
    importState.previewSource = null;
    importState.previewKind = null;
  }
  [importEl.previewOriginal, importEl.previewInst, importEl.previewVocal].forEach((button) => {
    button?.classList.remove("is-playing");
  });
}

function toggleImportPreview(kind, button) {
  const wasPlaying = importState.previewKind === kind;
  stopImportPreview();
  if (wasPlaying) {
    return;
  }
  const buffer = kind === "original"
    ? importState.originalBuffer
    : kind === "inst"
      ? importState.instBuffer
      : importState.vocalBuffer;
  if (!buffer) {
    return;
  }
  const ctx = ensureAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  const startSec = Math.max(0, Number(importEl.offset.value) || 0);
  source.start(ctx.currentTime, startSec);
  source.onended = () => {
    if (importState.previewSource === source) {
      stopImportPreview();
    }
  };
  importState.previewSource = source;
  importState.previewKind = kind;
  button.classList.add("is-playing");
}

function convertImportToSong() {
  const score = importState.workingScore || buildImportScore();
  if (!score) {
    window.alert("譜面を作れなかった。BPMやオフセットを調整してみてね。");
    return;
  }
  recomputeStartBeats(score.events);
  stopImportPreview();
  const bpm = Math.max(40, Math.min(240, Number(importEl.bpm.value) || 100));
  // 文字起こし結果があればタイムスタンプで割り付け、なければ貼り付け歌詞をN小節ごとに仮割り付け
  const transcript = typeof getTranscriptChunks === "function" ? getTranscriptChunks() : [];
  if (importWordEvents && importWordEvents.length) {
    // ピアノロールで単語わりつけした結果を、ボーカルのタイミングで歌詞にする
    assignTimedLyricsToEvents(score.events, importWordEvents.map((w) => ({ startBeat: w.startBeat, text: w.text })));
  } else if (transcript.length) {
    const timedLines = transcript.map((chunk) => ({
      startBeat: Math.max(0, ((chunk.start - score.audioOffsetSec) * bpm) / 60),
      text: chunk.text
    }));
    assignTimedLyricsToEvents(score.events, timedLines);
  } else {
    assignLyricsToEvents(
      score.events,
      importEl.lyrics.value,
      importTuning.beatsPerBar,
      Number(importEl.barsPerLine.value) || 2
    );
  }
  applyImportedSong(
    {
      title: `${importState.fileName}（取り込み）`,
      artist: "",
      bpm: Math.round(bpm * 10) / 10,
      beatsPerBar: importTuning.beatsPerBar,
      defaultBeats: 2,
      transpose: 0,
      source: "",
      events: score.events,
      melody: score.melody,
      rhythmPattern: "whole"
    },
    {
      buffer: importState.originalBuffer,
      offsetSec: score.audioOffsetSec,
      name: importState.fileName
    }
  );
  setMode("edit");
}

// ===== イベント登録 =====

importEl.fileButton?.addEventListener("click", () => importEl.file.click());
importEl.file?.addEventListener("change", () => {
  selectImportFile(importEl.file.files?.[0]);
});

// ドラッグ＆ドロップで音源を受け取る
const importDropZone = document.querySelector("#import-view");
if (importDropZone) {
  let dragDepth = 0;
  const setDragging = (on) => importDropZone.classList.toggle("is-dragover", on);
  importDropZone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragDepth += 1;
    setDragging(true);
  });
  importDropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  });
  importDropZone.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      setDragging(false);
    }
  });
  importDropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dragDepth = 0;
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      selectImportFile(file);
    }
  });
}
importEl.analyzeButton?.addEventListener("click", runImportAnalysis);
importEl.bpm?.addEventListener("change", () => { importState.useBeatTimes = false; refreshImportPreview(); });
importEl.offset?.addEventListener("change", () => { importState.useBeatTimes = false; refreshImportPreview(); });
importEl.quantize?.addEventListener("change", refreshImportPreview);
importEl.beatsPerBar?.addEventListener("change", () => {
  importTuning.beatsPerBar = Number(importEl.beatsPerBar.value) || 4;
  refreshImportPreview();
});
importEl.previewOriginal?.addEventListener("click", () => toggleImportPreview("original", importEl.previewOriginal));
importEl.previewInst?.addEventListener("click", () => toggleImportPreview("inst", importEl.previewInst));
importEl.previewVocal?.addEventListener("click", () => toggleImportPreview("vocal", importEl.previewVocal));
importEl.convertButton?.addEventListener("click", convertImportToSong);

importEl.bpmHalf?.addEventListener("click", () => scaleBpm(0.5));
importEl.bpmDouble?.addEventListener("click", () => scaleBpm(2));
importEl.tunePenalty?.addEventListener("input", () => {
  importTuning.changePenalty = Number(importEl.tunePenalty.value);
  importEl.tunePenaltyVal.textContent = importTuning.changePenalty.toFixed(2);
  refreshImportPreview();
});
importEl.tuneVocal?.addEventListener("input", () => {
  importTuning.vocalSideFactor = Number(importEl.tuneVocal.value);
  importEl.tuneVocalVal.textContent = importTuning.vocalSideFactor.toFixed(1);
});
importEl.tuneClarity?.addEventListener("input", () => {
  importTuning.clarityThreshold = Number(importEl.tuneClarity.value);
  importEl.tuneClarityVal.textContent = importTuning.clarityThreshold.toFixed(2);
});
importEl.separationMethod?.addEventListener("change", () => {
  importTuning.separationMethod = importEl.separationMethod.value;
});

if (importEl.chromaPreset) {
  importEl.chromaPreset.innerHTML = "";
  Object.entries(CHROMA_PRESETS).forEach(([key, preset]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = preset.label;
    importEl.chromaPreset.appendChild(option);
  });
  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = "カスタム（手動指定）";
  importEl.chromaPreset.appendChild(customOption);
  const applyChromaPreset = (key) => {
    const preset = CHROMA_PRESETS[key] || CHROMA_PRESETS.auto;
    importTuning.chromaPreset = key;
    if (key !== "custom") {
      importTuning.chromaMinHz = preset.minHz;
      importTuning.chromaMaxHz = preset.maxHz;
      importEl.chromaMinHz.value = String(preset.minHz);
      importEl.chromaMaxHz.value = String(preset.maxHz);
    }
  };
  importEl.chromaPreset.addEventListener("change", () => applyChromaPreset(importEl.chromaPreset.value));
  const syncRange = () => {
    importTuning.chromaMinHz = Math.max(30, Math.min(1000, Number(importEl.chromaMinHz.value) || 65));
    importTuning.chromaMaxHz = Math.max(importTuning.chromaMinHz + 50, Math.min(8000, Number(importEl.chromaMaxHz.value) || 2000));
    importTuning.chromaPreset = "custom";
    importEl.chromaPreset.value = "custom";
  };
  importEl.chromaMinHz.addEventListener("change", syncRange);
  importEl.chromaMaxHz.addEventListener("change", syncRange);
  importEl.chromaLog.addEventListener("change", () => {
    importTuning.chromaLogCompress = importEl.chromaLog.checked;
  });
}
importEl.tuneRepet?.addEventListener("input", () => {
  importTuning.repetStrength = Number(importEl.tuneRepet.value);
  importEl.tuneRepetVal.textContent = importTuning.repetStrength.toFixed(1);
});
importEl.tuneKey?.addEventListener("input", () => {
  importTuning.keyStrength = Number(importEl.tuneKey.value);
  importEl.tuneKeyVal.textContent = importTuning.keyStrength.toFixed(2);
  refreshImportPreview();
});
importEl.reanalyzeMelody?.addEventListener("click", reanalyzeMelodyOnly);
importEl.reanalyzeFull?.addEventListener("click", reanalyzeFull);
importEl.exportDebug?.addEventListener("click", exportDebugJson);
importEl.melodyPlay?.addEventListener("click", () => pianoRoll?.play());
importEl.melodyClear?.addEventListener("click", () => {
  if (importState.workingScore) {
    importState.workingScore.melody = [];
    importWordEvents = null;
    importEl.melodyWordChips.innerHTML = "";
    importEl.melodyWordsSummary.textContent = "";
    syncPianoRoll();
  }
});
importEl.melodyGroupWords?.addEventListener("click", groupWordsToMelody);
importEl.melodyFitLyrics?.addEventListener("click", fitLyricsToMelodyUI);
document.querySelector("#melody-to-hiragana")?.addEventListener("click", async () => {
  const ta = document.querySelector("#melody-lyrics");
  if (!ta || !ta.value.trim() || typeof toHiragana !== "function") {
    return;
  }
  const lines = ta.value.split("\n");
  const out = [];
  for (const line of lines) {
    out.push(await toHiragana(line));
  }
  ta.value = out.join("\n");
});
importEl.melodyBlock?.addEventListener("toggle", () => {
  if (importEl.melodyBlock.open) {
    syncPianoRoll();
  }
});
importEl.progressCancel?.addEventListener("click", () => {
  importState.cancelRequested = true;
  importEl.progressLabel.textContent = "キャンセル中…";
});
document.querySelector("#import-debug")?.addEventListener("toggle", () => {
  if (importState.analysis) {
    drawDebugCanvases(buildImportScore());
  }
});
