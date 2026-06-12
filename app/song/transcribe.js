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
    transcribeEl.progressBar.style.width = "100%";
    return;
  }
  transcribeEl.progressBar.style.width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
}

function hideTranscribeProgress() {
  transcribeEl.progress.classList.add("is-hidden");
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

    setTranscribeProgress("ボーカルから歌詞を聞き取ってる…（曲の長さによって数分かかるよ）", null);
    const audio = resampleLinear(importState.analysis.vocal, IMPORT_RATE, WHISPER_RATE);
    const output = await asr(audio, {
      language: "japanese",
      task: "transcribe",
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true
    });

    const chunks = (output.chunks || [])
      .map((chunk) => ({
        start: Number(chunk.timestamp?.[0]) || 0,
        end: Number(chunk.timestamp?.[1]) || 0,
        text: String(chunk.text || "").trim()
      }))
      .filter((chunk) => chunk.text);
    transcribeState.chunks = chunks;
    renderTranscriptList();
    hideTranscribeProgress();
    transcribeEl.status.textContent = chunks.length
      ? `${chunks.length}行を聞き取ったよ。下で手なおしして、「譜面にする」とタイミングで割り付ける。`
      : "歌詞を聞き取れなかった。モデルをbase/smallに変えるか、ボーカルがはっきりした曲で試してみてね。";
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
