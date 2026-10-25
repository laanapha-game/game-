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

/**
 * The hunt clock in minutes, or null for no time limit (owner, 25 Oct: no limit; the clock
 * only measures how long the player took, shown on the summary).
 */
export const HUNT_MINUTES = null;

/** Scanning this checkpoint (the registration table) unlocks the hunt and starts it. */
export const START_ID = 'cp1';

// Extra time: `bonusMinutes` on a checkpoint adds to the clock when collected in time (only
// meaningful with a time limit; none now).

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

// The end of the hunt (owner, 25 Oct): no prize, just 'ยินดีด้วย คุณทำภารกิจสำเร็จ'.

// art: the sticker.
//   { draw: '<name>' }            pixel art drawn in code (src/hub/stickers.js)
//   { sheet, frames, frame, flip, tint }   a frame of a sprite strip in src/assets/art
// stall: stall art behind it in the detail view, A (yellow), B (magenta), C (black/yellow), or null.
// mission: what to do at this checkpoint (shown before it is found, and as the next mission
//   after the previous one); where: where it is at the event. Owner, 25 Oct.
// The art (sticker) of each checkpoint is unchanged from the first version.
export const CHECKPOINTS = [
  {
    id: 'cp1',
    hash: '1culz9q7u18', // code in tools/qr-codes.json (npm run qr)
    name: 'START',
    title: 'โต๊ะลงทะเบียน',
    stall: 'A',
    art: { draw: 'powder' },
    mission: 'สแกนที่โต๊ะลงทะเบียนเพื่อเริ่มภารกิจ แล้วหาจุดถัดไปให้เจอภายใน 10 นาที',
    where: 'หน้าโต๊ะ Regist',
  },
  {
    id: 'cp2',
    hash: '58b0cv9uif', // code in tools/qr-codes.json (npm run qr)
    name: 'FIND THE SPIDER',
    title: 'หาแมงมุม',
    stall: 'B',
    art: { draw: 'doll' },
    mission: 'เดินผ่านหลังจอ แล้วหาแมงมุมให้เจอ',
    where: 'หลังจอหนัง',
  },
  {
    id: 'cp3',
    hash: '1zo8ssqysb7', // code in tools/qr-codes.json (npm run qr)
    name: 'ESCAPE ROOM',
    title: 'ห้องผี',
    stall: 'C',
    art: { draw: 'hide' },
    mission: 'เปิดประตูเข้าไป เจอผีแปะ QR อยู่ หาให้เจอ แล้วหนีออกมา',
    where: 'ห้อง Escape Room',
  },
  {
    id: 'cp4',
    hash: '22iauuxpd79', // code in tools/qr-codes.json (npm run qr)
    name: 'แข่งรถเข็น',
    title: 'เข็นให้ไว',
    stall: 'A',
    art: { sheet: 'krahang', frames: 8, frame: 0, flip: true },
    mission: 'กติกา: เข็นรถแข่งกัน! เข้าเส้นชัยแล้วสแกน QR',
    where: 'สนามแข่งรถเข็น',
  },
  {
    id: 'cp5',
    hash: '2dpcw06sria', // code in tools/qr-codes.json (npm run qr)
    name: 'PUMPKIN HAUNT',
    title: 'ขุดหาฟักทอง',
    stall: null,
    art: { draw: 'shrine' },
    mission: 'ขุดดินหาฟักทองให้เจอ 5 นาทีสุดท้ายจะเปิดไฟให้',
    where: 'ลานฟักทอง',
  },
  {
    id: 'cp6',
    hash: 'uxq5izf88u', // code in tools/qr-codes.json (npm run qr)
    name: 'สวดมนต์ "หน้า" ศพ',
    title: 'ปลดปล่อยผี',
    stall: 'B',
    art: { sheet: 'stall_ghost_5', frames: 2, frame: 0, tint: 'gold' },
    mission: 'เปิดน้ำแดง แล้วท่องคาถาพร้อมกัน "มะยัง มะเย มะโยง มะเย้" ท่องถูกวิธี ผีจะถูกปลดปล่อย',
    where: 'หน้าศพ',
  },
  {
    id: 'cp7',
    hash: '1avxr68c24j', // code in tools/qr-codes.json (npm run qr)
    name: 'WORKSHOP',
    title: 'Hidden Treat',
    stall: 'C',
    art: { draw: 'nails' },
    mission: 'ตามหาตัวตนที่ซ่อนอยู่! เลือกภารกิจจากร้านค้าหรือเวิร์กชอป ทำให้สำเร็จ แล้วรับ Hidden Treat พร้อม QR ลับ',
    where: 'ร้านค้า & เวิร์กชอปในงาน',
  },
  {
    id: 'cp8',
    hash: '1dw5ooy1trl', // code in tools/qr-codes.json (npm run qr)
    name: 'LAAN FOOD',
    title: 'จบภารกิจ',
    stall: null,
    art: { sheet: 'chaser_red', frames: 7, frame: 0, flip: true },
    mission: 'เดินไปหน้าซอย แล้วสแกนเพื่อสรุปจบภารกิจ',
    where: 'หน้าซอย',
  },
];

export const TOTAL = CHECKPOINTS.length;
