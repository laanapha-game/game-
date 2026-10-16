// Full-screen backdrop for the full game page (game.html): the game is portrait 9:16 and
// scales to fill the screen's height or width; whatever space a different screen shape
// leaves (a tall phone, a landscape laptop) shows a soft, blurred, dimmed glow of the game
// itself instead of empty bars.
//
// capture(canvas) copies a frame (shrunk to 18 x 32, the browser smooths it), at most
// every 120 ms. Scene 1 / the hub pass scene 1's canvas; scene 2 passes Phaser's canvas
// from its post-render event (a WebGL canvas can only be read right after it renders).
const SW = 18;
const SH = 32;

export function createAmbient() {
  const el = document.createElement('canvas');
  el.width = SW;
  el.height = SH;
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'fixed',
    left: '-8%',
    top: '-8%',
    width: '116%',
    height: '116%',
    objectFit: 'cover',
    filter: 'blur(28px) brightness(0.55) saturate(1.25)',
    zIndex: '0',
    pointerEvents: 'none',
  });
  document.body.prepend(el);
  const ctx = el.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  let last = 0;
  return {
    el,
    capture(src, now = performance.now()) {
      if (now - last < 120 || !src?.width) return;
      last = now;
      try {
        ctx.drawImage(src, 0, 0, SW, SH);
      } catch {
        /* a tainted or lost canvas: keep the last frame */
      }
    },
  };
}
