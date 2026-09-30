# ลานนภา Halloween Fest: scene 2 (Trick or Treat run)

The source of truth is [`scene2-spec.md`](scene2-spec.md).

A portrait mobile browser game (180 x 320 layout, rendered at device resolution) built with Phaser 4 and Vite.
This repo covers scene 2 only. It runs on its own with a placeholder bird.

```
npm install
npm run dev          # http://localhost:5173  (dev only: ?today=YYYY-MM-DD overrides the ticket date)
npm test             # date logic, meters, timer, Thai wrapping, anchors
npm run test:e2e     # needs `npm run dev`; add -- --win for the full run to scene 3
npm run check:dialogue  # needs `npm run dev`; every dialogue page must fit its box
npm run sprites      # character sheets from assets/incoming -> src/assets/art
python3 tools/bg_pipeline.py && python3 tools/stall_pipeline.py  # backgrounds, props, stalls (Pillow + numpy)
npm run build
```

## Where things are

| Path | What |
|---|---|
| `src/config/constants.js` | Every tunable from spec section 5 plus layout numbers (ASSUMPTION / TODO marked) |
| `src/data/ticketPhases.js` | Ticket prices and dates |
| `src/data/script.js` | Exact dialogue text; speaker names and UI labels are TODO placeholders |
| `src/logic/` | Pure logic: ticket date text, tap meter, never-pausing chase timer, Thai wrapping |
| `src/scenes/TrickOrTreatScene.js` | State machine S0 to S7, caught sequence, win |
| `src/assets/manifest.js` | Asset sizes, frame order, facing; validated on load |
| `src/assets/art/` | **Put the real PNGs here** (file names as in the manifest) |
| `src/interfaces.js` | Character data contract, `onWin` / `onGameOver`, home route |

## Resolution

Layout stays in 180 x 320 design units (spec 2), but the game no longer renders at 180 x 320:

- The canvas is the phone's real device resolution, and the camera zooms the design space to fill it.
- Every texture is `RENDER_SCALE` (3) x its design size, so a 32 px bird is a 96 px sheet with 3x the detail.
- Pixel art stays crisp (no smoothing). The zoom snaps to a whole number of device pixels when that
  still fills 90% of the screen; otherwise Phaser's `smoothPixelArt` keeps pixel edges even.
- Text is drawn at device resolution.

## Sprites

`npm run sprites` (`tools/prep-sprites.mjs`) builds game strips from the sheets in `assets/incoming/Scene_2_Sprite/`
(the Drive folder `เกมลานนภา/Scene_2_Sprite`, downloaded unchanged to `assets/incoming/`; "no green" versions are used where they exist). It removes the background, finds the frames,
scales them with nearest-neighbour to 3x design size, and writes them to `src/assets/art/`.

In the game now (sizes are design px):

| Strip | From | Notes |
|---|---|---|
| `angel_jayimpacts.png` | sprite_jayimpacts_character | 9 frames: idle 4, talk 2, signature, wai 2. Halo drawn in |
| `angel_halo/glint/poof.png` | sprite_jayimpact_fx | |
| `krahang.png` | sprite_krahang_stall1 | jump-on 3, cling 2, flung 3; faces right, flipped in code |
| `bird_krahang_cling.png` | sprite_playerdemo (extras) | Krahang riding the bird, used while clinging in S1 |
| `bird_side.png`, `bird_front.png` | sprite_playerdemo | 10 + 6 frames; side faces right, flipped in code |
| `icon_bird`, `ground_shadow`, `fx_feather` | sprite_playerdemo (extras) | |
| `jar.png` | sprite_jar_stall2 | 7 frames |
| `letter_icon.png`, `letter_panel.png` | sprite_letter_stall2 | |
| `chaser.png` | sprite_chasingghost_2 | bald purple ghost, 7 frames. **Confirm vs sprite_chasingghost_1** |

`sprite_jayimpacts_avatar` (the 3-view turnaround) is not used.

Any other sprite shows as a magenta **SPRITE NEEDED** box of the right size, labelled with its file name.
Still needed:

- `stall_ghost_3/4/5.png` (ghost types TODO)
- Stalls A/B/C and `alley_near` now come from the native Drive exports via the Python pipelines
- Backgrounds: `bg_tap`, `bg_jars`, `bg_alley_far`, `bg_alley_near`, `bg_alley_exit`, `bg_street`, `bg_light_end` (`fx_whiteout` is optional)
- UI: `chatbox_9slice`, `nametag_9slice`, `choice_button_9slice`, `ui_arrow`, `ui_tap_button`,
  `ui_meter_frame`, `ui_meter_fill`, `ui_timer_frame`, `icon_chaser`
- FX: `fx_sparkle`, `fx_splat`, `fx_sweat`, `fx_tap_ripple`, `fx_dust`

Draw new art at 3x the design size in the manifest (for example a 64 x 64 booth is a 192 x 192 PNG),
or add a job to `tools/prep-sprites.mjs`.

## Open items and assumptions made

- Framework: Phaser 4, per the spec's recommendation. **Not yet confirmed with the scene 1 developer.** Scene 1 can embed scene 2 with
  `startScene2({ character, onWin, onGameOver })` (set `window.__LANNAPHA_EMBEDDED__ = true` first), or add the scene classes to its own game.
- Character contract: anchors are per view (`side.anchors`, `front.anchors`). The placeholder anchor values are guesses.
- `HOME_ROUTE` is `/` (TODO).
- Font: Serithai Regular pixel font (licence for web embedding still to confirm).
- Speaker names for stalls 3 to 5 and the GAME OVER / HOME / TAP labels are placeholders.
- The chase timer starts when the chaser appears, after the letter is read (state table S3). It uses wall-clock time, so it keeps running even when the tab is in the background.
- Timer bar: the chaser icon moves with time, the bird icon moves with run progress, and the goal is the left end.
- Soi exit is placed between stalls 4 and 5. Run speed is 48 px/s and a full sprint covers 360 px.
- Reply order is fixed (polite on top). The jar pick has no time limit.
