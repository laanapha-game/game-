// Writes docs/chatbox-script.md from the game's script data (src/data/script.js,
// src/logic/ticket.js, src/data/ticketPhases.js), so the editing copy always
// matches the game.   node tools/export_script.mjs
import * as S from '../src/data/script.js';
import { PHASES } from '../src/data/ticketPhases.js';
import { priceLine, ticketMode, thaiShortDate } from '../src/logic/ticket.js';
import { writeFileSync } from 'node:fs';

const L = [];
const p = (s = '') => L.push(s);
const pages = (arr) => arr.forEach((t, i) => p(`${i + 1}. ${t}`));
p('# Scene 2 chatbox script (ลานนภา Halloween Fest)');
p();
p('Every line shown in the game, in play order. Generated from `src/data/script.js` by `node tools/export_script.mjs`. Edit and send back; the text is copied into the game and checked so no glyph leaves its box.');
p();
p('- Each numbered line is one page; the player taps to go to the next page.');
p('- The chatbox holds 2 lines (about 28-30 Thai characters each). A longer page continues in an extra box (one more tap).');
p('- Stalls 1 and 2 end without a tap: when the last page finishes typing, the screen shakes and the minigame starts.');
p('- A "quoted phrase" is never split across lines.');
p();
p(`## S0 Angel intro\nName tag: **${S.NAMES.angel}**\n`);
pages(S.ANGEL_PAGES);
p(`\n## S1 Stall 1: Krahang (then the tap game)\nName tag: **${S.NAMES.stall1}**\n`);
pages(S.STALL1_PAGES);
p(`\n## S2 Stall 2: ghost in the jar (then the jar game)\nName tag: **${S.NAMES.stall2}**\n`);
pages(S.STALL2_PAGES);
p('\n## S3 Letter (parchment panel, bold, one row per line)\n');
S.LETTER_LINES.forEach((l) => p(`- ${l}`));
p('\n## S3 Chase intro (red text, no name tag)\n');
pages(S.CHASER_INTRO_PAGES);
p(`\n## S4 Stall 3: ticket info (then reply choice)\nName tag: **${S.NAMES.stall3}**\n`);
p(`1. ${S.STALL3_PAGE1}`);
p(`2. ${S.STALL3_PAGE2}`);
p(`3. ${S.STALL3_PAGE3}`);
p(`4. ${S.STALL3_RATE_INTRO} *(+ price line by date, below)*`);
p(`5. ${S.STALL3_PAGE5}`);
p(`\nAfter the event (from ${thaiShortDate('2026-10-26')}), pages 4 and 5 are replaced by:\n- ${S.STALL3_AFTER_EVENT}`);
p('\nTicket phases (from the ticket poster):\n');
p('| Ticket | Selling phase | Price |\n|---|---|---|');
for (const ph of PHASES) p(`| ${ph.name} | ${ph.start === ph.end ? thaiShortDate(ph.start) : `${thaiShortDate(ph.start)} - ${thaiShortDate(ph.end)}`} | ${ph.price} บาท |`);
p('\nPage 4 as shown, by date:\n');
p('| Date | Page 4 |\n|---|---|');
for (const [label, d] of [['before 9 Oct', '2026-10-01'], ['9 Oct', '2026-10-09'], ['10 - 11 Oct', '2026-10-10'], ['12 - 16 Oct', '2026-10-12'], ['17 - 23 Oct', '2026-10-17'], ['24 - 25 Oct', '2026-10-24']])
  p(`| ${label} | ${S.STALL3_RATE_INTRO} ${priceLine(ticketMode(d))} |`);
p(`\n## S5 Stall 4 (then reply choice)\nName tag: **${S.NAMES.stall4}**\n`);
pages(S.STALL4_PAGES);
p(`\n## S6 Stall 5 (no choice, sprint starts after the last page)\nName tag: **${S.NAMES.stall5}**\n`);
pages(S.STALL5_PAGES);
p(`\n## Reply buttons (stalls 3 and 4)\n\n- Polite (continue): ${S.REPLY_POLITE}\n- Rude (game over): ${S.REPLY_RUDE}`);
p(`\n## Other on-screen text\n\n- Game over title: ${S.UI_TEXT.gameOver}\n- Game over button: ${S.UI_TEXT.home}\n- Tap button: TAP! (drawn into the button art)`);
writeFileSync(new URL('../docs/chatbox-script.md', import.meta.url), L.join('\n') + '\n');
console.log('docs/chatbox-script.md written');
