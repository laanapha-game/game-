// The 8 sticker checkpoints (ซุ้ม) of the sticker hub (scene 3), in walking order.
// Everything the event team may want to change lives here.
//
// TODO(owner): names, descriptions and where each stall stands are placeholders taken from
// the game's own ghosts. Replace them with the real stalls at the event.
//
// QR codes: each stall's QR holds   https://laanapha.com/?cp=<code>
// (tools/make-qr.mjs prints them to docs/qr/). Scanning it with the phone camera opens the
// site and collects the sticker; the in-game scan button reads the same QR (or the bare code).
// Changing a code makes the old printed QR stop working.

export const SITE_URL = 'https://laanapha.com';

/** Where the prize is collected when all 8 are found. TODO(owner): real prize and place. */
export const REWARD = {
  title: 'ของรางวัลลานนภา',
  where: 'หน้าบ้านลานนภา',
  howTo: 'ให้สตาฟกดค้างปุ่มด้านล่าง',
};

// art: the sticker. `sheet` = a sprite strip in src/assets/art (frame = sheet width / frames),
// `stall` = stall art A (yellow), B (magenta), C (black/yellow) from assets/stalls,
// `code` = drawn in code: 'screenGhost' (scene 1's cinema ghost) or 'mascot' (the chosen-colour นวลนภา bird).
export const CHECKPOINTS = [
  {
    id: 'cp1',
    code: 'LNP-K7QX2M',
    name: 'กระหัง',
    title: 'ซุ้มกระหังกระโดดเกาะ',
    stall: 'A',
    art: { sheet: 'krahang', frames: 8, frame: 0, flip: true },
    desc: 'ผีกระหังติดกระด้งบินได้ ชอบกระโดดเกาะหลังคนที่เดินผ่าน ถ้าสลัดหลุดก็รอดไป',
    where: 'ปากซอยทางเข้า ซุ้มแรกทางซ้ายมือ',
    line: 'สลัดข้าหลุดได้ด้วย เก่งนี่!',
  },
  {
    id: 'cp2',
    code: 'LNP-R4WN9P',
    name: 'ผีในไห',
    title: 'ซุ้มไหสลับไห',
    stall: 'B',
    art: { sheet: 'jar', frames: 7, frame: 3 },
    desc: 'ไหสองใบ ใบหนึ่งมีผี อีกใบมีจดหมาย ทายถูกได้ไปต่อ ทายผิดเจอผีโผล่',
    where: 'ถัดจากซุ้มกระหัง ซุ้มหลังคาชมพู',
    line: 'คราวนี้ไม่หลอกแล้ว เอาสติกเกอร์ไป',
  },
  {
    id: 'cp3',
    code: 'LNP-T8HV3C',
    name: 'ผีนางรำสุดสวย',
    title: 'ซุ้มนางรำ',
    stall: 'A',
    art: { sheet: 'stall_ghost_3', frames: 6, frame: 0 },
    desc: 'นางรำร่ายรำไม่หยุดทั้งคืน ใครตอบสุภาพจะได้รับรอยยิ้มกลับไป',
    where: 'กลางซอย ข้างเวทีหน้าบ้าน',
    line: 'รำสวยไหมจ๊ะ เก็บไว้เป็นที่ระลึก',
  },
  {
    id: 'cp4',
    code: 'LNP-M2ZD6K',
    name: 'ซอมบี้ Cozy ราชพฤกษ์ 6',
    title: 'ซุ้มซอมบี้',
    stall: 'B',
    art: { sheet: 'stall_ghost_4', frames: 4, frame: 0 },
    desc: 'ซอมบี้ประจำซอยที่บอกทางให้คนหลงทาง ว่าอีกนิดเดียวก็ถึงแล้ว',
    where: 'หัวมุมก่อนออกซอย',
    line: 'อีกนิดเดียว... ถึงแล้วววว',
  },
  {
    id: 'cp5',
    code: 'LNP-P9FJ4T',
    name: 'ผีกุมารตัวน้อย',
    title: 'ซุ้มกุมาร',
    stall: 'C',
    art: { sheet: 'stall_ghost_5', frames: 2, frame: 0 },
    desc: 'กุมารตัวเล็กชวนทุกคนประกวดชุดผี ใครแต่งมาเต็มได้คะแนนพิเศษ',
    where: 'หน้าร้านสะดวกซื้อ ริมถนน',
    line: 'ชุดสวยมากเลยพี่ เอานี่ไป!',
  },
  {
    id: 'cp6',
    code: 'LNP-W3XB7R',
    name: 'ผีจอหนัง',
    title: 'หนังกลางแปลงผี',
    stall: null,
    art: { code: 'screenGhost' },
    desc: 'จอหนังกลางแปลงที่ฉายหนังผีทั้งคืน มีผีหลุดออกมาจากจอบ่อยๆ',
    where: 'ลานหนังกลางแปลง ข้างบ้าน',
    line: 'BOO! ตกใจไหม',
  },
  {
    id: 'cp7',
    code: 'LNP-H6NQ2V',
    name: 'ผีไล่ล่า',
    title: 'ด่านหนีผี',
    stall: null,
    art: { sheet: 'chaser', frames: 7, frame: 0, flip: true },
    desc: 'ผีตัวที่ไล่ตามมาตลอดทาง ถ้าวิ่งหนีทันจะเจอทางแสงสีขาว',
    where: 'ทางเดินสว่างก่อนเข้าบ้าน',
    line: 'คราวนี้หนีพ้น... แต่ครั้งหน้าไม่แน่',
  },
  {
    id: 'cp8',
    code: 'LNP-C5LT8Y',
    name: 'นวลนภา',
    title: 'บ้านนวลนภา',
    stall: 'C',
    art: { code: 'mascot' },
    desc: 'นวลนภา เจ้าของบ้านลานนภา รอต้อนรับทุกคนที่เดินมาถึงปลายทาง',
    where: 'หน้าบ้านลานนภา ปลายทาง',
    line: 'มาถึงแล้ว! ยินดีต้อนรับสู่ลานนภา',
  },
];

export const TOTAL = CHECKPOINTS.length;
