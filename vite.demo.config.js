// One self-contained HTML file for sharing a playable demo: the full game
// (game.html, scene 1 -> scene 2 -> scene 3). Output: dist-demo/game.html.
// DEMO=scene3 builds scene 3 on its own instead (scene3.html -> dist-demo-scene3/scene3.html).
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const scene3 = process.env.DEMO === 'scene3';

// A file opened in a phone's preview (iOS Files / Quick Look, some chat apps) shows the page
// without running it: this notice stays up there, and the game removes it as soon as it runs.
// A start-up error replaces it with the error, so a phone never shows a silent blank page.
const NOTICE = `<div id="demo-notice" style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;background:#000;color:#FFFF4F;font:15px/1.6 sans-serif;text-align:center">เปิดไฟล์นี้ใน Safari หรือ Chrome เพื่อเล่น<br>(Open this file in Safari or Chrome to play.)</div>
<script>
document.getElementById('demo-notice').remove();
window.addEventListener('error', function (e) {
  var d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;padding:12px;background:#000;color:#DE5238;font:13px/1.4 sans-serif';
  d.textContent = 'Error: ' + (e.message || e);
  document.body.appendChild(d);
});
</script>`;
const demoNotice = () => ({
  name: 'demo-notice',
  transformIndexHtml: (html) => html.replace(/<body([^>]*)>/, (m) => `${m}\n${NOTICE}`),
});

export default defineConfig({
  base: './',
  plugins: [demoNotice(), viteSingleFile()],
  build: {
    target: ['es2020', 'safari14'],
    outDir: scene3 ? 'dist-demo-scene3' : 'dist-demo',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 5000,
    rollupOptions: { input: scene3 ? 'scene3.html' : 'game.html' },
  },
});
