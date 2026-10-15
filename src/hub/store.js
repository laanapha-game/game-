// Sticker hub save data. Kept in this browser's localStorage, so it survives closing the
// page, reloading and coming back later. A short transfer code moves it to another
// browser (for example from Instagram's in-app browser to Safari).
import { CHECKPOINTS } from '../data/checkpoints.js';

export const STORAGE_KEY = 'laanapha.stickers.v1';

/** Character ids in scene 1's order (for the transfer code). */
export const CHARACTER_IDS = ['nuannapa', 'ramwong', 'pumpkin', 'vampire', 'slasher', 'onryo', 'mahidol', 'silpakorn'];

export function emptyState() {
  return { v: 1, character: null, unlocked: false, stamps: {}, claimedAt: null, startedAt: null, seenHelp: false };
}

function sanitize(s) {
  const out = emptyState();
  if (!s || typeof s !== 'object') return out;
  if (s.character && typeof s.character.id === 'string') out.character = { id: s.character.id, name: String(s.character.name || '') };
  out.unlocked = !!s.unlocked;
  if (s.stamps && typeof s.stamps === 'object')
    for (const cp of CHECKPOINTS) if (typeof s.stamps[cp.id] === 'number') out.stamps[cp.id] = s.stamps[cp.id];
  if (typeof s.claimedAt === 'number') out.claimedAt = s.claimedAt;
  if (typeof s.startedAt === 'number') out.startedAt = s.startedAt;
  out.seenHelp = !!s.seenHelp;
  return out;
}

function storage() {
  try {
    const ls = globalThis.localStorage;
    const k = '__lnp_probe';
    ls.setItem(k, '1');
    ls.removeItem(k);
    return ls;
  } catch {
    return null;
  }
}

export function createStore(backend = storage()) {
  let mem = null; // when storage is blocked (private mode), progress lives for this visit only
  let state = emptyState();
  try {
    const raw = backend ? backend.getItem(STORAGE_KEY) : null;
    if (raw) state = sanitize(JSON.parse(raw));
  } catch {
    state = emptyState();
  }
  const listeners = new Set();
  const persist = () => {
    const json = JSON.stringify(state);
    try {
      if (backend) backend.setItem(STORAGE_KEY, json);
      else mem = json;
    } catch {
      mem = json;
    }
    listeners.forEach((fn) => fn(state));
  };

  return {
    get state() {
      return state;
    },
    /** false when the browser blocks storage: progress will not survive a reload. */
    get durable() {
      return !!backend;
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    count() {
      return CHECKPOINTS.filter((cp) => state.stamps[cp.id]).length;
    },
    complete() {
      return CHECKPOINTS.every((cp) => state.stamps[cp.id]);
    },
    has(id) {
      return !!state.stamps[id];
    },
    unlock(character) {
      state.unlocked = true;
      if (character?.id) state.character = { id: character.id, name: character.name || '' };
      if (!state.startedAt) state.startedAt = Date.now();
      persist();
    },
    /** @returns {'new'|'dup'|'unknown'} */
    collect(id, now = Date.now()) {
      if (!CHECKPOINTS.some((cp) => cp.id === id)) return 'unknown';
      if (state.stamps[id]) return 'dup';
      state.stamps[id] = now;
      if (!state.startedAt) state.startedAt = now;
      persist();
      return 'new';
    },
    markHelpSeen() {
      state.seenHelp = true;
      persist();
    },
    claim(now = Date.now()) {
      if (!this.complete() || state.claimedAt) return false;
      state.claimedAt = now;
      persist();
      return true;
    },
    /** Merge a transfer code: keeps every sticker from both sides. */
    importCode(code, now = Date.now()) {
      const d = decodeSave(code);
      if (!d) return false;
      CHECKPOINTS.forEach((cp, i) => {
        if (d.mask & (1 << i) && !state.stamps[cp.id]) state.stamps[cp.id] = now;
      });
      if (d.claimed && !state.claimedAt) state.claimedAt = now;
      if (d.character && !state.character) state.character = { id: d.character, name: '' };
      state.unlocked = true;
      if (!state.startedAt) state.startedAt = now;
      persist();
      return true;
    },
    exportCode() {
      return encodeSave(state);
    },
    reset() {
      state = emptyState();
      persist();
    },
  };
}

// ---------- scanning ----------
const norm = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * What a scanned QR (or a typed code) points at.
 * Accepts the full URL (…?cp=LNP-K7QX2M), the code with or without "LNP-", any case.
 * @returns {string|null} checkpoint id
 */
export function parseScan(text) {
  if (!text) return null;
  let raw = String(text).trim();
  try {
    const u = new URL(raw);
    raw = u.searchParams.get('cp') || '';
  } catch {
    /* not a URL: a bare code */
  }
  const n = norm(raw);
  if (!n) return null;
  for (const cp of CHECKPOINTS) {
    const c = norm(cp.code);
    if (n === c || n === c.replace(/^LNP/, '')) return cp.id;
  }
  return null;
}

// ---------- transfer code ----------
// 8 sticker bits, 1 claimed bit, 4 character bits, then an 8-bit check, in base 36:
// "LNP-" + 5 characters. It only guards against typos.
function check(n) {
  return (Math.imul(n ^ 0x5bd1e995, 0x2c1b3c6d) >>> 24) & 0xff;
}

export function encodeSave(state) {
  let mask = 0;
  CHECKPOINTS.forEach((cp, i) => {
    if (state.stamps[cp.id]) mask |= 1 << i;
  });
  const ci = CHARACTER_IDS.indexOf(state.character?.id);
  const n = mask | ((state.claimedAt ? 1 : 0) << 8) | ((ci < 0 ? 15 : ci) << 9);
  const v = n * 256 + check(n);
  return 'LNP-' + v.toString(36).toUpperCase().padStart(5, '0');
}

export function decodeSave(code) {
  const m = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').match(/^LNP([0-9A-Z]{5,6})$/);
  if (!m) return null;
  const v = parseInt(m[1], 36);
  if (!Number.isFinite(v)) return null;
  const n = Math.floor(v / 256);
  if (n >= 1 << 13 || v % 256 !== check(n)) return null;
  const ci = (n >> 9) & 15;
  return { mask: n & 255, claimed: !!((n >> 8) & 1), character: CHARACTER_IDS[ci] || null };
}
