# Scene 2 chatbox script (ลานนภา Halloween Fest)

Every line shown in the game, in play order. Edit the text here and send it back; it will be copied into `src/data/script.js` and checked so no glyph leaves its box.

Notes for editing:
- Each numbered line is one page. The player taps to go to the next page.
- The chatbox holds 2 lines, roughly 28-30 Thai characters per line. A longer page is split into extra boxes automatically (one more tap).
- Stall 1 and stall 2 end without a tap: when the last page finishes typing, the screen shakes and the minigame starts.
- To reorder, move whole lines; to add a page, add a numbered line.

## S0 Angel intro
Name tag: **Jayimpacts**

1. ยินดีต้อนรับสู่โลกหลังความตาย! คุณ dead แล้ว
2. รีบเดินทางไปที่ลานนภาเสียนะ ก่อนที่ลูกพี่มัจจุราชตัวม่วงของผมจะจับคุณกินเสียก่อน
3. ข้างหน้าเป็นซุ้มดวงวิญญาณที่เจ้าต้องฝ่าไปให้ได้
4. รู้หรือไม่ ในงานลานนภา Halloween Fest 24-25 ต.ค. 69 นี้ แถว BTS Bangwa
5. ก็จะมีซุ้ม Trick or Treat ให้เจ้าเล่นแบบนี้ด้วยนะ แล้วเจอกันที่ลานนภา!

## S1 Stall 1: Krahang (then the tap game)
Name tag: **กระหัง**

1. ในงานจริงซุ้มผีแบบนี้ก็มีนะ แต่ก่อนที่เจ้าจะไปถึงลานนภา มาให้ข้ากินตับซะดีดี !!!!!

## S2 Stall 2: ghost in the jar (then the jar game)
Name tag: **ผีในไห**

1. ข้าจะบอกให้ว่า ลานนภา ไปทางไหน แต่เจ้าต้องต้องหาจดหมายนำทางให้เจอ ตาดีทีรอดเว้ยเห้ย ว่าฮ่าฮ่าฮ่า อ้า..

## S3 Letter (parchment panel, not a chatbox)

- เดินต่อไปตามซอยราชพฤกษ์ 6 ใกล้ 7-Eleven ลานนภาอยู่ข้างหน้าท่าน

## S4 Stall 3: ticket info (then reply choice)
Name tag: **ผีนางรำสุดสวย**

1. เดี๋ยวก่อนเจ้า! ผีไล่หลังอยู่ก็จริง แต่ข้ามีเรื่องจะบอก
2. รู้หรือไม่ ลานนภา Halloween Fest จัด 24-25 ต.ค. ค่าเข้าขึ้นเรทตามช่วงวัน
3. *(price line, changes by date; see below)*
4. ซื้อบัตรได้ที่ hellobooku.com/laanapha2026

After the event (from 26 Oct), pages 2 to 4 are replaced by:
- อ้าว... งานจัดไปแล้วนะเจ้า ไว้พบกันปีหน้า!

Page 3 price line by date:

| Date | Line |
|---|---|
| before 29 Sep | Flash Ticket เปิดขาย 29 ก.ย. ราคา 189 บาท |
| 29 Sep | ตอนนี้ Flash Ticket 189 บาท (หนัง + กิจกรรม) วันนี้วันเดียวเท่านั้น! |
| 30 Sep - 11 Oct | Flash Ticket หมดแล้ว! Early Bird เปิด 12 ต.ค. ราคา 320 บาท |
| 12 - 14 Oct | ตอนนี้ Early Bird 320 บาท (หนัง + กิจกรรม) ขายถึง 14 ต.ค. |
| 15 - 17 Oct | Early Bird หมดแล้ว! General Ticket เปิด 18 ต.ค. ราคา 390 บาท |
| 18 - 23 Oct | ตอนนี้ General Ticket 390 บาท (หนัง + กิจกรรม) ขายถึง 23 ต.ค. |
| 24 - 25 Oct | วันงานซื้อหน้างานได้ 1 Day Pass 450 บาท |

Templates (prices and dates come from `src/data/ticketPhases.js`):
- Flash day: `ตอนนี้ Flash Ticket 189 บาท (หนัง + กิจกรรม) วันนี้วันเดียวเท่านั้น!`
- Early Bird / General: `ตอนนี้ {name} {price} บาท (หนัง + กิจกรรม) ขายถึง {end}`
- At the door: `วันงานซื้อหน้างานได้ 1 Day Pass {price} บาท`
- Between phases: `{prev.name} หมดแล้ว! {next.name} เปิด {next.start} ราคา {next.price} บาท`
- Before the first phase: `{next.name} เปิดขาย {next.start} ราคา {next.price} บาท`

## S5 Stall 4 (then reply choice)
Name tag: **ซอมบี้แห่ง Cozy ราชพฤกษ์ 6**

1. เจ้าใกล้จะถึงลานนภาแล้ว!
2. เข้าไปแล้วก็ดูด้วยว่าเขาจะฉายหนังเรื่องอะไร
3. ห้ามพลาดนะ!
4. กดติดตาม Jayimpacts ด้วย เจ้าของงานฝากมาบอก

## S6 Stall 5 (no choice, sprint starts after the last page)
Name tag: **ผีกุมารตัวน้อย**

1. ถ้าเจ้าแต่งตัวเป็นผีมางาน อย่าลืมลงแข่งแต่งตัวด้วยล่ะ มีรางวัลให้เจ้าด้วย!
2. พูดคุยกับคนในงานประจำซุ้มด้วยนะ เจ้าของงานและทีมงานรอคุยเล่นกับทุกคนอยู่
3. กดติดตาม Jayimpacts ด้วย เจ้าของงานฝากมาบอก
4. ผีจะตามเจ้าทันแล้ว! รัวจอเพื่อวิ่งไปให้ถึงลานนภาให้ทันล่ะ!!

## Reply buttons (stalls 3 and 4)

- Polite (continue): รับทราบ ขอบคุณมากที่บอก จะไปดูรายละเอียดต่อ
- Rude (game over): เรื่องของมึง จะหนีผีโว้ย!

## Other on-screen text

- Game over title: GAME OVER
- Game over button: HOME
- Tap button: TAP! (drawn into the button art)
