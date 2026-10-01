// Standalone entry (index.html): scene 2 on its own with the default bird.
// `?character=<scene 1 id>` (for example ?character=vampire) plays as that scene 1
// character instead. The full game (game.html) starts scene 2 from scene 1 through
// src/scene1Bridge.js; another host can import ./scene2.js and call startScene2().
import './styles.css'; // page-wide styles for the standalone page only
import { startScene2 } from './scene2.js';
import { characterFromScene1 } from './integration/scene1.js';

export * from './scene2.js';

// Kept for hosts that load this file directly: set the flag first to skip the standalone run.
if (!window.__LANNAPHA_EMBEDDED__) {
  const id = new URLSearchParams(window.location.search).get('character');
  startScene2({ character: id ? characterFromScene1({ id }) ?? undefined : undefined });
}
