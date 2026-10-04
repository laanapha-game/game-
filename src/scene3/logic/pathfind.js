// A* on a PATH_GRID-unit grid over the real collision map (layout.boxFree), shared by
// the autopilot tour and the walking characters. Pure.
import { boxFree, WORLD } from './layout.js';
import { PATH_GRID, PLAYER_BOX } from '../config.js';

const G = PATH_GRID;
const COLS = Math.floor(WORLD.w / G);
const ROWS = Math.floor(WORLD.h / G);
let free = null;

function freeGrid() {
  if (free) return free;
  free = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) free[r * COLS + c] = boxFree(c * G + G / 2, r * G + G / 2, PLAYER_BOX) ? 1 : 0;
  return free;
}

const cellOf = (p) => ({ c: Math.max(0, Math.min(COLS - 1, Math.floor(p.x / G))), r: Math.max(0, Math.min(ROWS - 1, Math.floor(p.y / G))) });
const centre = (c, r) => ({ x: c * G + G / 2, y: r * G + G / 2 });

/** Nearest free cell to p (searching outward), or null. */
export function nearestFree(p, maxRing = 12) {
  const f = freeGrid();
  const { c, r } = cellOf(p);
  for (let ring = 0; ring <= maxRing; ring++)
    for (let dr = -ring; dr <= ring; dr++)
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const cc = c + dc;
        const rr = r + dr;
        if (cc >= 0 && rr >= 0 && cc < COLS && rr < ROWS && f[rr * COLS + cc]) return { c: cc, r: rr };
      }
  return null;
}

/**
 * Path of world points from a to b (exclusive of a, ending exactly at b when b is free),
 * or null when unreachable. 8-way moves, no corner cutting.
 */
export function findPath(a, b) {
  const f = freeGrid();
  const s = nearestFree(a);
  const t = nearestFree(b);
  if (!s || !t) return null;
  const N = COLS * ROWS;
  const g = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const si = s.r * COLS + s.c;
  const ti = t.r * COLS + t.c;
  const h = (i) => {
    const dc = Math.abs((i % COLS) - t.c);
    const dr = Math.abs(Math.floor(i / COLS) - t.r);
    return Math.max(dc, dr) + (Math.SQRT2 - 1) * Math.min(dc, dr);
  };
  // Binary heap of [f, i].
  const heap = [];
  const push = (fv, i) => {
    heap.push([fv, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  g[si] = 0;
  push(h(si), si);
  while (heap.length) {
    const [, i] = pop();
    if (closed[i]) continue;
    closed[i] = 1;
    if (i === ti) break;
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const cc = c + dc;
        const rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) continue;
        const j = rr * COLS + cc;
        if (!f[j] || closed[j]) continue;
        if (dr && dc && (!f[r * COLS + cc] || !f[rr * COLS + c])) continue; // no corner cutting
        const ng = g[i] + (dr && dc ? Math.SQRT2 : 1);
        if (ng < g[j]) {
          g[j] = ng;
          came[j] = i;
          push(ng + h(j), j);
        }
      }
  }
  if (!closed[ti]) return null;
  const cells = [];
  for (let i = ti; i !== si && i !== -1; i = came[i]) cells.push(i);
  cells.reverse();
  const pts = simplify(cells.map((i) => centre(i % COLS, Math.floor(i / COLS))));
  if (pts.length && boxFree(b.x, b.y, PLAYER_BOX)) pts[pts.length - 1] = { x: b.x, y: b.y };
  return pts;
}

/** Drop points on straight runs (same direction). */
function simplify(pts) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = out[out.length - 1];
    const n = pts[i + 1];
    if (a && n && Math.sign(p.x - a.x) === Math.sign(n.x - p.x) && Math.sign(p.y - a.y) === Math.sign(n.y - p.y)) continue;
    out.push(p);
  }
  return out;
}

/** Tests: the free-cell grid size. */
export const PATH_GRID_SIZE = { cols: COLS, rows: ROWS };
