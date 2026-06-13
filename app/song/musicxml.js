// MusicXML / PDF から歌詞・メロディ・コードを取り込む
// - MusicXML(.xml/.musicxml/.mxl): メロディ（音程・音価）＋歌詞＋コードを譜面化
// - PDF: テキスト埋め込みの歌詞だけ抽出（pdf.js）
// 依存は最小。.mxl の解凍は DecompressionStream（modern browser）を使う。

const PDFJS_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs";
const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs";

const XML_STEP_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const XML_KIND_SUFFIX = {
  major: "", minor: "m", augmented: "aug", diminished: "dim",
  dominant: "7", "dominant-seventh": "7",
  "major-seventh": "maj7", "minor-seventh": "m7",
  "major-sixth": "6", "minor-sixth": "m6",
  "half-diminished": "m7-5", "diminished-seventh": "dim",
  "suspended-fourth": "sus4", "suspended-second": "sus2",
  "major-ninth": "maj9", "dominant-ninth": "9", "minor-ninth": "m9",
  "augmented-seventh": "aug7", "minor-major": "mM7", "major-minor": "mM7",
  "add-nine": "add9", power: ""
};

// ===== .mxl（zip）の解凍 =====

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream not supported");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

// 最小ZIPリーダー（stored / deflate のみ）。MusicXMLの.mxlに十分。
async function readZipEntries(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  const entries = {};
  // ローカルファイルヘッダを走査
  let i = 0;
  while (i + 4 <= bytes.length) {
    const sig = view.getUint32(i, true);
    if (sig !== 0x04034b50) {
      break;
    }
    const method = view.getUint16(i + 8, true);
    const compSize = view.getUint32(i + 18, true);
    const nameLen = view.getUint16(i + 26, true);
    const extraLen = view.getUint16(i + 28, true);
    const nameStart = i + 30;
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLen));
    const dataStart = nameStart + nameLen + extraLen;
    const compData = bytes.subarray(dataStart, dataStart + compSize);
    let data;
    if (method === 0) {
      data = compData;
    } else if (method === 8) {
      data = await inflateRaw(compData);
    } else {
      data = null;
    }
    if (data) {
      entries[name] = data;
    }
    i = dataStart + compSize;
  }
  return entries;
}

async function extractMxlXml(arrayBuffer) {
  const entries = await readZipEntries(arrayBuffer);
  const decoder = new TextDecoder();
  // container.xml が本体パスを指す
  const container = entries["META-INF/container.xml"];
  if (container) {
    const m = decoder.decode(container).match(/full-path="([^"]+)"/);
    if (m && entries[m[1]]) {
      return decoder.decode(entries[m[1]]);
    }
  }
  // フォールバック: META-INF以外で最初の.xml/.musicxml
  const key = Object.keys(entries).find((k) => /\.(musicxml|xml)$/i.test(k) && !k.startsWith("META-INF"));
  return key ? decoder.decode(entries[key]) : null;
}

// ===== MusicXMLパース =====

function text(el, tag) {
  const n = el.getElementsByTagName(tag)[0];
  return n ? n.textContent.trim() : null;
}

function pitchToMidi(pitchEl) {
  const step = text(pitchEl, "step");
  const octave = parseInt(text(pitchEl, "octave"), 10);
  const alterEl = pitchEl.getElementsByTagName("alter")[0];
  const alter = alterEl ? parseInt(alterEl.textContent, 10) : 0;
  if (!(step in XML_STEP_SEMITONE) || Number.isNaN(octave)) {
    return null;
  }
  return (octave + 1) * 12 + XML_STEP_SEMITONE[step] + alter;
}

function harmonyToChord(harmonyEl) {
  const rootStep = text(harmonyEl, "root-step");
  if (!rootStep) {
    return null;
  }
  const rootAlterEl = harmonyEl.getElementsByTagName("root-alter")[0];
  const alter = rootAlterEl ? parseInt(rootAlterEl.textContent, 10) : 0;
  const accidental = alter > 0 ? "#" : alter < 0 ? "b" : "";
  const kindEl = harmonyEl.getElementsByTagName("kind")[0];
  const kindText = kindEl ? (kindEl.getAttribute("text") || kindEl.textContent.trim()) : "major";
  const suffix = XML_KIND_SUFFIX[kindText] ?? (kindText && kindText.length <= 4 ? kindText : "");
  let chord = rootStep + accidental + suffix;
  // bass（分数コード）
  const bassStep = text(harmonyEl, "bass-step");
  if (bassStep) {
    const bassAlterEl = harmonyEl.getElementsByTagName("bass-alter")[0];
    const ba = bassAlterEl ? parseInt(bassAlterEl.textContent, 10) : 0;
    chord += "/" + bassStep + (ba > 0 ? "#" : ba < 0 ? "b" : "");
  }
  return chord;
}

// パートを1つ選んで、音符・歌詞・コードを拍位置つきで読む
function parseMusicXmlDoc(doc) {
  const parts = doc.getElementsByTagName("part");
  if (!parts.length) {
    return null;
  }
  const part = parts[0];
  const measures = part.getElementsByTagName("measure");

  let divisions = 1; // 4分音符あたりの分割数
  let beatsPerBar = 4;
  let bpm = 100;
  let gotTempo = false;

  const melody = [];
  const chordEvents = []; // {startBeat, chord}
  const lyricFrags = []; // {startBeat, text, syllabic}
  let cursorBeat = 0; // 4分音符=1拍の通し拍

  const title = text(doc.documentElement, "movement-title")
    || (doc.getElementsByTagName("work-title")[0]?.textContent?.trim())
    || "";

  for (const measure of measures) {
    // attributes（divisions/time）
    const attrs = measure.getElementsByTagName("attributes");
    for (const a of attrs) {
      const div = text(a, "divisions");
      if (div) divisions = parseInt(div, 10) || divisions;
      const beats = text(a, "beats");
      if (beats) beatsPerBar = parseInt(beats, 10) || beatsPerBar;
    }
    // tempo（sound/metronome）
    if (!gotTempo) {
      const sounds = measure.getElementsByTagName("sound");
      for (const s of sounds) {
        if (s.getAttribute("tempo")) { bpm = Math.round(parseFloat(s.getAttribute("tempo"))); gotTempo = true; }
      }
    }

    // measure内の子要素を順に処理（note / backup / forward / harmony）
    for (const node of Array.from(measure.children)) {
      const tag = node.tagName;
      if (tag === "harmony") {
        const chord = harmonyToChord(node);
        if (chord) {
          chordEvents.push({ startBeat: cursorBeat, chord });
        }
      } else if (tag === "backup") {
        const d = parseInt(text(node, "duration"), 10) || 0;
        cursorBeat -= d / divisions;
      } else if (tag === "forward") {
        const d = parseInt(text(node, "duration"), 10) || 0;
        cursorBeat += d / divisions;
      } else if (tag === "note") {
        const isChordMember = node.getElementsByTagName("chord").length > 0;
        const durEl = node.getElementsByTagName("duration")[0];
        const dur = durEl ? parseInt(durEl.textContent, 10) || 0 : 0;
        const beats = dur / divisions;
        const isRest = node.getElementsByTagName("rest").length > 0;
        const noteStart = isChordMember ? cursorBeat - beats : cursorBeat; // chordは直前と同時
        if (!isRest) {
          const pitchEl = node.getElementsByTagName("pitch")[0];
          const midi = pitchEl ? pitchToMidi(pitchEl) : null;
          // 歌詞はメロディ（chordメンバー以外）から拾う
          if (!isChordMember && midi != null) {
            const lyricEl = node.getElementsByTagName("lyric")[0];
            if (lyricEl) {
              const t = text(lyricEl, "text");
              const syl = text(lyricEl, "syllabic") || "single";
              if (t) lyricFrags.push({ startBeat: noteStart, text: t, syllabic: syl });
            }
            melody.push({ startBeat: round4(noteStart), beats: round4(beats), midi });
          }
        }
        if (!isChordMember) {
          cursorBeat += beats;
        }
      }
    }
  }

  // 歌詞フラグメントを単語へ（syllabic begin..middle..end をつなぐ）
  const words = [];
  let buf = null;
  for (const frag of lyricFrags) {
    if (frag.syllabic === "single") {
      if (buf) { words.push(buf); buf = null; }
      words.push({ startBeat: frag.startBeat, text: frag.text });
    } else if (frag.syllabic === "begin") {
      if (buf) words.push(buf);
      buf = { startBeat: frag.startBeat, text: frag.text };
    } else { // middle / end
      if (buf) {
        buf.text += frag.text;
        if (frag.syllabic === "end") { words.push(buf); buf = null; }
      } else {
        words.push({ startBeat: frag.startBeat, text: frag.text });
      }
    }
  }
  if (buf) words.push(buf);

  return {
    title,
    bpm: Math.max(40, Math.min(240, bpm)),
    beatsPerBar,
    melody: melody.filter((n) => n.startBeat >= 0),
    chordEvents,
    words
  };
}

function round4(x) {
  return Math.round(x * 16) / 16;
}

function parseMusicXmlString(xml) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    throw new Error("MusicXMLを読めなかった");
  }
  return parseMusicXmlDoc(doc);
}

async function loadMusicXmlFile(file) {
  const isMxl = /\.mxl$/i.test(file.name) || file.type === "application/vnd.recordare.musicxml";
  let xml;
  if (isMxl) {
    xml = await extractMxlXml(await file.arrayBuffer());
  } else {
    xml = await file.text();
  }
  if (!xml) {
    throw new Error("楽譜データが見つからなかった");
  }
  return parseMusicXmlString(xml);
}

// ===== PDF譜面テキストの解析（コード記号・歌詞・テンポ） =====

// 連結されたコード記号列（例 "DM7Dm7Cm7Fm7"）を1つずつに割る貪欲トークナイザ
function tokenizeChordRun(run) {
  const re = /^([A-G][#b♯♭]?)((?:M7|maj7|m7-5|m7b5|m75|mM7|dim7|dim|aug|sus4|sus2|add9|m7|m6|m9|mb5|6|7sus4|7|9|11|13|m|\+|°)?)(\/[A-G][#b♯♭]?)?/;
  const chords = [];
  let s = run.replace(/[♯]/g, "#").replace(/[♭]/g, "b");
  let guard = 0;
  while (s.length && guard < 200) {
    guard += 1;
    const m = s.match(re);
    if (!m || !m[0]) {
      s = s.slice(1);
      continue;
    }
    let quality = m[2] || "";
    quality = quality.replace(/^M7$/, "maj7").replace(/^m75$/, "m7-5").replace(/^mb5$/, "dim").replace(/^°$/, "dim");
    chords.push(m[1] + quality + (m[3] || ""));
    s = s.slice(m[0].length);
  }
  return chords;
}

// コード記号だけの行か？（行のほとんどがコードトークンで占められている）
function looksLikeChordRun(line) {
  const t = line.replace(/\s+/g, "");
  if (t.length < 2) {
    return false;
  }
  if (!/^[A-G]/.test(t)) {
    return false;
  }
  // 英数と記号だけで構成（日本語が混じらない）
  return /^[A-G#b♯♭M7majdimsugn\d\/\-+°.]+$/i.test(t);
}

// PDFから抽出したテキスト全体を、コード・歌詞・テンポ・タイトルに分解
function parseScoreText(rawText) {
  const lines = String(rawText || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const chords = [];
  const lyricLines = [];
  let bpm = null;
  let title = "";
  const sectionRe = /^[A-Z]$/; // 単独の大文字＝セクション記号
  // タイトル・サブタイトル・作曲者は譜面の最上部（最初の音楽要素より前）にある。
  // 最初の音楽要素（テンポ/コード行/小節番号）が出るまでの日本語はタイトル群として歌詞から除外。
  let seenMusic = false;
  lines.forEach((line, i) => {
    // テンポは「♩= 120」「= 120」のように＝を伴う最初の数字だけ採用（小節番号や単独数字は拾わない）
    const tempoMatch = line.match(/[=＝]\s*(\d{2,3})\b/);
    if (bpm === null && tempoMatch && Number(tempoMatch[1]) >= 40 && Number(tempoMatch[1]) <= 240) {
      bpm = Number(tempoMatch[1]);
      seenMusic = true;
      return;
    }
    if (/^\d{1,3}$/.test(line)) {
      seenMusic = true;
      return; // 小節番号・ページ番号は捨てる
    }
    if (sectionRe.test(line) || /^(Swing|Slow|Fast|Ballad|Bossa)$/i.test(line)) {
      return; // セクション/スタイル表記は捨てる
    }
    if (looksLikeChordRun(line)) {
      seenMusic = true;
      tokenizeChordRun(line).forEach((c) => chords.push(c));
      return;
    }
    // 最初の音楽要素より前の日本語＝タイトル/サブタイトル（最初の1つだけタイトルに記録）
    if (!seenMusic && /[ぁ-んァ-ヶ一-龠]/.test(line)) {
      if (!title) title = line;
      return;
    }
    // 音楽が始まって以降の日本語を含む行＝歌詞とみなす
    if (/[ぁ-んァ-ヶ一-龠ー]/.test(line) && line.length >= 2) {
      lyricLines.push(line);
    }
  });
  return { chords, lyricLines, bpm, title };
}

// ===== PDF歌詞抽出（pdf.js） =====

let pdfjsLib = null;
async function loadPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import(PDFJS_CDN);
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  }
  return pdfjsLib;
}

async function extractPdfLyrics(file, onProgress) {
  const lib = await loadPdfjs();
  const data = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p += 1) {
    if (onProgress) onProgress(p / pdf.numPages);
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // y座標でグルーピングして行に
    const rows = new Map();
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push({ x: item.transform[4], s: item.str });
    }
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, items]) => {
        const line = items.sort((a, b) => a.x - b.x).map((i) => i.s).join("").trim();
        if (line) lines.push(line);
      });
  }
  return lines.join("\n");
}

// ===== 漢字・カタカナ → ひらがな 一括変換（kuromoji） =====
// 形態素解析で読み仮名を得る。辞書はCDNからダウンロード（ブラウザにキャッシュ）。
// 読み込めない環境では、カタカナ→ひらがなの簡易変換だけ行う。

const KUROMOJI_CDN = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js";
const KUROMOJI_DICT = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/";
let kuromojiTokenizer = null;

function katakanaToHiragana(text) {
  return String(text || "").replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

async function loadKuromojiScript() {
  if (window.kuromoji) {
    return window.kuromoji;
  }
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = KUROMOJI_CDN;
    s.onload = resolve;
    s.onerror = () => reject(new Error("kuromoji load failed"));
    document.head.appendChild(s);
  });
  return window.kuromoji;
}

async function ensureKuromoji() {
  if (kuromojiTokenizer) {
    return kuromojiTokenizer;
  }
  const kuromoji = await loadKuromojiScript();
  kuromojiTokenizer = await new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: KUROMOJI_DICT }).build((err, tokenizer) => {
      if (err) {
        reject(err);
      } else {
        resolve(tokenizer);
      }
    });
  });
  return kuromojiTokenizer;
}

// テキストをひらがな読みに変換。漢字は形態素解析の読み、カタカナはひらがな化。
// kuromojiが使えなければカタカナ→ひらがなだけ適用して、漢字はそのまま残す。
async function toHiragana(text) {
  if (!/[一-龠々〆ヶ]/.test(text)) {
    return katakanaToHiragana(text);
  }
  try {
    const tokenizer = await ensureKuromoji();
    const tokens = tokenizer.tokenize(text);
    return tokens.map((t) => {
      const reading = t.reading && t.reading !== "*" ? t.reading : t.surface_form;
      return katakanaToHiragana(reading);
    }).join("");
  } catch (error) {
    return katakanaToHiragana(text);
  }
}
