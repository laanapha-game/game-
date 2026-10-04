// The website (laanapha.com, Cloudflare Pages): the full game (game.html, scene 1 -> 2 -> 3)
// served as the site's index.html, plus site/ (share image, icons, robots.txt and the
// Cloudflare _headers file) at the root. Output: dist-site/.
//   npm run build:site                      SITE_URL=https://www.laanapha.com/ npm run build:site
//   npm run preview:site                    serves dist-site/ on :4173
// The page head gets the title, description and link-preview tags below; game.html itself
// (generated from scene 1's page by tools/scene1-page.mjs) is not changed.
import { defineConfig } from 'vite';
import { renameSync } from 'node:fs';
import { resolve } from 'node:path';

const SITE_URL = (process.env.SITE_URL ?? 'https://laanapha.com/').replace(/\/?$/, '/');
const TITLE = 'ลานนภา Halloween Fest | เกม Trick or Treat';
const DESCRIPTION = 'เคยลองถามตัวเองไหมว่า ตายแล้วจะไปที่ไหนต่อ? เล่นเกมของงาน ลานนภา Halloween Fest 24-25 ตุลาคม 2569 บนมือถือได้เลย';
const OUT_DIR = 'dist-site';

const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function sitePage() {
  let outDir = OUT_DIR;
  return {
    name: 'lannapha-site-page',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const head = [
          `<title>${attr(TITLE)}</title>`,
          `<meta name="description" content="${attr(DESCRIPTION)}">`,
          `<meta name="theme-color" content="#4A1A14">`,
          `<link rel="canonical" href="${SITE_URL}">`,
          `<link rel="icon" type="image/png" sizes="32x32" href="favicon.png">`,
          `<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">`,
          `<link rel="apple-touch-icon" href="apple-touch-icon.png">`,
          `<meta property="og:type" content="website">`,
          `<meta property="og:site_name" content="ลานนภา Halloween Fest">`,
          `<meta property="og:locale" content="th_TH">`,
          `<meta property="og:title" content="${attr(TITLE)}">`,
          `<meta property="og:description" content="${attr(DESCRIPTION)}">`,
          `<meta property="og:url" content="${SITE_URL}">`,
          `<meta property="og:image" content="${SITE_URL}og.png">`,
          `<meta property="og:image:width" content="1200">`,
          `<meta property="og:image:height" content="630">`,
          `<meta name="twitter:card" content="summary_large_image">`,
        ].join('\n');
        if (!/<title>[^<]*<\/title>/.test(html)) throw new Error('site page: game.html has no <title> to replace');
        return html.replace(/<title>[^<]*<\/title>/, head);
      },
    },
    // The page is built from game.html; the site serves it as index.html.
    closeBundle() {
      renameSync(resolve(outDir, 'game.html'), resolve(outDir, 'index.html'));
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: 'site',
  plugins: [sitePage()],
  build: {
    target: ['es2020', 'safari14'],
    outDir: OUT_DIR,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: 'game.html' },
  },
});
