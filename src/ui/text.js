// Text helpers. Each line is its own Text object so the line pitch is exact
// on the pixel grid regardless of the font's metrics.
import { FONT_FAMILY, FONT_BODY_PX, RENDER_SCALE, CSS } from '../config/constants.js';
import { wrapText } from '../logic/textWrap.js';

// Includes Thai stacked marks so Phaser measures enough height for them.
const TEST_STRING = '|MÉqgปั้ฐู้ญ';

// Text is rasterised at device resolution (set by the view scaler).
let textResolution = RENDER_SCALE;
export function setTextResolution(n) {
  textResolution = Math.max(1, n);
}

let measureCtx = null;
export function measurer(px = FONT_BODY_PX) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  return (s) => {
    measureCtx.font = `${px}px ${FONT_FAMILY}`;
    return measureCtx.measureText(s).width;
  };
}

export function wrap(text, width, px = FONT_BODY_PX) {
  return wrapText(text, width, measurer(px));
}

export function textStyle(px = FONT_BODY_PX, color = CSS.white) {
  return { fontFamily: FONT_FAMILY, fontSize: `${px}px`, color, resolution: textResolution, testString: TEST_STRING };
}

/**
 * Lays out lines. align: 'left' puts x at the left edge, 'center' centres on x.
 * `y` is the top of the first line box.
 */
export function addLines(scene, x, y, count, lineHeight, { px = FONT_BODY_PX, color, align = 'left', depth = 0 } = {}) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const t = scene.add.text(x, y + i * lineHeight, '', textStyle(px, color));
    t.setOrigin(align === 'center' ? 0.5 : 0, 0).setDepth(depth);
    lines.push(t);
  }
  return lines;
}

/** Vertically centres `lines.length` rendered lines inside a box. */
export function setLines(lineObjs, strings, { top, height, lineHeight } = {}) {
  lineObjs.forEach((t, i) => t.setText(strings[i] ?? ''));
  if (top !== undefined) {
    const used = strings.length * lineHeight;
    const start = Math.round(top + (height - used) / 2);
    lineObjs.forEach((t, i) => (t.y = start + i * lineHeight));
  }
}
