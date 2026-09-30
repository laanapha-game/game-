import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stall3Pages, ticketMode, priceLine, resolveToday, bangkokDate, thaiShortDate } from '../src/logic/ticket.js';
import { TapMeter } from '../src/logic/meter.js';
import { ChaseTimer, chaserStage } from '../src/logic/chaseTimer.js';
import { wrapText, graphemes, paginate } from '../src/logic/textWrap.js';

const price = (d) => priceLine(ticketMode(d));

test('date rows from the test checklist (spec 10)', () => {
  assert.equal(price('2026-09-28'), 'Flash Ticket เปิดขาย 29 ก.ย. ราคา 189 บาท');
  assert.equal(price('2026-09-29'), 'ตอนนี้ Flash Ticket 189 บาท (หนัง + กิจกรรม) วันนี้วันเดียวเท่านั้น!');
  assert.equal(price('2026-09-30'), 'Flash Ticket หมดแล้ว! Early Bird เปิด 12 ต.ค. ราคา 320 บาท');
  assert.equal(price('2026-10-11'), 'Flash Ticket หมดแล้ว! Early Bird เปิด 12 ต.ค. ราคา 320 บาท');
  assert.equal(price('2026-10-12'), 'ตอนนี้ Early Bird 320 บาท (หนัง + กิจกรรม) ขายถึง 14 ต.ค.');
  assert.equal(price('2026-10-14'), 'ตอนนี้ Early Bird 320 บาท (หนัง + กิจกรรม) ขายถึง 14 ต.ค.');
  assert.equal(price('2026-10-15'), 'Early Bird หมดแล้ว! General Ticket เปิด 18 ต.ค. ราคา 390 บาท');
  assert.equal(price('2026-10-17'), 'Early Bird หมดแล้ว! General Ticket เปิด 18 ต.ค. ราคา 390 บาท');
  assert.equal(price('2026-10-18'), 'ตอนนี้ General Ticket 390 บาท (หนัง + กิจกรรม) ขายถึง 23 ต.ค.');
  assert.equal(price('2026-10-23'), 'ตอนนี้ General Ticket 390 บาท (หนัง + กิจกรรม) ขายถึง 23 ต.ค.');
  assert.equal(price('2026-10-24'), 'วันงานซื้อหน้างานได้ 1 Day Pass 450 บาท');
  assert.equal(price('2026-10-25'), 'วันงานซื้อหน้างานได้ 1 Day Pass 450 บาท');
  assert.equal(ticketMode('2026-10-26').mode, 'AFTER_EVENT');
});

test('stall 3 pages: 4 pages normally, after event replaces pages 2-4', () => {
  assert.equal(stall3Pages('2026-10-12').length, 4);
  const after = stall3Pages('2026-10-26');
  assert.equal(after.length, 2);
  assert.equal(after[1], 'อ้าว... งานจัดไปแล้วนะเจ้า ไว้พบกันปีหน้า!');
});

test('Bangkok date and dev override', () => {
  // 2026-09-29 18:00 UTC is 2026-09-30 01:00 in Bangkok.
  assert.equal(bangkokDate(new Date('2026-09-29T18:00:00Z')), '2026-09-30');
  const now = new Date('2026-09-29T18:00:00Z');
  assert.equal(resolveToday({ now, search: '?today=2026-10-24', isDev: true }), '2026-10-24');
  assert.equal(resolveToday({ now, search: '?today=2026-10-24', isDev: false }), '2026-09-30');
  assert.equal(resolveToday({ now, search: '?today=bad', isDev: true }), '2026-09-30');
  assert.equal(thaiShortDate('2026-10-14'), '14 ต.ค.');
});

test('tap meter fills, decays, clamps', () => {
  const m = new TapMeter(0.06, 0.1);
  m.update(1);
  assert.equal(m.value, 0);
  for (let i = 0; i < 16; i++) m.tap();
  assert.ok(m.value > 0.95 && !m.full);
  m.update(1);
  assert.ok(Math.abs(m.value - 0.86) < 1e-9);
  for (let i = 0; i < 3; i++) m.tap();
  assert.equal(m.value, 1);
  assert.ok(m.full);
  m.update(5);
  assert.equal(m.value, 1, 'no decay once full');
});

test('chase timer never pauses and chaser stages', () => {
  let t = 0;
  const timer = new ChaseTimer(120, () => t);
  assert.equal(timer.remainingS(), 120);
  timer.start();
  t = 30_000;
  assert.equal(timer.remainingS(), 90);
  t = 130_000;
  assert.equal(timer.remainingS(), 0);
  assert.ok(timer.expired);
  const th = [90, 60, 30, 15];
  assert.equal(chaserStage(120, th), 0);
  assert.equal(chaserStage(90, th), 1);
  assert.equal(chaserStage(59, th), 2);
  assert.equal(chaserStage(20, th), 3);
  assert.equal(chaserStage(15, th), 4);
});

test('Thai wrapping keeps grapheme clusters and fits the width', () => {
  assert.deepEqual(graphemes('ที่'), ['ที่']);
  const measure = (s) => graphemes(s).length * 6;
  const text = 'รีบเดินทางไปที่ลานนภาเสียนะ ก่อนที่ลูกพี่มัจจุราชตัวม่วงของผมจะจับคุณกินเสียก่อน';
  const lines = wrapText(text, 152, measure);
  assert.ok(lines.length > 1);
  for (const l of lines) assert.ok(measure(l) <= 152, l);
  assert.equal(lines.join('').replace(/\s/g, ''), text.replace(/\s/g, ''));
  assert.deepEqual(paginate(['a', 'b', 'c'], 2), [['a', 'b'], ['c']]);
});

test('anchors mirror when the side sheet is flipped', async () => {
  const { createPlaceholderCharacter, anchorFor } = await import('../src/interfaces.js');
  const c = createPlaceholderCharacter();
  const a = c.side.anchors.eye;
  assert.deepEqual(anchorFor(c, 'side', 'eye', false), a);
  assert.deepEqual(anchorFor(c, 'side', 'eye', true), { x: 31 - a.x, y: a.y });
});

test('Latin runs such as 7-Eleven are not split', () => {
  const measure = (s) => graphemes(s).length * 6;
  const lines = wrapText('ตามซอยราชพฤกษ์ 6 ใกล้ 7-Eleven ลานนภา', 90, measure);
  assert.ok(lines.some((l) => l.includes('7-Eleven')), lines.join('|'));
});
