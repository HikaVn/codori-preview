// Frozen independent reference: deeccb6 (before harmony) and b33a017 (reported regression).
// Registration only tracks cancellation; it does not change rendered audio.
(() => {
const ARPEGGIO_NOTE_INTERVAL_SECONDS = 0.1, HARMONIC_GAIN_RATIO = 0.2;
const registerSyntheticPlayback = () => {};
function legacyCard(context, audioNotes) {
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.16, now + 0.04);
  master.gain.setValueAtTime(0.16, now + 1.15);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
  master.connect(context.destination);

  audioNotes.forEach((frequency, index) => {
    const start = now + index * ARPEGGIO_NOTE_INTERVAL_SECONDS;
    const oscillator = context.createOscillator();
    const harmonic = context.createOscillator();
    const gain = context.createGain();
    const harmonicGain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    harmonic.type = "sine";
    harmonic.frequency.value = frequency * 2;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
    gain.gain.setValueAtTime(0.13, start + 1.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.5);
    harmonicGain.gain.setValueAtTime(0.0001, start);
    harmonicGain.gain.exponentialRampToValueAtTime(0.16 * HARMONIC_GAIN_RATIO, start + 0.025);
    harmonicGain.gain.setValueAtTime(0.13 * HARMONIC_GAIN_RATIO, start + 1.05);
    harmonicGain.gain.exponentialRampToValueAtTime(0.0001, start + 2.5);
    oscillator.connect(gain);
    harmonic.connect(harmonicGain);
    gain.connect(master);
    harmonicGain.connect(master);
    oscillator.start(start);
    harmonic.start(start);
    oscillator.stop(start + 2.6);
    harmonic.stop(start + 2.6);
  });
}

function compressedHarmony(context, audioNotes, durationSeconds = 2.6) {
  const scale = durationSeconds / 2.6;
  const sources = [];
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.16, now + 0.04);
  master.gain.setValueAtTime(0.16, now + 1.15 * scale);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 2.6 * scale);
  master.connect(context.destination);

  audioNotes.forEach((frequency, index) => {
    const start = now + index * Math.min(ARPEGGIO_NOTE_INTERVAL_SECONDS, durationSeconds / (audioNotes.length * 2));
    const oscillator = context.createOscillator();
    const harmonic = context.createOscillator();
    const gain = context.createGain();
    const harmonicGain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    harmonic.type = "sine";
    harmonic.frequency.value = frequency * 2;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
    gain.gain.setValueAtTime(0.13, start + 1.05 * scale);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.5 * scale);
    harmonicGain.gain.setValueAtTime(0.0001, start);
    harmonicGain.gain.exponentialRampToValueAtTime(0.16 * HARMONIC_GAIN_RATIO, start + 0.025);
    harmonicGain.gain.setValueAtTime(0.13 * HARMONIC_GAIN_RATIO, start + 1.05 * scale);
    harmonicGain.gain.exponentialRampToValueAtTime(0.0001, start + 2.5 * scale);
    oscillator.connect(gain);
    harmonic.connect(harmonicGain);
    gain.connect(master);
    harmonicGain.connect(master);
    oscillator.start(start);
    harmonic.start(start);
    oscillator.stop(start + 2.6 * scale);
    harmonic.stop(start + 2.6 * scale);
    sources.push({ node: oscillator, startTime: start }, { node: harmonic, startTime: start });
  });
  return registerSyntheticPlayback(context, master, sources, durationSeconds);
}

function legacyReference(frequency, context, durationSeconds = 0.95) {
  const now = context.currentTime;
  const master = context.createGain();
  const fundamental = context.createOscillator();
  const harmonic = context.createOscillator();
  const fundamentalGain = context.createGain();
  const harmonicGain = context.createGain();

  master.gain.setValueAtTime(1, now);
  master.connect(context.destination);
  fundamental.type = "sine";
  fundamental.frequency.value = frequency;
  harmonic.type = "sine";
  harmonic.frequency.value = frequency * 2;
  fundamentalGain.gain.setValueAtTime(0.0001, now);
  fundamentalGain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
  fundamentalGain.gain.setValueAtTime(0.1, now + 0.55);
  fundamentalGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  harmonicGain.gain.setValueAtTime(0.0001, now);
  harmonicGain.gain.exponentialRampToValueAtTime(0.12 * HARMONIC_GAIN_RATIO, now + 0.03);
  harmonicGain.gain.setValueAtTime(0.1 * HARMONIC_GAIN_RATIO, now + 0.55);
  harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  fundamental.connect(fundamentalGain);
  harmonic.connect(harmonicGain);
  fundamentalGain.connect(master);
  harmonicGain.connect(master);
  fundamental.start(now);
  harmonic.start(now);
  fundamental.stop(now + durationSeconds);
  harmonic.stop(now + durationSeconds);
  registerSyntheticPlayback(
    context,
    master,
    [
      { node: fundamental, startTime: now },
      { node: harmonic, startTime: now },
    ],
    durationSeconds,
  );
}

let audioCtx; const song = { bpm: 100 }, el = { chordPianoToggle: { checked: true } }, ringingChords = [];
const STRUM_ARPEGGIO_INTERVAL = 0.03, STRUM_HARMONIC_RATIO = 0.2, PIANO_CHORD_PARTIALS = [[1,1],[2,0.5],[3,0.28],[4,0.14],[5,0.07]], PIANO_ATTACK = 0.005, CHORD_CHANGE_GAP = 0.07;
function originalStrum(chord, time, beats, strumGain = 1, frequencies = chordFrequencies(chord)) {
  if (!frequencies) {
    return;
  }
  // 「コードをピアノ音で」トグル。OFF時は従来どおりのウクレレ・ストラム音のまま。
  const piano = el.chordPianoToggle?.checked;
  const ctx = audioCtx;
  const secPerBeatNow = 60 / song.bpm;
  // コードが切り替わる際に、ほんの少し前で音を切って隙間を作る（次のコードへ被らせない）。
  // 割り当てられた拍ぶんの長さから CHORD_CHANGE_GAP だけ手前で消えるようにする。
  const fullSec = beats * secPerBeatNow;
  const duration = Math.min(Math.max(fullSec - CHORD_CHANGE_GAP, 0.3), 2.6);
  const masterHold = Math.min(1.15, duration * 0.45);
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, time);
  master.gain.exponentialRampToValueAtTime(0.16 * strumGain, time + 0.04);
  master.gain.setValueAtTime(0.16 * strumGain, time + masterHold);
  master.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  master.connect(ctx.destination);
  ringingChords.push({ gain: master, until: time + duration + 0.3 });

  frequencies.forEach((frequency, index) => {
    const start = time + index * STRUM_ARPEGGIO_INTERVAL;
    const end = Math.max(start + 0.2, time + duration);
    if (piano) {
      // ピアノ風の声：倍音を重ねた減衰音（保持せず、立ち上がり後は指数的に鳴り減っていく）
      const attackEnd = Math.min(start + PIANO_ATTACK, end - 0.02);
      PIANO_CHORD_PARTIALS.forEach(([mult, amp]) => {
        const posc = ctx.createOscillator();
        const pgain = ctx.createGain();
        posc.type = "sine";
        posc.frequency.value = frequency * mult;
        pgain.gain.setValueAtTime(0.0001, start);
        pgain.gain.linearRampToValueAtTime(0.16 * amp, attackEnd);
        pgain.gain.exponentialRampToValueAtTime(0.0001, end);
        posc.connect(pgain);
        pgain.connect(master);
        posc.start(start);
        posc.stop(end + 0.05);
      });
      return;
    }
    const hold = Math.min(start + 1.05, end - 0.1);
    const osc = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const gain = ctx.createGain();
    const harmonicGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    harmonic.type = "sine";
    harmonic.frequency.value = frequency * 2;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
    gain.gain.setValueAtTime(0.13, hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    harmonicGain.gain.setValueAtTime(0.0001, start);
    harmonicGain.gain.exponentialRampToValueAtTime(0.16 * STRUM_HARMONIC_RATIO, start + 0.025);
    harmonicGain.gain.setValueAtTime(0.13 * STRUM_HARMONIC_RATIO, hold);
    harmonicGain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    harmonic.connect(harmonicGain);
    gain.connect(master);
    harmonicGain.connect(master);
    osc.start(start);
    harmonic.start(start);
    osc.stop(end + 0.05);
    harmonic.stop(end + 0.05);
  });
}


function legacySongPiano(context, frequencies) { audioCtx = context; originalStrum("C", 0, 5, 1, frequencies); }
window.CodoriLegacyReference = { legacyCard, compressedHarmony, legacyReference, legacySongPiano };
})();
