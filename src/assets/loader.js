// Loads real art if present, falls back to SPRITE NEEDED markers, slices frames and
// validates sizes (spec 9).
import { MANIFEST, validateEntry } from './manifest.js';
import { drawPlaceholderStrip } from './placeholders.js';
import { RENDER_SCALE as R } from '../config/constants.js';

// Only files that exist are listed, so missing art never causes 404s.
const REAL_ART = import.meta.glob('./art/*.png', { eager: true, query: '?url', import: 'default' });

function urlFor(file) {
  return REAL_ART[`./art/${file}`] ?? null;
}

export function queueRealArt(scene) {
  scene.load.maxRetries = 0;
  for (const entry of MANIFEST) {
    const url = urlFor(entry.file);
    if (url) scene.load.image(entry.key, url);
  }
}

function addFrames(texture, frameWidth, frameHeight, frames) {
  for (let i = 0; i < frames; i++) texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
}

/**
 * Builds every texture in the manifest. Returns the asset report:
 * one row per entry with source ('art' | 'placeholder'), expected and actual size.
 */
export function buildTextures(scene) {
  const report = [];
  for (const entry of MANIFEST) {
    const w = entry.frames * entry.frameWidth * R;
    const h = entry.frameHeight * R;
    if (scene.textures.exists(entry.key)) {
      const tex = scene.textures.get(entry.key);
      const img = tex.getSourceImage();
      const row = validateEntry(entry, img.width, img.height, R);
      let { frames } = entry;
      let frameWidth = entry.frameWidth * R;
      let frameHeight = entry.frameHeight * R;
      if (!row.ok && entry.existing) {
        // Pre-made art: keep the known frame count, one row, read the real frame size.
        frameHeight = img.height;
        frameWidth = Math.floor(img.width / frames);
        row.note = `existing asset recorded as ${frames} x ${frameWidth}x${frameHeight}; update the manifest`;
      } else if (!row.ok) {
        frames = Math.max(1, Math.floor(img.width / frameWidth));
        row.note = 'size mismatch: fix the PNG or the manifest';
      }
      addFrames(tex, frameWidth, Math.min(frameHeight, img.height), frames);
      report.push({ ...row, source: 'art', frames });
    } else {
      const tex = scene.textures.createCanvas(entry.key, w, h);
      drawPlaceholderStrip(tex.getContext(), entry);
      tex.refresh();
      addFrames(tex, entry.frameWidth * R, entry.frameHeight * R, entry.frames);
      report.push({ ...validateEntry(entry, w, h, R), source: 'placeholder', frames: entry.frames });
    }
  }
  return report;
}

/** Frame layout actually in use for a key (may differ from the manifest for existing art). */
export function frameCount(scene, key) {
  return scene.textures.get(key).frameTotal - 1; // minus __BASE
}
