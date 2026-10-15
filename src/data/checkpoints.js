// The 8 checkpoints of the sticker hunt (scene 3), in walking order.
// Everything the event team may want to change lives here.
//
// QR codes: each checkpoint's QR holds   https://laanapha.com/?cp=<code>
// (npm run qr prints them to docs/qr/). Scanning it with the phone camera opens the site and
// collects the sticker; the in-game scan button reads the same QR (or the typed code).
// Changing a code makes the old printed QR stop working.

export const SITE_URL = 'https://laanapha.com';

/** The hunt clock: counts down from the moment the player presses start (or scans first). */
export const HUNT_MINUTES = 45;

/** Where the prize is collected when all 8 are found. TODO(owner): real prize and place. */
export const REWARD = {
  title: 'ของรางวัลลานนภา',
  where: 'หน้าบ้านลานนภา',
  howTo: 'ให้สตาฟกดค้างปุ่มด้านล่าง',
};

// art: the sticker.
//   { draw: '<name>' }            pixel art drawn in code (src/hub/stickers.js)
//   { sheet, frames, frame, flip, tint }   a frame of a sprite strip in src/assets/art
// stall: stall art behind it in the detail view, A (yellow), B (magenta), C (black/yellow), or null.
// where: TODO(owner) where each checkpoint stands at the event.
export const CHECKPOINTS = [
  {
    id: 'cp1',
    code: 'LNP-K7QX2M',
    name: 'ผงพราย',
    title: 'ขวดผงต้องห้าม',
    stall: 'A',
    art: { draw: 'powder' },
    brief: 'ผงบดจากคางของผีตายทั้งกลม โรยใส่ใคร คนนั้นจะหลงจนถอนตัวไม่ขึ้น... ระวังอย่าให้ปลิวโดนตัว',
    where: 'จุดที่ 1 ปากซอยทางเข้า',
  },
  {
    id: 'cp2',
    code: 'LNP-R4WN9P',
    name: 'คุณไสย',
    title: 'ตุ๊กตาฟางปักเข็ม',
    stall: 'B',
    art: { draw: 'doll' },
    brief: 'เข็มเล่มใหม่ถูกปักลงบนตุ๊กตาฟาง ที่ไหนสักแห่ง ใครบางคนกำลังเจ็บตรงจุดเดียวกัน',
    where: 'จุดที่ 2',
  },
  {
    id: 'cp3',
    code: 'LNP-T8HV3C',
    name: 'หนังควาย',
    title: 'หนังควายเข้าท้อง',
    stall: 'C',
    art: { draw: 'hide' },
    brief: 'หนังควายแห้งชิ้นเท่าเล็บ ถูกเสกให้ไปพองอยู่ในท้อง หมอที่ไหนก็หาสาเหตุไม่เจอ',
    where: 'จุดที่ 3',
  },
  {
    id: 'cp4',
    code: 'LNP-M2ZD6K',
    name: 'ผีกระหัง',
    title: 'ปีกกระด้งกลางดึก',
    stall: 'A',
    art: { sheet: 'krahang', frames: 8, frame: 0, flip: true },
    brief: 'ได้ยินเสียงกระด้งกระพือเหนือหลังคาไหม? นั่นกระหังออกหากิน อย่าเผลอเงยหน้ามอง',
    where: 'จุดที่ 4',
  },
  {
    id: 'cp5',
    code: 'LNP-P9FJ4T',
    name: 'ศาลเจ้าที่',
    title: 'ศาลหน้าบ้าน',
    stall: null,
    art: { draw: 'shrine' },
    brief: 'จะเข้าบ้านใครต้องบอกเจ้าที่ก่อน คนที่ลบหลู่ คืนนั้นจะมีใครมายืนอยู่ปลายเตียง',
    where: 'จุดที่ 5',
  },
  {
    id: 'cp6',
    code: 'LNP-W3XB7R',
    name: 'กุมารทอง',
    title: 'เด็กทองมุมห้อง',
    stall: 'B',
    art: { sheet: 'stall_ghost_5', frames: 2, frame: 0, tint: 'gold' },
    brief: 'เสียงเด็กหัวเราะคิกคักอยู่มุมห้อง ทั้งที่บ้านนี้ไม่มีเด็ก... อย่าลืมวางน้ำแดงไว้ให้เขา',
    where: 'จุดที่ 6',
  },
  {
    id: 'cp7',
    code: 'LNP-H6NQ2V',
    name: 'ตะปู',
    title: 'ตะปูตอกโลง',
    stall: 'C',
    art: { draw: 'nails' },
    brief: 'ตะปูที่ถูกถอนออกจากฝาโลง ใครเก็บไว้ เจ้าของโลงจะตามมาทวงคืนทุกคืน',
    where: 'จุดที่ 7',
  },
  {
    id: 'cp8',
    code: 'LNP-C5LT8Y',
    name: 'ผีปอบ',
    title: 'ปอบหิวตอนตีสาม',
    stall: null,
    art: { sheet: 'chaser_red', frames: 7, frame: 0, flip: true },
    brief: 'ปอบชอบตับไตไส้พุงสดๆ ถ้าเห็นยายข้างบ้านยิ้มให้ตอนตีสาม... วิ่ง อย่าหันหลังกลับ',
    where: 'จุดที่ 8 ปลายทางหน้าบ้าน',
  },
];

export const TOTAL = CHECKPOINTS.length;
