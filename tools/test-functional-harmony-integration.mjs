import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('../app/main.js', import.meta.url), 'utf8').replace(/^init\(\);\s*$/m, '');
const data = ['initial-four-chords', 'expansion-set-01'].flatMap(name => JSON.parse(fs.readFileSync(new URL(`../assets/app/data/${name}.json`, import.meta.url))));
class Element {
  constructor() {
    this.dataset = {}; this.listeners = {}; this.style = { setProperty() {} };
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  setAttribute() {} removeAttribute() {} focus() {}
}
function harness() {
  const nodes = new Map(), timers = new Map(), events = [], oscillators = [];
  let id = 0;
  const get = key => { if (!nodes.has(key)) nodes.set(key, new Element()); return nodes.get(key); };
  const param = label => ({
    setValueAtTime: (value, time) => events.push([label, 'set', value, time]),
    exponentialRampToValueAtTime: (value, time) => events.push([label, 'ramp', value, time]),
    cancelScheduledValues: time => events.push([label, 'cancel', time])
  });
  const audio = {
    currentTime: 10, state: 'running', destination: {},
    createGain: () => ({ gain: param('gain'), connect() {} }),
    createOscillator: () => {
      const node = { frequency: {}, connect() {}, start(time) { this.started = time; }, stop(time) { (this.stops ||= []).push(time); } };
      oscillators.push(node); return node;
    }
  };
  const context = vm.createContext({
    console, URLSearchParams, fixtureChords: data, fixtureAudio: audio,
    document: { querySelector: get, querySelectorAll: () => [], addEventListener() {}, body: new Element() },
    localStorage: { getItem: () => null, setItem() {} },
    window: { AudioContext: function() { return audio; }, location: { search: '' }, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }),
      setTimeout: callback => { timers.set(++id, callback); return id; }, clearTimeout: id => timers.delete(id) }
  });
  const run = code => vm.runInContext(code, context);
  run(source);
  run('audioContext = fixtureAudio; chordData = fixtureChords; quizIndex = 0; var progressWrites = 0; recordChordHeard = () => progressWrites++;');
  return { run, audio, oscillators, events, timers };
}

test('existing synthetic chords retain their default 2.6-second envelope and strum', () => {
  const h = harness();
  h.run('playSyntheticNotes(fixtureAudio, fixtureChords[0].temp_audio_notes)');
  assert.equal(h.oscillators.length, 8);
  assert.equal(h.oscillators[0].started, 10);
  assert.equal(h.oscillators[2].started, 10.1);
  assert.equal(h.oscillators[0].stops[0], 12.6);
  assert.ok(h.events.some(event => event[1] === 'set' && event[3] === 11.15));
  assert.equal(h.run('activeSyntheticPlaybacks.size'), 1);
});

test('short harmony chords return an idempotent stop and preserve source notes', async () => {
  const h = harness();
  const before = JSON.stringify(data[0].temp_audio_notes);
  const stop = await h.run('playChord(fixtureChords[0], { frequencies: [261.63, 329.63, 392], durationSeconds: 0.75, trackProgress: false, shouldContinue: () => true })');
  assert.equal(h.oscillators.length, 6);
  assert.equal(h.oscillators[0].stops[0], 10.75);
  assert.equal(h.run('progressWrites'), 0);
  stop(); stop();
  assert.equal(h.run('activeSyntheticPlaybacks.size'), 0);
  assert.equal(h.oscillators[0].stops.length, 2);
  assert.equal(JSON.stringify(data[0].temp_audio_notes), before);
});

test('ordinary playback still writes heard progress, harmony guards prevent stale sounds', async () => {
  const h = harness();
  await h.run('playChord(fixtureChords[0])');
  assert.equal(h.run('progressWrites'), 1);
  const count = h.oscillators.length;
  await h.run('playChord(fixtureChords[0], { trackProgress: false, shouldContinue: () => false })');
  assert.equal(h.oscillators.length, count);
  assert.equal(h.run('progressWrites'), 1);
});

test('stop while AudioContext resumes prevents delayed chord start', async () => {
  const h = harness();
  let resolve;
  h.audio.state = 'suspended';
  h.audio.resume = () => new Promise(done => { resolve = done; });
  const pending = h.run('playChord(fixtureChords[0], { trackProgress: false, shouldContinue: () => true })');
  h.run('stopAudioPlayback()');
  h.audio.state = 'running'; resolve(); await pending;
  assert.equal(h.oscillators.length, 0);
});

test('global stop cancels sequence reservations, synthetic voices and audio files', () => {
  const h = harness();
  h.run(`
    playSyntheticNotes(fixtureAudio, fixtureChords[0].temp_audio_notes);
    const reservation = window.setTimeout(() => {}, 500);
    pendingPlaybackTimers.add(reservation);
    var filePaused = 0;
    var file = { currentTime: 5, pause() { filePaused++; } };
    activeAudioElements.add(file);
    stopAudioPlayback();
  `);
  assert.equal(h.run('pendingPlaybackTimers.size'), 0);
  assert.equal(h.run('activeSyntheticPlaybacks.size'), 0);
  assert.equal(h.run('activeAudioElements.size'), 0);
  assert.equal(h.run('filePaused'), 1);
  assert.equal(h.run('file.currentTime'), 0);
});

test('root assist retains the named root for F despite A being its first voicing note', async () => {
  const h = harness();
  h.run(`quizIndex = fixtureChords.findIndex(chord => chord.display_name === 'F');
    currentQuizAssist = { ...quizAssistForChord(chordData[quizIndex]), quizCodeId: chordData[quizIndex].code_id };`);
  await h.run('playRootAssist()');
  assert.equal(h.oscillators[0].frequency.value, 349.23);
  assert.equal(h.oscillators[1].frequency.value, 698.46);
});
