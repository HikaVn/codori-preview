// MusicXML / PDF ファイルから、取り込み（音源解析）と同じ編集フローへ流し込む。
// musicxml.js / import.js（importState, refreshImportPreview等）の後に読み込む。

const fileImportEl = {
  musicxmlButton: document.querySelector("#import-musicxml-button"),
  musicxmlInput: document.querySelector("#import-musicxml"),
  pdfButton: document.querySelector("#import-pdf-button"),
  pdfInput: document.querySelector("#import-pdf")
};

// MusicXML/PDFの結果を importState.workingScore に流し込み、取り込み画面の編集UIを開く
function applyParsedScore(parsed, sourceLabel) {
  const beatsPerBar = parsed.beatsPerBar || 4;
  if (typeof importTuning !== "undefined") {
    importTuning.beatsPerBar = beatsPerBar;
    if (importEl.beatsPerBar) importEl.beatsPerBar.value = String(beatsPerBar);
  }
  // コードイベント列（startBeat順）→ events
  const chords = [...(parsed.chordEvents || [])].sort((a, b) => a.startBeat - b.startBeat);
  const events = [{ type: "section", label: sourceLabel, beats: 0, lineIndex: 0 }];
  if (chords.length) {
    chords.forEach((c, i) => {
      const next = chords[i + 1];
      const beats = next ? Math.max(0.25, next.startBeat - c.startBeat) : beatsPerBar;
      events.push({ type: "chord", chord: c.chord, lyric: "", beats, lineIndex: 1 });
    });
  } else {
    // コードが無い（PDF歌詞のみ等）→ メロディ長ぶんの空イベント
    events.push({ type: "chord", chord: null, lyric: "", beats: beatsPerBar, lineIndex: 1 });
  }

  importState.analysis = importState.analysis || { pitches: null };
  importState.workingScore = {
    events,
    melody: (parsed.melody || []).map((n) => ({ ...n })),
    bars: Math.ceil((chords.length ? chords[chords.length - 1].startBeat + beatsPerBar : beatsPerBar) / beatsPerBar),
    audioOffsetSec: 0
  };
  importState.beatTimes = null;
  importState.useBeatTimes = false;
  importState.fileName = parsed.title || sourceLabel;
  if (parsed.bpm && importEl.bpm) {
    importEl.bpm.value = String(parsed.bpm);
  }
  // 歌詞をパネルへ
  if (parsed.words && parsed.words.length && importEl.melodyLyrics) {
    importEl.melodyLyrics.value = parsed.words.map((w) => w.text).join(" ");
    importWordEvents = parsed.words.map((w) => ({ startBeat: w.startBeat, text: w.text }));
  } else if (parsed.lyricLines && parsed.lyricLines.length && importEl.melodyLyrics) {
    importEl.melodyLyrics.value = parsed.lyricLines.join("\n");
  }

  importEl.result.classList.remove("is-hidden");
  renderChordEditor();
  syncPianoRoll();
  if (importEl.melodyBlock) importEl.melodyBlock.open = true;
  // 編集UIは取り込みタブにあるので、そこへ自動で移動して見えるようにする
  if (typeof setMode === "function") {
    setMode("import");
  }
  importEl.result.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ===== ファイル種別ごとの読み込み（ボタン / ドラッグ＆ドロップ 共通） =====

async function handleMusicXmlFile(file) {
  try {
    const parsed = await loadMusicXmlFile(file);
    if (!parsed) throw new Error("empty");
    applyParsedScore(parsed, "楽譜");
    window.alert(`MusicXMLを読み込んだよ（コード${parsed.chordEvents.length}・音符${parsed.melody.length}・歌詞${parsed.words.length}語）。取り込み画面のピアノロール／歌詞欄で手なおしして「譜面にする」。`);
  } catch (error) {
    console.warn("musicxml import failed", error);
    window.alert("MusicXMLを読めなかった。MuseScore/Sibelius等で「MusicXML書き出し」したファイルを選んでね。");
  }
}

async function handlePdfFile(file) {
  try {
    const text = await extractPdfLyrics(file);
    const parsed = parseScoreText(text);
    // ベクターPDFなら符頭（音楽フォントのグリフ）から音符を推定（実験的）
    let vectorMelody = [];
    try {
      const lib = await loadPdfjs();
      const res = await extractPdfVectorMelody(file, lib.getDocument.bind(lib), lib.OPS);
      vectorMelody = res.melody || [];
    } catch (e) {
      console.warn("vector note read failed", e);
    }
    if (parsed.chords.length || vectorMelody.length) {
      applyParsedScore({
        title: parsed.title,
        bpm: parsed.bpm,
        beatsPerBar: 4,
        melody: vectorMelody,
        chordEvents: parsed.chords.map((c, i) => ({ startBeat: i, chord: c })),
        words: [],
        lyricLines: parsed.lyricLines
      }, "PDF譜面");
      window.alert(`PDFから読み込んだよ（コード${parsed.chords.length}・メロディ${vectorMelody.length}音（実験的）・歌詞${parsed.lyricLines.length}行${parsed.bpm ? "・♩=" + parsed.bpm : ""}）。ピアノロールでメロディ、歌詞欄で歌詞を直して「譜面にする」。`);
    } else if (parsed.lyricLines.length) {
      if (importEl.melodyLyrics) importEl.melodyLyrics.value = parsed.lyricLines.join("\n");
      importEl.melodyBlock && (importEl.melodyBlock.open = true);
      importEl.result.classList.remove("is-hidden");
      if (typeof setMode === "function") setMode("import");
      window.alert(`PDFから歌詞${parsed.lyricLines.length}行を読み込んだよ（メロディ・コードは取れなかった）。`);
    } else {
      window.alert("PDFから歌詞・コードを読めなかった。スキャン画像のPDFはテキストが取れないんだ。");
    }
  } catch (error) {
    console.warn("pdf import failed", error);
    window.alert("PDFを読めなかった（ネットワークでpdf.jsの読み込みに失敗したか、対応外の形式かも）。");
  }
}

// 拡張子で振り分け（DnD用）
function routeScoreFile(file) {
  if (!file) return;
  if (/\.(xml|musicxml|mxl)$/i.test(file.name)) {
    handleMusicXmlFile(file);
  } else if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
    handlePdfFile(file);
  } else if (typeof selectImportFile === "function" && (/^audio\//.test(file.type) || /\.(wav|mp3|m4a|aac|ogg|flac|webm)$/i.test(file.name))) {
    // 音源は取り込みタブへ
    if (typeof setMode === "function") setMode("import");
    selectImportFile(file);
  } else {
    window.alert("対応していないファイルだよ（MusicXML / PDF / 音源）。");
  }
}

fileImportEl.musicxmlButton?.addEventListener("click", () => fileImportEl.musicxmlInput.click());
fileImportEl.musicxmlInput?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (file) handleMusicXmlFile(file);
});

fileImportEl.pdfButton?.addEventListener("click", () => fileImportEl.pdfInput.click());
fileImportEl.pdfInput?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (file) handlePdfFile(file);
});

// ライブラリパネル全体をMusicXML/PDF/音源のドロップ領域にする
const scoreDropZone = document.querySelector(".library-panel");
if (scoreDropZone) {
  let depth = 0;
  const setOn = (on) => scoreDropZone.classList.toggle("is-dragover", on);
  scoreDropZone.addEventListener("dragenter", (e) => { e.preventDefault(); depth += 1; setOn(true); });
  scoreDropZone.addEventListener("dragover", (e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; });
  scoreDropZone.addEventListener("dragleave", (e) => { e.preventDefault(); depth = Math.max(0, depth - 1); if (depth === 0) setOn(false); });
  scoreDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    depth = 0;
    setOn(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) routeScoreFile(file);
  });
}

// 漢字・カタカナ → ひらがな 一括変換（歌詞欄）
async function convertLyricsToHiragana(textarea) {
  if (!textarea || !textarea.value.trim()) return;
  const original = textarea.value;
  textarea.disabled = true;
  const prev = textarea.value;
  try {
    const lines = original.split("\n");
    const converted = [];
    for (const line of lines) {
      converted.push(await toHiragana(line));
    }
    textarea.value = converted.join("\n");
  } catch (error) {
    textarea.value = prev;
    window.alert("ひらがな変換に失敗した（辞書のダウンロードに失敗したかも）。");
  } finally {
    textarea.disabled = false;
  }
}

document.querySelector("#melody-to-hiragana")?.addEventListener("click", () => {
  convertLyricsToHiragana(document.querySelector("#melody-lyrics"));
});
