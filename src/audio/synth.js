// Sound synthesis (Web Audio only, no audio files). Every voice takes a bundle
// B = { ctx, dest, noise } so the same code plays live (engine.js) or renders
// offline for the self-test. Times are AudioContext seconds.

export const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

export function noiseBuffer(ctx, seconds = 2) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < d.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0; // deterministic
    d[i] = (seed / 4294967296) * 2 - 1;
  }
  return buf;
}

/** Gain node with an attack / exponential decay envelope, connected to `to`. */
function env(B, t, { gain = 0.3, attack = 0.004, dur = 0.2, to = B.dest } = {}) {
  const g = B.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
  g.connect(to);
  return g;
}

/** Oscillator voice: optional pitch glide, vibrato, lowpass. */
export function tone(B, t, freq, { type = 'sine', dur = 0.2, gain = 0.3, attack = 0.004, glide = null, vib = 0, vibHz = 6, lp = 0, detune = 0, to = B.dest } = {}) {
  const ctx = B.ctx;
  let out = env(B, t, { gain, attack, dur, to });
  if (lp) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lp;
    f.connect(out);
    out = f;
  }
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.detune.value = detune;
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + attack + dur);
  if (vib) {
    const l = ctx.createOscillator();
    const lg = ctx.createGain();
    l.frequency.value = vibHz;
    lg.gain.value = vib;
    l.connect(lg).connect(o.frequency);
    l.start(t);
    l.stop(t + attack + dur + 0.05);
  }
  o.connect(out);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
}

/** Filtered noise burst with an optional filter sweep. */
export function noise(B, t, { dur = 0.2, gain = 0.3, attack = 0.002, type = 'lowpass', freq = 1000, freqTo = null, q = 1, to = B.dest } = {}) {
  const ctx = B.ctx;
  const out = env(B, t, { gain, attack, dur, to });
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + attack + dur);
  const s = ctx.createBufferSource();
  s.buffer = B.noise;
  s.loop = true;
  s.connect(f).connect(out);
  s.start(t, Math.random() * 1.5);
  s.stop(t + attack + dur + 0.05);
}

function distortion(ctx, amount = 40) {
  const ws = ctx.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  ws.curve = curve;
  return ws;
}

// ---------- instruments (music) ----------
export const INSTRUMENTS = {
  // Music box: sine + a bell partial, quick decay.
  box(B, t, m, dur, g) {
    tone(B, t, midiHz(m), { dur: Math.max(0.6, dur * 1.5), gain: g });
    tone(B, t, midiHz(m) * 3.01, { dur: 0.25, gain: g * 0.18 });
  },
  pluck(B, t, m, dur, g) {
    tone(B, t, midiHz(m), { type: 'triangle', dur: Math.max(0.25, dur), gain: g, lp: 1800 });
  },
  bass(B, t, m, dur, g) {
    tone(B, t, midiHz(m), { type: 'sawtooth', dur: Math.max(0.18, dur * 0.9), gain: g, lp: 420 });
  },
  pad(B, t, m, dur, g) {
    for (const d of [-7, 7]) tone(B, t, midiHz(m), { type: 'triangle', dur, gain: g * 0.5, attack: Math.min(0.5, dur / 3), detune: d, lp: 1200 });
  },
  stab(B, t, m, dur, g) {
    for (const d of [-12, 12]) tone(B, t, midiHz(m), { type: 'square', dur: Math.max(0.12, dur * 0.6), gain: g * 0.4, detune: d, lp: 1600 });
  },
  // Spooky organ: square + sine an octave down, slight vibrato.
  organ(B, t, m, dur, g) {
    tone(B, t, midiHz(m), { type: 'square', dur: Math.max(0.12, dur), gain: g * 0.5, attack: 0.01, lp: 2200, vib: 3, vibHz: 6 });
    tone(B, t, midiHz(m) / 2, { type: 'sine', dur: Math.max(0.12, dur), gain: g * 0.5, attack: 0.01 });
  },
  // Funky clavinet chop: short bright square.
  clav(B, t, m, dur, g) {
    tone(B, t, midiHz(m), { type: 'square', dur: 0.07, gain: g, lp: 3200 });
  },
  // Theremin "woo": sine with wide vibrato, sliding in from below.
  theremin(B, t, m, dur, g) {
    tone(B, t, midiHz(m - 2), { type: 'sine', dur, gain: g, attack: 0.08, glide: midiHz(m), vib: 14, vibHz: 6.5 });
  },
  // Low dread drone: detuned saws under a dark filter.
  drone(B, t, m, dur, g) {
    for (const d of [-9, 0, 9]) tone(B, t, midiHz(m), { type: 'sawtooth', dur, gain: g * 0.4, attack: 0.4, detune: d, lp: 260 });
  },
  // Screech lead: thin saw with a nervous vibrato.
  scream(B, t, m, dur, g) {
    tone(B, t, midiHz(m), { type: 'sawtooth', dur: Math.max(0.1, dur), gain: g, attack: 0.01, lp: 2600, vib: 18, vibHz: 9 });
  },
  hat(B, t, m, dur, g) {
    noise(B, t, { dur: 0.03, gain: g, type: 'highpass', freq: 7000 });
  },
  kick(B, t, m, dur, g) {
    tone(B, t, 120, { dur: 0.16, gain: g, glide: 42 });
  },
  snare(B, t, m, dur, g) {
    noise(B, t, { dur: 0.12, gain: g, type: 'bandpass', freq: 1800, q: 0.8 });
    tone(B, t, 190, { type: 'triangle', dur: 0.06, gain: g * 0.4 });
  },
};

// ---------- sound effects ----------
const PENTA = [0, 3, 5, 7, 10]; // A minor pentatonic, the music's scale
const bell = (B, t, m, g = 0.12, dur = 0.5) => {
  tone(B, t, midiHz(m), { dur, gain: g });
  tone(B, t, midiHz(m) * 2.76, { dur: dur * 0.4, gain: g * 0.25 });
};

/** Voices for the typewriter: base pitch per speaker kind. */
const VOICE = {
  angel: { m: 84, type: 'sine', spread: 5 },
  ghost: { m: 64, type: 'triangle', spread: 4 },
  chaser: { m: 45, type: 'sawtooth', spread: 3 },
  narrator: { m: 72, type: 'square', spread: 2 },
};

export const SFX = {
  // UI
  ui_click: (B, t) => tone(B, t, 1100, { type: 'square', dur: 0.035, gain: 0.08, glide: 700 }),
  ui_on: (B, t) => [76, 83].forEach((m, i) => tone(B, t + i * 0.07, midiHz(m), { type: 'square', dur: 0.06, gain: 0.07 })),
  ui_off: (B, t) => [83, 76].forEach((m, i) => tone(B, t + i * 0.07, midiHz(m), { type: 'square', dur: 0.06, gain: 0.06 })),
  choice_show: (B, t) => [69, 76].forEach((m, i) => INSTRUMENTS.pluck(B, t + i * 0.06, m, 0.2, 0.12)),
  choice_press: (B, t) => {
    tone(B, t, 900, { type: 'square', dur: 0.03, gain: 0.08 });
    bell(B, t + 0.04, 81, 0.1, 0.4);
  },
  // Chatbox
  chat_open: (B, t) => noise(B, t, { dur: 0.14, gain: 0.3, type: 'bandpass', freq: 500, freqTo: 1800, q: 1.5 }),
  type_blip: (B, t, o = {}) => {
    const v = VOICE[o.voice] ?? VOICE.narrator;
    const m = v.m + PENTA[Math.floor(Math.random() * v.spread)];
    tone(B, t, midiHz(m), { type: v.type, dur: 0.03, gain: o.voice === 'chaser' ? 0.05 : 0.045, lp: o.voice === 'chaser' ? 900 : 0 });
  },
  page_next: (B, t) => {
    noise(B, t, { dur: 0.04, gain: 0.08, type: 'highpass', freq: 2500 });
    tone(B, t, 1320, { dur: 0.05, gain: 0.05 });
  },
  // Taps and meters
  tap: (B, t, o = {}) => {
    const p = o.level ?? 0;
    tone(B, t, 520 + p * 700, { dur: 0.06, gain: 0.12, glide: 300 + p * 400 });
    noise(B, t, { dur: 0.015, gain: 0.06, type: 'highpass', freq: 3000 });
  },
  countdown_tick: (B, t) => tone(B, t, 1760, { type: 'square', dur: 0.025, gain: 0.05 }),
  meter_full: (B, t) => {
    tone(B, t, 400, { type: 'triangle', dur: 0.3, gain: 0.12, glide: 1600 });
    [81, 84, 88].forEach((m, i) => bell(B, t + 0.18 + i * 0.06, m, 0.1));
  },
  // Foley
  step: (B, t, o = {}) => {
    const g = o.run ? 0.24 : 0.15;
    noise(B, t, { dur: 0.05, gain: g, type: 'lowpass', freq: o.alt ? 650 : 520 });
    tone(B, t, o.alt ? 95 : 85, { dur: 0.04, gain: g * 0.6 });
  },
  shake_rumble: (B, t) => {
    tone(B, t, 48, { dur: 0.55, gain: 0.25, vib: 6, vibHz: 11 });
    noise(B, t, { dur: 0.55, gain: 0.16, type: 'lowpass', freq: 220 });
  },
  whoosh: (B, t, o = {}) => noise(B, t, { dur: o.dur ?? 0.3, gain: o.gain ?? 0.38, attack: 0.08, type: 'bandpass', freq: o.from ?? 300, freqTo: o.to ?? 2400, q: 2 }),
  thump: (B, t) => {
    tone(B, t, 110, { dur: 0.14, gain: 0.25, glide: 50 });
    noise(B, t, { dur: 0.06, gain: 0.08, type: 'lowpass', freq: 600 });
  },
  feather_puff: (B, t) => noise(B, t, { dur: 0.25, gain: 0.16, attack: 0.03, type: 'bandpass', freq: 3000, freqTo: 1200, q: 0.7 }),
  paper: (B, t) => {
    for (let i = 0; i < 6; i++) noise(B, t + i * 0.045 + Math.random() * 0.02, { dur: 0.04, gain: 0.1 + Math.random() * 0.06, type: 'bandpass', freq: 2500 + Math.random() * 2500, q: 1.2 });
  },
  // Krahang (stall 1)
  krahang_leap: (B, t) => {
    SFX.whoosh(B, t, { dur: 0.35, from: 400, to: 2600 });
    tone(B, t, 660, { type: 'triangle', dur: 0.4, gain: 0.08, vib: 40, vibHz: 14, glide: 990 }); // giggle
  },
  krahang_land: (B, t) => {
    SFX.thump(B, t);
    tone(B, t + 0.05, 330, { type: 'triangle', dur: 0.3, gain: 0.07, vib: 30, vibHz: 12 });
  },
  krahang_flung: (B, t) => {
    tone(B, t, 300, { type: 'sine', dur: 0.45, gain: 0.14, glide: 1200, vib: 30, vibHz: 18 }); // boing
    SFX.whoosh(B, t, { dur: 0.45, from: 2400, to: 300 });
  },
  // Jars (stall 2)
  jar_rattle: (B, t) => {
    for (let i = 0; i < 3; i++) noise(B, t + i * 0.05, { dur: 0.03, gain: 0.3, type: 'bandpass', freq: 2200 + i * 300, q: 6 });
  },
  jar_swap: (B, t) => {
    SFX.jar_rattle(B, t);
    SFX.whoosh(B, t, { dur: 0.22, gain: 0.2, from: 600, to: 1500 });
  },
  ghost_moan: (B, t) => {
    tone(B, t, 220, { type: 'triangle', dur: 1.1, gain: 0.12, attack: 0.25, glide: 180, vib: 9, vibHz: 4.5, lp: 900 });
    tone(B, t, 330, { type: 'sine', dur: 0.9, gain: 0.06, attack: 0.3, glide: 262, vib: 7, vibHz: 4 });
  },
  letter_chime: (B, t) => [69, 76, 81, 84].forEach((m, i) => bell(B, t + i * 0.08, m + 12, 0.09, 0.7)),
  // Jayimpacts (angel)
  angel_poof: (B, t) => {
    noise(B, t, { dur: 0.32, gain: 0.2, type: 'lowpass', freq: 4000, freqTo: 300 });
    tone(B, t, 900, { dur: 0.25, gain: 0.08, glide: 300 });
  },
  angel_appear: (B, t) => [81, 84, 88, 93, 96].forEach((m, i) => bell(B, t + 0.12 + i * 0.07, m, 0.07, 0.8)),
  // Chase
  heartbeat: (B, t) => {
    tone(B, t, 62, { dur: 0.12, gain: 0.35, glide: 40 });
    tone(B, t + 0.18, 58, { dur: 0.14, gain: 0.28, glide: 38 });
  },
  chaser_closer: (B, t) => {
    tone(B, t, 70, { type: 'sawtooth', dur: 0.7, gain: 0.12, glide: 55, lp: 300, vib: 5, vibHz: 7 });
    SFX.whoosh(B, t, { dur: 0.5, gain: 0.2, from: 1800, to: 250 });
  },
  timer_tick: (B, t) => tone(B, t, 2000, { type: 'square', dur: 0.02, gain: 0.04 }),
  // Jumpscares: loud dissonant stab, noise hit, a screech; `level` 0.5..1.
  jumpscare: (B, t, o = {}) => {
    const g = 0.55 * (o.level ?? 1);
    const ctx = B.ctx;
    const out = env(B, t, { gain: g, attack: 0.005, dur: 0.9 });
    const dist = distortion(ctx, 30);
    dist.connect(out);
    for (const f of [110, 116.5, 155.6, 233]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.9);
      const og = ctx.createGain();
      og.gain.value = 0.22;
      osc.connect(og).connect(dist);
      osc.start(t);
      osc.stop(t + 1);
    }
    noise(B, t, { dur: 0.4, gain: g * 0.5, type: 'lowpass', freq: 6000, freqTo: 400 });
    tone(B, t + 0.02, 1300, { type: 'sawtooth', dur: 0.5, gain: g * 0.18, glide: 2600, vib: 60, vibHz: 23, lp: 3000 });
  },
  // Endings
  light_swell: (B, t) => {
    for (const m of [69, 73, 76, 81, 85, 88]) tone(B, t, midiHz(m), { type: 'triangle', dur: 1.6, gain: 0.05, attack: 0.9, vib: 3, vibHz: 5 });
    noise(B, t, { dur: 1.6, gain: 0.05, attack: 1, type: 'highpass', freq: 5000 });
  },
  gameover: (B, t) => {
    [57, 56, 53, 52].forEach((m, i) => tone(B, t + i * 0.32, midiHz(m), { type: 'triangle', dur: i === 3 ? 1.4 : 0.32, gain: 0.16, lp: 1400, vib: i === 3 ? 4 : 0 }));
    tone(B, t, 41.2, { type: 'sine', dur: 2.2, gain: 0.18, attack: 0.3 });
  },
  scene3_chime: (B, t) => [81, 85, 88, 93].forEach((m, i) => bell(B, t + i * 0.12, m, 0.08, 1.2)),
};

// ---------- loops (held sounds: start returns stop(t)) ----------
export const LOOPS = {
  // Jayimpacts' aura: a faint, high shimmer (A major chord, very quiet) with a slow
  // tremolo, fading in and out. Much quieter than the effects.
  aura(B, t) {
    const ctx = B.ctx;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(0.006, t + 0.8);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    lp.connect(out).connect(B.dest);
    const trem = ctx.createGain();
    trem.gain.value = 0.7;
    trem.connect(lp);
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 0.6;
    depth.gain.value = 0.3;
    lfo.connect(depth).connect(trem.gain);
    const nodes = [lfo];
    for (const [m, d] of [[81, -4], [85, 3], [88, -2], [93, 5]]) {
      const o = ctx.createOscillator();
      o.frequency.value = midiHz(m);
      o.detune.value = d;
      o.connect(trem);
      nodes.push(o);
    }
    nodes.forEach((n) => n.start(t));
    return (at) => {
      // Fade from wherever the fade-in got to (no reading of .value: it can be stale).
      out.gain.cancelScheduledValues(at);
      out.gain.setTargetAtTime(0.0001, at, 0.12);
      nodes.forEach((n) => n.stop(at + 0.8));
    };
  },
};
