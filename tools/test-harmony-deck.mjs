import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
const context = vm.createContext({ window: {} });
for (const name of ['audio-engine', 'harmony']) vm.runInContext(fs.readFileSync(new URL(`../app/${name}.js`, import.meta.url), 'utf8'), context);
function make(seed) {
  let state = seed, id = 0; const timers = new Map();
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const session = context.window.CodoriHarmony.createTestSession({ random, playChord: async () => () => {}, schedule: fn => { timers.set(++id, fn); return id; }, cancel: id => timers.delete(id) });
  return { session, async complete() {
    await session.play();
    while (timers.size) { const [id, fn] = timers.entries().next().value; timers.delete(id); await fn(); }
    session.answer('T'); session.next();
  } };
}

test('both levels, 3/6/9 questions, first attempt and restart always have balanced unique decks', async () => {
  const failures = []; let cases = 0;
  for (let seed = 1; seed <= 32; seed++) for (const level of ['step1', 'step2']) for (const count of [3, 6, 9]) {
    const h = make(seed);
    for (const attempt of ['first', 'restart']) {
      if (attempt === 'restart') h.session.reset();
      h.session.start(level, count);
      for (let i = 0; i < count; i++) await h.complete();
      const rows = h.session.snapshot().results;
      const roles = rows.map(row => row.question.answer);
      const balanced = ['T', 'S', 'D'].every(role => roles.filter(value => value === role).length === count / 3);
      const unique = new Set(rows.map(row => row.question.id)).size === count;
      if (!balanced || !unique) failures.push({ seed, level, count, attempt, roles: roles.join('/'), unique });
      cases++;
    }
  }
  console.log(JSON.stringify({ cases, failures: failures.length, examples: failures.slice(0, 8) }));
  assert.equal(failures.length, 0, 'Each attempt must start at a fresh balanced-deck boundary.');
});
