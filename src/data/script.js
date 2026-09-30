// Scene 2 script (spec 8). Exact text: do not edit without the owner.

export const ANGEL_PAGES = [
  'ยินดีต้อนรับสู่โลกหลังความตาย! คุณ dead แล้ว',
  'รีบเดินทางไปที่ลานนภาเสียนะ ก่อนที่ลูกพี่มัจจุราชตัวม่วงของผมจะจับคุณกินเสียก่อน',
  'ข้างหน้าเป็นซุ้มดวงวิญญาณที่เจ้าต้องฝ่าไปให้ได้',
  'รู้หรือไม่ ในงานลานนภา Halloween Fest 24-25 ต.ค. 69 นี้ แถว BTS Bangwa',
  'ก็จะมีซุ้ม Trick or Treat ให้เจ้าเล่นแบบนี้ด้วยนะ แล้วเจอกันที่ลานนภา!',
];

// Stall 1 (Krahang) and stall 2 (ghost in the jar). Verbatim from the owner.
export const STALL1_PAGES = ['ในงานจริงซุ้มผีแบบนี้ก็มีนะ แต่ก่อนที่เจ้าจะไปถึงลานนภา มาให้ข้ากินตับซะดีดี !!!!!'];
export const STALL2_PAGES = ['ข้าจะบอกให้ว่า ลานนภา ไปทางไหน แต่เจ้าต้องต้องหาจดหมายนำทางให้เจอ ตาดีทีรอดเว้ยเห้ย ว่าฮ่าฮ่าฮ่า อ้า..'];

export const LETTER_TEXT = 'เดินต่อไปตามซอยราชพฤกษ์ 6 ใกล้ 7-Eleven ลานนภาอยู่ข้างหน้าท่าน';

export const STALL3_PAGE1 = 'เดี๋ยวก่อนเจ้า! ผีไล่หลังอยู่ก็จริง แต่ข้ามีเรื่องจะบอก';
export const STALL3_PAGE2 = 'รู้หรือไม่ ลานนภา Halloween Fest จัด 24-25 ต.ค. ค่าเข้าขึ้นเรทตามช่วงวัน';
// Page 3 is the date-based price line, built in src/logic/ticket.js.
export const STALL3_PAGE4 = 'ซื้อบัตรได้ที่ hellobooku.com/laanapha2026';
export const STALL3_AFTER_EVENT = 'อ้าว... งานจัดไปแล้วนะเจ้า ไว้พบกันปีหน้า!';

export const STALL4_PAGES = [
  'เจ้าใกล้จะถึงลานนภาแล้ว!',
  'เข้าไปแล้วก็ดูด้วยว่าเขาจะฉายหนังเรื่องอะไร',
  'ห้ามพลาดนะ!',
  'กดติดตาม Jayimpacts ด้วย เจ้าของงานฝากมาบอก',
];

export const STALL5_PAGES = [
  'ถ้าเจ้าแต่งตัวเป็นผีมางาน อย่าลืมลงแข่งแต่งตัวด้วยล่ะ มีรางวัลให้เจ้าด้วย!',
  'พูดคุยกับคนในงานประจำซุ้มด้วยนะ เจ้าของงานและทีมงานรอคุยเล่นกับทุกคนอยู่',
  'กดติดตาม Jayimpacts ด้วย เจ้าของงานฝากมาบอก',
  'ผีจะตามเจ้าทันแล้ว! รัวจอเพื่อวิ่งไปให้ถึงลานนภาให้ทันล่ะ!!',
];

export const REPLY_POLITE = 'รับทราบ ขอบคุณมากที่บอก จะไปดูรายละเอียดต่อ';
export const REPLY_RUDE = 'เรื่องของมึง จะหนีผีโว้ย!';

// ---- Speaker names and UI labels ----
// TODO: not in the spec script. Placeholders until the owner supplies copy.
export const NAMES = {
  angel: 'Jayimpacts',
  stall1: 'กระหัง', // TODO copy
  stall2: 'ผีในไห', // TODO copy
  stall3: 'ผีซุ้ม 3', // TODO(open item 3): ghost type for stall 3
  stall4: 'ผีซุ้ม 4', // TODO(open item 3)
  stall5: 'ผีซุ้ม 5', // TODO(open item 3)
};
export const UI_TEXT = {
  tap: 'TAP!', // TODO copy
  gameOver: 'GAME OVER', // TODO copy
  home: 'HOME', // TODO copy for the single Game over button
  fontPlaceholder: 'PLACEHOLDER FONT', // dev-only badge, remove when the Thai pixel font lands
};
