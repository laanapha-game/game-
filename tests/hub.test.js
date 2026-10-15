// Sticker hub save data and QR parsing (src/hub/store.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, parseScan, encodeSave, decodeSave, STORAGE_KEY, HUNT_MS } from '../src/hub/store.js';
import { CHECKPOINTS, TOTAL } from '../src/data/checkpoints.js';

function memory() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('8 checkpoints with unique ids and codes', () => {
  assert.equal(TOTAL, 8);
  assert.equal(new Set(CHECKPOINTS.map((c) => c.id)).size, 8);
  assert.equal(new Set(CHECKPOINTS.map((c) => c.code)).size, 8);
});

test('parseScan reads the stall URL, the bare code, any case, and rejects others', () => {
  assert.equal(parseScan('https://laanapha.com/?cp=LNP-K7QX2M'), 'cp1');
  assert.equal(parseScan('https://www.laanapha.com/?utm=x&cp=lnp-r4wn9p'), 'cp2');
  assert.equal(parseScan('LNP-T8HV3C'), 'cp3');
  assert.equal(parseScan(' m2zd6k '), 'cp4');
  assert.equal(parseScan('lnp p9fj4t'), 'cp5');
  assert.equal(parseScan('https://laanapha.com/'), null);
  assert.equal(parseScan('https://example.com/?cp=NOPE'), null);
  assert.equal(parseScan('hello'), null);
  assert.equal(parseScan(''), null);
  assert.equal(parseScan(null), null);
});

test('collecting is saved and survives a reload', () => {
  const be = memory();
  const s = createStore(be);
  assert.equal(s.count(), 0);
  s.unlock({ id: 'vampire', name: 'v' });
  assert.equal(s.collect('cp3', 1000), 'new');
  assert.equal(s.collect('cp3', 2000), 'dup');
  assert.equal(s.collect('nope'), 'unknown');
  const again = createStore(be);
  assert.equal(again.count(), 1);
  assert.equal(again.state.stamps.cp3, 1000);
  assert.equal(again.state.character.id, 'vampire');
  assert.equal(again.state.unlocked, true);
});

test('broken or foreign save data starts fresh instead of crashing', () => {
  const be = memory();
  be.setItem(STORAGE_KEY, '{not json');
  assert.equal(createStore(be).count(), 0);
  be.setItem(STORAGE_KEY, JSON.stringify({ stamps: { cp1: 5, evil: 1, cp2: 'x' }, unlocked: 1 }));
  const s = createStore(be);
  assert.equal(s.count(), 1);
  assert.deepEqual(Object.keys(s.state.stamps), ['cp1']);
});

test('claim only when all 8 are collected, once', () => {
  const s = createStore(memory());
  for (const cp of CHECKPOINTS.slice(0, 7)) s.collect(cp.id);
  assert.equal(s.complete(), false);
  assert.equal(s.claim(), false);
  s.collect('cp8');
  assert.equal(s.complete(), true);
  assert.equal(s.claim(123), true);
  assert.equal(s.claim(456), false);
  assert.equal(s.state.claimedAt, 123);
});

test('transfer code round-trips (stickers, character, clock) and merges into another browser', () => {
  const a = createStore(memory());
  a.unlock({ id: 'onryo' });
  const t0 = Date.UTC(2026, 9, 24, 12, 0);
  a.start('มิว', t0);
  ['cp1', 'cp4', 'cp8'].forEach((id, i) => a.collect(id, t0 + (i + 1) * 60000));
  const code = a.exportCode();
  assert.match(code, /^LNP-[0-9A-Z]{4,12}$/);
  const d = decodeSave(code);
  assert.equal(d.mask, 0b10001001);
  assert.equal(d.character, 'onryo');
  assert.equal(d.startedAt, t0);
  assert.equal(d.finishedAt, null);
  const b = createStore(memory());
  b.collect('cp2', t0 + 30000);
  assert.equal(b.importCode(code.toLowerCase(), t0 + 300000), true);
  assert.equal(b.count(), 4);
  assert.equal(b.state.character.id, 'onryo');
  assert.equal(b.state.startedAt, t0); // the earlier start wins
  assert.equal(b.importCode('LNP-00000'), false);
  const bad = code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A');
  assert.equal(decodeSave(bad), null);
});

test('finished time survives a transfer', () => {
  const a = createStore(memory());
  const t0 = Date.UTC(2026, 9, 24, 18, 0);
  a.start('', t0);
  CHECKPOINTS.forEach((cp, i) => a.collect(cp.id, t0 + (i + 1) * 90000));
  const d = decodeSave(a.exportCode());
  assert.equal(d.finishedAt - d.startedAt, 8 * 90000);
});

test('45-minute clock: idle, running, complete in time, timeout blocks new stickers', () => {
  const s = createStore(memory());
  const t0 = 1_000_000;
  assert.equal(s.status(t0), 'idle');
  assert.equal(s.timeLeft(t0), HUNT_MS);
  s.start('Ploy', t0);
  assert.equal(s.state.name, 'Ploy');
  assert.equal(s.status(t0 + 60000), 'running');
  assert.equal(s.timeLeft(t0 + 60000), HUNT_MS - 60000);
  s.collect('cp1', t0 + 120000);
  assert.equal(s.status(t0 + HUNT_MS), 'timeout');
  assert.equal(s.collect('cp2', t0 + HUNT_MS + 1), 'timeout');
  assert.equal(s.count(), 1);
  assert.equal(s.timeUsed(t0 + HUNT_MS + 5000), HUNT_MS);

  const c = createStore(memory());
  c.start('', t0);
  CHECKPOINTS.forEach((cp, i) => c.collect(cp.id, t0 + (i + 1) * 60000));
  assert.equal(c.status(t0 + HUNT_MS * 2), 'complete');
  assert.equal(c.timeUsed(t0 + HUNT_MS * 2), 8 * 60000);
});

test('the first scan starts the clock if start was never pressed', () => {
  const s = createStore(memory());
  s.collect('cp3', 5000);
  assert.equal(s.state.startedAt, 5000);
  assert.equal(s.status(6000), 'running');
});

test('encodeSave of an empty state decodes to nothing collected', () => {
  const d = decodeSave(encodeSave({ stamps: {}, claimedAt: null, character: null }));
  assert.deepEqual(d, { mask: 0, claimed: false, character: null, startedAt: null, finishedAt: null });
});
