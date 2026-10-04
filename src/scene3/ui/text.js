// Scene 3 text: Serithai (Kanit as the web fallback), 12 px, crisp (scene 2's alpha snapping
// patch), wrapped at Thai word boundaries (Intl.Segmenter, else by grapheme cluster, so a
// combining mark never starts a line).
import { textStyle as baseStyle } from '../../ui/text.js';
import { wrapText } from '../../logic/textWrap.js';
import { FONT, FONT_PX } from '../config.js';

let ctx = null;
export function measure(px = FONT_PX) {
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  return (s) => {
    ctx.font = `${px}px ${FONT}`;
    return Math.ceil(ctx.measureText(s).width);
  };
}

export const wrap = (text, width, px = FONT_PX) => wrapText(text, width, measure(px));

export function style(px = FONT_PX, color = '#FFFFFF', extra = {}) {
  return { ...baseStyle(px, color), fontFamily: FONT, ...extra };
}

/** A text object on whole design pixels, origin top-left (or centred with align 'center'). */
export function label(scene, x, y, str, { px = FONT_PX, color = '#FFFFFF', align = 'left', depth = 0 } = {}) {
  const t = scene.add.text(Math.round(x), Math.round(y), str, style(px, color)).setDepth(depth);
  if (align === 'center') t.setOrigin(0.5, 0);
  return t;
}
