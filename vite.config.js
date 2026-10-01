import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: ['es2020', 'safari14'],
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    // index.html = scene 2 on its own; game.html = the full game (scene 1 -> scene 2).
    rollupOptions: { input: { main: 'index.html', game: 'game.html' } },
  },
});
