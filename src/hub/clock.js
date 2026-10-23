// The hunt's opening time. Time comes from the server (the Date header of the site itself)
// when it can be read, so a phone with a wrong clock still opens at 12:00 Thai time on the
// 24th; until then the phone's clock is used.
//
// Staff can play before the opening to test the QR signs: open the site once with
// ?staff=<the staff code in tools/qr-codes.json>; that phone then skips the countdown.
import { HUNT_OPENS_AT, TIME_LOCK } from '../data/checkpoints.js';
import { hashCode } from './codehash.js';

export const OPENS_MS = Date.parse(HUNT_OPENS_AT);
const STAFF_KEY = 'laanapha.staff';
// hash of tools/qr-codes.json "_staff" (written by npm run qr)
export const STAFF_HASH = '4pkkfq0q6e';

let offset = 0; // server time - phone time

export const now = () => Date.now() + offset;
export const msUntilOpen = (t = now()) => Math.max(0, OPENS_MS - t);

function staff() {
  try {
    return localStorage.getItem(STAFF_KEY) === STAFF_HASH;
  } catch {
    return false;
  }
}
export function isOpen(t = now(), timeLock = TIME_LOCK) {
  return !timeLock || t >= OPENS_MS || staff();
}

/** ?staff=<code>: remember this phone as a staff phone. Returns true if the code was right. */
export function tryStaff(code) {
  if (!code || hashCode(code) !== STAFF_HASH) return false;
  try {
    localStorage.setItem(STAFF_KEY, STAFF_HASH);
  } catch {
    /* private mode: works for this visit only */
  }
  return true;
}

/** Read the server's clock once (HEAD request to this site). */
export async function syncServerTime() {
  try {
    const t0 = Date.now();
    const r = await fetch(`${location.origin}/?t=${t0}`, { method: 'HEAD', cache: 'no-store' });
    const d = Date.parse(r.headers.get('date') || '');
    if (!Number.isFinite(d)) return;
    const t1 = Date.now();
    offset = d + 500 - (t0 + t1) / 2; // the header is rounded down to the second
  } catch {
    /* offline: keep the phone's clock */
  }
}
