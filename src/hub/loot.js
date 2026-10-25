// What each player gets at each checkpoint: their own sticker (one of two designs in one of
// four colourways) and an item for their bird. Picked from the player's seed (a random number
// made once per phone and kept in the save), so no two players end with the same collection
// and the same player always sees the same stickers. Pure data, no drawing (tests use it).
import { CHECKPOINTS } from '../data/checkpoints.js';

/** Sticker colourways, rarest last. w: chance in percent. */
export const COLORWAYS = [
  { id: 'classic', th: 'ลายปกติ', tag: '', w: 46 },
  { id: 'neon', th: 'ชมพูนีออน', tag: 'NEON', w: 26 },
  { id: 'ghost', th: 'ผีน้ำเงิน', tag: 'GHOST', w: 17 },
  { id: 'gold', th: 'ทองคำ', tag: 'GOLD', w: 11 },
];

/** The bird items each checkpoint can give (4 each), by where they go on the bird. */
export const ITEMS = {
  cp1: { slot: 'neck', th: 'ที่คอ', items: [['bowtie', 'โบว์ไทแดง'], ['garland', 'พวงมาลัย'], ['medal', 'เหรียญ START'], ['bell', 'กระดิ่งทอง']] },
  cp2: { slot: 'pet', th: 'สัตว์เลี้ยง', items: [['spider', 'แมงมุมจิ๋ว'], ['bat', 'ค้างคาวน้อย'], ['ghost', 'ผีจิ๋ว'], ['jack', 'ฟักทองลอยได้']] },
  cp3: { slot: 'eyes', th: 'แว่นตา', items: [['round', 'แว่นกลม'], ['shades', 'แว่นดำเท่'], ['mask', 'หน้ากากนักหนี'], ['glasses3d', 'แว่นสามมิติ']] },
  cp4: { slot: 'right', th: 'ของถือ', items: [['flag', 'ธงเข้าเส้นชัย'], ['trophy', 'ถ้วยแชมป์'], ['wheel', 'พวงมาลัยรถ'], ['balloon', 'ลูกโป่งผี']] },
  cp5: { slot: 'hat', th: 'หมวก', items: [['witch', 'หมวกแม่มด'], ['pumpkinhat', 'หมวกฟักทอง'], ['hardhat', 'หมวกนักขุด'], ['crown', 'มงกุฎทอง']] },
  cp6: { slot: 'aura', th: 'ออร่า', items: [['batwings', 'ปีกค้างคาว'], ['angelwings', 'ปีกนางฟ้า'], ['halo', 'วงแหวนเทวดา'], ['wisps', 'ไฟวิญญาณ']] },
  cp7: { slot: 'hair', th: 'ทรงผม', items: [['bow', 'โบว์ยักษ์'], ['flower', 'ดอกไม้ทัดหู'], ['mohawk', 'ผมทรงโมฮอว์ก'], ['braids', 'ผมเปียคู่']] },
  cp8: { slot: 'left', th: 'ของกิน', items: [['lollipop', 'อมยิ้ม'], ['icecream', 'ไอติม'], ['skewer', 'ไม้ลูกชิ้น'], ['popcorn', 'ป๊อปคอร์น']] },
};

const SEED_MAX = 0xffffff; // 24 bits (fits the transfer code)

/** A new random seed, 1 .. 2^24-1. */
export function newSeed(rand = Math.random) {
  let n = 0;
  try {
    const a = new Uint32Array(1);
    globalThis.crypto.getRandomValues(a);
    n = a[0] & SEED_MAX;
  } catch {
    n = Math.floor(rand() * SEED_MAX);
  }
  return n || 1;
}
export const validSeed = (s) => Number.isInteger(s) && s > 0 && s <= SEED_MAX;

function mix(a, b) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

/**
 * The loot of checkpoint `i` (0-7) for a seed.
 * @returns {{ design: 0|1, color: object, item: { id, th, slot, slotTh } }}
 */
export function lootFor(seed, i) {
  const cp = CHECKPOINTS[i];
  const h = mix(seed >>> 0, i + 1);
  const design = h & 1;
  let roll = (h >>> 1) % 100;
  let color = COLORWAYS[0];
  for (const c of COLORWAYS) {
    if (roll < c.w) {
      color = c;
      break;
    }
    roll -= c.w;
  }
  const set = ITEMS[cp.id];
  const [id, th] = set.items[(h >>> 9) % set.items.length];
  return { design, color, item: { id, th, slot: set.slot, slotTh: set.th } };
}

/** Every checkpoint's loot for a seed (index order). */
export const allLoot = (seed) => CHECKPOINTS.map((_, i) => lootFor(seed, i));

/** The player's tag on the card, e.g. "#4K2Q9". */
export const playerTag = (seed) => '#' + (seed >>> 0).toString(36).toUpperCase().padStart(5, '0');
