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
  result: document.querySelector("#import-result"),
  bpm: document.querySelector("#import-bpm"),
  offset: document.querySelector("#import-offset"),
  summary: document.querySelector("#import-summary"),
  chordPreview: document.querySelector("#import-chord-preview"),
  previewOriginal: document.querySelector("#preview-original"),
  previewInst: document.querySelector("#preview-inst"),
  previewVocal: document.querySelector("#preview-vocal"),
  convertButton: document.querySelector("#import-convert")
};

const importState = {
  fileName: "",
  originalBuffer: null,
  analysis: null,
  instBuffer: null,
  vocalBuffer: null,
  previewSource: null,
  previewKind: null,
  busy: false
};

const IMPORT_RATE = 22050;
const IMPORT_MAX_SECONDS = 360;

function importQuantUnit() {
  switch (importEl.quantize.value) {
    case "4": return 1;
    case "8": return 0.5;
    case "8t": return 1 / 3;
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

async function runImportAnalysis() {
  const file = importEl.file.files?.[0];
  if (!file) {
    window.alert("先に音源ファイル（mp3 / wav / m4aなど）を選んでね。");
    return;
  }
  if (importState.busy) {
    return;
  }
  importState.busy = true;
  importEl.analyzeButton.disabled = true;
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

    const analysis = await analyzeAudio({
      mid,
      side,
      sampleRate: IMPORT_RATE,
      onProgress: (ratio) => setImportProgress("ボーカルと伴奏を分けてる…", 0.05 + ratio * 0.6)
    });

    setImportProgress("テンポと拍をさがしてる…", 0.68);
    const tempo = estimateTempo(analysis.flux, analysis.frameRate);

    setImportProgress("メロディを聞き取ってる…", 0.72);
    const melody = await trackMelody(
      analysis.vocal,
      IMPORT_RATE,
      (ratio) => setImportProgress("メロディを聞き取ってる…", 0.72 + ratio * 0.22)
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
    console.warn("import analysis failed", error);
    window.alert("解析に失敗しちゃった。別のファイルで試してみてね。");
  } finally {
    importState.busy = false;
    importEl.analyzeButton.disabled = false;
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
    beatsPerBar: 4,
    quantUnit: importQuantUnit()
  });
}

function refreshImportPreview() {
  const score = buildImportScore();
  if (!score) {
    importEl.summary.textContent = "解析結果から譜面を作れなかった。BPMやオフセットを調整してみてね。";
    importEl.chordPreview.innerHTML = "";
    importEl.convertButton.disabled = true;
    return;
  }
  importEl.convertButton.disabled = false;
  const chordSegments = score.events.filter((event) => event.type === "chord" && event.chord);
  importEl.summary.textContent =
    `全${score.bars}小節 / コード${chordSegments.length}個 / メロディ${score.melody.length}音を見つけたよ。`;
  importEl.chordPreview.innerHTML = chordSegments
    .slice(0, 32)
    .map((event) => `<span class="chord-chip">${escapeHtml(event.chord)}<small>${event.beats}拍</small></span>`)
    .join("")
    + (chordSegments.length > 32 ? `<span class="chord-chip chord-chip--more">…ほか${chordSegments.length - 32}個</span>` : "");
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
  const score = buildImportScore();
  if (!score) {
    window.alert("譜面を作れなかった。BPMやオフセットを調整してみてね。");
    return;
  }
  stopImportPreview();
  const bpm = Math.max(40, Math.min(240, Number(importEl.bpm.value) || 100));
  // 文字起こし結果があればタイムスタンプで割り付け、なければ貼り付け歌詞をN小節ごとに仮割り付け
  const transcript = typeof getTranscriptChunks === "function" ? getTranscriptChunks() : [];
  if (transcript.length) {
    const timedLines = transcript.map((chunk) => ({
      startBeat: Math.max(0, ((chunk.start - score.audioOffsetSec) * bpm) / 60),
      text: chunk.text
    }));
    assignTimedLyricsToEvents(score.events, timedLines);
  } else {
    assignLyricsToEvents(
      score.events,
      importEl.lyrics.value,
      4,
      Number(importEl.barsPerLine.value) || 2
    );
  }
  applyImportedSong(
    {
      title: `${importState.fileName}（取り込み）`,
      artist: "",
      bpm: Math.round(bpm * 10) / 10,
      beatsPerBar: 4,
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
  const file = importEl.file.files?.[0];
  importEl.fileName.textContent = file ? file.name : "まだ選んでないよ";
  importEl.result.classList.add("is-hidden");
  stopImportPreview();
  if (typeof resetTranscript === "function") {
    resetTranscript();
  }
});
importEl.analyzeButton?.addEventListener("click", runImportAnalysis);
importEl.bpm?.addEventListener("change", refreshImportPreview);
importEl.offset?.addEventListener("change", refreshImportPreview);
importEl.quantize?.addEventListener("change", refreshImportPreview);
importEl.previewOriginal?.addEventListener("click", () => toggleImportPreview("original", importEl.previewOriginal));
importEl.previewInst?.addEventListener("click", () => toggleImportPreview("inst", importEl.previewInst));
importEl.previewVocal?.addEventListener("click", () => toggleImportPreview("vocal", importEl.previewVocal));
importEl.convertButton?.addEventListener("click", convertImportToSong);
