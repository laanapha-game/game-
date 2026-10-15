// Checkpoint codes are not shipped in the web page: the page only knows a salted hash of
// each code (src/data/checkpoints.js `hash`). The real codes live in tools/qr-codes.json,
// which only the QR printing tool reads. Codes are matched ignoring case, spaces and
// punctuation ("trickortreat 123" = "Trickortreat123!").
// This keeps the codes from being read straight out of the page source; it is not strong
// security (a determined person could still try words against the hashes).

export const normCode = (s) =>
  String(s ?? '')
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^A-Z0-9฀-๿]/g, '');

/** cyrb53 (53-bit) of the salted, normalised code, in base 36. */
export function hashCode(code, salt = 'laanapha-halloween-2026') {
  const str = salt + '|' + normCode(code);
  let h1 = 0xdeadbeef ^ 0x2f;
  let h2 = 0x41c6ce57 ^ 0x2f;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
