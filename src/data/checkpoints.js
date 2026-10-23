// The 8 checkpoints of the sticker hunt (scene 3), in walking order.
// Everything the event team may want to change lives here.
//
// QR codes: each checkpoint's QR holds   https://laanapha.com/?cp=<code>
// The codes themselves are in tools/qr-codes.json; this file (which ships in the page) only
// holds their hashes. `npm run qr` writes the hashes here and prints the QRs to docs/qr/.
// Scanning a QR with the phone camera opens the site and collects the sticker; the in-game
// scan button reads the same QR, and players can also type the code.
// Changing a code makes the old printed QR stop working.

export const SITE_URL = 'https://laanapha.com';

/** The hunt clock: counts down from the moment the player presses start (or scans first). */
export const HUNT_MINUTES = 45;

// Extra time for clearing a checkpoint in time: `bonusMinutes` on a checkpoint (4 and 6).
// Kept secret: no screen announces it beforehand; it shows only when it is earned.

/** The entry QR at the event's entrance unlocks the hunt (hash written by npm run qr). */
export const ENTRY_HASH = '11arptxyxi6';

/**
 * Time lock. Owner (23 Oct): off. The entry QR at the event is the only lock: scanning it
 * (or a checkpoint QR) lets the player in straight away; anyone else who opens the hunt sees
 * 'สแกน QR CODE หน้างานเพื่อเข้าร่วมเกม'. Set to true to bring back the countdown until HUNT_OPENS_AT.
 */
export const TIME_LOCK = false;
/** When the hunt opens (Thai time, UTC+7), if TIME_LOCK. Before this, the hunt shows a countdown. */
export const HUNT_OPENS_AT = '2026-10-24T12:00:00+07:00';
/** Shown on the countdown. */
export const HUNT_DAYS_TH = '24 - 25 ตุลาคม 2569';
export const HUNT_DAYS_EN = 'GAME WILL START ON 24-25 OCT';

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
    hash: '1culz9q7u18', // code in tools/qr-codes.json (npm run qr)
    name: 'ผงพราย',
    title: 'ขวดผงต้องห้าม',
    stall: 'A',
    art: { draw: 'powder' },
    brief: 'ผงบดจากคางของผีตายทั้งกลม โรยใส่ใคร คนนั้นจะหลงจนถอนตัวไม่ขึ้น... ระวังอย่าให้ปลิวโดนตัว',
    where: 'จุดที่ 1 ปากซอยทางเข้า',
  },
  {
    id: 'cp2',
    hash: '58b0cv9uif', // code in tools/qr-codes.json (npm run qr)
    name: 'คุณไสย',
    title: 'ตุ๊กตาฟางปักเข็ม',
    stall: 'B',
    art: { draw: 'doll' },
    brief: 'เข็มเล่มใหม่ถูกปักลงบนตุ๊กตาฟาง ที่ไหนสักแห่ง ใครบางคนกำลังเจ็บตรงจุดเดียวกัน',
    where: 'จุดที่ 2',
  },
  {
    id: 'cp3',
    hash: '1zo8ssqysb7', // code in tools/qr-codes.json (npm run qr)
    name: 'หนังควาย',
    title: 'หนังควายเข้าท้อง',
    stall: 'C',
    art: { draw: 'hide' },
    brief: 'หนังควายแห้งชิ้นเท่าเล็บ ถูกเสกให้ไปพองอยู่ในท้อง หมอที่ไหนก็หาสาเหตุไม่เจอ',
    where: 'จุดที่ 3',
  },
  {
    id: 'cp4',
    hash: '22iauuxpd79', // code in tools/qr-codes.json (npm run qr)
    bonusMinutes: 10, // +10 min on the clock when collected in time
    name: 'ผีกระหัง',
    title: 'ปีกกระด้งกลางดึก',
    stall: 'A',
    art: { sheet: 'krahang', frames: 8, frame: 0, flip: true },
    brief: 'ได้ยินเสียงกระด้งกระพือเหนือหลังคาไหม? นั่นกระหังออกหากิน อย่าเผลอเงยหน้ามอง',
    where: 'จุดที่ 4',
  },
  {
    id: 'cp5',
    hash: '2dpcw06sria', // code in tools/qr-codes.json (npm run qr)
    name: 'ศาลเจ้าที่',
    title: 'ศาลหน้าบ้าน',
    stall: null,
    art: { draw: 'shrine' },
    brief: 'จะเข้าบ้านใครต้องบอกเจ้าที่ก่อน คนที่ลบหลู่ คืนนั้นจะมีใครมายืนอยู่ปลายเตียง',
    where: 'จุดที่ 5',
  },
  {
    id: 'cp6',
    hash: 'uxq5izf88u', // code in tools/qr-codes.json (npm run qr)
    bonusMinutes: 10, // +10 min on the clock when collected in time
    name: 'กุมารทอง',
    title: 'เด็กทองมุมห้อง',
    stall: 'B',
    art: { sheet: 'stall_ghost_5', frames: 2, frame: 0, tint: 'gold' },
    brief: 'เสียงเด็กหัวเราะคิกคักอยู่มุมห้อง ทั้งที่บ้านนี้ไม่มีเด็ก... อย่าลืมวางน้ำแดงไว้ให้เขา',
    where: 'จุดที่ 6',
  },
  {
    id: 'cp7',
    hash: '1avxr68c24j', // code in tools/qr-codes.json (npm run qr)
    name: 'ตะปู',
    title: 'ตะปูตอกโลง',
    stall: 'C',
    art: { draw: 'nails' },
    brief: 'ตะปูที่ถูกถอนออกจากฝาโลง ใครเก็บไว้ เจ้าของโลงจะตามมาทวงคืนทุกคืน',
    where: 'จุดที่ 7',
  },
  {
    id: 'cp8',
    hash: '1dw5ooy1trl', // code in tools/qr-codes.json (npm run qr)
    name: 'ผีปอบ',
    title: 'ปอบหิวตอนตีสาม',
    stall: null,
    art: { sheet: 'chaser_red', frames: 7, frame: 0, flip: true },
    brief: 'ปอบชอบตับไตไส้พุงสดๆ ถ้าเห็นยายข้างบ้านยิ้มให้ตอนตีสาม... วิ่ง อย่าหันหลังกลับ',
    where: 'จุดที่ 8 ปลายทางหน้าบ้าน',
  },
];

export const TOTAL = CHECKPOINTS.length;
