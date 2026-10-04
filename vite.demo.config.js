// One self-contained HTML file for sharing a playable demo: the full game
// (game.html, scene 1 -> scene 2 -> scene 3). Output: dist-demo/game.html.
// DEMO=scene3 builds scene 3 on its own instead (scene3.html -> dist-demo-scene3/scene3.html).
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const scene3 = process.env.DEMO === 'scene3';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: ['es2020', 'safari14'],
    outDir: scene3 ? 'dist-demo-scene3' : 'dist-demo',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 5000,
    rollupOptions: { input: scene3 ? 'scene3.html' : 'game.html' },
  },
});
