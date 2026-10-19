// Explicit opt-in native layer. OfflineAudioContext renders real Web Audio nodes; no speakers.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.CODORI_TEST_URL || 'http://127.0.0.1:8768/app/';
const output = process.env.CODORI_TEST_OUTPUT || 'validation-audio';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, args: ['--mute-audio'] });
await fs.mkdir(output, { recursive: true });
try {
  const page = await browser.newPage();
  await page.goto(base); await page.waitForFunction(() => window.CodoriAudio && harmonySession);
  await page.addScriptTag({ url: new URL('../tools/fixtures/legacy-audio-reference.js', base).href });
  const main = await page.evaluate(async () => {
    const rate = 48000, seconds = 7, notes = practiceCatalog.get('C').temp_audio_notes;
    const results = {}, waves = {};
    const summarize = (data, gate = 1.15) => {
      const bins = [];
      for (let i = 0; i < data.length; i += 480) {
        let sum = 0; for (let j = i; j < Math.min(i + 480, data.length); j++) sum += data[j] ** 2;
        bins.push(Math.sqrt(sum / 480));
      }
      const peak = Math.max(...bins), last = threshold => { let index = bins.length - 1; while (index >= 0 && bins[index] < peak * threshold) index--; return (index + 1) / 100; };
      return { peakRms: peak, lastAboveMinus60dB: last(0.001), releaseToMinus60dB: last(0.001) - gate, rms10ms: bins };
    };
    async function render(mode, gate) {
      stopLearningAudio();
      const ctx = new OfflineAudioContext(1, rate * seconds, rate); audioContext = ctx;
      const chord = practiceCatalog.get('C');
      if (mode === 'legacy') CodoriLegacyReference.legacyCard(ctx, notes);
      else if (mode === 'old-harmony') CodoriLegacyReference.compressedHarmony(ctx, notes, 0.75);
      else if (mode === 'root-legacy') CodoriLegacyReference.legacyReference(349.23, ctx);
      else if (mode === 'root') playSyntheticTone(349.23, ctx);
      else if (mode === 'card') await playChord(chord, { trackProgress: false, gateSeconds: gate });
      else if (mode === 'quiz') { chordData = [chord]; quizIndex = 0; await playQuizChord(); }
      else if (mode === 'lesson') { currentAppRoute = 'learn'; await playLessonExample('tonic'); }
      else if (mode === 'practice') await harmonySession.play();
      else if (mode === 'test') { harmonyTestSession.reset(); harmonyTestSession.start('step1', 3); await harmonyTestSession.play(); }
      else if (mode === 'rhythmic') await playChord(chord, { frequencies: notes, trackProgress: false, performance: 'rhythmic', gateSeconds: gate });
      const data = (await ctx.startRendering()).getChannelData(0).slice();
      lessonPlayer.stop(); harmonySession.stop(); harmonyTestSession.stop();
      waves[mode + (gate === undefined ? '' : `-${gate}`)] = data;
      return data;
    }
    const legacy = await render('legacy');
    for (const mode of ['old-harmony', 'card', 'quiz', 'lesson', 'practice', 'test']) {
      const data = await render(mode);
      let max = 0, square = 0;
      for (let i = 0; i < data.length; i++) { const error = data[i] - legacy[i]; max = Math.max(max, Math.abs(error)); square += error ** 2; }
      results[mode] = { ...summarize(data), maxSampleErrorVsLegacy: max, rmsErrorVsLegacy: Math.sqrt(square / data.length) };
    }
    results.legacy = summarize(legacy);
    const reference = await render('root-legacy'), fixedReference = await render('root');
    results.referenceMaxError = fixedReference.reduce((value, sample, i) => Math.max(value, Math.abs(sample - reference[i])), 0);
    for (const gate of [0.4, 0.75, 1.15, 2]) results[`gate-${gate}`] = summarize(await render('card', gate), gate);
    // Real note-off vs transport abort, including sources scheduled after the cancellation.
    for (const action of ['noteOff', 'abort', 'route-stop', 'rapid-stop']) {
      const ctx = new OfflineAudioContext(1, rate * seconds, rate); audioContext = ctx;
      const engine = CodoriAudio.forContext(ctx);
      if (action === 'noteOff') { const h = engine.play({ frequencies: notes, gateSeconds: 2 }); h.noteOff(0.6); }
      else if (action === 'abort') { const h = engine.play({ frequencies: notes, gateSeconds: 2 }); h(0.6); engine.play({ frequencies: notes, startTime: 4 })(0.6); }
      else {
        if (action === 'rapid-stop') for (let i = 0; i < 100; i++) await playChord(practiceCatalog.get('C'), { trackProgress: false });
        else { await playHarmonyChord('C'); engine.play({ frequencies: notes, startTime: 4 }); }
        const paused = ctx.suspend(0.6), rendering = ctx.startRendering(); await paused;
        const stoppedAt = ctx.currentTime; stopLearningAudio(); await ctx.resume();
        const data = (await rendering).getChannelData(0);
        let peak = 0; for (let i = Math.ceil((stoppedAt + 0.021) * rate); i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
        results[action] = { stoppedAt, residualPeakAfter21ms: peak, activeGroups: engine.activeCount }; continue;
      }
      const data = (await ctx.startRendering()).getChannelData(0);
      let residual = 0; for (let i = Math.ceil(0.621 * rate); i < data.length; i++) residual = Math.max(residual, Math.abs(data[i]));
      results[action] = { ...summarize(data, 0.6), residualPeakAfter21ms: residual };
    }
    // Export a single rhythmic render for the song adapter comparison.
    const rhythmic = await render('rhythmic', 1.15);
    return { rate, notes, results, rhythmic: [...rhythmic], legacyPcm: [...legacy], fixedPcm: [...waves.card], compressedPcm: [...waves['old-harmony']] };
  });
  await fs.writeFile(`${output}/main-diagnostics.json`, JSON.stringify(main.results, null, 2));
  console.log('Mode errors:', Object.fromEntries(['card','quiz','lesson','practice','test'].map(mode => [mode, main.results[mode].maxSampleErrorVsLegacy])));
  for (const mode of ['card', 'quiz', 'lesson', 'practice', 'test']) assert.ok(main.results[mode].maxSampleErrorVsLegacy < 1e-7, mode);
  assert.ok(main.results['old-harmony'].maxSampleErrorVsLegacy > 0.001);
  assert.ok(main.results.referenceMaxError < 1e-7);
  const releases = [0.4, 0.75, 1.15, 2].map(gate => main.results[`gate-${gate}`].releaseToMinus60dB);
  assert.ok(Math.max(...releases) - Math.min(...releases) <= 0.03, 'gate duration must not scale release');
  for (const mode of ['abort', 'route-stop', 'rapid-stop']) assert.equal(main.results[mode].residualPeakAfter21ms, 0, mode);
  assert.ok(main.results.noteOff.residualPeakAfter21ms > 0.001, 'natural note-off must retain a release');
  let songResults = { scope: 'main-only; song paths not selected' };
  if (process.env.CODORI_AUDIO_SCOPE !== 'main') {
  const song = await browser.newPage();
  await song.goto(new URL('song/', base).href); await song.waitForFunction(() => window.CodoriAudio && typeof strumChord === 'function' && typeof scorePreviewVoice === 'function');
  await song.addScriptTag({ url: new URL("../tools/fixtures/legacy-audio-reference.js", base).href });
  songResults = await song.evaluate(async notes => {
    const rate = 48000, ctx = new OfflineAudioContext(1, rate * 7, rate);
    audioCtx = ctx; song.bpm = 100; el.chordPianoToggle.checked = false;
    // Use the identical voicing in both adapters; musical strum is deliberately rhythmic (30ms).
    strumChord('C', 0, 1.15 / (60 / song.bpm), 1, notes);
    const actual = (await ctx.startRendering()).getChannelData(0).slice();
    const referenceCtx = new OfflineAudioContext(1, rate * 7, rate);
    CodoriAudio.forContext(referenceCtx).play({ frequencies: notes, performance: 'rhythmic', gateSeconds: 1.15 });
    const expected = (await referenceCtx.startRendering()).getChannelData(0);
    let max = 0; for (let i = 0; i < actual.length; i++) max = Math.max(max, Math.abs(actual[i] - expected[i]));
    const scoreCtx = new OfflineAudioContext(1, rate * 7, rate); audioCtx = scoreCtx;
    scorePreviewVoice(440, 0, 1.15, 0.05, 'score-chord');
    const scoreActual = (await scoreCtx.startRendering()).getChannelData(0);
    const expectedCtx = new OfflineAudioContext(1, rate * 7, rate);
    CodoriAudio.forContext(expectedCtx).play({ profile: 'score-chord', frequencies: [440], gateSeconds: 1.15, voiceGain: 0.05 });
    const scoreExpected = (await expectedCtx.startRendering()).getChannelData(0);
    let scoreError = 0; for (let i = 0; i < scoreActual.length; i++) scoreError = Math.max(scoreError, Math.abs(scoreActual[i] - scoreExpected[i]));
    const oldPianoCtx = new OfflineAudioContext(1, rate * 7, rate);
    CodoriLegacyReference.legacySongPiano(oldPianoCtx, notes);
    const oldPiano = (await oldPianoCtx.startRendering()).getChannelData(0);
    const pianoCtx = new OfflineAudioContext(1, rate * 7, rate); audioCtx = pianoCtx; el.chordPianoToggle.checked = true;
    strumChord('C', 0, 5, 1, notes);
    const piano = (await pianoCtx.startRendering()).getChannelData(0);
    let pianoError = 0; for (let i = 0; i < piano.length; i++) pianoError = Math.max(pianoError, Math.abs(piano[i] - oldPiano[i]));
    // Actual score adapter reserves complete pieces. More than 32 future notes
    // must retain the beginning as well as the end, and remain cancelable.
    const longCtx = new OfflineAudioContext(1, rate * 7, rate); audioCtx = longCtx;
    for (let i = 0; i < 40; i++) scorePreviewVoice(440, 0.1 + i * 0.1, 0.06, 0.05, 'score-melody');
    const longScore = (await longCtx.startRendering()).getChannelData(0);
    const rmsAt = time => { let sum = 0; for (let i = Math.floor(time * rate); i < Math.floor((time + 0.02) * rate); i++) sum += longScore[i] ** 2; return Math.sqrt(sum / (0.02 * rate)); };
    const longScoreFirstRms = rmsAt(0.14), longScoreLastRms = rmsAt(4.04);
    const cancelCtx = new OfflineAudioContext(1, rate * 7, rate); audioCtx = cancelCtx;
    for (let i = 0; i < 40; i++) scorePreviewVoice(440, 0.1 + i * 0.1, 0.06, 0.05, 'score-melody');
    const paused = cancelCtx.suspend(0.6), rendering = cancelCtx.startRendering(); await paused;
    const scoreStoppedAt = cancelCtx.currentTime; scoreStopNodes(); await cancelCtx.resume();
    const canceledScore = (await rendering).getChannelData(0);
    let canceledScoreResidual = 0;
    for (let i = Math.ceil((scoreStoppedAt + 0.021) * rate); i < canceledScore.length; i++) canceledScoreResidual = Math.max(canceledScoreResidual, Math.abs(canceledScore[i]));
    return { canceledScoreResidual, longScoreFirstRms, longScoreLastRms, strumMaxSampleError: max, scoreMaxSampleError: scoreError, pianoMaxErrorVsLegacy: pianoError, actualPcm: [...actual], staccato: articFactors('staccato'), tenuto: articFactors('tenuto') };
  }, main.notes);
  songResults.mainModeMaxError = songResults.actualPcm.reduce((value, sample, i) => Math.max(value, Math.abs(sample - main.rhythmic[i])), 0);
  delete songResults.actualPcm;
  assert.ok(songResults.strumMaxSampleError < 1e-7);
  assert.ok(songResults.mainModeMaxError < 1e-7);
  assert.ok(songResults.pianoMaxErrorVsLegacy < 1e-7);
  assert.ok(songResults.scoreMaxSampleError < 1e-7);
  assert.equal(songResults.canceledScoreResidual, 0, 'long score cancels all future notes');
  assert.ok(songResults.longScoreFirstRms > 0.001 && songResults.longScoreLastRms > 0.001, 'long score keeps first and last notes');
  assert.ok(songResults.staccato.gate < songResults.tenuto.gate, 'articulation is not flattened');
  }
  const waveFile = samples => {
    const buffer = Buffer.alloc(44 + samples.length * 2); buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(main.rate, 24); buffer.writeUInt32LE(main.rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples.length * 2, 40); samples.forEach((value, i) => buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value * 32767))), 44 + i * 2)); return buffer;
  };
  await fs.writeFile(`${output}/legacy-card.wav`, waveFile(main.legacyPcm));
  await fs.writeFile(`${output}/fixed-harmony.wav`, waveFile(main.fixedPcm));
  await fs.writeFile(`${output}/compressed-harmony.wav`, waveFile(main.compressedPcm));
  await fs.writeFile(`${output}/waveform-results.json`, JSON.stringify({ browser: await browser.version(), sampleRate: main.rate, ...main.results, song: songResults }, null, 2));
  console.log(JSON.stringify({ status: 'passed', matchedModes: ['card', 'quiz', 'lesson', 'practice', 'test'], legacyT60: main.results.legacy.lastAboveMinus60dB, oldHarmonyT60: main.results['old-harmony'].lastAboveMinus60dB, releaseRange: releases, residuals: [main.results.abort.residualPeakAfter21ms, main.results['route-stop'].residualPeakAfter21ms, main.results['rapid-stop'].residualPeakAfter21ms], song: songResults }));
} finally { await browser.close(); }
