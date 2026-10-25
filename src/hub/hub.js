// Scene 3: the sticker hunt ("HOME" after scene 2). The player has 45 minutes to walk the
// event to 8 checkpoints, scan each one's QR and collect its sticker. Drawn into scene 1's own
// 180 x 320 canvas (LannaphaGame.ctx) with scene 1's brand kit, registered as scene 1's 'scene3'.
//
// Screens (all in the one canvas): start (name + start the clock), the board (8 sticker
// slots on a winding road + the prize, the clock), checkpoint details, the scanner, the
// reveal (scare, then "you found it", a short scary story, the sticker flies into the
// collection), the summary card (saved as an image), the mission-complete page, moving progress
// to another browser, and how to play. Progress is saved by store.js.
import { W, H, COL, kit, mkCanvas, sprite, ghostSprite, pumpkinSprite, moonSprite, houseImage, drawHouseWindows, silhouette, stickerize, thaiWidth } from './brand.js';
import { CHECKPOINTS, TOTAL, SITE_URL, START_ID } from '../data/checkpoints.js';
import { parseScan } from './store.js';
import { msUntilOpen } from './clock.js';
import { HUNT_DAYS_TH } from '../data/checkpoints.js';
import { startCamera, decodeFile } from './scanner.js';
import { drawSticker, tintGold, recolor, RIM, MISSION_ART } from './stickers.js';
import { lootFor, playerTag } from './loot.js';
import { drawDressed, itemIcon } from './dress.js';
import { drawCard, exportCard, fmtTime, bigText, THEMES } from './summary.js';
import { wrapText, graphemes } from '../logic/textWrap.js';
import { audio } from '../audio/engine.js';

const ART = import.meta.glob('../assets/art/*.png', { eager: true, query: '?url', import: 'default' });
const STALL_ART = import.meta.glob('../../assets/stalls/*.png', { eager: true, query: '?url', import: 'default' });
const artUrl = (name) => ART[`../assets/art/${name}.png`];
const stallUrl = (name) => STALL_ART[`../../assets/stalls/${name}.png`];
// Design width of one frame of each sheet (src/assets/manifest.js): the sheets are drawn larger.
const SHEET_W = { krahang: 32, jar: 32, stall_ghost_3: 28, stall_ghost_4: 31, stall_ghost_5: 24, chaser: 64, chaser_red: 64 };

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
const START_FIELD = { x: 30, y: 196, w: 120, h: 20 };
const HOLD_MS = 1200; // the hold-to-see-the-result button
const TYPE_CPS = 26; // typewriter speed of the scary story
const SCARE_S = 0.55; // the jolt before the reveal

/** Slot i (0-7 checkpoints, 8 = prize) on the snake: 1 2 3 / 6 5 4 / 7 8 prize. */
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

/** Fit a canvas into maxW x maxH (nearest-neighbour), never upscaling. */
function fit(src, maxW, maxH) {
  if (src.width <= maxW && src.height <= maxH) return src;
  const k = Math.min(maxW / src.width, maxH / src.height);
  const f = mkCanvas(Math.max(1, Math.round(src.width * k)), Math.max(1, Math.round(src.height * k)));
  const fx = f.getContext('2d');
  fx.imageSmoothingEnabled = false;
  fx.drawImage(src, 0, 0, f.width, f.height);
  return f;
}

/** One frame of a sheet, trimmed; `design` = at design size, else at the sheet's own (bigger) size. */
function sheetFrame(img, sheet, frames, frame, flip, design) {
  const fw = img.width / frames;
  const s = design ? fw / SHEET_W[sheet] : 1;
  const c = mkCanvas(Math.round(fw / s), Math.round(img.height / s));
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  if (flip) {
    x.translate(c.width, 0);
    x.scale(-1, 1);
  }
  x.drawImage(img, fw * frame, 0, fw, img.height, 0, 0, c.width, c.height);
  return trimmed(c);
}

// ---------- small pixel icons ----------
const qrIcon = (() => {
  const finder = (x, y, ox, oy) => {
    const u = x - ox;
    const v = y - oy;
    if (u < 0 || v < 0 || u > 3 || v > 3) return null;
    return u === 0 || v === 0 || u === 3 || v === 3;
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
const arrowL = sprite(8, 12, (x, y) => {
  const inside = Math.abs(y - 5.5) <= 5.5 * (x / 7) + 0.3;
  if (!inside) return null;
  const edge = !(Math.abs(y - 5.5) <= 5.5 * ((x - 1) / 7) - 0.7) || x === 7;
  return edge ? COL.black : COL.yellow;
});
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
const clockIcon = sprite(11, 11, (x, y) => {
  const r = Math.hypot(x - 5, y - 5);
  if (r > 5.3) return null;
  if (r > 4.2) return COL.black;
  if ((x === 5 && y >= 2 && y <= 5) || (y === 5 && x >= 5 && x <= 8)) return COL.black;
  return COL.white;
});
const giftIcon = sprite(11, 11, (x, y) => {
  if (y === 0 && (x === 3 || x === 7)) return COL.black;
  if (y === 1 && (x === 2 || x === 4 || x === 6 || x === 8)) return COL.black;
  if (y === 2 && x >= 1 && x <= 9) return COL.black;
  if (y >= 3 && y <= 4 && x >= 1 && x <= 9) return x === 5 ? COL.yellow : COL.black;
  if (y >= 5 && y <= 10 && x >= 2 && x <= 8) return x === 5 ? COL.yellow : x === 2 || x === 8 || y === 10 ? COL.black : COL.white;
  return null;
});
const miniPumpkin = (lit) =>
  sprite(11, 10, (x, y) => {
    if (x === 5 && y === 0) return COL.green;
    const r = ((x - 5) / 5.4) ** 2 + ((y - 5.6) / 4.4) ** 2;
    if (r > 1) return null;
    if (r > 0.62) return COL.black;
    if (lit && ((y === 4 && (x === 3 || x === 7)) || (y === 7 && x >= 3 && x <= 7))) return COL.black;
    return lit ? COL.yellow : COL.ddred;
  });

// Rotating light rays for the reveal (pre-drawn so they stay crisp pixels).
const RAY_N = 6;
const rays = Array.from({ length: RAY_N }, (_, k) =>
  sprite(160, 160, (x, y) => {
    const dx = x - 79.5;
    const dy = y - 79.5;
    const r = Math.hypot(dx, dy);
    if (r > 79 || r < 8) return null;
    const a = (Math.atan2(dy, dx) / (2 * Math.PI) + 1 + k / (RAY_N * 12)) % 1;
    if (!(Math.floor(a * 12) % 2)) return null;
    if (r > 64) return (x + y) & 1 ? COL.yellow : null;
    return (x + y) & 1 || r < 44 ? COL.yellow : null;
  }),
);
// Red, dithered vignette for the scare.
const bloodVignette = sprite(W, H, (x, y) => {
  const e = Math.min(x, y, W - 1 - x, H - 1 - y);
  if (e < 10) return '#D11F1F';
  if (e < 22 && (x + y) % 2 === 0) return '#8F0F0F';
  if (e < 34 && (x + y) % 4 === 0) return '#5A0808';
  return null;
});

export function createHub({ G, store, onEnter, onExit, onBack, onNeedCharacter }) {
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
  const art = {}; // id -> { big, bigLocked, sticker, locked, lockedDim, mini, miniLocked, stall }
  let artReady = false;
  // Each player's own stickers: of each checkpoint's two designs (the first art in
  // checkpoints.js and the mission sticker in stickers.js), in one of four colourways, picked
  // by the player's seed (loot.js). Rebuilt when the seed changes (a transfer code).
  const imgCache = {};
  let artSeed = null;
  let preparing = false;
  async function prepareArt() {
    if (preparing) return;
    preparing = true;
    const seed = store.state.seed;
    const stalls = {};
    for (const k of ['A', 'B', 'C']) stalls[k] = imgCache['stall_' + k] ??= await loadImg(stallUrl('stall_' + k));
    for (const [i, cp] of CHECKPOINTS.entries()) {
      const loot = lootFor(seed, i);
      const a = cp.art;
      let big = null;
      let src = null; // high-detail source for scaled-down copies
      if (loot.design === 1) big = src = drawSticker(MISSION_ART[cp.id]);
      else if (a.draw) {
        big = drawSticker(a.draw);
        src = big;
      } else if (a.sheet) {
        const img = (imgCache[a.sheet] ??= await loadImg(artUrl(a.sheet)));
        if (img) {
          big = sheetFrame(img, a.sheet, a.frames, a.frame, a.flip, true);
          src = sheetFrame(img, a.sheet, a.frames, a.frame, a.flip, false);
          if (a.tint === 'gold') {
            big = tintGold(big);
            src = tintGold(src);
          }
        }
      }
      if (!big) big = src = trimmed(ghostBig);
      big = recolor(fit(big, 70, 64), loot.color.id);
      src = recolor(src, loot.color.id);
      const rim = RIM[loot.color.id] || COL.white;
      const small = fit(src, 34, 34);
      const mini = fit(src, 26, 28);
      const locked = silhouette(small, COL.black);
      art[cp.id] = {
        loot,
        big,
        bigLocked: silhouette(big, COL.black),
        sticker: stickerize(small, 2, COL.black, rim),
        locked,
        lockedDim: silhouette(small, COL.ddred),
        lockedRed: silhouette(big, '#8F0F0F'),
        mini: stickerize(mini, 1, COL.black, rim),
        miniLocked: silhouette(mini, COL.ddred),
        stall: cp.stall ? stalls[cp.stall] : null,
        stallLocked: cp.stall && stalls[cp.stall] ? silhouette(stalls[cp.stall], COL.black) : null,
      };
    }
    artSeed = seed;
    artReady = true;
    preparing = false;
    story = null;
  }
  /** The items the bird has earned so far (one per collected checkpoint). */
  const wornItems = () => CHECKPOINTS.flatMap((cp, i) => (store.has(cp.id) ? [lootFor(store.state.seed, i).item] : []));
  const icons = {};
  const icon = (id) => (icons[id] ??= trimmed(itemIcon(id)));
  /** The player's bird with its items; feet at (cx, feet). */
  function drawBird(cx, feet, s, t, frame) {
    const f = frame || (t % 3.4 > 3.25 ? 'blink' : 'idle0');
    drawDressed(ctx, G.getSprite(character(), 'front', f), wornItems(), cx, feet, s, t);
  }

  // ---- DOM helpers for the camera, typed text and the saved image (over scene 1's canvas) ----
  canvas.style.position = 'relative';
  canvas.style.zIndex = '2';
  canvas.style.webkitTouchCallout = 'none'; // the hold button must not open the image menu
  canvas.addEventListener('contextmenu', (e) => {
    if (active) e.preventDefault();
  });
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
  input.autocomplete = 'off';
  input.spellcheck = false;
  Object.assign(input.style, {
    position: 'fixed', zIndex: '3', display: 'none', boxSizing: 'border-box', background: '#000', color: COL.yellow,
    border: '0', outline: 'none', textAlign: 'center', fontFamily: '"Serithai","Kanit",sans-serif', padding: '0', borderRadius: '0',
  });
  // saved-image viewer: long-press to save on phones that cannot share the file
  const viewer = document.createElement('div');
  Object.assign(viewer.style, {
    position: 'fixed', inset: '0', zIndex: '10', display: 'none', background: 'rgba(0,0,0,.92)', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', boxSizing: 'border-box',
    fontFamily: '"Serithai","Kanit",sans-serif', color: COL.yellow, textAlign: 'center',
  });
  const viewerImg = document.createElement('img');
  viewerImg.alt = 'สรุปผลล่าสติกเกอร์ลานนภา';
  Object.assign(viewerImg.style, { maxWidth: '100%', maxHeight: '72vh', imageRendering: 'pixelated', border: `3px solid ${COL.yellow}`, WebkitTouchCallout: 'default', WebkitUserSelect: 'auto', userSelect: 'auto' });
  const viewerHint = document.createElement('p');
  viewerHint.style.margin = '0';
  viewerHint.style.fontSize = '18px';
  viewerHint.innerHTML = 'กดค้างที่รูป แล้วเลือก <b>บันทึกรูปภาพ</b>';
  const viewerRow = document.createElement('div');
  Object.assign(viewerRow.style, { display: 'flex', gap: '12px' });
  const btnCss = { font: 'inherit', fontSize: '18px', padding: '8px 18px', border: `2px solid ${COL.yellow}`, background: '#000', color: COL.yellow, textDecoration: 'none', cursor: 'pointer' };
  const viewerDl = document.createElement('a');
  viewerDl.textContent = 'ดาวน์โหลด';
  viewerDl.download = 'laanapha-sticker-hunt.png';
  Object.assign(viewerDl.style, btnCss, { background: COL.magenta, color: '#000' });
  const viewerClose = document.createElement('button');
  viewerClose.type = 'button';
  viewerClose.textContent = 'ปิด';
  Object.assign(viewerClose.style, btnCss);
  viewerRow.append(viewerDl, viewerClose);
  viewer.append(viewerImg, viewerHint, viewerRow);
  viewerClose.addEventListener('click', () => {
    viewer.style.display = 'none';
  });
  document.body.append(video, fileInput, input, viewer);

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
  let msg = null; // temporary speech bubble { s, until }
  let pop = null; // { id, t0 } a sticker just landed in the collection
  let fly = null; // { id, t0, then } a sticker flying into the collection
  let hop = -1e9;
  let camera = null;
  let camStatus = 'idle';
  let scanLock = false;
  let hits = [];
  let pressed = null;
  let holdStart = 0;
  let endSeen = false; // summary shown for this visit after the clock stopped
  let lastBeat = 0;

  const character = () => store.state.character?.id || G.selected?.()?.id || 'nuannapa';
  const characterName = () => G.characters?.find((c) => c.id === character())?.name || THEMES[character()]?.label || '';
  const open = (type, data = {}) => {
    if (modal?.type === 'scan' && type !== 'scan') stopScan();
    input.style.display = 'none';
    modal = { type, ...data, t0: performance.now() };
    pressed = null;
  };
  const close = () => {
    if (modal?.type === 'scan') stopScan();
    input.style.display = 'none';
    modal = null;
    pressed = null;
  };
  const say = (s, ms = 3200) => (msg = { s, until: performance.now() + ms });
  const showToast = (s, ms = 1800) => (toast = { s, until: performance.now() + ms });
  const click = () => audio.sfx('ui_click');
  const buzz = (pattern) => {
    if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(pattern);
  };
  const ended = () => ['complete', 'timeout'].includes(store.status());

  function hit(id, r, fn, pad = 2) {
    hits.push({ id, x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2, fn });
  }

  // ---- scanning ----
  async function startScan() {
    if (store.status() === 'timeout') return openSummary('หมดเวลาแล้ว');
    open('scan', { entry: !store.entered });
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
  function onScanText(value) {
    if (scanLock) return;
    const id = parseScan(value);
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

  /** A checkpoint was scanned (camera, photo, typed code or the ?cp= link). */
  function collect(id) {
    if (id === 'entry' || (id === START_ID && store.status() === 'idle' && !store.has(START_ID))) {
      // the entry QR, or START at the registration table: unlock, then name + start
      // (starting collects START, so its sticker comes with the first mission)
      // the entry QR at the event: unlocks the hunt
      const first = store.enter();
      if (modal) close();
      if (!store.state.character && onNeedCharacter) {
        audio.sfx('scene3_chime');
        onNeedCharacter();
        return;
      }
      if (store.status() === 'idle') {
        audio.sfx('scene3_chime');
        buzz([40, 60, 90]);
        openInput('start', START_FIELD);
        showToast(first ? 'ปลดล็อกแล้ว! เริ่มเล่นได้เลย' : 'เข้าร่วมเกมแล้ว', 2600);
      } else showToast('เข้าร่วมเกมแล้ว', 2000);
      return;
    }
    if (!store.entered && store.status() === 'idle') store.enter();
    const r = store.collect(id);
    if (modal) close();
    if (r === 'new') {
      buzz([60, 40, 60, 40, 160]);
      audio.sfx('jumpscare');
      open('reveal', { id, confetti: makeConfetti() });
    } else if (r === 'dup') {
      buzz(30);
      audio.sfx('ui_on');
      open('detail', { id });
      showToast('จุดนี้เก็บแล้วนะ', 2000);
    } else if (r === 'timeout') {
      audio.sfx('ui_off');
      openSummary('หมดเวลาแล้ว');
    }
  }
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    fileInput.value = '';
    if (!f) return;
    showToast('กำลังอ่าน QR...', 1200);
    let value = null;
    try {
      value = await decodeFile(f);
    } catch {
      value = null;
    }
    const id = parseScan(value);
    if (id) collect(id);
    else {
      audio.sfx('ui_off');
      showToast(value ? 'QR นี้ไม่ใช่ของลานนภา' : 'หา QR ในรูปไม่เจอ', 2400);
    }
  });

  // ---- typed text (checkpoint code, transfer code, name) ----
  function openInput(mode, field, back) {
    open(mode === 'start' ? 'start' : 'input', { mode, field, back });
    input.value = mode === 'name' || mode === 'start' ? store.state.name || '' : '';
    input.placeholder = { cp: 'รหัสของจุดนี้', save: 'LNP-XXXXXXXX', name: 'ชื่อของคุณ', start: 'ชื่อของคุณ' }[mode];
    input.autocapitalize = mode === 'save' ? 'characters' : mode === 'cp' ? 'none' : 'words';
    input.maxLength = mode === 'name' || mode === 'start' ? 24 : 20;
    input.setAttribute('aria-label', input.placeholder);
    input.style.display = 'block';
    const s = place(input, field);
    input.style.fontSize = Math.round(11 * s) + 'px';
    if (mode !== 'start') setTimeout(() => input.focus(), 50);
  }
  function submitInput() {
    const v = input.value.trim();
    const mode = modal?.mode;
    if (mode === 'start') return startHunt();
    if (mode === 'name') {
      store.setName(v);
      const back = modal.back;
      close();
      if (back) open(back);
      return;
    }
    if (!v) return;
    if (mode === 'save') {
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
    if (e.key === 'Enter') {
      input.blur();
      submitInput();
    }
  });
  function startHunt() {
    store.start(input.value);
    store.markHelpSeen();
    close();
    audio.sfx('meter_full');
    // the START checkpoint is the registration table: starting collects it
    if (!store.has(START_ID)) setTimeout(() => collect(START_ID), 250);
    else say('เริ่มภารกิจ!', 4000);
  }
  /** The next checkpoint to do (walking order), or null when all are collected. */
  const nextCp = () => CHECKPOINTS.find((cp) => !store.has(cp.id)) || null;

  async function shareProgress() {
    const code = store.exportCode();
    const n = store.state.name ? `&n=${encodeURIComponent(store.state.name)}` : '';
    const url = `${SITE_URL}/?save=${code}${n}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ลานนภา ล่าสติกเกอร์ผี', text: `โค้ดย้ายสติกเกอร์ของฉัน ${code}`, url });
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

  // ---- summary card ----
  function cardData() {
    const now = Date.now();
    const d = new Date();
    return {
      characterId: character(),
      characterName: characterName(),
      name: store.state.name,
      status: store.status(now),
      usedMs: store.timeUsed(now),
      count: store.count(),
      stickers: CHECKPOINTS.map((cp) => ({ got: store.has(cp.id), mini: art[cp.id]?.mini, locked: art[cp.id]?.miniLocked, tag: art[cp.id]?.loot.color.tag })),
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`,
      getSprite: (id, view, frame) => G.getSprite(id, view, frame),
      items: wornItems(),
      tag: playerTag(store.state.seed),
      rare: CHECKPOINTS.filter((cp) => store.has(cp.id) && art[cp.id]?.loot.color.tag).length,
    };
  }
  // The story image is made as soon as the summary opens, so the save tap can open the
  // share sheet straight away (iOS only allows it right after a tap).
  let story = null; // { key, blob, dataUrl }
  const storyKey = () => JSON.stringify([store.state.seed, store.state.stamps, store.state.name, store.state.finishedAt, store.status(), character()]);
  async function prepareStory() {
    const key = storyKey();
    if (story?.key === key) return story;
    const blob = await exportCard(cardData(), 0.4);
    if (!blob) return null;
    const dataUrl = await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => res(null);
      r.readAsDataURL(blob);
    });
    story = { key, blob, dataUrl };
    return story;
  }
  function openSummary(note) {
    endSeen = true;
    open('summary');
    if (note) showToast(note, 2400);
    const tryPrep = () => (artReady ? prepareStory() : setTimeout(tryPrep, 200));
    tryPrep();
  }
  async function saveImage() {
    let st = story?.key === storyKey() ? story : null;
    if (!st) {
      showToast('กำลังสร้างรูป...', 1500);
      st = await prepareStory();
    }
    if (!st) return showToast('สร้างรูปไม่สำเร็จ', 2000);
    const file = new File([st.blob], 'laanapha-sticker-hunt.png', { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
    // no file sharing here (e.g. Instagram's in-app browser): show the image to long-press
    viewerImg.src = st.dataUrl;
    viewerDl.href = st.dataUrl;
    viewer.style.display = 'flex';
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
    if (h && h.id === was && h.id !== 'hold' && h.id !== 'hint') h.fn();
    else if ((was === 'hold' || was === 'hint') && modal) showToast('กดค้างไว้จนแถบเต็มนะ', 1500);
  });
  canvas.addEventListener('pointercancel', () => (pressed = null));
  window.addEventListener('resize', () => {
    if (modal?.field && input.style.display !== 'none') place(input, modal.field);
  });

  // ---- the board ----
  function bubbleText() {
    const now = performance.now();
    if (msg && now < msg.until) return msg.s;
    const n = store.count();
    const st = store.status();
    if (store.state.claimedAt) return 'ขอบคุณที่มาลานนภานะ!';
    if (st === 'complete') return 'ภารกิจสำเร็จ!';
    if (st === 'timeout') return 'หมดเวลาแล้ว...';
    if (st === 'idle') return 'สแกน QR ที่โต๊ะลงทะเบียน';
    const nx = nextCp();
    return nx ? `ต่อไป: ${nx.name}` : 'ครบ 8 ดวงแล้ว!';
  }

  function drawHeader(t) {
    rect(BACK.x - 1, BACK.y - 1, BACK.w + 2, BACK.h + 2, COL.yellow);
    rect(BACK.x, BACK.y, BACK.w, BACK.h, pressed === 'back' ? COL.yellow : COL.black);
    ctx.drawImage(arrowL, BACK.x + 6, BACK.y + 4);
    bulbPanel(26, 5, 128, 26, t);
    thai('ล่าสติกเกอร์ผี', 90, 7, COL.yellow, 13);
    K.speaker(audio.sound);
  }

  function drawClock(t) {
    const st = store.status();
    const left = store.timeLeft();
    const low = st === 'running' && left < 5 * 60000;
    const blink = low && Math.floor(t * 2) % 2;
    const edge = st === 'timeout' ? COL.magenta : low ? (blink ? COL.magenta : COL.yellow) : st === 'complete' ? COL.green : COL.yellow;
    box(52, 59, 125, 21, COL.black, edge);
    ctx.drawImage(clockIcon, 56, 64);
    const label = !store.timed ? (st === 'complete' ? 'ใช้ไป' : 'เวลา') : { idle: 'เวลา', running: 'เหลือ', complete: 'ใช้ไป', timeout: 'หมด' }[st];
    thai(label, 70, 58, COL.white, 12, 'l');
    let ms = st === 'complete' ? store.timeUsed() : left;
    if (!store.timed) ms = store.timeUsed(); // no limit: how long the player has taken
    if (st === 'running' && store.bonusMs()) {
      // the time bonus earned so far: a green tag on the clock's top edge
      const tag = `+${Math.round(store.bonusMs() / 60000)} MIN`;
      const tw = tag.length * 6 + 3;
      rect(172 - tw, 54, tw, 9, COL.green);
      text(tag, 171 - tw + 2, 55, COL.black);
    }
    bigText(K, fmtTime(ms), 172, 63, st === 'timeout' || blink ? COL.magenta : st === 'complete' ? COL.green : COL.yellow, 'r');
  }

  function drawHero(now, t) {
    ctx.drawImage(moon, 2, 34);
    [[44, 40, 0], [12, 96, 1]].forEach((s, i) => sparkle(s[0], s[1], (Math.floor(t * 2 + i) % 2 === 0) === !s[2]));
    const cx = 28;
    rect(cx - 16, 92, 32, 3, COL.black);
    rect(cx - 13, 91, 26, 1, COL.yellow);
    const hp = (now - hop) / 450;
    const hy = hp >= 0 && hp < 1 ? -Math.round(Math.sin(hp * Math.PI) * 10) : 0;
    const blink = t % 3.4 > 3.25 ? 'blink' : Math.floor(t * 2.2) % 2 ? 'idle1' : 'idle0';
    drawBird(cx, 91 + hy, 1, t, blink === 'idle1' ? 'idle0' : blink);
    hit('hero', { x: cx - 16, y: 54, w: 32, h: 40 }, () => {
      hop = performance.now();
      audio.sfx('ui_on');
    });
    box(52, 35, 125, 21);
    rect(49, 46, 3, 3, COL.yellow);
    rect(50, 47, 2, 1, COL.black);
    const s = bubbleText();
    thai(s, 114, 34, COL.yellow, thaiWidth(s, 12) > 120 ? 11 : 12);
    drawClock(t);
    const n = store.count();
    CHECKPOINTS.forEach((cp, i) => ctx.drawImage(store.has(cp.id) ? pipOn : pipOff, 54 + i * 12, 84));
    textS(`${n}/${TOTAL}`, 176, 86, n === TOTAL ? COL.yellow : COL.white, 'r');
  }

  const nextIndex = () => CHECKPOINTS.findIndex((cp) => !store.has(cp.id));

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
      ctx.fillStyle = store.has(CHECKPOINTS[i].id) ? COL.yellow : COL.dred;
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
    const flying = fly && fly.id === cp.id;
    const got = store.has(cp.id) && !flying;
    const a = art[cp.id];
    const isNext = i === nextIndex() && !ended();
    let dy = pressed === 'slot' + i ? 1 : 0;
    if (pop && pop.id === cp.id) {
      const k = (now - pop.t0) / 700;
      if (k < 1) dy -= Math.round(Math.sin(k * Math.PI) * 6);
      else pop = null;
    }
    const x = r.x;
    const y = r.y + dy;
    if (got) {
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
      rect(x, y, TILE, TILE, (isNext || flying) && Math.floor(t * 3) % 2 ? COL.yellow : COL.dred);
      rect(x + 1, y + 1, TILE - 2, TILE - 2, COL.black);
      ctx.fillStyle = COL.ddred;
      for (let k = 0; k < TILE - 8; k += 4) {
        ctx.fillRect(x + 4 + k, y + 4, 2, 1);
        ctx.fillRect(x + 4 + k, y + TILE - 5, 2, 1);
        ctx.fillRect(x + 4, y + 4 + k, 1, 2);
        ctx.fillRect(x + TILE - 5, y + 4 + k, 1, 2);
      }
      if (a) {
        const s = a.lockedDim;
        ctx.drawImage(s, x + Math.round((TILE - s.width) / 2), y + Math.round((TILE - s.height) / 2) + 2);
      }
      textS('?', x + TILE / 2 + 1, y + TILE / 2 - 2, isNext ? COL.yellow : COL.dred, 'c');
    }
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
      open(cp.hints && !store.has(cp.id) ? 'mystery' : 'detail', { id: cp.id });
    }, 1);
  }

  function drawPrize(now, t) {
    const r = slotRect(8);
    const st = store.status();
    const done = st === 'complete';
    const p = pressed === 'prize' ? 1 : 0;
    const x = r.x;
    const y = r.y + p;
    rect(x, y, TILE, TILE, done && Math.floor(t * 3) % 2 ? COL.yellow : done ? COL.magenta : COL.dred);
    rect(x + 1, y + 1, TILE - 2, TILE - 2, COL.black);
    if (done) for (let k = 0; k < 4; k++) sparkle(x + 6 + ((k * 13 + Math.floor(t * 4) * 7) % 36), y + 6 + ((k * 7) % 12), (Math.floor(t * 4) + k) % 2 === 0);
    const pk = done ? pumpkinLit : pumpkinDark;
    const bob = done ? (Math.sin(t * 5) > 0 ? -1 : 0) : 0;
    ctx.drawImage(pk, x + 16, y + 11 + bob);
    ctx.fillStyle = done ? COL.yellow : COL.dred;
    for (let k = 0; k <= 12; k++) ctx.fillRect(x + 18 + k, y + 11 + bob - Math.round(Math.sin((k / 12) * Math.PI) * 6), 1, 1);
    thai(ended() ? 'สรุปผล' : 'จบภารกิจ', x + TILE / 2, y + 26, done || st === 'timeout' ? COL.yellow : COL.dred, 12);
    hit('prize', r, () => {
      click();
      if (ended()) openSummary();
      else open('reward');
    }, 1);
  }

  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
  function drawFly(now) {
    if (!fly || !art[fly.id]) return;
    const k = Math.min(1, (now - fly.t0) / 750);
    const i = CHECKPOINTS.findIndex((c) => c.id === fly.id);
    const r = slotRect(i);
    const s = art[fly.id].sticker;
    const tx = r.x + TILE / 2;
    const ty = r.y + TILE / 2 + 3;
    const at = (kk) => ({ x: 90 + (tx - 90) * ease(kk), y: 140 + (ty - 140) * ease(kk) - Math.sin(kk * Math.PI) * 30 });
    for (let j = 1; j <= 4; j++) {
      const p = at(Math.max(0, k - j * 0.06));
      sparkle(Math.round(p.x), Math.round(p.y), j % 2 === 0);
    }
    const p = at(k);
    const sc = k < 0.55 ? 2 : 1;
    ctx.drawImage(s, Math.round(p.x - (s.width * sc) / 2), Math.round(p.y - (s.height * sc) / 2), s.width * sc, s.height * sc);
    if (k >= 1) {
      const id = fly.id;
      const then = fly.then;
      fly = null;
      pop = { id, t0: now };
      audio.sfx('thump');
      audio.sfx('letter_chime');
      buzz(40);
      then?.();
    }
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
    if (!artReady) thai('กำลังโหลด...', 90, 170, COL.yellow, 13);
    else {
      drawRoad(t);
      for (let i = 0; i < 8; i++) drawSlot(i, now, t);
      drawPrize(now, t);
    }
    const st = store.status();
    if (st === 'idle' && !store.entered) {
      bigButton(SCAN_BTN, 'สแกน QR หน้างาน', pressed === 'scan', t, qrIcon);
      hit('scan', SCAN_BTN, () => {
        audio.sfx('choice_press');
        open('gate');
      });
    } else if (st === 'idle') {
      bigButton(SCAN_BTN, 'เริ่มภารกิจ', pressed === 'scan', t, clockIcon);
      hit('scan', SCAN_BTN, () => {
        audio.sfx('choice_press');
        openInput('start', START_FIELD);
      });
    } else if (st === 'running') {
      bigButton(SCAN_BTN, 'สแกน QR', pressed === 'scan', t, qrIcon);
      hit('scan', SCAN_BTN, () => {
        audio.sfx('choice_press');
        startScan();
      });
    } else if (st === 'complete') {
      bigButton(SCAN_BTN, 'ภารกิจสำเร็จ!', pressed === 'scan', t);
      hit('scan', SCAN_BTN, () => {
        audio.sfx('choice_press');
        open('reward');
      });
    } else {
      bigButton(SCAN_BTN, 'ดูสรุปผล', pressed === 'scan', t);
      hit('scan', SCAN_BTN, () => {
        audio.sfx('choice_press');
        openSummary();
      });
    }
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

  // ---- overlays ----
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
  function closeButton(r, label = 'ปิด', fn) {
    smallButton(r, label, pressed === 'close', { px: 12 });
    hit('close', r, () => {
      click();
      if (fn) fn();
      else close();
    });
  }

  function drawStart(now, t) {
    dim(0.88);
    bulbPanel(6, 20, 168, 282, t);
    thaiS('ยินดีต้อนรับสู่ลานนภา!', 90, 28, COL.yellow, 13);
    const steps = [
      ['ทำภารกิจทั้ง 8 จุด', 'เริ่มที่โต๊ะลงทะเบียน'],
      ['สแกน QR ที่แต่ละจุด', 'สะสมสติกเกอร์ผีให้ครบ'],
      ['ครบ 8 ดวง', 'ภารกิจสำเร็จ!'],
    ];
    let y = 52;
    steps.forEach((s, i) => {
      rect(14, y + 3, 15, 15, COL.magenta);
      text(String(i + 1), 19, y + 7, COL.black);
      thai(s[0], 35, y - 2, COL.yellow, 12, 'l');
      thai(s[1], 35, y + 13, COL.white, 12, 'l');
      y += 36;
    });
    thai('ชื่อที่จะโชว์ในหน้าสรุป', 90, 172, COL.white, 12);
    const f = modal.field;
    rect(f.x - 2, f.y - 2, f.w + 4, f.h + 4, COL.yellow);
    rect(f.x, f.y, f.w, f.h, COL.black);
    place(input, f);
    const B = { x: 20, y: 232, w: 140, h: 20 };
    bigButton(B, 'เริ่มภารกิจ!', pressed === 'go', t, clockIcon);
    hit('go', B, () => {
      audio.sfx('choice_press');
      startHunt();
    });
    thai('ไม่จำกัดเวลา', 90, 256, COL.magenta, 12);
    closeButton({ x: 50, y: 282, w: 80, h: 13 }, 'ไว้ก่อน');
  }

  function diorama(cp, x, y, w, h, got, t) {
    const a = art[cp.id];
    rect(x, y, w, h, COL.yellow);
    rect(x + 1, y + 1, w - 2, h - 2, COL.ddred);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 1, y + 1, w - 2, h - 2);
    ctx.clip();
    for (let yy = y + 1; yy < y + h - 12; yy++) if (Math.floor((yy - y + Math.round(Math.sin(t * 1.4) * 2) + 200) / 11) % 2) rect(x + 1, yy, w - 2, 1, COL.dred);
    [[12, 8], [w - 20, 12], [w / 2, 6]].forEach((s, i) => sparkle(x + s[0], y + s[1], (Math.floor(t * 2) + i) % 2 === 0));
    const gy = y + h - 12;
    rect(x + 1, gy, w - 2, 12, COL.black);
    rect(x + 1, gy, w - 2, 1, COL.dred);
    if (a) {
      const fig = got ? a.big : a.bigLocked;
      const floaty = cp.art.sheet === 'chaser_red' || cp.art.sheet === 'krahang';
      const bob = floaty ? Math.round(Math.sin(t * 2) * 2) - 4 : 0;
      const sc = !a.stall && fig.height <= 32 ? 2 : 1; // small objects stand alone at 2x
      if (a.stall) {
        ctx.drawImage(got ? a.stall : a.stallLocked, x + 10, gy - 62);
        ctx.drawImage(fig, x + w - 12 - fig.width, gy - fig.height + 2 + bob);
      } else {
        ctx.drawImage(fig, x + Math.round((w - fig.width * sc) / 2), gy - fig.height * sc + 2 + bob, fig.width * sc, fig.height * sc);
      }
      if (!got) textS('?', a.stall ? x + w - 12 - Math.round(a.big.width / 2) : x + w / 2, y + 4, COL.yellow, 'c');
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
    text(`CP ${i + 1}`, 32, 26, COL.black, 'c');
    thai(got ? 'เก็บแล้ว' : 'ยังไม่เจอ', 166, 19, got ? COL.green : COL.magenta, 12, 'r');
    thaiS(cp.name, 90, 36, COL.yellow, thaiWidth(cp.name, 13) > 150 ? 12 : 13);
    thai(cp.title, 90, 52, COL.white, 12);
    diorama(cp, 14, 72, 152, 76, got, t);
    let y = 153;
    if (got) {
      const d = new Date(store.state.stamps[cp.id]);
      const pad = (v) => String(v).padStart(2, '0');
      box(14, y, 152, 18, COL.black, COL.green);
      ctx.drawImage(checkIcon, 20, y + 5);
      thai(`ผ่านเมื่อ ${d.getDate()}/${d.getMonth() + 1} · ${pad(d.getHours())}:${pad(d.getMinutes())} น.`, 94, y - 2, COL.green, 12);
    } else {
      box(14, y, 152, 18, COL.black, COL.magenta);
      thai('ทำภารกิจแล้วสแกน QR', 90, y - 2, COL.magenta, 12);
    }
    y += 24;
    y += para(cp.mission, 16, y, 148, COL.white, 12, 14) + 4;
    if (y < 248) {
      ctx.drawImage(pinIcon, 16, y + 4);
      para(cp.where, 26, y, 138, COL.yellow, 12, 14);
    }
    if (got || store.status() !== 'running') closeButton({ x: 50, y: 282, w: 80, h: 15 });
    else {
      const B = { x: 18, y: 260, w: 144, h: 16 };
      bigButton(B, 'สแกน QR', pressed === 'dscan', t, qrIcon);
      hit('dscan', B, () => {
        audio.sfx('choice_press');
        close();
        startScan();
      });
      closeButton({ x: 50, y: 286, w: 80, h: 13 });
    }
  }

  function makeConfetti() {
    const cols = [COL.yellow, COL.magenta, COL.white, COL.green, COL.orange];
    return Array.from({ length: 46 }, (_, i) => ({
      x: 90 + (Math.random() - 0.5) * 40,
      y: 120 + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 220,
      vy: -60 - Math.random() * 170,
      c: cols[i % cols.length],
      w: 1 + (i % 2),
    }));
  }

  function drawReveal(now, t) {
    const cp = CHECKPOINTS.find((c) => c.id === modal.id);
    const i = CHECKPOINTS.indexOf(cp);
    const a = art[cp.id];
    const k = (now - modal.t0) / 1000;
    // phase 1: the scare: the screen shakes, red edges, the silhouette lunges at you
    if (k < SCARE_S) {
      dim(0.9);
      ctx.drawImage(bloodVignette, 0, 0);
      if (a) {
        const s = a.lockedRed;
        const sc = Math.min(3, 1 + Math.floor(k * 6));
        const jx = Math.round((Math.random() - 0.5) * 4);
        ctx.drawImage(s, Math.round(90 - (s.width * sc) / 2) + jx, Math.round(140 - (s.height * sc) / 2), s.width * sc, s.height * sc);
      }
      thaiS('!!!', 90, 40, '#D11F1F', 16);
      return;
    }
    if (!modal.revealed) {
      modal.revealed = now;
      audio.sfx('scene3_chime');
      setTimeout(() => audio.sfx('angel_appear'), 120);
    }
    const kr = (now - modal.revealed) / 1000;
    dim(0.9);
    if (kr < 0.2) {
      ctx.globalAlpha = 1 - kr / 0.2;
      rect(0, 0, W, H, COL.white);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(rays[Math.floor(t * 8) % RAY_N], 10, 38);
    modal.confetti.forEach((p) => {
      const x = Math.round(p.x + p.vx * kr);
      const y = Math.round(p.y + p.vy * kr + 160 * kr * kr);
      if (y < H) rect(x, y, p.w, Math.floor(kr * 10 + p.x) % 2 ? 2 : 1, p.c);
    });
    thaiS(cp.hints ? 'เจอกล่องปริศนาแล้ว!' : 'ยินดีด้วย! คุณเจอมันแล้ว', 90, 12, COL.yellow, 14);
    thai(`คุณมาถึง CHECKPOINT ${i + 1} แล้ว`, 90, 32, COL.white, 12);
    if (a) {
      const s = a.sticker;
      const bounce = kr < 0.25 ? Math.round((1 - kr / 0.25) * -14) : kr < 0.4 ? -Math.round(Math.sin(((kr - 0.25) / 0.15) * Math.PI) * 4) : Math.round(Math.sin(t * 3) * 1.5);
      const sx = 60;
      ctx.drawImage(s, Math.round(sx - s.width), Math.round(110 - s.height) + bounce, s.width * 2, s.height * 2);
      [[14, 66], [104, 60], [16, 150], [100, 148]].forEach((p, j) => sparkle(p[0], p[1], (Math.floor(t * 5) + j) % 2 === 0));
      const loot = a.loot;
      if (loot?.color.tag) {
        // a rare colourway: a tag on the sticker
        const tw = loot.color.tag.length * 6 + 5;
        const tx = 8;
        const ty = 56;
        rect(tx - 1, ty - 1, tw + 2, 11, COL.black);
        rect(tx, ty, tw, 9, loot.color.id === 'gold' ? COL.yellow : loot.color.id === 'neon' ? COL.magenta : '#9EC3F0');
        text(loot.color.tag, tx + 3, ty + 1, COL.black);
      }
      if (loot && kr > 0.3) {
        // the bird item this sticker gives
        if (!modal.itemSound) {
          modal.itemSound = true;
          audio.sfx('meter_full');
        }
        const pk = Math.min(1, (kr - 0.3) / 0.25);
        const dy = Math.round((1 - pk) * 20);
        const P = { x: 112, y: 62 + dy, w: 62, h: 92 };
        box(P.x, P.y, P.w, P.h, COL.black, Math.floor(t * 3) % 2 ? COL.yellow : COL.magenta);
        thai('ของแต่งนก!', P.x + P.w / 2, P.y - 1, COL.yellow, 11);
        const ic = icon(loot.item.id);
        const k2 = ic.width <= 26 && ic.height <= 24 ? 2 : 1;
        ctx.drawImage(ic, Math.round(P.x + P.w / 2 - (ic.width * k2) / 2), Math.round(P.y + 44 - (ic.height * k2) / 2), ic.width * k2, ic.height * k2);
        para(loot.item.th, P.x + 2, P.y + 64, P.w - 4, COL.green, 11, 12, 'c');
      }
    }
    box(12, 162, 156, 22, COL.black, COL.magenta);
    const head = `จุดที่ ${i + 1} · ${cp.name}`;
    thaiS(head, 90, thaiWidth(head, 13) > 150 ? 163 : 162, COL.yellow, thaiWidth(head, 13) > 150 ? 12 : 13);
    // the scary story, typed out
    box(8, 189, 164, 82, COL.black, COL.dred);
    const nx = nextCp();
    const story = nx ? `ภารกิจต่อไป · จุดที่ ${CHECKPOINTS.indexOf(nx) + 1} ${nx.name}: ${nx.mission}` : 'ครบทุกจุดแล้ว! นกของคุณแต่งตัวครบแล้ว ไปดูสรุปผลกันเลย';
    const lines = wrapText(story, 152, (str) => thaiWidth(str, 12));
    const total = lines.reduce((n, l) => n + graphemes(l).length, 0);
    const shown = modal.typed ? total : Math.floor(Math.max(0, kr - 0.35) * TYPE_CPS);
    let left = shown;
    const lh = lines.length > 5 ? 13 : 15;
    lines.slice(0, 6).forEach((ln, j) => {
      if (left <= 0) return;
      const g = graphemes(ln);
      thai(g.slice(0, left).join(''), 14, 190 + j * lh, j === 0 && nx ? COL.yellow : COL.white, 12, 'l');
      left -= g.length;
    });
    const doneTyping = shown >= total;
    if (!doneTyping && Math.floor(kr * TYPE_CPS) % 3 === 0 && modal.blip !== Math.floor(kr * TYPE_CPS)) {
      modal.blip = Math.floor(kr * TYPE_CPS);
      audio.sfx('type_blip', { voice: 'ghost' });
    }
    hit('skip', { x: 0, y: 0, w: W, h: H }, () => {
      modal.typed = true;
    }, 0);
    if (doneTyping) {
      modal.typed = true;
      const B = { x: 16, y: 280, w: 148, h: 18 };
      bigButton(B, 'เก็บเข้าคอลเลกชัน', pressed === 'keep', t);
      hit('keep', B, () => {
        audio.sfx('whoosh');
        const id = cp.id;
        close();
        const complete = store.status() === 'complete';
        fly = {
          id,
          t0: performance.now(),
          then: () => {
            if (complete) setTimeout(() => open('reward'), 500);
            else if (nextCp()?.hints && CHECKPOINTS.indexOf(nextCp()) === CHECKPOINTS.findIndex((c) => c.id === id) + 1)
              setTimeout(() => open('mystery', { id: nextCp().id }), 450); // owner, 25 Oct: after 7, the mystery box
            else say(nextCp() ? `ต่อไป: ${nextCp().name}` : 'ครบ 8 ดวงแล้ว!', 3500);
          },
        };
      });
    } else thai('แตะเพื่ออ่านต่อ', 90, 280, COL.dred, 12);
  }

  function drawSummary(now, t) {
    if (!artReady) return;
    drawCard(ctx, cardData(), t, { footer: false });
    hit('name', { x: 8, y: 116, w: 164, h: 22 }, () => {
      click();
      openInput('name', { x: 20, y: 132, w: 140, h: 22 }, 'summary');
    }, 0);
    // close: an X in the corner
    const X = { x: 158, y: 34, w: 16, h: 16 };
    rect(X.x - 1, X.y - 1, X.w + 2, X.h + 2, COL.yellow);
    rect(X.x, X.y, X.w, X.h, pressed === 'close' ? COL.yellow : COL.black);
    textS('X', X.x + 8, X.y + 5, pressed === 'close' ? COL.black : COL.yellow, 'c');
    hit('close', X, () => {
      click();
      close();
    }, 4);
    // 3. The dashboard: save it as an image
    const done = store.status() === 'complete';
    const S = { x: 8, y: 293, w: 164, h: 20 };
    if (done) {
      const k = Math.min(1, (now - modal.t0) / 450);
      S.y += Math.round((1 - k) ** 2 * 30);
    }
    bigButton(S, done ? 'บันทึกรูป' : 'บันทึกรูปลงสตอรี่', pressed === 'save', t);
    hit('save', S, () => {
      audio.sfx('choice_press');
      saveImage();
    });
  }

  /** The end: mission complete (owner, 25 Oct: no prize, just congratulations). */
  function drawReward(now, t) {
    const done = store.complete();
    dim(0.88);
    if (!done) {
      bulbPanel(6, 14, 168, 292, t);
      thaiS('ภารกิจยังไม่ครบ', 90, 24, COL.yellow, 13);
      ctx.drawImage(pumpkinDark, 82, 58);
      thai(`ผ่านแล้ว ${store.count()} จาก ${TOTAL} จุด`, 90, 82, COL.white, 12);
      CHECKPOINTS.forEach((c, i) => ctx.drawImage(store.has(c.id) ? pipOn : pipOff, 30 + i * 15, 104));
      const nx = nextCp();
      if (nx) para(`ต่อไป: จุดที่ ${CHECKPOINTS.indexOf(nx) + 1} ${nx.name}`, 18, 126, 144, COL.white, 12, 15, 'c');
      closeButton({ x: 50, y: 282, w: 80, h: 15 });
      return;
    }
    // 1. Mission complete: hold the button to see the result (owner, 25 Oct)
    const k = (now - modal.t0) / 1000;
    if (!modal.cheered) {
      modal.cheered = true;
      modal.confetti = makeConfetti();
      audio.sfx('scene3_chime');
      setTimeout(() => audio.sfx('angel_appear'), 150);
    }
    bulbPanel(4, 4, 172, 312, t);
    text('MISSION COMPLETE!', 90, 14, Math.floor(t * 4) % 2 ? COL.yellow : COL.white, 'c');
    thaiS('ตอนนี้คุณ Complete Mission', 90, 24, COL.yellow, 13);
    thaiS('ของลาน ณ ภา แล้ว', 90, 42, COL.yellow, 14);
    // the player's bird, dressed in everything it earned, on a beam of light
    ctx.save();
    ctx.beginPath();
    ctx.rect(10, 64, 160, 116);
    ctx.clip();
    ctx.drawImage(rays[Math.floor(t * 8) % RAY_N], 10, 42);
    (modal.confetti || []).forEach((p) => {
      const kk = (k % 2.6) + 0.1;
      const x = Math.round(p.x + p.vx * kk * 0.6);
      const y = Math.round(p.y - 40 + p.vy * kk * 0.5 + 120 * kk * kk);
      rect(x, y, p.w, 2, p.c);
    });
    rect(54, 172, 72, 4, COL.black);
    drawBird(90, 172 - Math.round(Math.abs(Math.sin(t * 4)) * 4), 2, t);
    sparkle(24, 84, Math.floor(t * 4) % 2 === 0);
    sparkle(156, 78, Math.floor(t * 4) % 2 === 1);
    ctx.restore();
    box(12, 184, 156, 20, COL.black, COL.yellow);
    thai(store.state.name || 'ผู้กล้าไร้นาม', 16, 183, COL.yellow, 12, 'l');
    text(`${fmtTime(store.timeUsed())}  8/8`, 164, 191, COL.green, 'r');
    // the hold button: a bar fills while it is held
    const B = { x: 14, y: 222, w: 152, h: 30 };
    const held = pressed === 'hold' ? Math.min(1, (now - holdStart) / HOLD_MS) : 0;
    rect(B.x - 1, B.y - 1, B.w + 2, B.h + 2, COL.yellow);
    rect(B.x, B.y, B.w, B.h, COL.black);
    rect(B.x + 1, B.y + 1, Math.round((B.w - 2) * held), B.h - 2, COL.magenta);
    if (!held && Math.floor(t * 2) % 2) rect(B.x + 1, B.y + B.h - 3, B.w - 2, 2, COL.dmagenta);
    thaiS(held ? 'กดค้างไว้...' : 'กดค้างเพื่อดูสรุปผล', 90, B.y + 4, COL.yellow, 14);
    if (held > 0 && Math.floor(held * 10) !== modal.tick) {
      modal.tick = Math.floor(held * 10);
      audio.sfx('type_blip', { voice: 'ghost' });
      buzz(8);
    }
    if (held >= 1) {
      pressed = null;
      audio.sfx('meter_full');
      buzz([30, 40, 80]);
      open('blessing');
      return;
    }
    hit('hold', B, () => {}, 4);
    thai('แตะค้างไว้จนแถบเต็ม', 90, 256, COL.white, 11);
    closeButton({ x: 50, y: 290, w: 80, h: 14 });
  }

  // 2. A blessing for the player (owner, 25 Oct)
  const BLESSING = ['เจ้าสำเร็จภารกิจ', 'ล่าท้าผีวันนี้แล้ว', 'ขอให้มีความสุขกับชีวิต', 'คิดสิ่งใด สมปรารถนา'];
  function drawBlessing(now, t) {
    const k = (now - modal.t0) / 1000;
    if (!modal.sung) {
      modal.sung = true;
      audio.sfx('angel_appear');
    }
    rect(0, 0, W, H, '#14051C');
    if (k < 0.3) {
      ctx.globalAlpha = 1 - k / 0.3;
      rect(0, 0, W, H, COL.white);
      ctx.globalAlpha = 1;
    }
    // falling golden petals
    for (let j = 0; j < 26; j++) {
      const x = (j * 37 + Math.floor(Math.sin(t + j) * 6)) % W;
      const y = Math.floor((j * 53 + t * (14 + (j % 5) * 4)) % (H + 10)) - 5;
      rect(x, y, j % 3 ? 1 : 2, 1, j % 2 ? COL.yellow : '#DEB350');
    }
    bulbPanel(6, 6, 168, 306, t);
    // the mascot (นวลนภา) blessing the player's bird
    ctx.drawImage(rays[Math.floor(t * 6) % RAY_N], 10, 10);
    rect(52, 13, 76, 13, COL.black);
    text('BLESSING', 90, 16, COL.yellow, 'c');
    const m = G.getSprite('nuannapa', 'front', Math.floor(t * 3) % 5 === 4 ? 'blink' : 'idle0');
    const hy = Math.round(Math.sin(t * 2) * 2);
    rect(28, 120, 40, 3, COL.black);
    ctx.drawImage(m, 48 - m.width, 120 - m.height * 2 + hy, m.width * 2, m.height * 2);
    rect(110, 120, 40, 3, COL.black);
    drawBird(130, 120, 1.5, t);
    sparkle(90, 60 + hy, Math.floor(t * 4) % 2 === 0);
    sparkle(84, 86, Math.floor(t * 4) % 2 === 1);
    sparkle(98, 100, Math.floor(t * 3) % 2 === 0);
    // the blessing, line by line
    box(14, 134, 152, 112, COL.black, '#DEB350');
    rect(16, 136, 148, 1, COL.dmagenta);
    rect(16, 243, 148, 1, COL.dmagenta);
    const per = 0.7;
    BLESSING.forEach((ln, j) => {
      const a = Math.max(0, Math.min(1, (k - 0.4 - j * per) / 0.4));
      if (modal.skip) ctx.globalAlpha = 1;
      else ctx.globalAlpha = a;
      if (modal.skip || a > 0) thaiS(ln, 90, 142 + j * 25, j % 2 ? COL.white : COL.yellow, ln.length > 18 ? 14 : 15);
      ctx.globalAlpha = 1;
    });
    const done = modal.skip || k > 0.4 + BLESSING.length * per;
    if (!done) {
      hit('skip', { x: 0, y: 0, w: W, h: H }, () => (modal.skip = true), 0);
      return;
    }
    const B = { x: 18, y: 260, w: 144, h: 22 };
    bigButton(B, 'ดูสรุปผล', pressed === 'tosum', t);
    if (Math.floor(t * 4) % 2) {
      sparkle(B.x + 3, B.y - 3, true);
      sparkle(B.x + B.w - 4, B.y + B.h + 2, false);
    }
    hit('tosum', B, () => {
      audio.sfx('choice_press');
      openSummary();
    });
    text('LAANAPHA HALLOWEEN FEST', 90, 294, COL.dmagenta, 'c');
  }

  let mysteryBox = null;
  // Checkpoint 8, the mystery box (owner, 25 Oct): hold for the next hint, or skip.
  function drawMystery(now, t) {
    const cp = CHECKPOINTS.find((c) => c.id === modal.id) || CHECKPOINTS.find((c) => c.hints);
    const hints = cp.hints || [];
    const n = Math.min(store.hints, hints.length);
    dim(0.9);
    bulbPanel(6, 8, 168, 304, t);
    // the box on a beam of light, shaking now and then
    const shake = Math.floor(t * 1.5) % 3 === 0 ? Math.round(Math.sin(t * 40) * 2) : 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(10, 46, 160, 76);
    ctx.clip();
    ctx.drawImage(rays[Math.floor(t * 6) % RAY_N], 10, 4);
    ctx.restore();
    mysteryBox ??= stickerize(drawSticker('mystery'), 2);
    const mb = mysteryBox;
    ctx.drawImage(mb, Math.round(90 - mb.width) + shake, 118 - mb.height * 2, mb.width * 2, mb.height * 2);
    sparkle(44, 60, Math.floor(t * 4) % 2 === 0);
    sparkle(136, 108, Math.floor(t * 4) % 2 === 1);
    text(`CHECKPOINT ${CHECKPOINTS.indexOf(cp) + 1}`, 90, 18, COL.magenta, 'c');
    thaiS('MYSTERY BOX', 90, 26, COL.yellow, 16);
    para('จุดสุดท้ายคือกล่องปริศนา! หาให้เจอแล้วสแกน QR', 14, 124, 152, COL.white, 12, 14, 'c');
    // the hints so far
    hints.forEach((h, i) => {
      const y = 160 + i * 23;
      const open_ = i < n;
      box(12, y, 156, 20, COL.black, open_ ? COL.yellow : COL.dred);
      if (open_) {
        const s = `${i + 1}. ${h}`;
        thai(s, 17, y - 1, COL.yellow, thaiWidth(s, 12) > 146 ? 11 : 12, 'l');
      } else {
        thai(`คำใบ้ที่ ${i + 1}`, 17, y - 1, COL.dred, 12, 'l');
        // a little padlock
        rect(152, y + 9, 8, 6, COL.dred);
        rect(154, y + 5, 1, 4, COL.dred);
        rect(157, y + 5, 1, 4, COL.dred);
        rect(154, y + 5, 4, 1, COL.dred);
      }
    });
    const B = { x: 14, y: 232, w: 152, h: 26 };
    if (n < hints.length) {
      const held = pressed === 'hint' ? Math.min(1, (now - holdStart) / HOLD_MS) : 0;
      rect(B.x - 1, B.y - 1, B.w + 2, B.h + 2, COL.yellow);
      rect(B.x, B.y, B.w, B.h, COL.black);
      rect(B.x + 1, B.y + 1, Math.round((B.w - 2) * held), B.h - 2, COL.magenta);
      if (!held && Math.floor(t * 2) % 2) rect(B.x + 1, B.y + B.h - 3, B.w - 2, 2, COL.dmagenta);
      thaiS(held ? 'กดค้างไว้...' : `กดค้างเพื่อรับคำใบ้ที่ ${n + 1}`, 90, B.y + 2, COL.yellow, 14);
      if (held > 0 && Math.floor(held * 10) !== modal.tick) {
        modal.tick = Math.floor(held * 10);
        audio.sfx('type_blip', { voice: 'ghost' });
        buzz(8);
      }
      if (held >= 1) {
        pressed = null;
        store.hint(hints.length);
        audio.sfx('letter_chime');
        buzz([30, 40, 60]);
      }
      hit('hint', B, () => {}, 4);
    } else {
      bigButton(B, 'ไปหากล่องปริศนาเลย!', pressed === 'go', t);
      hit('go', B, () => {
        audio.sfx('choice_press');
        close();
        say('ต่อไป: MYSTERY BOX', 3500);
      });
    }
    const SK = { x: 30, y: 270, w: 120, h: 16 };
    smallButton(SK, 'ข้าม · รู้คำตอบแล้ว', pressed === 'skip', { px: 12 });
    hit('skip', SK, () => {
      click();
      close();
      say('ต่อไป: MYSTERY BOX', 3500);
    });
    text('FIND IT, SCAN IT', 90, 296, COL.dmagenta, 'c');
  }

  function drawScan(now, t) {
    rect(0, 0, W, H, COL.black);
    bulbPanel(26, 5, 128, 26, t);
    thai(modal.entry ? 'สแกน QR หน้างาน' : 'สแกน QR', 90, 7, COL.yellow, 13);
    const v = VIEW;
    rect(v.x - 3, v.y - 3, v.w + 6, v.h + 6, COL.yellow);
    if (camStatus === 'live') {
      place(video, v);
      video.style.display = 'block';
      ctx.clearRect(v.x, v.y, v.w, v.h);
      const L = 14;
      ctx.fillStyle = COL.magenta;
      [[v.x + 6, v.y + 6, 1, 1], [v.x + v.w - 7, v.y + 6, -1, 1], [v.x + 6, v.y + v.h - 7, 1, -1], [v.x + v.w - 7, v.y + v.h - 7, -1, -1]].forEach(([x, y, sx, sy]) => {
        ctx.fillRect(sx > 0 ? x : x - L + 1, y, L, 2);
        ctx.fillRect(x, sy > 0 ? y : y - L + 1, 2, L);
      });
      const ly = v.y + 8 + Math.round(((Math.sin(t * 2.4) + 1) / 2) * (v.h - 16));
      rect(v.x + 8, ly, v.w - 16, 1, COL.magenta);
    } else {
      video.style.display = 'none';
      rect(v.x, v.y, v.w, v.h, COL.ddred);
      ctx.drawImage(ghostBig, v.x + v.w / 2 - 10, v.y + 22 + Math.round(Math.sin(t * 2) * 3));
      const lines = {
        starting: ['กำลังเปิดกล้อง...', 'กด "อนุญาต" ให้ใช้กล้องนะ'],
        denied: ['ไม่ได้รับอนุญาตใช้กล้อง', 'ลองถ่ายรูป QR หรือพิมพ์รหัส'],
        unsupported: ['เบราว์เซอร์นี้เปิดกล้องไม่ได้', 'ลองถ่ายรูป QR แทน'],
        nocamera: ['ไม่เจอกล้องในเครื่องนี้', modal.entry ? 'ลองถ่ายรูป QR แทน' : 'ลองพิมพ์รหัสใต้ QR'],
        failed: ['เปิดกล้องไม่สำเร็จ', modal.entry ? 'ลองถ่ายรูป QR แทน' : 'ลองถ่ายรูป QR หรือพิมพ์รหัส'],
      }[camStatus] || ['', ''];
      thai(lines[0], 90, v.y + 58, COL.yellow, 12);
      thai(lines[1], 90, v.y + 76, COL.white, 12);
    }
    const bad = modal.badUntil && now < modal.badUntil;
    thai(bad ? 'QR นี้ไม่ใช่ของลานนภา' : 'เล็งกล้องไปที่ป้าย QR', 90, 182, bad ? COL.magenta : COL.white, 12);
    const left = store.timeLeft();
    if (!modal.entry) {
      ctx.drawImage(clockIcon, 66, 203);
      if (store.timed) textS(fmtTime(left), 80, 205, left < 5 * 60000 ? COL.magenta : COL.yellow);
      else textS(fmtTime(store.timeUsed()), 80, 205, COL.yellow);
    }
    if (modal.entry) {
      // locked: only scanning the entry QR lets the player in (camera, or a photo of it)
      const P = { x: 40, y: 222, w: 100, h: 18 };
      smallButton(P, 'ถ่ายรูป QR', pressed === 'photo', { px: 12 });
      hit('photo', P, () => {
        click();
        fileInput.click();
      });
      thai('ใช้ได้เฉพาะ QR หน้างาน', 90, 246, COL.dred, 12);
      closeButton({ x: 40, y: 282, w: 100, h: 18 }, 'ยกเลิก', () => {
        close();
        open('gate');
      });
      return;
    }
    const P = { x: 10, y: 222, w: 76, h: 18 };
    const T = { x: 94, y: 222, w: 76, h: 18 };
    smallButton(P, 'ถ่ายรูป QR', pressed === 'photo', { px: 12 });
    hit('photo', P, () => {
      click();
      fileInput.click();
    });
    smallButton(T, 'พิมพ์รหัส', pressed === 'type', { px: 12 });
    hit('type', T, () => {
      click();
      openInput('cp', { x: 20, y: 132, w: 140, h: 22 });
    });
    thai('รหัสพิมพ์อยู่ใต้ QR', 90, 246, COL.dred, 12);
    closeButton({ x: 40, y: 282, w: 100, h: 18 }, 'ยกเลิก');
  }

  function drawInput(now, t) {
    dim(0.85);
    bulbPanel(10, 80, 160, 148, t);
    const title = { cp: 'พิมพ์รหัสเช็กพอยต์', save: 'กรอกโค้ดย้ายเครื่อง', name: 'ชื่อของคุณ' }[modal.mode];
    const sub = { cp: 'ดูรหัสใต้ QR', save: 'โค้ดจากเครื่องเดิม', name: 'จะโชว์ในหน้าสรุป' }[modal.mode];
    thaiS(title, 90, 90, COL.yellow, 13);
    thai(sub, 90, 108, COL.white, 12);
    const f = modal.field;
    rect(f.x - 2, f.y - 2, f.w + 4, f.h + 4, COL.yellow);
    rect(f.x, f.y, f.w, f.h, COL.black);
    place(input, f);
    const OK = { x: 22, y: 168, w: 136, h: 18 };
    bigButton(OK, 'ตกลง', pressed === 'ok', t);
    hit('ok', OK, () => {
      audio.sfx('choice_press');
      submitInput();
    });
    closeButton({ x: 50, y: 200, w: 80, h: 14 }, 'ยกเลิก', () => {
      const back = modal.back;
      close();
      if (back) open(back);
    });
  }

  function drawTransfer(now, t) {
    dim(0.85);
    bulbPanel(6, 30, 168, 262, t);
    thaiS('ย้ายไปเครื่องอื่น', 90, 40, COL.yellow, 13);
    let y = 62;
    y += para('สติกเกอร์และเวลาบันทึกในเบราว์เซอร์นี้ ถ้าจะเปิดในแอปอื่นหรือเครื่องอื่น ส่งลิงก์นี้ไป', 16, y, 148, COL.white, 12, 14) + 6;
    const code = store.exportCode();
    box(14, y, 152, 22, COL.black, COL.magenta);
    textS(code, 90, y + 8, COL.yellow, 'c');
    y += 30;
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
      openInput('save', { x: 20, y: 132, w: 140, h: 22 });
    });
    y += 24;
    if (!store.durable) para('เบราว์เซอร์นี้ปิดการบันทึกไว้ (โหมดส่วนตัว) ข้อมูลจะหายเมื่อปิดเว็บ', 16, y, 148, COL.magenta, 12, 14);
    closeButton({ x: 50, y: 270, w: 80, h: 14 });
  }

  function drawHelp(now, t) {
    dim(0.85);
    bulbPanel(6, 24, 168, 274, t);
    thaiS('วิธีเล่น', 90, 33, COL.yellow, 13);
    const steps = [
      ['เริ่มที่โต๊ะลงทะเบียน', 'สแกน QR จุด START'],
      ['ทำภารกิจทีละจุด', 'สำเร็จแล้ว สแกน QR ที่จุดนั้น'],
      ['เก็บครบ 8 ดวง', 'ดูสรุป บันทึกรูป'],
    ];
    let y = 58;
    steps.forEach((s, i) => {
      rect(14, y + 3, 15, 15, COL.magenta);
      text(String(i + 1), 19, y + 7, COL.black);
      thai(s[0], 35, y - 2, COL.yellow, 12, 'l');
      thai(s[1], 35, y + 13, COL.white, 12, 'l');
      y += 36;
    });
    const ex = art.cp2?.sticker;
    if (ex) {
      rect(36, y, 44, 44, COL.dred);
      rect(37, y + 1, 42, 42, COL.black);
      textS('?', 58, y + 18, COL.yellow, 'c');
      text('>', 87, y + 18, COL.yellow);
      rect(100, y, 44, 44, COL.black);
      rect(101, y + 1, 42, 42, COL.magenta);
      ctx.drawImage(ex, 122 - Math.round(ex.width / 2), y + 22 - Math.round(ex.height / 2));
      y += 52;
    }
    thai('บันทึกในเครื่องอัตโนมัติ', 90, y - 2, COL.green, 12);
    thai('ปิดเว็บแล้วกลับมา ก็ยังอยู่', 90, y + 13, COL.green, 12);
    const B = { x: 30, y: 274, w: 120, h: 16 };
    bigButton(B, 'เข้าใจแล้ว', pressed === 'close', t);
    hit('close', B, () => {
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

  /** Clock sounds and the end of the hunt. */
  function tickClock() {
    const st = store.status();
    if (st === 'running') {
      const left = store.timeLeft();
      const sec = Math.ceil(left / 1000);
      if (left < 60000 && sec !== lastBeat) {
        lastBeat = sec;
        audio.sfx(sec <= 10 ? 'timer_tick' : 'heartbeat');
      }
    }
    if (st === 'timeout' && !endSeen && !fly && (!modal || ['scan', 'detail', 'help', 'transfer'].includes(modal.type))) {
      audio.sfx('gameover');
      buzz([200, 100, 200]);
      openSummary('หมดเวลา!');
    }
  }

  /** Locked: scan the QR at the event's entrance to join. */
  /** Locked: the QR at the event is the password. A countdown to the opening, then the scan. */
  function drawGate(now, t) {
    dim(0.9);
    bulbPanel(6, 20, 168, 282, t);
    text('TRICK OR TREAT', 90, 30, COL.yellow, 'c');
    // a padlock over a ghost
    const gy = 42 + Math.round(Math.sin(t * 2) * 2);
    ctx.drawImage(ghostBig, 80, gy);
    rect(82, 72, 16, 12, COL.yellow);
    rect(83, 73, 14, 10, COL.olive);
    rect(89, 76, 2, 4, COL.black);
    rect(84, 65, 2, 7, COL.yellow);
    rect(94, 65, 2, 7, COL.yellow);
    rect(84, 64, 12, 2, COL.yellow);
    thaiS('สแกน QR CODE หน้างาน', 90, 88, COL.yellow, 13);
    thai('ที่โต๊ะลงทะเบียน (START)', 90, 106, COL.white, 13);
    thai('QR คือรหัสเข้าเกม', 90, 124, COL.green, 12);
    // countdown to the opening
    const left = msUntilOpen();
    box(12, 146, 156, 74, COL.black, COL.magenta);
    if (left > 0) {
      thai('เกมเปิด ' + HUNT_DAYS_TH, 90, 146, COL.magenta, 12);
      const sec = Math.ceil(left / 1000);
      const parts = [
        [Math.floor(sec / 86400), 'วัน'],
        [Math.floor((sec % 86400) / 3600), 'ชม.'],
        [Math.floor((sec % 3600) / 60), 'นาที'],
        [sec % 60, 'วิ'],
      ];
      parts.forEach(([v, label], i) => {
        const x = 20 + i * 36;
        box(x, 164, 32, 38, COL.black, i === 3 && Math.floor(t * 2) % 2 ? COL.magenta : COL.yellow);
        bigText(K, String(v).padStart(2, '0'), x + 16, 169, COL.yellow, 'c', 2);
        thai(label, x + 16, 183, COL.white, 11);
      });
      thai('ตั้งแต่ 12:00 น.', 90, 203, COL.white, 11);
    } else {
      thaiS('เปิดแล้ว!', 90, 152, COL.yellow, 16);
      thai('ภารกิจ 8 จุด ไม่จำกัดเวลา', 90, 176, COL.magenta, 12);
      thai('เก็บสติกเกอร์ให้ครบ 8 ดวง', 90, 192, COL.white, 12);
    }
    text('SCAN THE QR AT THE EVENT', 90, 227, COL.yellow, 'c');
    const B = { x: 18, y: 240, w: 144, h: 20 };
    bigButton(B, 'สแกน QR หน้างาน', pressed === 'gscan', t, qrIcon);
    hit('gscan', B, () => {
      audio.sfx('choice_press');
      startScan();
    });
    closeButton({ x: 40, y: 274, w: 100, h: 16 }, 'กลับหน้าแรก', () => onBack?.());
  }

  const DRAW = { gate: drawGate, detail: drawDetail, reveal: drawReveal, reward: drawReward, blessing: drawBlessing, mystery: drawMystery, input: drawInput, start: drawStart, transfer: drawTransfer, help: drawHelp };

  // ---- scene 1 scene ----
  const scene = {
    enter(data = {}) {
      active = true;
      hits = [];
      onEnter?.();
      if (data.character?.id) store.unlock(data.character);
      else if (!store.state.unlocked && !data.gate) store.unlock(G.selected?.());
      if (!artReady) prepareArt();
      audio.ambient('night');
      audio.mood('title');
      endSeen = ended(); // an old finished hunt does not pop the summary by itself
      if (!store.entered && !data.scan) open('gate'); // locked: nothing but the gate
      if (data.scan) setTimeout(() => collect(data.scan), 450);
      else if (store.entered && store.status() === 'idle') setTimeout(() => openInput('start', START_FIELD), 300);
      if (data.toast) showToast(data.toast, 2400);
    },
    draw(now, t) {
      hits = [];
      if (artReady && artSeed !== store.state.seed) prepareArt();
      ctx.imageSmoothingEnabled = false;
      tickClock();
      const scare = modal?.type === 'reveal' && (now - modal.t0) / 1000 < SCARE_S;
      ctx.save();
      if (scare) ctx.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 6));
      if (modal?.type === 'scan') drawScan(now, t);
      else if (modal?.type === 'summary') drawSummary(now, t);
      else if (!store.entered) {
        K.sky(t, 100);
        rect(0, 100, W, H - 100, COL.black);
        if (!modal || modal.type === 'detail') open('gate');
        hits = [];
        DRAW[modal.type]?.(now, t);
      } else {
        drawBoard(now, t);
        if (!modal) drawFly(now);
        else {
          hits = []; // only the dialog takes taps
          DRAW[modal.type]?.(now, t);
        }
      }
      ctx.restore();
      drawToast(now);
    },
    onTap() {},
    exit() {
      active = false;
      close();
      fly = null;
      onExit?.();
    },
  };
  return { scene, collect, open, openSummary };
}
