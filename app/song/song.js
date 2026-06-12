// Codori うた練習モード（β）
// 歌詞＋コードのテキストから演奏イベントを生成し、
// 右から左に流れるレーンに合わせて自動伴奏で練習する。

const STORAGE_KEY = "codori.songPractice.v1";
const CHARACTER_BASE = "../../assets/app/characters/action-candidate-integrated-v3/";
const FAMILY_ASSETS = {
  Major: "action-major.png",
  minor: "action-minor.png",
  "7": "action-7.png",
  add9: "action-add9.png",
  m7: "action-m7.png",
  maj7: "action-maj7.png",
  mM7: "action-mm7.png",
  sus4: "action-sus4.png",
  "m7-5": "action-m7-5.png",
  dim: "action-dim.png",
  aug: "action-aug.png"
};

const FINGERING_BASE = "../../assets/app/fingering/all-main-chords/";
const SHARP_TO_FLAT = { "A#": "Bb", "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab" };
// 運指SVGはコード11種類ぶんなので、細かいコードは近いファミリーの図で代用する
const FAMILY_FINGERING_SUFFIX = {
  Major: "",
  minor: "m",
  "7": "7",
  m7: "m7",
  maj7: "maj7",
  mM7: "mM7",
  sus4: "sus4",
  add9: "add9",
  dim: "dim",
  aug: "aug",
  "m7-5": "m7_5"
};

const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_TO_SHARP = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
const ROOT_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUALITY_INTERVALS = {
  "": [0, 4, 7],
  maj7: [0, 4, 7, 11],
  M7: [0, 4, 7, 11],
  maj9: [0, 4, 7, 11, 14],
  "6": [0, 4, 7, 9],
  "7": [0, 4, 7, 10],
  "9": [0, 4, 7, 10, 14],
  add9: [0, 4, 7, 14],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  "7sus4": [0, 5, 7, 10],
  sus47: [0, 5, 7, 10],
  m: [0, 3, 7],
  m6: [0, 3, 7, 9],
  m7: [0, 3, 7, 10],
  m9: [0, 3, 7, 10, 14],
  mM7: [0, 3, 7, 11],
  mmaj7: [0, 3, 7, 11],
  "m7-5": [0, 3, 6, 10],
  m7b5: [0, 3, 6, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  aug7: [0, 4, 8, 10],
  "7-5": [0, 4, 6, 10]
};

// 伴奏のリズムパターン（小節内のステップごとのアクセント）
// 解析で取り込んだリズムも、ここのプリセットでいつでも置き換えられる
const RHYTHM_PATTERNS = {
  whole: { label: "コードのあたまだけ", unit: null },
  four: { label: "4つ打ち", unit: 1, accents: [1, 0.7, 0.85, 0.7] },
  eight: { label: "8ビート", unit: 0.5, accents: [1, 0, 0.7, 0.55, 0.9, 0.55, 0.7, 0.55] },
  sixteen: { label: "16ビート", unit: 0.25, accents: [1, 0, 0.5, 0.4, 0.8, 0.4, 0.5, 0, 0.9, 0, 0.5, 0.4, 0.8, 0.4, 0.6, 0.4] },
  arpeggio: { label: "アルペジオ", unit: 0.5, accents: [1, 0.7, 0.7, 0.7, 0.85, 0.7, 0.7, 0.7], arp: true },
  none: { label: "伴奏なし（元音源だけ）", unit: null, silent: true }
};

// 全11種類のコードファミリーが出てくる、オリジナルのジャズ風デモ曲
const DEMO_SOURCE = `[イントロ]
[Cmaj7]　[Bm7-5]　[E7]　[Am7]　[Dm7]　[Gsus4]　[G7]　[Cadd9]

[Aメロ]
[C]ほしが またたく[C#dim]よるは　[Dm7]スウィングしたく[G7]なる
[C]つきも くちぶえ[Caug]ふいて　[F]ふわり [G7]おどり[Cmaj7]だす

[Bメロ]
[Am]よるの[AmM7]とびらを　[Am7]そっと ひらい[D7]たら
[Bm7-5]ことりが [E7]うたう　[Fm]ひみつの[G7]メロディ

[サビ]
[Cmaj7]ゆれて [A7]はねて　[Dm7]リズムに[G7]のって
[Em7]こころ [A7]かるく　[Dm7]あさまで[Gsus4]とぼ[G7]う　[Cadd9]

[アウトロ]
[Dm7]　[G7]　[Cmaj7]　[Caug]　[F]　[Bm7-5]　[E7]　[Cadd9]`;

// ===== 状態 =====

let song = null;
let library = loadLibrary();
let pxPerBeat = 110;
// 実際のレイアウトに使う値。コードの中身（鳥＋運指）が必ず収まるよう自動で底上げされる
let lanePxPerBeat = 110;
let judgeXPx = 150;
const JUDGE_RATIO = 0.3; // 判定線はレーン幅の30%（端すぎると見にくい）
const MIN_CHORD_NOTE_PX = 210;
const MIN_CHORD_NOTE_PX_FULLSCREEN = 400;
let laneDirty = true;
let audioCtx = null;
let playbackHits = [];
let importedAudio = null; // 取り込みモードの音源 { buffer, offsetSec, name }（セッション中のみ）

const player = {
  playing: false,
  anchorTime: 0,
  anchorBeat: 0,
  runStartBeat: 0,
  startBeat: 0,
  pausedBeat: null,
  nextTick: 0,
  nextHitIdx: 0,
  nextMelodyIdx: 0,
  schedTimer: null,
  rafId: null,
  audioSource: null,
  activeNoteIdx: -1,
  upcomingKey: -1,
  upcomingNoteEl: null
};

// computePositions() の結果
let positioned = { notes: [], sections: [], chordEvents: [], totalBeats: 0 };

const el = {
  tabEdit: document.querySelector("#tab-edit"),
  tabPlay: document.querySelector("#tab-play"),
  editView: document.querySelector("#edit-view"),
  playView: document.querySelector("#play-view"),
  songSelect: document.querySelector("#song-select"),
  newSong: document.querySelector("#new-song"),
  saveSong: document.querySelector("#save-song"),
  deleteSong: document.querySelector("#delete-song"),
  exportSong: document.querySelector("#export-song"),
  importSongButton: document.querySelector("#import-song-button"),
  importSong: document.querySelector("#import-song"),
  titleInput: document.querySelector("#title-input"),
  artistInput: document.querySelector("#artist-input"),
  bpmInput: document.querySelector("#bpm-input"),
  beatsPerBar: document.querySelector("#beats-per-bar"),
  defaultBeats: document.querySelector("#default-beats"),
  sourceInput: document.querySelector("#source-input"),
  buildEvents: document.querySelector("#build-events"),
  timeline: document.querySelector("#timeline"),
  timelineSummary: document.querySelector("#timeline-summary"),
  playButton: document.querySelector("#play-button"),
  stopButton: document.querySelector("#stop-button"),
  playPosition: document.querySelector("#play-position"),
  playBpm: document.querySelector("#play-bpm"),
  transposeDown: document.querySelector("#transpose-down"),
  transposeUp: document.querySelector("#transpose-up"),
  transposeLabel: document.querySelector("#transpose-label"),
  noteSpeed: document.querySelector("#note-speed"),
  metronomeToggle: document.querySelector("#metronome-toggle"),
  countinToggle: document.querySelector("#countin-toggle"),
  loopToggle: document.querySelector("#loop-toggle"),
  rhythmPattern: document.querySelector("#rhythm-pattern"),
  melodyGuideToggle: document.querySelector("#melody-guide-toggle"),
  originalToggle: document.querySelector("#original-toggle"),
  fullscreenToggle: document.querySelector("#fullscreen-toggle"),
  fsPause: document.querySelector("#fs-pause"),
  fsExit: document.querySelector("#fs-exit"),
  tabImport: document.querySelector("#tab-import"),
  importView: document.querySelector("#import-view"),
  laneWrap: document.querySelector("#lane-wrap"),
  lane: document.querySelector("#lane"),
  laneTrack: document.querySelector("#lane-track"),
  countOverlay: document.querySelector("#count-overlay"),
  stageBird: document.querySelector("#stage-bird"),
  stageBirdImg: document.querySelector("#stage-bird-img"),
  stageChord: document.querySelector("#stage-chord"),
  stageFingering: document.querySelector(".stage-fingering"),
  stageFingeringImg: document.querySelector("#stage-fingering-img"),
  stageNext: document.querySelector("#stage-next"),
  nextChordName: document.querySelector("#next-chord-name"),
  nextFingeringImg: document.querySelector("#next-fingering-img"),
  currentLine: document.querySelector("#current-line")
};

// ===== コード理論まわり =====

function transposeChord(chord, shift) {
  if (!chord || !shift) {
    return chord;
  }
  return chord
    .split("/")
    .map((part) => part.replace(/^([A-G])(#|b)?/, (_, letter, accidental) => {
      const root = accidental ? letter + accidental : letter;
      const normalized = FLAT_TO_SHARP[root] || root;
      const index = SHARP_NOTES.indexOf(normalized);
      if (index < 0) {
        return root;
      }
      return SHARP_NOTES[(index + shift + 120) % 12];
    }))
    .join("/");
}

function intervalsForSuffix(suffix) {
  if (suffix in QUALITY_INTERVALS) {
    return QUALITY_INTERVALS[suffix];
  }
  // 未知のサフィックスはざっくり推定する
  const isMinor = /^m(?!aj)/.test(suffix);
  const intervals = isMinor ? [0, 3, 7] : [0, 4, 7];
  if (/7/.test(suffix)) {
    intervals.push(/maj7|M7/.test(suffix) ? 11 : 10);
  }
  return intervals;
}

function parseChordName(chord) {
  const main = String(chord || "").split("/")[0].trim();
  const match = main.match(/^([A-G])(#|b)?(.*)$/);
  if (!match) {
    return null;
  }
  let semitone = ROOT_SEMITONES[match[1]];
  if (match[2] === "#") {
    semitone += 1;
  } else if (match[2] === "b") {
    semitone -= 1;
  }
  return { semitone: (semitone + 12) % 12, suffix: match[3] || "" };
}

function chordFamily(chord) {
  const parsed = parseChordName(chord);
  if (!parsed) {
    return "Major";
  }
  const suffix = parsed.suffix;
  if (suffix === "") return "Major";
  if (/^(mM7|mmaj7)/.test(suffix)) return "mM7";
  if (/^(maj7|maj9|M7)/.test(suffix)) return "maj7";
  if (/^dim/.test(suffix)) return "dim";
  if (/^(aug|\+)/.test(suffix)) return "aug";
  if (/^(sus|7sus)/.test(suffix)) return "sus4";
  if (/^add9/.test(suffix)) return "add9";
  if (/^(m7-5|m7b5)/.test(suffix)) return "m7-5";
  if (/^m7/.test(suffix) || /^m9/.test(suffix)) return "m7";
  if (/^m(?!aj)/.test(suffix)) return "minor";
  if (/7|9|6/.test(suffix)) return "7";
  return "Major";
}

function characterAssetForChord(chord) {
  const family = chordFamily(chord);
  return CHARACTER_BASE + (FAMILY_ASSETS[family] || FAMILY_ASSETS.Major);
}

function fingeringAssetForChord(chord) {
  const main = String(chord || "").split("/")[0].trim();
  const match = main.match(/^([A-G])(#|b)?/);
  if (!match) {
    return null;
  }
  let root = match[1] + (match[2] || "");
  root = SHARP_TO_FLAT[root] || root;
  const suffix = FAMILY_FINGERING_SUFFIX[chordFamily(chord)] ?? "";
  return `${FINGERING_BASE}ukulele_${root}${suffix}_vertical_strings.svg`;
}

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function chordFrequencies(chord) {
  const parsed = parseChordName(chord);
  if (!parsed) {
    return null;
  }
  let base = 60 + parsed.semitone;
  if (base > 67) {
    base -= 12; // ウクレレっぽい音域に収める
  }
  const midis = intervalsForSuffix(parsed.suffix).map((interval) => base + interval);
  if (midis.length <= 3) {
    midis.push(base + 12);
  }
  return midis.map(midiToFrequency);
}

// ===== テキスト → イベント生成 =====

function isSectionLine(line) {
  const match = line.trim().match(/^\[([^\]]+)\]$/);
  if (!match) {
    return false;
  }
  // [C7] や [Am7/G] のような単独コードはセクション名ではなくコード行として扱う
  return !/^[A-G](#|b)?[A-Za-z0-9+\-]*(\/[A-G](#|b)?)?$/.test(match[1].trim());
}

function parseTimedLine(line) {
  const segments = [];
  const re = /\[([A-G][^\]]*)\]/g;
  let last = 0;
  let pendingChord = null;
  let match;
  while ((match = re.exec(line)) !== null) {
    const textPart = line.slice(last, match.index);
    if (pendingChord === null) {
      if (textPart.trim()) {
        segments.push({ chord: null, lyric: textPart });
      }
    } else {
      segments.push({ chord: pendingChord, lyric: textPart });
    }
    pendingChord = match[1];
    last = re.lastIndex;
  }
  const tail = line.slice(last);
  if (pendingChord === null) {
    if (tail.trim()) {
      segments.push({ chord: null, lyric: tail });
    }
  } else {
    segments.push({ chord: pendingChord, lyric: tail });
  }
  return segments;
}

function buildEventsFromSource(text, defaultBeats) {
  const events = [];
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  lines.forEach((line, lineIndex) => {
    if (!line.trim()) {
      return;
    }
    if (isSectionLine(line)) {
      events.push({
        type: "section",
        label: line.trim().replace(/^\[|\]$/g, ""),
        beats: 0,
        lineIndex
      });
      return;
    }
    const segments = parseTimedLine(line);
    if (!segments.some((segment) => segment.chord)) {
      events.push({ type: "chord", chord: null, lyric: line.trim(), beats: defaultBeats, lineIndex });
      return;
    }
    segments.forEach((segment) => {
      events.push({
        type: "chord",
        chord: segment.chord,
        lyric: (segment.lyric || "").replace(/\s+$/, ""),
        beats: segment.chord ? defaultBeats : 1,
        lineIndex
      });
    });
  });
  return events;
}

function computePositions() {
  let beat = 0;
  const notes = [];
  const sections = [];
  (song.events || []).forEach((event, index) => {
    event.startBeat = beat;
    event.index = index;
    if (event.type === "section") {
      sections.push(event);
      return;
    }
    notes.push(event);
    beat += Number(event.beats) || 0;
  });
  positioned = {
    notes,
    sections,
    chordEvents: notes.filter((event) => event.chord),
    totalBeats: beat
  };
}

// ===== オーディオ =====

function ensureAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new Ctx();
  }
  if (audioCtx.state !== "running" && typeof audioCtx.resume === "function") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// 鳴っている最中のコード（コード切り替え時にカットするための追跡）
let ringingChords = [];

function cutRingingChords(time) {
  ringingChords.forEach((node) => {
    if (node.until <= time) {
      return;
    }
    const gainParam = node.gain.gain;
    try {
      gainParam.cancelAndHoldAtTime(time);
    } catch (error) {
      gainParam.cancelScheduledValues(time);
      gainParam.setValueAtTime(0.1, time);
    }
    gainParam.exponentialRampToValueAtTime(0.0001, time + 0.06);
  });
  ringingChords = [];
}

// 音あて（コードカード）と同じ音色（倍音0.2＋長い余韻）。
// プレイモードでは分散和音の間隔を30msに詰めて、リズムに食い込まないようにする。
// 余韻はコード切り替え時に cutRingingChords で全音同時にカットされる。
const STRUM_ARPEGGIO_INTERVAL = 0.03;
const STRUM_HARMONIC_RATIO = 0.2;

function strumChord(chord, time, beats, strumGain = 1) {
  const frequencies = chordFrequencies(chord);
  if (!frequencies) {
    return;
  }
  const ctx = audioCtx;
  const secPerBeatNow = 60 / song.bpm;
  const duration = Math.min(Math.max(beats * secPerBeatNow + 0.5, 0.8), 2.6);
  const masterHold = Math.min(1.15, duration * 0.45);
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, time);
  master.gain.exponentialRampToValueAtTime(0.16 * strumGain, time + 0.04);
  master.gain.setValueAtTime(0.16 * strumGain, time + masterHold);
  master.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  master.connect(ctx.destination);
  ringingChords.push({ gain: master, until: time + duration + 0.3 });

  frequencies.forEach((frequency, index) => {
    const start = time + index * STRUM_ARPEGGIO_INTERVAL;
    const end = Math.max(start + 0.2, time + duration);
    const hold = Math.min(start + 1.05, end - 0.1);
    const osc = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const gain = ctx.createGain();
    const harmonicGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    harmonic.type = "sine";
    harmonic.frequency.value = frequency * 2;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
    gain.gain.setValueAtTime(0.13, hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    harmonicGain.gain.setValueAtTime(0.0001, start);
    harmonicGain.gain.exponentialRampToValueAtTime(0.16 * STRUM_HARMONIC_RATIO, start + 0.025);
    harmonicGain.gain.setValueAtTime(0.13 * STRUM_HARMONIC_RATIO, hold);
    harmonicGain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    harmonic.connect(harmonicGain);
    gain.connect(master);
    harmonicGain.connect(master);
    osc.start(start);
    harmonic.start(start);
    osc.stop(end + 0.05);
    harmonic.stop(end + 0.05);
  });
}

function playTone(frequency, time, duration, gain, type = "sine", registerAsChord = false) {
  if (!frequency) {
    return;
  }
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  const dur = Math.max(0.12, duration);
  gainNode.gain.setValueAtTime(0.0001, time);
  gainNode.gain.exponentialRampToValueAtTime(gain, time + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + dur + 0.05);
  if (registerAsChord) {
    ringingChords.push({ gain: gainNode, until: time + dur + 0.1 });
  }
}

function metronomeClick(time, isBarHead) {
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = isBarHead ? 1700 : 1100;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(isBarHead ? 0.22 : 0.12, time + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.1);
}

// ===== 再生エンジン =====

function secPerBeat() {
  return 60 / Math.max(40, Math.min(240, Number(song.bpm) || 100));
}

function beatToTime(beat) {
  return player.anchorTime + (beat - player.anchorBeat) * secPerBeat();
}

function currentBeat() {
  return player.anchorBeat + (audioCtx.currentTime - player.anchorTime) / secPerBeat();
}

function startPlayback(fromBeat, withCountIn) {
  if (laneDirty) {
    renderLane();
  }
  if (!positioned.notes.length) {
    el.currentLine.textContent = "譜面がまだないよ。エディットで「譜面をつくる」を押してね。";
    return;
  }
  const ctx = ensureAudioContext();
  const countIn = withCountIn ? Number(song.beatsPerBar) : 0;
  player.runStartBeat = fromBeat;
  player.anchorBeat = fromBeat - countIn;
  player.anchorTime = ctx.currentTime + 0.12;
  player.nextTick = Math.ceil(player.anchorBeat - 0.001);
  playbackHits = buildPlaybackHits();
  player.nextHitIdx = findScheduleIndex(playbackHits, fromBeat, (hit) => hit.beat);
  player.nextMelodyIdx = findScheduleIndex(song.melody || [], fromBeat, (note) => note.startBeat);
  player.activeNoteIdx = -1;
  player.lastHitChord = null;
  startOriginalAudio();
  player.playing = true;
  player.schedTimer = window.setInterval(schedulerTick, 30);
  player.rafId = window.requestAnimationFrame(frame);
  el.playButton.textContent = "⏸ 一時停止";
  if (el.fsPause) {
    el.fsPause.textContent = "⏸ 一時停止";
  }
  el.laneWrap.style.setProperty("--beat-duration", `${secPerBeat()}s`);
  el.stageBird.classList.add("is-beating");
}

function schedulerTick() {
  if (!player.playing) {
    return;
  }
  const horizon = audioCtx.currentTime + 0.2;
  while (beatToTime(player.nextTick) < horizon) {
    const time = beatToTime(player.nextTick);
    const inCountIn = player.nextTick < player.runStartBeat;
    const isBarHead = ((player.nextTick % song.beatsPerBar) + song.beatsPerBar) % song.beatsPerBar === 0;
    if (time >= audioCtx.currentTime - 0.02
      && (el.metronomeToggle.checked || inCountIn)
      && player.nextTick <= positioned.totalBeats) {
      metronomeClick(time, isBarHead);
    }
    player.nextTick += 1;
  }
  while (player.nextHitIdx < playbackHits.length) {
    const hit = playbackHits[player.nextHitIdx];
    const time = beatToTime(hit.beat);
    if (time >= horizon) {
      break;
    }
    if (time >= audioCtx.currentTime - 0.05) {
      const chordName = transposeChord(hit.chord, song.transpose);
      const pattern = RHYTHM_PATTERNS[song.rhythmPattern] || RHYTHM_PATTERNS.whole;
      // コードが切り替わる瞬間は、前のコードの余韻をカットしてから次を鳴らす
      if (!pattern.unit || chordName !== player.lastHitChord) {
        cutRingingChords(Math.max(time - 0.001, audioCtx.currentTime));
      }
      player.lastHitChord = chordName;
      if (hit.arpIndex !== null && hit.arpIndex !== undefined) {
        const frequencies = chordFrequencies(chordName);
        if (frequencies) {
          playTone(frequencies[hit.arpIndex % frequencies.length], time, hit.beats * secPerBeat(), 0.14 * hit.gain, "sine", true);
        }
      } else {
        strumChord(chordName, time, hit.beats, hit.gain);
      }
    }
    player.nextHitIdx += 1;
  }
  if (el.melodyGuideToggle?.checked && Array.isArray(song.melody)) {
    while (player.nextMelodyIdx < song.melody.length) {
      const note = song.melody[player.nextMelodyIdx];
      const time = beatToTime(note.startBeat);
      if (time >= horizon) {
        break;
      }
      if (time >= audioCtx.currentTime - 0.05) {
        playTone(midiToFrequency(note.midi + (song.transpose || 0)), time, note.beats * secPerBeat() * 0.95, 0.12, "triangle");
      }
      player.nextMelodyIdx += 1;
    }
  }
}

function findScheduleIndex(items, fromBeat, beatOf) {
  const index = items.findIndex((item) => beatOf(item) >= fromBeat - 0.001);
  return index < 0 ? items.length : index;
}

// 伴奏パターンに沿って、コードイベントを実際のストラム時刻に展開する
function buildPlaybackHits() {
  const pattern = RHYTHM_PATTERNS[song.rhythmPattern] || RHYTHM_PATTERNS.whole;
  const hits = [];
  if (pattern.silent) {
    return hits;
  }
  const beatsPerBar = Number(song.beatsPerBar);
  positioned.chordEvents.forEach((event) => {
    if (!pattern.unit) {
      hits.push({ beat: event.startBeat, chord: event.chord, gain: 1, beats: event.beats, arpIndex: null });
      return;
    }
    const unit = pattern.unit;
    let arpIndex = 0;
    let beat = Math.ceil(event.startBeat / unit - 1e-6) * unit;
    for (; beat < event.startBeat + event.beats - 1e-6; beat += unit) {
      const stepInBar = Math.round((((beat % beatsPerBar) + beatsPerBar) % beatsPerBar) / unit);
      const accent = pattern.accents[stepInBar % pattern.accents.length];
      if (accent <= 0) {
        continue;
      }
      hits.push({
        beat,
        chord: event.chord,
        gain: accent,
        beats: unit * 1.8,
        arpIndex: pattern.arp ? arpIndex++ : null
      });
    }
  });
  return hits;
}

// 取り込んだ元音源を、拍グリッドに同期させて再生する
function startOriginalAudio() {
  if (!importedAudio || !el.originalToggle?.checked) {
    return;
  }
  const ctx = audioCtx;
  const source = ctx.createBufferSource();
  source.buffer = importedAudio.buffer;
  const gain = ctx.createGain();
  gain.gain.value = 0.9;
  source.connect(gain);
  gain.connect(ctx.destination);
  const posAtAnchor = importedAudio.offsetSec + player.anchorBeat * secPerBeat();
  if (posAtAnchor >= 0) {
    source.start(player.anchorTime, posAtAnchor);
  } else {
    source.start(player.anchorTime - posAtAnchor, 0);
  }
  player.audioSource = source;
}

function pausePlayback() {
  player.pausedBeat = Math.max(currentBeat(), player.startBeat);
  haltPlayback();
}

function stopPlayback() {
  player.pausedBeat = null;
  haltPlayback();
  exitPlayFullscreen();
  setTrackTransform(player.startBeat);
  clearActiveNote();
  updatePositionLabel(player.startBeat);
  updateStageForBeat(player.startBeat);
}

function haltPlayback() {
  player.playing = false;
  if (audioCtx) {
    cutRingingChords(audioCtx.currentTime);
  }
  if (player.audioSource) {
    try {
      player.audioSource.stop();
    } catch (error) {
      // 既に停止済みなら何もしない
    }
    player.audioSource = null;
  }
  if (player.schedTimer) {
    window.clearInterval(player.schedTimer);
    player.schedTimer = null;
  }
  if (player.rafId) {
    window.cancelAnimationFrame(player.rafId);
    player.rafId = null;
  }
  el.playButton.textContent = "▶ 再生";
  if (el.fsPause) {
    el.fsPause.textContent = "▶ 再生";
  }
  el.stageBird.classList.remove("is-beating");
  el.countOverlay.classList.add("is-hidden");
  clearAnticipation();
}

function togglePlayback() {
  if (player.playing) {
    pausePlayback();
    return;
  }
  enterPlayFullscreen();
  if (player.pausedBeat !== null) {
    startPlayback(player.pausedBeat, false);
    return;
  }
  startPlayback(player.startBeat, el.countinToggle.checked);
}

// ===== フルスクリーン再生 =====
// requestFullscreen非対応（iPhone Safari等）は、固定配置の疑似フルスクリーンにフォールバックする

function enterPlayFullscreen() {
  if (!el.fullscreenToggle?.checked || el.laneWrap.classList.contains("is-fullscreen")) {
    return;
  }
  if (el.laneWrap.requestFullscreen) {
    el.laneWrap.requestFullscreen().catch(() => activatePseudoFullscreen());
  } else {
    activatePseudoFullscreen();
  }
}

function activatePseudoFullscreen() {
  el.laneWrap.classList.add("is-fullscreen", "is-pseudo-fullscreen");
}

function exitPlayFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  el.laneWrap.classList.remove("is-fullscreen", "is-pseudo-fullscreen");
}

document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement === el.laneWrap) {
    el.laneWrap.classList.add("is-fullscreen");
  } else if (!el.laneWrap.classList.contains("is-pseudo-fullscreen")) {
    el.laneWrap.classList.remove("is-fullscreen");
  }
  renderLane();
});

window.addEventListener("resize", () => {
  if (el.playView.classList.contains("is-active")) {
    renderLane();
  }
});

function frame() {
  if (!player.playing) {
    return;
  }
  const beat = currentBeat();
  setTrackTransform(beat);
  updatePositionLabel(beat);

  if (beat < player.runStartBeat) {
    el.countOverlay.textContent = String(Math.ceil(player.runStartBeat - beat));
    el.countOverlay.classList.remove("is-hidden");
  } else {
    el.countOverlay.classList.add("is-hidden");
  }

  updateActiveNote(beat);
  updateAnticipation(beat);

  if (beat > positioned.totalBeats + Number(song.beatsPerBar)) {
    if (el.loopToggle.checked) {
      haltPlayback();
      startPlayback(player.startBeat, el.countinToggle.checked);
      return;
    }
    stopPlayback();
    return;
  }
  player.rafId = window.requestAnimationFrame(frame);
}

function setTrackTransform(beat) {
  el.laneTrack.style.transform = `translateX(${-beat * lanePxPerBeat}px)`;
}

function updatePositionLabel(beat) {
  const bar = Math.max(1, Math.floor(Math.max(beat, 0) / Number(song.beatsPerBar)) + 1);
  el.playPosition.textContent = `小節 ${bar}`;
}

function findActiveNoteIndex(beat) {
  for (let index = 0; index < positioned.notes.length; index += 1) {
    const note = positioned.notes[index];
    if (beat < note.startBeat) {
      return -1;
    }
    if (beat < note.startBeat + (Number(note.beats) || 0)) {
      return index;
    }
  }
  return -1;
}

function updateActiveNote(beat) {
  const index = findActiveNoteIndex(beat);
  if (index === player.activeNoteIdx) {
    return;
  }
  clearActiveNote();
  player.activeNoteIdx = index;
  if (index < 0) {
    return;
  }
  const note = positioned.notes[index];
  const noteEl = el.laneTrack.querySelector(`.note[data-index="${note.index}"]`);
  if (noteEl) {
    noteEl.classList.add("is-active");
  }
  if (note.chord) {
    const shown = transposeChord(note.chord, song.transpose);
    el.stageChord.textContent = shown;
    el.stageBirdImg.src = characterAssetForChord(note.chord);
    setFingeringImage(el.stageFingeringImg, shown);
    el.stageBird.classList.remove("is-pop");
    void el.stageBird.offsetWidth;
    el.stageBird.classList.add("is-pop");
    if (el.stageFingering) {
      el.stageFingering.classList.remove("is-pop");
      void el.stageFingering.offsetWidth;
      el.stageFingering.classList.add("is-pop");
    }
  }
  updateNextChordDisplay(index);
  renderCurrentLine(note);
}

function setFingeringImage(image, chordName) {
  if (!image) {
    return;
  }
  const asset = chordName ? fingeringAssetForChord(chordName) : null;
  if (!asset) {
    image.style.visibility = "hidden";
    return;
  }
  image.style.visibility = "visible";
  image.src = asset;
}

// 「つぎ」のコード表示（現在コードのすぐ隣）
function updateNextChordDisplay(fromNoteIndex) {
  if (!el.stageNext) {
    return;
  }
  let next = null;
  for (let index = fromNoteIndex + 1; index < positioned.notes.length; index += 1) {
    if (positioned.notes[index].chord) {
      next = positioned.notes[index];
      break;
    }
  }
  el.stageNext.classList.toggle("is-hidden", !next);
  if (next) {
    const shown = transposeChord(next.chord, song.transpose);
    el.nextChordName.textContent = shown;
    setFingeringImage(el.nextFingeringImg, shown);
  }
}

// 次のコードノートを残り1拍から光らせて、切り替えを予感させる
function updateAnticipation(beat) {
  let next = null;
  for (let i = 0; i < positioned.notes.length; i += 1) {
    const note = positioned.notes[i];
    if (note.chord && note.startBeat > beat + 1e-6) {
      next = note;
      break;
    }
  }
  if (!next) {
    clearAnticipation();
    return;
  }
  const imminent = next.startBeat - beat <= 1;
  el.stageNext?.classList.toggle("is-imminent", imminent);
  const upcomingKey = imminent ? next.index : -1;
  if (player.upcomingKey !== upcomingKey) {
    player.upcomingKey = upcomingKey;
    if (player.upcomingNoteEl) {
      player.upcomingNoteEl.classList.remove("is-upcoming");
      player.upcomingNoteEl = null;
    }
    if (upcomingKey >= 0) {
      player.upcomingNoteEl = el.laneTrack.querySelector(`.note[data-index="${upcomingKey}"]`);
      player.upcomingNoteEl?.classList.add("is-upcoming");
    }
  }
}

function clearAnticipation() {
  el.stageNext?.classList.remove("is-imminent");
  if (player.upcomingNoteEl) {
    player.upcomingNoteEl.classList.remove("is-upcoming");
  }
  player.upcomingNoteEl = null;
  player.upcomingKey = -1;
}

// 停止中・開始位置変更時にも、その位置のコードでステージ表示を合わせる
function updateStageForBeat(beat) {
  let index = -1;
  for (let i = 0; i < positioned.notes.length; i += 1) {
    const note = positioned.notes[i];
    if (note.chord && note.startBeat + (Number(note.beats) || 0) > beat + 1e-6) {
      index = i;
      break;
    }
  }
  if (index < 0) {
    el.stageChord.textContent = "-";
    setFingeringImage(el.stageFingeringImg, null);
    updateNextChordDisplay(positioned.notes.length);
    return;
  }
  const note = positioned.notes[index];
  const shown = transposeChord(note.chord, song.transpose);
  el.stageChord.textContent = shown;
  el.stageBirdImg.src = characterAssetForChord(note.chord);
  setFingeringImage(el.stageFingeringImg, shown);
  updateNextChordDisplay(index);
}

function clearActiveNote() {
  el.laneTrack.querySelectorAll(".note.is-active").forEach((noteEl) => noteEl.classList.remove("is-active"));
  player.activeNoteIdx = -1;
}

function renderCurrentLine(activeNote) {
  const lineNotes = positioned.notes.filter((note) => note.lineIndex === activeNote.lineIndex);
  el.currentLine.innerHTML = lineNotes
    .map((note) => {
      const text = escapeHtml(note.lyric || (note.chord ? "♪" : ""));
      return note === activeNote ? `<mark>${text}</mark>` : text;
    })
    .join("");
}

// ===== レーン描画 =====

function refreshLaneMetrics() {
  // 判定線：レーン幅の30%（非表示中は画面幅から推定）
  const laneWidth = el.lane.clientWidth || window.innerWidth - 60;
  judgeXPx = Math.max(120, Math.round(laneWidth * JUDGE_RATIO));
  el.laneWrap.style.setProperty("--judge-x", `${judgeXPx}px`);

  // 1拍あたりの幅：いちばん短いコードでも中身（鳥＋運指）が隠れない値まで底上げ
  const minNotePx = el.laneWrap.classList.contains("is-fullscreen")
    ? MIN_CHORD_NOTE_PX_FULLSCREEN
    : MIN_CHORD_NOTE_PX;
  const chordBeats = positioned.notes
    .filter((note) => note.chord)
    .map((note) => Math.max(0.25, Number(note.beats) || 0));
  const minBeats = chordBeats.length ? Math.min(...chordBeats) : 2;
  lanePxPerBeat = Math.max(pxPerBeat, Math.ceil(minNotePx / minBeats));
}

function renderLane() {
  computePositions();
  refreshLaneMetrics();
  const beatsPerBar = Number(song.beatsPerBar);
  const offset = judgeXPx;
  const totalBeats = positioned.totalBeats;
  const trackWidth = offset + (totalBeats + 8) * lanePxPerBeat;
  let html = "";

  for (let beat = 0; beat <= totalBeats + beatsPerBar; beat += 1) {
    const x = offset + beat * lanePxPerBeat;
    const isBarHead = beat % beatsPerBar === 0;
    html += `<div class="bar-line${isBarHead ? "" : " is-beat"}" style="left:${x}px"></div>`;
    if (isBarHead) {
      html += `<div class="bar-number" style="left:${x + 4}px">${beat / beatsPerBar + 1}</div>`;
    }
  }

  positioned.sections.forEach((section) => {
    const x = offset + section.startBeat * lanePxPerBeat;
    html += `<div class="note note--section" style="left:${x}px">${escapeHtml(section.label)}</div>`;
  });

  positioned.notes.forEach((note, order) => {
    const x = offset + note.startBeat * lanePxPerBeat;
    const width = Math.max((Number(note.beats) || 0) * lanePxPerBeat - 6, 34);
    const isStart = Math.abs(note.startBeat - player.startBeat) < 0.001;
    if (note.chord) {
      const shown = transposeChord(note.chord, song.transpose);
      const fingering = fingeringAssetForChord(shown);
      html += `<div class="note${isStart ? " is-start" : ""}" data-index="${note.index}" data-beat="${note.startBeat}" style="left:${x}px;width:${width}px">`
        + `<div class="note-top">`
        + `<div class="note-bird"><img src="${characterAssetForChord(note.chord)}" alt="" loading="lazy" style="animation-delay:-${(order % 6) * 0.4}s"></div>`
        + (fingering ? `<img class="note-fingering" src="${fingering}" alt="" loading="lazy">` : "")
        + `</div>`
        + `<div class="note-chord">${escapeHtml(shown)}</div>`
        + `<div class="note-lyric">${escapeHtml(note.lyric || "")}</div>`
        + `</div>`;
    } else {
      html += `<div class="note note--plain${isStart ? " is-start" : ""}" data-index="${note.index}" data-beat="${note.startBeat}" style="left:${x}px;width:${width}px">`
        + `<div class="note-bird"></div>`
        + `<div class="note-chord"></div>`
        + `<div class="note-lyric">${escapeHtml(note.lyric || "")}</div>`
        + `</div>`;
    }
  });

  // 取り込んだメロディは、レーン上部に小さな音程バーで表示する
  if (Array.isArray(song.melody) && song.melody.length) {
    const midis = song.melody.map((note) => note.midi);
    const minMidi = Math.min(...midis);
    const span = Math.max(1, Math.max(...midis) - minMidi);
    song.melody.forEach((note) => {
      const x = offset + note.startBeat * lanePxPerBeat;
      const width = Math.max(4, note.beats * lanePxPerBeat - 2);
      const y = 6 + (1 - (note.midi - minMidi) / span) * 26;
      html += `<div class="melody-dot" style="left:${x}px;top:${y}px;width:${width}px"></div>`;
    });
  }

  el.laneTrack.style.width = `${trackWidth}px`;
  el.laneTrack.innerHTML = html;
  player.upcomingNoteEl = null;
  player.upcomingKey = -1;
  player.activeNoteIdx = -1;
  if (!player.playing) {
    setTrackTransform(player.pausedBeat ?? player.startBeat);
  }
  laneDirty = false;
}

function setStartBeat(beat) {
  player.startBeat = beat;
  player.pausedBeat = null;
  el.laneTrack.querySelectorAll(".note.is-start").forEach((noteEl) => noteEl.classList.remove("is-start"));
  const target = el.laneTrack.querySelector(`.note[data-beat="${beat}"]`);
  if (target) {
    target.classList.add("is-start");
  }
  if (!player.playing) {
    setTrackTransform(beat);
    updatePositionLabel(beat);
    updateStageForBeat(beat);
  }
}

// ===== タイムライン編集 =====

function renderTimeline() {
  computePositions();
  const beatsPerBar = Number(song.beatsPerBar);
  el.timeline.innerHTML = "";
  if (!song.events.length) {
    el.timelineSummary.textContent = "まだ譜面がないよ。上のテキストから「譜面をつくる」を押してね。";
    return;
  }
  const bars = Math.ceil(positioned.totalBeats / beatsPerBar);
  el.timelineSummary.textContent = `${positioned.chordEvents.length}コード / 全${bars}小節（拍数は0.5きざみで手なおしできる）`;

  song.events.forEach((event, index) => {
    const row = document.createElement("div");
    if (event.type === "section") {
      row.className = "timeline-row is-section";
      row.innerHTML = `
        <span class="row-index">${index + 1}</span>
        <span class="row-bar">-</span>
        <input class="row-label" type="text" value="${escapeAttr(event.label)}" aria-label="セクション名">
        <span class="row-buttons">
          <button type="button" data-act="insert" title="下にノートを追加">＋</button>
          <button type="button" data-act="delete" title="削除">✕</button>
        </span>`;
      row.querySelector(".row-label").addEventListener("input", (ev) => {
        event.label = ev.target.value;
        laneDirty = true;
      });
    } else {
      row.className = "timeline-row";
      const bar = Math.floor(event.startBeat / beatsPerBar) + 1;
      const beatInBar = (event.startBeat % beatsPerBar) + 1;
      row.innerHTML = `
        <span class="row-index">${index + 1}</span>
        <span class="row-bar">${bar}-${formatBeat(beatInBar)}</span>
        <input class="row-chord" type="text" value="${escapeAttr(event.chord || "")}" placeholder="(なし)" aria-label="コード">
        <input class="row-lyric" type="text" value="${escapeAttr(event.lyric || "")}" placeholder="歌詞" aria-label="歌詞">
        <input class="row-beats" type="number" min="0.5" max="32" step="0.5" value="${event.beats}" aria-label="拍数">
        <span class="row-buttons">
          <button type="button" data-act="from-here" title="ここから再生">▶</button>
          <button type="button" data-act="insert" title="下にノートを追加">＋</button>
          <button type="button" data-act="delete" title="削除">✕</button>
        </span>`;
      row.querySelector(".row-chord").addEventListener("input", (ev) => {
        event.chord = ev.target.value.trim() || null;
        laneDirty = true;
      });
      row.querySelector(".row-lyric").addEventListener("input", (ev) => {
        event.lyric = ev.target.value;
        laneDirty = true;
      });
      row.querySelector(".row-beats").addEventListener("change", (ev) => {
        event.beats = Math.max(0.5, Number(ev.target.value) || 0.5);
        laneDirty = true;
        refreshTimelineBars();
      });
    }
    row.querySelector('[data-act="delete"]').addEventListener("click", () => {
      song.events.splice(index, 1);
      laneDirty = true;
      renderTimeline();
    });
    row.querySelector('[data-act="insert"]').addEventListener("click", () => {
      song.events.splice(index + 1, 0, {
        type: "chord",
        chord: null,
        lyric: "",
        beats: Number(song.defaultBeats) || 2,
        lineIndex: event.lineIndex
      });
      laneDirty = true;
      renderTimeline();
    });
    const fromHere = row.querySelector('[data-act="from-here"]');
    if (fromHere) {
      fromHere.addEventListener("click", () => {
        computePositions();
        if (player.playing) {
          haltPlayback();
        }
        if (laneDirty) {
          renderLane();
        }
        setStartBeat(event.startBeat);
        setMode("play");
      });
    }
    el.timeline.appendChild(row);
  });
}

function refreshTimelineBars() {
  computePositions();
  const beatsPerBar = Number(song.beatsPerBar);
  const rows = el.timeline.querySelectorAll(".timeline-row");
  song.events.forEach((event, index) => {
    const row = rows[index];
    if (!row || event.type === "section") {
      return;
    }
    const bar = Math.floor(event.startBeat / beatsPerBar) + 1;
    const beatInBar = (event.startBeat % beatsPerBar) + 1;
    row.querySelector(".row-bar").textContent = `${bar}-${formatBeat(beatInBar)}`;
  });
}

function formatBeat(beat) {
  return Number.isInteger(beat) ? String(beat) : beat.toFixed(1);
}

// ===== 曲データと保存 =====

function blankSong() {
  return {
    id: null,
    title: "あたらしい曲",
    artist: "",
    bpm: 100,
    beatsPerBar: 4,
    defaultBeats: 2,
    transpose: 0,
    source: "",
    events: [],
    melody: [],
    rhythmPattern: "whole",
    updatedAt: null
  };
}

function demoSong() {
  const data = blankSong();
  data.title = "よるのコドリ・スウィング（デモ）";
  data.artist = "Codori";
  data.bpm = 122;
  data.source = DEMO_SOURCE;
  data.events = buildEventsFromSource(DEMO_SOURCE, data.defaultBeats);
  return data;
}

function loadLibrary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { songs: {}, lastId: null };
    }
    const parsed = JSON.parse(raw);
    return { songs: parsed.songs || {}, lastId: parsed.lastId || null };
  } catch (error) {
    return { songs: {}, lastId: null };
  }
}

function saveLibrary() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch (error) {
    window.alert("ブラウザに保存できなかった。プライベートモードでは保存できないことがあるよ。");
  }
}

function serializeSong() {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    bpm: Number(song.bpm) || 100,
    beatsPerBar: Number(song.beatsPerBar) || 4,
    defaultBeats: Number(song.defaultBeats) || 2,
    transpose: Number(song.transpose) || 0,
    source: song.source,
    events: song.events.map((event) => {
      if (event.type === "section") {
        return { type: "section", label: event.label, beats: 0, lineIndex: event.lineIndex };
      }
      return {
        type: "chord",
        chord: event.chord,
        lyric: event.lyric,
        beats: event.beats,
        lineIndex: event.lineIndex
      };
    }),
    melody: (song.melody || []).map((note) => ({ ...note })),
    rhythmPattern: song.rhythmPattern || "whole",
    updatedAt: new Date().toISOString()
  };
}

function saveCurrentSong() {
  syncMetaFromInputs();
  if (!song.id) {
    song.id = `song-${Date.now()}`;
  }
  const data = serializeSong();
  library.songs[song.id] = data;
  library.lastId = song.id;
  saveLibrary();
  renderSongSelect();
  el.timelineSummary.textContent = `保存したよ（${data.title}）。`;
}

function loadSongById(id) {
  const data = library.songs[id];
  if (!data) {
    return;
  }
  if (player.playing) {
    haltPlayback();
  }
  song = { ...blankSong(), ...data, events: (data.events || []).map((event) => ({ ...event })) };
  library.lastId = id;
  saveLibrary();
  player.startBeat = 0;
  player.pausedBeat = null;
  laneDirty = true;
  syncInputsFromSong();
  renderTimeline();
}

function deleteCurrentSong() {
  if (!song.id || !library.songs[song.id]) {
    window.alert("まだ保存していない曲だよ。");
    return;
  }
  if (!window.confirm(`「${song.title}」を保存リストから消す？`)) {
    return;
  }
  delete library.songs[song.id];
  if (library.lastId === song.id) {
    library.lastId = null;
  }
  song.id = null;
  saveLibrary();
  renderSongSelect();
}

function renderSongSelect() {
  const entries = Object.values(library.songs)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  el.songSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = entries.length ? "曲をえらぶ" : "保存した曲はまだないよ";
  el.songSelect.appendChild(placeholder);
  entries.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.artist ? `${entry.title} / ${entry.artist}` : entry.title;
    option.selected = entry.id === song?.id;
    el.songSelect.appendChild(option);
  });
}

function exportSong() {
  syncMetaFromInputs();
  const data = serializeSong();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${song.title || "song"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importSongFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (player.playing) {
        haltPlayback();
      }
      const next = blankSong();
      next.title = data.title || "読み込んだ曲";
      next.artist = data.artist || "";
      next.bpm = Number(data.bpm) || next.bpm;
      next.beatsPerBar = Number(data.beatsPerBar) || next.beatsPerBar;
      next.defaultBeats = Number(data.defaultBeats) || next.defaultBeats;
      next.transpose = Number(data.transpose) || 0;
      // 旧コードエディタのJSON（body形式）も読めるようにする
      next.source = data.source || data.body || "";
      next.events = Array.isArray(data.events) && data.events.length
        ? data.events.map((event) => ({ ...event }))
        : buildEventsFromSource(next.source, next.defaultBeats);
      song = next;
      player.startBeat = 0;
      player.pausedBeat = null;
      laneDirty = true;
      syncInputsFromSong();
      renderTimeline();
    } catch (error) {
      window.alert("JSONを読み込めなかった。形式を確認してね。");
    }
  };
  reader.readAsText(file);
}

// ===== UIまわり =====

function syncInputsFromSong() {
  el.titleInput.value = song.title || "";
  el.artistInput.value = song.artist || "";
  el.bpmInput.value = song.bpm;
  el.playBpm.value = song.bpm;
  el.beatsPerBar.value = String(song.beatsPerBar);
  el.defaultBeats.value = song.defaultBeats;
  el.sourceInput.value = song.source || "";
  el.transposeLabel.textContent = String(song.transpose || 0);
  renderSongSelect();
  syncPlayExtras();
}

function syncMetaFromInputs() {
  song.title = el.titleInput.value.trim() || "無題";
  song.artist = el.artistInput.value.trim();
  song.bpm = clampNumber(el.bpmInput.value, 40, 240, 100);
  song.beatsPerBar = Number(el.beatsPerBar.value) || 4;
  song.defaultBeats = clampNumber(el.defaultBeats.value, 0.5, 16, 2);
  song.source = el.sourceInput.value;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, number));
}

function setMode(mode) {
  const isPlay = mode === "play";
  const tabPractice = document.querySelector("#tab-practice");
  const practiceView = document.querySelector("#practice-view");
  const tabScore = document.querySelector("#tab-score");
  const scoreView = document.querySelector("#score-view");
  el.tabEdit.classList.toggle("is-active", mode === "edit");
  el.tabPlay.classList.toggle("is-active", isPlay);
  el.tabImport?.classList.toggle("is-active", mode === "import");
  tabPractice?.classList.toggle("is-active", mode === "practice");
  tabScore?.classList.toggle("is-active", mode === "score");
  el.editView.classList.toggle("is-active", mode === "edit");
  el.playView.classList.toggle("is-active", isPlay);
  el.importView?.classList.toggle("is-active", mode === "import");
  practiceView?.classList.toggle("is-active", mode === "practice");
  scoreView?.classList.toggle("is-active", mode === "score");
  if (isPlay) {
    syncMetaFromInputs();
    el.playBpm.value = song.bpm;
    syncPlayExtras();
    renderLane();
    updatePositionLabel(player.pausedBeat ?? player.startBeat);
    updateStageForBeat(player.pausedBeat ?? player.startBeat);
  } else if (player.playing) {
    pausePlayback();
  }
}

function syncPlayExtras() {
  if (el.rhythmPattern) {
    el.rhythmPattern.value = RHYTHM_PATTERNS[song.rhythmPattern] ? song.rhythmPattern : "whole";
  }
  if (el.melodyGuideToggle) {
    const hasMelody = Array.isArray(song.melody) && song.melody.length > 0;
    el.melodyGuideToggle.disabled = !hasMelody;
    if (!hasMelody) {
      el.melodyGuideToggle.checked = false;
    }
  }
  if (el.originalToggle) {
    el.originalToggle.disabled = !importedAudio;
    if (!importedAudio) {
      el.originalToggle.checked = false;
    }
  }
}

// 取り込みモード（import.js）からの受け口
function applyImportedSong(data, audioInfo) {
  if (player.playing) {
    haltPlayback();
  }
  song = { ...blankSong(), ...data };
  song.events = (data.events || []).map((event) => ({ ...event }));
  song.melody = (data.melody || []).map((note) => ({ ...note }));
  importedAudio = audioInfo || null;
  player.startBeat = 0;
  player.pausedBeat = null;
  laneDirty = true;
  syncInputsFromSong();
  syncPlayExtras();
  renderTimeline();
}

function setTranspose(next) {
  song.transpose = Math.max(-11, Math.min(11, next));
  el.transposeLabel.textContent = song.transpose > 0 ? `+${song.transpose}` : String(song.transpose);
  laneDirty = true;
  if (!player.playing) {
    renderLane();
  }
}

function applyBpmChange(value) {
  const bpm = clampNumber(value, 40, 240, song.bpm);
  const wasPlaying = player.playing;
  let resumeBeat = null;
  if (wasPlaying) {
    resumeBeat = Math.max(currentBeat(), player.startBeat);
    haltPlayback();
  }
  song.bpm = bpm;
  el.bpmInput.value = bpm;
  el.playBpm.value = bpm;
  if (wasPlaying) {
    startPlayback(resumeBeat, false);
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(text) {
  return escapeHtml(text == null ? "" : text);
}

// ===== イベント登録 =====

el.tabEdit.addEventListener("click", () => setMode("edit"));
el.tabPlay.addEventListener("click", () => setMode("play"));
el.tabImport?.addEventListener("click", () => setMode("import"));

el.buildEvents.addEventListener("click", () => {
  syncMetaFromInputs();
  if (song.events.length && !window.confirm("いまの譜面を作りなおす？ 手なおしした拍数やコードは消えるよ。")) {
    return;
  }
  song.events = buildEventsFromSource(song.source, song.defaultBeats);
  player.startBeat = 0;
  player.pausedBeat = null;
  laneDirty = true;
  renderTimeline();
});

el.playButton.addEventListener("click", () => {
  syncMetaFromInputs();
  togglePlayback();
});
el.stopButton.addEventListener("click", stopPlayback);

el.playBpm.addEventListener("change", (event) => applyBpmChange(event.target.value));
el.bpmInput.addEventListener("change", (event) => applyBpmChange(event.target.value));

el.transposeDown.addEventListener("click", () => setTranspose((song.transpose || 0) - 1));
el.transposeUp.addEventListener("click", () => setTranspose((song.transpose || 0) + 1));

el.noteSpeed.addEventListener("input", (event) => {
  pxPerBeat = Number(event.target.value) || 110;
  renderLane();
  if (player.playing) {
    setTrackTransform(currentBeat());
  }
});

el.rhythmPattern?.addEventListener("change", () => {
  song.rhythmPattern = el.rhythmPattern.value;
  if (player.playing) {
    playbackHits = buildPlaybackHits();
    player.nextHitIdx = findScheduleIndex(playbackHits, currentBeat(), (hit) => hit.beat);
  }
});

el.melodyGuideToggle?.addEventListener("change", () => {
  if (player.playing) {
    player.nextMelodyIdx = findScheduleIndex(song.melody || [], currentBeat(), (note) => note.startBeat);
  }
});

el.originalToggle?.addEventListener("change", () => {
  if (player.playing) {
    const beat = Math.max(currentBeat(), player.startBeat);
    haltPlayback();
    startPlayback(beat, false);
  }
});

el.fsPause?.addEventListener("click", togglePlayback);
el.fsExit?.addEventListener("click", exitPlayFullscreen);

el.laneTrack.addEventListener("click", (event) => {
  const noteEl = event.target.closest(".note[data-beat]");
  if (!noteEl) {
    return;
  }
  if (player.playing) {
    haltPlayback();
  }
  setStartBeat(Number(noteEl.dataset.beat));
});

el.songSelect.addEventListener("change", (event) => {
  if (event.target.value) {
    loadSongById(event.target.value);
  }
});
el.newSong.addEventListener("click", () => {
  if (!window.confirm("新しい曲をつくる？（保存していない変更は消えるよ）")) {
    return;
  }
  if (player.playing) {
    haltPlayback();
  }
  song = blankSong();
  player.startBeat = 0;
  player.pausedBeat = null;
  laneDirty = true;
  syncInputsFromSong();
  renderTimeline();
});
el.saveSong.addEventListener("click", saveCurrentSong);
el.deleteSong.addEventListener("click", deleteCurrentSong);
el.exportSong.addEventListener("click", exportSong);
el.importSongButton.addEventListener("click", () => el.importSong.click());
el.importSong.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) {
    importSongFile(file);
  }
  event.target.value = "";
});

[el.titleInput, el.artistInput].forEach((input) => {
  input.addEventListener("input", syncMetaFromInputs);
});
el.beatsPerBar.addEventListener("change", () => {
  syncMetaFromInputs();
  laneDirty = true;
  renderTimeline();
});
el.defaultBeats.addEventListener("change", syncMetaFromInputs);
el.sourceInput.addEventListener("input", () => {
  song.source = el.sourceInput.value;
});

// ===== 初期化 =====

function init() {
  if (el.rhythmPattern) {
    el.rhythmPattern.innerHTML = "";
    Object.entries(RHYTHM_PATTERNS).forEach(([key, pattern]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = pattern.label;
      el.rhythmPattern.appendChild(option);
    });
  }
  if (library.lastId && library.songs[library.lastId]) {
    song = { ...blankSong(), ...library.songs[library.lastId] };
    song.events = (song.events || []).map((event) => ({ ...event }));
  } else {
    song = demoSong();
  }
  syncInputsFromSong();
  renderTimeline();
  renderLane();
}

init();
