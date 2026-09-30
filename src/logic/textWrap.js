// Thai-aware wrapping. Thai has no spaces between words, so break on
// Intl.Segmenter word boundaries and never split a grapheme cluster
// (a consonant with its stacked vowel and tone mark).

const hasSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl;
const graphemeSeg = hasSegmenter ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null;
const wordSeg = hasSegmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;

export function graphemes(text) {
  if (graphemeSeg) return Array.from(graphemeSeg.segment(text), (s) => s.segment);
  // Fallback: attach Thai combining marks to the previous character.
  const out = [];
  for (const ch of text) {
    if (out.length && /[ัิ-ฺ็-๎]/.test(ch)) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

function words(text) {
  if (wordSeg) return Array.from(wordSeg.segment(text), (s) => s.segment);
  return text.split(/(\s+)/).filter(Boolean);
}

/**
 * Wrap `text` into lines no wider than `maxWidth` using `measure(str) -> px`.
 * Leading spaces on a new line are dropped.
 */
export function wrapText(text, maxWidth, measure) {
  const lines = [];
  let line = '';
  const push = () => {
    lines.push(line.trimEnd());
    line = '';
  };
  for (const word of words(text)) {
    if (line === '' && /^\s+$/.test(word)) continue;
    if (measure(line + word) <= maxWidth) {
      line += word;
      continue;
    }
    if (line !== '') push();
    if (/^\s+$/.test(word)) continue;
    if (measure(word) <= maxWidth) {
      line = word;
      continue;
    }
    // A single word wider than the box: break between grapheme clusters.
    for (const g of graphemes(word)) {
      if (line !== '' && measure(line + g) > maxWidth) push();
      line += g;
    }
  }
  if (line !== '') push();
  return lines;
}

/** Split wrapped lines into pages of at most `maxLines`. */
export function paginate(lines, maxLines) {
  const pages = [];
  for (let i = 0; i < lines.length; i += maxLines) pages.push(lines.slice(i, i + maxLines));
  return pages.length ? pages : [['']];
}
