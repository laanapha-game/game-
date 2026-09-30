# ลานนภา Halloween Fest: scene 2 (Trick or Treat run)

A portrait mobile browser game (180 x 320, whole-number scaling) built with Phaser 4 and Vite.
This repo covers scene 2 only. It runs on its own with a placeholder bird.

```
npm install
npm run dev          # http://localhost:5173  (dev only: ?today=YYYY-MM-DD overrides the ticket date)
npm test             # date logic, meters, timer, Thai wrapping, anchors
npm run test:e2e     # needs `npm run dev`; add -- --win for the full run to scene 3
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

## Sprites

Nothing is drawn as fake art. Any sprite that is missing from `src/assets/art/` shows up as a
magenta **SPRITE NEEDED** box of the right frame size, labelled with its file name. The console
lists the missing ones on load, and sheets whose sizes don't match the manifest are printed as a table.

### In the game now

`tools/prep-sprites.mjs` builds these from the sheets in `art-src/`. It removes the background, finds the frames,
scales them with nearest-neighbour and writes equal-cell strips (`npm run sprites`):

- `chaser.png`: bald purple ghost, 7 frames of 61x87 (float x6, open mouth), faces right, flipped in code.
  **Two designs were shared.** To use the sheet ghost instead, point the job at `chaser_sheet_ghost.png`.
- `jar.png`: 7 frames of 28x50 (closed, shake x2, ghost x2, letter x2)
- `angel_halo.png` (16x13), `angel_glint.png` (3 x 8x8), `angel_poof.png` (4 x 32x28)

To add a sheet, put it in `art-src/` and add a job in `tools/prep-sprites.mjs`.

### Already made, not yet in the repo

These were shared in chat but are not on disk here. Add the sheets to `art-src/` (or export strips straight into `src/assets/art/`).
They are marked `existing: true`, so their real frame size is read and recorded instead of treated as an error:
They are marked `existing: true`, so their real frame size is read and recorded instead of treated as an error:

- `krahang.png`: 8 frames (jump-on 3, cling 2, flung 3), faces right, flipped in code
- `letter_icon.png`, `letter_panel.png`
- Bird (from scene 1): `bird_side.png` (10 frames, faces right), `bird_front.png` (6), plus
  `icon_bird.png`, `ground_shadow.png` and `fx_feather.png` (3) from the extras row. The combined bird sheet has to be cut into these strips.

### Still needed

- `angel_jayimpacts.png`: 9-frame animation strip (idle 4, talk 2, signature 1, wave 2). The art shown is a 3-view turnaround.
- `stall_ghost_3/4/5.png` (ghost types TODO), `booth.png`
- Backgrounds: `bg_tap`, `bg_jars`, `bg_alley_far`, `bg_alley_near`, `bg_alley_exit`, `bg_street`, `bg_light_end` (`fx_whiteout` is optional)
- UI: `chatbox_9slice`, `nametag_9slice`, `choice_button_9slice`, `ui_arrow`, `ui_tap_button`,
  `ui_meter_frame`, `ui_meter_fill`, `ui_timer_frame`, `icon_chaser`
- FX: `fx_sparkle`, `fx_splat`, `fx_sweat`, `fx_tap_ripple`, `fx_dust`

## Open items and assumptions made

- Framework: Phaser 4, per the spec's recommendation. **Not yet confirmed with the scene 1 developer.** Scene 1 can embed scene 2 with
  `startScene2({ character, onWin, onGameOver })` (set `window.__LANNAPHA_EMBEDDED__ = true` first), or add the scene classes to its own game.
- Character contract: anchors are per view (`side.anchors`, `front.anchors`). The placeholder anchor values are guesses.
- `HOME_ROUTE` is `/` (TODO).
- Font: Noto Sans Thai (OFL) as a **placeholder**, with a dev-only badge on screen.
- Speaker names for stalls 3 to 5 and the GAME OVER / HOME / TAP labels are placeholders.
- The chase timer starts when the chaser appears, after the letter is read (state table S3). It uses wall-clock time, so it keeps running even when the tab is in the background.
- Timer bar: the chaser icon moves with time, the bird icon moves with run progress, and the goal is the left end.
- Soi exit is placed between stalls 4 and 5. Run speed is 48 px/s and a full sprint covers 360 px.
- Reply order is fixed (polite on top). The jar pick has no time limit.
