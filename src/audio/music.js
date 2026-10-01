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

// Chase: driving ostinato, faster as time runs out.
const CHASE_BASS = [45, 45, 45, 48, 45, 45, 46, 43, /**/ 41, 41, 41, 45, 40, 40, 44, 40];
const CHASE_LEAD = [76, 77, 76, _, 74, 76, _, _, /**/ 72, 74, 72, _, 71, _, 68, _];

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
  chase: {
    bpm: (x) => 128 + 32 * x,
    stepsPerBeat: 2,
    length: 16,
    notes(s, x) {
      const out = [['bass', CHASE_BASS[s], 1, 0.11], ['hat', 0, 1, s % 2 ? 0.03 : 0.045]];
      if (s % 4 === 0) out.push(['kick', 0, 1, 0.3]);
      if (s % 4 === 2) out.push(['snare', 0, 1, 0.12 + 0.06 * x]);
      if (s === 0) out.push(...chord('stab', [69, 72, 76], 2, 0.05));
      if (s === 8) out.push(...chord('stab', [65, 69, 72], 2, 0.05));
      if (x > 0.35 && CHASE_LEAD[s] != null) out.push(['box', CHASE_LEAD[s] + 12, 1, 0.06 + 0.04 * x]);
      return out;
    },
  },
};
