// Game audio for every scene: sound effects, ambience and music, all synthesized
// with Web Audio (synth.js, music.js): no audio files, nothing to license.
//
//   audio.setSound(on)   master switch (scene 1's speaker, scene 2's speaker button)
//   audio.setMusic(on)   music only (scene 2's note button); ambience and effects stay
//   audio.sfx(name, o)   one-shot effect (SFX in synth.js)
//   audio.mood(name, o)  background music: 'title' | 'calm' | 'funky' | 'chase' | null
//   audio.ambient(name)  'night' (wind and crickets) | null
//   audio.hold(name, on) held sound on/off (LOOPS in synth.js: 'aura')
//   audio.intensity(x)   0..1, chase tempo and lead
//   audio.duck(ms)       dip music and ambience (jumpscares)
//
// One instance per page, shared by scene 1's bridge and scene 2. Sound is ON by
// default (SOUND_ON_AT_START); browsers only let audio start in a tap, so it is
// heard from the player's first tap anywhere (unlock()).
import { SFX, INSTRUMENTS, LOOPS, noiseBuffer } from './synth.js';
import { MOODS } from './music.js';

const AC = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
const LOOKAHEAD_S = 0.15;
const TICK_MS = 25;
const LEVEL = { sfx: 0.9, music: 0.32, ambient: 0.5 };
export const SOUND_ON_AT_START = true;

const state = { sound: SOUND_ON_AT_START, music: true, mood: null, moodOpts: {}, ambient: null, intensity: 0, held: new Set() };
const holding = new Map(); // name -> stop(t)
const listeners = new Set();
let ctx = null;
let bus = null;
let timer = null;
let seq = null; // { mood, step, next }
let amb = null; // { nodes, nextChirp }
const dev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
const log = [];

function ensureContext() {
  if (ctx || !AC) return ctx;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor(); // keeps stacked effects from clipping
  comp.threshold.value = -12;
  comp.ratio.value = 6;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(comp).connect(ctx.destination);
  bus = { master, noise: noiseBuffer(ctx) };
  for (const k of ['sfx', 'music', 'ambient']) {
    bus[k] = ctx.createGain();
    bus[k].gain.value = LEVEL[k];
    bus[k].connect(master);
  }
  bus.music.gain.value = state.music ? LEVEL.music : 0;
  return ctx;
}

const B = (k) => ({ ctx, dest: bus[k], noise: bus.noise });
const live = () => state.sound && ctx && ctx.state === 'running';

function emit() {
  for (const fn of listeners) fn({ sound: state.sound, music: state.music });
}

// ---------- scheduler: music steps and ambient events ----------
function tick() {
  if (!live()) return;
  const until = ctx.currentTime + LOOKAHEAD_S;
  if (seq) {
    const m = MOODS[seq.mood];
    const stepS = 60 / m.bpm(state.intensity) / m.stepsPerBeat;
    while (seq.next < until) {
      if (state.music) {
        // Swing: every other step lands a little late (funky groove).
        const at = seq.next + (seq.step % 2 ? (m.swing ?? 0) * stepS : 0);
        for (const [inst, midi, len, g] of m.notes(seq.step % m.length, state.intensity)) INSTRUMENTS[inst](B('music'), at, midi, len * stepS, g);
      }
      seq.step++;
      seq.next += stepS;
    }
  }
  if (amb && state.ambient === 'night') {
    while (amb.nextChirp < until) {
      chirps(amb.nextChirp);
      amb.nextChirp += 0.9 + Math.random() * 2.2;
    }
  }
}

function startScheduler() {
  if (!timer) timer = setInterval(tick, TICK_MS);
}

function stopScheduler() {
  clearInterval(timer);
  timer = null;
}

// ---------- ambience ----------
function chirps(t) {
  const n = 3 + Math.floor(Math.random() * 3);
  const f = 4200 + Math.random() * 700;
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  const dest = pan ?? bus.ambient;
  if (pan) {
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(bus.ambient);
  }
  for (let i = 0; i < n; i++) {
    const s = t + i * 0.065;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.linearRampToValueAtTime(0.025, s + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.035);
    o.connect(g).connect(dest);
    o.start(s);
    o.stop(s + 0.05);
  }
}

function startAmbient() {
  stopAmbient();
  if (!live() || state.ambient !== 'night') return;
  // Wind: looped noise through a slowly wandering lowpass.
  const src = ctx.createBufferSource();
  src.buffer = bus.noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 450;
  f.Q.value = 2;
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.frequency.value = 0.08;
  lfoG.gain.value = 260;
  lfo.connect(lfoG).connect(f.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 1.5);
  src.connect(f).connect(g).connect(bus.ambient);
  src.start();
  lfo.start();
  amb = { nodes: [src, lfo], gain: g, nextChirp: ctx.currentTime + 0.5 };
}

function stopAmbient() {
  if (!amb) return;
  const { nodes, gain } = amb;
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setTargetAtTime(0.0001, t, 0.1);
  nodes.forEach((n) => n.stop(t + 0.7));
  amb = null;
}

function startHeld(name) {
  if (holding.has(name) || !live()) return;
  holding.set(name, LOOPS[name](B('sfx'), ctx.currentTime + 0.01));
}
function stopHeld(name) {
  holding.get(name)?.(ctx.currentTime);
  holding.delete(name);
}

function restartLayers() {
  startAmbient();
  for (const name of state.held) startHeld(name);
  if (state.mood && live()) seq = { mood: state.mood, step: 0, next: ctx.currentTime + 0.1 };
}

// ---------- public API ----------
export const audio = {
  get sound() {
    return state.sound;
  },
  get musicOn() {
    return state.music;
  },
  get currentMood() {
    return state.mood;
  },

  /** Master switch. Call from a tap so mobile browsers allow the audio to start. */
  setSound(on) {
    if (state.sound === !!on) return;
    state.sound = !!on;
    if (on) {
      ensureContext();
      if (!ctx) return emit();
      ctx.resume?.();
      bus.master.gain.cancelScheduledValues(ctx.currentTime);
      bus.master.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
      startScheduler();
      const begin = () => restartLayers();
      if (ctx.state === 'running') begin();
      else ctx.resume?.().then(begin, () => {});
    } else if (ctx) {
      bus.master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      stopScheduler();
      stopAmbient();
      for (const name of [...holding.keys()]) stopHeld(name);
      seq = null;
    }
    emit();
  },

  setMusic(on) {
    state.music = !!on;
    if (ctx) bus.music.gain.setTargetAtTime(on ? LEVEL.music : 0, ctx.currentTime, 0.08);
    emit();
  },

  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Unlock after a user gesture (mobile autoplay rules). Safe to call often. */
  unlock() {
    if (!state.sound) return;
    if (!ctx) {
      if (!ensureContext()) return;
      bus.master.gain.value = 1;
      startScheduler();
    }
    if (ctx.state !== 'running') ctx.resume?.().then(() => restartLayers(), () => {});
  },

  sfx(name, o) {
    if (dev && log.push(name) > 5000) log.splice(0, 1000);
    if (!live()) return;
    SFX[name]?.(B('sfx'), ctx.currentTime + 0.005, o);
  },

  mood(name, opts = {}) {
    if (state.mood === name && !opts.restart) return;
    state.mood = name;
    state.moodOpts = opts;
    seq = name && live() ? { mood: name, step: 0, next: ctx.currentTime + 0.05 } : null;
  },

  ambient(name) {
    if (state.ambient === name) return;
    state.ambient = name;
    if (live()) startAmbient();
    else stopAmbient();
  },

  hold(name, on) {
    if (dev && on) log.push(name);
    if (on) {
      state.held.add(name);
      startHeld(name);
    } else {
      state.held.delete(name);
      if (ctx) stopHeld(name);
    }
  },

  intensity(x) {
    state.intensity = Math.max(0, Math.min(1, x));
  },

  duck(ms = 800) {
    if (!live()) return;
    const t = ctx.currentTime;
    for (const k of ['music', 'ambient']) {
      const p = bus[k].gain;
      const full = k === 'music' && !state.music ? 0 : LEVEL[k];
      p.cancelScheduledValues(t);
      p.setValueAtTime(full * 0.2, t);
      p.setTargetAtTime(full, t + ms / 1000, 0.25);
    }
  },
};

// Mobile: resume on any gesture; pause while the tab is hidden.
if (typeof document !== 'undefined') {
  for (const ev of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(ev, () => audio.unlock(), { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !state.sound) return;
    if (document.hidden) ctx.suspend?.();
    else ctx.resume?.().then(() => restartLayers(), () => {});
  });
}

/**
 * Dev self-test: renders every effect and two bars of every mood offline and
 * reports peak and RMS levels (no speakers needed).
 */
export async function audioSelfTest() {
  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const rate = 22050;
  const render = async (seconds, play) => {
    const oc = new Off(1, Math.ceil(rate * seconds), rate);
    const dest = oc.createGain();
    dest.connect(oc.destination);
    play({ ctx: oc, dest, noise: noiseBuffer(oc) });
    const buf = await oc.startRendering();
    const d = buf.getChannelData(0);
    let peak = 0;
    let sum = 0;
    for (const v of d) {
      peak = Math.max(peak, Math.abs(v));
      sum += v * v;
    }
    return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4) };
  };
  const out = {};
  for (const name of Object.keys(SFX)) out[`sfx:${name}`] = await render(2.6, (b) => SFX[name](b, 0.01, { voice: 'angel', level: 0.5 }));
  for (const name of Object.keys(LOOPS)) out[`loop:${name}`] = await render(3, (b) => LOOPS[name](b, 0.01)(2.2));
  for (const [name, m] of Object.entries(MOODS)) {
    const stepS = 60 / m.bpm(1) / m.stepsPerBeat;
    out[`music:${name}`] = await render(stepS * m.length + 1.5, (b) => {
      // Music plays through its bus level, as in the game.
      const g = b.ctx.createGain();
      g.gain.value = LEVEL.music;
      g.connect(b.dest);
      const mb = { ...b, dest: g };
      for (let s = 0; s < m.length; s++) {
        const at = 0.01 + s * stepS + (s % 2 ? (m.swing ?? 0) * stepS : 0);
        for (const [inst, midi, len, gain] of m.notes(s, 1)) INSTRUMENTS[inst](mb, at, midi, len * stepS, gain);
      }
    });
  }
  return out;
}

if (dev && typeof window !== 'undefined') window.__audio = { audio, log, selfTest: audioSelfTest, state, get ctx() { return ctx; } };
