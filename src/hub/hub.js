// Scene 3: the sticker hub ("HOME" after scene 2). The player walks the event to 8 stalls,
// scans each stall's QR and collects its ghost sticker. Drawn into scene 1's own 180 x 320
// canvas (LannaphaGame.ctx) with scene 1's brand kit, registered as scene 1's 'scene3'.
//
// Screens (all inside the one canvas): the board (8 sticker slots on a winding road + the
// prize), stall details, the scanner, the new-sticker celebration, the prize / claim page,
// moving progress to another browser, and how to play. Progress is saved by store.js.
import { W, H, COL, kit, mkCanvas, sprite, ghostSprite, pumpkinSprite, moonSprite, houseImage, drawHouseWindows, silhouette, stickerize, thaiWidth } from './brand.js';
import { CHECKPOINTS, REWARD, TOTAL, SITE_URL } from '../data/checkpoints.js';
import { parseScan } from './store.js';
import { startCamera, decodeFile } from './scanner.js';
import { wrapText } from '../logic/textWrap.js';
import { audio } from '../audio/engine.js';

const ART = import.meta.glob('../assets/art/*.png', { eager: true, query: '?url', import: 'default' });
const STALL_ART = import.meta.glob('../../assets/stalls/*.png', { eager: true, query: '?url', import: 'default' });
const artUrl = (name) => ART[`../assets/art/${name}.png`];
const stallUrl = (name) => STALL_ART[`../../assets/stalls/${name}.png`];
// Design size of one frame of each sheet (src/assets/manifest.js): the sheets are drawn larger.
const SHEET_W = { krahang: 32, jar: 32, stall_ghost_3: 28, stall_ghost_4: 31, stall_ghost_5: 24, chaser: 64 };

// ---------- layout (design px) ----------
const BACK = { x: 3, y: 8, w: 20, h: 20 };
const SPEAKER = { x: 154, y: 0, w: 26, h: 18 };
const TILE = 48;
const COLS = [10, 66, 122];
const ROWS = [107, 162, 217];
const SCAN_BTN = { x: 6, y: 274, w: 168, h: 18 };
const MOVE_BTN = { x: 5, y: 301, w: 82, h: 15 };
const HELP_BTN = { x: 93, y: 301, w: 82, h: 15 };
const VIEW = { x: 30, y: 58, w: 120, h: 120 }; // scanner viewfinder
const HOLD_MS = 1500;

/** Slot i (0-7 stalls, 8 = prize) on the snake: 1 2 3 / 6 5 4 / 7 8 prize. */
function slotRect(i) {
  const r = Math.floor(i / 3);
  const c = r % 2 === 0 ? i % 3 : 2 - (i % 3);
  return { x: COLS[c], y: ROWS[r], w: TILE, h: TILE };
}

const loadImg = (url) =>
  new Promise((res) => {
    if (!url) return res(null);
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = url;
  });

function trimmed(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (d[(y * c.width + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return c;
  const o = mkCanvas(x1 - x0 + 1, y1 - y0 + 1);
  o.getContext('2d').drawImage(c, -x0, -y0);
  return o;
}

/** One frame of a sheet at design size (nearest-neighbour), trimmed. */
function frameAt(img, sheet, frames, frame, flip, maxW, maxH) {
  const fw = img.width / frames;
  const s = fw / SHEET_W[sheet]; // sheet px per design px
  let w = Math.round(fw / s);
  let h = Math.round(img.height / s);
  const c = mkCanvas(w, h);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  if (flip) {
    x.translate(w, 0);
    x.scale(-1, 1);
  }
  x.drawImage(img, fw * frame, 0, fw, img.height, 0, 0, w, h);
  let out = trimmed(c);
  if (maxW && maxH && (out.width > maxW || out.height > maxH)) {
    const k = Math.min(maxW / out.width, maxH / out.height);
    const f = mkCanvas(Math.max(1, Math.round(out.width * k)), Math.max(1, Math.round(out.height * k)));
    const fx = f.getContext('2d');
    fx.imageSmoothingEnabled = false;
    // scale down from the big sheet, not the 1x copy, so details survive
    const big = mkCanvas(Math.round(fw), img.height);
    const bx = big.getContext('2d');
    bx.imageSmoothingEnabled = false;
    if (flip) {
      bx.translate(big.width, 0);
      bx.scale(-1, 1);
    }
    bx.drawImage(img, fw * frame, 0, fw, img.height, 0, 0, big.width, big.height);
    const bt = trimmed(big);
    fx.drawImage(bt, 0, 0, f.width, f.height);
    out = f;
  }
  return out;
}

// ---------- small pixel icons ----------
const qrIcon = (() => {
  const finder = (x, y, ox, oy) => {
    const u = x - ox;
    const v = y - oy;
    if (u < 0 || v < 0 || u > 3 || v > 3) return null;
    return u === 0 || v === 0 || u === 3 || v === 3 ? true : false;
  };
  return sprite(11, 11, (x, y) => {
    for (const [ox, oy] of [[0, 0], [7, 0], [0, 7]]) {
      const f = finder(x, y, ox, oy);
      if (f !== null) return f ? COL.black : null;
    }
    if (x >= 5 && y >= 5 && (x * 3 + y * 5) % 4 < 2) return COL.black;
    if ((x === 5 && y < 4 && y % 2 === 0) || (y === 5 && x < 4 && x % 2 === 1)) return COL.black;
    return null;
  });
})();
const arrowL = (() => {
  const w = 8;
  const h = 12;
  return sprite(w, h, (x, y) => {
    const u = x;
    const inside = Math.abs(y - (h - 1) / 2) <= ((h - 1) / 2) * (u / (w - 1)) + 0.3;
    if (!inside) return null;
    const edge = !(Math.abs(y - (h - 1) / 2) <= ((h - 1) / 2) * ((u - 1) / (w - 1)) - 0.7) || x === w - 1;
    return edge ? COL.black : COL.yellow;
  });
})();
const pinIcon = sprite(7, 9, (x, y) => {
  const r = (x - 3) ** 2 + (y - 3) ** 2;
  if (y <= 5 && r <= 10) return r <= 1.5 ? COL.black : COL.magenta;
  if (y >= 6 && Math.abs(x - 3) <= 8 - y) return COL.magenta;
  return null;
});
const checkIcon = (() => {
  const px = [[1, 3], [2, 4], [3, 5], [4, 4], [5, 3], [6, 2], [7, 1], [1, 4], [2, 5], [3, 6], [4, 5], [5, 4], [6, 3], [7, 2]];
  return sprite(9, 8, (x, y) => (px.some((p) => p[0] === x && p[1] === y) ? COL.black : null));
})();
const miniPumpkin = (lit) =>
  sprite(11, 10, (x, y) => {
    if (x === 5 && y === 0) return COL.green;
    const r = ((x - 5) / 5.4) ** 2 + ((y - 5.6) / 4.4) ** 2;
    if (r > 1) return null;
    if (r > 0.62) return COL.black;
    if (lit && ((y === 4 && (x === 3 || x === 7)) || (y === 7 && x >= 3 && x <= 7))) return COL.black;
    return lit ? COL.yellow : COL.ddred;
  });

// Rotating light rays for the celebration (pre-drawn so they stay crisp pixels).
const RAY_N = 6;
const rays = Array.from({ length: RAY_N }, (_, k) =>
  sprite(140, 140, (x, y) => {
    const dx = x - 69.5;
    const dy = y - 69.5;
    const r = Math.hypot(dx, dy);
    if (r > 69 || r < 6) return null;
    const a = (Math.atan2(dy, dx) / (2 * Math.PI) + 1 + k / (RAY_N * 12)) % 1;
    const band = Math.floor(a * 12) % 2;
    if (!band) return null;
    return r > 60 ? ((x + y) & 1 ? COL.magenta : null) : (x + y) & 1 || r < 40 ? COL.magenta : null;
  }),
);

export function createHub({ G, store, onEnter, onExit, onBack }) {
  const ctx = G.ctx;
  const K = kit(ctx);
  const { rect, text, textS, thai, thaiS, box, bulbPanel, bigButton, smallButton, sparkle } = K;
  const canvas = ctx.canvas;
  const house = houseImage();
  const moon = moonSprite();
  const ghostBig = ghostSprite();
  const pumpkinLit = pumpkinSprite(true);
  const pumpkinDark = pumpkinSprite(false);
  const pipOn = miniPumpkin(true);
  const pipOff = miniPumpkin(false);

  // ---- art per checkpoint (filled in when the images load) ----
  const art = {}; // id -> { big, sticker, locked, stall }
  let artReady = false;
  async function prepareArt() {
    const stalls = {};
    for (const k of ['A', 'B', 'C']) stalls[k] = await loadImg(stallUrl('stall_' + k));
    for (const cp of CHECKPOINTS) {
      let big = null;
      const a = cp.art;
      if (a.sheet) {
        const img = await loadImg(artUrl(a.sheet));
        if (img) big = frameAt(img, a.sheet, a.frames, a.frame, a.flip, 70, 64);
      } else if (a.code === 'screenGhost') {
        big = screenGhost();
      } else if (a.code === 'mascot') {
        big = trimmed(G.getSprite('nuannapa', 'front', 'idle0'));
      }
      if (!big) big = trimmed(ghostBig);
      // tile sticker: fit 34 x 34 (inside the 48 px slot, with the white die-cut rim)
      let small = big;
      if (big.width > 34 || big.height > 34) {
        if (a.sheet) {
          const img = await loadImg(artUrl(a.sheet));
          small = frameAt(img, a.sheet, a.frames, a.frame, a.flip, 34, 34);
        } else {
          const k = Math.min(34 / big.width, 34 / big.height);
          small = mkCanvas(Math.round(big.width * k), Math.round(big.height * k));
          const sx = small.getContext('2d');
          sx.imageSmoothingEnabled = false;
          sx.drawImage(big, 0, 0, small.width, small.height);
        }
      }
      art[cp.id] = {
        big,
        bigLocked: silhouette(big, COL.black),
        sticker: stickerize(small, 2),
        locked: silhouette(small, COL.black),
        stall: cp.stall ? stalls[cp.stall] : null,
      };
    }
    artReady = true;
  }
  function screenGhost() {
    const c = mkCanvas(36, 30);
    const x = c.getContext('2d');
    x.fillStyle = COL.yellow;
    x.fillRect(0, 0, 36, 30);
    x.fillStyle = COL.black;
    x.fillRect(1, 1, 34, 28);
    x.fillStyle = COL.white;
    for (let i = 3; i < 33; i += 6) {
      x.fillRect(i, 2, 3, 2);
      x.fillRect(i, 26, 3, 2);
    }
    x.fillStyle = COL.yellow;
    x.fillRect(2, 5, 32, 20);
    x.fillStyle = COL.olive;
    for (let y = 7; y < 25; y += 4) x.fillRect(2, y, 32, 1);
    x.drawImage(ghostBig, 8, 2);
    return c;
  }

  // ---- DOM helpers for the camera and typed codes (sit over scene 1's canvas) ----
  canvas.style.position = 'relative';
  canvas.style.zIndex = '2';
  const video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-label', 'กล้องสำหรับสแกน QR');
  Object.assign(video.style, { position: 'fixed', zIndex: '1', objectFit: 'cover', display: 'none', background: '#000' });
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.setAttribute('capture', 'environment');
  fileInput.hidden = true;
  const input = document.createElement('input');
  input.type = 'text';
  input.autocapitalize = 'characters';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'รหัสซุ้ม');
  Object.assign(input.style, {
    position: 'fixed', zIndex: '3', display: 'none', boxSizing: 'border-box', background: '#000', color: COL.yellow,
    border: '0', outline: 'none', textAlign: 'center', fontFamily: '"Kanit",monospace', letterSpacing: '0.1em', padding: '0', borderRadius: '0',
  });
  document.body.append(video, fileInput, input);

  const place = (el, r) => {
    const b = canvas.getBoundingClientRect();
    const s = b.width / W;
    Object.assign(el.style, { left: b.left + r.x * s + 'px', top: b.top + r.y * s + 'px', width: r.w * s + 'px', height: r.h * s + 'px' });
    return s;
  };

  // ---- state ----
  let active = false;
  let modal = null; // { type, ...data, t0 }
  let toast = null;
  let msg = null; // temporary speech bubble { lines, until }
  let pop = null; // { id, t0 } a sticker just stuck on the board
  let hop = -1e9;
  let camera = null;
  let camStatus = 'idle'; // idle | starting | live | denied | unsupported | nocamera | failed
  let scanLock = false;
  let hits = [];
  let pressed = null;
  let holdStart = 0;

  const character = () => store.state.character?.id || G.selected?.()?.id || 'nuannapa';
  const open = (type, data = {}) => {
    modal = { type, ...data, t0: performance.now() };
    pressed = null;
  };
  const close = () => {
    if (modal?.type === 'scan') stopScan();
    if (modal?.type === 'code') input.style.display = 'none';
    modal = null;
    pressed = null;
  };
  const say = (lines, ms = 3200) => (msg = { lines, until: performance.now() + ms });
  const showToast = (s, ms = 1800) => (toast = { s, until: performance.now() + ms });
  const click = () => audio.sfx('ui_click');
  const buzz = (pattern) => {
    if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(pattern);
  };

  function hit(id, r, fn, pad = 2) {
    hits.push({ id, x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2, fn });
  }

  // ---- scanning ----
  async function startScan() {
    open('scan');
    camStatus = 'starting';
    scanLock = false;
    try {
      camera = await startCamera(video, onScanText);
      if (modal?.type !== 'scan') return stopScan();
      camStatus = 'live';
    } catch (e) {
      camStatus = e.code || 'failed';
    }
  }
  function stopScan() {
    camera?.stop();
    camera = null;
    camStatus = 'idle';
    video.style.display = 'none';
  }
  function onScanText(text) {
    if (scanLock) return;
    const id = parseScan(text);
    if (!id) {
      if (!modal?.badUntil || performance.now() > modal.badUntil) {
        audio.sfx('ui_off');
        if (modal) modal.badUntil = performance.now() + 2200;
      }
      return;
    }
    scanLock = true;
    collect(id);
  }
  function collect(id, viaLink = false) {
    const cp = CHECKPOINTS.find((c) => c.id === id);
    const r = store.collect(id);
    if (modal) close();
    buzz(r === 'new' ? [40, 60, 90] : 30);
    if (r === 'new') {
      audio.sfx('scene3_chime');
      setTimeout(() => audio.sfx('letter_chime'), 260);
      open('collect', { id, viaLink });
    } else {
      audio.sfx('ui_on');
      open('detail', { id });
      showToast('ซุ้มนี้เก็บแล้วนะ', 2000);
    }
    return cp;
  }
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    fileInput.value = '';
    if (!f) return;
    showToast('กำลังอ่าน QR...', 1200);
    let text = null;
    try {
      text = await decodeFile(f);
    } catch {
      text = null;
    }
    const id = parseScan(text);
    if (id) collect(id);
    else {
      audio.sfx('ui_off');
      showToast(text ? 'QR นี้ไม่ใช่ของลานนภา' : 'หา QR ในรูปไม่เจอ', 2400);
    }
  });
  function submitCode() {
    const v = input.value.trim();
    if (!v) return;
    if (modal.mode === 'save') {
      if (store.importCode(v)) {
        close();
        audio.sfx('letter_chime');
        showToast('ย้ายข้อมูลเรียบร้อย', 2200);
      } else showToast('โค้ดไม่ถูกต้อง', 2000);
      return;
    }
    const id = parseScan(v);
    if (id) collect(id);
    else {
      audio.sfx('ui_off');
      showToast('รหัสไม่ถูกต้อง', 2000);
    }
  }
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitCode();
  });

  async function shareProgress() {
    const code = store.exportCode();
    const url = `${SITE_URL}/?save=${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ลานนภา สติกเกอร์ผี', text: `โค้ดย้ายสติกเกอร์ของฉัน ${code}`, url });
        return;
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('คัดลอกลิงก์แล้ว', 2000);
    } catch {
      showToast(code, 4000);
    }
  }

  // ---- input ----
  const toDesign = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const find = (p) => {
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i];
      if (p.x >= h.x && p.x < h.x + h.w && p.y >= h.y && p.y < h.y + h.h) return h;
    }
    return null;
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (!active) return;
    audio.unlock();
    const h = find(toDesign(e));
    pressed = h ? h.id : null;
    holdStart = performance.now();
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!active) return;
    const h = find(toDesign(e));
    const was = pressed;
    pressed = null;
    if (h && h.id === was && h.id !== 'claim') h.fn();
  });
  canvas.addEventListener('pointercancel', () => (pressed = null));
  window.addEventListener('resize', () => {
    if (modal?.type === 'code') place(input, modal.field);
  });

  // ---- drawing: the board ----
  function bubbleLines() {
    const now = performance.now();
    if (msg && now < msg.until) return msg.lines;
    const n = store.count();
    if (store.state.claimedAt) return ['รับรางวัลแล้ว', 'ขอบคุณที่มาลานนภานะ!'];
    if (n === TOTAL) return ['ครบ 8 ดวงแล้ว!', 'ไปรับรางวัลกันเลย'];
    if (n === 0) return ['เดินตามทางไปหาซุ้มผี', 'สแกน QR ให้ครบ 8 ดวง!'];
    return [n >= 5 ? 'ใกล้ครบแล้ว!' : 'เก่งมาก!', `อีก ${TOTAL - n} ดวงก็ครบ`];
  }

  function drawHeader(t) {
    const pb = pressed === 'back';
    rect(BACK.x - 1, BACK.y - 1, BACK.w + 2, BACK.h + 2, COL.yellow);
    rect(BACK.x, BACK.y, BACK.w, BACK.h, pb ? COL.yellow : COL.black);
    ctx.drawImage(arrowL, BACK.x + 6, BACK.y + 4);
    bulbPanel(26, 5, 128, 26, t);
    thai('สะสมสติกเกอร์ผี', 90, 7, COL.yellow, 13);
    K.speaker(audio.sound);
  }

  function drawHero(now, t) {
    // night sky bits behind the player
    ctx.drawImage(moon, 2, 34);
    [[44, 40, 0], [12, 92, 1]].forEach((s, i) => sparkle(s[0], s[1], (Math.floor(t * 2 + i) % 2 === 0) === !s[2]));
    // pedestal + character (scene 1's select style, 1x)
    const cx = 28;
    rect(cx - 16, 92, 32, 3, COL.black);
    rect(cx - 13, 91, 26, 1, COL.yellow);
    const hp = (now - hop) / 450;
    const hy = hp >= 0 && hp < 1 ? -Math.round(Math.sin(hp * Math.PI) * 10) : 0;
    const blink = t % 3.4 > 3.25 ? 'blink' : Math.floor(t * 2.2) % 2 ? 'idle1' : 'idle0';
    G.drawChar(character(), 'front', blink, cx, 91, 1, hy);
    hit('hero', { x: cx - 16, y: 54, w: 32, h: 40 }, () => {
      hop = performance.now();
      audio.sfx('ui_on');
    });
    // speech bubble
    box(52, 36, 125, 41);
    rect(49, 64, 3, 3, COL.yellow);
    rect(50, 65, 2, 1, COL.black);
    const [a, b] = bubbleLines();
    thai(a, 114, 34, COL.yellow, 12);
    thai(b, 114, 51, COL.white, 12);
    // progress pips
    const n = store.count();
    CHECKPOINTS.forEach((cp, i) => ctx.drawImage(store.has(cp.id) ? pipOn : pipOff, 54 + i * 12, 82));
    textS(`${n}/${TOTAL}`, 176, 84, n === TOTAL ? COL.yellow : COL.white, 'r');
  }

  function nextIndex() {
    return CHECKPOINTS.findIndex((cp) => !store.has(cp.id));
  }

  function drawRoad(t) {
    const centers = Array.from({ length: 9 }, (_, i) => {
      const r = slotRect(i);
      return { x: r.x + TILE / 2, y: r.y + TILE / 2 };
    });
    for (let i = 0; i < 8; i++) {
      const a = centers[i];
      const b = centers[i + 1];
      const x0 = Math.min(a.x, b.x);
      const y0 = Math.min(a.y, b.y);
      const horiz = a.y === b.y;
      if (horiz) {
        rect(x0, a.y - 5, Math.abs(b.x - a.x), 10, COL.dred);
        rect(x0, a.y - 4, Math.abs(b.x - a.x), 8, COL.ddred);
      } else {
        rect(a.x - 5, y0, 10, Math.abs(b.y - a.y), COL.dred);
        rect(a.x - 4, y0, 8, Math.abs(b.y - a.y), COL.ddred);
      }
      // dashes march toward the prize ("walk this way")
      const done = i < 8 && store.has(CHECKPOINTS[i].id);
      ctx.fillStyle = done ? COL.yellow : COL.dred;
      const len = horiz ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y);
      const dir = horiz ? Math.sign(b.x - a.x) : Math.sign(b.y - a.y);
      const off = Math.floor(t * 12) % 6;
      for (let d = off; d < len; d += 6) {
        const p = dir > 0 ? d : len - d;
        if (horiz) ctx.fillRect(x0 + p, a.y, 3, 1);
        else ctx.fillRect(a.x, y0 + p, 1, 3);
      }
    }
  }

  function drawSlot(i, now, t) {
    const r = slotRect(i);
    const cp = CHECKPOINTS[i];
    const got = store.has(cp.id);
    const a = art[cp.id];
    const p = pressed === 'slot' + i ? 1 : 0;
    const isNext = i === nextIndex();
    let dy = p;
    if (pop && pop.id === cp.id) {
      const k = (now - pop.t0) / 700;
      if (k < 1) dy -= Math.round(Math.sin(k * Math.PI) * 6);
      else pop = null;
    }
    const x = r.x;
    const y = r.y + dy;
    if (got) {
      // awning stripes on top, then the stall colour (yellow / magenta like scene 1's stalls)
      const main = i % 2 ? COL.magenta : COL.yellow;
      const acc = i % 2 ? COL.yellow : COL.magenta;
      rect(x, y, TILE, TILE, COL.black);
      rect(x + 1, y + 1, TILE - 2, TILE - 2, main);
      for (let sx = 0; sx < TILE - 2; sx++) {
        ctx.fillStyle = Math.floor(sx / 4) % 2 ? acc : main;
        ctx.fillRect(x + 1 + sx, y + 1, 1, 6);
        if (sx % 4 === 1) ctx.fillRect(x + 1 + sx, y + 7, 1, 1);
      }
      ctx.fillStyle = i % 2 ? COL.dmagenta : COL.olive;
      for (let yy = y + 10; yy < y + TILE - 2; yy += 3) for (let xx = x + 2 + ((yy / 3) % 2 ? 1 : 0); xx < x + TILE - 2; xx += 4) ctx.fillRect(xx, yy, 1, 1);
      if (a) {
        const s = a.sticker;
        ctx.drawImage(s, x + Math.round((TILE - s.width) / 2), y + 7 + Math.round((TILE - 7 - s.height) / 2));
      }
      if (pop && pop.id === cp.id && Math.floor((now - pop.t0) / 90) % 2 === 0) {
        sparkle(x + 4, y + 10, true);
        sparkle(x + TILE - 5, y + 14, true);
        sparkle(x + TILE - 8, y + TILE - 6, false);
      }
    } else {
      rect(x, y, TILE, TILE, isNext && Math.floor(t * 3) % 2 ? COL.yellow : COL.dred);
      rect(x + 1, y + 1, TILE - 2, TILE - 2, COL.black);
      // dashed inner outline = an empty sticker spot
      ctx.fillStyle = COL.ddred;
      for (let k = 0; k < TILE - 8; k += 4) {
        ctx.fillRect(x + 4 + k, y + 4, 2, 1);
        ctx.fillRect(x + 4 + k, y + TILE - 5, 2, 1);
        ctx.fillRect(x + 4, y + 4 + k, 1, 2);
        ctx.fillRect(x + TILE - 5, y + 4 + k, 1, 2);
      }
      if (a) {
        const s = a.locked;
        ctx.globalAlpha = 0.9;
        const sx = x + Math.round((TILE - s.width) / 2);
        const sy = y + Math.round((TILE - s.height) / 2) + 2;
        ctx.drawImage(silhouette(s, COL.ddred), sx, sy);
        ctx.globalAlpha = 1;
      }
      textS('?', x + TILE / 2 + 1, y + TILE / 2 - 2, isNext ? COL.yellow : COL.dred, 'c');
    }
    // number badge
    rect(x - 1, y - 1, 11, 11, COL.black);
    rect(x, y, 9, 9, got ? COL.black : COL.dred);
    text(String(i + 1), x + 2, y + 1, got ? COL.yellow : COL.black);
    if (got) {
      rect(x + TILE - 10, y + TILE - 10, 10, 10, COL.black);
      rect(x + TILE - 9, y + TILE - 9, 8, 8, COL.green);
      ctx.drawImage(checkIcon, x + TILE - 9, y + TILE - 9);
    }
    hit('slot' + i, r, () => {
      click();
      open('detail', { id: cp.id });
    }, 1);
  }

  function drawPrize(now, t) {
    const r = slotRect(8);
    const done = store.complete();
    const claimed = !!store.state.claimedAt;
    const p = pressed === 'prize' ? 1 : 0;
    const x = r.x;
    const y = r.y + p;
    rect(x, y, TILE, TILE, done && Math.floor(t * 3) % 2 ? COL.yellow : done ? COL.magenta : COL.dred);
    rect(x + 1, y + 1, TILE - 2, TILE - 2, COL.black);
    if (done) {
      for (let k = 0; k < 4; k++) sparkle(x + 6 + ((k * 13 + Math.floor(t * 4) * 7) % 40), y + 6 + ((k * 7) % 12), (Math.floor(t * 4) + k) % 2 === 0);
    }
    const pk = done ? pumpkinLit : pumpkinDark;
    const bob = done ? (Math.sin(t * 5) > 0 ? -1 : 0) : 0;
    ctx.drawImage(pk, x + 18, y + 12 + bob);
    // basket handle
    ctx.fillStyle = done ? COL.yellow : COL.dred;
    for (let k = 0; k <= 12; k++) ctx.fillRect(x + 20 + k, y + 12 + bob - Math.round(Math.sin((k / 12) * Math.PI) * 6), 1, 1);
    thai(claimed ? 'รับแล้ว' : 'รางวัล', x + TILE / 2, y + 27, done ? COL.yellow : COL.dred, 12);
    hit('prize', r, () => {
      click();
      open('reward');
    }, 1);
  }

  function drawBoard(now, t) {
    K.sky(t, 100);
    drawHeader(t);
    hit('back', BACK, () => {
      click();
      onBack?.();
    });
    hit('speaker', SPEAKER, () => {
      audio.setSound(!audio.sound);
      if (audio.sound) audio.sfx('ui_on');
      showToast(audio.sound ? 'SOUND ON' : 'SOUND OFF', 900);
    }, 0);
    drawHero(now, t);
    rect(0, 100, W, H - 100, COL.black);
    rect(0, 99, W, 1, COL.magenta);
    if (!artReady) {
      thai('กำลังโหลด...', 90, 170, COL.yellow, 13);
    } else {
      drawRoad(t);
      for (let i = 0; i < 8; i++) drawSlot(i, now, t);
      drawPrize(now, t);
    }
    bigButton(SCAN_BTN, 'สแกน QR', pressed === 'scan', t, qrIcon);
    hit('scan', SCAN_BTN, () => {
      audio.sfx('choice_press');
      startScan();
    });
    smallButton(MOVE_BTN, 'ย้ายเครื่อง', pressed === 'move', { px: 12 });
    hit('move', MOVE_BTN, () => {
      click();
      open('transfer');
    });
    smallButton(HELP_BTN, 'วิธีเล่น', pressed === 'help', { px: 12 });
    hit('help', HELP_BTN, () => {
      click();
      open('help');
    });
  }

  // ---- drawing: overlays ----
  function dim(a = 0.8) {
    ctx.globalAlpha = a;
    rect(0, 0, W, H, COL.black);
    ctx.globalAlpha = 1;
  }
  function para(s, x, y, maxW, color, px = 12, lh = 15, align = 'l') {
    const lines = wrapText(s, maxW, (str) => thaiWidth(str, px));
    lines.forEach((ln, i) => thai(ln, align === 'c' ? x + maxW / 2 : x, y + i * lh, color, px, align));
    return lines.length * lh;
  }
  function closeButton(r, label = 'ปิด') {
    smallButton(r, label, pressed === 'close', { px: 12 });
    hit('close', r, () => {
      click();
      close();
    });
  }

  function diorama(cp, x, y, w, h, got, t) {
    const a = art[cp.id];
    rect(x, y, w, h, COL.yellow);
    rect(x + 1, y + 1, w - 2, h - 2, COL.ddred);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 1, y + 1, w - 2, h - 2);
    ctx.clip();
    // stripes + stars
    for (let yy = y + 1; yy < y + h - 12; yy++) if (Math.floor((yy - y + Math.round(Math.sin(t * 1.4) * 2) + 200) / 11) % 2) rect(x + 1, yy, w - 2, 1, COL.dred);
    [[12, 8], [w - 20, 12], [w / 2, 6]].forEach((s, i) => sparkle(x + s[0], y + s[1], (Math.floor(t * 2) + i) % 2 === 0));
    const gy = y + h - 12;
    rect(x + 1, gy, w - 2, 12, COL.black);
    rect(x + 1, gy, w - 2, 1, COL.dred);
    if (a) {
      const stall = a.stall;
      const fig = got ? a.big : a.bigLocked;
      const bob = cp.art.sheet === 'chaser' ? Math.round(Math.sin(t * 2) * 2) - 6 : 0;
      if (stall) {
        const sx = x + 10;
        if (got) ctx.drawImage(stall, sx, gy - 64 + 2);
        else ctx.drawImage(silhouette(stall, COL.black), sx, gy - 64 + 2);
        ctx.drawImage(fig, x + w - 12 - fig.width, gy - fig.height + 2 + bob);
      } else {
        ctx.drawImage(fig, x + Math.round((w - fig.width) / 2), gy - fig.height + 2 + bob);
      }
      if (!got) textS('?', x + w - 12 - Math.round((a.big.width) / 2), gy - a.big.height - 9, COL.yellow, 'c');
    }
    ctx.restore();
  }

  function drawDetail(now, t) {
    const cp = CHECKPOINTS.find((c) => c.id === modal.id);
    const i = CHECKPOINTS.indexOf(cp);
    const got = store.has(cp.id);
    dim();
    bulbPanel(6, 14, 168, 292, t);
    rect(14, 23, 36, 12, got ? COL.magenta : COL.dred);
    text(`NO.${i + 1}`, 32, 26, COL.black, 'c');
    thai(got ? 'เก็บแล้ว' : 'ยังไม่เจอ', 166, 19, got ? COL.green : COL.magenta, 12, 'r');
    thaiS(cp.name, 90, 36, COL.yellow, 13);
    thai(cp.title, 90, 52, COL.white, 12);
    diorama(cp, 14, 72, 152, 76, got, t);
    let y = 153;
    if (got) {
      const d = new Date(store.state.stamps[cp.id]);
      const pad = (v) => String(v).padStart(2, '0');
      box(14, y, 152, 18, COL.black, COL.green);
      ctx.drawImage(checkIcon, 20, y + 5);
      thai(`เก็บเมื่อ ${d.getDate()}/${d.getMonth() + 1} · ${pad(d.getHours())}:${pad(d.getMinutes())} น.`, 94, y - 2, COL.green, 12);
    } else {
      box(14, y, 152, 18, COL.black, COL.magenta);
      thai('หาซุ้มนี้ แล้วสแกน QR', 90, y - 2, COL.magenta, 12);
    }
    y += 24;
    y += para(cp.desc, 16, y, 148, COL.white, 12, 14) + 4;
    ctx.drawImage(pinIcon, 16, y + 4);
    para(cp.where, 26, y, 138, COL.yellow, 12, 14);
    if (got) closeButton({ x: 50, y: 282, w: 80, h: 15 });
    else {
      bigButton({ x: 18, y: 260, w: 144, h: 16 }, 'สแกน QR', pressed === 'dscan', t, qrIcon);
      hit('dscan', { x: 18, y: 260, w: 144, h: 16 }, () => {
        audio.sfx('choice_press');
        close();
        startScan();
      });
      closeButton({ x: 50, y: 286, w: 80, h: 13 });
    }
  }

  function drawCollect(now, t) {
    const cp = CHECKPOINTS.find((c) => c.id === modal.id);
    const a = art[cp.id];
    const k = (now - modal.t0) / 1000;
    dim(0.88);
    if (k < 0.18) {
      ctx.globalAlpha = 1 - k / 0.18;
      rect(0, 0, W, H, COL.white);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(rays[Math.floor(t * 8) % RAY_N], 20, 52);
    thaiS('ได้สติกเกอร์ใหม่!', 90, 18, COL.yellow, 16);
    // sticker 2x, drops in with a bounce
    if (a) {
      const s = a.sticker;
      const drop = k < 0.45 ? Math.round((1 - k / 0.45) ** 2 * -80) : k < 0.6 ? -Math.round(Math.sin(((k - 0.45) / 0.15) * Math.PI) * 6) : 0;
      const sw = s.width * 2;
      const sh = s.height * 2;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(s, Math.round(90 - sw / 2), Math.round(122 - sh / 2) + drop, sw, sh);
      if (k > 0.5) [[44, 70], [136, 84], [52, 160], [130, 150]].forEach((p, i) => sparkle(p[0], p[1], (Math.floor(t * 5) + i) % 2 === 0));
    }
    box(12, 196, 156, 20);
    thai(`ซุ้มที่ ${CHECKPOINTS.indexOf(cp) + 1} · ${cp.name}`, 90, 195, COL.yellow, 12);
    if (k > 0.5) para(`"${cp.line}"`, 12, 220, 156, COL.white, 12, 14, 'c');
    const n = store.count();
    CHECKPOINTS.forEach((c, i) => ctx.drawImage(store.has(c.id) ? pipOn : pipOff, 30 + i * 15, 254));
    if (k > 0.6) {
      bigButton({ x: 24, y: 282, w: 132, h: 18 }, n === TOTAL ? 'ไปรับรางวัล' : 'เก็บเข้าสมุด', pressed === 'keep', t);
      hit('keep', { x: 24, y: 282, w: 132, h: 18 }, () => {
        audio.sfx('choice_press');
        const id = cp.id;
        close();
        pop = { id, t0: performance.now() };
        const left = TOTAL - store.count();
        if (left === 0) setTimeout(() => open('reward'), 650);
        else say(['เก่งมาก!', `อีก ${left} ดวงก็ครบ`], 3500);
      });
    }
  }

  function drawReward(now, t) {
    const done = store.complete();
    const claimed = store.state.claimedAt;
    dim(0.85);
    bulbPanel(6, 14, 168, 292, t);
    if (!done) {
      thaiS('ของรางวัลรออยู่!', 90, 24, COL.yellow, 13);
      ctx.drawImage(pumpkinDark, 82, 58);
      const n = store.count();
      thai(`เก็บแล้ว ${n} จาก ${TOTAL} ดวง`, 90, 82, COL.white, 12);
      CHECKPOINTS.forEach((c, i) => ctx.drawImage(store.has(c.id) ? pipOn : pipOff, 30 + i * 15, 104));
      para(`เก็บสติกเกอร์ให้ครบ ${TOTAL} ดวง แล้วนำหน้านี้ไปรับ${REWARD.title}ที่${REWARD.where}`, 18, 126, 144, COL.white, 12, 15, 'c');
      closeButton({ x: 50, y: 282, w: 80, h: 15 });
      return;
    }
    thaiS(claimed ? 'รับรางวัลแล้ว' : `ครบ ${TOTAL} ดวงแล้ว!`, 90, 20, COL.yellow, 16);
    // the haunted house, lit, with the player dancing in front
    if (house.complete && house.naturalWidth) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(14, 48, 152, 74);
      ctx.clip();
      for (let yy = 48; yy < 122; yy++) rect(14, yy, 152, 1, Math.floor((yy + 400 + Math.round(Math.sin(t) * 2)) / 11) % 2 ? COL.dred : COL.orange);
      ctx.drawImage(house, 28, 56);
      drawHouseWindows(ctx, 28, 56, t, true);
      rect(14, 114, 152, 8, COL.black);
      ctx.restore();
    }
    const hy = Math.sin(t * 8) > 0 ? -2 : 0;
    G.drawChar(character(), 'side', G.walkFrame(t), 60, 120 + hy, 1, 0);
    ctx.drawImage(pumpkinLit, 100, 106);
    box(14, 128, 152, 1, COL.yellow);
    thai(REWARD.title, 90, 130, COL.yellow, 13);
    const ww = thaiWidth(REWARD.where, 12) + 10;
    ctx.drawImage(pinIcon, Math.round(90 - ww / 2), 152);
    thai(REWARD.where, Math.round(90 - ww / 2) + 10, 148, COL.white, 12, 'l');
    // live clock: a screenshot will not tick
    const d = new Date();
    const pad = (v) => String(v).padStart(2, '0');
    box(14, 172, 152, 26, COL.black, Math.floor(t * 2) % 2 ? COL.magenta : COL.yellow);
    textS(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, 90, 176, COL.white, 'c');
    text(`STICKERS ${TOTAL}/${TOTAL}  ${store.exportCode()}`, 90, 187, COL.yellow, 'c');
    if (claimed) {
      const c = new Date(claimed);
      // a stamp across the bottom
      rect(20, 212, 140, 40, COL.magenta);
      rect(22, 214, 136, 36, COL.black);
      rect(24, 216, 132, 32, COL.magenta);
      thai('รับรางวัลแล้ว', 90, 214, COL.black, 16);
      text(`${pad(c.getDate())}/${pad(c.getMonth() + 1)} ${pad(c.getHours())}:${pad(c.getMinutes())}`, 90, 238, COL.black, 'c');
      closeButton({ x: 50, y: 282, w: 80, h: 15 });
      return;
    }
    para(REWARD.howTo, 14, 202, 152, COL.white, 12, 14, 'c');
    // staff: press and hold to confirm the hand-over
    const HB = { x: 18, y: 248, w: 144, h: 22 };
    const holding = pressed === 'claim';
    const k = holding ? Math.min(1, (now - holdStart) / HOLD_MS) : 0;
    rect(HB.x - 2, HB.y - 2, HB.w + 4, HB.h + 4, COL.yellow);
    rect(HB.x, HB.y, HB.w, HB.h, COL.black);
    rect(HB.x, HB.y, Math.round(HB.w * k), HB.h, COL.green);
    thai(holding ? 'กดค้างไว้...' : 'สตาฟ: กดค้างเพื่อยืนยัน', 90, HB.y, holding ? COL.black : COL.yellow, 13);
    hit('claim', HB, () => {});
    if (holding && k >= 1) {
      pressed = null;
      if (store.claim()) {
        audio.sfx('meter_full');
        setTimeout(() => audio.sfx('scene3_chime'), 200);
        buzz([60, 40, 120]);
      }
    }
    closeButton({ x: 50, y: 284, w: 80, h: 14 });
  }

  function drawScan(now, t) {
    rect(0, 0, W, H, COL.black);
    bulbPanel(26, 5, 128, 26, t);
    thai('สแกน QR ของซุ้ม', 90, 7, COL.yellow, 13);
    // viewfinder: transparent hole so the camera <video> under the canvas shows through
    const v = VIEW;
    rect(v.x - 3, v.y - 3, v.w + 6, v.h + 6, COL.yellow);
    if (camStatus === 'live') {
      const s = place(video, v);
      video.style.display = 'block';
      void s;
      ctx.clearRect(v.x, v.y, v.w, v.h);
      // brackets + moving scan line drawn over the video
      const L = 14;
      ctx.fillStyle = COL.magenta;
      [[v.x + 6, v.y + 6, 1, 1], [v.x + v.w - 7, v.y + 6, -1, 1], [v.x + 6, v.y + v.h - 7, 1, -1], [v.x + v.w - 7, v.y + v.h - 7, -1, -1]].forEach(([x, y, sx, sy]) => {
        ctx.fillRect(sx > 0 ? x : x - L + 1, y, L, 2 * sy > 0 ? 2 : 2);
        ctx.fillRect(x, sy > 0 ? y : y - L + 1, 2, L);
      });
      const ly = v.y + 8 + Math.round(((Math.sin(t * 2.4) + 1) / 2) * (v.h - 16));
      rect(v.x + 8, ly, v.w - 16, 1, COL.magenta);
    } else {
      video.style.display = 'none';
      rect(v.x, v.y, v.w, v.h, COL.ddred);
      const gy = v.y + 22 + Math.round(Math.sin(t * 2) * 3);
      ctx.drawImage(ghostBig, v.x + v.w / 2 - 10, gy);
      const lines = {
        starting: ['กำลังเปิดกล้อง...', 'กด "อนุญาต" ให้ใช้กล้องนะ'],
        denied: ['ไม่ได้รับอนุญาตใช้กล้อง', 'ลองถ่ายรูป QR หรือพิมพ์รหัส'],
        unsupported: ['เบราว์เซอร์นี้เปิดกล้องไม่ได้', 'ลองถ่ายรูป QR แทน'],
        nocamera: ['ไม่เจอกล้องในเครื่องนี้', 'ลองพิมพ์รหัสใต้ QR'],
        failed: ['เปิดกล้องไม่สำเร็จ', 'ลองถ่ายรูป QR หรือพิมพ์รหัส'],
        idle: ['', ''],
      }[camStatus] || ['', ''];
      thai(lines[0], 90, v.y + 58, COL.yellow, 12);
      thai(lines[1], 90, v.y + 76, COL.white, 12);
    }
    const bad = modal.badUntil && now < modal.badUntil;
    thai(bad ? 'QR นี้ไม่ใช่ของลานนภา' : 'เล็งกล้องไปที่ป้าย QR ของซุ้ม', 90, 184, bad ? COL.magenta : COL.white, 12);
    const P = { x: 10, y: 214, w: 76, h: 18 };
    const T = { x: 94, y: 214, w: 76, h: 18 };
    smallButton(P, 'ถ่ายรูป QR', pressed === 'photo', { px: 12 });
    hit('photo', P, () => {
      click();
      fileInput.click();
    });
    smallButton(T, 'พิมพ์รหัส', pressed === 'type', { px: 12 });
    hit('type', T, () => {
      click();
      stopScan();
      openCode('cp');
    });
    thai('รหัสพิมพ์อยู่ใต้ QR ของซุ้ม', 90, 238, COL.dred, 12);
    closeButton({ x: 40, y: 282, w: 100, h: 18 }, 'ยกเลิก');
  }

  function openCode(mode) {
    const field = { x: 20, y: 132, w: 140, h: 22 };
    open('code', { mode, field });
    input.value = '';
    input.placeholder = mode === 'save' ? 'LNP-XXXXX' : 'LNP-XXXXXX';
    input.style.display = 'block';
    const s = place(input, field);
    input.style.fontSize = Math.round(11 * s) + 'px';
    setTimeout(() => input.focus(), 50);
  }

  function drawCode(now, t) {
    dim(0.85);
    bulbPanel(10, 80, 160, 148, t);
    thaiS(modal.mode === 'save' ? 'กรอกโค้ดย้ายเครื่อง' : 'พิมพ์รหัสซุ้ม', 90, 90, COL.yellow, 13);
    thai(modal.mode === 'save' ? 'โค้ดจากเครื่องเดิม' : 'ดูรหัสใต้ QR ของซุ้ม', 90, 108, COL.white, 12);
    const f = modal.field;
    rect(f.x - 2, f.y - 2, f.w + 4, f.h + 4, COL.yellow);
    rect(f.x, f.y, f.w, f.h, COL.black);
    place(input, f);
    const OK = { x: 22, y: 168, w: 136, h: 18 };
    bigButton(OK, 'ตกลง', pressed === 'ok', t);
    hit('ok', OK, () => {
      audio.sfx('choice_press');
      submitCode();
    });
    closeButton({ x: 50, y: 200, w: 80, h: 14 }, 'ยกเลิก');
  }

  function drawTransfer(now, t) {
    dim(0.85);
    bulbPanel(6, 30, 168, 262, t);
    thaiS('ย้ายสติกเกอร์ไปเครื่องอื่น', 90, 40, COL.yellow, 13);
    let y = 64;
    y += para('สติกเกอร์บันทึกไว้ในเบราว์เซอร์นี้ ปิดเว็บแล้วกลับมาก็ยังอยู่ ถ้าจะเปิดในแอปอื่นหรือเครื่องอื่น ใช้โค้ดนี้', 16, y, 148, COL.white, 12, 15) + 6;
    const code = store.exportCode();
    box(26, y, 128, 24, COL.black, COL.magenta);
    textS(code, 90, y + 9, COL.yellow, 'c');
    y += 32;
    const S = { x: 18, y, w: 144, h: 18 };
    bigButton(S, navigator.share ? 'ส่งลิงก์ย้ายเครื่อง' : 'คัดลอกลิงก์', pressed === 'share', t);
    hit('share', S, () => {
      audio.sfx('choice_press');
      shareProgress();
    });
    y += 28;
    const I = { x: 18, y, w: 144, h: 16 };
    smallButton(I, 'มีโค้ดจากเครื่องอื่น', pressed === 'import', { px: 12 });
    hit('import', I, () => {
      click();
      openCode('save');
    });
    y += 24;
    if (!store.durable) para('เบราว์เซอร์นี้ปิดการบันทึกไว้ (โหมดส่วนตัว) ข้อมูลจะหายเมื่อปิดเว็บ', 16, y, 148, COL.magenta, 12, 14);
    closeButton({ x: 50, y: 270, w: 80, h: 14 });
  }

  function drawHelp(now, t) {
    dim(0.85);
    bulbPanel(6, 24, 168, 274, t);
    thaiS(modal.welcome ? 'ยินดีต้อนรับสู่ลานนภา!' : 'วิธีเล่น', 90, 33, COL.yellow, 13);
    const steps = [
      ['เดินไปหาซุ้มผี', 'ในงานมีทั้งหมด 8 ซุ้ม'],
      ['กดปุ่ม สแกน QR', 'เล็งกล้องที่ป้ายของซุ้ม'],
      ['เก็บให้ครบ 8 ดวง', 'แลกของรางวัลลานนภา'],
    ];
    let y = 58;
    steps.forEach((s, i) => {
      rect(14, y + 3, 15, 15, COL.magenta);
      text(String(i + 1), 19, y + 7, COL.black);
      thai(s[0], 35, y - 2, COL.yellow, 13, 'l');
      thai(s[1], 35, y + 15, COL.white, 12, 'l');
      y += 38;
    });
    // how a stall looks before / after
    const ex = [art.cp2?.locked, art.cp2?.sticker];
    if (ex[1]) {
      rect(36, y, 44, 44, COL.dred);
      rect(37, y + 1, 42, 42, COL.black);
      textS('?', 58, y + 18, COL.yellow, 'c');
      text('>', 87, y + 18, COL.yellow);
      rect(100, y, 44, 44, COL.black);
      rect(101, y + 1, 42, 42, COL.magenta);
      const k = Math.min(1, 40 / Math.max(ex[1].width, ex[1].height));
      const w = Math.round(ex[1].width * k);
      const h = Math.round(ex[1].height * k);
      ctx.drawImage(ex[1], 122 - Math.round(w / 2), y + 22 - Math.round(h / 2), w, h);
      y += 52;
    }
    thai('บันทึกในเครื่องอัตโนมัติ', 90, y - 2, COL.green, 12);
    thai('ปิดเว็บแล้วกลับมา ก็ยังอยู่', 90, y + 13, COL.green, 12);
    bigButton({ x: 30, y: 274, w: 120, h: 16 }, 'เข้าใจแล้ว', pressed === 'close', t);
    hit('close', { x: 30, y: 274, w: 120, h: 16 }, () => {
      click();
      close();
    });
  }

  function drawToast(now) {
    if (!toast) return;
    if (now > toast.until) return (toast = null);
    const latin = /^[\x20-\x7E]+$/.test(toast.s);
    const w = latin ? toast.s.length * 6 + 11 : thaiWidth(toast.s, 12) + 12;
    const x = Math.round((W - w) / 2);
    const y = 150;
    const h = latin ? 15 : 20;
    rect(x - 1, y - 1, w + 2, h + 2, COL.yellow);
    rect(x, y, w, h, COL.black);
    if (latin) text(toast.s, 90, y + 4, COL.white, 'c');
    else thai(toast.s, 90, y - 1, COL.white, 12);
  }

  // ---- scene 1 scene ----
  const scene = {
    enter(data = {}) {
      active = true;
      hits = [];
      onEnter?.();
      if (data.character?.id) store.unlock(data.character);
      else if (!store.state.unlocked) store.unlock(G.selected?.());
      if (!artReady) prepareArt();
      audio.ambient('night');
      audio.mood('title');
      if (data.scan) setTimeout(() => collect(data.scan, true), 420);
      else if (data.fromGame && !store.state.seenHelp) {
        store.markHelpSeen();
        open('help', { welcome: true });
        say(['มาถึงลานนภาแล้ว!', 'ไปเก็บสติกเกอร์กัน'], 6000);
      }
      if (data.toast) showToast(data.toast, 2400);
    },
    draw(now, t) {
      hits = [];
      ctx.imageSmoothingEnabled = false;
      if (modal?.type === 'scan') {
        drawScan(now, t);
      } else {
        drawBoard(now, t);
        if (modal) {
          hits = []; // only the dialog takes taps
          ({ detail: drawDetail, collect: drawCollect, reward: drawReward, code: drawCode, transfer: drawTransfer, help: drawHelp })[modal.type]?.(now, t);
        }
      }
      drawToast(now);
    },
    onTap() {},
    exit() {
      active = false;
      close();
      input.style.display = 'none';
      onExit?.();
    },
  };
  return { scene, collect, open };
}
