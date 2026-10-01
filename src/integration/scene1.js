// Scene 1 characters for scene 2 in the browser: the exported sheets
// (tools/scene1-characters.mjs) and the adapter bound to them.
import SCENE1 from '../assets/art/characters/characters.json';
import { adaptScene1Character, keyFor } from './scene1Adapter.js';

const SHEETS = import.meta.glob('../assets/art/characters/*.png', { eager: true, query: '?url', import: 'default' });

/** Scene 1 character ids that have exported sheets. */
export const SCENE1_IDS = SCENE1.characters.map((c) => c.id);

/** Scene 1 selection `{ id, name }` -> CharacterData, or null if the id has no sheets. */
export const characterFromScene1 = (selection) => adaptScene1Character(selection, SCENE1);

/** URL of a scene 1 sheet by texture key, so scene 2 can load what the host has not. */
export function scene1SheetUrl(key) {
  for (const c of SCENE1.characters) {
    for (const view of ['side', 'front']) if (keyFor(c.id, view) === key) return SHEETS[`../assets/art/characters/${c[view].file}`] ?? null;
  }
  return null;
}
