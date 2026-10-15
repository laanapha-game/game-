// Scene 3: the sticker hunt ("HOME" after scene 2). The player has 45 minutes to walk the
// event to 8 checkpoints, scan each one's QR and collect its sticker. Drawn into scene 1's own
// 180 x 320 canvas (LannaphaGame.ctx) with scene 1's brand kit, registered as scene 1's 'scene3'.
//
// Screens (all in the one canvas): start (name + start the clock), the board (8 sticker
// slots on a winding road + the prize, the clock), checkpoint details, the scanner, the
// reveal (scare, then "you found it", a short scary story, the sticker flies into the
// collection), the summary card (saved as an image), the staff prize claim, moving progress
// to another browser, and how to play. Progress is saved by store.js.
import { W, H, COL, kit, mkCanvas, sprite, ghostSprite, pumpkinSprite, moonSprite, houseImage, drawHouseWindows, silhouette, stickerize, thaiWidth } from './brand.js';
import { CHECKPOINTS, REWARD, TOTAL, SITE_URL, HUNT_MINUTES } from '../data/checkpoints.js';
import { parseScan } from './store.js';
import { startCamera, decodeFile } from './scanner.js';
import { drawSticker, tintGold } from './stickers.js';
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
const HOLD_MS = 1500;
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
  const art = {}; // id -> { big, bigLocked, sticker, locked, lockedDim, mini, miniLocked, stall }
  let artReady = false;
  async function prepareArt() {
    const stalls = {};
    for (const k of ['A', 'B', 'C']) stalls[k] = await loadImg(stallUrl('stall_' + k));
    for (const cp of CHECKPOINTS) {
      const a = cp.art;
      let big = null;
      let src = null; // high-detail source for scaled-down copies
      if (a.draw) {
        big = drawSticker(a.draw);
        src = big;
      } else if (a.sheet) {
        const img = await loadImg(artUrl(a.sheet));
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
      big = fit(big, 70, 64);
      const small = fit(src, 34, 34);
      const mini = fit(src, 26, 28);
      const locked = silhouette(small, COL.black);
      art[cp.id] = {
        big,
        bigLocked: silhouette(big, COL.black),
        sticker: stickerize(small, 2),
        locked,
        lockedDim: silhouette(small, COL.ddred),
        lockedRed: silhouette(big, '#8F0F0F'),
        mini: stickerize(mini, 1),
        miniLocked: silhouette(mini, COL.ddred),
        stall: cp.stall ? stalls[cp.stall] : null,
        stallLocked: cp.stall && stalls[cp.stall] ? silhouette(stalls[cp.stall], COL.black) : null,
      };
    }
    artReady = true;
  }

  // ---- DOM helpers for the camera, typed text and the saved image (over scene 1's canvas) ----
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
  viewerHint.innerHTML = 'กดค้างที่รูป แล้วเลือก <b>บันทึกรูปภาพ</b><br>จากนั้นเปิด IG Story แล้วแท็ก <b>@laanapha</b>';
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
    input.placeholder = { cp: 'LNP-XXXXXX', save: 'LNP-XXXXXXXX', name: 'ชื่อของคุณ', start: 'ชื่อของคุณ' }[mode];
    input.autocapitalize = mode === 'cp' || mode === 'save' ? 'characters' : 'words';
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
    say(`เริ่ม! มีเวลา ${HUNT_MINUTES} นาที`, 4000);
  }

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
      stickers: CHECKPOINTS.map((cp) => ({ got: store.has(cp.id), mini: art[cp.id]?.mini, locked: art[cp.id]?.miniLocked })),
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`,
      getSprite: (id, view, frame) => G.getSprite(id, view, frame),
    };
  }
  // The story image is made as soon as the summary opens, so the save tap can open the
  // share sheet straight away (iOS only allows it right after a tap).
  let story = null; // { key, blob, dataUrl }
  const storyKey = () => JSON.stringify([store.state.stamps, store.state.name, store.state.finishedAt, store.status(), character()]);
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
    if (h && h.id === was && h.id !== 'claim') h.fn();
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
    if (st === 'complete') return 'ครบ 8 ดวงแล้ว! เก่งมาก';
    if (st === 'timeout') return 'หมดเวลาแล้ว...';
    if (st === 'idle') return 'พร้อมล่าผีหรือยัง?';
    if (n === 0) return 'เดินไปหาจุดแรกเลย!';
    return n >= 5 ? `ใกล้แล้ว! อีก ${TOTAL - n} ดวง` : `เก่งมาก! อีก ${TOTAL - n} ดวง`;
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
    const label = { idle: 'เวลา', running: 'เหลือ', complete: 'ใช้ไป', timeout: 'หมด' }[st];
    thai(label, 70, 58, COL.white, 12, 'l');
    const ms = st === 'complete' ? store.timeUsed() : left;
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
    G.drawChar(character(), 'front', blink, cx, 91, 1, hy);
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
      open('detail', { id: cp.id });
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
    thai(ended() ? 'สรุปผล' : 'รางวัล', x + TILE / 2, y + 26, done || st === 'timeout' ? COL.yellow : COL.dred, 12);
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
    if (st === 'idle') {
      bigButton(SCAN_BTN, `เริ่มจับเวลา ${HUNT_MINUTES} นาที`, pressed === 'scan', t, clockIcon);
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
      bigButton(SCAN_BTN, 'รับรางวัล!', pressed === 'scan', t, giftIcon);
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
      ['เดินหาจุดเช็กพอยต์', 'ทั้งหมด 8 จุดในงาน'],
      ['สแกน QR ที่แต่ละจุด', 'สะสมสติกเกอร์ผีให้ครบ'],
      [`เก็บให้ครบใน ${HUNT_MINUTES} นาที`, 'แลกของรางวัลลานนภา'],
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
    bigButton(B, 'เริ่มจับเวลา!', pressed === 'go', t, clockIcon);
    hit('go', B, () => {
      audio.sfx('choice_press');
      startHunt();
    });
    thai(`นาฬิกาเริ่มนับ ${HUNT_MINUTES}:00 ทันทีที่กด`, 90, 256, COL.magenta, 12);
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
    thaiS(got ? cp.name : '? ? ?', 90, 36, COL.yellow, 13);
    thai(got ? cp.title : `จุดที่ ${i + 1}`, 90, 52, COL.white, 12);
    diorama(cp, 14, 72, 152, 76, got, t);
    let y = 153;
    if (got) {
      const d = new Date(store.state.stamps[cp.id]);
      const pad = (v) => String(v).padStart(2, '0');
      box(14, y, 152, 18, COL.black, COL.green);
      ctx.drawImage(checkIcon, 20, y + 5);
      thai(`เก็บเมื่อ ${d.getDate()}/${d.getMonth() + 1} · ${pad(d.getHours())}:${pad(d.getMinutes())} น.`, 94, y - 2, COL.green, 12);
      y += 24;
      y += para(cp.brief, 16, y, 148, COL.white, 12, 14) + 4;
    } else {
      box(14, y, 152, 18, COL.black, COL.magenta);
      thai('หาจุดนี้ให้เจอ แล้วสแกน QR', 90, y - 2, COL.magenta, 12);
      y += 24;
      y += para('สแกนแล้วจะรู้ว่ามีอะไรซ่อนอยู่... ถ้ากล้าพอ', 16, y, 148, COL.white, 12, 14) + 4;
    }
    ctx.drawImage(pinIcon, 16, y + 4);
    para(cp.where, 26, y, 138, COL.yellow, 12, 14);
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
    thaiS('ยินดีด้วย! คุณเจอมันแล้ว', 90, 12, COL.yellow, 14);
    thai(`คุณมาถึง CHECKPOINT ${i + 1} แล้ว`, 90, 32, COL.white, 12);
    if (a) {
      const s = a.sticker;
      const bounce = kr < 0.25 ? Math.round((1 - kr / 0.25) * -14) : kr < 0.4 ? -Math.round(Math.sin(((kr - 0.25) / 0.15) * Math.PI) * 4) : Math.round(Math.sin(t * 3) * 1.5);
      ctx.drawImage(s, Math.round(90 - s.width), Math.round(112 - s.height) + bounce, s.width * 2, s.height * 2);
      [[40, 66], [140, 78], [46, 150], [134, 144]].forEach((p, j) => sparkle(p[0], p[1], (Math.floor(t * 5) + j) % 2 === 0));
    }
    box(12, 162, 156, 22, COL.black, COL.magenta);
    thaiS(`จุดที่ ${i + 1} · ${cp.name}`, 90, 162, COL.yellow, 13);
    // the scary story, typed out
    box(8, 189, 164, 82, COL.black, COL.dred);
    const lines = wrapText(cp.brief, 152, (str) => thaiWidth(str, 12));
    const total = lines.reduce((n, l) => n + graphemes(l).length, 0);
    const shown = modal.typed ? total : Math.floor(Math.max(0, kr - 0.35) * TYPE_CPS);
    let left = shown;
    lines.slice(0, 5).forEach((ln, j) => {
      if (left <= 0) return;
      const g = graphemes(ln);
      thai(g.slice(0, left).join(''), 14, 190 + j * 15, COL.white, 12, 'l');
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
            if (complete) setTimeout(() => openSummary('ครบ 8 ดวงแล้ว!'), 500);
            else say(`เก็บแล้ว! อีก ${TOTAL - store.count()} ดวง`, 3500);
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
    const done = store.status() === 'complete';
    if (done) {
      // the prize button pops up once all 8 are in
      const k = Math.min(1, (now - modal.t0) / 450);
      const rise = Math.round((1 - k) ** 2 * 30);
      const R = { x: 8, y: 295 + rise, w: 84, h: 16 };
      bigButton(R, 'รับรางวัล', pressed === 'prizebtn', t, giftIcon);
      if (Math.floor(t * 4) % 2 === 0) {
        sparkle(R.x + 2, R.y - 3, true);
        sparkle(R.x + R.w - 3, R.y + R.h + 2, false);
      }
      if (k >= 1)
        hit('prizebtn', R, () => {
          audio.sfx('choice_press');
          open('reward');
        });
    }
    const S = done ? { x: 100, y: 295, w: 72, h: 16 } : { x: 8, y: 295, w: 164, h: 16 };
    smallButton(S, done ? 'บันทึกรูป' : 'บันทึกรูปลงสตอรี่', pressed === 'save', { px: 12 });
    hit('save', S, () => {
      audio.sfx('choice_press');
      saveImage();
    });
  }

  function drawReward(now, t) {
    const done = store.complete();
    const claimed = store.state.claimedAt;
    dim(0.88);
    if (!done) {
      bulbPanel(6, 14, 168, 292, t);
      thaiS('ของรางวัลรออยู่!', 90, 24, COL.yellow, 13);
      ctx.drawImage(pumpkinDark, 82, 58);
      thai(`เก็บแล้ว ${store.count()} จาก ${TOTAL} ดวง`, 90, 82, COL.white, 12);
      CHECKPOINTS.forEach((c, i) => ctx.drawImage(store.has(c.id) ? pipOn : pipOff, 30 + i * 15, 104));
      para(`เก็บครบ ${TOTAL} ดวงภายใน ${HUNT_MINUTES} นาที ปุ่มรับรางวัลจะโผล่ขึ้นมา`, 18, 126, 144, COL.white, 12, 15, 'c');
      closeButton({ x: 50, y: 282, w: 80, h: 15 });
      return;
    }
    const k = (now - modal.t0) / 1000;
    if (!modal.cheered) {
      modal.cheered = true;
      modal.confetti = makeConfetti();
      audio.sfx('scene3_chime');
      setTimeout(() => audio.sfx('angel_appear'), 150);
    }
    bulbPanel(4, 4, 172, 312, t);
    thaiS('ยินดีด้วย!', 90, 8, COL.yellow, 18);
    thai('คุณสำเร็จภารกิจ', 90, 32, COL.white, 13);
    thaiS('TRICK OR TREAT แล้ว', 90, 48, COL.magenta, 13);
    // the mascot (นวลนภา) celebrating on a beam of light
    ctx.save();
    ctx.beginPath();
    ctx.rect(10, 68, 160, 92);
    ctx.clip();
    ctx.drawImage(rays[Math.floor(t * 8) % RAY_N], 10, 34);
    (modal.confetti || []).forEach((p) => {
      const kk = (k % 2.6) + 0.1;
      const x = Math.round(p.x + p.vx * kk * 0.6);
      const y = Math.round(p.y - 40 + p.vy * kk * 0.5 + 120 * kk * kk);
      rect(x, y, p.w, 2, p.c);
    });
    const hop = Math.abs(Math.sin(t * 5)) * 8;
    const frame = Math.floor(t * 3) % 4 === 3 ? 'blink' : 'idle0';
    const m = G.getSprite('nuannapa', 'front', frame);
    rect(64, 154, 52, 4, COL.black);
    ctx.drawImage(m, 90 - m.width, 154 - m.height * 2 - Math.round(hop), m.width * 2, m.height * 2);
    // the player's own character cheering next to the mascot
    G.drawChar(character(), 'front', Math.floor(t * 2.2) % 2 ? 'idle1' : 'idle0', 140, 156 - (Math.sin(t * 5 + 1.5) > 0.3 ? 3 : 0), 1, 0);
    sparkle(30, 84, Math.floor(t * 4) % 2 === 0);
    sparkle(150, 78, Math.floor(t * 4) % 2 === 1);
    ctx.restore();
    // who and how fast
    box(12, 162, 156, 20, COL.black, COL.yellow);
    const nm = store.state.name || 'ผู้กล้าไร้นาม';
    thai(nm, 16, 161, COL.yellow, 12, 'l');
    text(`${fmtTime(store.timeUsed())}  8/8`, 164, 169, COL.green, 'r');
    thai('โชว์หน้านี้ให้กับพนักงาน', 90, 184, COL.white, 12);
    thai('ภายในงาน เพื่อรับรางวัล', 90, 199, COL.yellow, 12);
    // live clock: a screenshot will not tick
    const d = new Date();
    const pad = (v) => String(v).padStart(2, '0');
    box(12, 220, 156, 16, COL.black, Math.floor(t * 2) % 2 ? COL.magenta : COL.yellow);
    textS(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, 90, 225, COL.white, 'c');
    if (claimed) {
      const c = new Date(claimed);
      rect(14, 240, 152, 36, COL.magenta);
      rect(16, 242, 148, 32, COL.black);
      rect(18, 244, 144, 28, COL.magenta);
      thai('รับรางวัลแล้ว', 90, 241, COL.black, 16);
      text(`${pad(c.getDate())}/${pad(c.getMonth() + 1)} ${pad(c.getHours())}:${pad(c.getMinutes())}`, 90, 262, COL.black, 'c');
    } else {
      const HB = { x: 16, y: 244, w: 148, h: 22 };
      const holding = pressed === 'claim';
      const kh = holding ? Math.min(1, (now - holdStart) / HOLD_MS) : 0;
      rect(HB.x - 2, HB.y - 2, HB.w + 4, HB.h + 4, COL.yellow);
      rect(HB.x, HB.y, HB.w, HB.h, COL.black);
      rect(HB.x, HB.y, Math.round(HB.w * kh), HB.h, COL.green);
      thai(holding ? 'กดค้างไว้...' : 'พนักงาน: กดค้างเพื่อยืนยัน', 90, HB.y, holding ? COL.black : COL.yellow, 12);
      hit('claim', HB, () => {});
      if (holding && kh >= 1) {
        pressed = null;
        if (store.claim()) {
          audio.sfx('meter_full');
          setTimeout(() => audio.sfx('scene3_chime'), 200);
          buzz([60, 40, 120]);
        }
      }
    }
    closeButton({ x: 50, y: 288, w: 80, h: 16 });
  }

  function drawScan(now, t) {
    rect(0, 0, W, H, COL.black);
    bulbPanel(26, 5, 128, 26, t);
    thai('สแกน QR', 90, 7, COL.yellow, 13);
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
        nocamera: ['ไม่เจอกล้องในเครื่องนี้', 'ลองพิมพ์รหัสใต้ QR'],
        failed: ['เปิดกล้องไม่สำเร็จ', 'ลองถ่ายรูป QR หรือพิมพ์รหัส'],
      }[camStatus] || ['', ''];
      thai(lines[0], 90, v.y + 58, COL.yellow, 12);
      thai(lines[1], 90, v.y + 76, COL.white, 12);
    }
    const bad = modal.badUntil && now < modal.badUntil;
    thai(bad ? 'QR นี้ไม่ใช่ของลานนภา' : 'เล็งกล้องไปที่ป้าย QR', 90, 182, bad ? COL.magenta : COL.white, 12);
    const left = store.timeLeft();
    ctx.drawImage(clockIcon, 66, 203);
    textS(fmtTime(left), 80, 205, left < 5 * 60000 ? COL.magenta : COL.yellow);
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
      [`มีเวลา ${HUNT_MINUTES} นาที`, 'นับถอยหลังตั้งแต่กดเริ่ม'],
      ['เดินหา 8 จุดในงาน', 'กด สแกน QR ที่แต่ละจุด'],
      ['เก็บครบ 8 ดวง', 'ดูสรุป บันทึกรูป รับรางวัล'],
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

  const DRAW = { detail: drawDetail, reveal: drawReveal, reward: drawReward, input: drawInput, start: drawStart, transfer: drawTransfer, help: drawHelp };

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
      endSeen = ended(); // an old finished hunt does not pop the summary by itself
      if (data.scan) setTimeout(() => collect(data.scan), 450);
      else if (store.status() === 'idle') setTimeout(() => openInput('start', START_FIELD), 300);
      if (data.toast) showToast(data.toast, 2400);
    },
    draw(now, t) {
      hits = [];
      ctx.imageSmoothingEnabled = false;
      tickClock();
      const scare = modal?.type === 'reveal' && (now - modal.t0) / 1000 < SCARE_S;
      ctx.save();
      if (scare) ctx.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 6));
      if (modal?.type === 'scan') drawScan(now, t);
      else if (modal?.type === 'summary') drawSummary(now, t);
      else {
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
