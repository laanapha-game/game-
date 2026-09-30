// One-shot sprite effects.
export function ensureFxAnims(scene) {
  const defs = [
    ['fx_tap_ripple', 4, 20],
    ['fx_dust', 3, 12],
    ['fx_feather', 3, 10],
    ['fx_sparkle', 3, 10],
    ['fx_splat', 3, 12],
    ['fx_sweat', 2, 6],
    ['angel_poof', 4, 12],
    ['angel_glint', 3, 10],
  ];
  for (const [key, n, rate] of defs) {
    if (scene.anims.exists(key)) continue;
    scene.anims.create({ key, frames: Array.from({ length: n }, (_, frame) => ({ key, frame })), frameRate: rate });
  }
}

export function burst(scene, key, x, y, { depth = 80, dx = 0, dy = 0, ms = 0 } = {}) {
  const s = scene.add.sprite(Math.round(x), Math.round(y), key, 0).setDepth(depth);
  s.play(key);
  s.once('animationcomplete', () => s.destroy());
  if (dx || dy) scene.tweens.add({ targets: s, x: x + dx, y: y + dy, duration: ms || 400 });
  return s;
}
