// Asset manifest (spec 9). Sizes are in design px; the PNG is RENDER_SCALE x that.
// Every sheet is a horizontal strip, width = frames x frameWidth, height = frameHeight.
// Validated on load. Sheets from the Drive folder are built by tools/prep-sprites.mjs.
//
// Drop real PNGs (chroma key already removed) into src/assets/art/ using the
// same file names. Anything missing is shown as a labelled "SPRITE NEEDED" box
// (no art is generated).
//
// `existing: true` = art made before this spec. Its real size is read and
// recorded in the asset report instead of being treated as an error.
// `facing` = direction the art is drawn in; 'right' is flipped in code.

export const MANIFEST = [
  // Characters
  // Bird sheets come from scene 1. The combined sheet seen in chat (side row, back row,
  // front row, extras) has to be cut into these strips. Its side row has 10 frames
  // (not 9) and faces RIGHT, so it is flipped in code. See createPlaceholderCharacter().
  { key: 'bird_side', file: 'bird_side.png', frameWidth: 32, frameHeight: 32, frames: 10, facing: 'right', existing: true },
  { key: 'bird_front', file: 'bird_front.png', frameWidth: 32, frameHeight: 32, frames: 6, existing: true },
  // bird_back.png is NOT NEEDED for the side-scroller and is not loaded.
  // From Drive sprite_jayimpacts_character: idle 4, talk 2, signature 1, wave (wai) 2.
  // The halo is drawn into these frames, so the separate halo is not shown with it.
  { key: 'angel_jayimpacts', file: 'angel_jayimpacts.png', frameWidth: 32, frameHeight: 48, frames: 9, existing: true },
  // Existing (seen in chat): gear halo, 3 glints, 4 poof frames.
  { key: 'angel_halo', file: 'angel_halo.png', frameWidth: 16, frameHeight: 16, frames: 1, existing: true },
  { key: 'angel_glint', file: 'angel_glint.png', frameWidth: 8, frameHeight: 8, frames: 3, existing: true },
  { key: 'angel_poof', file: 'angel_poof.png', frameWidth: 32, frameHeight: 32, frames: 4, existing: true },
  // Existing Krahang sheet (seen in chat): jump-on 3, cling 2, flung 3. The jump frames
  // face RIGHT, so it is flipped in code. TODO: the cling frames are drawn from the
  // front (behind a bird silhouette), not side view; check they read well on the bird's back.
  { key: 'krahang', file: 'krahang.png', frameWidth: 32, frameHeight: 32, frames: 8, facing: 'right', existing: true },
  // Existing chaser sheet (seen in chat): 7 frames, float x6 then the bigger
  // open-mouth frame, drawn FACING RIGHT (flipped in code). Real frame size is
  // read on load; 64x64 is only the size of the "sprite needed" marker.
  // TODO(open item 5): two chaser designs were shown (sheet ghost, bald purple face;
  // the bald one was sent twice). Confirm which one is chaser.png.
  // From the bird sheet extras: the Krahang riding the bird (cling pose for S1), faces right.
  { key: 'bird_krahang_cling', file: 'bird_krahang_cling.png', frameWidth: 42, frameHeight: 32, frames: 1, facing: 'right', existing: true },
  { key: 'chaser', file: 'chaser.png', frameWidth: 64, frameHeight: 64, frames: 7, facing: 'right', existing: true },
  // Final sprint: the same chaser with red eyes (tools/chaser_red_eyes.py, only eye pixels changed).
  { key: 'chaser_red', file: 'chaser_red.png', frameWidth: 64, frameHeight: 64, frames: 7, facing: 'right', existing: true },
  // Stall ghosts (Drive): dancing ghost (stall 3), zombie (stall 4), baby ghost (stall 5).
  { key: 'stall_ghost_3', file: 'stall_ghost_3.png', frameWidth: 28, frameHeight: 46, frames: 6, existing: true },
  { key: 'stall_ghost_4', file: 'stall_ghost_4.png', frameWidth: 31, frameHeight: 40, frames: 4, existing: true },
  { key: 'stall_ghost_5', file: 'stall_ghost_5.png', frameWidth: 24, frameHeight: 38, frames: 2, existing: true },

  // Props
  // Existing jar sheet (seen in chat): closed, shake x2, ghost x2, letter x2.
  { key: 'jar', file: 'jar.png', frameWidth: 32, frameHeight: 40, frames: 7, existing: true },
  // Existing (seen in chat): sealed envelope icon and torn parchment panel.
  { key: 'letter_icon', file: 'letter_icon.png', frameWidth: 16, frameHeight: 16, frames: 1, existing: true },
  { key: 'letter_panel', file: 'letter_panel.png', frameWidth: 140, frameHeight: 100, frames: 1, existing: true },

  // Stalls from tools/stall_pipeline.py (assets/stalls/, 1x design size, `native`).
  // stall_X = full 64x64, stall_X_front = rows y >= 40 (the counter), 64x24.
  { key: 'stall_A', file: 'stall_A.png', native: 'stalls', frameWidth: 64, frameHeight: 64, frames: 1 },
  { key: 'stall_A_front', file: 'stall_A_front.png', native: 'stalls', frameWidth: 64, frameHeight: 24, frames: 1 },
  { key: 'stall_B', file: 'stall_B.png', native: 'stalls', frameWidth: 64, frameHeight: 64, frames: 1 },
  { key: 'stall_B_front', file: 'stall_B_front.png', native: 'stalls', frameWidth: 64, frameHeight: 24, frames: 1 },
  { key: 'stall_C', file: 'stall_C.png', native: 'stalls', frameWidth: 64, frameHeight: 64, frames: 1 },
  { key: 'stall_C_front', file: 'stall_C_front.png', native: 'stalls', frameWidth: 64, frameHeight: 24, frames: 1 },

  // Backgrounds (ground line y = 240 in every one). tools/bg_pipeline.py writes
  // assets/bg/alley_far.png and alley_near.png (1x); when present they replace these.
  { key: 'bg_alley_far', file: 'bg_alley_far.png', frameWidth: 360, frameHeight: 320, frames: 1 },
  { key: 'bg_alley_near', file: 'bg_alley_near.png', frameWidth: 360, frameHeight: 320, frames: 1 },
  { key: 'bg_alley_exit', file: 'bg_alley_exit.png', frameWidth: 360, frameHeight: 320, frames: 1 },
  { key: 'bg_street', file: 'bg_street.png', frameWidth: 360, frameHeight: 320, frames: 1 },
  { key: 'bg_light_end', file: 'bg_light_end.png', frameWidth: 360, frameHeight: 320, frames: 1 },
  { key: 'fx_whiteout', file: 'fx_whiteout.png', native: 'ui', frameWidth: 180, frameHeight: 320, frames: 1 },

  // UI and small FX: generated at 1x by tools/gen_ui_fx.py (assets/ui/).
  { key: 'chatbox_9slice', file: 'chatbox_9slice.png', native: 'ui', frameWidth: 24, frameHeight: 24, frames: 1 },
  { key: 'nametag_9slice', file: 'nametag_9slice.png', native: 'ui', frameWidth: 24, frameHeight: 16, frames: 1 },
  { key: 'choice_button_9slice', file: 'choice_button_9slice.png', native: 'ui', frameWidth: 24, frameHeight: 16, frames: 2 },
  { key: 'ui_arrow', file: 'ui_arrow.png', native: 'ui', frameWidth: 8, frameHeight: 8, frames: 2 },
  { key: 'ui_tap_button', file: 'ui_tap_button.png', native: 'ui', frameWidth: 48, frameHeight: 24, frames: 2 },
  { key: 'ui_meter_frame', file: 'ui_meter_frame.png', native: 'ui', frameWidth: 120, frameHeight: 10, frames: 1 },
  { key: 'ui_meter_fill', file: 'ui_meter_fill.png', native: 'ui', frameWidth: 120, frameHeight: 10, frames: 1 },
  { key: 'ui_timer_frame', file: 'ui_timer_frame.png', native: 'ui', frameWidth: 120, frameHeight: 8, frames: 1 },
  { key: 'icon_chaser', file: 'icon_chaser.png', native: 'ui', frameWidth: 12, frameHeight: 12, frames: 1 },
  // Sound buttons (top corners): speaker = all sound (as scene 1's speaker), note = music. Frames: on, off.
  { key: 'ui_sound', file: 'ui_sound.png', native: 'ui', frameWidth: 12, frameHeight: 10, frames: 2 },
  { key: 'ui_music', file: 'ui_music.png', native: 'ui', frameWidth: 12, frameHeight: 10, frames: 2 },
  { key: 'icon_bird', file: 'icon_bird.png', frameWidth: 12, frameHeight: 12, frames: 1, existing: true },

  // FX
  { key: 'fx_sparkle', file: 'fx_sparkle.png', native: 'ui', frameWidth: 8, frameHeight: 8, frames: 3 },
  { key: 'fx_splat', file: 'fx_splat.png', native: 'ui', frameWidth: 16, frameHeight: 16, frames: 3 },
  { key: 'fx_sweat', file: 'fx_sweat.png', native: 'ui', frameWidth: 8, frameHeight: 8, frames: 2 },
  { key: 'fx_tap_ripple', file: 'fx_tap_ripple.png', native: 'ui', frameWidth: 16, frameHeight: 16, frames: 4 },
  { key: 'fx_dust', file: 'fx_dust.png', native: 'ui', frameWidth: 8, frameHeight: 8, frames: 3 },
  { key: 'fx_feather', file: 'fx_feather.png', frameWidth: 8, frameHeight: 8, frames: 3, existing: true },
  // Existing in the bird sheet extras: icon_bird, ground_shadow and 3 feather-puff frames.
  // Atmosphere (tools/gen_ui_fx.py): top/bottom shadow and drifting fog.
  { key: 'fx_vignette', file: 'fx_vignette.png', native: 'ui', frameWidth: 180, frameHeight: 320, frames: 1 },
  { key: 'fx_fog', file: 'fx_fog.png', native: 'ui', frameWidth: 180, frameHeight: 48, frames: 1 },
  { key: 'ground_shadow', file: 'ground_shadow.png', frameWidth: 16, frameHeight: 6, frames: 1, existing: true },
];

// Frame indices inside each sheet (spec 9 frame order).
export const FRAMES = {
  angel: { idle: [0, 1, 2, 3], talk: [4, 5], signature: [6], wave: [7, 8] },
  krahang: { jumpOn: [0, 1, 2], cling: [3, 4], flung: [5, 6, 7] },
  chaser: { float: [0, 1, 2, 3, 4, 5], openMouth: 6 },
  // Idle loop per stall ghost: frames and frame rate.
  stallGhost: { 3: { frames: [0, 1, 2, 3, 4, 5], rate: 5 }, 4: { frames: [0, 1, 2, 3], rate: 4 }, 5: { frames: [0, 1], rate: 3 } },
  jar: { closed: 0, shake: [1, 2], ghost: [3, 4], letter: [5, 6] },
  choice: { normal: 0, pressed: 1 },
  arrow: [0, 1],
  tapButton: { up: 0, down: 1 },
};

/** Validate a loaded image against its manifest entry (spec 9). */
// Textures are RENDER_SCALE x the design frame size listed above.
export function validateEntry(entry, width, height, scale = 1) {
  const expectedW = entry.frames * entry.frameWidth * scale;
  const expectedH = entry.frameHeight * scale;
  const ok = width === expectedW && height === expectedH;
  return {
    key: entry.key,
    file: entry.file,
    expected: `${expectedW}x${expectedH}`,
    actual: `${width}x${height}`,
    ok,
    existing: !!entry.existing,
  };
}
