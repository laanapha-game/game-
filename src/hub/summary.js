// The end-of-hunt summary card ("Dashboard"): the player's own background (one theme per
// scene 1 character), their name and character, time used, rank and the 8 stickers.
// Drawn in 180 x 320 design pixels, the same card on screen and in the saved image
// (exported at 6x = 1080 x 1920, a phone-story size).
import { W, H, COL, kit, sprite, mkCanvas, pumpkinSprite, ghostSprite, moonSprite, textSprite } from './brand.js';
import { HUNT_MINUTES } from '../data/checkpoints.js';

// ---------- one background per character ----------
const mk = (w, h, rows, pal) => sprite(w, h, (x, y) => pal[rows[y][x]] || null);
const MOTIF = {
  heart: (c) => mk(7, 6, ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'], { '#': c }),
  diamond: (c) => mk(7, 7, ['...#...', '..#.#..', '.#.#.#.', '#.###.#', '.#.#.#.', '..#.#..', '...#...'], { '#': c }),
  bat: (c) => mk(11, 5, ['#....#....#', '##..###..##', '###########', '.####.####.', '..#.....#..'], { '#': c }),
  splat: (c) => mk(8, 8, ['..#...#.', '.##..##.', '#######.', '.######.', '.#######', '#######.', '.##.##..', '.#...#..'], { '#': c }),
  drop: (c) => mk(5, 7, ['..#..', '..#..', '.###.', '.###.', '#####', '#####', '.###.'], { '#': c }),
  star: (c) => mk(7, 7, ['...#...', '...#...', '.#####.', '#######', '.#####.', '.#...#.', '#.....#'], { '#': c }),
  sparkle: (c) => mk(5, 5, ['..#..', '..#..', '#####', '..#..', '..#..'], { '#': c }),
};
const pumpkinMotif = () => pumpkinSprite(true);
export { bigText };
const ghostMotif = () => ghostSprite('#F4F4FA', '#262638');

export const THEMES = {
  nuannapa: { a: '#F02DF0', b: '#A61EA6', ink: COL.yellow, motif: () => MOTIF.heart('#F9A8F9'), label: 'นวลนภา' },
  ramwong: { a: '#DEB350', b: '#AD8E3C', ink: COL.black, motif: () => MOTIF.diamond('#FDE798'), label: 'นางรำ' },
  pumpkin: { a: '#DE5238', b: '#8F2F20', ink: COL.yellow, motif: pumpkinMotif, label: 'ฟักทอง' },
  vampire: { a: '#3B1450', b: '#1A0A26', ink: COL.yellow, motif: () => MOTIF.bat('#000000'), moon: true, label: 'แวมไพร์' },
  slasher: { a: '#4A1A14', b: '#1B0806', ink: COL.white, motif: () => MOTIF.splat('#D11F1F'), label: 'ฮอกกี้' },
  onryo: { a: '#CDD0E0', b: '#9AA0BC', ink: COL.black, motif: ghostMotif, label: 'ผีผมยาว' },
  mahidol: { a: '#13307F', b: '#0B1D52', ink: COL.yellow, motif: () => MOTIF.star('#FFFF4F'), label: 'มหิดล' },
  silpakorn: { a: '#40826D', b: '#2B5E4D', ink: COL.yellow, motif: () => MOTIF.sparkle('#F3E9C6'), label: 'ศิลปากร' },
};
const themeCache = {};
function themeFor(id) {
  const th = THEMES[id] || THEMES.nuannapa;
  if (!themeCache[id]) themeCache[id] = { ...th, sprite: th.motif() };
  return themeCache[id];
}

function rnd(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

/** Waving diagonal stripes in the theme colours, scattered motifs, dark vignette. */
export function drawBackground(ctx, id, t) {
  const th = themeFor(id);
  const A = hex(th.a);
  const B = hex(th.b);
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const wv = Math.round(3 * Math.sin((2 * Math.PI * (y + t * 10)) / 80));
      const c = Math.floor((x + y * 0.6 + wv + 600) / 20) & 1 ? B : A;
      const i = (y * W + x) * 4;
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const r = rnd(id.length * 97 + 11);
  const sp = th.sprite;
  for (let gy = -1; gy < 11; gy++)
    for (let gx = 0; gx < 6; gx++) {
      if (r() < 0.35) continue;
      const x = gx * 32 + Math.floor(r() * 16) - 6;
      const y = gy * 32 + Math.floor(r() * 16) + Math.round(Math.sin(t * 1.2 + gx + gy) * 2);
      ctx.drawImage(sp, x, y);
    }
  if (th.moon) ctx.drawImage(moonSprite(), 150, 36);
  ctx.drawImage(vignette(), 0, 0);
}
let vig = null;
function vignette() {
  if (!vig)
    vig = sprite(W, H, (x, y) => {
      const e = Math.min(x, y, W - 1 - x, H - 1 - y);
      return e < 2 || (e < 5 && (x + y) % 2 === 0) ? '#000000' : null;
    });
  return vig;
}

export function fmtTime(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Title for the card. */
export function rankFor(status, usedMs, count) {
  if (status === 'complete') {
    const m = usedMs / 60000;
    if (m < 15) return 'ผีไวสายฟ้าแลบ';
    if (m < 30) return 'นักล่าผีตัวจริง';
    return 'ผู้รอดชีวิตแห่งลานนภา';
  }
  if (status === 'timeout') return count >= 5 ? 'เกือบรอดแล้ว!' : 'ผีจับตัวได้แล้ว...';
  return 'กำลังล่าอยู่...';
}

/** Big pixel digits: the 5x7 font at 2x. */
function bigText(K, s, x, y, color, align = 'c', scale = 2) {
  const { ctx } = K;
  const c = textSprite(s, color);
  const sh = textSprite(s, COL.black);
  const w = c.width * scale;
  const dx = align === 'c' ? Math.round(x - w / 2) : align === 'r' ? x - w : x;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sh, dx + scale, y + scale, w, c.height * scale);
  ctx.drawImage(c, dx, y, w, c.height * scale);
}

/**
 * Draw the card into `ctx` (180 x 320).
 * data: { characterId, characterName, name, status, usedMs, stickers: [{ got, mini, locked }], date, getSprite }
 * opts.footer: draw the footer strip (the saved image); on screen the buttons sit there instead.
 */
export function drawCard(ctx, data, t, opts = {}) {
  const K = kit(ctx);
  const { rect, text, textS, thai, thaiS, box, bulbPanel } = K;
  const th = themeFor(data.characterId);
  ctx.imageSmoothingEnabled = false;
  drawBackground(ctx, data.characterId, t);
  // header
  bulbPanel(10, 6, 160, 22, t);
  text('LAANAPHA HALLOWEEN FEST', 90, 13, COL.yellow, 'c');
  // character, 2x, on a disc
  const cx = 90;
  const feet = 112;
  ctx.fillStyle = COL.black;
  for (let y = -34; y <= 34; y++)
    for (let x = -34; x <= 34; x++) {
      const r = Math.hypot(x, y);
      if (r <= 31) ctx.fillRect(cx + x, 76 + y, 1, 1);
      else if (r <= 33 && (x + y) % 2 === 0) {
        ctx.fillStyle = COL.yellow;
        ctx.fillRect(cx + x, 76 + y, 1, 1);
        ctx.fillStyle = COL.black;
      }
    }
  const frame = t % 3.4 > 3.25 ? 'blink' : Math.floor(t * 2.2) % 2 ? 'idle1' : 'idle0';
  const sp = data.getSprite(data.characterId, 'front', frame);
  if (sp) ctx.drawImage(sp, cx - sp.width, feet - sp.height * 2, sp.width * 2, sp.height * 2);
  // name + rank
  box(8, 116, 164, 38, COL.black, th.ink === COL.black ? COL.yellow : th.ink);
  const name = data.name || 'ผู้กล้าไร้นาม';
  thaiS(name, 90, 114, COL.yellow, name.length > 14 ? 13 : 16);
  thai(rankFor(data.status, data.usedMs, data.count), 90, 133, COL.magenta, 12);
  // stats
  const s1 = { x: 8, y: 160, w: 80, h: 36 };
  const s2 = { x: 92, y: 160, w: 80, h: 36 };
  [s1, s2].forEach((s) => box(s.x, s.y, s.w, s.h, COL.black, COL.yellow));
  thai('เวลาที่ใช้', s1.x + s1.w / 2, s1.y - 2, COL.white, 12);
  thai('สติกเกอร์', s2.x + s2.w / 2, s2.y - 2, COL.white, 12);
  bigText(K, fmtTime(data.usedMs), s1.x + s1.w / 2, s1.y + 19, data.status === 'timeout' ? COL.magenta : COL.yellow);
  bigText(K, `${data.count}/8`, s2.x + s2.w / 2, s2.y + 19, data.count === 8 ? COL.green : COL.yellow);
  // sticker collection 4 x 2
  box(8, 200, 164, 88, COL.black, COL.yellow);
  data.stickers.forEach((st, i) => {
    const x = 12 + (i % 4) * 40;
    const y = 204 + Math.floor(i / 4) * 41;
    rect(x, y, 36, 38, st.got ? (i % 2 ? COL.magenta : COL.yellow) : COL.ddred);
    rect(x + 1, y + 1, 34, 36, st.got ? (i % 2 ? COL.dmagenta : COL.olive) : COL.black);
    const s = st.got ? st.mini : st.locked;
    if (s) ctx.drawImage(s, x + Math.round((36 - s.width) / 2), y + Math.round((38 - s.height) / 2));
    if (!st.got) textS('?', x + 18, y + 16, COL.dred, 'c');
    text(String(i + 1), x + 2, y + 2, st.got ? COL.black : COL.dred);
  });
  if (opts.footer) {
    rect(8, 292, 164, 22, COL.black);
    rect(8, 292, 164, 1, COL.magenta);
    text(data.date, 14, 296, COL.white);
    text('LAANAPHA.COM', 166, 296, COL.yellow, 'r');
    text(`${HUNT_MINUTES} MIN STICKER HUNT`, 90, 305, COL.magenta, 'c');
  }
}

/** The card as a 1080 x 1920 PNG blob. */
export function exportCard(data, t = 0) {
  const c = mkCanvas(W, H);
  drawCard(c.getContext('2d'), data, t, { footer: true });
  const big = mkCanvas(W * 6, H * 6);
  const bx = big.getContext('2d');
  bx.imageSmoothingEnabled = false;
  bx.drawImage(c, 0, 0, big.width, big.height);
  return new Promise((res) => big.toBlob((b) => res(b), 'image/png'));
}
