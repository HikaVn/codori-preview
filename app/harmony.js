/* Functional harmony questions and session state. Audio belongs to main.js. */
(() => {
  const functions = {
    T: { name: "トニック", hint: "帰ってきた・落ち着く", reason: "主和音 I は、この調の帰る場所。進行の出発点や、終止の落ち着きを作ります。" },
    S: { name: "サブドミナント", hint: "外へ広がる・次へつなぐ", reason: "IV は主和音から外へ広がる役割。この進行ではドミナントへつなぐ、または I へ戻る動きを作ります。" },
    D: { name: "ドミナント", hint: "帰りたくなる・解決を待つ", reason: "V / V7 は主和音 I へ進みたくなる役割。この進行でも、その後の I への解決を聞けます。" }
  };
  const keys = {
    C: { I: "C", IV: "F", V: "G", V7: "G7" },
    F: { I: "F", IV: "Bb", V: "C", V7: "C7" },
    G: { I: "G", IV: "C", V: "D", V7: "D7" }
  };
  // Each target is specified by its position in an explicitly tonal phrase.
  const phrases = [
    { degrees: ["I", "IV", "V", "I"], targets: [1, 2, 3] },
    { degrees: ["I", "IV", "I", "V", "I"], targets: [1, 2, 3] },
    { degrees: ["I", "V", "I", "IV", "V", "I"], targets: [1, 2, 3] }
  ];
  const functionFor = degree => degree === "I" ? "T" : degree === "IV" ? "S" : "D";

  function audioNotesFor(chord, rootFrequency) {
    const notes = [...chord.temp_audio_notes];
    const hasRoot = notes.some(frequency => {
      const octaves = Math.log2(frequency / rootFrequency);
      return Math.abs(octaves - Math.round(octaves)) < 0.003;
    });
    if (!hasRoot) notes.unshift(rootFrequency);
    return notes;
  }

  function questionPool(level) {
    const pool = [];
    for (const key of level === "step2" ? ["C", "F", "G"] : ["C"]) {
      for (const seventh of level === "step2" ? [false, true] : [false]) {
        phrases.forEach((phrase, phraseIndex) => phrase.targets.forEach(target => {
          const degrees = phrase.degrees.map(degree => seventh && degree === "V" ? "V7" : degree);
          pool.push({
            id: `${key}-${phraseIndex}-${target}-${seventh}`, key, target, degrees,
            chords: degrees.map(degree => keys[key][degree]),
            cadence: [keys[key].I, keys[key].IV, keys[key].V7, keys[key].I],
            answer: functionFor(degrees[target])
          });
        }));
      }
    }
    return pool;
  }

  // One cancelable sequence owner for lessons, practice and tests.
  function createPlayer({ playChord, schedule = (fn, ms) => setTimeout(fn, ms), cancel = id => clearTimeout(id), onCue = () => {}, onEnd = () => {}, onError = () => {} }) {
    let generation = 0, timer, stopTone;
    function stop() {
      generation += 1; cancel(timer); stopTone?.(); stopTone = null;
    }
    async function start(steps) {
      stop();
      const token = generation;
      async function step(index) {
        if (token !== generation) return;
        if (index === steps.length) { onEnd(); return; }
        const item = steps[index];
        onCue(item.cue);
        try {
          if (!item.gap) {
            const stopCurrent = await playChord(item.chord, () => token === generation);
            if (token !== generation) { stopCurrent?.(); return; }
            stopTone = stopCurrent;
          }
          timer = schedule(() => step(index + 1), item.gap ? 700 : 1150);
        } catch (error) {
          if (token !== generation) return;
          stop(); onError(error);
        }
      }
      await step(0);
    }
    return { start, stop };
  }

  function createSession({ playChord, schedule = (fn, ms) => setTimeout(fn, ms), cancel = id => clearTimeout(id), random = Math.random, balanced = false, onChange = () => {} }) {
    let level = "step1", deck = [], question, phase = "ready", heard = false, selected = null;
    let correct = 0, answered = 0, cue = "";
    const snapshot = () => ({ level, question, phase, heard, selected, correct, answered, cue });
    const emit = () => onChange(snapshot());
    function stop() {
      player.stop();
      if (phase === "playing") phase = selected ? "answered" : "ready";
      cue = "";
    }
    function next() {
      stop();
      if (!deck.length) {
        deck = questionPool(level);
        for (let i = deck.length - 1; i > 0; i -= 1) {
          const j = Math.floor(random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        if (balanced) {
          const groups = Object.fromEntries(["T", "S", "D"].map(value => [value, deck.filter(q => q.answer === value)]));
          deck = [];
          while (groups.T.length && groups.S.length && groups.D.length) {
            const order = ["T", "S", "D"];
            for (let i = 2; i > 0; i -= 1) {
              const j = Math.floor(random() * (i + 1));
              [order[i], order[j]] = [order[j], order[i]];
            }
            order.forEach(value => deck.push(groups[value].pop()));
          }
        }
      }
      question = deck.pop();
      heard = false; selected = null; phase = "ready";
      emit();
    }
    const player = createPlayer({ playChord, schedule, cancel,
      onCue(value) { cue = value; emit(); },
      onEnd() {
        heard = true; phase = selected ? "answered" : "ready";
        cue = "最後まで聞けました。★の和音の役割を選ぼう。"; emit();
      },
      onError() { phase = "error"; cue = "音を再生できませんでした。もう一度「進行をきく」を押してください。"; emit(); }
    });
    async function play() {
      stop(); phase = "playing"; emit();
      return player.start([
        ...question.cadence.map(chord => ({ chord, cue: "主調をたしかめる" })),
        { cue: "ここから問題の進行", gap: true },
        ...question.chords.map((chord, i) => ({ chord, cue: `${i + 1}音目${i === question.target ? " ★ この和音" : ""}` }))
      ]);
    }
    function answer(value) {
      if (!heard || selected || phase === "playing" || !functions[value]) return;
      selected = value; answered += 1;
      if (value === question.answer) correct += 1;
      phase = "answered"; emit();
    }
    function setLevel(value) {
      if (!["step1", "step2"].includes(value) || value === level) return;
      level = value; deck = []; correct = 0; answered = 0;
      next();
    }
    next();
    return { snapshot, next, play, answer, setLevel, stop: () => { stop(); emit(); } };
  }

  function createTestSession(options) {
    let status = "setup", count = 6, records = [], current;
    const notify = options.onChange || (() => {});
    const snapshot = () => ({
      status, count, index: Math.min(records.length + (current?.selected ? 0 : 1), count), answered: records.length,
      phase: current?.phase, heard: current?.heard, selected: current?.selected, cue: current?.cue,
      question: current?.question ? { key: current.question.key, target: current.question.target, length: current.question.chords.length } : null,
      correct: status === "finished" ? records.filter(item => item.selected === item.question.answer).length : undefined,
      results: status === "finished" ? [...records] : []
    });
    const emit = () => notify(snapshot());
    const engine = createSession({ ...options, balanced: true, onChange(state) { current = state; emit(); } });
    function start(level, amount) {
      if (status === "running") return;
      count = [3, 6, 9].includes(Number(amount)) ? Number(amount) : 6;
      records = []; status = "running";
      engine.setLevel(level); engine.next(); emit();
    }
    function answer(value) {
      if (status !== "running" || current.selected || !current.heard || current.phase === "playing" || !functions[value]) return;
      records.push({ question: current.question, selected: value });
      engine.answer(value); emit();
    }
    function next() {
      if (status !== "running" || !current.selected) return;
      if (records.length === count) { status = "finished"; engine.stop(); emit(); }
      else engine.next();
    }
    function reset() { status = "setup"; records = []; engine.stop(); emit(); }
    return { snapshot, start, answer, next, reset, stop: engine.stop, play: () => status === "running" ? engine.play() : undefined };
  }

  function mountTest({ root, playChord }) {
    const get = id => root.querySelector(`#test-${id}`);
    const session = createTestSession({ playChord, onChange(state) {
      get("setup").hidden = state.status !== "setup";
      get("running").hidden = state.status !== "running";
      get("results").hidden = state.status !== "finished";
      get("review").replaceChildren();
      if (state.status === "running") {
        const q = state.question;
        get("prompt").textContent = `第 ${state.index} / ${state.count} 問 · ${q.key}長調の ${q.target + 1} 音目（★）の役割は？`;
        get("path").textContent = Array.from({ length: q.length }, (_, i) => `${i === q.target ? "★ " : ""}${i + 1}音目`).join(" → ");
        get("cue").textContent = state.selected ? "回答を記録しました。正解と解説は最後に表示します。" : state.cue || "主調の終止と問題の進行を聞いてください。";
        get("next").disabled = !state.selected;
        get("next").textContent = state.answered === state.count ? "採点して振り返る" : "次の問題へ";
        get("stop").disabled = state.phase !== "playing";
        root.querySelectorAll("[data-test-function]").forEach(button => {
          button.disabled = !state.heard || !!state.selected || state.phase === "playing";
          button.setAttribute("aria-pressed", String(button.dataset.testFunction === state.selected));
        });
      }
      if (state.status === "finished") {
        get("score").textContent = `${state.count}問中 ${state.correct}問正解`;
        state.results.forEach((item, index) => {
          const q = item.question;
          const row = document.createElement("li");
          const text = document.createElement("p");
          text.textContent = `第${index + 1}問 · ${q.key}長調 · ${item.selected === q.answer ? "正解" : "復習しよう"}。あなたの回答: ${functions[item.selected].name}。答え: ${functions[q.answer].name}（${q.degrees[q.target]} / ${q.chords[q.target]}）。${functions[q.answer].reason}`;
          const path = document.createElement("p");
          path.textContent = q.degrees.map((degree, i) => `${i === q.target ? "★ " : ""}${degree}（${q.chords[i]}）`).join(" → ");
          row.append(text, path); get("review").appendChild(row);
        });
      }
    } });
    get("start").addEventListener("click", () => session.start(get("level").value, get("count").value));
    get("play").addEventListener("click", session.play);
    get("stop").addEventListener("click", session.stop);
    get("next").addEventListener("click", session.next);
    get("restart").addEventListener("click", session.reset);
    get("again").addEventListener("click", session.reset);
    root.querySelectorAll("[data-test-function]").forEach(button => button.addEventListener("click", () => session.answer(button.dataset.testFunction)));
    return session;
  }

  function mount({ root, playChord }) {
    const get = id => root.querySelector(`#harmony-${id}`);
    let lastQuestion;
    const session = createSession({ playChord, onChange(state) {
      const q = state.question;
      if (!q) return;
      get("key").textContent = `${q.key}メジャー（長調）`;
      get("prompt").textContent = `問題の進行の ${q.target + 1} 音目（★）は、どんな役割？`;
      get("score").textContent = `正解 ${state.correct} / 回答 ${state.answered}（このレベル・今回）`;
      get("cue").textContent = state.cue || "まず主調の終止、続いて問題の進行が鳴ります。";
      get("play").textContent = state.phase === "playing" ? "はじめから聞き直す" : "進行をきく";
      get("next").disabled = !state.selected;
      get("stop").disabled = state.phase !== "playing";
      get("result").textContent = state.selected
        ? `${state.selected === q.answer ? "正解。" : "もう一度たしかめよう。"}答えは ${q.degrees[q.target]}（${q.chords[q.target]}）、${functions[q.answer].name}。${functions[q.answer].reason}`
        : "コードの明るさ・暗さではなく、この調での役割を聞いてみよう。";
      get("path").textContent = q.degrees.map((degree, i) => `${i === q.target ? "★ " : ""}${state.selected ? `${degree}（${q.chords[i]}）` : `${i + 1}音目`}`).join(" → ");
      root.querySelectorAll("[data-function]").forEach(button => {
        button.disabled = !state.heard || !!state.selected || state.phase === "playing";
        button.classList.toggle("is-correct", !!state.selected && button.dataset.function === q.answer);
        button.classList.toggle("is-wrong", !!state.selected && button.dataset.function === state.selected && state.selected !== q.answer);
      });
      if (lastQuestion && lastQuestion !== q) get("prompt").focus();
      lastQuestion = q;
    } });
    get("play").addEventListener("click", session.play);
    get("next").addEventListener("click", session.next);
    get("stop").addEventListener("click", () => { session.stop(); get("cue").textContent = "停止しました。進行をはじめから聞き直せます。"; });
    get("level").addEventListener("change", event => session.setLevel(event.target.value));
    root.querySelectorAll("[data-function]").forEach(button => button.addEventListener("click", () => session.answer(button.dataset.function)));
    return session;
  }
  window.CodoriHarmony = { functions, audioNotesFor, questionPool, createPlayer, createSession, createTestSession, mountTest, mount };
})();
