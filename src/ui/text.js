// Text helpers. Each line is its own Text object so the line pitch is exact on
// the pixel grid. All text uses the Serithai pixel font on the design grid
// (resolution 1) with smoothing off: after Phaser draws a Text canvas, alpha is
// snapped to 0/255 so no antialiased pixels remain.
import Phaser from 'phaser';
import { FONT_FAMILY, FONT_BODY_PX, TEXT_PAD_Y, CSS } from '../config/constants.js';
import { wrapText } from '../logic/textWrap.js';

const INK_LIFT = 2;

// Includes Thai stacked marks so Phaser measures enough height for them.
const TEST_STRING = '|MÉqgปั้ฐู้ญ';

// Text is rasterised at the device's resolution (set by the view scaler) so it
// stays sharp and readable on phones; the pixel font keeps its blocky shapes and
// alpha is snapped to 0/255, so edges stay crisp (no blur).
let textResolution = 3;
export function setTextResolution(n) {
  textResolution = Math.max(1, Math.min(8, n));
}

let patched = false;
function patchTextSmoothing() {
  if (patched) return;
  patched = true;
  const proto = Phaser.GameObjects.Text.prototype;
  const original = proto.updateText;
  proto.updateText = function updateTextNoSmoothing() {
    original.call(this);
    const { canvas, context } = this;
    if (!canvas.width || !canvas.height) return this;
    const img = context.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 128 ? 255 : 0;
    context.putImageData(img, 0, 0);
    if (this.renderer && this.renderer.gl) {
      this.frame.source.glTexture = this.renderer.canvasToTexture(canvas, this.frame.source.glTexture, true);
    }
    return this;
  };
}

let measureCtx = null;
export function measurer(px = FONT_BODY_PX, bold = false) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  return (s) => {
    measureCtx.font = `${bold ? 'bold ' : ''}${px}px ${FONT_FAMILY}`;
    return Math.ceil(measureCtx.measureText(s).width);
  };
}

export function wrap(text, width, px = FONT_BODY_PX, bold = false) {
  return wrapText(text, width, measurer(px, bold));
}

/** bold: the font has no bold face, so the browser emboldens it (then alpha is snapped). */
export function textStyle(px = FONT_BODY_PX, color = CSS.white, bold = false) {
  patchTextSmoothing();
  return {
    fontFamily: FONT_FAMILY,
    fontStyle: bold ? 'bold' : 'normal',
    fontSize: `${px}px`,
    color,
    resolution: textResolution,
    testString: TEST_STRING,
    padding: { top: TEXT_PAD_Y, bottom: TEXT_PAD_Y, left: TEXT_PAD_Y, right: TEXT_PAD_Y },
  };
}

/**
 * Lays out lines. align: 'left' puts x at the left edge, 'center' centres on x.
 * `y` is the top of the first line box (the canvas padding sits above it).
 */
export function addLines(scene, x, y, count, lineHeight, { px = FONT_BODY_PX, color, align = 'left', depth = 0, bold = false } = {}) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const t = scene.add.text(x - (align === 'center' ? 0 : TEXT_PAD_Y), y + i * lineHeight - TEXT_PAD_Y, '', textStyle(px, color, bold));
    t.setOrigin(align === 'center' ? 0.5 : 0, 0).setDepth(depth);
    lines.push(t);
  }
  return lines;
}

/** Vertically centres `strings.length` lines inside a box. */
export function setLines(lineObjs, strings, { top, height, lineHeight } = {}) {
  lineObjs.forEach((t, i) => {
    t.setText(strings[i] ?? '');
    if (t.originX === 0.5) {
      // Centre on an integer pixel so the pixel font stays on the grid.
      const cx = t.centerX ?? t.x;
      t.centerX = cx;
      t.setOrigin(0, t.originY).setX(Math.round(cx - t.width / 2));
    } else if (t.centerX !== undefined) {
      t.setX(Math.round(t.centerX - t.width / 2));
    }
  });
  if (top !== undefined) {
    const used = strings.length * lineHeight;
    // Serithai's ink sits about 2 px low in its line box, so centre slightly higher.
    const start = Math.floor(top + (height - used) / 2) - INK_LIFT;
    lineObjs.forEach((t, i) => (t.y = start + i * lineHeight - TEXT_PAD_Y));
  }
}

/** Height in px of the tallest possible line of ink (stacked marks included), from the line-box top. */
export function inkHeight(px = FONT_BODY_PX) {
  measurer(px)('');
  measureCtx.font = `${px}px ${FONT_FAMILY}`;
  const t = measureCtx.measureText(TEST_STRING);
  return Math.ceil(t.actualBoundingBoxAscent + t.actualBoundingBoxDescent);
}
