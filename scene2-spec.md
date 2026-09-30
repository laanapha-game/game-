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
- Framework: Phaser 4. TODO confirm it matches the scene 1 developer's stack.

## 3. Interfaces with other scenes (TODO, agree before coding)

Input to scene 2:
- Selected character data: sprite key or layers, frame size (32 x 32), and FIXED anchor points for head top and eye position (for hats and costumes), identical in every frame (per view).
- Views needed: side (faces LEFT in game; flip in code if the sheet is drawn facing right) and front. The back view is no longer needed.
- When a sprite is flipped in code, mirror the x-coordinates of the head-top and eye anchors too.

Outputs:
- `onWin`: go to scene 3, passing the character data through.
- `onGameOver`: go to the home page of the full game (route or function name TODO).

Scene 2 must run standalone with a placeholder bird so it can be built before scene 1 is finished.

## 4. Global rules

- Every fail path goes to one Game over screen, which has a single button to the home page. No retry.
- Fail conditions: tap game timeout, picking the ghost jar, a rude reply, chase timer reaching 0, final sprint meter not full at 0.
- The 2:00 chase timer starts when the chasing ghost appears (after the letter) and NEVER pauses (not during dialogue or reply choices). WALK segments come before it: no timer, no fail.
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
| S0 Angel intro | Angel Jayimpacts, 5 dialogue pages, no choices, no timer; angel disappears (poof) | WALK1 | none |
| WALK1 | Auto-scroll WALK_SEGMENT_S with the bird's run frames, slower. Stall 1 slides in from the left and stops at x~52 | S1 | none |
| S1 Stall 1 (Krahang) | Dialogue; when the last page finishes typing, shake ~0.5 s, then the tap game starts by itself: the Krahang leaps from its stall onto the bird's back, tap to fill the meter within TAP_GAME_TIME_S | WALK2 (Krahang flung away) | GAME_OVER |
| WALK2 | As WALK1, to stall 2 | S2 | none |
| S2 Stall 2 (jar ghost) | Dialogue while the jar shows its open-with-ghost frames; shake ~0.5 s, then the jar game on the stall counter: two jars, one ghost, one letter; reveal, shuffle, pick. No pick time limit (ASSUMPTION) | Letter jar: S3 | Ghost jar: jump scare, GAME_OVER |
| S3 Letter and chase start | Letter panel is read, then the chasing ghost appears and the 2:00 timer starts | S4 | timer 0: GAME_OVER |
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
- Layout numbers are ASSUMPTIONS, tune visually. Ground line at y = 240 in every background. Bird 32 px tall, stalls 64 px, chaser about 87 px (existing art).
- Top area (y 8 to 160): timer bar (y 8 to 16), chatbox (y 24 to 84), reply buttons (y 88 to 166).
- Bottom area (below y 240): foreground road and the tap meter (about y 270). Tapping works anywhere on screen.
- Stalls 1 to 5 use stall art A, B, A, B, C. Draw order: stall, ghost/staff, stall_front (rows y >= 40), so the ghost stands behind the counter with head and shoulders above y = 40. The stall 2 jar sits on the counter.
- Background follows the real route (ASSUMPTION for the split): inside the soi until stall 4, then the soi exit and the street with a 7-Eleven-style shop for stall 5 and the sprint, then the white light entrance.
- The chaser is behind the player on the RIGHT and faces left, closes in by position at the CHASER_STAGE_REMAINING_S thresholds; below 15 s it switches to the open-mouth frame and the screen shakes.
- Final sprint: meter value maps to scroll progress; meter = 1 reaches the light; bird fades to a white silhouette, whiteout (about 1 s), then scene 3.
- Timer bar (120 x 8) with chaser icon (moves with time) and bird icon (moves with run progress).

### 7.5 Stall 3 ticket text by date
Use the device clock converted to Asia/Bangkok as a YYYY-MM-DD date. Dev builds only: allow `?today=YYYY-MM-DD` to override.

```
PHASES = [
  {id: 'flash',   name: 'Flash Ticket',       start: '2026-09-29', end: '2026-09-29', price: 189},
  {id: 'early',   name: 'Early Bird',         start: '2026-10-12', end: '2026-10-14', price: 320},
  {id: 'general', name: 'General Ticket',     start: '2026-10-18', end: '2026-10-23', price: 390},
  {id: 'door',    name: 'At Door 1 Day Pass', start: '2026-10-24', end: '2026-10-25', price: 450},
]
EVENT_END = '2026-10-25'
today > EVENT_END      -> AFTER_EVENT
today inside a phase   -> ACTIVE
otherwise              -> GAP (prev = last phase that ended, may be none; next = first phase that starts later)
```

Price line (page 3) per mode. Dates shown as Thai short month, for example 14 ต.ค.
- ACTIVE, Flash: `ตอนนี้ Flash Ticket 189 บาท (หนัง + กิจกรรม) วันนี้วันเดียวเท่านั้น!`
- ACTIVE, Early Bird or General: `ตอนนี้ {name} {price} บาท (หนัง + กิจกรรม) ขายถึง {end}`
- ACTIVE, At Door: `วันงานซื้อหน้างานได้ 1 Day Pass {price} บาท`
- GAP with prev: `{prev.name} หมดแล้ว! {next.name} เปิด {next.start} ราคา {next.price} บาท`
- GAP without prev: `{next.name} เปิดขาย {next.start} ราคา {next.price} บาท`
- AFTER_EVENT: skip pages 2 to 4, show only the "event has passed" page.

Note the real gaps: 30 Sep to 11 Oct, and 15 to 17 Oct. The phase table lives in `src/data/ticketPhases.js`.

## 8. Script (exact text)

Angel Jayimpacts (S0), 5 pages:
```
1. ยินดีต้อนรับสู่โลกหลังความตาย! คุณ dead แล้ว
2. รีบเดินทางไปที่ลานนภาเสียนะ ก่อนที่ลูกพี่มัจจุราชตัวม่วงของผมจะจับคุณกินเสียก่อน
3. ข้างหน้าเป็นซุ้มดวงวิญญาณที่เจ้าต้องฝ่าไปให้ได้
4. รู้หรือไม่ ในงานลานนภา Halloween Fest 24-25 ต.ค. 69 นี้ แถว BTS Bangwa
5. ก็จะมีซุ้ม Trick or Treat ให้เจ้าเล่นแบบนี้ด้วยนะ แล้วเจอกันที่ลานนภา!
```

Stall 1, Krahang (S1):
```
ในงานจริงซุ้มผีแบบนี้ก็มีนะ แต่ก่อนที่เจ้าจะไปถึงลานนภา มาให้ข้ากินตับซะดีดี !!!!!
```

Stall 2, ghost in the jar (S2):
```
ข้าจะบอกให้ว่า ลานนภา ไปทางไหน แต่เจ้าต้องต้องหาจดหมายนำทางให้เจอ ตาดีทีรอดเว้ยเห้ย ว่าฮ่าฮ่าฮ่า อ้า..
```

Letter (S3), shown in the 140 x 100 panel:
```
เดินต่อไปตามซอยราชพฤกษ์ 6 ใกล้ 7-Eleven ลานนภาอยู่ข้างหน้าท่าน
```

Stall 3 (S4):
```
1. เดี๋ยวก่อนเจ้า! ผีไล่หลังอยู่ก็จริง แต่ข้ามีเรื่องจะบอก
2. รู้หรือไม่ ลานนภา Halloween Fest จัด 24-25 ต.ค. ค่าเข้าขึ้นเรทตามช่วงวัน
3. (price line from section 7.5)
4. ซื้อบัตรได้ที่ hellobooku.com/laanapha2026
After the event, pages 2 to 4 are replaced by: อ้าว... งานจัดไปแล้วนะเจ้า ไว้พบกันปีหน้า!
```

Stall 4 (S5):
```
1. เจ้าใกล้จะถึงลานนภาแล้ว!
2. เข้าไปแล้วก็ดูด้วยว่าเขาจะฉายหนังเรื่องอะไร
3. ห้ามพลาดนะ!
4. กดติดตาม Jayimpacts ด้วย เจ้าของงานฝากมาบอก
```
Stall 4 and 5 keep these lines even after the event (parody). Do not name specific movies.

Stall 5 (S6), no choice:
```
1. ถ้าเจ้าแต่งตัวเป็นผีมางาน อย่าลืมลงแข่งแต่งตัวด้วยล่ะ มีรางวัลให้เจ้าด้วย!
2. พูดคุยกับคนในงานประจำซุ้มด้วยนะ เจ้าของงานและทีมงานรอคุยเล่นกับทุกคนอยู่
3. กดติดตาม Jayimpacts ด้วย เจ้าของงานฝากมาบอก
4. ผีจะตามเจ้าทันแล้ว! รัวจอเพื่อวิ่งไปให้ถึงลานนภาให้ทันล่ะ!!
```
After page 4, the final sprint starts immediately.

Reply choices (stalls 3 and 4):
```
Polite: รับทราบ ขอบคุณมากที่บอก จะไปดูรายละเอียดต่อ
Rude (ends the game): เรื่องของมึง จะหนีผีโว้ย!
```

## 9. Assets

Sources: Drive folder เกมลานนภา/Scene_2_Sprite, downloaded unchanged to `assets/incoming/Scene_2_Sprite/`. Where a green-screen sheet has a "no green" version, the no-green one is used (no chroma key). Pipelines (re-runnable): `npm run sprites` (character sheets -> `src/assets/art/`, 3x), `python3 tools/bg_pipeline.py`, `python3 tools/stall_pipeline.py` (-> `assets/bg`, `assets/props`, `assets/stalls`, 1x). Asset rules: nearest-neighbour only, integer coordinates, #00FF00 = transparent, snap to palette after reporting off-palette pixels, never repaint or blend; resize only by exact multiples. Missing sprites show as labelled SPRITE NEEDED boxes. Every PNG is validated on load (width = frames x frame width, height = frame height).

| File | Size per frame (design px) | Frames | Notes |
|---|---|---|---|
| bird_side.png / bird_front.png | 32 x 32 | 10 / 6 | From sprite_playerdemo (no green). Side faces right, flipped in code |
| bird_krahang_cling.png | ~42 x 32 | 1 | Krahang riding the bird, used while clinging in S1 |
| angel_jayimpacts.png | ~34 x 64 | 9 | idle 4, talk 2, signature 1, wai 2. Halo drawn in |
| angel_halo / glint / poof | 16 x 13, 8 x 8, 32 x 28 | 1, 3, 4 | From sprite_jayimpact_fx (no green) |
| krahang.png | ~29 x 33 | 8 | jump-on 3, cling 2, flung 3; faces right, flipped in code |
| chaser.png | ~61 x 87 | 7 | float 6, open mouth 1; faces right. TODO: which of the two designs |
| stall_ghost_3/4/5.png | 32 x 48 | 2 each | Ghost types TODO. SPRITE NEEDED |
| jar.png | ~28 x 50 | 7 | closed, shake 2, ghost 2, letter 2 |
| letter_icon.png, letter_panel.png | 16 x 13, 140 x 92 | 1 | Panel text is drawn in code |
| stall_A/B/C.png, stall_X_front.png | 64 x 64, 64 x 24 | 1 | A yellow, B magenta, C black/yellow; front = rows y >= 40. SPRITE NEEDED until a 64x64 (or exact multiple) export exists |
| alley_far.png, alley_near.png | 360 x 320 | 1 | Ground y = 240; far opaque, near transparent above rooflines; left/right edges tile. SPRITE NEEDED |
| props (assets/props) | shophouse 90x130 x4, tin fence 90x70 x2, pole 16x150, spirit house 24x48, motorbike 44x30, food cart 48x40, laundry line 90x30, lantern string 90x20, plant 16x20, cat 16x16, road strip 90x80 | 15 | Placed by assets/bg/alley_layout.json (data only). SPRITE NEEDED |
| bg_alley_exit, bg_street, bg_light_end | 360 x 320 | 1 | SPRITE NEEDED |
| UI 9-slices, ui_arrow, ui_tap_button, meters, timer, icon_chaser, fx_* | as before | | SPRITE NEEDED |

## 10. Test checklist

- `npm test` (date rows, meters, timer, wrapping), `npm run test:e2e -- --win` (viewports, fail path, full win path), `npm run check:dialogue` (every page fits).
- Viewports: 360 x 640, 390 x 844, 412 x 915.
- Date logic: 29 Sep, 30 Sep, 12, 14, 15, 17, 18, 23, 24, 25 Oct, 26 Oct via the dev override.
- Fail paths: tap game timeout, ghost jar, rude reply at stall 3 and 4, timer 0 during dialogue, timer 0 during sprint.
- Rapid tapping does not trigger zoom or text selection on a real phone.
- Direction check: bird and chaser face left, stalls slide in from the left, the chaser closes in from the right, stall ghosts face the camera.

## 11. Open items (not decided)

1. Interfaces with scene 1 developer (section 3) and framework match.
2. Serithai licence for web embedding.
3. Which three ghost types staff stalls 3, 4 and 5; stall 1/2 name tags (placeholders กระหัง, ผีในไห).
4. Which chaser design (sprite_chasingghost_1 or _2).
5. Native-size exports for backgrounds, props and stalls (current Drive files are upscaled by a non-integer factor).
6. Pick time limit (none assumed), jar swap counts, walk speed and all tap constants are starting values.
