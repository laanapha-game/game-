// Countdown to the hunt's opening (scene 1's 'countdown' scene). Shown instead of the hunt
// before HUNT_OPENS_AT: from the TRICK OR TREAT button, a checkpoint QR, or the end of
// scene 2. At zero it offers to start, and carries on to whatever the player came for.
import { W, H, COL, kit, ghostSprite, pumpkinSprite, moonSprite, sprite } from './brand.js';
import { HUNT_DAYS_TH, HUNT_DAYS_EN } from '../data/checkpoints.js';
import { msUntilOpen } from './clock.js';
import { bigText } from './summary.js';
import { audio } from '../audio/engine.js';

const arrowL = sprite(8, 12, (x, y) => {
  if (!(Math.abs(y - 5.5) <= 5.5 * (x / 7) + 0.3)) return null;
  return !(Math.abs(y - 5.5) <= 5.5 * ((x - 1) / 7) - 0.7) || x === 7 ? COL.black : COL.yellow;
});

export function createCountdown({ G, onOpen, onBack }) {
  const ctx = G.ctx;
  const K = kit(ctx);
  const { rect, text, textS, thai, thaiS, box, bulbPanel, bigButton, sparkle } = K;
  const canvas = ctx.canvas;
  const ghost = ghostSprite();
  const pumpkin = pumpkinSprite(true);
  const moon = moonSprite();
  let active = false;
  let pending = null;
  let hits = [];
  let pressed = null;
  let wasOpen = false;

  const BACK = { x: 3, y: 8, w: 20, h: 20 };
  const MAIN = { x: 20, y: 284, w: 140, h: 20 };
  const hit = (id, r, fn) => hits.push({ id, ...r, fn });
  const toDesign = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const find = (p) => hits.find((h) => p.x >= h.x - 3 && p.x < h.x + h.w + 3 && p.y >= h.y - 3 && p.y < h.y + h.h + 3);
  canvas.addEventListener('pointerdown', (e) => {
    if (!active) return;
    pressed = find(toDesign(e))?.id ?? null;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!active) return;
    const h = find(toDesign(e));
    const was = pressed;
    pressed = null;
    if (h && h.id === was) h.fn();
  });

  const pad = (v) => String(v).padStart(2, '0');

  const scene = {
    enter(data = {}) {
      active = true;
      pending = data.pending ?? null;
      wasOpen = msUntilOpen() === 0;
      audio.ambient('night');
      audio.mood('title');
    },
    draw(now, t) {
      hits = [];
      ctx.imageSmoothingEnabled = false;
      K.sky(t);
      // header
      rect(BACK.x - 1, BACK.y - 1, BACK.w + 2, BACK.h + 2, COL.yellow);
      rect(BACK.x, BACK.y, BACK.w, BACK.h, pressed === 'back' ? COL.yellow : COL.black);
      ctx.drawImage(arrowL, BACK.x + 6, BACK.y + 4);
      hit('back', BACK, () => {
        audio.sfx('ui_click');
        onBack?.();
      });
      bulbPanel(26, 5, 128, 26, t);
      text('TRICK OR TREAT', 90, 15, COL.yellow, 'c');
      // night scene: moon, ghost peeking from behind a pumpkin
      ctx.drawImage(moon, 140, 40);
      [[20, 46], [60, 38], [118, 58], [30, 84]].forEach((s, i) => sparkle(s[0], s[1], (Math.floor(t * 2) + i) % 2 === 0));
      const gy = 52 + Math.round(Math.sin(t * 2) * 3);
      ctx.drawImage(ghost, 80, gy);
      ctx.drawImage(pumpkin, 82, 74);
      // panel
      rect(0, 96, W, H - 96, COL.black);
      rect(0, 95, W, 1, COL.magenta);
      const left = msUntilOpen();
      if (left > 0) {
        thai('เกมล่าสติกเกอร์ผี จะเปิดให้เล่น', 90, 98, COL.white, 12);
        thaiS(HUNT_DAYS_TH, 90, 114, COL.yellow, 16);
        thai('ตั้งแต่ 12:00 น. เป็นต้นไป', 90, 136, COL.magenta, 13);
        // DD : HH : MM : SS
        const s = Math.ceil(left / 1000);
        const parts = [
          [Math.floor(s / 86400), 'วัน'],
          [Math.floor((s % 86400) / 3600), 'ชม.'],
          [Math.floor((s % 3600) / 60), 'นาที'],
          [s % 60, 'วินาที'],
        ];
        parts.forEach(([v, label], i) => {
          const x = 8 + i * 42;
          box(x, 160, 38, 42, COL.black, i === 3 && Math.floor(t * 2) % 2 ? COL.magenta : COL.yellow);
          bigText(K, pad(v), x + 19, 166, COL.yellow, 'c', 2);
          thai(label, x + 19, 182, COL.white, 12);
        });
        text(HUNT_DAYS_EN, 90, 214, COL.yellow, 'c');
        thai('ระหว่างนี้ เล่นเกมวิ่งหนีผีก่อนได้!', 90, 232, COL.white, 12);
        thai('กด "เริ่มเกม" ที่หน้าแรก', 90, 248, COL.white, 12);
        bigButton(MAIN, 'กลับหน้าแรก', pressed === 'main', t);
        hit('main', MAIN, () => {
          audio.sfx('choice_press');
          onBack?.();
        });
      } else {
        if (!wasOpen) {
          wasOpen = true;
          audio.sfx('scene3_chime');
        }
        thaiS('เปิดแล้ว!', 90, 104, COL.yellow, 18);
        thai('เกมล่าสติกเกอร์ผี', 90, 132, COL.white, 13);
        thai('เริ่มเล่นได้เลย', 90, 150, COL.white, 13);
        textS('TRICK OR TREAT!', 90, 190, COL.magenta, 'c');
        bigButton(MAIN, 'เริ่มเล่น!', pressed === 'main', t);
        hit('main', MAIN, () => {
          audio.sfx('choice_press');
          onOpen?.(pending);
        });
      }
    },
    onTap() {},
    exit() {
      active = false;
    },
  };
  return { scene };
}
