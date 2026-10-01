# Scene 2 spec: Trick or Treat run (Lannapha Halloween Fest promo game)

Read this whole file before writing code. Anything marked TODO or ASSUMPTION is not decided: do not invent an answer, ask the owner or isolate it behind a constant.

## 1. Context

- Promo game for ลานนภา Halloween Fest, 24-25 October 2026, 5 PM till late, at Laanapha (near BTS Bangwa).
- Portrait mobile browser game. The player is a chubby seagull chick, chosen and customised in scene 1 (built by another developer).
- This file covers scene 2 only. Scene 3 (event layout, microcinema, trailers) is out of scope.
- Story: an angel greets the player in the afterlife, the player walks past two ghost stalls (Krahang tap game, jar game), then a chasing ghost forces a 2 minute dash past three more stalls to a white, bright path of light that leads into Laanapha. There is NO gate or arch: the ending is a glowing white entrance.
- Direction (mirrors the real venue): the player always moves from RIGHT to LEFT: from inside the soi, out of the soi, past the 7-Eleven, to the white light path into Laanapha. Everything ahead of the player is on the left. The chasing ghost is behind, on the right.

## 2. Tech constraints

- Layout in 180 x 320 design units (9:16). Rendering: canvas at device resolution, camera zooms the design space to fit, textures authored at RENDER_SCALE (3) x design size; whole-number zoom when it fills >= 90% of the screen, else fractional with `smoothPixelArt`. Letterbox with a theme colour.
- Never scale sprites by non-integer factors in game (it breaks the pixel grid). Use frame swaps or position changes instead.
- Input: pointer events. Set `touch-action: manipulation`. Disable double-tap zoom, text selection and the context menu.
- Touch targets must be at least 44 CSS px even when the drawing is smaller. Use larger hit areas.
- Palette (hex estimated from screenshots, sample the real values from source files): orange-red #DE5238, black #000000, yellow #FFFF4F, magenta #F02DF0, white #FFFFFF. The bird also uses blue #0000FF and green #55FF3A. Background palette: #DE5238 #000000 #8F2F20 #4A1A14 #FFFF4F #F02DF0 #FFFFFF. Stall palette: #FFFF4F #F02DF0 #000000 #FFFFFF #DE5238 #C4C42E #A61EA6.
- Thai text: Serithai Regular (pixel font, `src/assets/fonts/Serithai-Regular.otf`), 12 px body, 16 px title, line height 18 px, smoothing off (alpha snapped to 0/255, drawn on the design grid). Wrap by measured pixel width inside the box padding, paginate by how many lines fit, never clip. `npm run check:dialogue` renders every page at 390x844 and fails if any glyph (stacked vowels and tone marks included) leaves its box. TODO: confirm the Serithai licence allows embedding.
- Framework: Phaser 4. Scene 1 is plain Canvas 2D (not Phaser); they connect through scene 1's `registerScene` API (section 3).

## 3. Interfaces with other scenes

Scene 1 (home and character select, by the scene 1 developer) is in `assets/incoming/scene1/`, kept exactly as delivered. It is a single HTML page drawn with plain Canvas 2D (180 x 320 canvas, integer CSS scale), **not Phaser**. Scene 2 stays on Phaser 4; the two meet through scene 1's own plug-in API, so no shared framework is needed.

What scene 1 provides (read from its code):
- Characters: 8, `LannaphaGame.characters` = นวลนภา (`nuannapa`, default) and 7 costume versions (`ramwong`, `pumpkin`, `vampire`, `slasher`, `onryo`, `mahidol`, `silpakorn`). The choice is `{ id, name }` (`LannaphaGame.selected()`).
- Frames: 32 x 36, feet on the bottom row, drawn in code (`LannaphaGame.getSprite(id, view, frame)` returns a canvas). Side view (faces LEFT): `idle0 idle1 walk0-3 struggle0-1 scared`. Front view: `idle0 idle1 blink`. The costumes are painted into every frame, so there are no costume layers or anchors in scene 1.
- Hand-off: on the confirm button (ยืนยัน) scene 1 fades to black and starts the scene registered as `'scene2'` with `LannaphaGame.registerScene` (or calls `LannaphaHome.onConfirm(selection)` if set; not used). Home is `LannaphaGame.goHome()` (an in-page state, no route). Scene 3 is expected as `LannaphaGame.go('scene3', data)`.

How scene 2 connects:
- `npm run scene1` (re-runnable): `tools/scene1-page.mjs` writes `game.html` (scene 1's page byte for byte plus `#game` and `src/scene1Bridge.js`), and `tools/prep-sprites.mjs scene1` (`tools/scene1-characters.mjs`) runs scene 1 in headless Chromium, reads every frame through `getSprite`, checks it (hard alpha, #00FF00, colours against scene 1's own palette: 0 off-palette pixels) and writes `src/assets/art/characters/<id>_side.png` / `<id>_front.png` at 3x (nearest neighbour) plus `characters.json`.
- Adapter `src/integration/scene1Adapter.js` maps `{ id, name }` to CharacterData: frame 32 x 36; side `facing: 'left'` (never flipped to walk left), anims idle = idle0-1, run = walk0-3, struggle = struggle0-1, scared = scared; front idle = idle0-1, and ASSUMPTION (scene 1 has no such frames): surprised = idle0, relieved = blink, happy = idle1 idle0 idle1 idle0. Anchors (rest frame, design px): side head top (13, 8), eye (9, 13); front head top (16, 8), eye (16, 14) between the eyes. `layers` is empty. The contract itself did not need to change (the frame size was already a field); only its comments now say 32 x 36 and that `name` is passed through.
- `src/scene1Bridge.js` registers `'scene2'` with scene 1. `enter({ id, name })` starts scene 2 in `#game` with the adapted character. Scene 2's boot loads any sheet the host has not loaded (scene 1 loads none: it draws in code), accepts sheets at 1x or 3x, and falls back to the default bird if a sheet is missing or the wrong size (`onWin` still passes on the host's character).
- Scene 2 on its own (`index.html`) plays the default bird; `?character=<scene 1 id>` plays as that character.

CharacterData (`src/interfaces.js`): sprite keys per view, frame size, FIXED anchor points for head top and eye per view (design px, pixel index inside the frame), optional costume layers.
- Views needed: side (faces LEFT in game; flip in code if the sheet is drawn facing right) and front. The back view is no longer needed.
- When a sprite is flipped in code (facing fix or `lookBack(true)` in the chase intro), the head-top and eye anchors are mirrored too (x -> frameWidth - 1 - x), and so are the layer's offset and the layer itself: the placement is the exact mirror image on integer pixels (`layerTopLeft`). Layers sit above the minigame dim layer and are included in the win silhouette.

Outputs:
- `onWin(character)`: go to scene 3 with the same character data object. In `game.html` this is `LannaphaGame.go('scene3', character)` once a scene 3 is registered with scene 1; until then scene 2's own scene 3 stub.
- `onGameOver()`: in `game.html`, close scene 2 and `LannaphaGame.goHome()` (scene 1's home page). On its own, `HOME_ROUTE` (`/`).

Fonts: scene 1's Thai labels list "Serithai" first and fall back to Kanit (Google Fonts). Scene 2 registers its Serithai face under its own family name (`Lannapha Serithai`) so scene 1 keeps rendering exactly as delivered (Kanit) instead of switching font part way through a session. Whether scene 1 should use Serithai is open (section 11).

## 4. Global rules

- Every fail path goes to one Game over screen, which has a single button to the home page. No retry.
- Fail conditions: tap game timeout, picking the ghost jar, a rude reply, chase timer reaching 0, final sprint meter not full at 0.
- The 2:00 chase timer starts when the chase starts, right after the chase intro cutscene (after the letter) and NEVER pauses (not during dialogue or reply choices). WALK segments come before it: no timer, no fail.
- If the timer reaches 0 at any moment in the chase (including mid-dialogue), cut to the caught sequence, then Game over.
- Winning the final sprint with time left goes to scene 3.

## 5. Constants (one config file, all tunable, starting values from design discussion)

| Constant | Value | Notes |
|---|---|---|
| CHASE_TIME_S | 120 | Never pauses |
| TAP_GAME_TIME_S | 10 | Stall 1 |
| TAP_GAME_GAIN | 0.06 | Meter gain per tap (0 to 1) |
| TAP_GAME_DECAY_PER_S | 0.10 | Meter drains when not tapping |
| SPRINT_GAIN | 0.03 | ASSUMPTION, tune |
| SPRINT_DECAY_PER_S | 0.10 | |
| WALK_SPEED_PX_S | 24 | ASSUMPTION. Walk before stalls 1 and 2 (run frames, slower) |
| WALK_SEGMENT_S | 6 | |
| RUN_SEGMENT_S | 10 | Auto-run time before each of stalls 3, 4, 5 (48 px/s) |
| PRE_GAME_SHAKE_MS | 500 | Shake after stall 1/2 dialogue, then the minigame starts |
| JAR_REVEAL_MS | 1200 | Show which jar holds the letter |
| JAR_SWAPS | 6 | ASSUMPTION |
| JAR_SWAP_MS_START / END | 500 / 350 | Speeds up. ASSUMPTION |
| TYPEWRITER_CPS | 30 | Characters per second |
| CHASER_STAGE_REMAINING_S | 90, 60, 30, 15 | Thresholds at which the chaser moves closer |
| SHAKE_LAST_S | 15 | Small screen shake in the final seconds |

## 6. State machine

| State | What happens | On success | On fail |
|---|---|---|---|
| S0 Angel intro | Angel Jayimpacts pops in (poof + sparkles) and floats on one frame; 5 dialogue pages, no choices, no timer; disappears (poof) | WALK1 | none |
| WALK1 | Auto-scroll WALK_SEGMENT_S with the bird's run frames, slower. Stall 1 slides in from the left and stops at x~52 | S1 | none |
| S1 Stall 1 (Krahang) | Dialogue; when the last page finishes typing, shake ~0.5 s, then the tap game starts by itself: the Krahang leaps from its stall onto the bird's back, tap to fill the meter within TAP_GAME_TIME_S | WALK2 (Krahang flung away) | GAME_OVER |
| WALK2 | As WALK1, to stall 2 | S2 | none |
| S2 Stall 2 (jar ghost) | Dialogue while the jar shows its open-with-ghost frames; shake ~0.5 s, then the jar game on the stall counter: two jars, one ghost, one letter; reveal, shuffle, pick. No pick time limit (ASSUMPTION) | Letter jar: S3 | Ghost jar: jump scare, GAME_OVER |
| S3 Letter and chase start | Letter panel is read. Chase intro cutscene: the chaser jumps in (open mouth, red flash, shake), says the red line, the bird looks back scared, the ghost floats in close (stage 0). Then the chase starts and the 2:00 timer starts | S4 | timer 0: GAME_OVER |
| S4 Stall 3 | Auto-run RUN_SEGMENT_S, ticket dialogue (date-based), reply choice | Polite: S5 | Rude or timer 0: GAME_OVER |
| S5 Stall 4 | Auto-run, "almost there" dialogue, reply choice | Polite: S6 | Rude or timer 0: GAME_OVER |
| S6 Stall 5 | Auto-run, costume contest dialogue, urgent call to tap. No choice | After last page: S7 | timer 0: GAME_OVER |
| S7 Final sprint | Tap meter fills to reach the white light path | Meter full with time left: run into the light, whiteout, scene 3 | Timer 0: GAME_OVER |
| GAME_OVER | Caught sequence (chaser open-mouth frame, about 1 s), then Game over screen with one button | home page | |

## 7. Mechanics

### 7.1 Tap meter (S1 and S7)
- Meter value 0 to 1. Each tap adds the gain constant. Decay is applied continuously.
- Win the moment the meter reaches 1 while time remains. Show a tap ripple effect at the touch point.
- S1: the timer is TAP_GAME_TIME_S. S7: the timer is whatever is left of the chase timer.
- S1 layout: the bird faces left. The Krahang leaps from stall 1 onto the bird's back (its right side), and is flung to the right when the meter fills.

### 7.2 Jar game (S2)
- Flow: both jars open briefly to show contents, close, shuffle with JAR_SWAPS swaps, player taps one jar.
- Randomise which side holds the letter each run. Jars sit on stall 2's counter about 40 px apart, with large hit areas.

### 7.3 Dialogue system
- Pages of text in a 9-slice chatbox (164 x 60, 6 px padding, name tag straddling the top edge, text starts below it, 10 px arrow column). Pages are paginated by fit (currently 2 lines of 18 px).
- Typewriter effect. Tap while typing completes the page. Tap when complete goes to the next page. A blinking arrow shows when the page is complete. Stalls 1 and 2 end without the last tap (shake, then minigame).
- Reply choices (stalls 3 and 4): two stacked buttons below the chatbox, 164 x 38, text wraps to 2 lines.
- The chase timer keeps running throughout.

### 7.4 Side-scrolling and screen layout (S0 to S7)
- Side-scroller on the portrait canvas. The player faces LEFT and stays at a fixed x (about 118). The world scrolls to the RIGHT, so stalls and scenery enter from the left edge and move toward the player.
- Layout numbers are ASSUMPTIONS, tune visually. Ground line at y = 240 in every background (stalls stand there); the player walks on the street with feet at y = 250 (`PLAYER_Y`: curb to y 239, gutter 240-243, road from 246). The chaser's shadow is on the street too. Bird 32 px tall, stalls 64 px, chaser about 87 px (existing art).
- Top area (y 8 to 160): timer bar (y 8 to 16), chatbox (y 24 to 84), reply buttons (y 88 to 166).
- Bottom area (below y 240): foreground road and the tap meter (about y 270). Tapping works anywhere on screen.
- Stalls 1 to 5 use stall art A, B, A, B, C. Draw order: stall, (stall 1 Krahang behind the counter), stall_front, then the stall 2 jar on the counter or the stall 3-5 ghost standing on the ground to the stall's right. Stalls stop at x 44.
- Atmosphere: drifting fog over the ground band and a black gradient from the top and bottom edges, leaving the centre third of the screen (y 107-213) at normal lighting (fx_fog, fx_vignette). During the stall 1 and 2 minigames the scene fades dark (MINIGAME_DIM_*) with the characters lit above it, and fades back when the minigame ends.
- Background follows the real route (ASSUMPTION for the split): inside the soi until stall 4, then the soi exit and the street with a 7-Eleven-style shop for stall 5 and the sprint, then the white light entrance.
- The chaser is behind the player on the RIGHT and faces left, closes in by position at the CHASER_STAGE_REMAINING_S thresholds; below 15 s it switches to the open-mouth frame and the screen shakes.
- Final sprint: meter value maps to scroll progress; meter = 1 reaches the light; bird fades to a white silhouette, whiteout (about 1 s), then scene 3.
- Timer bar (120 x 8) with chaser icon (moves with time) and bird icon (moves with run progress).

### 7.5 Stall 3 ticket text by date
Use the device clock converted to Asia/Bangkok as a YYYY-MM-DD date. Dev builds only: allow `?today=YYYY-MM-DD` to override.

```
PHASES = [
  {id: 'flash',   name: 'Flash Ticket',       start: '2026-10-09', end: '2026-10-09', price: 189},
  {id: 'early',   name: 'Early Bird',         start: '2026-10-12', end: '2026-10-16', price: 320},
  {id: 'general', name: 'General Ticket',     start: '2026-10-17', end: '2026-10-23', price: 390},
  {id: 'door',    name: 'At Door 1 Day Pass', start: '2026-10-24', end: '2026-10-25', price: 450},
]
EVENT_END = '2026-10-25'
today > EVENT_END      -> AFTER_EVENT
today inside a phase   -> ACTIVE
otherwise              -> GAP (prev = last phase that ended, may be none; next = first phase that starts later)
```

Price line per mode (stall 3 page 4 shows `ค่าเข้าขึ้นเรทตามช่วงวัน` followed by it). Dates shown as Thai short month, for example 14 ต.ค.
- ACTIVE, Flash: `ตอนนี้ Flash Ticket 189 บาท (หนัง + กิจกรรม) วันนี้วันเดียวเท่านั้น!`
- ACTIVE, Early Bird or General: `ตอนนี้ {name} {price} บาท (หนัง + กิจกรรม) ขายถึง {end}`
- ACTIVE, At Door: `วันงานซื้อหน้างานได้ 1 Day Pass {price} บาท`
- GAP with prev: `{prev.name} หมดแล้ว! {next.name} เปิด {next.start} ราคา {next.price} บาท`
- GAP without prev: `{next.name} เปิดขาย {next.start} ราคา {next.price} บาท`
- AFTER_EVENT: pages 4 and 5 are replaced by the "event has passed" page.

Dates from the official ticket poster. The only gap is 10-11 Oct. The phase table lives in `src/data/ticketPhases.js`.

### 7.6 Sound

All sound is synthesized in the browser with Web Audio (`src/audio/`): no audio files, nothing to license, nothing to download. One engine per page, shared by scene 1's page and scene 2.
- Switches: sound is ON by default (owner's call; scene 1 on its own starts silent). Browsers only let audio start in a tap, so it is heard from the player's first tap anywhere; in the full game that first tap also switches scene 1's speaker on, so its own button sounds play. Scene 1's speaker is the master switch; scene 2 shows the same speaker top right (all sound) and a note top left (music on/off). Switching in scene 2 also switches scene 1's speaker when the player goes back home. Buttons have 44 CSS px hit areas and are not game taps.
- Channels: effects, music, ambience, through one limiter. Jumpscares dip the music and ambience.
- Ambience: night wind and crickets on every screen until the whiteout.
- Music (A minor pentatonic music box): `title` on scene 1's home and select, `calm` for the angel and the first walk, `funky` from stall 1 (fun horror funk: swung bassline, clav, organ lick, theremin) through stall 2, then `chase` from the moment the chaser appears: scary and intense (tritone drone, Phrygian bass pulse, four-on-the-floor, dissonant stabs, diminished choir, screech lead), tempo 140 rising to 172 and more drums as the 2:00 runs out. No music on the Game over screen or after the light.
- Effects: buttons (click, reply buttons, sound buttons), taps (pitch rises with the meter), chatbox (open whoosh, typewriter voice per speaker: angel, stall ghosts, the chaser, and a page click), Jayimpacts (poof in and out, sparkle arpeggio, a chime per glint), foley (footsteps on the run animation's foot frames, slower when walking; pre-game shake rumble; Krahang leap, landing, fling and feathers; jar rattles, swaps and ghost moan; letter chime and paper), chase (chaser closing in, heartbeat in the last 15 s, clock ticks in the last 10 s), jumpscares (ghost jar, the chaser's entrance, caught), endings (light swell, Game over stinger, scene 3 chime). Scene 1 keeps its own button sounds.

## 8. Script (exact text)

The exact text lives in `src/data/script.js` (owner-approved, edited through `docs/chatbox-script.md`).
`docs/chatbox-script.md` is generated from it by `node tools/export_script.mjs` and lists every page in
play order: angel (7 pages), stall 1 Krahang (5), stall 2 jar ghost (3), the letter (4 bold rows), the
chase intro (red), stall 3 (5 pages, page 4 = rate intro + date-based price line; after the event pages 4-5
become the "event has passed" page), stall 4 (4), stall 5 (5), and the two reply buttons. Stall 4 and 5
keep their lines even after the event. Do not name specific movies.

## 9. Assets

Sources: Drive folder เกมลานนภา/Scene_2_Sprite, downloaded unchanged to `assets/incoming/Scene_2_Sprite/`. Where a green-screen sheet has a "no green" version, the no-green one is used (no chroma key). Pipelines (re-runnable): `npm run sprites` (character sheets -> `src/assets/art/`, 3x), `python3 tools/bg_pipeline.py`, `python3 tools/stall_pipeline.py` (-> `assets/bg`, `assets/props`, `assets/stalls`, 1x). Asset rules: nearest-neighbour only, integer coordinates, #00FF00 = transparent, snap to palette after reporting off-palette pixels, never repaint or blend; resize only by exact multiples. Missing sprites show as labelled SPRITE NEEDED boxes. Every PNG is validated on load (width = frames x frame width, height = frame height).

| File | Size per frame (design px) | Frames | Notes |
|---|---|---|---|
| characters/<id>_side.png / _front.png | 32 x 36 | 9 / 3 | Scene 1's 8 player characters, exported from scene 1's code by `npm run scene1` (3x, nearest neighbour). Side faces left. Costumes drawn in |
| bird_side.png / bird_front.png | 32 x 32 | 10 / 6 | Default bird (scene 2 on its own, and the fallback). From sprite_playerdemo (no green). Side faces right, flipped in code |
| bird_krahang_cling.png | ~42 x 32 | 1 | Krahang riding the default bird, used while clinging in S1 with the default bird only |
| characters/<id>_krahang.png | 50 x 37 | 2 | Krahang riding each scene 1 character, generated by `tools/krahang_combo.py` from krahang.png's cling frames (mirrored, its white bird stand-in cut out, nothing painted) behind the character's struggle frames. Same rule for every character: on the back (centre >= 9 px behind the head), both eyes visible, fewest see-through pixels, as low as possible |
| angel_jayimpacts.png | ~34 x 64 | 9 | idle 4, talk 2, signature 1, wai 2. Halo drawn in |
| angel_halo / glint / poof | 16 x 13, 8 x 8, 32 x 28 | 1, 3, 4 | From sprite_jayimpact_fx (no green) |
| krahang.png | ~29 x 33 | 8 | jump-on 3, cling 2, flung 3; faces right, flipped in code |
| chaser.png | ~61 x 87 | 7 | float 6, open mouth 1; faces right. TODO: which of the two designs |
| stall_ghost_3/4/5.png | ~28x46, 31x40, 24x38 | 6, 4, 2 | Dancing ghost (stall 3), zombie (stall 4, checkerboard removed), baby ghost (stall 5). Stand on the ground to the right of their stall, facing the camera |
| jar.png | ~28 x 50 | 7 | closed, shake 2, ghost 2, letter 2 |
| letter_icon.png, letter_panel.png | 16 x 13, 140 x 92 | 1 | Panel text is drawn in code |
| stall_A/B/C.png, stall_X_front.png | 64 x 64, 64 x 24 | 1 | From sprite_stall_2_3_4_192x64 (A yellow, B magenta, C black/yellow); counter at y 40; front = rows y >= 40 |
| alley_near.png | 360 x 320 | 1 | From alley_near_360x320, palette-snapped; transparent above rooflines; ground y = 240. Seam: 396 px differ (fix in Aseprite) |
| alley_far.png | 360 x 320 | 1 | Night sky with moon in the CI palette, generated by `tools/gen_alley_far.py` |
| props (assets/props) | shophouse 90x130 x4, tin fence 90x70 x2, pole 16x150, spirit house 24x48, motorbike 44x30, food cart 48x40, laundry line 90x30, lantern string 90x20, plant 16x20, cat 16x16, road strip 90x80 | 15 | Placed by assets/bg/alley_layout.json (data only). backgroud_elements_native_scale: 15 props found, but pole, spirit house, motorbike, food cart, plant, cat are > 25% off these sizes, so props are skipped |
| bg_alley_exit, bg_street, bg_light_end | 360 x 320 | 1 | Re-resolutioned from the Drive exports by `tools/reres_bg.py` (block-mode resample, owner request), then `bg_pipeline.py`. bg_street gets bg_alley_exit's road under it. TODO: bg_street shows the real 7-Eleven logo |
| UI 9-slices, ui_arrow, ui_tap_button, meters, timer, icon_chaser, fx_sparkle/splat/sweat/tap_ripple/dust | as before | | Generated at 1x in the palette by `python3 tools/gen_ui_fx.py` (assets/ui/); replace any of them with hand-drawn art of the same size |

## 10. Test checklist

- `npm test` (date rows, meters, timer, wrapping, adapter, layer mirroring, music patterns), `npm run test:e2e -- --win` (viewports, fail path, full win path; sound: every effect renders in range offline, sound buttons, every scene 2 sound heard on the win path, calm then chase music), `npm run check:dialogue` (every page fits), `npm run test:flow` (scene 1 -> scene 2 -> onWin for every character; `-- --full` plays each whole run by tapping).
- Viewports: 360 x 640, 390 x 844, 412 x 915.
- Date logic: 29 Sep, 30 Sep, 12, 14, 15, 17, 18, 23, 24, 25 Oct, 26 Oct via the dev override.
- Fail paths: tap game timeout, ghost jar, rude reply at stall 3 and 4, timer 0 during dialogue, timer 0 during sprint.
- Rapid tapping does not trigger zoom or text selection on a real phone.
- Direction check: bird and chaser face left, stalls slide in from the left, the chaser closes in from the right, stall ghosts face the camera.

## 11. Open items (not decided)

1. Scene 1 hand-off is wired (section 3). Still to agree with the scene 1 developer: front surprised/relieved/happy frames (mapped from idle/blink for now), a 12 x 12 timer-bar icon per character (the bar still shows the default bird's icon), whether scene 1 should switch its labels to Serithai, the scene 3 hand-off (`go('scene3', character)`), and the PNG sheets scene 1's comments mention (assets/characters/, not delivered; scene 2 exports its own from scene 1's code). Scene 1's costume colours are outside the spec 2 bird palette (reported by `npm run scene1`, not changed).
2. Serithai licence for web embedding.
3. Name tags for stalls 1 and 2 (placeholders กระหัง, ผีในไห). Stalls 3-5: ผีนางรำสุดสวย, ซอมบี้แห่ง Cozy ราชพฤกษ์ 6, ผีกุมารตัวน้อย.
4. Which chaser design (sprite_chasingghost_1 or _2).
5. alley_far is missing; props need resizing to the table sizes (or the table updated); alley_near seam.
6. Pick time limit (none assumed), jar swap counts, walk speed and all tap constants are starting values.
