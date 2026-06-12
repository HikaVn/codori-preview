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
}

fileImportEl.musicxmlButton?.addEventListener("click", () => fileImportEl.musicxmlInput.click());
fileImportEl.musicxmlInput?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const parsed = await loadMusicXmlFile(file);
    if (!parsed) throw new Error("empty");
    applyParsedScore(parsed, "楽譜");
    window.alert(`MusicXMLを読み込んだよ（コード${parsed.chordEvents.length}・音符${parsed.melody.length}・歌詞${parsed.words.length}語）。取り込み画面で手なおしして「譜面にする」。`);
  } catch (error) {
    console.warn("musicxml import failed", error);
    window.alert("MusicXMLを読めなかった。MuseScore/Sibelius等で「MusicXML書き出し」したファイルを選んでね。");
  }
});

fileImportEl.pdfButton?.addEventListener("click", () => fileImportEl.pdfInput.click());
fileImportEl.pdfInput?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const text = await extractPdfLyrics(file);
    const parsed = parseScoreText(text);
    // PDFは音符が取れないので、コードと歌詞・テンポだけ流し込む
    if (parsed.chords.length) {
      applyParsedScore({
        title: parsed.title,
        bpm: parsed.bpm,
        beatsPerBar: 4,
        melody: [],
        chordEvents: parsed.chords.map((c, i) => ({ startBeat: i, chord: c })),
        words: [],
        lyricLines: parsed.lyricLines
      }, "PDF譜面");
      window.alert(`PDFから読み込んだよ（コード${parsed.chords.length}・歌詞${parsed.lyricLines.length}行${parsed.bpm ? "・♩=" + parsed.bpm : ""}）。音符は画像なので取れないけど、コードと歌詞は取り込んだよ。`);
    } else if (parsed.lyricLines.length) {
      if (importEl.melodyLyrics) importEl.melodyLyrics.value = parsed.lyricLines.join("\n");
      importEl.melodyBlock && (importEl.melodyBlock.open = true);
      importEl.result.classList.remove("is-hidden");
      window.alert(`PDFから歌詞${parsed.lyricLines.length}行を読み込んだよ。`);
    } else {
      window.alert("PDFから歌詞・コードを読めなかった。スキャン画像のPDFはテキストが取れないんだ。");
    }
  } catch (error) {
    console.warn("pdf import failed", error);
    window.alert("PDFを読めなかった（ネットワークでpdf.jsの読み込みに失敗したか、対応外の形式かも）。");
  }
});

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
