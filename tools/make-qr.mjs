// Checkpoint QR codes for the sticker hunt. Reads the real codes from tools/qr-codes.json,
// writes their hashes into src/data/checkpoints.js (the page never contains the codes), and prints:
//   docs/qr/cp1.png … cp8.png   one QR per checkpoint (https://laanapha.com/?cp=<code>)
//   docs/qr/print.html          A4 sheet, 2 signs per page, with the name and the code to type
// Run after changing a code:  npm run qr   (then rebuild / redeploy the site)
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { hashCode, normCode } from '../src/hub/codehash.js';

const CODES = JSON.parse(readFileSync('tools/qr-codes.json', 'utf8'));
const CP_FILE = 'src/data/checkpoints.js';
let src = readFileSync(CP_FILE, 'utf8');
const seen = new Map();
for (const [id, code] of Object.entries(CODES)) {
  if (id.startsWith('_')) continue;
  if (!normCode(code)) throw new Error(`${id}: empty code`);
  if (seen.has(normCode(code))) throw new Error(`${id} and ${seen.get(normCode(code))} have the same code`);
  seen.set(normCode(code), id);
  const re = new RegExp(`(id: '${id}',\\n\\s+hash: ')[^']*(')`);
  if (!re.test(src)) throw new Error(`${CP_FILE}: no hash line for ${id}`);
  src = src.replace(re, `$1${hashCode(code)}$2`);
}
if (CODES._entry) src = src.replace(/export const ENTRY_HASH = '[^']*';/, `export const ENTRY_HASH = '${hashCode(CODES._entry)}';`);
writeFileSync(CP_FILE, src);
// the staff code (plays before the opening time): only its hash goes in the page
if (CODES._staff) {
  const CLOCK = 'src/hub/clock.js';
  const c = readFileSync(CLOCK, 'utf8').replace(/export const STAFF_HASH = '[^']*';/, `export const STAFF_HASH = '${hashCode(CODES._staff)}';`);
  writeFileSync(CLOCK, c);
}
const { CHECKPOINTS, SITE_URL } = await import(`../src/data/checkpoints.js?${Date.now()}`);

const OUT = 'docs/qr';
mkdirSync(OUT, { recursive: true });

const cards = [];
if (CODES._entry) {
  // the entry sign, first: scanning it at the event unlocks the hunt
  const url = `${SITE_URL}/?cp=${encodeURIComponent(CODES._entry)}`;
  const opts = { errorCorrectionLevel: 'M', margin: 2, width: 900, color: { dark: '#000000', light: '#FFFFFF' } };
  await QRCode.toFile(`${OUT}/entry.png`, url, opts);
  const svg = await QRCode.toString(url, { ...opts, type: 'svg' });
  cards.push(`<section class="sign">
  <div class="top"><span class="no">ทางเข้า</span><span class="name">TRICK OR TREAT</span></div>
  <div class="qr">${svg}</div>
  <p class="cta">สแกน QR CODE หน้างานเพื่อเข้าร่วมเกม</p>
  <p class="code">รหัส: ${CODES._entry}</p>
  <p class="url">${SITE_URL.replace('https://', '')}</p>
</section>`);
  console.log(`entry  ${url}`);
}
for (const [i, cp] of CHECKPOINTS.entries()) {
  const code = CODES[cp.id];
  const url = `${SITE_URL}/?cp=${encodeURIComponent(code)}`;
  const opts = { errorCorrectionLevel: 'M', margin: 2, width: 900, color: { dark: '#000000', light: '#FFFFFF' } };
  await QRCode.toFile(`${OUT}/${cp.id}.png`, url, opts);
  const svg = await QRCode.toString(url, { ...opts, type: 'svg' });
  cards.push(`<section class="sign">
  <div class="top"><span class="no">จุดที่ ${i + 1}</span><span class="name">${cp.name}</span></div>
  <div class="qr">${svg}</div>
  <p class="cta">สแกนเพื่อเก็บสติกเกอร์ผี</p>
  <p class="code">รหัส: ${code}</p>
  <p class="url">${SITE_URL.replace('https://', '')}</p>
</section>`);
  console.log(`${cp.id}  ${cp.name}  ${url}`);
}

writeFileSync(
  `${OUT}/print.html`,
  `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ป้าย QR ลานนภา</title>
<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;700&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:10mm}
body{margin:0;font-family:Kanit,sans-serif;background:#fff}
.sign{box-sizing:border-box;height:136mm;margin:0 auto 4mm;width:120mm;border:3mm solid #FFFF4F;outline:1.5mm solid #000;background:#000;color:#FFFF4F;
  display:flex;flex-direction:column;align-items:center;padding:4mm;break-inside:avoid}
.sign:nth-child(2n){break-after:page}
.top{display:flex;gap:3mm;align-items:baseline;font-weight:700}
.no{background:#F02DF0;color:#000;padding:0 2mm;font-size:5mm}
.name{font-size:7mm}
.qr{background:#fff;width:82mm;height:82mm;margin:3mm 0}
.qr svg{width:100%;height:100%;display:block}
.cta{margin:0;font-size:6mm;color:#fff}
.code{margin:1mm 0 0;font-size:6mm;letter-spacing:.3mm;color:#FFFF4F;font-weight:700}
.url{margin:0;font-size:4mm;color:#F02DF0}
</style></head><body>
${cards.join('\n')}
</body></html>
`,
);
console.log(`${OUT}/print.html written`);
