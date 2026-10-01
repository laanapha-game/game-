// Adapter: scene 1's character choice -> the CharacterData contract (src/interfaces.js).
//
// Scene 1 (assets/incoming/scene1/, plain Canvas 2D) hands over only `{ id, name }`
// and draws its characters in code. tools/scene1-characters.mjs exports those
// drawings as sheets (src/assets/art/characters/, 3x) plus characters.json, which
// this adapter reads (pure: the Vite side is src/integration/scene1.js). Scene 1's frames:
//   - 32 x 36, feet on the bottom row; costumes are painted into every frame, so
//     there are no costume layers (`layers` is empty).
//   - side: idle0 idle1 walk0-3 struggle0-1 scared, drawn FACING LEFT (no flip).
//   - front: idle0 idle1 blink.
export const keyFor = (id, view) => `scene1_${id}_${view}`;

// Scene 1 frame names -> the animations scene 2 plays (contract: side idle/run/struggle/scared,
// front surprised/relieved/happy/idle).
// ASSUMPTION: scene 1 has no front surprised/relieved/happy frames, so: relieved = blink
// (eyes shut, a sigh), happy = a short idle bob, surprised = the first idle frame.
const SIDE_ANIMS = {
  idle: ['idle0', 'idle1'],
  run: ['walk0', 'walk1', 'walk2', 'walk3'],
  struggle: ['struggle0', 'struggle1'],
  scared: ['scared'],
};
const FRONT_ANIMS = {
  idle: ['idle0', 'idle1'],
  surprised: ['idle0'],
  relieved: ['blink'],
  happy: ['idle1', 'idle0', 'idle1', 'idle0'],
};
// Anchors of the rest frame (idle0) in design px, from scene 1's drawing code:
// side head top (outline above the head centre RD(12.5)), side eye (ex, ey) = (9, 13);
// front head top above the centre line, front eye = midpoint between the eyes.
// Scene 1's frames bob 1 px and lean 2-3 px when struggling, which is fine because the
// costumes are drawn in; anchors only matter for extra layers.
const SIDE_ANCHORS = { headTop: { x: 13, y: 8 }, eye: { x: 9, y: 13 } };
const FRONT_ANCHORS = { headTop: { x: 16, y: 8 }, eye: { x: 16, y: 14 } };

/**
 * Scene 1 selection `{ id, name }` (LannaphaGame.selected() / registerScene enter data)
 * -> CharacterData. `data` is characters.json. Returns null for an id without exported sheets.
 * @returns {import('../interfaces.js').CharacterData | null}
 */
export function adaptScene1Character(selection, data) {
  const c = data.characters.find((x) => x.id === selection?.id);
  if (!c) return null;
  const index = (view, names) => names.map((n) => data.frames[view].indexOf(n));
  const anims = (view, map) => Object.fromEntries(Object.entries(map).map(([k, names]) => [k, index(view, names)]));
  return {
    id: c.id,
    name: selection.name ?? c.name, // passed through to scene 3 with the rest
    frameWidth: data.cell.w,
    frameHeight: data.cell.h,
    side: { key: keyFor(c.id, 'side'), facing: 'left', anims: anims('side', SIDE_ANIMS), anchors: SIDE_ANCHORS },
    front: { key: keyFor(c.id, 'front'), anims: anims('front', FRONT_ANIMS), anchors: FRONT_ANCHORS },
    layers: {},
  };
}
