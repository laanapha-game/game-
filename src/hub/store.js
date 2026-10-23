// Sticker hub save data. Kept in this browser's localStorage, so it survives closing the
// page, reloading and coming back later. A short transfer code moves it to another
// browser (for example from Instagram's in-app browser to Safari).
import { CHECKPOINTS, HUNT_MINUTES, ENTRY_HASH } from '../data/checkpoints.js';
import { hashCode, normCode } from './codehash.js';

export const HUNT_MS = HUNT_MINUTES * 60 * 1000;

// v2 (24 Oct): the hunt is locked until a QR is scanned. Old saves (tests, earlier versions)
// are left behind, so every phone starts locked.
export const STORAGE_KEY = 'laanapha.stickers.v2';

/** Character ids in scene 1's order (for the transfer code). */
export const CHARACTER_IDS = ['nuannapa', 'ramwong', 'pumpkin', 'vampire', 'slasher', 'onryo', 'mahidol', 'silpakorn'];

export function emptyState() {
  return { v: 1, character: null, name: '', unlocked: false, stamps: {}, claimedAt: null, startedAt: null, finishedAt: null, seenHelp: false, entered: false };
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
  out.entered = !!s.entered;
  if (typeof s.finishedAt === 'number') out.finishedAt = s.finishedAt;
  if (typeof s.name === 'string') out.name = s.name.slice(0, 24);
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
      persist();
    },
    /** @returns {'new'|'dup'|'unknown'|'timeout'} */
    collect(id, now = Date.now()) {
      if (!CHECKPOINTS.some((cp) => cp.id === id)) return 'unknown';
      if (state.stamps[id]) return 'dup';
      if (this.status(now) === 'timeout') return 'timeout';
      state.stamps[id] = now;
      state.entered = true; // a checkpoint QR also proves the player is at the event
      if (!state.startedAt) state.startedAt = now;
      if (this.complete() && !state.finishedAt) state.finishedAt = now;
      persist();
      return 'new';
    },
    /** Start the hunt clock (once). */
    start(name, now = Date.now()) {
      if (typeof name === 'string' && name.trim()) state.name = name.trim().slice(0, 24);
      if (!state.startedAt) state.startedAt = now;
      persist();
    },
    setName(name) {
      state.name = String(name || '').trim().slice(0, 24);
      persist();
    },
    /** The entry QR at the event was scanned (or a checkpoint): the hunt is unlocked. */
    get entered() {
      return !!state.entered;
    },
    enter() {
      const first = !state.entered;
      state.entered = true;
      persist();
      return first;
    },
    /** Extra time earned so far (checkpoints with bonusMinutes, collected in time). */
    bonusMs() {
      return CHECKPOINTS.reduce((ms, cp) => ms + (cp.bonusMinutes && state.stamps[cp.id] ? cp.bonusMinutes * 60000 : 0), 0);
    },
    /** The whole clock: HUNT_MS plus the bonuses earned. */
    limitMs() {
      return HUNT_MS + this.bonusMs();
    },
    /** 'idle' (clock not started) | 'running' | 'complete' (8/8 in time) | 'timeout' */
    status(now = Date.now()) {
      if (state.finishedAt) return 'complete';
      if (!state.startedAt) return 'idle';
      return now - state.startedAt >= this.limitMs() ? 'timeout' : 'running';
    },
    /** ms left on the clock */
    timeLeft(now = Date.now()) {
      if (!state.startedAt) return HUNT_MS;
      const end = state.finishedAt || now;
      return Math.max(0, this.limitMs() - (end - state.startedAt));
    },
    /** ms the player used (until 8/8, or the whole clock on a timeout) */
    timeUsed(now = Date.now()) {
      if (!state.startedAt) return 0;
      return Math.min(this.limitMs(), (state.finishedAt || now) - state.startedAt);
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
      // a transfer code moves stickers, not the entry: the QR at the event is still needed
      if (d.startedAt && (!state.startedAt || d.startedAt < state.startedAt)) state.startedAt = d.startedAt;
      if (d.finishedAt && !state.finishedAt) state.finishedAt = d.finishedAt;
      if (this.complete() && !state.finishedAt) state.finishedAt = now;
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

/**
 * What a scanned QR (or a typed code) points at.
 * Accepts the full URL (…?cp=<code>) or the code itself, any case, spaces and punctuation ignored.
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
  if (!normCode(raw)) return null;
  const h = hashCode(raw);
  if (h === ENTRY_HASH) return 'entry';
  return CHECKPOINTS.find((cp) => cp.hash === h)?.id || null;
}

// ---------- transfer code ----------
// Packs the stickers (8 bits), claimed (1), character (4), when the clock started (minutes
// since 2026-01-01, 20 bits, 0 = not started) and the seconds used when finished (12 bits,
// 0 = not finished), then an 8-bit check, in base 36: "LNP-" + about 11 characters.
// The check only guards against typos.
const EPOCH = Date.UTC(2026, 0, 1);
function check(n) {
  let h = 0x811c9dc5;
  for (const ch of n.toString(16)) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return BigInt((h >>> 24) & 0xff);
}

export function encodeSave(state) {
  let mask = 0;
  CHECKPOINTS.forEach((cp, i) => {
    if (state.stamps[cp.id]) mask |= 1 << i;
  });
  const ci = CHARACTER_IDS.indexOf(state.character?.id);
  const startMin = state.startedAt ? Math.min(0xfffff, Math.max(1, Math.round((state.startedAt - EPOCH) / 60000))) : 0;
  const usedSec = state.finishedAt && state.startedAt ? Math.min(0xfff, Math.max(1, Math.round((state.finishedAt - state.startedAt) / 1000))) : 0;
  let n = BigInt(mask) | (BigInt(state.claimedAt ? 1 : 0) << 8n) | (BigInt(ci < 0 ? 15 : ci) << 9n) | (BigInt(startMin) << 13n) | (BigInt(usedSec) << 33n);
  const v = (n << 8n) | check(n);
  return 'LNP-' + v.toString(36).toUpperCase();
}

export function decodeSave(code) {
  const m = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').match(/^LNP([0-9A-Z]{2,12})$/);
  if (!m) return null;
  let v = 0n;
  for (const ch of m[1]) v = v * 36n + BigInt(parseInt(ch, 36));
  const n = v >> 8n;
  if (n >= 1n << 45n || (v & 0xffn) !== check(n)) return null;
  const num = (shift, bits) => Number((n >> BigInt(shift)) & ((1n << BigInt(bits)) - 1n));
  const startMin = num(13, 20);
  const usedSec = num(33, 12);
  const startedAt = startMin ? EPOCH + startMin * 60000 : null;
  return {
    mask: num(0, 8),
    claimed: !!num(8, 1),
    character: CHARACTER_IDS[num(9, 4)] || null,
    startedAt,
    finishedAt: startedAt && usedSec ? startedAt + usedSec * 1000 : null,
  };
}
