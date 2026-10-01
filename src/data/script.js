// Scene 2 script (spec 8). Exact text: do not edit without the owner.

export const ANGEL_PAGES = [
  'สวัสดีครับ ยินดีต้อนรับสู่โลกหลังความตาย',
  'คุณน่ะ รีบเดินทางไปที่ "ลานนภา" ให้ไวเสียนะ',
  "ก่อนที่ 'ผีม่วง' จะเจอคุณก่อน",
  'ระหว่างทางคุณต้องเจอผีประจำทาง 5 ซุ้ม ระวังไว้ด้วยนะ',
  'และก็สำคัญมากๆ...',
  'อย่าลืมกดติดตาม Jayimpacts ด้วยนะครับ',
  'แล้วเจอกันที่ "ลานนภา" นะ',
];

// Stall 1 (Krahang) and stall 2 (ghost in the jar). Verbatim from the owner.
export const STALL1_PAGES = [
  'กำลังมองลานนภาอยู่ใช่ไหม?',
  'เจ้ารู้ไหมว่าหน้างานจริง ก็มีซุ้มผีเหมือนกันด้วยนะ',
  'และอ่อใช่... ข้าคือกระหัง !!!',
  'และคืนนี้ข้าชักจะกระหาย...',
  'เลือด ของ เจ้า !!!',
];
export const STALL2_PAGES = [
  'ข้าจะบอกเจ้าให้ว่า "ลานนภา" ไปทางไหน',
  'แต่เจ้าต้องต้องหาจดหมายนำทางให้เจอ',
  'ตาดีทีรอดเว้ยเห้ย ว่ะฮ่าๆ',
];

// Chase intro: the chasing ghost finds the player (red text, no name tag).
export const CHASER_INTRO_PAGES = ['อยู่นี่เองเจ้าวิญญาณไร้ที่ไป'];

// Letter panel: one entry per line, shown in bold.
export const LETTER_LINES = ['เดินต่อไปตาม "ซอยราชพฤกษ์ 6"', 'ใกล้ 7-Eleven', '"ลานนภา"', 'จะอยู่ข้างหน้าท่าน'];

// Stall 3. Page 4 = STALL3_RATE_INTRO + the date-based price line (src/logic/ticket.js).
export const STALL3_PAGE1 = 'เดี๋ยวก่อนเจ้า!';
export const STALL3_PAGE2 = 'ผีไล่หลังอยู่ก็จริง แต่ข้ามีเรื่องจะบอก';
export const STALL3_PAGE3 = 'รู้หรือไม่? ลานนภา Halloween Fest เขาจัด 24-25 ต.ค. นี้';
export const STALL3_RATE_INTRO = 'ค่าเข้าขึ้นเรทตามช่วงวัน';
export const STALL3_PAGE5 = 'ซื้อบัตรได้ที่ hellobooku.com/laanapha2026';
// After the event, pages 4 and 5 are replaced by this one.
export const STALL3_AFTER_EVENT = 'อ้าว... งานจัดไปแล้วนะเจ้า ไว้พบกันปีหน้า!';

export const STALL4_PAGES = [
  'เจ้าใกล้จะถึงลานนภาแล้ว!',
  'เข้าไปแล้วก็ดูด้วยว่าเขาจะฉายหนังเรื่องอะไร',
  'ห้ามพลาดนะ!',
  'กดติดตาม Jayimpacts ด้วย เจ้าของงานฝากมาบอก',
];

export const STALL5_PAGES = [
  'ถ้าเจ้าแต่งตัวเป็นผีมางาน',
  'อย่าลืมลงแข่งชิงเอารางวัลด้วยล่ะ',
  'ทีมงานเขาตั้งใจเตรียมทุกอย่างเพื่อพวกนายเลยนะ',
  'เอาล่ะ ผีจะตามเจ้าทันแล้ว!',
  'กดจอรัวๆ เพื่อวิ่งไปให้ถึง "ลานนภา" ให้ทันล่ะ !!!',
];

export const REPLY_POLITE = 'รับทราบ ขอบคุณมากที่บอก จะไปดูรายละเอียดต่อ';
export const REPLY_RUDE = 'เรื่องของมึง จะหนีผีโว้ย!';

// ---- Speaker names and UI labels ----
// TODO: not in the spec script. Placeholders until the owner supplies copy.
export const NAMES = {
  angel: 'Jayimpacts',
  stall1: 'กระหัง', // TODO copy
  stall2: 'ผีในไห', // TODO copy
  stall3: 'ผีนางรำสุดสวย',
  stall4: 'ซอมบี้แห่ง Cozy ราชพฤกษ์ 6',
  stall5: 'ผีกุมารตัวน้อย',
};
export const UI_TEXT = {
  tap: 'TAP!', // TODO copy
  gameOver: 'GAME OVER', // TODO copy
  home: 'HOME', // TODO copy for the single Game over button
  fontPlaceholder: 'PLACEHOLDER FONT', // dev-only badge, remove when the Thai pixel font lands
};
