// Loads real art if present, falls back to SPRITE NEEDED markers, slices frames and
// validates sizes (spec 9).
import { MANIFEST, validateEntry } from './manifest.js';
import { drawPlaceholderStrip } from './placeholders.js';
import { RENDER_SCALE as R } from '../config/constants.js';

// Only files that exist are listed, so missing art never causes 404s.
// src/assets/art/*.png  : RENDER_SCALE x design size (tools/prep-sprites.mjs)
// assets/{bg,props,stalls}/*.png : 1x design size (Python pipelines in tools/)
const REAL_ART = import.meta.glob('./art/*.png', { eager: true, query: '?url', import: 'default' });
const NATIVE_ART = import.meta.glob('../../assets/{bg,props,stalls,ui}/*.png', { eager: true, query: '?url', import: 'default' });
const LAYOUTS = import.meta.glob('../../assets/bg/alley_layout.json', { eager: true, import: 'default' });

const nativeKey = (path) => path.replace('../../assets/', '').replace(/\.png$/, ''); // 'props/cat'

function urlFor(entry) {
  if (entry.native) return NATIVE_ART[`../../assets/${entry.native}/${entry.file}`] ?? null;
  return REAL_ART[`./art/${entry.file}`] ?? null;
}

export function queueRealArt(scene) {
  scene.load.maxRetries = 0;
  for (const entry of MANIFEST) {
    const url = urlFor(entry);
    if (url) scene.load.image(entry.key, url);
  }
  // Native bg layers and props, keyed by path ('bg/alley_far', 'props/cat').
  for (const [path, url] of Object.entries(NATIVE_ART)) {
    if (!path.includes('/stalls/') && !path.includes('/ui/')) scene.load.image(nativeKey(path), url);
  }
}

/** Texture key of a native 1x layer if the pipeline produced it, else null. */
export function nativeLayer(scene, key) {
  return scene.textures.exists(key) ? key : null;
}

/** Prop instances from assets/bg/alley_layout.json whose texture loaded. */
export function layoutInstances(scene) {
  const layout = Object.values(LAYOUTS)[0];
  if (!layout) return [];
  return (layout.instances ?? [])
    .map((i) => ({ ...i, key: i.file.replace(/^assets\//, '').replace(/\.png$/, '') }))
    .filter((i) => scene.textures.exists(i.key));
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
  const texScale = new Map(); // texture px per design px
  for (const path of Object.keys(NATIVE_ART)) texScale.set(nativeKey(path), 1);
  scene.registry.set('texScale', texScale);
  for (const entry of MANIFEST) {
    const w = entry.frames * entry.frameWidth * R;
    const h = entry.frameHeight * R;
    const loaded = scene.textures.exists(entry.key);
    texScale.set(entry.key, loaded && entry.native ? 1 : R);
    if (loaded && entry.native) {
      const img = scene.textures.get(entry.key).getSourceImage();
      const row = validateEntry(entry, img.width, img.height, 1);
      addFrames(scene.textures.get(entry.key), entry.frameWidth, entry.frameHeight, entry.frames);
      report.push({ ...row, source: 'art', frames: entry.frames });
      continue;
    }
    if (loaded) {
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
