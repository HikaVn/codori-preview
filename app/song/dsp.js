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

// 長い処理のキャンセル用（shouldCancl() が true になったら投げる）
const CANCELLED = "DSP_CANCELLED";

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

// ===== 分離＋特徴抽出 =====
// ボーカルらしさ = 「中央に定位（mid≫side）」∩「繰り返さない（REPET-SIM）」の二段がけ。
// - センター抽出: プロのミックスはボーカルが中央定位 → mid成分から推定（既存）
// - REPET-SIM: 伴奏は時間方向に繰り返す/持続する → 各ビンの時間メディアンで伴奏を推定し除去
//   （Rafii & Pardo 2013 / librosaのvocal separation例ベース）
// - ソフトマスク（Wiener風）でアーティファクトを抑える
// method: "center" = センター抽出のみ（軽い） / "center-repet" = 二段がけ（おすすめ）

const REPET_TIME_STRIDE = 3; // 背景推定用に時間方向を間引く（メモリ削減）
const REPET_BLOCK_SECONDS = 4; // この秒数ごとに伴奏スペクトルを推定（コード進行に追従）

// ソフトマスク（power=2のWienerフィルタ）: a に属する度合いを返す
function softMaskValue(a, b) {
  const a2 = a * a;
  const b2 = b * b;
  const denom = a2 + b2;
  return denom < 1e-12 ? 0 : a2 / denom;
}

function medianOf(values, from, to) {
  const slice = values.slice(from, to).sort((x, y) => x - y);
  const n = slice.length;
  if (!n) {
    return 0;
  }
  return n % 2 ? slice[(n - 1) / 2] : (slice[n / 2 - 1] + slice[n / 2]) / 2;
}

async function analyzeAudio(options) {
  const { mid, side, sampleRate, onProgress } = options;
  const shouldCancel = options.shouldCancel || (() => false);
  const vocalSideFactor = options.vocalSideFactor ?? 1.2;
  const method = options.method || "center-repet";
  const repetStrength = options.repetStrength ?? 1.0;
  const useRepet = method !== "center" && repetStrength > 0;
  // コード解析（クロマ）用の音域と圧縮。楽器/音域指定で精度を上げる。
  const chromaMinHz = options.chromaMinHz ?? 60;
  const chromaMaxHz = options.chromaMaxHz ?? 5000;
  const chromaLogCompress = options.chromaLogCompress === true;

  const size = DSP_FFT_SIZE;
  const hop = DSP_HOP;
  const win = hannWindow(size);
  const frames = Math.max(0, Math.floor((mid.length - size) / hop) + 1);
  const half = size / 2;
  const binHz = sampleRate / size;
  const bins = half + 1;

  const vocal = new Float32Array(mid.length);
  const inst = new Float32Array(mid.length);
  const norm = new Float32Array(mid.length);
  const flux = new Float32Array(frames);
  const chroma = new Float32Array(frames * 12);
  const prevMag = new Float32Array(bins);

  const mRe = new Float32Array(size);
  const mIm = new Float32Array(size);
  const sRe = new Float32Array(size);
  const sIm = new Float32Array(size);
  const vRe = new Float32Array(size);
  const vIm = new Float32Array(size);
  const iRe = new Float32Array(size);
  const iIm = new Float32Array(size);

  // --- REPET用: パス1で間引いたmidマグニチュードを貯めて、ブロックごとの伴奏スペクトルを作る ---
  let background = null; // background[block][bin]
  let blockCols = 1;
  if (useRepet) {
    const refFrames = Math.ceil(frames / REPET_TIME_STRIDE);
    const refMag = new Float32Array(refFrames * bins);
    for (let r = 0; r < refFrames; r += 1) {
      const f = r * REPET_TIME_STRIDE;
      const start = f * hop;
      for (let i = 0; i < size; i += 1) {
        mRe[i] = mid[start + i] * win[i];
        mIm[i] = 0;
      }
      fftInPlace(mRe, mIm);
      for (let k = 0; k < bins; k += 1) {
        refMag[r * bins + k] = Math.hypot(mRe[k], mIm[k]);
      }
      if (onProgress && r % 64 === 0) {
        if (shouldCancel()) {
          throw CANCELLED;
        }
        onProgress((r / refFrames) * 0.4);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    const colSec = (hop * REPET_TIME_STRIDE) / sampleRate;
    blockCols = Math.max(8, Math.round(REPET_BLOCK_SECONDS / colSec));
    const blocks = Math.max(1, Math.ceil(refFrames / blockCols));
    background = [];
    const column = new Float32Array(blockCols);
    for (let b = 0; b < blocks; b += 1) {
      const from = b * blockCols;
      const to = Math.min(refFrames, from + blockCols);
      const bg = new Float32Array(bins);
      for (let k = 0; k < bins; k += 1) {
        let n = 0;
        for (let r = from; r < to; r += 1) {
          column[n++] = refMag[r * bins + k];
        }
        // 各ビンの時間メディアン＝そのブロックで持続している伴奏成分
        bg[k] = medianOf(column, 0, n);
      }
      background.push(bg);
    }
  }

  const progressBase = useRepet ? 0.4 : 0;
  const progressSpan = useRepet ? 0.6 : 1;

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

    const bg = useRepet
      ? background[Math.min(background.length - 1, Math.floor((f / REPET_TIME_STRIDE) / blockCols))]
      : null;

    let fluxSum = 0;
    for (let k = 0; k <= half; k += 1) {
      const mMag = Math.hypot(mRe[k], mIm[k]);
      const sMag = Math.hypot(sRe[k], sIm[k]);
      fluxSum += Math.max(0, mMag - prevMag[k]);
      prevMag[k] = mMag;

      const freq = k * binHz;
      let mask = 0;
      if (freq >= 140 && freq <= 5200) {
        // 段1: センター定位マスク（mid≫side ほどボーカルらしい）
        const panMask = Math.min(1, Math.max(0, mMag - vocalSideFactor * sMag) / (mMag + 1e-9));
        if (useRepet) {
          // 段2: 繰り返し（伴奏）を引いた残りのソフトマスク
          const bgMag = bg[k] * repetStrength;
          const foreground = Math.max(0, mMag - bgMag);
          const repetMask = softMaskValue(foreground, bgMag);
          mask = panMask * repetMask;
        } else {
          mask = panMask;
        }
      }
      vRe[k] = mRe[k] * mask;
      vIm[k] = mIm[k] * mask;
      iRe[k] = mRe[k] * (1 - mask) + sRe[k];
      iIm[k] = mIm[k] * (1 - mask) + sIm[k];

      if (freq >= chromaMinHz && freq <= chromaMaxHz) {
        const instMag = Math.hypot(iRe[k], iIm[k]);
        // 対数圧縮: 大きい音の支配を抑え、コードの和声成分を拾いやすくする
        const weight = chromaLogCompress ? Math.log(1 + instMag) : instMag;
        const pc = ((Math.round(midiFromFrequency(freq)) % 12) + 12) % 12;
        chroma[f * 12 + pc] += weight;
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
      if (shouldCancel()) {
        throw CANCELLED;
      }
      onProgress(progressBase + (f / frames) * progressSpan);
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

  // 上位のBPM候補（半分/倍を畳み込んで重複を除く）
  const peaks = [];
  for (let l = lagMin + 1; l < lagMax; l += 1) {
    if (scores[l] >= scores[l - 1] && scores[l] >= scores[l + 1] && scores[l] > 0) {
      peaks.push({ lag: l, score: scores[l] });
    }
  }
  peaks.sort((a, b) => b.score - a.score);
  const maxScore = peaks[0]?.score || 1;
  const candidates = [];
  for (const peak of peaks) {
    let candidateBpm = (60 * frameRate) / peak.lag;
    while (candidateBpm < 70) candidateBpm *= 2;
    while (candidateBpm > 185) candidateBpm /= 2;
    candidateBpm = Math.round(candidateBpm * 10) / 10;
    if (!candidates.some((c) => Math.abs(c.bpm - candidateBpm) < 1.5)) {
      candidates.push({ bpm: candidateBpm, score: Math.round((peak.score / maxScore) * 100) / 100 });
    }
    if (candidates.length >= 5) {
      break;
    }
  }

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
  return { bpm, beatOffsetSec: bestPhase / frameRate, candidates };
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

async function trackMelody(vocal, sampleRate, onProgress, options = {}) {
  const clarityThreshold = options.clarityThreshold ?? 0.55;
  const rmsGate = options.rmsGate ?? 0.004;
  const shouldCancel = options.shouldCancel || (() => false);
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
    if (rms > rmsGate) {
      const found = yinPitch(frame, rate);
      if (found && found.clarity > clarityThreshold) {
        pitches[f] = midiFromFrequency(found.freq);
      }
    }
    if (onProgress && f % 200 === 0) {
      if (shouldCancel()) {
        throw CANCELLED;
      }
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

// unit は単一のグリッド幅（例: 0.25）か、複数グリッドの配列（例: [0.25, 1/3]）。
// 配列のときは、各グリッドに丸めた候補のうち最も近いものへスナップする（ストレートと三連の混在に対応）。
function quantizeBeat(beat, unit) {
  if (Array.isArray(unit)) {
    let best = beat;
    let bestDelta = Infinity;
    for (const u of unit) {
      const snapped = Math.round(beat / u) * u;
      const delta = Math.abs(snapped - beat);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = snapped;
      }
    }
    return best;
  }
  return Math.round(beat / unit) * unit;
}

function minQuantUnit(unit) {
  return Array.isArray(unit) ? Math.min(...unit) : unit;
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
    const beats = Math.max(minQuantUnit(quantUnit), quantizeBeat(rawBeats, quantUnit));
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

// ===== 録音採点（コード練習 / 歌練習） =====

// 録音波形からオンセット（弾いた瞬間）の時刻[秒]を検出する
function detectOnsets(samples, sampleRate, options = {}) {
  const hop = options.hop || 512;
  const win = options.win || 1024;
  const sensitivity = options.sensitivity ?? 1.0;
  const frames = Math.max(0, Math.floor((samples.length - win) / hop) + 1);
  const env = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    const start = f * hop;
    for (let i = 0; i < win; i += 1) {
      const s = samples[start + i] || 0;
      sum += s * s;
    }
    env[f] = Math.sqrt(sum / win);
  }
  // 立ち上がり（正の差分）を見て、適応閾値でピークを拾う
  const flux = new Float32Array(frames);
  for (let f = 1; f < frames; f += 1) {
    flux[f] = Math.max(0, env[f] - env[f - 1]);
  }
  let mean = 0;
  for (let f = 0; f < frames; f += 1) {
    mean += flux[f];
  }
  mean /= Math.max(1, frames);
  let variance = 0;
  for (let f = 0; f < frames; f += 1) {
    variance += (flux[f] - mean) ** 2;
  }
  const std = Math.sqrt(variance / Math.max(1, frames));
  const threshold = mean + sensitivity * std;
  const minGapFrames = Math.max(1, Math.round((0.08 * sampleRate) / hop));
  const onsets = [];
  let lastOnset = -minGapFrames;
  for (let f = 1; f < frames - 1; f += 1) {
    if (flux[f] > threshold && flux[f] >= flux[f - 1] && flux[f] >= flux[f + 1] && f - lastOnset >= minGapFrames) {
      onsets.push((f * hop) / sampleRate);
      lastOnset = f;
    }
  }
  return onsets;
}

// 音程を最も近いオクターブに畳んだ誤差（半音）。オクターブ違いを許容する。
function foldedSemitoneError(recMidi, targetMidi) {
  let error = recMidi - targetMidi;
  while (error > 6) {
    error -= 12;
  }
  while (error < -6) {
    error += 12;
  }
  return error;
}

// 歌練習の採点。recPitchBeats: [{beat, midi}]（録音から）、targetNotes: [{startBeat, beats, midi}]
function scoreSingingPerformance(recPitchBeats, targetNotes, options = {}) {
  const transpose = options.transpose || 0;
  const minCoverage = options.minCoverageFrames ?? 2;
  const pitchTolerance = options.pitchTolerance ?? 2.0; // これだけ外れると0点
  const notes = (targetNotes || []).filter((note) => Number.isFinite(note.midi));
  if (!notes.length) {
    return null;
  }
  const perNote = [];
  let covered = 0;
  let scoreSum = 0;
  let signedSum = 0;
  let signedCount = 0;
  notes.forEach((note) => {
    const target = note.midi + transpose;
    const from = note.startBeat;
    const to = note.startBeat + (Number(note.beats) || 0);
    const inWindow = recPitchBeats.filter((p) => p.beat >= from - 1e-9 && p.beat < to + 1e-9);
    if (inWindow.length >= minCoverage) {
      covered += 1;
      const sorted = inWindow.map((p) => p.midi).sort((a, b) => a - b);
      const recMidi = sorted[Math.floor(sorted.length / 2)];
      const error = foldedSemitoneError(recMidi, target);
      const noteScore = Math.max(0, 1 - Math.abs(error) / pitchTolerance);
      scoreSum += noteScore;
      signedSum += error;
      signedCount += 1;
      perNote.push({ startBeat: note.startBeat, target, recMidi, error, score: noteScore, covered: true });
    } else {
      perNote.push({ startBeat: note.startBeat, target, recMidi: null, error: null, score: 0, covered: false });
    }
  });
  const accuracy = covered ? scoreSum / covered : 0;
  const coverage = covered / notes.length;
  const centsTendency = signedCount ? Math.round((signedSum / signedCount) * 100) : 0;
  const overall = Math.round(100 * (0.7 * accuracy + 0.3 * coverage));
  const weakNotes = perNote.filter((n) => !n.covered || n.score < 0.5);
  return {
    kind: "singing",
    score: overall,
    pitchAccuracy: Math.round(accuracy * 100),
    coverage: Math.round(coverage * 100),
    centsTendency,
    perNote,
    weakNotes,
    noteCount: notes.length
  };
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom < 1e-9 ? 0 : dot / denom;
}

// コード名を根音の半音位置と構成音インターバルへ（dsp.js内で自己完結）
const DSP_ROOT_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const DSP_QUALITY_INTERVALS = {
  "": [0, 4, 7], maj7: [0, 4, 7, 11], M7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 14],
  "6": [0, 4, 7, 9], "7": [0, 4, 7, 10], "9": [0, 4, 7, 10, 14], add9: [0, 4, 7, 14],
  sus4: [0, 5, 7], sus2: [0, 2, 7], "7sus4": [0, 5, 7, 10], sus47: [0, 5, 7, 10],
  m: [0, 3, 7], m6: [0, 3, 7, 9], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14],
  mM7: [0, 3, 7, 11], mmaj7: [0, 3, 7, 11], "m7-5": [0, 3, 6, 10], m7b5: [0, 3, 6, 10],
  dim: [0, 3, 6], dim7: [0, 3, 6, 9], aug: [0, 4, 8], aug7: [0, 4, 8, 10], "7-5": [0, 4, 6, 10]
};

function dspParseChord(chordName) {
  const main = String(chordName || "").split("/")[0].trim();
  const match = main.match(/^([A-G])(#|b)?(.*)$/);
  if (!match) {
    return null;
  }
  let semitone = DSP_ROOT_SEMITONES[match[1]];
  if (match[2] === "#") {
    semitone += 1;
  } else if (match[2] === "b") {
    semitone -= 1;
  }
  const suffix = match[3] || "";
  let intervals = DSP_QUALITY_INTERVALS[suffix];
  if (!intervals) {
    // 未知のサフィックスはざっくり: マイナーか否か＋7th
    const isMinor = /^m(?!aj)/.test(suffix);
    intervals = isMinor ? [0, 3, 7] : [0, 4, 7];
    if (/7/.test(suffix)) {
      intervals = intervals.concat([/maj7|M7/.test(suffix) ? 11 : 10]);
    }
  }
  return { semitone: ((semitone % 12) + 12) % 12, intervals };
}

// コード名 → 正規化した12音テンプレート（構成音=1）
function chordTemplateVector(chordName) {
  const parsed = dspParseChord(chordName);
  const vec = new Float32Array(12);
  if (!parsed) {
    return vec;
  }
  parsed.intervals.forEach((interval) => {
    vec[(parsed.semitone + interval) % 12] = 1;
  });
  let norm = 0;
  for (let i = 0; i < 12; i += 1) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 1e-9) {
    for (let i = 0; i < 12; i += 1) {
      vec[i] /= norm;
    }
  }
  return vec;
}

// 録音のクロマ（12音ベクトル）と期待コードを比べ、正誤と綺麗さを評価する
// cleanness: 期待テンプレートとのコサイン類似度（高い＝余計な音/ミュートが少なく綺麗）
// correct: 録音から最も近い和音の根音が期待と一致するか
function scoreChordToneMatch(chromaVec, chordName) {
  const expected = chordTemplateVector(chordName);
  const cleanness = Math.max(0, cosineSimilarity(chromaVec, expected));
  let bestName = null;
  let bestSim = -Infinity;
  for (const template of CHORD_TEMPLATES) {
    const sim = cosineSimilarity(chromaVec, template.vector);
    if (sim > bestSim) {
      bestSim = sim;
      bestName = template.name;
    }
  }
  const expectedRoot = dspParseChord(chordName)?.semitone ?? null;
  const detectedRoot = bestName ? dspParseChord(bestName)?.semitone ?? null : null;
  const correct = expectedRoot !== null && expectedRoot === detectedRoot;
  return { cleanness, correct, detectedName: bestName };
}

// コード練習の採点。onsetBeats: number[]（録音から）、chordEvents: [{startBeat, chord}]
// options.segmentChroma: starts と同じ並びの 12音ベクトル配列（録音の和音ごとのクロマ）。
// あれば「正誤」「綺麗さ」も加味して採点する。
function scoreChordPerformance(onsetBeats, chordEvents, options = {}) {
  const tolerance = options.toleranceBeats ?? 0.5;
  const starts = (chordEvents || []).filter((event) => event.chord);
  if (!starts.length) {
    return null;
  }
  const segmentChroma = options.segmentChroma || null;
  // キャリブレーションで得た「理想の響き」の綺麗さを100%基準にする（ウクレレの減衰・個体差を吸収）
  const cleannessRef = options.cleannessReference && options.cleannessReference > 0.2
    ? options.cleannessReference
    : 1;
  const onsets = [...onsetBeats].sort((a, b) => a - b);
  const perChord = [];
  let matched = 0;
  let absErrSum = 0;
  let signedSum = 0;
  let correctCount = 0;
  let cleanSum = 0;
  let toneCount = 0;
  starts.forEach((event, index) => {
    let best = null;
    let bestDelta = Infinity;
    for (const onset of onsets) {
      const delta = onset - event.startBeat;
      if (Math.abs(delta) < Math.abs(bestDelta) && Math.abs(delta) <= tolerance) {
        bestDelta = delta;
        best = onset;
      }
    }
    const detail = { startBeat: event.startBeat, chord: event.chord, error: null, matched: false };
    if (best !== null) {
      matched += 1;
      absErrSum += Math.abs(bestDelta);
      signedSum += bestDelta;
      detail.error = bestDelta;
      detail.matched = true;
    }
    if (segmentChroma && segmentChroma[index]) {
      const tone = scoreChordToneMatch(segmentChroma[index], event.chord);
      const cleanNorm = Math.min(1, tone.cleanness / cleannessRef);
      detail.correct = tone.correct;
      detail.cleanness = Math.round(cleanNorm * 100);
      detail.detectedName = tone.detectedName;
      toneCount += 1;
      if (tone.correct) {
        correctCount += 1;
      }
      cleanSum += cleanNorm;
    }
    perChord.push(detail);
  });
  const coverage = matched / starts.length;
  const meanAbsErr = matched ? absErrSum / matched : tolerance;
  const tightness = Math.max(0, 1 - meanAbsErr / tolerance);
  const rushDrag = matched ? signedSum / matched : 0; // 負=走り(早い) / 正=もたり(遅い)

  let overall;
  const result = {
    kind: "chord",
    coverage: Math.round(coverage * 100),
    timing: Math.round(tightness * 100),
    rushDrag: Math.round(rushDrag * 100) / 100,
    perChord,
    chordCount: starts.length
  };
  if (toneCount > 0) {
    const correctness = correctCount / toneCount;
    const cleanness = cleanSum / toneCount;
    result.correctness = Math.round(correctness * 100);
    result.cleanness = Math.round(cleanness * 100);
    // タイミング(出てるか/合ってるか) 0.4 ＋ 正誤 0.35 ＋ 綺麗さ 0.25
    overall = Math.round(100 * (0.2 * coverage + 0.2 * tightness + 0.35 * correctness + 0.25 * cleanness));
    result.weakChords = perChord.filter((c) => !c.matched || c.correct === false || (c.cleanness ?? 100) < 55);
  } else {
    overall = Math.round(100 * (0.5 * coverage + 0.5 * tightness));
    result.weakChords = perChord.filter((c) => !c.matched);
  }
  result.score = overall;
  return result;
}

// キャリブレーション: 基準コードを綺麗に弾いた録音から「理想の響き」を測る。
// ウクレレは減衰音なので、各ストロークの立ち上がり後・減衰しきる前のクロマで綺麗さを測り、
// プレイヤー/楽器ごとの達成可能な綺麗さ(refCleanness)と減衰時間(decaySec)を得る。
function analyzeCalibration(samples, sampleRate, chordName, options = {}) {
  const onsets = detectOnsets(samples, sampleRate, { sensitivity: options.sensitivity ?? 1.0 });
  if (!onsets.length) {
    return null;
  }
  const template = chordTemplateVector(chordName);
  const hop = DSP_HOP;
  const { chroma, frames, frameRate } = computeChroma(samples, sampleRate, {
    minHz: options.minHz ?? 180,
    maxHz: options.maxHz ?? 3500
  });
  // 各オンセット後 0.05〜0.5秒のクロマで綺麗さ、エネルギー減衰で減衰時間を測る
  const cleanVals = [];
  const decayVals = [];
  onsets.forEach((onsetSec) => {
    const fromF = Math.floor((onsetSec + 0.05) * frameRate);
    const toF = Math.min(frames, Math.floor((onsetSec + 0.5) * frameRate));
    const vec = new Float32Array(12);
    for (let f = fromF; f < toF; f += 1) {
      for (let pc = 0; pc < 12; pc += 1) {
        vec[pc] += chroma[f * 12 + pc];
      }
    }
    let norm = 0;
    for (let pc = 0; pc < 12; pc += 1) {
      norm += vec[pc] * vec[pc];
    }
    norm = Math.sqrt(norm);
    if (norm > 1e-9) {
      for (let pc = 0; pc < 12; pc += 1) {
        vec[pc] /= norm;
      }
      cleanVals.push(Math.max(0, cosineSimilarity(vec, template)));
    }
    // 減衰: オンセット直後のピークエネルギーが15%まで落ちる時間
    const peakF = Math.floor((onsetSec + 0.03) * frameRate);
    let peak = 0;
    const winSamp = 1024;
    const energyAt = (frameIdx) => {
      const s = frameIdx * hop;
      let e = 0;
      for (let i = 0; i < winSamp; i += 1) {
        const v = samples[s + i] || 0;
        e += v * v;
      }
      return Math.sqrt(e / winSamp);
    };
    peak = energyAt(peakF);
    if (peak > 1e-5) {
      for (let f = peakF; f < frames; f += 1) {
        if (energyAt(f) < peak * 0.15) {
          decayVals.push((f - peakF) * hop / sampleRate);
          break;
        }
      }
    }
  });
  if (!cleanVals.length) {
    return null;
  }
  const sortedClean = [...cleanVals].sort((a, b) => a - b);
  const sortedDecay = [...decayVals].sort((a, b) => a - b);
  return {
    chord: chordName,
    refCleanness: sortedClean[Math.floor(sortedClean.length / 2)],
    decaySec: sortedDecay.length ? sortedDecay[Math.floor(sortedDecay.length / 2)] : 0.8,
    strums: onsets.length,
    createdAt: new Date().toISOString()
  };
}

// 任意の波形から12音クロマのスペクトログラムを作る（録音の和音採点用）
function computeChroma(samples, sampleRate, options = {}) {
  const minHz = options.minHz ?? 70;
  const maxHz = options.maxHz ?? 3000;
  const size = DSP_FFT_SIZE;
  const hop = DSP_HOP;
  const win = hannWindow(size);
  const frames = Math.max(0, Math.floor((samples.length - size) / hop) + 1);
  const half = size / 2;
  const binHz = sampleRate / size;
  const chroma = new Float32Array(frames * 12);
  const re = new Float32Array(size);
  const im = new Float32Array(size);
  for (let f = 0; f < frames; f += 1) {
    const start = f * hop;
    for (let i = 0; i < size; i += 1) {
      re[i] = (samples[start + i] || 0) * win[i];
      im[i] = 0;
    }
    fftInPlace(re, im);
    for (let k = 0; k <= half; k += 1) {
      const freq = k * binHz;
      if (freq < minHz || freq > maxHz) {
        continue;
      }
      const mag = Math.hypot(re[k], im[k]);
      const pc = ((Math.round(midiFromFrequency(freq)) % 12) + 12) % 12;
      chroma[f * 12 + pc] += mag;
    }
  }
  return { chroma, frames, frameRate: sampleRate / hop };
}

// クロマスペクトログラムから、各コード区間の平均クロマ（正規化）を作る
function segmentChromaVectors(chroma, frames, frameRate, chordEvents, beatToSec) {
  return (chordEvents || []).map((event) => {
    const fromSec = beatToSec(event.startBeat);
    const toSec = beatToSec(event.startBeat + (Number(event.beats) || 1));
    const from = Math.max(0, Math.floor(fromSec * frameRate));
    const to = Math.min(frames, Math.ceil(toSec * frameRate));
    const vec = new Float32Array(12);
    for (let f = from; f < to; f += 1) {
      for (let pc = 0; pc < 12; pc += 1) {
        vec[pc] += chroma[f * 12 + pc];
      }
    }
    let norm = 0;
    for (let pc = 0; pc < 12; pc += 1) {
      norm += vec[pc] * vec[pc];
    }
    norm = Math.sqrt(norm);
    if (norm > 1e-9) {
      for (let pc = 0; pc < 12; pc += 1) {
        vec[pc] /= norm;
      }
    }
    return norm > 1e-9 ? vec : null;
  });
}

// 弱かった項目を、直前のセクション名でグループ化する（アドバイス用）
function weakSectionsFor(weakItems, sections) {
  const ordered = [...(sections || [])].sort((a, b) => a.startBeat - b.startBeat);
  const counts = new Map();
  weakItems.forEach((item) => {
    let label = "はじめのほう";
    for (const section of ordered) {
      if (section.startBeat <= item.startBeat + 1e-9) {
        label = section.label;
      } else {
        break;
      }
    }
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
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
  let labels = detectChordsFromChroma(beatVectors, options.changePenalty ?? 0.1);
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
    beatLabels: labels,
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

// タイムスタンプ付きの歌詞行（文字起こし結果）を、開始拍が重なるコードイベントへ割り付ける
// timedLines: [{ startBeat, text }]（開始拍の昇順）
function assignTimedLyricsToEvents(events, timedLines) {
  const lines = (timedLines || [])
    .filter((line) => line && String(line.text || "").trim())
    .sort((a, b) => a.startBeat - b.startBeat);
  if (!lines.length) {
    return;
  }
  let beat = 0;
  const chordEvents = [];
  events.forEach((event) => {
    if (event.type !== "chord") {
      return;
    }
    event._startBeat = beat;
    beat += Number(event.beats) || 0;
    chordEvents.push(event);
  });

  lines.forEach((line) => {
    let target = null;
    for (const event of chordEvents) {
      if (event._startBeat + (Number(event.beats) || 0) > line.startBeat + 1e-6) {
        target = event;
        break;
      }
    }
    if (!target) {
      target = chordEvents[chordEvents.length - 1];
    }
    if (target) {
      const text = String(line.text).trim();
      target.lyric = target.lyric ? `${target.lyric} ${text}` : text;
    }
  });

  // 行のまとまり（lineIndex）も文字起こしの区切りに合わせる
  // （歌詞の割り付けと同じく「行の開始拍を含むイベント」から次の行が始まる前まで）
  let lineIdx = -1;
  chordEvents.forEach((event) => {
    const eventEnd = event._startBeat + (Number(event.beats) || 0);
    while (lineIdx + 1 < lines.length && lines[lineIdx + 1].startBeat < eventEnd - 1e-6) {
      lineIdx += 1;
    }
    event.lineIndex = lineIdx + 1;
    delete event._startBeat;
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
    minQuantUnit,
    melodyNotesFromPitches,
    buildScoreFromAnalysis,
    assignLyricsToEvents,
    assignTimedLyricsToEvents,
    softMaskValue,
    medianOf,
    CANCELLED,
    detectOnsets,
    foldedSemitoneError,
    scoreSingingPerformance,
    scoreChordPerformance,
    scoreChordToneMatch,
    chordTemplateVector,
    cosineSimilarity,
    computeChroma,
    segmentChromaVectors,
    analyzeCalibration,
    weakSectionsFor,
    CHORD_TEMPLATES,
    NOTE_NAMES
  };
}
