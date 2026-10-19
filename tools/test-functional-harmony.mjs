import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(new URL('../app/audio-engine.js', import.meta.url), 'utf8'), context);
vm.runInContext(fs.readFileSync(new URL('../app/harmony.js', import.meta.url), 'utf8'), context);
const { questionPool, createSession, createTestSession, audioNotesFor } = context.window.CodoriHarmony;
const plain = value => JSON.parse(JSON.stringify(value));
const chords = new Map(['all-main-chords', 'initial-four-chords', 'expansion-set-01', 'm7-set-01']
  .flatMap(name => JSON.parse(fs.readFileSync(new URL(`../assets/app/data/${name}.json`, import.meta.url))))
  .map(chord => [chord.display_name, chord]));
const tonics = { C: 0, F: 5, G: 7 };
const pitchClass = frequency => ((Math.round(69 + 12 * Math.log2(frequency / 440)) % 12) + 12) % 12;

test('all questions use tonal cadences, valid chord audio and consistent target functions', () => {
  for (const level of ['step1', 'step2']) {
    const pool = questionPool(level);
    assert.equal(pool.length, level === 'step1' ? 9 : 54);
    assert.equal(new Set(pool.map(q => q.id)).size, pool.length);
    for (const q of pool) {
      assert.equal(q.answer, { I: 'T', IV: 'S', V: 'D', V7: 'D' }[q.degrees[q.target]]);
      assert.equal(q.chords.length, q.degrees.length);
      assert.equal(q.degrees.at(-1), 'I');
      assert.equal(q.cadence[0], q.cadence.at(-1));
      assert.equal(pitchClass(chords.get(q.cadence[0]).temp_audio_notes[0]) >= 0, true);
      q.chords.forEach((name, index) => {
        const degree = q.degrees[index];
        const root = (tonics[q.key] + { I: 0, IV: 5, V: 7, V7: 7 }[degree]) % 12;
        const expected = new Set((degree === 'V7' ? [0, 4, 7, 10] : [0, 4, 7]).map(n => (n + root) % 12));
        const chord = chords.get(name);
        assert.ok(chord, `${q.id}: missing ${name}`);
        const rootFrequency = 440 * 2 ** ((60 + root - 69) / 12);
        const actual = new Set(audioNotesFor(chord, rootFrequency).map(pitchClass));
        assert.deepEqual(actual, expected, `${q.id}: ${name} audio must match ${degree}`);
      });
      // Every dominant target resolves to I; IV never acquires an ambiguous substitute label.
      if (q.answer === 'D') assert.equal(q.degrees[q.target + 1], 'I');
      for (const name of q.cadence) assert.ok(chords.has(name));
      if (level === 'step1') {
        assert.equal(q.key, 'C');
        assert.ok(!q.degrees.includes('V7'));
      }
    }
  }
});

test('root supplementation preserves source voicings and leaves complete chords unchanged', () => {
  const d7 = chords.get('D7'), before = plain(d7.temp_audio_notes);
  const supplemented = audioNotesFor(d7, 293.66);
  assert.equal(supplemented.length, before.length + 1);
  assert.deepEqual(d7.temp_audio_notes, before);
  const c = chords.get('C');
  assert.deepEqual(plain(audioNotesFor(c, 261.63)), c.temp_audio_notes);
});

test('the same C chord is tested as T, S and D in different keys', () => {
  const functions = new Set(questionPool('step2').filter(q => q.chords[q.target] === 'C').map(q => q.answer));
  assert.deepEqual([...functions].sort(), ['D', 'S', 'T']);
});

function harness(play) {
  const timers = new Map(), played = [], stopped = [];
  let id = 0;
  const session = createSession({
    playChord: play || (async name => { played.push(name); return () => stopped.push(name); }),
    schedule: callback => { timers.set(++id, callback); return id; },
    cancel: id => timers.delete(id), random: () => 0.4
  });
  return { session, played, stopped, timers, async finish() {
    let guard = 0;
    while (timers.size) {
      assert.ok(++guard < 30);
      const [id, callback] = timers.entries().next().value;
      timers.delete(id);
      await callback();
    }
  } };
}

test('answers require the complete cadence and phrase; playback order matches the question', async () => {
  const h = harness(), q = h.session.snapshot().question;
  h.session.answer(q.answer);
  assert.equal(h.session.snapshot().answered, 0);
  await h.session.play();
  h.session.answer(q.answer);
  assert.equal(h.session.snapshot().answered, 0);
  await h.finish();
  assert.deepEqual(h.played, plain([...q.cadence, ...q.chords]));
  assert.equal(h.session.snapshot().heard, true);
  h.session.answer(q.answer);
  h.session.answer(q.answer);
  assert.equal(h.session.snapshot().answered, 1);
  assert.equal(h.session.snapshot().correct, 1);
});

test('wrong answers, replay and next-question preserve accurate session counts', async () => {
  const h = harness();
  await h.session.play(); await h.finish();
  h.session.answer(h.session.snapshot().question.answer === 'T' ? 'D' : 'T');
  assert.equal(h.session.snapshot().correct, 0);
  await h.session.play(); await h.finish();
  h.session.answer(h.session.snapshot().question.answer);
  assert.equal(h.session.snapshot().answered, 1);
  h.session.next();
  assert.equal(h.session.snapshot().heard, false);
  assert.equal(h.session.snapshot().selected, null);
  assert.equal(h.session.snapshot().answered, 1);
});

test('stop, next and level changes cancel pending steps and active sound', async () => {
  for (const action of ['stop', 'next', 'setLevel']) {
    const h = harness();
    await h.session.play();
    const stale = [...h.timers.values()][0];
    h.session[action]('step2');
    await stale();
    await h.finish();
    assert.equal(h.played.length, 1);
    assert.equal(h.stopped.length, 1);
    assert.equal(h.session.snapshot().heard, false);
  }
});

test('late audio initialization cannot revive a canceled question', async () => {
  let resolve, stopCount = 0;
  const h = harness(() => new Promise(done => { resolve = done; }));
  const pending = h.session.play();
  h.session.next();
  resolve(() => { stopCount += 1; });
  await pending;
  assert.equal(stopCount, 1);
  assert.equal(h.timers.size, 0);
  assert.equal(h.session.snapshot().heard, false);
});

test('audio failure remains unanswered and allows a full retry', async () => {
  let fail = true;
  const h = harness(async () => { if (fail) throw new Error('blocked'); });
  await h.session.play();
  assert.equal(h.session.snapshot().phase, 'error');
  h.session.answer('T');
  assert.equal(h.session.snapshot().answered, 0);
  fail = false;
  await h.session.play(); await h.finish();
  assert.equal(h.session.snapshot().heard, true);
});

test('level changes reset session counts and invalid levels have no effect', async () => {
  const h = harness();
  await h.session.play(); await h.finish();
  h.session.answer(h.session.snapshot().question.answer);
  h.session.setLevel('invalid');
  assert.equal(h.session.snapshot().answered, 1);
  h.session.setLevel('step2');
  assert.equal(h.session.snapshot().answered, 0);
  assert.equal(h.session.snapshot().level, 'step2');
});

test('a full beginner deck covers every target once before replenishing', () => {
  const h = harness(), ids = new Set();
  for (let i = 0; i < 9; i += 1) {
    ids.add(h.session.snapshot().question.id);
    h.session.next();
  }
  assert.equal(ids.size, 9);
});


function testHarness() {
  const timers = new Map(); let id = 0;
  const session = createTestSession({ playChord: async () => () => {}, random: () => 0.4,
    schedule: callback => { timers.set(++id, callback); return id; }, cancel: id => timers.delete(id) });
  return { session, async finish() {
    while (timers.size) {
      const [id, callback] = timers.entries().next().value;
      timers.delete(id); await callback();
    }
  } };
}

test('test mode defers grades, answers, chord names and explanations until the result screen', async () => {
  const h = testHarness();
  h.session.start('step1', 3);
  for (let index = 0; index < 3; index += 1) {
    h.session.answer('T');
    assert.equal(h.session.snapshot().answered, index);
    await h.session.play(); await h.finish();
    for (let i = 0; i < 10; i++) h.session.answer('T');
    const state = h.session.snapshot();
    assert.equal(state.answered, index + 1);
    assert.equal(state.correct, undefined);
    assert.equal(state.results.length, 0);
    assert.equal(state.question.answer, undefined);
    assert.equal(state.question.chords, undefined);
    assert.equal(state.question.degrees, undefined);
    h.session.next();
  }
  const done = h.session.snapshot();
  assert.equal(done.status, 'finished');
  assert.equal(done.results.length, 3);
  assert.equal(new Set(done.results.map(item => item.question.answer)).size, 3, 'three-question test covers T, S and D');
  assert.equal(done.correct, done.results.filter(item => item.selected === item.question.answer).length);
  h.session.answer('D'); h.session.next();
  assert.equal(h.session.snapshot().results.length, 3);
});

test('test start and next repeated clicks cannot restart a running attempt or skip unanswered questions', async () => {
  const h = testHarness();
  h.session.start('step1', 3);
  h.session.start('step2', 9);
  assert.equal(h.session.snapshot().count, 3);
  h.session.next(); assert.equal(h.session.snapshot().index, 1);
  await h.session.play(); await h.finish();
  h.session.answer('S'); h.session.next(); h.session.next();
  assert.equal(h.session.snapshot().index, 2);
  assert.equal(h.session.snapshot().answered, 1);
});

test('test interruption cancels sound; returning preserves answers; explicit restart clears them', async () => {
  const h = testHarness();
  h.session.start('step2', 6);
  await h.session.play(); await h.finish(); h.session.answer('D');
  h.session.next(); await h.session.play(); h.session.stop(); await h.finish();
  assert.equal(h.session.snapshot().heard, false);
  assert.equal(h.session.snapshot().answered, 1);
  await h.session.play(); await h.finish(); h.session.answer('T');
  assert.equal(h.session.snapshot().answered, 2);
  h.session.reset();
  assert.equal(h.session.snapshot().status, 'setup');
  assert.equal(h.session.snapshot().answered, 0);
  h.session.start('step1', 9);
  assert.equal(h.session.snapshot().count, 9);
  assert.equal(h.session.snapshot().answered, 0);
});

test('test replay keeps an answer and grade hidden; default count is six', async () => {
  const h = testHarness(); h.session.start('step1', 123);
  assert.equal(h.session.snapshot().count, 6);
  await h.session.play(); await h.finish(); h.session.answer('T');
  await h.session.play(); await h.finish(); h.session.answer('S');
  assert.equal(h.session.snapshot().answered, 1);
  assert.equal(h.session.snapshot().selected, 'T');
  assert.equal(h.session.snapshot().correct, undefined);
});


test('six-question tests balance T/S/D two times each without repeating a question', async () => {
  const h = testHarness(); h.session.start('step2', 6);
  for (let i = 0; i < 6; i++) {
    await h.session.play(); await h.finish(); h.session.answer('T'); h.session.next();
  }
  const rows = h.session.snapshot().results;
  assert.equal(new Set(rows.map(item => item.question.id)).size, 6);
  for (const role of ['T', 'S', 'D']) assert.equal(rows.filter(item => item.question.answer === role).length, 2);
});


test('mounted test guide stays neutral for correct and incorrect answers until grading without exposing answers', async () => {
  const timers = new Map(), states = [], nodes = new Map(); let timerId = 0;
  const node = () => ({hidden:false, disabled:false, textContent:'', children:[], addEventListener(){}, setAttribute(){}, replaceChildren(){this.children=[];}, appendChild(item){this.children.push(item);}, append(...items){this.children.push(...items);}});
  const buttons = ['T','S','D'].map(value => Object.assign(node(), {dataset:{testFunction:value}}));
  const root = {querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);}, querySelectorAll(){return buttons;}};
  const scope = vm.createContext({window:{CodoriGuide:{update(_root,state){states.push(state);}}},
    setTimeout(fn){timers.set(++timerId,fn);return timerId;}, clearTimeout(id){timers.delete(id);},
    document:{createElement:node}});
  for(const file of ['app/audio-engine.js','app/harmony.js'])vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),scope);
  const session = scope.window.CodoriHarmony.mountTest({root,playChord:async()=>()=>{}});
  const finish = async()=>{let steps=0;while(timers.size){assert.ok(++steps<30);const [id,fn]=timers.entries().next().value;timers.delete(id);await fn();}};
  session.start('step1',3);
  for(let i=0;i<3;i++){
    await session.play();assert.equal(states.at(-1),'playing');await finish();assert.equal(states.at(-1),'heard');
    session.answer('T');assert.equal(states.at(-1),'heard');
    assert.equal(session.snapshot().question.answer,undefined);assert.equal(session.snapshot().correct,undefined);assert.equal(session.snapshot().results.length,0);
    await session.play();await finish();session.stop();assert.equal(states.at(-1),'heard');
    assert.ok(states.every(value=>!['correct','review','finished'].includes(value)));
    session.next();
  }
  assert.equal(session.snapshot().correct,1,'balanced test includes one correct and two incorrect answers');
  assert.equal(states.at(-1),'finished');assert.equal(root.querySelector('#test-review').children.length,3);
  session.reset();assert.equal(states.at(-1),'ready');
});
