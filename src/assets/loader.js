// Loads real art if present, falls back to SPRITE NEEDED markers, slices frames and
// validates sizes (spec 9).
import { MANIFEST, validateEntry } from './manifest.js';
import { drawPlaceholderStrip } from './placeholders.js';
import { RENDER_SCALE as R } from '../config/constants.js';
import { scene1SheetUrl, scene1KrahangCombo } from '../integration/scene1.js';

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

const VIEWS = ['side', 'front'];
const inManifest = (key) => MANIFEST.some((m) => m.key === key);

/** Queues the player's sheets (spec 3) unless the host already loaded them or they are manifest art. */
export function queueCharacterSheets(scene, character) {
  for (const view of VIEWS) {
    const key = character?.[view]?.key;
    if (!key || scene.textures.exists(key) || inManifest(key)) continue;
    const url = scene1SheetUrl(key);
    if (url) scene.load.image(key, url);
  }
  // Stall 1: the Krahang riding this scene 1 character (generated, 3x).
  const combo = scene1KrahangCombo(character?.id);
  if (combo?.url && character.side?.key === combo.sideKey && !scene.textures.exists(combo.key)) {
    scene.load.spritesheet(combo.key, combo.url, { frameWidth: combo.frameWidth * R, frameHeight: combo.frameHeight * R });
  }
}

/**
 * Slices and checks the player's sheets after loading. A sheet may be 1x or
 * RENDER_SCALE x its design size (height = frameHeight x scale, width a whole number
 * of frames covering every frame the anims use). Returns a list of problems (empty = ok).
 */
export function prepareCharacterSheets(scene, character) {
  const problems = [];
  const texScale = scene.registry.get('texScale');
  for (const view of VIEWS) {
    const v = character?.[view];
    if (!v?.key) {
      problems.push(`${view}: no sheet`);
      continue;
    }
    if (inManifest(v.key)) continue; // built by buildTextures()
    if (!scene.textures.exists(v.key)) {
      problems.push(`${v.key}: not loaded`);
      continue;
    }
    const tex = scene.textures.get(v.key);
    const img = tex.getSourceImage();
    const k = img.height / character.frameHeight;
    const fw = character.frameWidth * k;
    const needed = Math.max(...Object.values(v.anims ?? {}).flat()) + 1;
    if ((k !== 1 && k !== R) || img.width % fw !== 0 || img.width / fw < needed) {
      problems.push(`${v.key}: ${img.width}x${img.height} does not fit ${character.frameWidth}x${character.frameHeight} frames at 1x or ${R}x (needs ${needed} frames)`);
      continue;
    }
    if (tex.frameTotal <= 1) addFrames(tex, fw, img.height, img.width / fw);
    texScale?.set(v.key, k);
  }
  return problems;
}
