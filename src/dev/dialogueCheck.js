// Dev check (not shipped behaviour): renders every page of every dialogue and
// both reply buttons with the real font and fails if any ink pixel, including
// stacked Thai vowels and tone marks, leaves its box, touches the name tag, or
// is clipped by the text canvas. Run with `npm run check:dialogue`.
import { UI } from '../config/constants.js';
import { ANGEL_PAGES, CHASER_INTRO_PAGES, STALL1_PAGES, STALL2_PAGES, STALL4_PAGES, STALL5_PAGES, REPLY_POLITE, REPLY_RUDE, NAMES } from '../data/script.js';
import { stall3Pages } from '../logic/ticket.js';

// Every stall 3 variant (spec 10 date rows).
const DATES = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-12', '2026-10-14', '2026-10-15', '2026-10-17', '2026-10-18', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26'];

function inkOf(t) {
  const { canvas } = t;
  const d = t.context.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++)
      if (d[(y * canvas.width + x) * 4 + 3] > 0) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
  if (maxX < 0) return null;
  const ox = t.x - t.displayOriginX;
  const oy = t.y - t.displayOriginY;
  const clipped = minX === 0 || minY === 0 || maxX === canvas.width - 1 || maxY === canvas.height - 1;
  return { x0: ox + minX, y0: oy + minY, x1: ox + maxX, y1: oy + maxY, clipped };
}

const inside = (ink, r) => ink.x0 >= r.x0 && ink.y0 >= r.y0 && ink.x1 <= r.x1 && ink.y1 <= r.y1;
const overlaps = (ink, r) => !(ink.x1 < r.x0 || ink.x0 > r.x1 || ink.y1 < r.y0 || ink.y0 > r.y1);

export function checkDialogues(scene) {
  const dlg = scene.dialogue;
  const b = UI.chatbox;
  // Inside the 1 px border.
  const box = { x0: b.x + 1, y0: b.y + 1, x1: b.x + b.w - 2, y1: b.y + b.h - 2 };
  const sets = [
    ['angel', ANGEL_PAGES, NAMES.angel],
    ['stall1', STALL1_PAGES, NAMES.stall1],
    ['stall2', STALL2_PAGES, NAMES.stall2],
    ['chaser intro', CHASER_INTRO_PAGES, null],
    ...DATES.map((d) => [`stall3 ${d}`, stall3Pages(d), NAMES.stall3]),
    ['stall4', STALL4_PAGES, NAMES.stall4],
    ['stall5', STALL5_PAGES, NAMES.stall5],
  ];
  const violations = [];
  const pages = [];
  dlg.setVisible(true);
  for (const [name, script, speaker] of sets) {
    dlg.setSpeaker(speaker);
    dlg.tag.setVisible(!!speaker);
    const tag = !speaker ? { x0: -1, y0: -1, x1: -1, y1: -1 } : { x0: dlg.tag.x, y0: dlg.tag.y, x1: dlg.tag.x + dlg.tag.displayWidth - 1, y1: dlg.tag.y + dlg.tag.displayHeight - 1 };
    const tagInk = speaker ? inkOf(dlg.tagText) : null;
    if (tagInk && (!inside(tagInk, tag) || tagInk.clipped)) violations.push({ set: name, what: 'name tag text', ink: tagInk });
    dlg.layout(script).forEach((lines, i) => {
      dlg.lines.forEach((t, li) => t.setText(lines[li] ?? ''));
      let bottom = 0;
      dlg.lines.forEach((t, li) => {
        const ink = inkOf(t);
        if (!ink) return;
        bottom = Math.max(bottom, ink.y1);
        if (!inside(ink, box)) violations.push({ set: name, page: i, line: li, what: 'leaves chatbox', text: lines[li], ink });
        if (ink.clipped) violations.push({ set: name, page: i, line: li, what: 'clipped by text canvas', text: lines[li] });
        if (overlaps(ink, tag)) violations.push({ set: name, page: i, line: li, what: 'overlaps name tag', text: lines[li] });
      });
      pages.push({ set: name, page: i, lines: lines.length, chars: lines.join('').length, text: lines.join(' / '), bottomMargin: box.y1 - bottom });
    });
  }
  dlg.lines.forEach((t) => t.setText(''));
  dlg.setVisible(false);

  // Reply buttons.
  scene.choices.show([
    { id: 'polite', text: REPLY_POLITE },
    { id: 'rude', text: REPLY_RUDE },
  ]);
  for (const { rect, texts, lines } of scene.choices.layoutInfo) {
    const r = { x0: rect.x + 1, y0: rect.y + 1, x1: rect.x + rect.w - 2, y1: rect.y + rect.h - 2 };
    texts.forEach((t, li) => {
      const ink = inkOf(t);
      if (ink && (!inside(ink, r) || ink.clipped)) violations.push({ set: 'reply', line: li, what: 'leaves button', text: lines[li], ink });
    });
  }
  scene.choices.clear();

  const longest = [...pages].sort((a, b) => b.chars - a.chars).slice(0, 3);
  return { ok: violations.length === 0, pageCount: pages.length, maxLines: dlg.maxLines, violations, longest };
}
