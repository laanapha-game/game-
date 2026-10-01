// Background music, played by a step sequencer (engine.js). A minor pentatonic
// music box, a nod to Thai melodies, with spooky harmonic-minor turns.
// Each mood: bpm(intensity), steps per beat, loop length in steps, and
// notes(step, intensity) -> [instrument, midi, length in steps, gain][].
const _ = null;

const chord = (inst, notes, len, g) => notes.map((m) => [inst, m, len, g]);

// Scene 1 (home and character select): slow music-box waltz, 3/4.
const TITLE_MELODY = [
  76, _, 81, _, 84, _, /**/ 81, _, 79, _, 76, _, /**/ 77, _, 81, _, 84, _, /**/ 81, _, 79, _, 77, _,
  76, _, 79, _, 84, _, /**/ 86, _, 84, _, 79, _, /**/ 80, _, 83, _, 88, _, /**/ 86, _, 83, _, 80, _,
];
const TITLE_CHORDS = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [40, 56, 59, 64]];

// Scene 2 walk and stalls: calm but eerie, 4/4.
const CALM_MELODY = [81, _, 84, _, 88, _, 86, _, /**/ 84, _, 81, _, _, _, 79, _, /**/ 81, _, 84, _, 86, _, 84, 81, /**/ 80, _, _, _, 76, _, _, _];
const CALM_CHORDS = [[45, 57, 60, 64], [38, 57, 62, 65], [41, 57, 60, 65], [40, 56, 59, 64]];

// Stalls 1-2: funky, fun horror. Swung 16ths, a bluesy bassline with a
// chromatic creep, clav chops, backbeat, a spooky organ lick and a theremin "woo".
const FUNK_BASS = {
  0: 45, 3: 45, 4: 48, 6: 50, 7: 51, 8: 52, 10: 45, 12: 43, 14: 45, 15: 48,
  16: 50, 19: 50, 20: 53, 22: 51, 23: 50, 24: 48, 26: 45, 28: 43, 30: 40, 31: 43,
};
const FUNK_CLAV = { 2: [57, 60, 64, 67], 7: [57, 60, 64, 67], 10: [57, 60, 64, 67], 14: [57, 60, 64, 67], 18: [62, 65, 69, 72], 23: [62, 65, 69, 72], 26: [62, 65, 69, 72], 30: [62, 65, 69, 72] };
const FUNK_ORGAN = { 12: 76, 13: 79, 14: 81, 28: 84, 29: 83, 30: 82, 31: 81 }; // ends on a chromatic slide down
const FUNK_THEREMIN = { 0: 76, 16: 75 };

// Chase: scary and intense. A tritone drone, a Phrygian bass pulse, four-on-the-floor
// kick, 16th hats, dissonant stabs (A, Bb, Eb), a diminished choir and a screech
// lead; tempo and drums build as the 2:00 runs out.
const CHASE_PULSE = [45, 45, 45, 45, 45, 45, 45, 45, /**/ 46, 46, 46, 46, 45, 45, 44, 44];
const CHASE_SCREAM = { 6: 81, 7: 82, 14: 81, 15: 80, 22: 81, 23: 82, 24: 87, 30: 86, 31: 85 };

export const MOODS = {
  title: {
    bpm: () => 84,
    stepsPerBeat: 2,
    length: 48,
    notes(s) {
      const out = [];
      const bar = Math.floor(s / 6);
      if (TITLE_MELODY[s] != null) out.push(['box', TITLE_MELODY[s], 2, 0.1]);
      if (s % 6 === 0) {
        const [root, ...tri] = TITLE_CHORDS[Math.floor(bar / 2) % 4];
        out.push(['bass', root, 2, 0.1]);
        if (bar % 2 === 0) out.push(...chord('pad', tri, 12, 0.05));
      }
      if (s % 6 === 2 || s % 6 === 4) out.push(['pluck', TITLE_CHORDS[Math.floor(bar / 2) % 4][1 + (s % 6) / 2] + 12, 1, 0.035]);
      return out;
    },
  },
  calm: {
    bpm: () => 100,
    stepsPerBeat: 2,
    length: 32,
    notes(s) {
      const out = [];
      const bar = Math.floor(s / 8);
      const [root, ...tri] = CALM_CHORDS[bar];
      if (CALM_MELODY[s] != null) out.push(['box', CALM_MELODY[s], 2, 0.085]);
      if (s % 8 === 0) {
        out.push(['pluck', root + 12, 2, 0.12]);
        out.push(...chord('pad', tri, 8, 0.04));
      }
      if (s % 8 === 4) out.push(['pluck', root + 19, 2, 0.09]);
      if (s % 2 === 1) out.push(['hat', 0, 1, 0.02]);
      return out;
    },
  },
  funky: {
    bpm: () => 108,
    stepsPerBeat: 4,
    swing: 0.22,
    length: 32,
    notes(s) {
      const out = [];
      if (FUNK_BASS[s] != null) out.push(['bass', FUNK_BASS[s], 1.5, 0.15]);
      if (FUNK_CLAV[s]) out.push(...chord('clav', FUNK_CLAV[s], 1, 0.035));
      if (FUNK_ORGAN[s] != null) out.push(['organ', FUNK_ORGAN[s], 1, 0.07]);
      if (FUNK_THEREMIN[s] != null) out.push(['theremin', FUNK_THEREMIN[s], 7, 0.05]);
      if (s % 16 === 0 || s % 16 === 6 || s % 16 === 10) out.push(['kick', 0, 1, 0.26]);
      if (s % 8 === 4) out.push(['snare', 0, 1, 0.15]);
      if (s % 2 === 0) out.push(['hat', 0, 1, s % 4 === 2 ? 0.045 : 0.025]);
      return out;
    },
  },
  chase: {
    bpm: (x) => 140 + 32 * x,
    stepsPerBeat: 4,
    length: 32,
    notes(s, x) {
      const out = [['hat', 0, 1, s % 4 === 2 ? 0.04 : 0.022]];
      if (s % 2 === 0) out.push(['bass', CHASE_PULSE[s / 2], 1.5, 0.13]);
      if (s % 4 === 0) out.push(['kick', 0, 1, 0.32]);
      if (x > 0.5 && (s === 14 || s === 30)) out.push(['kick', 0, 1, 0.26]);
      if (s % 16 === 8) out.push(['snare', 0, 1, 0.16 + 0.06 * x]);
      if (x > 0.66 && s >= 28) out.push(['snare', 0, 1, 0.08 + 0.04 * (s - 28)]); // roll into the loop
      if (s === 0) out.push(['drone', 33, 32, 0.14], ['drone', 39, 32, 0.08], ...chord('pad', [57, 60, 63], 32, 0.035));
      if (s === 0 || s === 20) out.push(...chord('stab', [57, 58, 63], 2, 0.05));
      if (x > 0.25 && CHASE_SCREAM[s] != null) out.push(['scream', CHASE_SCREAM[s], 1, 0.03 + 0.03 * x]);
      return out;
    },
  },
};
