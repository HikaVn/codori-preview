import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

// Execute the application's real progress logic and registered click handlers.
// Audio/layout are replaced; no browser or user's saved data is accessed.
const source = fs.readFileSync(process.argv[2] || new URL('../app/main.js', import.meta.url), 'utf8')
  .replace(/^init\(\);\s*$/m, '');
const stages = JSON.parse(fs.readFileSync(new URL('../assets/app/data/practice-stages.json', import.meta.url), 'utf8'));
const stageList = Array.isArray(stages) ? stages : stages.stages;
const key = 'codori.practiceProgress.v1';
const stage = stageList.find(item => item.stage_number === 0);
const chordList = ['all-main-chords', 'initial-four-chords', 'expansion-set-01', 'm7-set-01']
  .flatMap(name => JSON.parse(fs.readFileSync(new URL(`../assets/app/data/${name}.json`, import.meta.url), 'utf8')));

class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.style = { setProperty() {} };
    const classes = new Set();
    this.classList = {
      add: (...values) => values.forEach(value => classes.add(value)),
      remove: (...values) => values.forEach(value => classes.delete(value)),
      contains: value => classes.has(value),
      toggle(value, enabled = !classes.has(value)) {
        enabled ? classes.add(value) : classes.delete(value);
      }
    };
  }
  set innerHTML(value) { this.children = []; }
  addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); }
  click() {
    if (!this.disabled) for (const listener of this.listeners.click || []) listener({ target: this });
  }
  appendChild(child) { this.children.push(child); }
  setAttribute() {}
  removeAttribute() {}
}

function harness(saved, search = '?stage=0', activeStage = stage) {
  const dom = new Map();
  const get = selector => {
    if (!dom.has(selector)) dom.set(selector, new Element());
    return dom.get(selector);
  };
  const timers = [];
  const storage = new Map(saved === undefined ? [] : [[key, typeof saved === 'string' ? saved : JSON.stringify(saved)]]);
  const document = {
    querySelector: get,
    querySelectorAll: selector => selector === '.quiz-option' ? get('#quiz-options').children : [],
    createElement: () => new Element(),
    addEventListener() {},
    body: new Element()
  };
  const context = vm.createContext({
    URLSearchParams, console, document,
    localStorage: { getItem: name => storage.get(name) ?? null, setItem: (name, value) => storage.set(name, value) },
    window: { location: { search }, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }), setTimeout: callback => timers.push(callback) },
    fixtureStages: stageList, fixtureStage: activeStage, fixtureChords: chordList
  });
  const run = code => vm.runInContext(code, context);
  run(source);
  run(`
    practiceStages = fixtureStages;
    activePracticeStage = fixtureStage;
    isModeSelectOnly = false;
    practiceCatalog = new Map(fixtureChords.flatMap(chord => [[chord.code_id, chord], [chord.display_name, chord]]));
    chordData = fixtureStage.code_ids.map(id => practiceCatalog.get(id));
    renderPracticeProgress = () => {};
    renderPracticeStageChrome = () => {};
    updateModeGuide = () => {};
    closeMobileLearningMenu = () => {};
    renderCompare = () => {};
    renderProgression = () => {};
    applyKeyColor = () => {};
    updateOnePointAccent = () => {};
    applyDiagramImage = () => {};
    playChord = (chord, options = {}) => { if (options.trackProgress !== false) recordChordHeard(chord); };
    setPracticeStage = (id, options) => {
      activePracticeStage = practiceStages.find(candidate => candidate.id === id);
      activeView = options.view;
    };
    restorePracticePosition();
    renderQuiz();
  `);
  return {
    run, dom, get,
    flush: () => { while (timers.length) timers.shift()(); },
    progress: () => JSON.parse(storage.get(key) || '{}')
  };
}

function progressFor(activeStage = stage, patch = {}) {
  return { version: 1, stages: { [activeStage.id]: patch }, last: { mode: 'practice', stageId: activeStage.id, view: patch.lastView || 'card' } };
}

for (const [name, patch] of [
  ['fresh', {}],
  ['legacy flags', { heard: true, quizzed: true }],
  ['partial', { heardCodeIds: ['C_major', 'C_minor', 'C_7'], quizAnsweredTotal: 11 }],
  ['completed', { heardCodeIds: ['C_major', 'C_minor', 'C_7', 'C_add9'], quizAnsweredTotal: 12 }]
]) {
  test(`card playback stays on card: ${name}`, () => {
    const app = harness(name === 'fresh' ? undefined : progressFor(stage, patch));
    app.run('activeView = "card"; currentIndex = 3;');
    app.get('#play-current').click();
    app.flush();
    assert.equal(app.run('activeView'), 'card');
    assert.equal(app.run('activePracticeStage.id'), stage.id);
    assert.equal(app.run('heardCodeIdsForStage().includes("C_add9")'), true);
    if (patch.quizAnsweredTotal) assert.equal(app.progress().stages[stage.id].quizAnsweredTotal, patch.quizAnsweredTotal);
  });
}

// Stage 4 -> Stage 6 is the real "色づけ" route.
for (const stageNumber of [0, 4]) {
  const activeStage = stageList.find(item => item.stage_number === stageNumber);
  test(`completed Stage ${stageNumber}: replay stays in quiz; only course button advances`, () => {
    const total = activeStage.code_ids.length * 3;
    const app = harness(progressFor(activeStage, { lastView: 'quiz', quizAnsweredTotal: total }), '?stage=' + stageNumber, activeStage);
    const disabledBeforeAnswer = app.get('#next-quiz').disabled;
    app.get('#play-quiz').click();
    app.get('#quiz-options').children[0].click();
    const before = app.run('activePracticeStage.id');
    app.get('#next-quiz').click();
    app.flush();
    assert.equal(app.run('activePracticeStage.id'), before);
    assert.equal(app.run('activeView'), 'quiz');
    assert.equal(app.run('quizAnsweredTotalForStage()'), total, 'replay preserves completion');
    assert.equal(app.get('#next-quiz').disabled, true, 'new question must be answered');
    assert.equal(disabledBeforeAnswer, true, 'must answer before next question');
    assert.equal(app.get('#next-course-quiz').hidden, false);
    const expected = app.run('nextStageAfter().id');
    app.get('#next-course-quiz').click();
    assert.equal(app.run('activePracticeStage.id'), expected);
    assert.equal(app.run('activeView'), 'card');
  });
}

for (const isCorrect of [true, false]) {
  test(`last answer (${isCorrect ? 'correct' : 'incorrect'}) completes without navigation`, () => {
    const app = harness(progressFor(stage, { lastView: 'quiz', quizAnsweredTotal: 11 }));
    app.get('#play-quiz').click();
    app.run(`checkQuizAnswer(elements.quizOptions.children[0], ${isCorrect});`);
    app.flush();
    assert.equal(app.run('activePracticeStage.id'), stage.id);
    assert.equal(app.run('activeView'), 'quiz');
    assert.equal(app.progress().stages[stage.id].quizAnsweredTotal, 12);
    app.get('#next-quiz').click();
    app.get('#play-quiz').click();
    app.get('#quiz-options').children[0].click();
    assert.equal(app.progress().stages[stage.id].quizAnsweredTotal, 12);
    assert.equal(app.run('activePracticeStage.id'), stage.id);
  });
}

test('saved valid view resumes; explicit URL view takes priority', () => {
  const saved = progressFor(stage, { lastView: 'quiz', lastCardIndex: 2, quizAnsweredTotal: 7 });
  const resumed = harness(saved);
  assert.equal(resumed.run('activeView'), 'quiz');
  assert.equal(resumed.run('currentIndex'), 2);
  assert.equal(resumed.run('quizAnsweredCount'), 7);
  const explicit = harness(saved, '?stage=0&view=card');
  assert.equal(explicit.run('activeView'), 'card');
});

test('invalid saved view is ignored without losing valid achievement history', () => {
  const saved = progressFor(stage, { lastView: 'coloring', quizAnsweredTotal: 12, heardCodeIds: ['C_major'], custom: 'keep' });
  saved.stages['another-stage'] = { quizAnsweredTotal: 9 };
  const app = harness(saved);
  assert.equal(app.run('activeView'), 'card');
  app.get('#play-current').click();
  assert.equal(app.progress().stages[stage.id].quizAnsweredTotal, 12);
  assert.equal(app.progress().stages[stage.id].custom, 'keep');
  assert.equal(app.progress().stages['another-stage'].quizAnsweredTotal, 9);
});

for (const [name, saved] of [
  ['broken JSON', '{broken'], ['null root', 'null'], ['array root', '[]'],
  ['string stages', { stages: 'old' }], ['array stages', { stages: [] }],
  ['invalid stage row', { stages: { [stage.id]: 'old' } }],
  ['invalid last', { stages: {}, last: 'quiz' }]
]) {
  test(`malformed progress loads safely: ${name}`, () => {
    const app = harness(saved);
    assert.equal(app.run('Array.isArray(practiceProgress.stages)'), false);
    assert.equal(app.run('typeof practiceProgress.stages'), 'object');
    assert.equal(app.run('typeof stageProgress()'), 'object');
    assert.equal(app.run('practiceProgress.last === null || typeof practiceProgress.last === "object"'), true);
    app.get('#play-current').click();
    app.flush();
    assert.equal(app.run('activeView'), 'card');
    assert.equal(app.progress().stages[stage.id].heardCodeIds.includes('C_major'), true);
  });
}
