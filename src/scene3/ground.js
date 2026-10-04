// The ground, pre-rendered once per look (day, night) into one canvas at 1 px per map
// unit: surfaces from the tile swatches (tools/scene3_art.py tiles.png), fences and tin
// walls at a constant thickness, and the flat items nobody walks behind (bean bags, the
// rug, the light cone, static shadows). Everything a character can pass behind is a
// sorted sprite instead (scenes/WorldScene.js).
import { R, WORLD, FENCES, BEANBAGS, BAND, LIGHT_CONE, OBJECTS } from './logic/layout.js';

const SURFACES = ['grass', 'lawn', 'paver', 'path', 'lane', 'asphalt', 'concrete', 'river', 'forest', 'sky', 'soil', 'cone'];
const T = 24;

/** Pattern for a surface from the tiles sheet. */
function patterns(ctx, tiles, night) {
  const out = {};
  SURFACES.forEach((s, i) => {
    const c = document.createElement('canvas');
    c.width = T;
    c.height = T;
    c.getContext('2d').drawImage(tiles, i * T, night ? T : 0, T, T, 0, 0, T, T);
    out[s] = ctx.createPattern(c, 'repeat');
  });
  return out;
}

const fill = (ctx, pat, [x0, y0, x1, y1]) => {
  ctx.fillStyle = pat;
  ctx.fillRect(Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0));
};

/**
 * @param {HTMLImageElement|HTMLCanvasElement} tiles   tiles.png
 * @param {(key:string)=>CanvasImageSource} img        world sprite source by key (e.g. 'w_fence')
 */
export function drawGround(canvas, tiles, img, night) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const P = patterns(ctx, tiles, night);
  const n = night ? '_n' : '';
  ctx.clearRect(0, 0, WORLD.w, WORLD.h);

  // Surroundings: sky and the far tree line to the north, grass, the town's concrete, the forest floor.
  fill(ctx, P.grass, [0, 0, WORLD.w, WORLD.h]);
  fill(ctx, P.sky, [0, 0, WORLD.w, R.north[3] - 8]);
  fill(ctx, P.forest, [0, R.north[3] - 8, WORLD.w, R.north[3]]);
  fill(ctx, P.concrete, R.town);
  fill(ctx, P.forest, R.forest);
  fill(ctx, P.forest, R.southTrees);

  // The hall: far bank and lawn, the river, the paved path, the courtyard, the south lawn.
  fill(ctx, P.lawn, [R.hall[0], R.hall[1], R.hall[2], R.path[1]]);
  fill(ctx, P.river, R.river);
  ctx.fillStyle = night ? '#0A1428' : '#2F86C0'; // banks
  ctx.fillRect(R.river[0], R.river[1], R.river[2] - R.river[0], 2);
  ctx.fillRect(R.river[0], R.river[3] - 2, R.river[2] - R.river[0], 2);
  fill(ctx, P.path, R.path);
  fill(ctx, P.paver, R.courtyard);
  fill(ctx, P.lawn, R.southLawn);

  // The lane and the soi with its dashed centre line.
  fill(ctx, P.lane, R.lane);
  fill(ctx, P.asphalt, R.soi);
  ctx.fillStyle = night ? '#8F8F60' : '#F4F0E0';
  const mid = Math.round((R.soi[1] + R.soi[3]) / 2);
  for (let x = 4; x < WORLD.w; x += 16) ctx.fillRect(x, mid, 8, 1);

  // Light cone from the screen toward the seats (dithered).
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(LIGHT_CONE.from.x, LIGHT_CONE.from.y);
  ctx.lineTo(LIGHT_CONE.to.x - 70, LIGHT_CONE.to.y + 30);
  ctx.lineTo(LIGHT_CONE.to.x + 30, LIGHT_CONE.to.y + 64);
  ctx.closePath();
  ctx.clip();
  fill(ctx, P.cone, [0, 0, WORLD.w, R.path[1]]);
  ctx.restore();

  // Flat, walkable: bean bags and the band's rug.
  for (const b of BEANBAGS) {
    const s = img(`w_beanbag_${b.colour}${n}`);
    ctx.drawImage(s, Math.round(b.x - s.width / 2), Math.round(b.y - s.height));
  }
  const rug = img(`w_rug${n}`);
  ctx.drawImage(rug, Math.round(BAND.rug.x - rug.width / 2), Math.round(BAND.rug.y - rug.height / 2));

  // Static ground shadows under props.
  const sh = img('w_shadow');
  for (const o of OBJECTS) {
    if (!['guesthouse', 'tree', 'treeBig', 'treeDark', 'table', 'stall', 'carport', 'desk', 'townHouse', 'deck', 'ghostStall'].includes(o.kind)) continue;
    const w = Math.max(8, Math.round(o.w * 0.8));
    ctx.drawImage(sh, Math.round(o.x - w / 2), Math.round(o.y - 3), w, 5);
  }

  // Fences (orange-red with bunting and lights) and tin walls, constant thickness.
  const fence = img(`w_fence${n}`);
  const tin = img(`w_tin${n}`);
  for (const f of FENCES) {
    const [x0, y0, x1, y1] = f.rect.map(Math.round);
    if (f.kind === 'tin') {
      for (let y = y0; y < y1; y += tin.height) ctx.drawImage(tin, 0, 0, x1 - x0, Math.min(tin.height, y1 - y), x0, y, x1 - x0, Math.min(tin.height, y1 - y));
      continue;
    }
    if (x1 - x0 >= y1 - y0) {
      // horizontal: the strip's fence band is its bottom 6 rows, bunting above
      for (let x = x0; x < x1; x += fence.width) {
        const w = Math.min(fence.width, x1 - x);
        ctx.drawImage(fence, 0, 0, w, fence.height, x, y1 - fence.height, w, fence.height);
      }
    } else {
      ctx.fillStyle = night ? '#8F2F20' : '#DE5238';
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.fillStyle = night ? '#4A1A14' : '#8F2F20';
      ctx.fillRect(x1 - 1, y0, 1, y1 - y0);
      const flags = ['#FFFF4F', '#F02DF0', '#FFFFFF'];
      for (let y = y0 + 2, i = 0; y < y1; y += 5, i++) {
        ctx.fillStyle = flags[i % 3];
        ctx.fillRect(x0 + 1, y, 2, 2);
      }
    }
  }
}
