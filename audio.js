// Tiny generative music box: soft arpeggios over dreamy seventh chords.
export function createAudio() {
  let ctx = null, master = null, bus = null;
  let playing = false, timer = null, nextTime = 0, step = 0;

  const CHORDS = [
    [53, 57, 60, 64], // Fmaj7
    [52, 55, 59, 62], // Em7
    [50, 53, 57, 60], // Dm7
    [48, 52, 55, 59], // Cmaj7
  ];
  const PATTERN = [0, 1, 2, 3, 2, 1, 3, 2];
  const STEP = 0.34;

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(master);

    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = STEP * 1.5;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    bus.connect(delay);
    delay.connect(lp);
    lp.connect(fb);
    fb.connect(delay);
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    lp.connect(wet);
    wet.connect(master);
    return true;
  }

  function note(time, midi, vel = 0.2, dur = 1.6) {
    const f = mtof(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vel, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    g.connect(bus);

    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = f;
    o1.connect(g);

    const g2 = ctx.createGain();
    g2.gain.value = 0.18;
    g2.connect(g);
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = f * 2.001;
    o2.connect(g2);

    o1.start(time); o2.start(time);
    o1.stop(time + dur + 0.05); o2.stop(time + dur + 0.05);
  }

  function schedule() {
    while (nextTime < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / PATTERN.length) % CHORDS.length;
      const i = step % PATTERN.length;
      const chord = CHORDS[bar];
      note(nextTime, chord[PATTERN[i]] + 12, i === 0 ? 0.16 : 0.1, 1.8);
      if (i === 0) note(nextTime, chord[0] - 12, 0.12, 3.2);
      if (i === 4 && Math.random() < 0.5) note(nextTime + STEP * 0.5, chord[3] + 24, 0.045, 1.2);
      nextTime += STEP;
      step++;
    }
  }

  function fadeTo(v, sec = 1.2) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(v, now + sec);
  }

  return {
    get playing() { return playing; },
    start() {
      if (!init()) return false;
      if (ctx.state === 'suspended') ctx.resume();
      if (playing) return true;
      playing = true;
      nextTime = ctx.currentTime + 0.1;
      schedule();
      timer = setInterval(schedule, 60);
      fadeTo(0.55, 2);
      return true;
    },
    stop() {
      if (!ctx || !playing) return;
      playing = false;
      fadeTo(0, 0.6);
      setTimeout(() => { if (!playing) clearInterval(timer); }, 700);
    },
    chime() {
      if (!ctx || !playing) return;
      const t = ctx.currentTime + 0.02;
      [72, 76, 79, 84, 88].forEach((m, i) => note(t + i * 0.07, m, 0.13, 1.4));
    },
    soft() {
      if (!ctx || !playing) return;
      const t = ctx.currentTime + 0.02;
      note(t, 67, 0.08, 0.8);
      note(t + 0.12, 64, 0.07, 1.0);
    },
    finale() {
      if (!ctx || !playing) return;
      const t = ctx.currentTime + 0.05;
      [60, 64, 67, 71, 72, 76, 79, 83, 84].forEach((m, i) => note(t + i * 0.11, m, 0.11, 2.4));
    },
  };
}
