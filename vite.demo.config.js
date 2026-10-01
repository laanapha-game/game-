// One self-contained HTML file for sharing a playable demo.
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: ['es2020', 'safari14'], outDir: 'dist-demo', assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 5000 },
});
