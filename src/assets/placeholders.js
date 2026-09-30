// SPRITE NEEDED markers. No art is generated here on purpose: every sprite
// that is not yet in src/assets/art/ is shown as a labelled box of the right
// frame size, so the game runs and the missing sprites are obvious on screen.
import { CSS, GROUND_Y } from '../config/constants.js';

const BORDER = CSS.magenta;
const FILL = 'rgba(40, 0, 40, 0.55)';
const LABEL = CSS.white;

function label(ctx, lines, w, h) {
  // Tiny system font, only used to name the missing sprite.
  const px = w >= 120 ? 8 : 6;
  ctx.font = `${px}px monospace`;
  ctx.fillStyle = LABEL;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lh = px + 1;
  const top = h / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, w / 2, top + i * lh, w - 2));
}

function drawMissingFrame(ctx, entry, f) {
  const w = entry.frameWidth;
  const h = entry.frameHeight;
  ctx.fillStyle = FILL;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = BORDER;
  ctx.fillRect(0, 0, w, 1);
  ctx.fillRect(0, h - 1, w, 1);
  ctx.fillRect(0, 0, 1, h);
  ctx.fillRect(w - 1, 0, 1, h);
  // 9-slice UI is stretched in game: border only, so text on top stays readable.
  if (entry.key.endsWith('_9slice')) return;
  if (w < 32 || h < 16) {
    // Too small for text: diagonal cross.
    for (let i = 0; i < Math.min(w, h); i++) {
      ctx.fillRect(Math.round((i * w) / h), i, 1, 1);
      ctx.fillRect(w - 1 - Math.round((i * w) / h), i, 1, 1);
    }
    return;
  }
  if (h >= 320) {
    // Backgrounds: mark the agreed ground line so layout can still be checked.
    ctx.fillStyle = BORDER;
    ctx.fillRect(0, GROUND_Y, w, 1);
  }
  const lines = w >= 64 ? ['SPRITE NEEDED', entry.file, `frame ${f}`] : ['NEEDED', entry.key.slice(0, 8), `#${f}`];
  label(ctx, entry.frames > 1 ? lines : lines.slice(0, 2), w, Math.min(h, GROUND_Y));
}

/** Paint a "sprite needed" strip for a manifest entry onto a 2D context. */
export function drawPlaceholderStrip(ctx, entry) {
  ctx.imageSmoothingEnabled = false;
  for (let f = 0; f < entry.frames; f++) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(f * entry.frameWidth, 0, entry.frameWidth, entry.frameHeight);
    ctx.clip();
    ctx.translate(f * entry.frameWidth, 0);
    drawMissingFrame(ctx, entry, f);
    ctx.restore();
  }
}
