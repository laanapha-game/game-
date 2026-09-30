// Dev check: every dialogue page and reply button must fit its box at 390x844
// (no glyph, stacked Thai vowel or tone mark outside; nothing clipped).
// Needs `npm run dev` on :5173. Exit code 1 on any violation.
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
await page.goto(`${BASE}?dialoguecheck`);
await page.waitForFunction(() => window.__scene2?.checkDialogues);
const r = await page.evaluate(() => window.__scene2.checkDialogues());
await browser.close();

console.log(`${r.pageCount} pages checked, ${r.maxLines} lines per box`);
console.log('longest pages:');
for (const p of r.longest) console.log(`  ${p.set} p${p.page + 1}: ${p.chars} chars, ${p.lines} lines, ${p.bottomMargin}px spare: ${p.text}`);
if (!r.ok) {
  console.log(`FAIL: ${r.violations.length} violations`);
  for (const v of r.violations.slice(0, 20)) console.log('  ', JSON.stringify(v));
  process.exit(1);
}
console.log('ok: every glyph stays inside its box');
