// 音源取り込み用のDSPユーティリティ（依存なし・ブラウザ/Node両対応）
// - STFTベースのボーカル/伴奏分離（ミッド・サイド方式のセンター抽出）
// - スペクトラルフラックスからのテンポ・拍推定
// - クロマベクトル＋テンプレート照合によるコード解析
// - YINによるメロディ（ピッチ）起こし
// - 拍グリッドへのクオンタイズ

const DSP_FFT_SIZE = 2048;
const DSP_HOP = 512;
const DSP_RATE = 22050;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const CHORD_TEMPLATES = (() => {
  const shapes = [
    { suffix: "", notes: [0, 4, 7], bonus: 0.02 },
    { suffix: "m", notes: [0, 3, 7], bonus: 0.02 },
    { suffix: "7", notes: [0, 4, 7, 10], bonus: 0 },
    { suffix: "m7", notes: [0, 3, 7, 10], bonus: 0 },
    { suffix: "maj7", notes: [0, 4, 7, 11], bonus: 0 }
  ];
  const templates = [];
  for (let root = 0; root < 12; root += 1) {
    shapes.forEach((shape) => {
      const vector = new Float32Array(12);
      shape.notes.forEach((interval) => {
        vector[(root + interval) % 12] = 1;
      });
      let norm = 0;
      for (let i = 0; i < 12; i += 1) {
        norm += vector[i] * vector[i];
      }
      norm = Math.sqrt(norm);
      for (let i = 0; i < 12; i += 1) {
        vector[i] /= norm;
      }
      templates.push({ name: NOTE_NAMES[root] + shape.suffix, vector, bonus: shape.bonus });
    });
  }
  return templates;
})();

// ===== 基本処理 =====

function hannWindow(size) {
  const win = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
  }
  return win;
}

// 反復型 radix-2 FFT（in-place）
function fftInPlace(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const evenRe = re[i + k];
        const evenIm = im[i + k];
        const oddRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const oddIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = evenRe + oddRe;
        im[i + k] = evenIm + oddIm;
        re[i + k + len / 2] = evenRe - oddRe;
        im[i + k + len / 2] = evenIm - oddIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

function ifftInPlace(re, im) {
  const n = re.length;
  for (let i = 0; i < n; i += 1) {
    im[i] = -im[i];
  }
  fftInPlace(re, im);
  for (let i = 0; i < n; i += 1) {
    re[i] /= n;
    im[i] = -im[i] / n;
  }
}

function resampleLinear(data, srcRate, dstRate) {
  if (srcRate === dstRate) {
    return Float32Array.from(data);
  }
  const ratio = srcRate / dstRate;
  const length = Math.floor(data.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = data[idx] || 0;
    const b = data[idx + 1] || 0;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

function midiFromFrequency(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

// ===== 分離＋特徴抽出（1パス） =====
// mid/side信号からSTFTで「センター成分＝ボーカル」「残り＝伴奏」を推定し、
// 同時にスペクトラルフラックス（リズム解析用）とクロマ（コード解析用）を集める。

async function analyzeAudio({ mid, side, sampleRate, onProgress }) {
  const size = DSP_FFT_SIZE;
  const hop = DSP_HOP;
  const win = hannWindow(size);
  const frames = Math.max(0, Math.floor((mid.length - size) / hop) + 1);
  const half = size / 2;
  const binHz = sampleRate / size;

  const vocal = new Float32Array(mid.length);
  const inst = new Float32Array(mid.length);
  const norm = new Float32Array(mid.length);
  const flux = new Float32Array(frames);
  const chroma = new Float32Array(frames * 12);
  const prevMag = new Float32Array(half + 1);

  const mRe = new Float32Array(size);
  const mIm = new Float32Array(size);
  const sRe = new Float32Array(size);
  const sIm = new Float32Array(size);
  const vRe = new Float32Array(size);
  const vIm = new Float32Array(size);
  const iRe = new Float32Array(size);
  const iIm = new Float32Array(size);

  for (let f = 0; f < frames; f += 1) {
    const start = f * hop;
    for (let i = 0; i < size; i += 1) {
      mRe[i] = mid[start + i] * win[i];
      mIm[i] = 0;
      sRe[i] = side[start + i] * win[i];
      sIm[i] = 0;
    }
    fftInPlace(mRe, mIm);
    fftInPlace(sRe, sIm);

    let fluxSum = 0;
    for (let k = 0; k <= half; k += 1) {
      const mMag = Math.hypot(mRe[k], mIm[k]);
      const sMag = Math.hypot(sRe[k], sIm[k]);
      fluxSum += Math.max(0, mMag - prevMag[k]);
      prevMag[k] = mMag;

      const freq = k * binHz;
      let mask = 0;
      if (freq >= 140 && freq <= 5200) {
        mask = Math.min(1, Math.max(0, mMag - 1.2 * sMag) / (mMag + 1e-9));
      }
      vRe[k] = mRe[k] * mask;
      vIm[k] = mIm[k] * mask;
      iRe[k] = mRe[k] * (1 - mask) + sRe[k];
      iIm[k] = mIm[k] * (1 - mask) + sIm[k];

      if (freq >= 60 && freq <= 5000) {
        const instMag = Math.hypot(iRe[k], iIm[k]);
        const pc = ((Math.round(midiFromFrequency(freq)) % 12) + 12) % 12;
        chroma[f * 12 + pc] += instMag;
      }
    }
    flux[f] = fluxSum;

    // 負側スペクトルを共役対称で埋める
    for (let k = 1; k < half; k += 1) {
      vRe[size - k] = vRe[k];
      vIm[size - k] = -vIm[k];
      iRe[size - k] = iRe[k];
      iIm[size - k] = -iIm[k];
    }
    ifftInPlace(vRe, vIm);
    ifftInPlace(iRe, iIm);
    for (let i = 0; i < size; i += 1) {
      vocal[start + i] += vRe[i] * win[i];
      inst[start + i] += iRe[i] * win[i];
      norm[start + i] += win[i] * win[i];
    }

    if (onProgress && f % 64 === 0) {
      onProgress(f / frames);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  for (let i = 0; i < mid.length; i += 1) {
    if (norm[i] > 1e-6) {
      vocal[i] /= norm[i];
      inst[i] /= norm[i];
    }
  }

  return {
    vocal,
    inst,
    flux,
    chroma,
    frames,
    frameRate: sampleRate / hop,
    sampleRate
  };
}

// ===== テンポ・拍 =====

function estimateTempo(flux, frameRate) {
  const smoothed = new Float32Array(flux.length);
  for (let i = 0; i < flux.length; i += 1) {
    smoothed[i] = (flux[i - 1] || 0) * 0.25 + flux[i] * 0.5 + (flux[i + 1] || 0) * 0.25;
  }
  let mean = 0;
  for (let i = 0; i < smoothed.length; i += 1) {
    mean += smoothed[i];
  }
  mean /= Math.max(1, smoothed.length);
  for (let i = 0; i < smoothed.length; i += 1) {
    smoothed[i] = Math.max(0, smoothed[i] - mean);
  }

  const lagMin = Math.max(2, Math.floor((frameRate * 60) / 200));
  const lagMax = Math.min(smoothed.length - 1, Math.ceil((frameRate * 60) / 55));
  let bestLag = lagMin;
  let bestScore = -Infinity;
  const scores = new Float32Array(lagMax + 1);
  for (let lag = lagMin; lag <= lagMax; lag += 1) {
    let sum = 0;
    for (let i = 0; i + lag < smoothed.length; i += 1) {
      sum += smoothed[i] * smoothed[i + lag];
    }
    // 120BPM付近をゆるく優先する
    const bpm = (60 * frameRate) / lag;
    const pref = Math.exp(-Math.pow(Math.log2(bpm / 115), 2) / 0.9);
    scores[lag] = sum * pref;
    if (scores[lag] > bestScore) {
      bestScore = scores[lag];
      bestLag = lag;
    }
  }
  // 放物線補間で小数ラグへ
  let lag = bestLag;
  if (bestLag > lagMin && bestLag < lagMax) {
    const a = scores[bestLag - 1];
    const b = scores[bestLag];
    const c = scores[bestLag + 1];
    const denom = a - 2 * b + c;
    if (Math.abs(denom) > 1e-9) {
      lag = bestLag + (0.5 * (a - c)) / denom;
    }
  }
  let bpm = (60 * frameRate) / lag;
  while (bpm < 70) bpm *= 2;
  while (bpm > 185) bpm /= 2;

  // 拍の位相：1周期内をずらして、拍位置のフラックス和が最大になるオフセットを探す
  const period = (60 * frameRate) / bpm;
  let bestPhase = 0;
  let bestPhaseScore = -Infinity;
  for (let phase = 0; phase < period; phase += 0.25) {
    let sum = 0;
    for (let beat = phase; beat < smoothed.length; beat += period) {
      sum += smoothed[Math.round(beat)] || 0;
    }
    if (sum > bestPhaseScore) {
      bestPhaseScore = sum;
      bestPhase = phase;
    }
  }
  return { bpm, beatOffsetSec: bestPhase / frameRate };
}

// ===== コード =====

function beatChromaVectors(chroma, frames, frameRate, bpm, beatOffsetSec, beatCount) {
  const framesPerBeat = (frameRate * 60) / bpm;
  const startFrame = beatOffsetSec * frameRate;
  const vectors = [];
  for (let beat = 0; beat < beatCount; beat += 1) {
    const from = Math.max(0, Math.round(startFrame + beat * framesPerBeat));
    const to = Math.min(frames, Math.round(startFrame + (beat + 1) * framesPerBeat));
    const vector = new Float32Array(12);
    for (let f = from; f < to; f += 1) {
      for (let pc = 0; pc < 12; pc += 1) {
        vector[pc] += chroma[f * 12 + pc];
      }
    }
    let norm = 0;
    for (let pc = 0; pc < 12; pc += 1) {
      norm += vector[pc] * vector[pc];
    }
    norm = Math.sqrt(norm);
    if (norm > 1e-9) {
      for (let pc = 0; pc < 12; pc += 1) {
        vector[pc] /= norm;
      }
    }
    vectors.push(vector);
  }
  return vectors;
}

// 拍ごとのクロマに対して、テンプレート相関＋切り替えペナルティの動的計画法でコード列を推定
function detectChordsFromChroma(beatVectors, changePenalty = 0.1) {
  const labels = CHORD_TEMPLATES;
  const states = labels.length + 1; // 最後は「無音/不明」
  const beats = beatVectors.length;
  if (!beats) {
    return [];
  }
  const score = new Float32Array(states);
  const prevScore = new Float32Array(states);
  const backPointers = [];

  for (let beat = 0; beat < beats; beat += 1) {
    const vector = beatVectors[beat];
    let energy = 0;
    for (let pc = 0; pc < 12; pc += 1) {
      energy += vector[pc];
    }
    const back = new Int16Array(states);
    for (let s = 0; s < states; s += 1) {
      let emit;
      if (s === states - 1) {
        emit = energy < 0.2 ? 0.6 : 0.25; // 無音なら不明が有利
      } else {
        let dot = 0;
        for (let pc = 0; pc < 12; pc += 1) {
          dot += vector[pc] * labels[s].vector[pc];
        }
        emit = dot + labels[s].bonus;
      }
      if (beat === 0) {
        score[s] = emit;
        back[s] = -1;
        continue;
      }
      let best = prevScore[s]; // 継続はペナルティなし
      let bestPrev = s;
      for (let p = 0; p < states; p += 1) {
        const candidate = prevScore[p] - (p === s ? 0 : changePenalty);
        if (candidate > best) {
          best = candidate;
          bestPrev = p;
        }
      }
      score[s] = best + emit;
      back[s] = bestPrev;
    }
    backPointers.push(back);
    prevScore.set(score);
  }

  let state = 0;
  for (let s = 1; s < states; s += 1) {
    if (score[s] > score[state]) {
      state = s;
    }
  }
  const result = new Array(beats);
  for (let beat = beats - 1; beat >= 0; beat -= 1) {
    result[beat] = state === states - 1 ? null : labels[state].name;
    state = backPointers[beat][state] === -1 ? state : backPointers[beat][state];
  }
  return result;
}

// 小節頭の推定：コードの切り替わりが小節頭に揃う位相を選ぶ
function estimateDownbeatShift(beatLabels, beatsPerBar = 4) {
  const scores = new Array(beatsPerBar).fill(0);
  for (let beat = 1; beat < beatLabels.length; beat += 1) {
    if (beatLabels[beat] !== beatLabels[beat - 1]) {
      scores[beat % beatsPerBar] += 1;
    }
  }
  let best = 0;
  for (let s = 1; s < beatsPerBar; s += 1) {
    if (scores[s] > scores[best]) {
      best = s;
    }
  }
  return best;
}

function mergeBeatLabels(beatLabels) {
  const segments = [];
  beatLabels.forEach((label, beat) => {
    const last = segments[segments.length - 1];
    if (last && last.chord === label) {
      last.beats += 1;
    } else {
      segments.push({ chord: label, startBeat: beat, beats: 1 });
    }
  });
  return segments;
}

// ===== メロディ（YIN） =====

function yinPitch(frame, sampleRate, minHz = 75, maxHz = 900, threshold = 0.15) {
  const maxLag = Math.floor(sampleRate / minHz);
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  const window = frame.length - maxLag;
  if (window < 64) {
    return null;
  }
  const diff = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let i = 0; i < window; i += 1) {
      const d = frame[i] - frame[i + lag];
      sum += d * d;
    }
    diff[lag] = sum;
  }
  // 累積平均正規化
  const cmndf = new Float32Array(maxLag + 1);
  let running = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    running += diff[lag];
    cmndf[lag] = running > 1e-12 ? (diff[lag] * (lag - minLag + 1)) / running : 1;
  }
  let lag = -1;
  for (let candidate = minLag + 1; candidate <= maxLag - 1; candidate += 1) {
    if (cmndf[candidate] < threshold && cmndf[candidate] <= cmndf[candidate + 1]) {
      lag = candidate;
      break;
    }
  }
  if (lag < 0) {
    return null;
  }
  // 放物線補間
  const a = cmndf[lag - 1];
  const b = cmndf[lag];
  const c = cmndf[lag + 1];
  const denom = a - 2 * b + c;
  const shift = Math.abs(denom) > 1e-9 ? (0.5 * (a - c)) / denom : 0;
  const freq = sampleRate / (lag + shift);
  return { freq, clarity: 1 - b };
}

async function trackMelody(vocal, sampleRate, onProgress) {
  const down = resampleLinear(vocal, sampleRate, 11025);
  const rate = 11025;
  const winSize = 1024;
  const hop = 256;
  const frames = Math.max(0, Math.floor((down.length - winSize) / hop) + 1);
  const pitches = new Array(frames).fill(null);
  const frame = new Float32Array(winSize);
  for (let f = 0; f < frames; f += 1) {
    const start = f * hop;
    let rms = 0;
    for (let i = 0; i < winSize; i += 1) {
      frame[i] = down[start + i];
      rms += frame[i] * frame[i];
    }
    rms = Math.sqrt(rms / winSize);
    if (rms > 0.004) {
      const found = yinPitch(frame, rate);
      if (found && found.clarity > 0.55) {
        pitches[f] = midiFromFrequency(found.freq);
      }
    }
    if (onProgress && f % 200 === 0) {
      onProgress(f / frames);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  // メディアンフィルタ（3点）でばたつきを抑える
  const filtered = pitches.map((value, index) => {
    const triple = [pitches[index - 1], value, pitches[index + 1]].filter((v) => v !== null);
    if (value === null || triple.length < 2) {
      return value;
    }
    triple.sort((x, y) => x - y);
    return triple[Math.floor(triple.length / 2)];
  });
  return { pitches: filtered, frameRate: rate / hop };
}

function quantizeBeat(beat, unit) {
  return Math.round(beat / unit) * unit;
}

// ピッチフレーム列 → クオンタイズ済みノート列
function melodyNotesFromPitches(pitches, frameRate, bpm, beat0Sec, quantUnit) {
  const notes = [];
  const minFrames = Math.max(2, Math.round(0.06 * frameRate));
  let runStart = -1;
  let runValues = [];

  const flush = (endFrame) => {
    if (runStart < 0 || runValues.length < minFrames) {
      runStart = -1;
      runValues = [];
      return;
    }
    const sorted = [...runValues].sort((a, b) => a - b);
    const midi = Math.round(sorted[Math.floor(sorted.length / 2)]);
    const startSec = runStart / frameRate;
    const endSec = endFrame / frameRate;
    const startBeat = quantizeBeat(((startSec - beat0Sec) * bpm) / 60, quantUnit);
    const rawBeats = ((endSec - startSec) * bpm) / 60;
    const beats = Math.max(quantUnit, quantizeBeat(rawBeats, quantUnit));
    if (startBeat >= 0 && midi >= 40 && midi <= 96) {
      const last = notes[notes.length - 1];
      if (last && last.startBeat === startBeat && last.midi === midi) {
        last.beats = Math.max(last.beats, beats);
      } else {
        notes.push({ startBeat, beats, midi });
      }
    }
    runStart = -1;
    runValues = [];
  };

  for (let f = 0; f < pitches.length; f += 1) {
    const pitch = pitches[f];
    if (pitch === null) {
      flush(f);
      continue;
    }
    if (runStart < 0) {
      runStart = f;
      runValues = [pitch];
      continue;
    }
    const sorted = [...runValues].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (Math.abs(pitch - median) > 0.8) {
      flush(f);
      runStart = f;
      runValues = [pitch];
    } else {
      runValues.push(pitch);
    }
  }
  flush(pitches.length);
  return notes;
}

// ===== 解析結果 → 譜面 =====

function buildScoreFromAnalysis(analysis, options) {
  const bpm = options.bpm;
  const beatOffsetSec = options.beatOffsetSec;
  const beatsPerBar = options.beatsPerBar || 4;
  const quantUnit = options.quantUnit || 0.25;
  const durationSec = analysis.frames / analysis.frameRate;
  const beatCount = Math.max(0, Math.floor(((durationSec - beatOffsetSec) * bpm) / 60));
  if (beatCount < beatsPerBar) {
    return null;
  }

  const beatVectors = beatChromaVectors(
    analysis.chroma, analysis.frames, analysis.frameRate, bpm, beatOffsetSec, beatCount
  );
  let labels = detectChordsFromChroma(beatVectors);
  const shift = estimateDownbeatShift(labels, beatsPerBar);
  // 小節頭が途中から始まる場合は、先頭を切らずに無音拍を足して1小節目に収める
  const pad = shift === 0 ? 0 : beatsPerBar - shift;
  if (pad) {
    labels = new Array(pad).fill(null).concat(labels);
  }
  const beat0Sec = beatOffsetSec - (pad * 60) / bpm;

  // 先頭と末尾の「不明」を削る（先頭の分はオフセットに足す）
  let lead = 0;
  while (lead < labels.length && labels[lead] === null) {
    lead += 1;
  }
  lead = Math.floor(lead / beatsPerBar) * beatsPerBar; // 小節単位で切る
  labels = labels.slice(lead);
  let tail = labels.length;
  while (tail > 0 && labels[tail - 1] === null) {
    tail -= 1;
  }
  labels = labels.slice(0, tail);
  const scoreStartSec = beat0Sec + (lead * 60) / bpm;

  const segments = mergeBeatLabels(labels);
  const events = [{ type: "section", label: "取り込み", beats: 0, lineIndex: 0 }];
  segments.forEach((segment) => {
    events.push({
      type: "chord",
      chord: segment.chord,
      lyric: "",
      beats: segment.beats,
      lineIndex: Math.floor(segment.startBeat / (beatsPerBar * 2)) + 1
    });
  });

  let melody = [];
  if (analysis.pitches) {
    melody = melodyNotesFromPitches(
      analysis.pitches, analysis.pitchFrameRate, bpm, scoreStartSec, quantUnit
    ).filter((note) => note.startBeat < labels.length);
  }

  return {
    events,
    melody,
    beatCount: labels.length,
    bars: Math.ceil(labels.length / beatsPerBar),
    audioOffsetSec: scoreStartSec
  };
}

// 歌詞行を「1行＝barsPerLine小節」で仮割り付けする
function assignLyricsToEvents(events, lyricsText, beatsPerBar, barsPerLine) {
  const lines = String(lyricsText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return;
  }
  const beatsPerLine = beatsPerBar * barsPerLine;
  let beat = 0;
  let lineIdx = -1;
  events.forEach((event) => {
    if (event.type !== "chord") {
      return;
    }
    const currentLine = Math.floor(beat / beatsPerLine);
    event.lineIndex = currentLine + 1;
    if (currentLine > lineIdx && currentLine < lines.length) {
      lineIdx = currentLine;
      event.lyric = lines[currentLine];
    }
    beat += Number(event.beats) || 0;
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    hannWindow,
    fftInPlace,
    ifftInPlace,
    resampleLinear,
    midiFromFrequency,
    analyzeAudio,
    estimateTempo,
    beatChromaVectors,
    detectChordsFromChroma,
    estimateDownbeatShift,
    mergeBeatLabels,
    yinPitch,
    trackMelody,
    quantizeBeat,
    melodyNotesFromPitches,
    buildScoreFromAnalysis,
    assignLyricsToEvents,
    CHORD_TEMPLATES,
    NOTE_NAMES
  };
}
