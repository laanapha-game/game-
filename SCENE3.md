# Scene 3: event exploration and the ending

The player explores a top-down map of the real event site (ลานนภา Halloween Fest, 24-25 Oct 2569),
ticks seven places (ซุ้มผี, in front of the ghost stalls on the soi, added by the owner), talks to the team (all of them: one special-prize coupon, the team announces what it is), then leaves by the soi to the ending
(summary, book tickets, follow IG) and the credits. Phaser 4, like scene 2; all game logic is in plain
modules that run in Node.

## Run

```
npm install
npm run dev
#   http://localhost:5173/scene3.html                   scene 3 on its own
#   http://localhost:5173/game.html?scene=scene3&char=ramwong&night=1&today=2026-10-12   (dev) inside the full game
#   scene3.html?char=vampire  ?night=1  ?today=YYYY-MM-DD  ?skip=1 (no welcome)  ?ending=1
npm test                      # logic tests, scene 3 in tests/scene3.test.js
npm run test:scene3           # needs npm run dev: taps through scene 3, writes docs/scene3/screens/
npm run scene3:art            # rebuild the props (tools/scene3_art.py) + docs/scene3/props_contact_sheet.png
python3 tools/jayimpacts_sprite.py && python3 tools/jayimpacts_portrait.py && python3 tools/jayimpacts_sheet.py
```

In the full game scene 2's `onWin` calls `LannaphaGame.go('scene3', character)`; `src/scene1Bridge.js`
registers scene 3 with scene 1 (the only change outside `src/scene3/`). Back goes to character select,
หน้าแรก to scene 1's home. Progress is published as `window.LannaphaGame.progress.scene3`
(`{ goals, talked, vouchers, prize, targets }`).

## Where things are

| Path | What |
|---|---|
| `src/scene3/config.js` | **The one config file**: spread LS, zoom levels, speeds, talk range, special prize, stall booking, event card, URLs, font. Every TODO is here. Ticket dates and prices: the whole game shares `src/data/ticketPhases.js` (the poster) |
| `src/scene3/data/script.js` | All scene 3 text (exact Thai). Characters' dialogue and credits are TODO placeholders |
| `src/scene3/logic/layout.js` | The map: regions, fences, objects, zones, start, exit, guides, collision |
| `src/scene3/logic/npcs.js` | The characters (now only Jayimpacts), the band (empty), the lane stall row, the ghosts, the talk targets |
| `src/scene3/logic/world.js` | Simulation: movement with collision, walkers, talks, zones, exit, AUTO tour |
| `src/scene3/logic/progress.js`, `welcome.js`, `pathfind.js`, `ticketLine.js` | Goals, talks and the special prize, opening welcome, A*, ticket line by date |
| `src/scene3/scenes/` | Phaser: `WorldScene` (draws the world), `HudScene` (all input, HUD, dialogue, banners, checklist, MAP), `EndingScene` (ending + credits) |
| `src/scene3/ground.js` | Ground pre-rendered once per look into one canvas |
| `src/scene3/viewScale.js` | Whole-number scaling of the 180 x 320 design space, letterboxed |
| `src/assets/scene3/` | Generated art: `world/` props at 1 px per map unit (`_n` = night), `char/` character-resolution sprites at 3x, `tiles.png` |
| `tools/scene3_art.py` | Draws all the props (day and night) |

## The map and the spread

The layout is authored in **base units** on the prototype's 432 x 640 grid (tile = 12; column c starts at
x = 12c, row r at y = 16 + 12r) and spread by `LS` (config, 1.5) around the plot's top-left corner
(24, 28): `spread(p) = origin + (p - origin) * LS` per axis. The world is 636 x 946 map units, drawn at
3 design px per unit at full zoom.

- Regions (ground, fences, walls, goal zones) are rectangles whose corners spread, so they stretch;
  fences and walls keep a constant thickness (`FENCE`).
- Objects are placed by their anchor (bottom centre) and keep their size. Each object's collision block
  is computed from that same anchor (`blockWD`), so a block never drifts from its sprite.
- Groups move together: a stall and its staff (feet on the counter top, row 22 of the stall), the band
  corner (deck, backdrop, speakers, lights, rug, hay bales, musicians), the screen and its light cone.
- Depth: every sprite sorts by its foot y. A stall is two sprites: the back sorts just before its staff,
  the front (awning and counter) at the stall's feet.
- Collision: walkable regions minus object blocks, on a 1-unit grid; the player's box is 8 x 4 at the
  feet. Characters do not block. A* (autopilot and walkers) runs on a 4-unit grid over the same map.

Change `LS` and everything moves apart or together; `npm test` re-checks that every zone, character,
stall touch point and the exit can still be reached by walking.

## Characters

Only people and the player (owner): Jayimpacts (beside the Rotary stall) and the team. The team's sprites are the
owner's art from the Drive folder เกมลานนภา/scene_3_sprite (downloaded unchanged to `assets/incoming/scene_3_sprite/`),
cut into Jayimpacts' model by `tools/team_from_drive.py`: the same 40 x 56 cell, frames and anims (side idle x2, walk x4,
wave x2, facing left; front idle x2, blink, wave x2), the figure 51 px tall with its feet on the bottom row, and a
64 x 64 portrait (neutral, talk; one portrait in four of the sheets, so it is used for both) shown over their dialogue.
Preview: `docs/scene3/team_contact_sheet.png`.

| Who | Where | Drive sheet |
|---|---|---|
| Po | behind the registration desk | sprite_Po.png |
| Kaiching | east of the desk | sprite_Kaiching.png |
| Peay | between the drinks and pizza stalls | sprite_Peay.png |
| Aomsin | the banquet tables' middle aisle | sprite_Aomsin.png |
| Nemo | the beanbags in front of the screen | sprite_Nemo.png |
| Nuea | the band corner's rug (added with the Drive art) | sprite_Nuea.png |

Talk targets: the six, Jayimpacts and the lane stall row. Each counts once; talking with all eight gives one
special-prize coupon (owner; no coupon per talk), and the team announces later what it is. Nemo tells players the
game keeps improving during ticket sales and asks for feedback by DM; his last page has an IG button to @laanapha.
Po, Peay, Aomsin and Nuea's lines and roles are placeholders (`TODO(owner)` in `src/scene3/data/script.js`); Kaiching keeps
the prototype's lines. The ghosts outside talk too (they do not count). The bird-costume staff and the band were removed earlier; their lines are still in `NPC_LINES`.

Regenerate the team after new Drive art: `pip install pillow numpy scipy && python3 tools/team_from_drive.py`
(`tools/team_sprite.py`, the earlier drawn versions, would overwrite them).

## After all seven places

A small card opens (`THANKS` in `src/scene3/data/script.js`): ขอบคุณที่เล่นเกมของเรา! and three pages,
turned with the arrows, a swipe or the arrow keys: จองบัตร (`URLS.booking`) -> IG laanapha with the IG logo
(`URLS.eventInstagram`) -> เจอกันที่ "เมื่อคืนผมนอนไม่หลับ" (`URLS.map`). Under them, always: จบเกม
(straight to the ending) or คุยกับทีมงานต่อ (keep playing for the special prize; the exit still ends the game).

While a dialogue, the checklist or this card is up, the game dims (55% black) so the UI stands out.

## Add a character

1. Add an entry to `NPCS` in `src/scene3/logic/npcs.js`: `key`, `name` (speaker tag), `costume` (a scene 1
   id or `jayimpacts`), optional `acc` (`headphones`, `chef_hat`, `cap`, `straw_hat`, `guitar`, `cajon`,
   `mic`), and either `at` (standing spot, world units, usually `spread({x, y})` from base units) or
   `patrol` (waypoints for a walker).
2. Add its pages to `NPC_LINES` in `src/scene3/data/script.js` under the same key.
3. It becomes a talk target automatically (counts toward the special prize). Run `npm test`.

## Add a goal

1. Add `{ id, name, line }` to `GOALS` in `src/scene3/data/script.js`.
2. Add the zone rectangle (base units, spread) under the same id in `ZONES` in `layout.js`.
3. Optionally add a tour stop to `TOUR` in `world.js`. The counts in `chipText`, `exitTooEarly` and
   `summaryText` follow `GOALS.length`.

## Text

All scene 3 text is Serithai 12 px (Kanit as the web fallback), rasterised at `TEXT_RES` (config, 2)
canvas px per design px and scaled up with hard edges: pixelated like the art but readable. At 1 the
12 px Thai loses letters (m merges into n, stacked marks crowd), so 2 is the setting. Thai wraps at
word boundaries (Intl.Segmenter).

## Controls

Hold a finger anywhere to walk toward it (a cross marks the target), or arrows/WASD. Tap a character to
talk (or walk to it, then talk). TALK replaces AUTO when someone is within 16 units. The chip at the top
opens the checklist; MAP shows the whole map with the camera frame; DAY/NIGHT; + and - (also the + and -
keys, the mouse wheel, pinch) step through zoom 3, 2, 1.2, 0.65 and the whole map width. The
scene starts at 1.2 (the lane and its stalls in view); after the welcome a callout points at + and - once
(about 9 s, or until the first zoom). AUTO walks the
tour (lane, desk, shops, tables, cinema, haunted house view, band corner, back to the soi), pausing a
second at each stop; any touch or key stops it.
