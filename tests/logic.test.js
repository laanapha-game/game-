import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stall3Pages, ticketMode, priceLine, resolveToday, bangkokDate, thaiShortDate } from '../src/logic/ticket.js';
import { TapMeter } from '../src/logic/meter.js';
import { ChaseTimer, chaserGapPx, chaserCaught } from '../src/logic/chaseTimer.js';
import { wrapText, graphemes, paginate } from '../src/logic/textWrap.js';

const price = (d) => priceLine(ticketMode(d));

test('date rows from the ticket poster', () => {
  assert.equal(price('2026-10-01'), 'Flash Ticket เปิดขาย 9 ต.ค. ราคา 189 บาท');
  assert.equal(price('2026-10-09'), 'ตอนนี้ Flash Ticket 189 บาท (หนัง + กิจกรรม) วันนี้วันเดียวเท่านั้น!');
  assert.equal(price('2026-10-10'), 'Flash Ticket หมดแล้ว! Early Bird เปิด 12 ต.ค. ราคา 320 บาท');
  assert.equal(price('2026-10-11'), 'Flash Ticket หมดแล้ว! Early Bird เปิด 12 ต.ค. ราคา 320 บาท');
  assert.equal(price('2026-10-12'), 'ตอนนี้ Early Bird 320 บาท (หนัง + กิจกรรม) ขายถึง 16 ต.ค.');
  assert.equal(price('2026-10-16'), 'ตอนนี้ Early Bird 320 บาท (หนัง + กิจกรรม) ขายถึง 16 ต.ค.');
  assert.equal(price('2026-10-17'), 'ตอนนี้ General Ticket 390 บาท (หนัง + กิจกรรม) ขายถึง 23 ต.ค.');
  assert.equal(price('2026-10-23'), 'ตอนนี้ General Ticket 390 บาท (หนัง + กิจกรรม) ขายถึง 23 ต.ค.');
  assert.equal(price('2026-10-24'), 'วันงานซื้อหน้างานได้ 1 Day Pass 450 บาท');
  assert.equal(price('2026-10-25'), 'วันงานซื้อหน้างานได้ 1 Day Pass 450 บาท');
  assert.equal(ticketMode('2026-10-26').mode, 'AFTER_EVENT');
});

test('stall 3 pages: 5 pages normally, after event replaces pages 4-5', () => {
  const pages = stall3Pages('2026-10-12');
  assert.equal(pages.length, 5);
  assert.equal(pages[3], 'ค่าเข้าขึ้นเรทตามช่วงวัน ตอนนี้ Early Bird 320 บาท (หนัง + กิจกรรม) ขายถึง 16 ต.ค.');
  const after = stall3Pages('2026-10-26');
  assert.equal(after.length, 4);
  assert.equal(after[3], 'อ้าว... งานจัดไปแล้วนะเจ้า ไว้พบกันปีหน้า!');
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

test('chaser distance follows the timer bar: bird progress minus chase progress', () => {
  const cfg = { pxPerProgress: 400, minPx: 14, maxPx: 100 };
  assert.equal(chaserGapPx(0.13, 0, cfg), 52); // chase start
  assert.equal(chaserGapPx(0.5, 0.375, cfg), 50); // ahead: further back
  assert.equal(chaserGapPx(0.5, 0.48, cfg), 14); // nearly caught: on the bird's back, never past it
  assert.equal(chaserGapPx(0.4, 0.6, cfg), 14);
  assert.equal(chaserGapPx(0.9, 0.2, cfg), 100); // far ahead: off screen
  assert.equal(chaserCaught(0.5, 0.49), false);
  assert.equal(chaserCaught(0.5, 0.5), true); // icons meet: caught
  assert.equal(chaserCaught(0.3, 0.6), true);
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

test('layer placement is the exact mirror image when flipped, on integer pixels', async () => {
  const { layerTopLeft } = await import('../src/interfaces.js');
  for (const frameWidth of [32, 36]) {
    for (const layerW of [4, 5, 9]) {
      for (const offsetX of [-2, 0, 3]) {
        const base = { frameLeft: 100, frameTop: 200, frameWidth, anchor: { x: 13, y: 8 }, offsetX, offsetY: 1, layerW, layerH: 6 };
        const a = layerTopLeft({ ...base, flipped: false });
        const b = layerTopLeft({ ...base, flipped: true });
        assert.ok([a.x, a.y, b.x, b.y].every(Number.isInteger));
        // [a.x, a.x + w) mirrored inside the frame is [b.x, b.x + w).
        assert.equal(b.x - 100, frameWidth - (a.x - 100 + layerW));
        assert.equal(a.y, b.y);
        assert.equal(a.x, 100 + 13 + offsetX - Math.floor(layerW / 2)); // centre column on the anchor
        assert.equal(a.y + 6, 200 + 8 + 1); // bottom edge on the anchor row (+ offset)
      }
    }
  }
});

test('scene 1 adapter: every exported character maps to the CharacterData contract', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const { adaptScene1Character } = await import('../src/integration/scene1Adapter.js');
  const data = JSON.parse(readFileSync('src/assets/art/characters/characters.json', 'utf8'));
  assert.equal(data.characters.length, 8);
  assert.deepEqual(data.cell, { w: 32, h: 36 });
  for (const sc of data.characters) {
    const c = adaptScene1Character({ id: sc.id, name: sc.name }, data);
    assert.equal(c.id, sc.id);
    assert.equal(c.name, sc.name);
    assert.equal(c.side.facing, 'left'); // scene 1 draws the side view facing left
    assert.deepEqual(c.layers, {}); // costumes are drawn into the frames
    const names = (view, a) => c[view].anims[a].map((i) => data.frames[view][i]);
    assert.deepEqual(names('side', 'run'), ['walk0', 'walk1', 'walk2', 'walk3']);
    assert.deepEqual(names('side', 'idle'), ['idle0', 'idle1']);
    assert.deepEqual(names('side', 'struggle'), ['struggle0', 'struggle1']);
    assert.deepEqual(names('side', 'scared'), ['scared']);
    for (const a of ['surprised', 'relieved', 'happy', 'idle']) assert.ok(c.front.anims[a].every((i) => i >= 0), a);
    for (const view of ['side', 'front']) {
      assert.ok(existsSync(`src/assets/art/characters/${sc[view].file}`));
      for (const n of ['headTop', 'eye']) {
        const p = c[view].anchors[n];
        assert.ok(p.x >= 0 && p.x < 32 && p.y >= 0 && p.y < 36, `${view} ${n}`);
      }
      // Off-palette pixels against scene 1's own palette must be zero (asset rules).
      assert.deepEqual(sc.report.offPalette, {});
      assert.equal(sc.report.softAlpha, 0);
    }
  }
  assert.equal(adaptScene1Character({ id: 'nobody' }, data), null);
});

test('Krahang-riding art exists for every scene 1 character, 2 frames, feet centred', async () => {
  const { readFileSync } = await import('node:fs');
  const data = JSON.parse(readFileSync('src/assets/art/characters/characters.json', 'utf8'));
  const combo = JSON.parse(readFileSync('src/assets/art/characters/krahang_combo.json', 'utf8'));
  assert.deepEqual(combo.frames, ['struggle0', 'struggle1']);
  assert.equal(combo.feet.x * 2, combo.frame.w); // character centred, so origin 0.5 keeps it on BIRD_X
  assert.equal(combo.feet.y, combo.frame.h);
  for (const c of data.characters) {
    const e = combo.characters[c.id];
    assert.ok(e, c.id);
    const png = readFileSync(`src/assets/art/characters/${e.file}`);
    // PNG IHDR: width at byte 16, height at byte 20.
    assert.equal(png.readUInt32BE(16), combo.frame.w * combo.renderScale * 2, c.id);
    assert.equal(png.readUInt32BE(20), combo.frame.h * combo.renderScale, c.id);
    assert.ok(e.krahangCentre[0] > 0, `${c.id}: Krahang on the back (right of the feet)`);
  }
});

test('music patterns use known instruments, sane notes and lengths', async () => {
  const { MOODS } = await import('../src/audio/music.js');
  const INSTR = ['box', 'pluck', 'bass', 'pad', 'stab', 'organ', 'clav', 'theremin', 'drone', 'scream', 'hat', 'kick', 'snare'];
  for (const [name, m] of Object.entries(MOODS)) {
    for (const x of [0, 0.5, 1]) {
      assert.ok(m.bpm(x) >= 60 && m.bpm(x) <= 180, name);
      let notes = 0;
      for (let st = 0; st < m.length; st++) {
        for (const [inst, midi, len, g] of m.notes(st, x)) {
          assert.ok(INSTR.includes(inst), `${name} ${inst}`);
          assert.ok(Number.isFinite(midi) && midi >= 0 && midi <= 108, `${name} step ${st} midi ${midi}`);
          assert.ok(len > 0 && g > 0 && g <= 0.35, `${name} step ${st}`);
          notes++;
        }
      }
      assert.ok(notes > m.length / 2, `${name} has music in it`);
    }
  }
});

test('chase timer: setRate makes the rest of the time run faster, time spent is kept', async () => {
  const { ChaseTimer } = await import('../src/logic/chaseTimer.js');
  let now = 0;
  const t = new ChaseTimer(120, () => now);
  t.start();
  now = 60_000; // 60 s at normal speed
  assert.equal(t.remainingS(), 60);
  t.setRate(1.5);
  assert.equal(t.remainingS(), 60);
  now += 20_000; // 20 s at 1.5x = 30 s of chase time
  assert.equal(t.remainingS(), 30);
  assert.equal(t.remainingRealS(), 20); // 30 s of chase time left at 1.5x = 20 real s
  now += 20_000;
  assert.equal(t.remainingS(), 0);
  assert.ok(t.expired);
});

test('Latin runs such as 7-Eleven are not split', () => {
  const measure = (s) => graphemes(s).length * 6;
  const lines = wrapText('ตามซอยราชพฤกษ์ 6 ใกล้ 7-Eleven ลานนภา', 90, measure);
  assert.ok(lines.some((l) => l.includes('7-Eleven')), lines.join('|'));
});

test('long URLs break after a slash, not mid-word', () => {
  const measure = (s) => graphemes(s).length * 6;
  const lines = wrapText('ซื้อบัตรได้ที่ hellobooku.com/laanapha2026', 120, measure);
  assert.ok(lines.includes('hellobooku.com/') || lines.some((l) => l.endsWith('hellobooku.com/')), lines.join('|'));
  assert.ok(lines.some((l) => l.startsWith('laanapha2026')), lines.join('|'));
});

test('a quoted phrase stays in one piece', () => {
  const measure = (s) => graphemes(s).length * 6;
  const lines = wrapText('เดินต่อไปตาม "ซอยราชพฤกษ์ 6"', 100, measure);
  assert.deepEqual(lines, ['เดินต่อไปตาม', '"ซอยราชพฤกษ์ 6"']);
});
