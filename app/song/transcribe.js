// 歌詞の自動文字起こし（β）
// transformers.js（ONNX Runtime）でWhisperをブラウザ内実行する。
// モデルは初回だけCDNからダウンロードされ、ブラウザにキャッシュされる。
// 音声データはどこにも送信しない。
// song.js / dsp.js / import.js と同じページで読み込む古典スクリプト。

const TRANSFORMERS_CDN_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/dist/transformers.min.js";
const WHISPER_RATE = 16000;
const WHISPER_MODELS = {
  tiny: { label: "tiny（約40MB・はやい）", ids: ["onnx-community/whisper-tiny", "Xenova/whisper-tiny"] },
  base: { label: "base（約80MB・バランス）", ids: ["onnx-community/whisper-base", "Xenova/whisper-base"] },
  small: { label: "small（約250MB・高精度）", ids: ["onnx-community/whisper-small", "Xenova/whisper-small"] }
};

const transcribeEl = {
  model: document.querySelector("#whisper-model"),
  source: document.querySelector("#whisper-source"),
  button: document.querySelector("#transcribe-button"),
  progress: document.querySelector("#transcribe-progress"),
  progressBar: document.querySelector("#transcribe-progress-bar"),
  progressLabel: document.querySelector("#transcribe-progress-label"),
  list: document.querySelector("#transcribe-list"),
  status: document.querySelector("#transcribe-status")
};

const transcribeState = {
  busy: false,
  module: null,
  asr: null,
  asrModelId: null,
  chunks: [] // [{ start, end, text }]
};

function setTranscribeProgress(label, ratio) {
  transcribeEl.progress.classList.remove("is-hidden");
  transcribeEl.progressLabel.textContent = label;
  if (ratio === null) {
    // 進捗が読めない区間（モデル実行中）は、満タンにせず流れるアニメーションで「処理中」を示す
    transcribeEl.progressBar.classList.add("is-indeterminate");
    transcribeEl.progressBar.style.width = "";
    return;
  }
  transcribeEl.progressBar.classList.remove("is-indeterminate");
  transcribeEl.progressBar.style.width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
}

function hideTranscribeProgress() {
  transcribeEl.progress.classList.add("is-hidden");
  transcribeEl.progressBar.classList.remove("is-indeterminate");
}

async function loadTransformersModule() {
  if (!transcribeState.module) {
    transcribeState.module = await import(TRANSFORMERS_CDN_URL);
  }
  return transcribeState.module;
}

async function loadWhisperPipeline(modelKey) {
  const spec = WHISPER_MODELS[modelKey] || WHISPER_MODELS.tiny;
  const wanted = spec.ids[0];
  if (transcribeState.asr && transcribeState.asrModelId === wanted) {
    return transcribeState.asr;
  }
  const { pipeline } = await loadTransformersModule();
  const device = typeof navigator !== "undefined" && navigator.gpu ? "webgpu" : "wasm";
  const progressCallback = (info) => {
    if (info.status === "progress" && typeof info.progress === "number") {
      const file = String(info.file || "").split("/").pop();
      setTranscribeProgress(`モデルをダウンロード中… ${file}`, info.progress / 100);
    }
  };
  let lastError = null;
  for (const modelId of spec.ids) {
    for (const dev of device === "webgpu" ? ["webgpu", "wasm"] : ["wasm"]) {
      try {
        const asr = await pipeline("automatic-speech-recognition", modelId, {
          dtype: "q8",
          device: dev,
          progress_callback: progressCallback
        });
        transcribeState.asr = asr;
        transcribeState.asrModelId = wanted;
        return asr;
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw lastError || new Error("Whisper model load failed");
}

async function runTranscription() {
  if (transcribeState.busy) {
    return;
  }
  if (!importState.analysis) {
    window.alert("先に上の「解析する」で音源を解析してね。");
    return;
  }
  transcribeState.busy = true;
  transcribeEl.button.disabled = true;
  try {
    setTranscribeProgress("文字起こしの準備中…", 0.02);
    const asr = await loadWhisperPipeline(transcribeEl.model.value);

    setTranscribeProgress("歌詞を聞き取ってる…（曲の長さによって数分かかるよ）", null);
    const audio = prepareTranscriptionAudio();
    const output = await asr(audio, {
      language: "japanese",
      task: "transcribe",
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      // ハルシネーション（繰り返し暴走・多言語の混入）を抑える生成設定
      condition_on_previous_text: false,
      no_repeat_ngram_size: 3,
      repetition_penalty: 1.25,
      compression_ratio_threshold: 2.4,
      logprob_threshold: -1.0,
      no_speech_threshold: 0.6,
      temperature: [0, 0.2, 0.4, 0.6, 0.8]
    });

    const rawChunks = (output.chunks || [])
      .map((chunk) => ({
        start: Number(chunk.timestamp?.[0]) || 0,
        end: Number(chunk.timestamp?.[1]) || 0,
        text: String(chunk.text || "").trim()
      }))
      .filter((chunk) => chunk.text);
    const chunks = cleanTranscriptChunks(rawChunks);
    transcribeState.chunks = chunks;
    renderTranscriptList();
    hideTranscribeProgress();
    const dropped = rawChunks.length - chunks.length;
    transcribeEl.status.textContent = chunks.length
      ? `${chunks.length}行を聞き取ったよ。${dropped > 0 ? `（あやしい繰り返し${dropped}件を除いた）` : ""}下で手なおしして、「譜面にする」とタイミングで割り付ける。`
      : "歌詞を聞き取れなかった。モデルをbase/smallに変える、認識する音を切り替える、はっきり歌っている区間で試す、を試してみてね。";
  } catch (error) {
    console.warn("transcription failed", error);
    hideTranscribeProgress();
    transcribeEl.status.textContent = "";
    window.alert("文字起こしに失敗しちゃった。ネットワーク（モデルのダウンロード）と、対応ブラウザかどうかを確認してね。");
  } finally {
    transcribeState.busy = false;
    transcribeEl.button.disabled = false;
  }
}

// 認識ソース（分離ボーカル / 元ミックス）を16kHzモノラルにして、ピーク正規化する
function prepareTranscriptionAudio() {
  let samples;
  if (transcribeEl.source?.value === "mix" && importState.midSide) {
    samples = importState.midSide.mid;
  } else {
    samples = importState.analysis.vocal;
  }
  const audio = resampleLinear(samples, IMPORT_RATE, WHISPER_RATE);
  let peak = 0;
  for (let i = 0; i < audio.length; i += 1) {
    peak = Math.max(peak, Math.abs(audio[i]));
  }
  if (peak > 1e-6) {
    const gain = 0.95 / peak;
    for (let i = 0; i < audio.length; i += 1) {
      audio[i] *= gain;
    }
  }
  return audio;
}

// Whisperのハルシネーション後始末：
// 1) チャンク内の繰り返し（「ABABAB…」）を1回に畳む
// 2) 直前チャンクと同一テキストの連続を捨てる
// 3) 日本語/英語としての体をなさない多言語サラダのチャンクを捨てる
function cleanTranscriptChunks(chunks) {
  const cleaned = [];
  let prevText = null;
  for (const chunk of chunks) {
    const text = collapseRepeats(chunk.text);
    if (!text || text === prevText) {
      continue;
    }
    if (isGibberish(text)) {
      continue;
    }
    cleaned.push({ ...chunk, text });
    prevText = text;
  }
  return cleaned;
}

// 「そらそらそらそら」→「そら」、「LaLaLa」→「La」、語/句の即時反復をまとめる
function collapseRepeats(text) {
  let out = text;
  // 句（スペース区切り）の反復
  out = out.replace(/(.+?)(?:\s+\1){2,}/g, "$1");
  // 文字単位の長い反復（2〜8文字の塊が3回以上）
  out = out.replace(/(.{1,8}?)\1{3,}/g, "$1$1");
  return out.trim();
}

const SCRIPT_PATTERNS = {
  japanese: /[぀-ヿ㐀-鿿]/,
  latin: /[A-Za-z]/,
  cyrillic: /[Ѐ-ӿ]/,
  hangul: /[가-힣ᄀ-ᇿ]/,
  arabic: /[؀-ۿ]/,
  thai: /[฀-๿]/,
  greek: /[Ͱ-Ͽ]/,
  devanagari: /[ऀ-ॿ]/
};

function isGibberish(text) {
  const chars = Array.from(text.replace(/\s/g, ""));
  if (chars.length < 2) {
    return true;
  }
  // ユニーク文字率が極端に低い（同じ文字の繰り返し）
  const unique = new Set(chars).size;
  if (unique / chars.length < 0.25 && chars.length > 6) {
    return true;
  }
  // 文字体系の数を数える。正常な歌詞は日本語＋英語くらいで2系統まで。
  // キリル・ハングル・アラビア等が混ざって3系統以上になるのはWhisperの暴走。
  const scripts = Object.keys(SCRIPT_PATTERNS).filter((name) => SCRIPT_PATTERNS[name].test(text));
  if (scripts.length >= 3) {
    return true;
  }
  // 日本語の曲なのに、日本語も英語も含まない（キリル/ハングル/アラビア等だけ）チャンクは捨てる
  if (!scripts.includes("japanese") && !scripts.includes("latin") && scripts.length > 0) {
    return true;
  }
  return false;
}

function renderTranscriptList() {
  const chunks = transcribeState.chunks;
  transcribeEl.list.classList.toggle("is-hidden", !chunks.length);
  transcribeEl.list.innerHTML = "";
  chunks.forEach((chunk, index) => {
    const item = document.createElement("li");
    const time = document.createElement("span");
    time.className = "transcribe-time";
    time.textContent = formatClock(chunk.start);
    const input = document.createElement("input");
    input.type = "text";
    input.value = chunk.text;
    input.setAttribute("aria-label", `${index + 1}行目の歌詞`);
    input.addEventListener("input", () => {
      chunk.text = input.value;
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "✕";
    remove.title = "この行を消す";
    remove.addEventListener("click", () => {
      transcribeState.chunks.splice(index, 1);
      renderTranscriptList();
    });
    item.appendChild(time);
    item.appendChild(input);
    item.appendChild(remove);
    transcribeEl.list.appendChild(item);
  });
}

function formatClock(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

// import.js（譜面にする）から呼ばれる
function getTranscriptChunks() {
  return transcribeState.chunks.filter((chunk) => chunk.text.trim());
}

function resetTranscript() {
  transcribeState.chunks = [];
  renderTranscriptList();
  transcribeEl.status.textContent = "";
}

if (transcribeEl.model) {
  transcribeEl.model.innerHTML = "";
  Object.entries(WHISPER_MODELS).forEach(([key, spec]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = spec.label;
    transcribeEl.model.appendChild(option);
  });
}
transcribeEl.button?.addEventListener("click", runTranscription);
