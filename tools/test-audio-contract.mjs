import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { test } from 'node:test';
const root = new URL('../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const context = vm.createContext({ window: {} });
vm.runInContext(read('app/audio-engine.js'), context);
const audio = context.window.CodoriAudio;

test('one immutable owner defines instrument envelopes and sequence timing', () => {
  assert.ok(Object.isFrozen(audio) && Object.isFrozen(audio.policy));
  assert.ok(Object.isFrozen(audio.profiles.ukulele) && Object.isFrozen(audio.profiles.ukulele.partials[0]));
  assert.equal(audio.profiles.ukulele.release, 1.45);
  assert.equal(audio.profiles.reference.release, 0.35);
  assert.equal(audio.policy.abortSeconds, 0.02);
  const same = {}; assert.equal(audio.forContext(same), audio.forContext(same));
});

test('screens cannot pass a release/attack/duration override or an invalid instrument', () => {
  const engine = audio.forContext({ currentTime: 0 });
  for (const key of ['durationSeconds', 'releaseSeconds', 'attackSeconds', 'partials']) {
    assert.throws(() => engine.play({ frequencies: [440], [key]: 0.75 }), /named audio profile/);
  }
  assert.throws(() => engine.play({ profile: 'new-screen-synth', frequencies: [440] }), /Unknown audio profile/);
  assert.throws(() => engine.play({ frequencies: [NaN] }), /Valid frequencies/);
});

test('product screens do not construct oscillators or carry independent envelope renderers', () => {
  function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
  }
  for (const file of walk(fileURLToPath(new URL('../app', import.meta.url)))) {
    if (!file.endsWith('.js') || file.endsWith('audio-engine.js')) continue;
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /\.createOscillator\s*\(/, file);
  }
  assert.doesNotMatch(read('app/harmony.js'), /\b1150\b|\b700\b|durationSeconds|createGain/);
  assert.doesNotMatch(read('app/main.js'), /durationSeconds\s*:/);
  assert.match(read('app/main.js'), /playHarmonyChord[\s\S]*?return playChord/);
});

test('the three menu areas put the story only under practical use and preserve stored progress schema', () => {
  const html = read('app/index.html');
  assert.match(html, /data-area="test"[^>]*>実践する/);
  const practice = html.split('data-home-area="practice"')[1].split('data-home-area="test"')[0];
  assert.doesNotMatch(practice, /data-route="legacy"/);
  const practical = html.split('data-home-area="test"')[1].split('id="lesson-view"')[0];
  assert.match(practical, /data-route="legacy"[^>]*><strong>音あてストーリー/);
  assert.doesNotMatch(practical, /data-route="test"/);
  assert.match(read('app/pops-course-data.js'), /id:1,title:'機能和声の基礎/);
  assert.match(read('app/main.js'), /const STORAGE_KEY = "codori\.practiceProgress\.v1"/);
  assert.match(read('app/main.js'), /legacy: "test"/);
});
