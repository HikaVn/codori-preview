/* The only owner of synthesized audio envelopes. No DOM, timers or audio-device creation. */
(() => {
  const FLOOR = 0.0001;
  const POLICY = Object.freeze({ sequenceStepMs: 950, sequenceGapMs: 700, abortSeconds: 0.02, maxImmediateGroups: 32 });
  const PRESETS = Object.freeze({
    ukulele: Object.freeze({ gate: 1.15, release: 1.45, strum: 0.1, attack: 0.025, partials: Object.freeze([[1, 1], [2, 0.2]].map(Object.freeze)) }),
    reference: Object.freeze({ gate: 0.55, release: 0.35, strum: 0, attack: 0.03, partials: Object.freeze([[1, 1], [2, 0.2]].map(Object.freeze)) }),
    piano: Object.freeze({ gate: 1.15, release: 0.09, decay: 2.6, strum: 0.03, attack: 0.005, partials: Object.freeze([[1, 1], [2, 0.5], [3, 0.28], [4, 0.14], [5, 0.07]].map(Object.freeze)) }),
    'score-melody': Object.freeze({ minGate: 0.06, gate: 1, release: 0.09, attack: 0.03, partials: Object.freeze([[1, 1], [2, 0.35], [3, 0.18]].map(Object.freeze)) }),
    'score-chord': Object.freeze({ minGate: 0.06, gate: 1, release: 0.09, attack: 0.03, partials: Object.freeze([[1, 1], [2, 0.22]].map(Object.freeze)) }),
    'score-piano': Object.freeze({ minGate: 0.06, gate: 1, release: 0.09, attack: 0.008, partials: Object.freeze([[1, 1], [2, 0.5], [3, 0.28], [4, 0.14], [5, 0.07]].map(Object.freeze)) }),
    melody: Object.freeze({ minGate: 0.12, gate: 0.5, release: 0.05, attack: 0.015, waveform: 'triangle' }),
    metronome: Object.freeze({ gate: 0.07, release: 0.03, attack: 0.004, waveform: 'triangle' }),
    pluck: Object.freeze({ minGate: 0.12, gate: 0.5, release: 0.05, attack: 0.015, waveform: 'sine' })
  });
  const engines = new WeakMap();
  function finite(value, fallback) { return Number.isFinite(value) ? value : fallback; }
  // Keep an analytic copy of automation: AudioParam.value is not the value at an arbitrary note-off.
  function automate(param, events) {
    let timeline = events;
    function apply(list) {
      for (const [kind, value, time] of list) {
        if (kind === 'set') param.setValueAtTime(value, time);
        else if (kind === 'linear') param.linearRampToValueAtTime(value, time);
        else param.exponentialRampToValueAtTime(value, time);
      }
    }
    function valueAt(time) {
      let previous = timeline[0];
      if (time < previous[2]) return 0;
      for (let i = 1; i < timeline.length; i++) {
        const next = timeline[i];
        if (time < next[2]) {
          if (next[0] === 'set') return previous[1];
          const ratio = Math.max(0, Math.min(1, (time - previous[2]) / (next[2] - previous[2])));
          return next[0] === 'linear' ? previous[1] + (next[1] - previous[1]) * ratio : previous[1] * (next[1] / previous[1]) ** ratio;
        }
        previous = next;
      }
      return previous[1];
    }
    apply(timeline);
    return { valueAt, release(time, seconds) {
      const value = Math.max(FLOOR, valueAt(time));
      param.cancelScheduledValues(time);
      const tail = [['set', value, time], ['exp', FLOOR, time + seconds]];
      timeline = [...timeline.filter(event => event[2] < time), ...tail]; apply(tail);
    } };
  }

  function forContext(context) {
    if (engines.has(context)) return engines.get(context);
    const active = new Set();
    function play(request) {
      for (const forbidden of ['durationSeconds', 'releaseSeconds', 'attackSeconds', 'partials']) {
        if (forbidden in request) throw new TypeError(`Use a named audio profile; ${forbidden} is not a screen option.`);
      }
      const profileName = request.profile || 'ukulele', profile = PRESETS[profileName];
      if (!profile) throw new TypeError(`Unknown audio profile: ${profileName}`);
      const frequencies = [...(request.frequencies || [])];
      if (!frequencies.length || frequencies.some(value => !Number.isFinite(value) || value <= 0)) throw new TypeError('Valid frequencies are required.');
      const start = Math.max(context.currentTime, finite(request.startTime, context.currentTime));
      const gate = Math.max(profile.minGate || 0.04, finite(request.gateSeconds, profile.gate));
      const loudness = Math.max(0, finite(request.gain, 1));
      const strum = request.performance === 'rhythmic' ? 0.03 : (profile.strum || 0);
      const output = context.createGain(); output.connect(context.destination);
      let outputAutomation;
      const master = context.createGain(); master.connect(output);
      const automations = [], sources = [];
      const envelope = (param, events) => { const result = automate(param, events); automations.push(result); return result; };
      let endTime, gateTime = start + gate;
      if (profileName === 'ukulele') {
        envelope(master.gain, [['set', FLOOR, start], ['exp', Math.max(FLOOR, 0.16 * loudness), start + 0.04], ['set', Math.max(FLOOR, 0.16 * loudness), start + Math.max(0.04, gate)], ['exp', FLOOR, gateTime + profile.release]]);
      } else if (profileName === 'piano') {
        // Percussive decay is fixed; short notes use the damper, not a time-scaled piano.
        envelope(master.gain, [['set', FLOOR, start], ['exp', Math.max(FLOOR, 0.16 * loudness), start + 0.04], ['set', Math.max(FLOOR, 0.16 * loudness), start + 1.15], ['exp', FLOOR, start + 2.6]]);
      } else master.gain.setValueAtTime(loudness, start);
      frequencies.forEach((frequency, index) => {
        const noteStart = start + index * strum;
        const partials = profile.partials || [[1, 1]];
        for (const [multiple, amplitude] of partials) {
          const osc = context.createOscillator(), gain = context.createGain();
          osc.type = profile.waveform || 'sine'; osc.frequency.value = frequency * multiple;
          osc.connect(gain); gain.connect(master);
          let events, stopTime;
          if (profileName === 'ukulele') {
            const off = noteStart + Math.max(profile.attack, Math.round((gate - 0.1) * 1e9) / 1e9);
            events = [['set', FLOOR, noteStart], ['exp', 0.16 * amplitude, noteStart + profile.attack], ['set', 0.13 * amplitude, off], ['exp', FLOOR, off + profile.release]];
            stopTime = off + profile.release + 0.1;
          } else if (profileName === 'reference') {
            events = [['set', FLOOR, noteStart], ['exp', 0.12 * amplitude, noteStart + profile.attack], ['set', 0.1 * amplitude, noteStart + gate], ['exp', FLOOR, noteStart + gate + profile.release]];
            stopTime = noteStart + gate + profile.release + 0.05;
          } else if (profileName === 'piano') {
            events = [['set', FLOOR, noteStart], ['linear', 0.16 * amplitude, noteStart + profile.attack], ['exp', FLOOR, start + profile.decay]];
            stopTime = start + profile.decay + 0.05;
          } else if (profileName.startsWith('score-')) {
            events = [['set', FLOOR, noteStart], ['linear', finite(request.voiceGain, 0.05) * amplitude, noteStart + profile.attack], ['set', finite(request.voiceGain, 0.05) * amplitude, noteStart + Math.max(profile.attack, gate)], ['exp', FLOOR, noteStart + gate + profile.release]];
            stopTime = noteStart + gate + profile.release + 0.05;
          } else {
            events = [['set', FLOOR, noteStart], ['exp', finite(request.voiceGain, 0.12), noteStart + profile.attack], ['exp', FLOOR, noteStart + Math.max(profile.attack, gate)], ['exp', FLOOR, noteStart + gate + profile.release]];
            stopTime = noteStart + gate + profile.release + 0.05;
          }
          envelope(gain.gain, events); osc.start(noteStart); osc.stop(stopTime);
          sources.push(osc); endTime = Math.max(endTime || 0, stopTime);
        }
      });
      if (profileName === 'piano' && gateTime + profile.release + 0.05 < endTime) {
        endTime = gateTime + profile.release + 0.05; sources.forEach(osc => osc.stop(endTime));
      }
      if (profileName === 'ukulele') endTime = Math.max(endTime, gateTime + profile.release);
      let stopped = false, naturalOff = gateTime;
      const abort = (time = context.currentTime) => {
        if (stopped) return; stopped = true;
        if (context.state === "closed") { active.delete(abort); return; }
        time = Math.max(context.currentTime, time);
        output.gain.cancelScheduledValues(time);
        output.gain.setValueAtTime(Math.max(0, outputAutomation.valueAt(time)), time);
        output.gain.linearRampToValueAtTime(0, time + POLICY.abortSeconds);
        sources.forEach(osc => { try { osc.stop(time + POLICY.abortSeconds); } catch {} });
        active.delete(abort);
      };
      Object.assign(abort, {
        startTime: start, endTime, nextStepMs: POLICY.sequenceStepMs, gapMs: POLICY.sequenceGapMs,
        completeAfterMs: Math.max(0, endTime - context.currentTime) * 1000,
        noteOff(time = context.currentTime) {
          time = Math.max(context.currentTime, time);
          if (stopped || time >= naturalOff) return;
          naturalOff = time;
          automations.forEach(automation => automation.release(time, profile.release));
          sources.forEach(osc => { try { osc.stop(Math.min(endTime, time + profile.release + 0.1)); } catch {} });
        }
      });
      const level = loudness === 0 || request.voiceGain === 0 ? 0 : 1;
      outputAutomation = automate(output.gain, [['set', level, start], ...(profileName === 'piano' && gateTime < endTime ? [['set', level, gateTime], ['linear', 0, gateTime + profile.release]] : [])]);
      let remaining = sources.length;
      sources.forEach(osc => { osc.onended = () => { if (--remaining === 0) { active.delete(abort); output.disconnect(); master.disconnect(); } }; });
      // Scores schedule many future notes at once. Only cap immediate user-triggered
      // overlaps; evicting a future reservation would erase the beginning of long scores.
      if (start <= context.currentTime) {
        const sounding = [...active].filter(handle => handle.startTime <= context.currentTime && handle.endTime > context.currentTime);
        if (sounding.length >= POLICY.maxImmediateGroups) sounding[0]();
      }
      active.add(abort);
      return abort;
    }
    const engine = Object.freeze({ play, click(startTime, accent = false) { return play({ profile: "metronome", frequencies: [accent ? 1700 : 1100], startTime, voiceGain: accent ? 0.22 : 0.12 }); }, stopAll(time) { [...active].forEach(handle => handle(time)); }, get activeCount() { return active.size; } });
    engines.set(context, engine); return engine;
  }
  window.CodoriAudio = Object.freeze({ policy: POLICY, profiles: PRESETS, forContext, isRenderable: context => context.state === "running" || typeof context.startRendering === "function" });
})();
