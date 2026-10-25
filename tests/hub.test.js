// Sticker hub save data and QR parsing (src/hub/store.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore as makeStore, parseScan, encodeSave, decodeSave, STORAGE_KEY, HUNT_MS as CONFIG_HUNT_MS } from '../src/hub/store.js';
// most tests use a 45-minute clock (the store supports one; the event runs without: HUNT_MINUTES null)
const HUNT_MS = 45 * 60000;
const createStore = (be) => makeStore(be, { huntMs: HUNT_MS });
import { CHECKPOINTS, TOTAL } from '../src/data/checkpoints.js';
import { hashCode } from '../src/hub/codehash.js';
import { readFileSync } from 'node:fs';
import { OPENS_MS, isOpen, msUntilOpen, STAFF_HASH } from '../src/hub/clock.js';

function memory() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('8 checkpoints with unique ids and code hashes', () => {
  assert.equal(TOTAL, 8);
  assert.equal(new Set(CHECKPOINTS.map((c) => c.id)).size, 8);
  assert.equal(new Set(CHECKPOINTS.map((c) => c.hash)).size, 8);
  const codes = JSON.parse(readFileSync('tools/qr-codes.json', 'utf8'));
  for (const cp of CHECKPOINTS) assert.equal(hashCode(codes[cp.id]), cp.hash, `${cp.id}: run npm run qr`);
});

test('the page source holds no plain checkpoint code', () => {
  const codes = JSON.parse(readFileSync('tools/qr-codes.json', 'utf8'));
  const src = readFileSync('src/data/checkpoints.js', 'utf8') + readFileSync('src/hub/store.js', 'utf8');
  for (const [id, code] of Object.entries(codes)) if (!id.startsWith('_') && code.length > 3) assert.ok(!src.includes(code), `${code} is in the source`);
});

test('the printed QR codes still map to checkpoints 1-8 in order', () => {
  const codes = JSON.parse(readFileSync('tools/qr-codes.json', 'utf8'));
  CHECKPOINTS.forEach((cp, i) => assert.equal(parseScan(codes[`cp${i + 1}`]), cp.id));
  assert.equal(CHECKPOINTS[0].name, 'START');
});

test('parseScan reads the checkpoint URL or the typed code, any case and punctuation', () => {
  assert.equal(parseScan('https://laanapha.com/?cp=Sunset'), 'cp1');
  assert.equal(parseScan('https://www.laanapha.com/?utm=x&cp=movienight'), 'cp2');
  assert.equal(parseScan('LAANAPHALOVER'), 'cp3');
  assert.equal(parseScan('https://laanapha.com/?cp=Trickortreat123!'), 'cp4');
  assert.equal(parseScan('https://laanapha.com/?cp=Trickortreat123%21'), 'cp4');
  assert.equal(parseScan('trick or treat 123'), 'cp4');
  assert.equal(parseScan(' keep moving '), 'cp5');
  assert.equal(parseScan('StayGreat'), 'cp6');
  assert.equal(parseScan('you only live once'), 'cp7');
  assert.equal(parseScan('run'), 'cp8');
  assert.equal(parseScan('https://laanapha.com/'), null);
  assert.equal(parseScan('LNP-K7QX2M'), null); // the old placeholder codes are gone
  assert.equal(parseScan('Sunrise'), null);
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
  assert.match(code, /^LNP-[0-9A-Z]{4,16}$/);
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
  assert.deepEqual(d, { mask: 0, claimed: false, character: null, startedAt: null, finishedAt: null, seed: null });
});

test('the hunt opens at 12:00 Thai time on 24 Oct 2026', () => {
  assert.equal(new Date(OPENS_MS).toISOString(), '2026-10-24T05:00:00.000Z');
  assert.equal(isOpen(Date.UTC(2026, 9, 24, 4, 59, 59), true), false);
  assert.equal(isOpen(Date.UTC(2026, 9, 24, 5, 0, 0), true), true);
  assert.equal(msUntilOpen(Date.UTC(2026, 9, 24, 4, 0, 0)), 3600000);
});

test('the staff code is only in the page as a hash', () => {
  const codes = JSON.parse(readFileSync('tools/qr-codes.json', 'utf8'));
  assert.equal(hashCode(codes._staff), STAFF_HASH);
  assert.ok(!readFileSync('src/hub/clock.js', 'utf8').includes(codes._staff));
});

test('the entry QR unlocks the hunt; a checkpoint QR does too', () => {
  const codes = JSON.parse(readFileSync('tools/qr-codes.json', 'utf8'));
  assert.equal(parseScan(`https://laanapha.com/?cp=${codes._entry}`), 'entry');
  const s = createStore(memory());
  assert.equal(s.entered, false);
  assert.equal(s.enter(), true);
  assert.equal(s.enter(), false);
  assert.equal(s.entered, true);
  const c = createStore(memory());
  c.collect('cp2', 1000);
  assert.equal(c.entered, true);
});

test('no time limit at the event (owner, 25 Oct): the clock only measures', () => {
  assert.equal(CONFIG_HUNT_MS, Infinity);
  const s = makeStore(memory());
  assert.equal(s.timed, false);
  s.start('', 1000);
  assert.equal(s.status(1000 + 5 * 3600000), 'running');
  assert.equal(s.collect('cp2', 1000 + 5 * 3600000), 'new');
  assert.equal(s.timeUsed(1000 + 2 * 3600000), 2 * 3600000);
});

test('time lock off (owner, 23 Oct): the hunt is open any time; the entry QR is the lock', () => {
  assert.equal(isOpen(Date.UTC(2026, 9, 23, 17, 0, 0)), true);
});

import { lootFor, allLoot, ITEMS, COLORWAYS, playerTag } from '../src/hub/loot.js';

test('every phone gets its own seed, kept in the save and in the transfer code', () => {
  const be = memory();
  const a = createStore(be);
  assert.ok(a.state.seed > 0 && a.state.seed <= 0xffffff);
  assert.equal(createStore(be).state.seed, a.state.seed); // survives a reload
  const b = createStore(memory());
  a.collect('cp1', 1000);
  assert.equal(decodeSave(a.exportCode()).seed, a.state.seed);
  b.importCode(a.exportCode(), 2000);
  assert.equal(b.state.seed, a.state.seed); // the moved collection keeps its stickers
});

test('transfer codes made before the seed still work', () => {
  const old = { stamps: { cp1: 1 }, claimedAt: null, character: { id: 'vampire' }, startedAt: null, finishedAt: null, seed: null };
  const d = decodeSave(encodeSave(old));
  assert.equal(d.mask, 1);
  assert.equal(d.seed, null);
});

test('loot: same seed same stickers; different players get different collections', () => {
  assert.deepEqual(allLoot(12345), allLoot(12345));
  const seen = new Set();
  for (let seed = 1; seed <= 2000; seed++) seen.add(JSON.stringify(allLoot(seed).map((l) => [l.design, l.color.id, l.item.id])));
  assert.ok(seen.size >= 1995, `only ${seen.size} different collections in 2000 players`);
  // every design, colourway and item turns up
  const designs = new Set(), colors = new Set(), items = new Set();
  for (let seed = 1; seed <= 400; seed++)
    allLoot(seed).forEach((l) => (designs.add(l.design), colors.add(l.color.id), items.add(l.item.id)));
  assert.equal(designs.size, 2);
  assert.equal(colors.size, COLORWAYS.length);
  assert.equal(items.size, Object.values(ITEMS).reduce((n, s) => n + s.items.length, 0));
  assert.equal(lootFor(7, 2).item.slot, 'eyes');
  assert.match(playerTag(12345), /^#[0-9A-Z]{5}$/);
});

test('checkpoint 8 is the mystery box with 3 hints, shown one at a time and kept', () => {
  const cp8 = CHECKPOINTS[7];
  assert.equal(cp8.name, 'MYSTERY BOX');
  assert.deepEqual(cp8.hints, ['มันอยู่ในกล่อง', 'มันอยู่ทางเข้า', 'คุณเดินผ่านมันมาแล้ว']);
  const be = memory();
  const s = createStore(be);
  assert.equal(s.hints, 0);
  assert.equal(s.hint(3), true);
  assert.equal(s.hint(3), true);
  assert.equal(createStore(be).hints, 2);
  s.hint(3);
  assert.equal(s.hint(3), false);
  assert.equal(s.hints, 3);
});
