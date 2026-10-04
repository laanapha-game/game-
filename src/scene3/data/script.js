// Scene 3 text. Lines from the owner's brief are final and used exactly.
//
// The characters' dialogue, speaker tags and credits are copied exactly from the prototype
// (lannapha-home.html, its scene 3 NPC_DEFS and CREDITS). The haunted house's goal name is
// the owner's later change (บ้านเมื่อคืนผมนอนไม่หลับ).

// ---- Opening welcome (final, Jay laughs โฮะๆ at the end) ----
export const WELCOME_SPEAKER = 'Jayimpacts';
export const WELCOME_PAGES = [
  "เจ้าได้มาถึงแล้วที่ 'ลานนภา'", // owner: the player has arrived
  'สวัสดีครับ! ผม Jayimpacts ยินดีต้อนรับสู่งาน ลานนภา Halloween Fest ครับ',
  'เกมนี้เป็นส่วนหนึ่งของงานลานนภา Halloween Fest ที่จะจัด 24-25 ต.ค. นี้ครับ',
  'ขอบคุณที่มาเล่นกับเรานะครับ',
  'ลองเดินสำรวจงานของเราดูก่อนนะครับ ว่า layout จัดไว้ยังไงบ้าง',
  'แล้วก็อย่าลืมไปคุยกับทีมงานของเราด้วยนะครับ',
  'ถ้าคุยครบทุกคน จะมีรางวัลพิเศษให้ด้วย โฮะๆ',
];
export const AFTER_WELCOME_BANNER = 'เปิดรายการภารกิจได้ที่ปุ่ม ภารกิจ';
export const ZOOM_HINT = ['กด + / -', 'ซูมเข้า-ออก'];

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

// ---- Ghosts at the stalls outside the entrance (owner): talkable, not part of the 14 talk targets ----
// Names from scene 2 (scene2-spec open item 3).
export const GHOST_NAMES = { 1: 'กระหัง', 2: 'ผีในไห', 3: 'ผีนางรำสุดสวย', 4: 'ซอมบี้แห่ง Cozy ราชพฤกษ์ 6', 5: 'ผีกุมารตัวน้อย' };
export const GHOST_PAGES = ['จริงๆแล้วมีผีมากกว่านี้อีกนะ แต่เจ้าต้องมางานจริงจะได้เจอผีอีกเยอะเลย ชวนเพื่อนๆมากันด้วยนะ!'];

// ---- Characters' dialogue and speaker tags: copied exactly from the prototype's NPC_DEFS ----
export const NPC_NAMES = {
  bas: 'น้องบาส (จุดลงทะเบียน)',
  djton: 'ดีเจต้น (มิกซ์เพลง/หนังกลางแปลง)',
  wizard: 'จอมเวทย์ลึกลับ',
  pan: 'น้องปัน (โซนที่นั่งชมจอกลางแปลง)',
  chef: 'เชฟตูน (ร้านพิซซ่า)',
  beer: 'น้าเบียร์ (ร้านเครื่องดื่ม)',
  khaopan: 'น้องข้าวปั้น (โซนโต๊ะจัดเลี้ยง)',
  golf: 'น้องกอล์ฟ (จุดถ่ายรูป Photo Booth)',
  nid: 'ป้านิด (ของทานเล่น/ของเล็กๆ Local)',
  nok: 'พี่นก (ทางเชื่อมออกซอย)',
  jay: 'Jayimpacts · ซุ้ม Rotary',
  kaiching: 'Kaiching · ทีม Jintanakarn',
  captain: 'Captain',
};
export const NPC_LINES = {
  bas: ['สวัสดีครับ ตรงนี้คือจุดลงทะเบียนหน้างานนะครับ', 'งานนี้จะมีโซนที่นั่งชมจอกลางแปลง โซนโต๊ะจัดเลี้ยง และร้านค้าอีกหลายร้านมากมายครับ', 'เดินชมรอบๆ ได้เลยครับ มีอะไรถามผมได้ตลอดนะ'],
  djton: ['สวัสดีครับ ผมคุมเพลงกับเสียงของโซนหนังกลางแปลงเองเลย', 'ก่อนหนังฉาย จะเปิดเพลย์ลิสต์ชิลล์ๆ คลอไปก่อนสักพักครับ', 'หนังสั้น ชักศอกไม่ถึงใจ เริ่มฉาย 1 ทุ่ม โปรแกรมหลักเริ่ม 1 ทุ่มครึ่งนะครับ'],
  wizard: ['โฮ่ๆ... เจอผู้กล้าอีกคนแล้วสินะ', 'ข้าแค่แวะเดินผ่านงานนี้ ไม่ได้ตั้งใจจะมาทำนายดวงใครหรอกนะ...', 'แต่ถ้าอยากรู้ว่าวันนี้จะสนุกไหม บอกได้เลยว่า แน่นอน'],
  pan: ['โซนนี้เป็นที่นั่งบีนแบ็กสำหรับดูจอกลางแปลงครับ จอใหญ่ตั้งอยู่ทางโน้นเลย', 'ลองนึกภาพเอนหลังบนบีนแบ็กนุ่มๆ มีลมเย็นจากคลองบางหลวงพัดมาเบาๆ พร้อมเสียงหัวเราะของเพื่อนๆ รอบตัว', 'ตกเย็นแดดร่มลมตก หยิบของกินเล่นจากร้านใกล้ๆ มานั่งดูหนังกลางแปลงด้วยกัน บรรยากาศดีสุดๆ เลยครับ'],
  chef: ['สวัสดีครับ ร้านผมอยู่ตรงนี้เลย หนึ่งในร้านค้ามากมายของงาน', 'แผนคือให้แขกได้ลองนวดแป้งและโรยหน้าพิซซ่าเองก่อนเข้าเตาถ่านครับ', 'รอบถัดไปน่าจะเปิดให้จองได้เร็วๆ นี้ครับ'],
  beer: ['ร้านน้านี่ขายเครื่องดื่มเย็นๆ ค่ะ มีทั้งชา กาแฟ และโซดาผลไม้', 'วันงานตั้งใจจะเตรียมเมนูพิเศษไว้ต้อนรับแขกด้วยนะ', 'แวะมาชิมกันได้เลยค่ะ'],
  khaopan: ['สวัสดีค่ะ ตรงนี้คือโซนโต๊ะจัดเลี้ยงของงานนะคะ', 'จัดวางเป็นแถวให้แขกนั่งกินข้าวพร้อมชมบรรยากาศงานได้สบายๆ เลยค่ะ', 'ใกล้ๆ กันก็มีร้านค้าให้เดินเลือกซื้อของกินมานั่งทานที่โต๊ะได้ด้วยนะคะ'],
  golf: ['สวัสดีครับ ตรงนี้คือจุด Photo Booth ของงานเลยครับ', 'มีฉากหลังสวยๆ ให้ถ่ายรูปเก็บบรรยากาศงาน แล้วก็มีของประกอบฉากให้หยิบเล่นด้วยนะ', 'ถ่ายเสร็จอย่าลืมแท็กมาให้ดูกันด้วยนะครับ เดี๋ยวจะรวบรวมรูปสวยๆ ไปโชว์หน้างาน'],
  nid: ['ร้านของป้าขายของทานเล่น กับของฝาก local เล็กๆน้อยๆ ค่ะ', 'แถวนี้มีของกินเล่นเยอะแยะ แวะดูได้นะคะ'],
  nok: ['Welcome to Laanapha ยินดีต้อนรับค่ะ', 'ทางนี้เป็นทางเชื่อมออกไปต่อซอยด้านหน้าค่ะ รถเข้า-ออกทางนี้เลย', 'แถวนี้เป็นย่านใกล้คลองบางหลวง ตอนเย็นลมเย็นดีมากค่ะ', 'พร้อมจะสำรวจพื้นที่ใน ลาน ณ ภา รึยังคะ??', 'เชิญเดินตรงไปด้านในเลยค่ะ'],
  jay: ['ยินดีต้อนรับสู่ซุ้ม Rotary! ข้า Jayimpacts เฝ้าซุ้มนี้อยู่', 'ถ้าชอบงานนี้ อย่าลืมกดติดตาม IG ของข้าด้วยนะ'], // the last page gets the "เปิด IG" button
  kaiching: ['ข้า Kaiching จากทีม Jintanakarn ยินดีที่ได้เจอ', 'หนังสั้น ชักศอกไม่ถึงใจ เริ่มฉาย 1 ทุ่มตรงเป๊ะ อย่ามาสายนะ'],
  captain: ['Captain รายงานตัว! ข้าเดินตรวจงานอยู่', 'โปรแกรมหลักเริ่ม 1 ทุ่มครึ่ง ห้ามพลาด', 'บัตรราคาขึ้นตามช่วงวัน จองเร็วถูกกว่านะ'],
};

// ---- Ending (final) ----
export const summaryText = (goals, talked, targets) => `สำรวจ ${goals}/6 จุด · คุยกับทีมงาน ${talked}/${targets}`;
export const voucherHowTo = (how) => `วิธีใช้คูปอง: ${how}`;
export const prizeHowTo = (how) => `รางวัลพิเศษ ✓ วิธีรับ: ${how}`;
export const ENDING_BUTTONS = { book: 'จองบัตรเลย', instagram: 'IG @jayimpacts', credits: 'เครดิต', home: 'หน้าแรก' };
export const AFTER_EVENT_LINE = 'งานจัดไปแล้ว ติดตามเราไว้พบกันปีหน้า';

// ---- Credits: copied from the prototype's CREDITS ----
// h: heading, t: text line, p: a person with their sprite (costume, accessory), gap: space
export const CREDITS = [
  { h: 'ลานนภา Halloween Fest' },
  { t: '24-25 ต.ค. 2569' },
  { gap: 10 },
  { h: 'ทีมงาน' },
  { p: true, who: 'jayimpacts', n: 'Jayimpacts', r: 'ซุ้ม Rotary' },
  { p: true, who: 'vampire', n: 'Kaiching', r: 'ทีม Jintanakarn' },
  { p: true, who: 'slasher', acc: 'cap', n: 'Captain', r: 'ทีมงาน' },
  { t: 'น้องบาส · ดีเจต้น · เชฟตูน' },
  { t: 'น้าเบียร์ · น้องข้าวปั้น · น้องกอล์ฟ' },
  { t: 'ป้านิด · พี่นก · น้องปัน' },
  { t: 'และทีมงานทุกคน' },
  { gap: 10 },
  { h: 'ภาพยนตร์สั้น' },
  { t: 'ชักศอกไม่ถึงใจ' },
  { t: 'เริ่มฉาย 1 ทุ่ม' },
  { gap: 12 },
  { t: 'ขอบคุณที่มาเยือนลานนภา' },
  { t: 'แล้วพบกันที่งาน!' },
];
