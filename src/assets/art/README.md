Drop the real art here as transparent PNGs named exactly as in `src/assets/manifest.js`
(for example `bird_side.png`, `chaser.png`). Horizontal strips, no gaps.

Anything missing shows as a labelled SPRITE NEEDED box (no art is generated). On load every PNG is
checked (width = frames x frame width, height = frame height) and mismatches are
printed as a table in the browser console (`window.__scene2AssetReport` in dev).
