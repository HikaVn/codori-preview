// れんしゅう（録音採点）モード
// - コード練習: 弾いた音をマイク録音し、タイミング・正誤・綺麗さを採点
// - 歌練習: 歌をマイク録音し、メロディとの音程を採点
// - キャリブレーション（理想の響き）: ウクレレの減衰を踏まえ、綺麗に弾いた基準を100%にする
// - 練習記録（localStorage）と、ふわふわシマエナガ（こどり）の励ましアドバイス
// song.js / dsp.js の後に読み込む古典スクリプト（グローバル共有）。

const PRACTICE_STORAGE_KEY = "codori.songPractice.records.v1";
const CALIBRATION_STORAGE_KEY = "codori.songPractice.calibration.v1";

const practiceEl = {
  tab: document.querySelector("#tab-practice"),
  view: document.querySelector("#practice-view"),
  modeButtons: document.querySelectorAll(".practice-mode-button"),
  songName: document.querySelector("#practice-song-name"),
  status: document.querySelector("#practice-status"),
  recordButton: document.querySelector("#practice-record"),
  stopButton: document.querySelector("#practice-stop"),
  countOverlay: document.querySelector("#practice-count"),
  calibPanel: document.querySelector("#calibration-panel"),
  calibChord: document.querySelector("#calibration-chord"),
  calibButton: document.querySelector("#calibration-record"),
  calibStatus: document.querySelector("#calibration-status"),
  birdImg: document.querySelector("#practice-bird-img"),
  result: document.querySelector("#practice-result"),
  scoreBig: document.querySelector("#practice-score"),
  scoreStars: document.querySelector("#practice-stars"),
  metrics: document.querySelector("#practice-metrics"),
  advice: document.querySelector("#practice-advice"),
  records: document.querySelector("#practice-records")
};

const BIRD_BASE = "../../assets/app/characters/action-candidate-integrated-v3/";

let practiceMode = "chord"; // "chord" | "singing"
let practiceRecorder = null; // { stream, source, processor, chunks, recStartCtx }
let practiceTransport = null; // { rafId, timer, endBeat, t0, beat0CtxTime, spb }
let practiceBusy = false;

// ===== 記録・キャリブレーションの保存 =====

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(PRACTICE_STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function saveRecord(entry) {
  const all = loadRecords();
  const key = `${entry.songId || "current"}:${entry.mode}`;
  const list = all[key] || [];
  list.push(entry);
  all[key] = list.slice(-50);
  try {
    localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(all));
  } catch (error) {
    // 保存できなくても続行
  }
}

function recordsFor(mode) {
  const all = loadRecords();
  const key = `${song?.id || "current"}:${mode}`;
  return all[key] || [];
}

function loadCalibration() {
  try {
    return JSON.parse(localStorage.getItem(CALIBRATION_STORAGE_KEY)) || null;
  } catch (error) {
    return null;
  }
}

function saveCalibration(cal) {
  try {
    localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(cal));
  } catch (error) {
    // ignore
  }
}

// ===== マイク録音 =====

async function startRecorder() {
  const ctx = ensureAudioContext();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
  });
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  processor.onaudioprocess = (event) => {
    chunks.push(Float32Array.from(event.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  // 出力には繋がない（ハウリング防止）。ScriptProcessorを動かすため無音destinationへ。
  const sink = ctx.createGain();
  sink.gain.value = 0;
  processor.connect(sink);
  sink.connect(ctx.destination);
  const recStartCtx = ctx.currentTime;
  practiceRecorder = { stream, source, processor, sink, chunks, recStartCtx, sampleRate: ctx.sampleRate };
  return practiceRecorder;
}

function stopRecorder() {
  if (!practiceRecorder) {
    return null;
  }
  const { stream, source, processor, sink, chunks, recStartCtx, sampleRate } = practiceRecorder;
  try {
    processor.disconnect();
    source.disconnect();
    sink.disconnect();
    stream.getTracks().forEach((track) => track.stop());
  } catch (error) {
    // ignore
  }
  practiceRecorder = null;
  let total = 0;
  chunks.forEach((c) => { total += c.length; });
  const samples = new Float32Array(total);
  let offset = 0;
  chunks.forEach((c) => { samples.set(c, offset); offset += c.length; });
  return { samples, recStartCtx, sampleRate };
}

// ===== 練習の伴奏トランスポート（カウントイン＋メトロノーム＋ガイド） =====

function startTransport(onEnd) {
  const ctx = audioCtx;
  computePositions();
  const beatsPerBar = Number(song.beatsPerBar) || 4;
  const spb = 60 / (Number(song.bpm) || 100);
  const countIn = beatsPerBar;
  const t0 = ctx.currentTime + 0.35;
  const beat0CtxTime = t0 + countIn * spb;
  const totalBeats = positioned.totalBeats;

  // カウントイン＋拍のメトロノーム
  for (let b = -countIn; b <= totalBeats; b += 1) {
    const time = beat0CtxTime + b * spb;
    if (time >= ctx.currentTime) {
      metronomeClick(time, ((b % beatsPerBar) + beatsPerBar) % beatsPerBar === 0);
    }
  }
  // 歌練習では伴奏コードを鳴らしてガイドにする
  if (practiceMode === "singing") {
    positioned.chordEvents.forEach((event) => {
      const time = beat0CtxTime + event.startBeat * spb;
      if (time >= ctx.currentTime) {
        strumChord(transposeChord(event.chord, song.transpose), time, event.beats, 0.6);
      }
    });
  }

  practiceTransport = { t0, beat0CtxTime, spb, endBeat: totalBeats, onEnd };
  const tick = () => {
    if (!practiceTransport) {
      return;
    }
    const beat = (ctx.currentTime - beat0CtxTime) / spb;
    if (beat < 0) {
      practiceEl.countOverlay.classList.remove("is-hidden");
      practiceEl.countOverlay.textContent = String(Math.ceil(-beat));
    } else {
      practiceEl.countOverlay.classList.add("is-hidden");
      // 拍に合わせて鳥がはずむ
      const beatPhase = beat - Math.floor(beat);
      practiceEl.birdImg.style.transform = `translateY(${-6 * Math.max(0, 1 - beatPhase * 3)}px)`;
    }
    if (beat > totalBeats + 0.5) {
      finishTake();
      return;
    }
    practiceTransport.rafId = requestAnimationFrame(tick);
  };
  practiceTransport.rafId = requestAnimationFrame(tick);
}

function stopTransport() {
  if (practiceTransport?.rafId) {
    cancelAnimationFrame(practiceTransport.rafId);
  }
  practiceTransport = null;
  practiceEl.countOverlay.classList.add("is-hidden");
  practiceEl.birdImg.style.transform = "";
}

// ===== 録音テイクの開始・終了 =====

async function startTake() {
  if (practiceBusy) {
    return;
  }
  if (!song || !song.events?.length) {
    practiceEl.status.textContent = "先にエディットか取り込みで曲を用意してね。";
    return;
  }
  if (practiceMode === "singing" && !(song.melody && song.melody.length)) {
    practiceEl.status.textContent = "歌練習にはメロディが必要だよ。取り込みで作るか、エディットで足してね。";
    return;
  }
  practiceBusy = true;
  practiceEl.recordButton.classList.add("is-hidden");
  practiceEl.stopButton.classList.remove("is-hidden");
  practiceEl.result.classList.add("is-hidden");
  practiceEl.status.textContent = "マイクの準備中…";
  try {
    await startRecorder();
  } catch (error) {
    practiceEl.status.textContent = "マイクを使えなかったよ。ブラウザのマイク許可を確認してね。";
    resetTakeUi();
    practiceBusy = false;
    return;
  }
  practiceEl.status.textContent = practiceMode === "chord"
    ? "カウントのあと、流れるコードを弾いてね。"
    : "カウントのあと、ガイドに合わせて歌ってね。";
  startTransport();
}

function finishTake() {
  stopTransport();
  const recording = stopRecorder();
  resetTakeUi();
  practiceBusy = false;
  if (!recording || recording.samples.length < recording.sampleRate * 0.5) {
    practiceEl.status.textContent = "録音が短すぎたみたい。もう一度ためしてみよう。";
    return;
  }
  practiceEl.status.textContent = "採点中…";
  // 重い処理の前に一度描画を返す
  window.setTimeout(() => analyzeTake(recording), 30);
}

function resetTakeUi() {
  practiceEl.recordButton.classList.remove("is-hidden");
  practiceEl.stopButton.classList.add("is-hidden");
}

function manualStop() {
  if (!practiceBusy) {
    return;
  }
  finishTake();
}

// ===== 採点 =====

let practiceTransportSnapshot = null;

function analyzeTake(recording) {
  // トランスポートの時刻情報は finishTake で stopTransport される前にスナップ済み
  const snap = practiceTransportSnapshot;
  if (!snap) {
    practiceEl.status.textContent = "採点に必要な情報が取れなかった。もう一度ためしてみよう。";
    return;
  }
  const { samples, recStartCtx, sampleRate } = recording;
  const spb = snap.spb;
  const beat0CtxTime = snap.beat0CtxTime;
  const recTimeToBeat = (sec) => ((recStartCtx + sec) - beat0CtxTime) / spb;
  const beatToRec = (beat) => (beat0CtxTime - recStartCtx) + beat * spb;

  let result;
  if (practiceMode === "singing") {
    const melody = trackMelody(samples, sampleRate, null, { clarityThreshold: 0.5 });
    Promise.resolve(melody).then((mel) => {
      const recPitchBeats = [];
      mel.pitches.forEach((midi, f) => {
        if (midi !== null) {
          recPitchBeats.push({ beat: recTimeToBeat(f / mel.frameRate), midi });
        }
      });
      result = scoreSingingPerformance(recPitchBeats, song.melody, { transpose: song.transpose || 0 });
      presentResult(result);
    });
    return;
  }

  // コード練習
  const calibration = loadCalibration();
  const onsetSec = detectOnsets(samples, sampleRate, { sensitivity: calibration?.onsetSensitivity ?? 1.0 });
  const onsetBeats = onsetSec.map(recTimeToBeat);
  const { chroma, frames, frameRate } = computeChroma(samples, sampleRate, { minHz: 180, maxHz: 3500 });
  const decayBeats = calibration?.decaySec ? calibration.decaySec / spb : 1.0;
  const windowedEvents = positioned.chordEvents.map((event) => ({
    startBeat: event.startBeat,
    beats: Math.min(Number(event.beats) || 1, decayBeats),
    chord: transposeChord(event.chord, song.transpose)
  }));
  const segChroma = segmentChromaVectors(chroma, frames, frameRate, windowedEvents, beatToRec);
  const scoreEvents = positioned.chordEvents.map((event) => ({
    startBeat: event.startBeat,
    chord: transposeChord(event.chord, song.transpose)
  }));
  result = scoreChordPerformance(onsetBeats, scoreEvents, {
    segmentChroma: segChroma,
    cleannessReference: calibration?.refCleanness
  });
  presentResult(result);
}

function presentResult(result) {
  if (!result) {
    practiceEl.status.textContent = "うまく採点できなかった。もう一度ゆっくりためしてみよう。";
    return;
  }
  practiceEl.status.textContent = "";
  practiceEl.result.classList.remove("is-hidden");
  practiceEl.scoreBig.textContent = String(result.score);
  practiceEl.scoreStars.textContent = starsFor(result.score);

  const metrics = [];
  if (result.kind === "chord") {
    metrics.push(["タイミング", `${result.timing}`]);
    metrics.push(["弾けた割合", `${result.coverage}%`]);
    if (result.correctness !== undefined) {
      metrics.push(["コードの正しさ", `${result.correctness}%`]);
      metrics.push(["響きの綺麗さ", `${result.cleanness}%`]);
    }
  } else {
    metrics.push(["音程の正確さ", `${result.pitchAccuracy}%`]);
    metrics.push(["歌えた割合", `${result.coverage}%`]);
  }
  practiceEl.metrics.innerHTML = metrics
    .map(([label, value]) => `<div class="metric-chip"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  const advice = buildShimaenagaAdvice(result);
  practiceEl.birdImg.src = BIRD_BASE + advice.birdAsset;
  practiceEl.advice.innerHTML = `
    <p class="advice-headline">${escapeHtml(advice.headline)}</p>
    ${advice.points.map((p) => `<p class="advice-point">🪶 ${escapeHtml(p)}</p>`).join("")}
    ${advice.tips.map((t) => `<p class="advice-tip">💡 ${escapeHtml(t)}</p>`).join("")}
  `;

  saveRecord({
    songId: song?.id || "current",
    songTitle: song?.title || "",
    mode: practiceMode,
    score: result.score,
    at: new Date().toISOString()
  });
  renderRecords();
}

function starsFor(score) {
  const full = Math.round(score / 20);
  return "⭐".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

// ===== ふわふわシマエナガのアドバイス =====

function buildShimaenagaAdvice(result) {
  const sections = positioned.sections || [];
  if (result.kind === "chord") {
    return chordAdvice(result, sections);
  }
  return singingAdvice(result, sections);
}

function chordAdvice(result, sections) {
  const points = [];
  const tips = [];
  let headline;
  let birdAsset = "action-major.png";

  if (result.score >= 90) {
    headline = "わぁ、ふわっふわで気持ちいい響き！すごく上手だよ〜！";
    birdAsset = "action-add9.png";
  } else if (result.score >= 70) {
    headline = "いい感じ！もうちょっとでまんまる花まるだよ、その調子！";
    birdAsset = "action-major.png";
  } else if (result.score >= 45) {
    headline = "だいじょうぶ、ちゃんと前に進んでるよ。一緒にこつこついこう！";
    birdAsset = "action-sus4.png";
  } else {
    headline = "ふわふわ、あせらなくていいよ。ゆっくりから始めよう！";
    birdAsset = "action-m7.png";
  }

  if (result.coverage < 80) {
    points.push("コードチェンジが少し間に合っていない場所があったよ。");
    tips.push("テンポを少し落として、コードが変わる前に左手を準備する練習をしてみよう。");
  }
  if (result.timing < 70) {
    points.push(`リズムがちょっと${result.rushDrag < 0 ? "走り気味（早め）" : "もたり気味（遅め）"}だったみたい。`);
    tips.push("メトロノームの音に、自分のジャラーンを“ぴったり重ねる”イメージで弾いてみよう。");
  }
  if (result.correctness !== undefined && result.correctness < 80) {
    const wrong = result.weakChords.filter((c) => c.correct === false).map((c) => c.chord);
    points.push(`押さえ違いっぽいコードがあったよ${wrong.length ? "（" + uniqueList(wrong) + "）" : ""}。`);
    tips.push("苦手なコードだけ取り出して、押さえてから1本ずつ弦を鳴らして音を確かめてみよう。");
  }
  if (result.cleanness !== undefined && result.cleanness < 65) {
    points.push("弦が少しミュートされて、響きがこもりがちだったかも。");
    tips.push("指を立てて、隣の弦に触れていないか確認。爪のあたる角度も少し変えてみてね。");
  }
  const weakSections = weakSectionsFor(result.weakChords, sections);
  if (weakSections.length && weakSections[0].count >= 2) {
    points.push(`「${weakSections[0].label}」のあたりが、いちばん伸びしろポイントだよ。`);
    tips.push(`まずは「${weakSections[0].label}」だけをループ練習。できたら全体に戻ろう。`);
  }
  if (!points.length) {
    points.push("苦手らしい苦手は見当たらないよ。安定してきてる証拠！");
    tips.push("少しテンポを上げて、同じ綺麗さで弾けるか試してみよう。");
  }
  return { headline, points, tips, birdAsset };
}

function singingAdvice(result, sections) {
  const points = [];
  const tips = [];
  let headline;
  let birdAsset = "action-major.png";

  if (result.score >= 90) {
    headline = "ぴったり！音程まんまる、聞いていてとっても気持ちいいよ〜！";
    birdAsset = "action-add9.png";
  } else if (result.score >= 70) {
    headline = "いい歌声！あと少しで音程ぴったりだよ、その調子！";
    birdAsset = "action-major.png";
  } else if (result.score >= 45) {
    headline = "うんうん、ちゃんと歌えてるよ。一緒にゆっくり合わせていこう！";
    birdAsset = "action-sus4.png";
  } else {
    headline = "だいじょうぶ、まずはガイドをよく聞くところからふわっと始めよう！";
    birdAsset = "action-m7.png";
  }

  if (result.centsTendency <= -40) {
    points.push("全体に音程が少し低め（フラット気味）だったよ。");
    tips.push("歌い出しでひと息吸って、おなかから「上から音に乗る」イメージにしてみよう。");
  } else if (result.centsTendency >= 40) {
    points.push("全体に音程が少し高め（シャープ気味）だったよ。");
    tips.push("力みを抜いて、のどをふわっと開ける感じで。肩の力を抜いてみてね。");
  }
  if (result.coverage < 80) {
    points.push("歌えていない（声が拾えていない）ところがあったよ。");
    tips.push("マイクに少し近づくか、ガイドの伴奏を小さめにして、自分の声を聞きながら歌ってみよう。");
  }
  const weakSections = weakSectionsFor(result.weakNotes, sections);
  if (weakSections.length && weakSections[0].count >= 2) {
    points.push(`「${weakSections[0].label}」のあたりが、音程の迷いやすいポイントだよ。`);
    tips.push(`「${weakSections[0].label}」だけ、ガイドと一緒にゆっくり3回歌ってみよう。`);
  }
  if (!points.length) {
    points.push("音程の崩れは少なかったよ。とても安定してる！");
    tips.push("次は表現も意識して、強弱をつけて歌ってみよう。");
  }
  return { headline, points, tips, birdAsset };
}

function uniqueList(items) {
  return [...new Set(items)].join("、");
}

// ===== キャリブレーション =====

async function startCalibration() {
  if (practiceBusy) {
    return;
  }
  practiceBusy = true;
  practiceEl.calibButton.disabled = true;
  practiceEl.calibStatus.textContent = "マイクの準備中…";
  let rec;
  try {
    rec = await startRecorder();
  } catch (error) {
    practiceEl.calibStatus.textContent = "マイクを使えなかったよ。許可を確認してね。";
    practiceEl.calibButton.disabled = false;
    practiceBusy = false;
    return;
  }
  const chord = practiceEl.calibChord.value || "C";
  const ctx = audioCtx;
  const spb = 0.9; // ゆっくり
  // 4回、ゆっくりメトロノームに合わせて弾いてもらう
  const beats = 5;
  const t0 = ctx.currentTime + 0.3;
  for (let b = 0; b < beats; b += 1) {
    metronomeClick(t0 + b * spb, b === 0);
  }
  practiceEl.calibStatus.textContent = `「${chord}」を、メトロノームに合わせて4回、綺麗に弾いてね…`;
  const durationMs = (beats + 1) * spb * 1000;
  window.setTimeout(() => {
    const recording = stopRecorder();
    practiceEl.calibButton.disabled = false;
    practiceBusy = false;
    if (!recording) {
      practiceEl.calibStatus.textContent = "録音できなかった。もう一度ためしてね。";
      return;
    }
    const cal = analyzeCalibration(recording.samples, recording.sampleRate, chord);
    if (!cal) {
      practiceEl.calibStatus.textContent = "うまく拾えなかった。もう少し大きめの音で弾いてみてね。";
      return;
    }
    cal.instrument = "ukulele";
    saveCalibration(cal);
    practiceEl.calibStatus.textContent = `キャリブレーション完了！理想の響きを覚えたよ（${cal.strums}回ぶん・減衰${cal.decaySec.toFixed(1)}秒）。`;
    updateCalibrationLabel();
  }, durationMs);
}

function updateCalibrationLabel() {
  const cal = loadCalibration();
  if (cal && practiceEl.calibStatus.textContent === "") {
    practiceEl.calibStatus.textContent = `キャリブレーション済み（${cal.chord}・減衰${Number(cal.decaySec).toFixed(1)}秒）。やり直すときは下のボタンから。`;
  }
}

// ===== 記録表示 =====

function renderRecords() {
  const records = recordsFor(practiceMode);
  if (!records.length) {
    practiceEl.records.innerHTML = "<p class=\"records-empty\">まだ記録がないよ。録音すると、ここに羽あとが残るよ。</p>";
    return;
  }
  const best = Math.max(...records.map((r) => r.score));
  const recent = records.slice(-8);
  const bars = recent
    .map((r) => `<span class="record-bar" style="height:${Math.max(6, r.score)}%" title="${r.score}点"></span>`)
    .join("");
  practiceEl.records.innerHTML = `
    <div class="records-summary">
      <span>練習回数 <strong>${records.length}</strong></span>
      <span>ベスト <strong>${best}</strong>点</span>
      <span>最近 <strong>${recent[recent.length - 1].score}</strong>点</span>
    </div>
    <div class="record-bars">${bars}</div>
  `;
}

// ===== モード・タブ =====

function setPracticeMode(mode) {
  practiceMode = mode === "singing" ? "singing" : "chord";
  practiceEl.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.practiceMode === practiceMode);
  });
  practiceEl.calibPanel.classList.toggle("is-hidden", practiceMode !== "chord");
  practiceEl.result.classList.add("is-hidden");
  practiceEl.status.textContent = practiceMode === "chord"
    ? "弾いたコードを録音して、タイミング・正しさ・響きの綺麗さを見るよ。"
    : "歌を録音して、メロディとの音程を見るよ。";
  refreshPracticeSong();
  renderRecords();
}

function refreshPracticeSong() {
  if (practiceEl.songName) {
    practiceEl.songName.textContent = song?.title || "（曲がありません）";
  }
  updateCalibrationLabel();
}

// ===== イベント =====

practiceEl.tab?.addEventListener("click", () => {
  if (typeof setMode === "function") {
    setMode("practice");
  }
  refreshPracticeSong();
  renderRecords();
});

practiceEl.modeButtons.forEach((button) => {
  button.addEventListener("click", () => setPracticeMode(button.dataset.practiceMode));
});

practiceEl.recordButton?.addEventListener("click", () => {
  // トランスポート時刻のスナップを取りつつ録音開始
  startTake().then(() => {
    if (practiceTransport) {
      practiceTransportSnapshot = {
        beat0CtxTime: practiceTransport.beat0CtxTime,
        spb: practiceTransport.spb
      };
    }
  });
});
practiceEl.stopButton?.addEventListener("click", manualStop);
practiceEl.calibButton?.addEventListener("click", startCalibration);

if (practiceEl.calibChord) {
  // 曲の最初のコード or C を初期値にする
  const init = () => {
    const first = (song?.events || []).find((e) => e.type === "chord" && e.chord);
    if (first) {
      practiceEl.calibChord.value = first.chord;
    }
  };
  init();
}
