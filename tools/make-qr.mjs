// Prints the 8 stall QR codes for the sticker hub:
//   docs/qr/cp1.png … cp8.png   one QR per stall (https://laanapha.com/?cp=<code>)
//   docs/qr/print.html          A4 sheet, 2 signs per page, with the stall name and typed code
// Run after changing src/data/checkpoints.js:  node tools/make-qr.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { CHECKPOINTS, SITE_URL } from '../src/data/checkpoints.js';

const OUT = 'docs/qr';
mkdirSync(OUT, { recursive: true });

const cards = [];
for (const [i, cp] of CHECKPOINTS.entries()) {
  const url = `${SITE_URL}/?cp=${cp.code}`;
  const opts = { errorCorrectionLevel: 'M', margin: 2, width: 900, color: { dark: '#000000', light: '#FFFFFF' } };
  await QRCode.toFile(`${OUT}/${cp.id}.png`, url, opts);
  const svg = await QRCode.toString(url, { ...opts, type: 'svg' });
  cards.push(`<section class="sign">
  <div class="top"><span class="no">ซุ้มที่ ${i + 1}</span><span class="name">${cp.name}</span></div>
  <div class="qr">${svg}</div>
  <p class="cta">สแกนเพื่อเก็บสติกเกอร์ผี</p>
  <p class="code">${cp.code}</p>
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
.code{margin:1mm 0 0;font-size:6mm;letter-spacing:1mm;color:#FFFF4F;font-weight:700}
.url{margin:0;font-size:4mm;color:#F02DF0}
</style></head><body>
${cards.join('\n')}
</body></html>
`,
);
console.log(`${OUT}/print.html written`);
