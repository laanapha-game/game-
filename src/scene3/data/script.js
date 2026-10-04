// Scene 3 text. Lines from the owner's brief are final and used exactly.
//
// TODO(prototype): the characters' dialogue (NPC_DEFS) and the credits (CREDITS) live in
// the prototype lannapha-home.html, which has not been delivered to this repo yet. Their
// pages below are visible placeholders (PENDING). Paste the prototype's Thai lines into
// NPC_LINES and CREDITS: nothing else needs to change.

export const PENDING = (who) => `[บทพูดของ ${who}: รอคัดลอกจากต้นแบบ]`;

// ---- Opening welcome (final, Jay laughs โฮะๆ at the end) ----
export const WELCOME_SPEAKER = 'Jayimpacts';
export const WELCOME_PAGES = [
  'สวัสดีครับ! ผม Jayimpacts ยินดีต้อนรับสู่งาน ลานนภา Halloween Fest ครับ',
  'เกมนี้เป็นส่วนหนึ่งของงานลานนภา Halloween Fest ที่จะจัด 24-25 ต.ค. นี้ครับ',
  'ขอบคุณที่มาเล่นกับเรานะครับ',
  'ลองเดินสำรวจงานของเราดูก่อนนะครับ ว่า layout จัดไว้ยังไงบ้าง',
  'แล้วก็อย่าลืมไปคุยกับทีมงานของเราด้วยนะครับ',
  'ถ้าคุยครบทุกคน จะมีรางวัลพิเศษให้ด้วย โฮะๆ',
];
export const AFTER_WELCOME_BANNER = 'เปิดรายการภารกิจได้ที่ปุ่ม ภารกิจ';

// ---- Goals: six places (final names and facts) ----
export const GOALS = [
  { id: 'lane', name: 'ซอยทางเข้า', line: 'ซุ้มจองพื้นที่เปิดซุ้มกับทีมงาน' },
  { id: 'shops', name: 'แถวร้านค้าและ Photo Booth', line: 'มินิมาร์ท เครื่องดื่ม พิซซ่า จุดถ่ายรูป และซุ้ม Rotary' },
  { id: 'desk', name: 'จุดลงทะเบียน', line: 'จุดลงทะเบียนหน้างาน' },
  { id: 'tables', name: 'โซนโต๊ะจัดเลี้ยง', line: 'นั่งกินข้าวพร้อมชมบรรยากาศงาน' },
  { id: 'cinema', name: 'จอหนังกลางแปลงและบีนแบ็ก', line: 'หนังสั้นเริ่ม 1 ทุ่ม โปรแกรมหลักเริ่ม 1 ทุ่มครึ่ง' },
  { id: 'haunted', name: 'บ้านเมื่อคืนผมนอนไม่หลับ', line: 'อยู่ฝั่งตรงข้ามคลองบางหลวง กล้าเข้าไหม?' },
];

// ---- HUD and banners ----
export const chipText = (goals, vouchers) => `สำรวจ ${goals}/6 · คูปอง ${vouchers}`;
export const CHIP_DONE = 'ครบแล้ว! ไปที่ทางออก';
export const exitTooEarly = (goals) => `ยังสำรวจไม่ครบ (${goals}/6)`;
export const VOUCHER_BANNER = 'ได้คูปองส่วนลดค่าบัตร!';
export const PRIZE_BANNER = 'คุยครบทุกคนแล้ว! ได้รางวัลพิเศษ โฮะๆ';
export const PRIZE_CHECK = 'รางวัลพิเศษ ✓';
export const LABELS = {
  map: 'MAP',
  missions: 'ภารกิจ',
  auto: 'AUTO',
  talk: 'TALK',
  day: 'DAY',
  night: 'NIGHT',
  igButton: 'เปิด IG',
  close: 'ปิด',
};

// ---- Lane stall row: one interaction for the five stalls (final) ----
export const STALL_ROW_SPEAKER = 'ซุ้มเปิดจองพื้นที่';
export const STALL_ROW_PAGES = ['ใครอยากมาเป็นส่วนหนึ่งของงาน สามารถจับจองพื้นที่เปิดซุ้มกับเราได้เลยครับ'];

// ---- Characters' dialogue: TODO(prototype) copy NPC_DEFS pages here (key -> pages) ----
export const NPC_LINES = {
  bas: [PENDING('น้องบาส')],
  djton: [PENDING('ดีเจต้น')],
  wizard: [PENDING('จอมเวทย์ลึกลับ')],
  pan: [PENDING('น้องปัน')],
  chef: [PENDING('เชฟตูน')],
  beer: [PENDING('น้าเบียร์')],
  khaopan: [PENDING('น้องข้าวปั้น')],
  golf: [PENDING('น้องกอล์ฟ')],
  nid: [PENDING('ป้านิด')],
  nok: [PENDING('พี่นก')],
  jay: [PENDING('Jayimpacts')], // his last page gets the "เปิด IG" button
  kaiching: [PENDING('Kaiching')],
  captain: [PENDING('Captain')],
};

// ---- Ending (final) ----
export const summaryText = (goals, talked, targets) => `สำรวจ ${goals}/6 จุด · คุยกับทีมงาน ${talked}/${targets}`;
export const voucherHowTo = (how) => `วิธีใช้คูปอง: ${how}`;
export const prizeHowTo = (how) => `รางวัลพิเศษ ✓ วิธีรับ: ${how}`;
export const ENDING_BUTTONS = { book: 'จองบัตรเลย', instagram: 'IG @jayimpacts', credits: 'เครดิต', home: 'หน้าแรก' };
export const AFTER_EVENT_LINE = 'งานจัดไปแล้ว ติดตามเราไว้พบกันปีหน้า';

// ---- Credits: TODO(prototype) copy CREDITS here ({ name, role, sprite }) ----
// Until then the credits list the team characters by name with a pending role.
export const CREDITS = null;
export const CREDITS_PENDING_ROLE = 'รอข้อมูลเครดิต'; // TODO(prototype)
