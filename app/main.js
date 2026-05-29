let chordData = [
  {
    code_id: "C_major",
    display_name: "C",
    family: "Major",
    ukulele_fingering: "0003",
    fingering_asset: "assets/app/fingering/initial-four/ukulele_C_vertical_strings.svg",
    character_asset: "assets/approved/characters/major.png",
    learning_note: "ほっと帰れる明るさ",
    memory_hint: "Cは、ほっと帰ってこられる音。Majorアクションの安心した顔と、まっすぐな響きを一緒に覚えよう。",
    temp_audio_notes: [261.63, 329.63, 392.0, 523.25]
  },
  {
    code_id: "C_minor",
    display_name: "Cm",
    family: "minor",
    ukulele_fingering: "0333",
    fingering_asset: "assets/app/fingering/initial-four/ukulele_Cm_vertical_strings.svg",
    character_asset: "assets/approved/characters/major.png",
    learning_note: "今日は少し静か",
    memory_hint: "Cmは、Cより少し静かな音。minorアクションの内向きな姿と、しっとりした気分をそっと結びつけよう。",
    temp_audio_notes: [261.63, 311.13, 392.0, 523.25]
  },
  {
    code_id: "C_7",
    display_name: "C7",
    family: "7",
    ukulele_fingering: "0001",
    fingering_asset: "assets/app/fingering/initial-four/ukulele_C7_vertical_strings.svg",
    character_asset: "assets/approved/characters/major.png",
    learning_note: "つぎへ行きたくなる",
    memory_hint: "C7は、まだ先へ行きたくなる音。7アクションの片羽の動きと、そわっと進む感じで覚えよう。",
    temp_audio_notes: [261.63, 329.63, 392.0, 466.16]
  },
  {
    code_id: "C_add9",
    display_name: "Cadd9",
    family: "add9",
    ukulele_fingering: "0203",
    fingering_asset: "assets/app/fingering/initial-four/ukulele_Cadd9_vertical_strings.svg",
    character_asset: "assets/approved/characters/major.png",
    learning_note: "ふわっと空気が広がる",
    memory_hint: "Cadd9は、Cに小さな風が入る音。add9アクションの見上げる顔と、ふわっと広がる空気を一緒に。",
    temp_audio_notes: [261.63, 293.66, 329.63, 392.0, 523.25]
  }
];
let fullChordData = [...chordData];

const urlParams = new URLSearchParams(window.location.search);
const useFormalCandidate = urlParams.get("formal") === "1";
const useActionCandidate = urlParams.get("actions") !== "0";
const requestedSetId = urlParams.get("set");
const requestedStageId = urlParams.get("stage");
const requestedRootFilter = urlParams.get("root");
const requestedFamilyFilter = urlParams.get("family");
const requestedSearchFilter = urlParams.get("search") || urlParams.get("q") || "";
const STORAGE_KEY = "codori.practiceProgress.v1";
const savedProgress = readPracticeProgress();
const ALL_FILTER = "all";
const FAMILY_ORDER = ["Major", "minor", "7", "add9", "m7", "maj7", "mM7", "sus4", "m7-5", "dim", "aug"];
const ACTION_CHARACTER_ASSETS = {
  Major: "assets/app/characters/action-candidate-old-c-v7/action-major.png",
  minor: "assets/app/characters/action-candidate-old-c-v7/action-minor.png",
  "7": "assets/app/characters/action-candidate-old-c-v7/action-7.png",
  add9: "assets/app/characters/action-candidate-old-c-v7/action-add9.png",
  m7: "assets/app/characters/action-candidate-old-c-v7/action-m7.png",
  maj7: "assets/app/characters/action-candidate-old-c-v7/action-maj7.png",
  mM7: "assets/app/characters/action-candidate-old-c-v7/action-mm7.png",
  sus4: "assets/app/characters/action-candidate-old-c-v7/action-sus4.png",
  "m7-5": "assets/app/characters/action-candidate-old-c-v7/action-m7-5.png",
  dim: "assets/app/characters/action-candidate-old-c-v7/action-dim.png",
  aug: "assets/app/characters/action-candidate-old-c-v7/action-aug.png"
};
const ONE_POINT_ACCENTS = {
  Major: {
    slug: "major",
    title: "安心のホームドット",
    svg: '<circle cx="24" cy="22" r="10" fill="currentColor"/><path d="M12 40h24" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'
  },
  minor: {
    slug: "minor",
    title: "内向きの三日月",
    svg: '<path d="M30 9a16 16 0 1 0 0 30a12 12 0 1 1 0-30z" fill="currentColor"/>'
  },
  "7": {
    slug: "seventh",
    title: "次へ進む矢印",
    svg: '<path d="M10 24h28M27 12l12 12-12 12" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  add9: {
    slug: "add9",
    title: "一粒のきらめき",
    svg: '<path d="M24 7v34M7 24h34M13 13l22 22M35 13L13 35" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'
  },
  m7: {
    slug: "m7",
    title: "余韻の輪",
    svg: '<circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" stroke-width="5"/><path d="M14 33c6 5 14 5 20 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'
  },
  maj7: {
    slug: "maj7",
    title: "透明な小ダイヤ",
    svg: '<path d="M24 6l18 18-18 18L6 24z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>'
  },
  mM7: {
    slug: "mm7",
    title: "宿命の斜め小片",
    svg: '<path d="M19 7l17 8-8 26-17-8z" fill="currentColor" opacity="0.84"/><path d="M10 40L38 8" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'
  },
  sus4: {
    slug: "sus4",
    title: "未解決の浮いた点",
    svg: '<circle cx="24" cy="15" r="9" fill="currentColor"/><path d="M24 30v12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'
  },
  "m7-5": {
    slug: "m7-5",
    title: "揺れる傾きダイヤ",
    svg: '<path d="M13 15l25-5 5 25-25 5z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M10 41L40 8" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'
  },
  dim: {
    slug: "dim",
    title: "縮んだ小リング",
    svg: '<ellipse cx="24" cy="24" rx="16" ry="11" fill="none" stroke="currentColor" stroke-width="5"/><path d="M15 16l18 16M33 16L15 32" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'
  },
  aug: {
    slug: "aug",
    title: "広がる小リング",
    svg: '<circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" stroke-width="5"/><path d="M24 3v8M24 37v8M3 24h8M37 24h8" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'
  }
};
const KEY_COLORS = {
  C: "#F6E7B8",
  Db: "#D9C8F0",
  D: "#F5E26B",
  Eb: "#E7B2C4",
  E: "#A8DCC8",
  F: "#9ED28B",
  Gb: "#78C7BF",
  G: "#86C7F2",
  Ab: "#B9A4E4",
  A: "#F2A38F",
  Bb: "#D98AA8",
  B: "#4C6FAE"
};
const ROOT_NOTE_FREQUENCIES = {
  C: 261.63,
  "C#": 277.18,
  Db: 277.18,
  D: 293.66,
  "D#": 311.13,
  Eb: 311.13,
  E: 329.63,
  F: 349.23,
  "F#": 369.99,
  Gb: 369.99,
  G: 392.0,
  "G#": 415.3,
  Ab: 415.3,
  A: 440.0,
  "A#": 466.16,
  Bb: 466.16,
  B: 493.88
};
const PRACTICE_STAGE_PATH = "../assets/app/data/practice-stages.json";
const PRACTICE_SOURCE_PATHS = [
  "../assets/app/data/all-main-chords.json",
  "../assets/app/data/initial-four-chords.json",
  "../assets/app/data/expansion-set-01.json",
  "../assets/app/data/m7-set-01.json"
];
const modeGuide = {
  card: {
    title: "音カード",
    description: "1つのコードを、鳥・音・運指・きもちでゆっくり見る。"
  },
  compare: {
    title: "ききくらべ",
    description: "近いコードを並べて、明るい、静か、そわっと、ふわっとの違いを聞く。"
  },
  quiz: {
    title: "音あて",
    description: "音を聞いてコード名を選び、答えの鳥と運指でもう一度つなげる。"
  },
  progression: {
    title: "進行練習",
    description: "鳥たちが進む流れを聞く。"
  }
};
const progressItems = [
  { key: "heard", label: "聞いた" },
  { key: "quizzed", label: "音あて" },
  { key: "progressionHeard", label: "進行" }
];
const recommendedStageNumbers = [0, 1, 2, 5];
const moreStageNumbers = [3, 4, 6, 7, 8, 9, 10];
const stageViewGuides = {
  3: {
    card: "maj7、m7、m7-5を1羽ずつ見る。名前より先に、夜の色を聞く。",
    compare: "透明、余韻、少しゆれる感じを聞きくらべる。",
    quiz: "夜の仲間を、音から思い出す。正解より、響きの色を耳に残す。"
  },
  4: {
    card: "表情は同じまま、キー色と住む枝と運指が変わることを見る。",
    compare: "Gの森、Fの森を聞きくらべる。同じ種類の鳥は同じ役割を持つ。",
    quiz: "どの枝にいる鳥か、音とコード名を結びつける。"
  },
  6: {
    card: "sus4の浮遊とadd9のきらめきを、いつものMajorの近くで聞く。",
    compare: "着地しない音、空気が広がる音、安心する音を並べて聞く。",
    quiz: "浮いているのか、きらめいているのか、音の空気で思い出す。"
  },
  7: {
    card: "Amを帰る場所にして、静かな森の仲間を見る。",
    compare: "minorキーの静けさと、E7がAmへ帰る灯りを聞く。",
    quiz: "静かな帰り道の中で、どのコードが鳴ったか思い出す。"
  },
  8: {
    card: "7アクションのいたずらっぽさを、遊びの色として聞く。",
    compare: "C7、F7、G7たちの寄り道を聞きくらべる。",
    quiz: "にやっとする7アクションの音を聞いて、コード名を選ぶ。"
  },
  9: {
    card: "dim、m7-5、augを、こわい音ではなく不思議な色として見る。",
    compare: "きゅっとする、ゆれる、夢みたいにふくらむ感じを聞きくらべる。",
    quiz: "不思議な響きの種類を、耳の印象から思い出す。"
  },
  10: {
    card: "全コード図鑑の使い方を、Cの11種類で小さく練習する。",
    compare: "同じCでも種類が変わると鳥ときもちが変わることを見直す。",
    quiz: "図鑑で探す前の小さな確認。Cの種類を音から思い出す。"
  }
};
const chordSets = {
  "initial-four": {
    id: "initial-four",
    label: "はじめの4羽",
    description: "同じCを基準に、明るい・静か・進む・広がるを聞き分ける。",
    progressions: [],
    dataPath: useFormalCandidate
      ? "../assets/app/data/initial-four-chords.formal-candidate-001.json"
      : "../assets/app/data/initial-four-chords.json"
  },
  "expansion-set-01": {
    id: "expansion-set-01",
    label: "Cのまわり",
    description: "7アクションの風で、次へ進む感じを覚える。",
    progressions: ["A7 -> Dm", "D7 -> G", "G7 -> C"],
    dataPath: "../assets/app/data/expansion-set-01.json"
  },
  "m7-set-01": {
    id: "m7-set-01",
    label: "m7の夜",
    description: "minorより少しほどける、夜の余韻を覚える。",
    progressions: ["Am -> Am7", "Dm -> Dm7", "Em -> Em7"],
    dataPath: "../assets/app/data/m7-set-01.json"
  },
  "all-main-chords": {
    id: "all-main-chords",
    label: "全コード",
    description: "12音と主要11種類を、森の図鑑みたいに少しずつ見ていく。",
    progressions: ["12音", "11種類", "132コード"],
    dataPath: "../assets/app/data/all-main-chords.json"
  }
};
let activeSet = chordSets[requestedSetId || savedProgress.last?.setId] || chordSets["initial-four"];
const initialView = ["card", "compare", "quiz", "progression"].includes(urlParams.get("view"))
  ? urlParams.get("view")
  : ["card", "compare", "quiz", "progression"].includes(savedProgress.last?.view)
  ? savedProgress.last.view
  : "card";

let currentIndex = 0;
let quizIndex = 0;
let activeProgressionIndex = 0;
let audioContext;
let lastQuizIndex = -1;
let quizCorrectCount = 0;
let quizAnsweredCount = 0;
let quizHasPlayed = false;
let quizHasAnswered = false;
let activeView = initialView;
let renderedCompareKey = "";
let activeFilters = {
  root: ALL_FILTER,
  family: ALL_FILTER,
  search: ""
};
let practiceStages = [];
let activePracticeStage = null;
let practiceCatalog = new Map();
let practiceProgress = savedProgress;
const missingAudioFiles = new Set();

const elements = {
  practiceStageDescription: document.querySelector("#practice-stage-description"),
  practiceStageMood: document.querySelector("#practice-stage-mood"),
  stageProgress: document.querySelector("#stage-progress"),
  stageProgressSummary: document.querySelector("#stage-progress-summary"),
  stageContinue: document.querySelector("#stage-continue"),
  stageProgressBadges: document.querySelector("#stage-progress-badges"),
  resetStageProgress: document.querySelector("#reset-stage-progress"),
  nextStageGuide: document.querySelector("#next-stage-guide"),
  nextStageMessage: document.querySelector("#next-stage-message"),
  nextStageButton: document.querySelector("#next-stage-button"),
  practiceStageButtons: document.querySelector("#practice-stage-buttons"),
  stageTargets: document.querySelector("#stage-targets"),
  stageNumberNote: document.querySelector("#stage-number-note"),
  openCatalog: document.querySelector("#open-catalog"),
  setPanel: document.querySelector(".set-panel"),
  setTitle: document.querySelector("#set-title"),
  setDescription: document.querySelector("#set-description"),
  progressionFlow: document.querySelector("#progression-flow"),
  filterPanel: document.querySelector("#filter-panel"),
  chordSearch: document.querySelector("#chord-search"),
  clearSearch: document.querySelector("#clear-search"),
  rootFilter: document.querySelector("#root-filter"),
  familyFilter: document.querySelector("#family-filter"),
  filterSummary: document.querySelector("#filter-summary"),
  cardCount: document.querySelector("#card-count"),
  modeTitle: document.querySelector("#mode-title"),
  modeDescription: document.querySelector("#mode-description"),
  firstStepTip: document.querySelector("#first-step-tip"),
  chordName: document.querySelector("#chord-name"),
  familyLabel: document.querySelector("#family-label"),
  keyChip: document.querySelector("#key-chip"),
  birdImage: document.querySelector("#bird-image"),
  birdAccent: document.querySelector("#bird-accent"),
  fingeringImage: document.querySelector("#fingering-image"),
  learningNote: document.querySelector("#learning-note"),
  memoryHint: document.querySelector("#memory-hint"),
  playCurrent: document.querySelector("#play-current"),
  prevCard: document.querySelector("#prev-card"),
  nextCard: document.querySelector("#next-card"),
  playCompare: document.querySelector("#play-compare"),
  compareNote: document.querySelector("#compare-note"),
  compareGrid: document.querySelector("#compare-grid"),
  quizImage: document.querySelector("#quiz-image"),
  quizAccent: document.querySelector("#quiz-accent"),
  playQuiz: document.querySelector("#play-quiz"),
  playRootAssist: document.querySelector("#play-root-assist"),
  quizAnswerDetail: document.querySelector("#quiz-answer-detail"),
  quizAnswerName: document.querySelector("#quiz-answer-name"),
  quizAnswerNote: document.querySelector("#quiz-answer-note"),
  quizFingeringImage: document.querySelector("#quiz-fingering-image"),
  quizScore: document.querySelector("#quiz-score"),
  quizOptions: document.querySelector("#quiz-options"),
  quizResult: document.querySelector("#quiz-result"),
  nextQuiz: document.querySelector("#next-quiz"),
  progressionTitle: document.querySelector("#progression-title"),
  progressionNote: document.querySelector("#progression-note"),
  progressionSelector: document.querySelector("#progression-selector"),
  progressionPath: document.querySelector("#progression-path"),
  playProgression: document.querySelector("#play-progression")
};

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mixHex(hex, targetHex, targetRatio) {
  const source = hexToRgb(hex);
  const target = hexToRgb(targetHex);
  const ratio = Math.max(0, Math.min(1, targetRatio));
  const mixed = {
    r: Math.round(source.r * (1 - ratio) + target.r * ratio),
    g: Math.round(source.g * (1 - ratio) + target.g * ratio),
    b: Math.round(source.b * (1 - ratio) + target.b * ratio)
  };
  return `#${[mixed.r, mixed.g, mixed.b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function rootForChord(chord) {
  if (chord?.root) {
    return chord.root;
  }
  if (chord?.key_accent) {
    return chord.key_accent;
  }
  const match = chord?.display_name?.match(/^([A-G](?:b|#)?)/);
  return match ? match[1] : "C";
}

function keyColorForChord(chord) {
  const root = rootForChord(chord);
  return KEY_COLORS[root] || KEY_COLORS.C;
}

function applyKeyColor(element, chord) {
  if (!element) {
    return;
  }
  const keyColor = keyColorForChord(chord);
  element.style.setProperty("--key-color", keyColor);
  element.style.setProperty("--key-accent", mixHex(keyColor, "#1e5aa8", 0.54));
  element.style.setProperty("--key-soft", hexToRgba(keyColor, 0.16));
  element.style.setProperty("--key-frame", hexToRgba(keyColor, 0.24));
}

function keyStyle(chord) {
  const keyColor = keyColorForChord(chord);
  return `--key-color: ${keyColor}; --key-accent: ${mixHex(keyColor, "#1e5aa8", 0.54)}; --key-soft: ${hexToRgba(keyColor, 0.16)}; --key-frame: ${hexToRgba(keyColor, 0.24)};`;
}

function onePointAccentFor(chord) {
  return ONE_POINT_ACCENTS[chord?.family] || ONE_POINT_ACCENTS.Major;
}

function onePointAccentSvg(chord) {
  const accent = onePointAccentFor(chord);
  return `<svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">${accent.svg}</svg>`;
}

function onePointAccentMarkup(chord) {
  const accent = onePointAccentFor(chord);
  return `<span class="one-point-accent one-point-accent--${accent.slug}" title="${accent.title}" aria-hidden="true">${onePointAccentSvg(chord)}</span>`;
}

function updateOnePointAccent(element, chord) {
  if (!element || !chord) {
    return;
  }
  const accent = onePointAccentFor(chord);
  element.className = `one-point-accent one-point-accent--${accent.slug}`;
  element.setAttribute("title", accent.title);
  element.innerHTML = onePointAccentSvg(chord);
}

function isPracticeMode() {
  return Boolean(activePracticeStage);
}

function emptyPracticeProgress() {
  return {
    version: 1,
    stages: {},
    last: null
  };
}

function readPracticeProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyPracticeProgress();
    }
    const parsed = JSON.parse(raw);
    return {
      ...emptyPracticeProgress(),
      ...parsed,
      stages: parsed.stages || {}
    };
  } catch (error) {
    return emptyPracticeProgress();
  }
}

function savePracticeProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(practiceProgress));
  } catch (error) {
    // localStorageが使えない環境では、進捗なしでそのまま動かす。
  }
}

function stageProgress(stageId = activePracticeStage?.id) {
  if (!stageId) {
    return {};
  }
  return practiceProgress.stages[stageId] || {};
}

function progressItemsForStage(stage = activePracticeStage) {
  if (!stage?.progressions?.length) {
    return progressItems.filter((item) => item.key !== "progressionHeard");
  }
  return progressItems;
}

function completedItemsForStage(stage = activePracticeStage, progress = stageProgress(stage?.id)) {
  return progressItemsForStage(stage).filter((item) => progress[item.key]);
}

function isStageComplete(stage = activePracticeStage, progress = stageProgress(stage?.id)) {
  const items = progressItemsForStage(stage);
  return items.length > 0 && items.every((item) => progress[item.key]);
}

function hasStageProgress(progress) {
  return progressItems.some((item) => progress[item.key])
    || Number.isFinite(progress.lastCardIndex)
    || Number.isFinite(progress.lastProgressionIndex)
    || Boolean(progress.lastView);
}

function nextStageAfter(stage = activePracticeStage) {
  if (!stage) {
    return null;
  }
  if (recommendedStageNumbers.includes(stage.stage_number)) {
    const nextNumber = recommendedStageNumbers[recommendedStageNumbers.indexOf(stage.stage_number) + 1]
      ?? moreStageNumbers[0];
    return practiceStages.find((candidate) => candidate.stage_number === nextNumber) || null;
  }
  const sortedMoreStages = practiceStages
    .filter((candidate) => !recommendedStageNumbers.includes(candidate.stage_number))
    .sort((a, b) => a.stage_number - b.stage_number);
  const currentIndexInMore = sortedMoreStages.findIndex((candidate) => candidate.id === stage.id);
  return sortedMoreStages[currentIndexInMore + 1] || null;
}

function nextStageMessageFor(nextStage) {
  if (!activePracticeStage) {
    return "";
  }
  if (!nextStage) {
    return "ここまで歩けたよ。気になる森を図鑑で探して、もう一度聞いてみよう。";
  }
  if (activePracticeStage.stage_number === 5) {
    return `おすすめの道を歩ききったよ。次は「${nextStage.short_title}」で、もっと歩く森をのぞいてみよう。`;
  }
  if (recommendedStageNumbers.includes(activePracticeStage.stage_number)) {
    return `羽あとがそろったよ。次は「${nextStage.short_title}」へ歩いてみよう。`;
  }
  return `この森も歩けたよ。次は「${nextStage.short_title}」を少しのぞいてみよう。`;
}

function lastLocationForActiveStage() {
  return practiceProgress.last?.stageId === activePracticeStage?.id
    ? practiceProgress.last
    : {};
}

function hasStageTrail(progress) {
  const last = lastLocationForActiveStage();
  return hasStageProgress(progress)
    || Boolean(last.view)
    || Number.isFinite(last.cardIndex)
    || Number.isFinite(last.progressionIndex);
}

function stageContinueText(progress) {
  const last = lastLocationForActiveStage();
  if (!hasStageTrail(progress)) {
    return "つづきからはまだなし。音を聞くと、ここに羽あとが残るよ。";
  }

  const view = progress.lastView || last.view || activeView || "card";
  const viewLabel = modeGuide[view]?.title || "音カード";
  if (view === "progression" && activeProgressions().length) {
    const progressionIndex = Number.isFinite(progress.lastProgressionIndex)
      ? progress.lastProgressionIndex
      : last.progressionIndex;
    const progression = activeProgressions()[clampIndex(progressionIndex, activeProgressions().length)];
    return `つづきから: ${viewLabel}「${progression.name}」`;
  }

  const cardIndex = Number.isFinite(progress.lastCardIndex)
    ? progress.lastCardIndex
    : last.cardIndex;
  const chord = chordData[clampIndex(cardIndex, chordData.length)];
  return chord
    ? `つづきから: ${viewLabel}「${chord.display_name}」`
    : `つづきから: ${viewLabel}`;
}

function updateStageProgress(patch = {}) {
  if (!isPracticeMode()) {
    return;
  }
  const stageId = activePracticeStage.id;
  const current = {
    heard: false,
    quizzed: false,
    progressionHeard: false,
    ...stageProgress(stageId)
  };
  practiceProgress.stages[stageId] = {
    ...current,
    ...patch,
    lastView: activeView,
    lastCardIndex: currentIndex,
    lastProgressionIndex: activeProgressionIndex,
    updatedAt: new Date().toISOString()
  };
  saveLastLocation(false);
  savePracticeProgress();
  renderPracticeProgress();
  renderPracticeStageChrome();
}

function saveLastLocation(shouldSave = true) {
  if (isPracticeMode()) {
    practiceProgress.last = {
      mode: "practice",
      stageId: activePracticeStage.id,
      view: activeView,
      cardIndex: currentIndex,
      progressionIndex: activeProgressionIndex
    };
  } else {
    practiceProgress.last = {
      mode: "catalog",
      setId: activeSet.id,
      view: activeView
    };
  }
  if (shouldSave) {
    savePracticeProgress();
  }
}

function renderSetChrome() {
  elements.setPanel.classList.toggle("is-hidden", isPracticeMode());
  elements.setTitle.textContent = activeSet.label;
  elements.setDescription.textContent = activeSet.description;
  elements.progressionFlow.innerHTML = "";
  elements.progressionFlow.classList.toggle("is-hidden", !activeSet.progressions.length);
  activeSet.progressions.forEach((progression) => {
    const chip = document.createElement("span");
    chip.className = "progression-chip";
    chip.textContent = progression;
    elements.progressionFlow.appendChild(chip);
  });
  document.querySelectorAll(".set-button").forEach((button) => {
    button.classList.toggle("is-active", !isPracticeMode() && button.dataset.set === activeSet.id);
  });
}

function isFilterableSet() {
  return !isPracticeMode() && activeSet.id === "all-main-chords";
}

function renderFilterPanel() {
  elements.filterPanel.classList.toggle("is-hidden", !isFilterableSet());
  if (!isFilterableSet()) {
    return;
  }

  renderFilterButtons(
    elements.rootFilter,
    [{ value: ALL_FILTER, label: "すべて" }, ...uniqueValues("root").map((root) => ({ value: root, label: root }))],
    "root"
  );
  renderFilterButtons(
    elements.familyFilter,
    [{ value: ALL_FILTER, label: "すべて" }, ...orderedFamilies().map((family) => ({ value: family, label: family }))],
    "family"
  );
  renderFilterSummary();
}

function renderFilterButtons(container, options, type) {
  container.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "filter-button";
    button.type = "button";
    button.textContent = option.label;
    button.dataset.filterType = type;
    button.dataset.filterValue = option.value;
    button.classList.toggle("is-active", activeFilters[type] === option.value);
    button.addEventListener("click", () => {
      activeFilters[type] = option.value;
      applyFilters();
    });
    container.appendChild(button);
  });
}

function uniqueValues(key) {
  return [...new Set(fullChordData.map((chord) => chord[key]))];
}

function orderedFamilies() {
  const families = uniqueValues("family");
  return FAMILY_ORDER.filter((family) => families.includes(family));
}

function filteredChordData() {
  if (!isFilterableSet()) {
    return [...fullChordData];
  }

  return fullChordData.filter((chord) => {
    const rootMatch = activeFilters.root === ALL_FILTER || chord.root === activeFilters.root;
    const familyMatch = activeFilters.family === ALL_FILTER || chord.family === activeFilters.family;
    const searchMatch = searchMatchesChord(chord);
    return rootMatch && familyMatch && searchMatch;
  });
}

function searchMatchesChord(chord) {
  const query = normalizedSearch();
  if (!query) {
    return true;
  }

  const familyQuery = FAMILY_ORDER.map((family) => normalizeSearchText(family)).includes(query);
  if (familyQuery) {
    return normalizeSearchText(chord.family) === query;
  }

  return searchTextForChord(chord).includes(query);
}

function filterKey() {
  const sourceId = isPracticeMode() ? activePracticeStage.id : activeSet.id;
  return `${sourceId}:${activeFilters.root}:${activeFilters.family}:${normalizedSearch()}`;
}

function normalizedSearch() {
  return normalizeSearchText(activeFilters.search);
}

function normalizeSearchText(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/ｍ/g, "m");
}

function searchTextForChord(chord) {
  return normalizeSearchText([
    chord.display_name,
    chord.family,
    chord.root,
    chord.code_id,
  ].filter(Boolean).join(" "));
}

function renderFilterSummary() {
  if (!isFilterableSet()) {
    return;
  }

  const rootText = activeFilters.root === ALL_FILTER ? "ぜんぶの音" : activeFilters.root;
  const familyText = activeFilters.family === ALL_FILTER ? "ぜんぶの種類" : activeFilters.family;
  const searchText = normalizedSearch() ? ` / ${activeFilters.search.trim()}` : "";
  elements.filterSummary.textContent = `${rootText} / ${familyText}${searchText} / ${chordData.length}コード`;
  elements.chordSearch.value = activeFilters.search;
  elements.clearSearch.disabled = !normalizedSearch();
  document.querySelectorAll(".filter-button").forEach((button) => {
    const type = button.dataset.filterType;
    button.classList.toggle("is-active", activeFilters[type] === button.dataset.filterValue);
  });
}

function resetQuizState() {
  lastQuizIndex = -1;
  quizCorrectCount = 0;
  quizAnsweredCount = 0;
  quizHasPlayed = false;
  quizHasAnswered = false;
}

function updateModeGuide() {
  const guide = modeGuide[activeView] || modeGuide.card;
  elements.modeTitle.textContent = guide.title;
  elements.modeDescription.textContent = modeDescriptionForCurrentStep(guide);
  elements.firstStepTip.textContent = firstStepTipForCurrentStep();
}

function modeDescriptionForCurrentStep(guide) {
  if (!isPracticeMode()) {
    return `${guide.description} 図鑑では、探すことを優先する。`;
  }

  const stageNumber = activePracticeStage.stage_number;

  if (stageNumber === 0) {
    if (activeView === "card") {
      return "まずCを聞く。つぎへ進んで、Cm / C7 / Cadd9のきもちを比べる。";
    }
    if (activeView === "compare") {
      return "4羽を並べて聞く。同じCでも、きもちだけが変わる入口。";
    }
    if (activeView === "quiz") {
      return "音を聞いてコード名を選ぶ。答えの鳥と運指で、もう一度つなげる。";
    }
  }

  if (stageNumber === 1) {
    if (activeView === "card") {
      return "Cのまわりにいる仲間を1羽ずつ見る。Cへ帰れる感じを耳に残す。";
    }
    if (activeView === "compare") {
      return "明るい羽と静かな羽を並べて、曲でよく会う空気を聞く。";
    }
    if (activeView === "quiz") {
      return "Cのまわりの仲間を、音から思い出す。正解より、帰り道の感覚を育てる。";
    }
  }

  if (stageNumber === 2) {
    if (activeView === "card") {
      return "7アクションは行き先を持っている。A7 -> Dm、D7 -> G、G7 -> Cをセットで見る。";
    }
    if (activeView === "compare") {
      return "7アクションのそわっとした音と、着地するコードを聞きくらべる。";
    }
    if (activeView === "quiz") {
      return "7アクションの音を聞いて、どこへ行きたがっているか思い出す。";
    }
  }

  if (stageNumber === 5) {
    if (activeView === "card") {
      return "よくある進行に出てくる鳥を確認する。単語を並べる準備みたいに。";
    }
    if (activeView === "compare") {
      return "同じ仲間でも、流れの中で役割が変わる。音の景色を聞きくらべる。";
    }
    if (activeView === "quiz") {
      return "コード名だけでなく、流れの中のきもちを思い出す。";
    }
  }

  if (stageViewGuides[stageNumber]?.[activeView]) {
    return stageViewGuides[stageNumber][activeView];
  }

  if (activeView === "progression") {
    return "コード名を追いかけるより、音の景色がどう動くかを聞く。";
  }
  return guide.description;
}

function firstStepTipForCurrentStep() {
  if (!isPracticeMode()) {
    return "図鑑は探す場所。覚えるときはStageへ。";
  }
  const stageNumber = activePracticeStage.stage_number;
  if (stageNumber === 0 && activeView === "card") {
    return "1. 音をきく  2. つぎへ  3. 音あて";
  }
  if (stageNumber === 1 && activeView === "card") {
    return "1. Cを聞く  2. 仲間を聞く  3. 帰り道を聞く";
  }
  if (stageNumber === 2 && activeView === "card") {
    return "7アクションは、行き先とセットで覚える。";
  }
  if (stageNumber === 5 && activeView === "card") {
    return "まず進行練習で、曲の景色を聞く。";
  }
  if (stageNumber === 3 && activeView === "card") {
    return "夜の仲間は、余韻と透明感を聞く。";
  }
  if (stageNumber === 4 && activeView === "card") {
    return "鳥は同じ、住むキーだけが変わる。";
  }
  if (stageNumber === 6 && activeView === "card") {
    return "浮く、着地する、広がるを聞く。";
  }
  if (stageNumber === 7 && activeView === "card") {
    return "Amへ帰る静かな道を聞く。";
  }
  if (stageNumber === 8 && activeView === "card") {
    return "7アクションの遊びを耳で覚える。";
  }
  if (stageNumber === 9 && activeView === "card") {
    return "不思議な音は、まず眺めるだけでOK。";
  }
  if (stageNumber === 10 && activeView === "card") {
    return "全部を覚えず、探し方を覚える。";
  }
  if (activeView === "quiz") {
    return "先に音をきいてから、コード名を選ぶ。";
  }
  if (activeView === "compare") {
    return "近い音を、順番に聞きくらべる。";
  }
  if (activeView === "progression") {
    return "まとめて聞いて、流れをつかむ。";
  }
  return "青い「音をきく」から始める。";
}

function quizPromptForCurrentStage() {
  if (!isPracticeMode()) {
    return "まずは音をきいて、きもちをたしかめよう。";
  }

  if (activePracticeStage.stage_number === 1) {
    return "Cのまわりのどの仲間かな。まず音をきいてみよう。";
  }
  if (activePracticeStage.stage_number === 2) {
    return "どの7アクション、どの行き先かな。そわっとした音を聞いてみよう。";
  }
  if (activePracticeStage.stage_number === 5) {
    return "流れの中にいるどのコードかな。音の景色を思い出してみよう。";
  }
  if (activePracticeStage.stage_number === 3) {
    return "夜の仲間のどの響きかな。透明感や余韻を聞いてみよう。";
  }
  if (activePracticeStage.stage_number === 4) {
    return "どのキーの鳥かな。音名と運指を一緒に見つけよう。";
  }
  if (activePracticeStage.stage_number === 6) {
    return "浮いている音かな、きらめく音かな。空気の違いを聞いてみよう。";
  }
  if (activePracticeStage.stage_number === 7) {
    return "静かな森のどのコードかな。Amへ帰る感じを思い出してみよう。";
  }
  if (activePracticeStage.stage_number === 8) {
    return "どの7アクションの遊びかな。少し渋い色を聞いてみよう。";
  }
  if (activePracticeStage.stage_number === 9) {
    return "不思議な響きのどの鳥かな。緊張、夢、夜の色を聞いてみよう。";
  }
  if (activePracticeStage.stage_number === 10) {
    return "Cの11種類から、鳴ったコードを探してみよう。";
  }
  return "まずは音をきいて、きもちをたしかめよう。";
}

function quizReadyPromptForCurrentStage() {
  if (!isPracticeMode()) {
    return "近いきもちのコードをえらんでみよう。";
  }

  if (activePracticeStage.stage_number === 1) {
    return "Cのまわりの仲間からえらんでみよう。";
  }
  if (activePracticeStage.stage_number === 2) {
    return "7アクションの合図か、行き先のコードか、聞いた感じでえらんでみよう。";
  }
  if (activePracticeStage.stage_number === 5) {
    return "曲の景色に合うコードをえらんでみよう。";
  }
  if (activePracticeStage.stage_number === 3) {
    return "夜の色に近いコードをえらんでみよう。";
  }
  if (activePracticeStage.stage_number === 4) {
    return "同じ鳥でも、どの音名かをえらんでみよう。";
  }
  if (activePracticeStage.stage_number === 6) {
    return "浮遊か、きらめきか、安心か。近いコードをえらんでみよう。";
  }
  if (activePracticeStage.stage_number === 7) {
    return "静かな帰り道にいるコードをえらんでみよう。";
  }
  if (activePracticeStage.stage_number === 8) {
    return "にやっとする7アクションのコードをえらんでみよう。";
  }
  if (activePracticeStage.stage_number === 9) {
    return "不思議な音の種類をえらんでみよう。";
  }
  if (activePracticeStage.stage_number === 10) {
    return "同じCの中から、音のきもちに近い種類をえらんでみよう。";
  }
  return "近いきもちのコードをえらんでみよう。";
}

function updateTabAvailability() {
  const hasProgressions = activeProgressions().length > 0;
  document.querySelectorAll(".tab").forEach((tab) => {
    const disabled = tab.dataset.view === "progression" && isPracticeMode() && !hasProgressions;
    tab.disabled = disabled;
    tab.classList.toggle("is-disabled", disabled);
  });
  if (activeView === "progression" && isPracticeMode() && !hasProgressions) {
    setView("card");
  }
}

function applyFilters() {
  chordData = filteredChordData();
  currentIndex = 0;
  resetQuizState();
  renderedCompareKey = "";
  activeProgressionIndex = 0;
  quizIndex = chooseNextQuizIndex();
  renderFilterSummary();
  renderCard();
  renderQuiz();
  if (activeView === "compare") {
    renderCompare();
  }
  renderProgression();
}

function renderCard() {
  const chord = chordData[currentIndex];
  const hasChord = Boolean(chord);
  elements.playCurrent.disabled = !hasChord;
  elements.prevCard.disabled = !hasChord;
  elements.nextCard.disabled = !hasChord;
  if (!hasChord) {
    elements.cardCount.textContent = "0 / 0";
    elements.chordName.textContent = "なし";
    elements.familyLabel.textContent = "検索結果";
    elements.keyChip.textContent = "-";
    elements.birdImage.removeAttribute("src");
    elements.birdImage.alt = "条件に合うCodori鳥はまだ見つかりません";
    elements.birdAccent.innerHTML = "";
    elements.fingeringImage.removeAttribute("src");
    elements.fingeringImage.alt = "条件に合う運指はまだ見つかりません";
    elements.learningNote.textContent = "そのコードは、いまの森では見つからなかった。";
    elements.memoryHint.textContent = "検索文字を少し短くするか、音名・コード種類のしぼりこみをゆるめてみよう。";
    return;
  }
  applyKeyColor(document.querySelector(".hero-panel"), chord);
  applyKeyColor(document.querySelector(".bird-frame"), chord);
  elements.cardCount.textContent = `${currentIndex + 1} / ${chordData.length}`;
  elements.chordName.textContent = chord.display_name;
  elements.familyLabel.textContent = chord.family;
  elements.keyChip.textContent = rootForChord(chord);
  applyKeyColor(elements.keyChip, chord);
  elements.birdImage.src = assetPath(characterAssetFor(chord));
  elements.birdImage.alt = `${chord.display_name}のCodori鳥`;
  updateOnePointAccent(elements.birdAccent, chord);
  elements.fingeringImage.src = assetPath(chord.fingering_asset);
  elements.fingeringImage.alt = `${chord.display_name}のウクレレ運指`;
  elements.learningNote.textContent = chord.learning_note;
  elements.memoryHint.textContent = chord.memory_hint;
}

function renderCompare() {
  renderedCompareKey = filterKey();
  elements.compareGrid.innerHTML = "";
  elements.playCompare.disabled = !chordData.length;
  elements.compareNote.textContent = compareNoteForCurrentStep();
  if (!chordData.length) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "この条件のコードは、いまの森では見つからなかった。";
    elements.compareGrid.appendChild(empty);
    return;
  }
  chordData.forEach((chord) => {
    const card = document.createElement("article");
    card.className = "compare-card";
    card.setAttribute("style", keyStyle(chord));
    card.innerHTML = `
      <div class="compare-bird-wrap">
        <img class="compare-bird" src="${assetPath(characterAssetFor(chord))}" alt="${chord.display_name}のCodori鳥" loading="lazy">
        ${onePointAccentMarkup(chord)}
      </div>
      <div class="compare-name">
        <strong>${chord.display_name}</strong>
        <span class="compare-key-chip">${rootForChord(chord)}</span>
        <button class="icon-button" type="button" aria-label="${chord.display_name}を再生">▶</button>
      </div>
      <p>${chord.learning_note}</p>
      ${chord.progression_hint ? `<p class="route-note">${chord.progression_hint}</p>` : ""}
      <img class="compare-fingering" src="${assetPath(chord.fingering_asset)}" alt="${chord.display_name}のウクレレ運指" loading="lazy">
    `;
    card.querySelector("button").addEventListener("click", () => playChord(chord));
    elements.compareGrid.appendChild(card);
  });
}

function compareNoteForCurrentStep() {
  if (!isPracticeMode()) {
    return "図鑑の検索結果を、表示中の先頭8コードまで順番に聞く。気になるコードは1枚ずつもう一度聞ける。";
  }
  if (chordData.length > 8) {
    return `${activePracticeStage.short_title}の先頭8コードまで順番に聞く。多いStageは、気になるカードを1枚ずつ聞き直す。`;
  }
  return `${activePracticeStage.short_title}の${chordData.length}コードを順番に聞いて、音・鳥・運指の違いを比べる。`;
}

function renderQuiz() {
  const chord = chordData[quizIndex];
  quizHasPlayed = false;
  quizHasAnswered = false;
  if (!chord) {
    elements.quizImage.removeAttribute("src");
    elements.quizImage.alt = "条件に合うCodori鳥はまだ見つかりません";
    elements.quizAccent.innerHTML = "";
    elements.quizAnswerDetail.classList.add("is-hidden");
    elements.nextQuiz.disabled = true;
    elements.playQuiz.disabled = true;
    elements.playRootAssist.disabled = true;
    elements.quizScore.textContent = `${quizCorrectCount} / ${quizAnsweredCount}`;
    elements.quizResult.textContent = "この条件では音あてできるコードが見つからなかった。";
    elements.quizOptions.innerHTML = "";
    return;
  }
  applyKeyColor(document.querySelector(".quiz-panel"), chord);
  applyKeyColor(document.querySelector(".quiz-visual"), chord);
  elements.playQuiz.disabled = false;
  elements.playRootAssist.disabled = false;
  elements.quizImage.src = assetPath(characterAssetFor(chord));
  elements.quizImage.alt = `${chord.display_name}のCodori鳥`;
  updateOnePointAccent(elements.quizAccent, chord);
  elements.quizAnswerDetail.classList.add("is-hidden");
  elements.nextQuiz.disabled = true;
  elements.quizAnswerName.textContent = chord.display_name;
  elements.quizAnswerNote.textContent = chord.learning_note;
  elements.quizFingeringImage.src = assetPath(chord.fingering_asset);
  elements.quizFingeringImage.alt = `${chord.display_name}のウクレレ運指`;
  elements.playQuiz.classList.remove("is-hidden");
  document.querySelector(".quiz-listen-label").classList.remove("is-hidden");
  document.querySelector(".quiz-listen-label").textContent = "音をきく";
  elements.quizScore.textContent = `${quizCorrectCount} / ${quizAnsweredCount}`;
  elements.quizResult.textContent = quizPromptForCurrentStage();
  elements.quizOptions.innerHTML = "";

  const optionLimit = Math.max(1, (activePracticeStage?.quiz_option_count || 6) - 1);
  const optionPool = shuffle(chordData.filter((option) => option.code_id !== chord.code_id))
    .slice(0, Math.min(optionLimit, chordData.length - 1));
  shuffle([chord, ...optionPool]).forEach((option) => {
    const button = document.createElement("button");
    button.className = "quiz-option";
    button.type = "button";
    button.disabled = true;
    button.textContent = option.display_name;
    button.addEventListener("click", () => checkQuizAnswer(button, option.code_id === chord.code_id));
    elements.quizOptions.appendChild(button);
  });
}

async function setChordSet(setId) {
  const nextSet = chordSets[setId];
  if (!nextSet || (nextSet.id === activeSet.id && !isPracticeMode())) {
    return;
  }

  activePracticeStage = null;
  activeSet = nextSet;
  saveLastLocation();
  activeFilters = {
    root: ALL_FILTER,
    family: ALL_FILTER,
    search: ""
  };
  currentIndex = 0;
  resetQuizState();
  renderedCompareKey = "";
  activeProgressionIndex = 0;
  await loadChordData();
  renderFilterPanel();
  chordData = filteredChordData();
  renderFilterSummary();
  quizIndex = chooseNextQuizIndex();
  renderSetChrome();
  renderPracticeStageChrome();
  updateTabAvailability();
  renderCard();
  renderQuiz();
  if (activeView === "compare") {
    renderCompare();
  }
  renderProgression();
}

function renderPracticeStageChrome() {
  elements.practiceStageButtons.innerHTML = "";
  const recommendedStages = practiceStages.filter((stage) => recommendedStageNumbers.includes(stage.stage_number));
  const moreStages = practiceStages.filter((stage) => !recommendedStageNumbers.includes(stage.stage_number));

  renderPracticeStageGroup("おすすめの道", "まずはここから", recommendedStages);
  renderPracticeStageGroup("もっと歩く森", "あとで聞く", moreStages);

  if (!activePracticeStage) {
    elements.practiceStageDescription.textContent = "図鑑の森を見ているよ。練習するときは上のStageを選んでね。";
    elements.practiceStageMood.textContent = "コードを探すときは図鑑、覚えるときは練習の森。";
    elements.stageNumberNote.textContent = "練習はStage 0〜10、探すときは図鑑の森へ。";
    elements.stageTargets.innerHTML = "";
    elements.stageTargets.classList.add("is-hidden");
    elements.stageProgress.classList.add("is-hidden");
    return;
  }

  elements.practiceStageDescription.textContent = activePracticeStage.description;
  elements.practiceStageMood.textContent = activePracticeStage.mood;
  elements.stageNumberNote.textContent = recommendedStageNumbers.includes(activePracticeStage.stage_number)
    ? "おすすめの道を歩いているよ。まずは0、1、2、5の順にゆっくり。"
    : "もっと歩く森を開いているよ。急がず、気になる響きからで大丈夫。";
  renderStageTargets();
  elements.stageProgress.classList.remove("is-hidden");
  renderPracticeProgress();
}

function renderStageTargets() {
  elements.stageTargets.innerHTML = "";
  elements.stageTargets.classList.remove("is-hidden");
  chordData.forEach((chord, index) => {
    const button = document.createElement("button");
    button.className = "stage-target-chip";
    button.type = "button";
    button.textContent = chord.display_name;
    button.setAttribute("style", keyStyle(chord));
    button.setAttribute("aria-label", `${chord.display_name}の音カードへ`);
    button.addEventListener("click", () => {
      currentIndex = index;
      renderCard();
      updateStageProgress();
      setView("card");
    });
    elements.stageTargets.appendChild(button);
  });
}

function renderPracticeStageGroup(title, badge, stages) {
  if (!stages.length) {
    return;
  }
  const heading = document.createElement("div");
  heading.className = "practice-stage-group-heading";
  heading.innerHTML = `
    <span>${title}</span>
    <small>${badge}</small>
  `;
  elements.practiceStageButtons.appendChild(heading);

  stages.forEach((stage) => {
    const progress = stageProgress(stage.id);
    const stageProgressItems = progressItemsForStage(stage);
    const completedCount = completedItemsForStage(stage, progress).length;
    const isRecommended = recommendedStageNumbers.includes(stage.stage_number);
    const button = document.createElement("button");
    button.className = "practice-stage-button";
    button.type = "button";
    button.dataset.stageId = stage.id;
    button.classList.toggle("is-recommended", isRecommended);
    button.classList.toggle("is-more-stage", !isRecommended);
    button.classList.toggle("is-active", activePracticeStage?.id === stage.id);
    button.innerHTML = `
      <span class="stage-label-line">
        <span>${stage.label}</span>
        <em>${isRecommended ? "おすすめ" : "もっと歩く"}</em>
      </span>
      <strong>${stage.short_title}</strong>
      <small>${stage.code_ids.length}音 / ${stage.progressions.length ? "流れも聞く" : "まず1羽ずつ"} / 羽あと${completedCount}/${stageProgressItems.length}</small>
    `;
    button.addEventListener("click", () => setPracticeStage(stage.id));
    elements.practiceStageButtons.appendChild(button);
  });
}

function renderPracticeProgress() {
  if (!isPracticeMode()) {
    return;
  }
  const progress = stageProgress();
  const availableItems = progressItemsForStage();
  const completed = completedItemsForStage(activePracticeStage, progress);
  elements.stageProgressSummary.textContent = completed.length
    ? `羽あと ${completed.length} / ${availableItems.length}。${completed.map((item) => item.label).join("・")} がついたよ。`
    : "まだ羽あとなし。まずは音を聞いてみよう。";
  elements.stageContinue.textContent = stageContinueText(progress);
  elements.resetStageProgress.disabled = !hasStageTrail(progress);
  elements.stageProgressBadges.innerHTML = "";
  availableItems.forEach((item) => {
    const badge = document.createElement("span");
    badge.className = "stage-progress-badge";
    badge.classList.toggle("is-done", Boolean(progress[item.key]));
    badge.textContent = progress[item.key] ? `${item.label} 済` : item.label;
    elements.stageProgressBadges.appendChild(badge);
  });
  renderNextStageGuide(progress);
}

function renderNextStageGuide(progress) {
  const isComplete = isStageComplete(activePracticeStage, progress);
  if (!isComplete) {
    elements.nextStageGuide.classList.add("is-hidden");
    return;
  }

  const nextStage = nextStageAfter();
  elements.nextStageMessage.textContent = nextStageMessageFor(nextStage);
  elements.nextStageButton.textContent = nextStage ? `${nextStage.short_title}へ進む` : "図鑑でさがす";
  elements.nextStageButton.dataset.nextStageId = nextStage?.id || "";
  elements.nextStageGuide.classList.remove("is-hidden");
}

function resetCurrentStageProgress() {
  if (!isPracticeMode()) {
    return;
  }
  const message = `${activePracticeStage.label}「${activePracticeStage.short_title}」の羽あとを消しますか？\nこの端末に残っている、聞いた・音あて・進行の記録だけを消します。`;
  if (!window.confirm(message)) {
    return;
  }

  delete practiceProgress.stages[activePracticeStage.id];
  if (practiceProgress.last?.stageId === activePracticeStage.id) {
    practiceProgress.last = null;
  }
  savePracticeProgress();
  renderPracticeStageChrome();
}

function restorePracticePosition() {
  if (!isPracticeMode()) {
    return;
  }
  const progress = stageProgress();
  const last = practiceProgress.last?.stageId === activePracticeStage.id
    ? practiceProgress.last
    : {};
  const restoredCardIndex = Number.isFinite(progress.lastCardIndex)
    ? progress.lastCardIndex
    : last.cardIndex;
  const restoredProgressionIndex = Number.isFinite(progress.lastProgressionIndex)
    ? progress.lastProgressionIndex
    : last.progressionIndex;

  currentIndex = clampIndex(restoredCardIndex, chordData.length);
  activeProgressionIndex = clampIndex(restoredProgressionIndex, activeProgressions().length);

  if (!urlParams.get("view") && progress.lastView) {
    activeView = progress.lastView;
  }
}

function clampIndex(value, length) {
  if (!length) {
    return 0;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.min(Math.max(Math.trunc(number), 0), length - 1);
}

function setPracticeStage(stageId) {
  const nextStage = practiceStages.find((stage) => stage.id === stageId);
  if (!nextStage) {
    return;
  }

  activePracticeStage = nextStage;
  activeView = activeView === "progression" && !activePracticeStage.progressions.length ? "card" : activeView;
  fullChordData = resolveStageCodes(activePracticeStage);
  chordData = [...fullChordData];
  currentIndex = 0;
  activeProgressionIndex = 0;
  activeFilters = {
    root: ALL_FILTER,
    family: ALL_FILTER,
    search: ""
  };
  resetQuizState();
  renderedCompareKey = "";
  restorePracticePosition();
  quizIndex = chooseNextQuizIndex();
  saveLastLocation();
  renderPracticeStageChrome();
  renderSetChrome();
  renderFilterPanel();
  updateTabAvailability();
  renderCard();
  renderQuiz();
  if (activeView === "compare") {
    renderCompare();
  }
  renderProgression();
}

function resolveStageCodes(stage) {
  return stage.code_ids
    .map((codeId) => practiceCatalog.get(codeId))
    .filter(Boolean)
    .map((chord) => ({ ...chord }));
}

function activeProgressions() {
  if (!activePracticeStage?.progressions?.length) {
    return [];
  }
  return activePracticeStage.progressions;
}

function renderProgression() {
  const progressions = activeProgressions();
  elements.progressionSelector.innerHTML = "";
  elements.progressionPath.innerHTML = "";

  if (!progressions.length) {
    elements.progressionTitle.textContent = "進行はあとで";
    elements.progressionNote.textContent = "このStageは、まず1つずつ音のきもちを聞くところから。";
    elements.playProgression.disabled = true;
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "進行練習は、Stage 1 / Stage 2 / Stage 5で開くよ。";
    elements.progressionPath.appendChild(empty);
    return;
  }

  if (activeProgressionIndex >= progressions.length) {
    activeProgressionIndex = 0;
  }

  progressions.forEach((progression, index) => {
    const button = document.createElement("button");
    button.className = "progression-choice";
    button.type = "button";
    button.classList.toggle("is-active", index === activeProgressionIndex);
    button.textContent = progression.name;
    button.addEventListener("click", () => {
      activeProgressionIndex = index;
      updateStageProgress();
      renderProgression();
    });
    elements.progressionSelector.appendChild(button);
  });

  const progression = progressions[activeProgressionIndex];
  const routeChords = progression.code_ids
    .map((codeId) => practiceCatalog.get(codeId))
    .filter(Boolean);
  elements.progressionTitle.textContent = progression.code_ids.join(" → ");
  elements.progressionNote.textContent = progression.memo;
  elements.playProgression.disabled = !routeChords.length;

  routeChords.forEach((chord, index) => {
    const step = document.createElement("article");
    step.className = "progression-step";
    step.setAttribute("style", keyStyle(chord));
    step.innerHTML = `
      <div class="progression-bird-wrap">
        <img class="progression-bird" src="${assetPath(characterAssetFor(chord))}" alt="${chord.display_name}のCodori鳥" loading="lazy">
        ${onePointAccentMarkup(chord)}
      </div>
      <strong>${chord.display_name}</strong>
      <p>${chord.learning_note}</p>
      <button class="icon-button" type="button" aria-label="${chord.display_name}を再生">▶</button>
      <img class="progression-fingering" src="${assetPath(chord.fingering_asset)}" alt="${chord.display_name}のウクレレ運指" loading="lazy">
    `;
    step.querySelector("button").addEventListener("click", () => playChord(chord));
    elements.progressionPath.appendChild(step);

    if (index < routeChords.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "progression-arrow";
      arrow.textContent = "→";
      elements.progressionPath.appendChild(arrow);
    }
  });
}

function playSelectedProgression() {
  const progression = activeProgressions()[activeProgressionIndex];
  if (!progression) {
    return;
  }

  updateStageProgress({ progressionHeard: true, heard: true });
  progression.code_ids
    .map((codeId) => practiceCatalog.get(codeId))
    .filter(Boolean)
    .forEach((chord, index) => {
      window.setTimeout(() => playChord(chord, { trackProgress: false }), index * 950);
    });
}

function playSelectedCompare() {
  if (!chordData.length) {
    return;
  }

  updateStageProgress({ heard: true });
  chordData.slice(0, Math.min(chordData.length, 8)).forEach((chord, index) => {
    window.setTimeout(() => playChord(chord, { trackProgress: false }), index * 950);
  });
}

function enableQuizOptions() {
  document.querySelectorAll(".quiz-option").forEach((optionButton) => {
    optionButton.disabled = false;
  });
}

function playQuizChord() {
  if (!chordData[quizIndex]) {
    return;
  }
  quizHasPlayed = true;
  if (!quizHasAnswered) {
    enableQuizOptions();
    elements.quizResult.textContent = quizReadyPromptForCurrentStage();
  }
  playChord(chordData[quizIndex]);
}

function playRootAssist() {
  const chord = chordData[quizIndex];
  if (!chord) {
    return;
  }

  const root = rootForChord(chord);
  const frequency = ROOT_NOTE_FREQUENCIES[root] || chord.temp_audio_notes?.[0];
  if (!frequency) {
    return;
  }

  const context = getAudioContext();
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
  gain.gain.setValueAtTime(0.1, now + 0.55);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.95);

  if (!quizHasAnswered) {
    elements.quizResult.textContent = "土台の音を鳴らしたよ。そこから響きの色を聞いてみよう。";
  }
}

function checkQuizAnswer(button, isCorrect) {
  if (!quizHasPlayed) {
    elements.quizResult.textContent = "先に音をきいてみよう。";
    return;
  }

  document.querySelectorAll(".quiz-option").forEach((optionButton) => {
    optionButton.disabled = true;
  });
  quizHasAnswered = true;
  updateStageProgress({ quizzed: true });
  elements.nextQuiz.disabled = false;
  elements.playQuiz.classList.remove("is-hidden");
  document.querySelector(".quiz-listen-label").textContent = "もう一度きく";
  elements.quizAnswerDetail.classList.remove("is-hidden");
  quizAnsweredCount += 1;

  if (isCorrect) {
    quizCorrectCount += 1;
    button.classList.add("is-correct");
    elements.quizResult.textContent = "いいね。音、コード名、きもちが少しつながった。";
    playChord(chordData[quizIndex]);
  } else {
    button.classList.add("is-wrong");
    elements.quizResult.textContent = `だいじょうぶ。答えは ${chordData[quizIndex].display_name}。もう一度、音のきもちを聞いてみよう。`;
    const correct = [...document.querySelectorAll(".quiz-option")]
      .find((optionButton) => optionButton.textContent === chordData[quizIndex].display_name);
    correct.classList.add("is-correct");
  }
  elements.quizScore.textContent = `${quizCorrectCount} / ${quizAnsweredCount}`;
}

function setView(viewName) {
  if (viewName === "progression" && isPracticeMode() && !activeProgressions().length) {
    viewName = "card";
  }
  activeView = viewName;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === viewName);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `${viewName}-view`);
  });
  if (viewName === "compare" && renderedCompareKey !== filterKey()) {
    renderCompare();
  }
  if (viewName === "progression") {
    renderProgression();
  }
  updateModeGuide();
  saveLastLocation();
}

function assetPath(path) {
  if (path.startsWith("../") || path.startsWith("./")) {
    return path;
  }
  return `../${path}`;
}

function characterAssetFor(chord) {
  if (useActionCandidate && ACTION_CHARACTER_ASSETS[chord.family]) {
    return ACTION_CHARACTER_ASSETS[chord.family];
  }
  return chord.character_asset;
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function chooseNextQuizIndex() {
  if (chordData.length < 2) {
    return 0;
  }

  let nextIndex = Math.floor(Math.random() * chordData.length);
  while (nextIndex === lastQuizIndex) {
    nextIndex = Math.floor(Math.random() * chordData.length);
  }
  lastQuizIndex = nextIndex;
  return nextIndex;
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

async function playChord(chord, options = {}) {
  if (options.trackProgress !== false) {
    updateStageProgress({ heard: true });
  }
  if (await playAudioFile(chord)) {
    return;
  }
  playSyntheticChord(chord);
}

async function playAudioFile(chord) {
  if (!chord.sound_file_ready || !chord.sound_file || missingAudioFiles.has(chord.sound_file)) {
    return false;
  }

  const soundUrl = assetPath(chord.sound_file);
  try {
    const response = await fetch(soundUrl, { method: "HEAD" });
    if (!response.ok) {
      missingAudioFiles.add(chord.sound_file);
      return false;
    }
    const audio = new Audio(soundUrl);
    await audio.play();
    return true;
  } catch (error) {
    missingAudioFiles.add(chord.sound_file);
    return false;
  }
}

function playSyntheticChord(chord) {
  const context = getAudioContext();
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.16, now + 0.04);
  master.gain.setValueAtTime(0.16, now + 1.15);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
  master.connect(context.destination);

  chord.temp_audio_notes.forEach((frequency, index) => {
    const start = now + index * 0.045;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
    gain.gain.setValueAtTime(0.13, start + 1.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.5);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + 2.6);
  });
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

document.querySelectorAll(".set-button").forEach((button) => {
  button.addEventListener("click", () => setChordSet(button.dataset.set));
});

elements.chordSearch.addEventListener("input", (event) => {
  activeFilters.search = event.target.value;
  applyFilters();
});

elements.clearSearch.addEventListener("click", () => {
  activeFilters.search = "";
  applyFilters();
  elements.chordSearch.focus();
});

elements.playCurrent.addEventListener("click", () => playChord(chordData[currentIndex]));
elements.playCompare.addEventListener("click", playSelectedCompare);
elements.playQuiz.addEventListener("click", playQuizChord);
elements.playRootAssist.addEventListener("click", playRootAssist);
elements.playProgression.addEventListener("click", playSelectedProgression);
elements.resetStageProgress.addEventListener("click", resetCurrentStageProgress);
elements.nextStageButton.addEventListener("click", () => {
  const nextStageId = elements.nextStageButton.dataset.nextStageId;
  if (nextStageId) {
    setPracticeStage(nextStageId);
    return;
  }
  setChordSet("all-main-chords");
});
elements.openCatalog.addEventListener("click", () => setChordSet("all-main-chords"));
elements.prevCard.addEventListener("click", () => {
  if (!chordData.length) {
    return;
  }
  currentIndex = (currentIndex - 1 + chordData.length) % chordData.length;
  updateStageProgress();
  renderCard();
});
elements.nextCard.addEventListener("click", () => {
  if (!chordData.length) {
    return;
  }
  currentIndex = (currentIndex + 1) % chordData.length;
  updateStageProgress();
  renderCard();
});
elements.nextQuiz.addEventListener("click", () => {
  if (!chordData.length) {
    return;
  }
  quizIndex = chooseNextQuizIndex();
  saveLastLocation();
  renderQuiz();
});

async function loadChordData() {
  try {
    const response = await fetch(activeSet.dataPath);
    if (!response.ok) {
      throw new Error(`Failed to load chord data: ${response.status}`);
    }
    fullChordData = await response.json();
  } catch (error) {
    console.warn("Using bundled chord data.", error);
    fullChordData = [...chordData];
  }
}

async function loadPracticeResources() {
  const [stageResponse, ...sourceResponses] = await Promise.all([
    fetch(PRACTICE_STAGE_PATH),
    ...PRACTICE_SOURCE_PATHS.map((path) => fetch(path))
  ]);
  if (!stageResponse.ok) {
    throw new Error(`Failed to load practice stages: ${stageResponse.status}`);
  }

  practiceStages = await stageResponse.json();
  const sourceData = await Promise.all(sourceResponses.map(async (response) => {
    if (!response.ok) {
      return [];
    }
    return response.json();
  }));
  practiceCatalog = new Map();
  sourceData.flat().forEach((chord) => {
    practiceCatalog.set(chord.display_name, chord);
    practiceCatalog.set(chord.code_id, chord);
  });
}

async function init() {
  await loadPracticeResources();
  await loadChordData();
  activePracticeStage = initialPracticeStage();
  if (activePracticeStage) {
    fullChordData = resolveStageCodes(activePracticeStage);
  }
  applyRequestedFilters();
  renderFilterPanel();
  chordData = filteredChordData();
  renderFilterSummary();
  restorePracticePosition();
  quizIndex = chooseNextQuizIndex();
  renderPracticeStageChrome();
  renderSetChrome();
  updateTabAvailability();
  renderCard();
  renderQuiz();
  renderProgression();
  setView(activeView);
}

init();

function applyRequestedFilters() {
  if (!isFilterableSet()) {
    return;
  }

  const roots = new Set(uniqueValues("root"));
  const families = new Set(uniqueValues("family"));
  activeFilters = {
    root: roots.has(requestedRootFilter) ? requestedRootFilter : ALL_FILTER,
    family: families.has(requestedFamilyFilter) ? requestedFamilyFilter : ALL_FILTER,
    search: requestedSearchFilter
  };
}

function initialPracticeStage() {
  if (requestedStageId === "none" || (!requestedStageId && requestedSetId)) {
    return null;
  }

  if (!requestedStageId) {
    if (!requestedSetId && savedProgress.last?.mode === "catalog") {
      return null;
    }
    if (savedProgress.last?.mode === "practice") {
      return practiceStages.find((stage) => stage.id === savedProgress.last.stageId) || practiceStages[0] || null;
    }
    return practiceStages[0] || null;
  }

  return practiceStages.find((stage) => {
    return stage.id === requestedStageId
      || String(stage.stage_number) === requestedStageId
      || stage.label.toLowerCase() === requestedStageId.toLowerCase();
  }) || practiceStages[0] || null;
}
