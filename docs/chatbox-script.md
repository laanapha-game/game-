# Scene 2 chatbox script (ลานนภา Halloween Fest)

Every line shown in the game, in play order. Generated from `src/data/script.js` by `node tools/export_script.mjs`. Edit and send back; the text is copied into the game and checked so no glyph leaves its box.

- Each numbered line is one page; the player taps to go to the next page.
- The chatbox holds 2 lines (about 28-30 Thai characters each). A longer page continues in an extra box (one more tap).
- Stalls 1 and 2 end without a tap: when the last page finishes typing, the screen shakes and the minigame starts.
- A "quoted phrase" is never split across lines.

## S0 Angel intro
Name tag: **Jayimpacts**

1. สวัสดีครับ ยินดีต้อนรับสู่โลกหลังความตาย
2. คุณน่ะ รีบเดินทางไปที่ "ลานนภา" ให้ไวเสียนะ
3. ก่อนที่ 'ผีม่วง' จะเจอคุณก่อน
4. ระหว่างทางคุณต้องเจอผีประจำทาง 5 ซุ้ม ระวังไว้ด้วยนะ
5. และก็สำคัญมากๆ...
6. อย่าลืมกดติดตาม Jayimpacts ด้วยนะครับ
7. แล้วเจอกันที่ "ลานนภา" นะ

## S1 Stall 1: Krahang (then the tap game)
Name tag: **กระหัง**

1. กำลังมองลานนภาอยู่ใช่ไหม?
2. เจ้ารู้ไหมว่าหน้างานจริง ก็มีซุ้มผีเหมือนกันด้วยนะ
3. และอ่อใช่... ข้าคือกระหัง !!!
4. และคืนนี้ข้าชักจะกระหาย...
5. เลือด ของ เจ้า !!!

## S2 Stall 2: ghost in the jar (then the jar game)
Name tag: **ผีในไห**

1. ข้าจะบอกเจ้าให้ว่า "ลานนภา" ไปทางไหน
2. แต่เจ้าต้องต้องหาจดหมายนำทางให้เจอ
3. ตาดีทีรอดเว้ยเห้ย ว่ะฮ่าๆ

## S3 Letter (parchment panel, bold, one row per line)

- เดินต่อไปตาม "ซอยราชพฤกษ์ 6"
- ใกล้ 7-Eleven
- "ลานนภา"
- จะอยู่ข้างหน้าท่าน

## S3 Chase intro (red text, no name tag)

1. อยู่นี่เองเจ้าวิญญาณไร้ที่ไป

## S4 Stall 3: ticket info (then reply choice)
Name tag: **ผีนางรำสุดสวย**

1. เดี๋ยวก่อนเจ้า!
2. ผีไล่หลังอยู่ก็จริง แต่ข้ามีเรื่องจะบอก
3. รู้หรือไม่? ลานนภา Halloween Fest เขาจัด 24-25 ต.ค. นี้
4. ค่าเข้าขึ้นเรทตามช่วงวัน *(+ price line by date, below)*
5. ซื้อบัตรได้ที่ hellobooku.com/laanapha2026

After the event (from 26 ต.ค.), pages 4 and 5 are replaced by:
- อ้าว... งานจัดไปแล้วนะเจ้า ไว้พบกันปีหน้า!

Ticket phases (from the ticket poster):

| Ticket | Selling phase | Price |
|---|---|---|
| Flash Ticket | 9 ต.ค. | 189 บาท |
| Early Bird | 12 ต.ค. - 16 ต.ค. | 320 บาท |
| General Ticket | 17 ต.ค. - 23 ต.ค. | 390 บาท |
| At Door 1 Day Pass | 24 ต.ค. - 25 ต.ค. | 450 บาท |

Page 4 as shown, by date:

| Date | Page 4 |
|---|---|
| before 9 Oct | ค่าเข้าขึ้นเรทตามช่วงวัน Flash Ticket เปิดขาย 9 ต.ค. ราคา 189 บาท |
| 9 Oct | ค่าเข้าขึ้นเรทตามช่วงวัน ตอนนี้ Flash Ticket 189 บาท (หนัง + กิจกรรม) วันนี้วันเดียวเท่านั้น! |
| 10 - 11 Oct | ค่าเข้าขึ้นเรทตามช่วงวัน Flash Ticket หมดแล้ว! Early Bird เปิด 12 ต.ค. ราคา 320 บาท |
| 12 - 16 Oct | ค่าเข้าขึ้นเรทตามช่วงวัน ตอนนี้ Early Bird 320 บาท (หนัง + กิจกรรม) ขายถึง 16 ต.ค. |
| 17 - 23 Oct | ค่าเข้าขึ้นเรทตามช่วงวัน ตอนนี้ General Ticket 390 บาท (หนัง + กิจกรรม) ขายถึง 23 ต.ค. |
| 24 - 25 Oct | ค่าเข้าขึ้นเรทตามช่วงวัน วันงานซื้อหน้างานได้ 1 Day Pass 450 บาท |

## S5 Stall 4 (then reply choice)
Name tag: **ซอมบี้แห่ง Cozy ราชพฤกษ์ 6**

1. เจ้าใกล้จะถึงลานนภาแล้ว!
2. เข้าไปแล้วก็ดูด้วยว่าเขาจะฉายหนังเรื่องอะไร
3. ห้ามพลาดนะ!
4. กดติดตาม Jayimpacts ด้วย เจ้าของงานฝากมาบอก

## S6 Stall 5 (no choice, sprint starts after the last page)
Name tag: **ผีกุมารตัวน้อย**

1. ถ้าเจ้าแต่งตัวเป็นผีมางาน
2. อย่าลืมลงแข่งชิงเอารางวัลด้วยล่ะ
3. ทีมงานเขาตั้งใจเตรียมทุกอย่างเพื่อพวกนายเลยนะ
4. เอาล่ะ ผีจะตามเจ้าทันแล้ว!
5. กดจอรัวๆ เพื่อวิ่งไปให้ถึง "ลานนภา" ให้ทันล่ะ !!!

## Reply buttons (stalls 3 and 4)

- Polite (continue): รับทราบ ขอบคุณมากที่บอก จะไปดูรายละเอียดต่อ
- Rude (game over): เรื่องของมึง จะหนีผีโว้ย!

## Other on-screen text

- Game over title: GAME OVER
- Game over button: HOME
- Tap button: TAP! (drawn into the button art)
