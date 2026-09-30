// Dialogue system (spec 7.3): 9-slice chatbox, typewriter, tap to complete,
// tap to advance, blinking arrow. Pages that overflow the box are split into
// continuation pages (the text itself is never changed).
import { UI, LINE_HEIGHT_PX, TYPEWRITER_CPS, FONT_BODY_PX, TEXT_PAD_Y, CSS } from '../config/constants.js';
import { graphemes, paginate } from '../logic/textWrap.js';
import { wrap, addLines, textStyle, inkHeight } from './text.js';
import { addNineSlice, sizeNineSlice } from '../display/integerScale.js';

const DEPTH = 100;
const TAG_TOP = -8; // name tag straddles the box top edge
const TEXT_TOP = 10; // first line box starts below the name tag

export class Dialogue {
  constructor(scene) {
    this.scene = scene;
    const b = UI.chatbox;
    // Wrap by measured pixel width inside the padding (minus the arrow column),
    // paginate by how many lines fit including stacked marks. Text is never clipped.
    this.textWidth = b.w - b.pad * 2 - b.arrowW;
    this.textTop = b.y + TEXT_TOP;
    const bottom = b.y + b.h - b.pad;
    this.maxLines = Math.max(1, Math.floor((bottom - this.textTop - inkHeight()) / LINE_HEIGHT_PX) + 1);

    this.box = addNineSlice(scene, b.x, b.y, 'chatbox_9slice', 0, b.w, b.h, 8).setOrigin(0).setDepth(DEPTH);
    this.tag = addNineSlice(scene, b.x + 4, b.y + TAG_TOP, 'nametag_9slice', 0, 40, UI.nametag.h, 6).setOrigin(0).setDepth(DEPTH + 1);
    this.tagText = scene.add.text(0, 0, '', textStyle(FONT_BODY_PX, CSS.white)).setOrigin(0, 0).setDepth(DEPTH + 2);
    this.lines = addLines(scene, b.x + b.pad, this.textTop, this.maxLines, LINE_HEIGHT_PX, { depth: DEPTH + 1 });
    this.arrow = scene.add.sprite(b.x + b.w - 12, b.y + b.h - 11, 'ui_arrow', 0).setOrigin(0).setDepth(DEPTH + 2);
    scene.anims.exists('ui_arrow_blink') ||
      scene.anims.create({ key: 'ui_arrow_blink', frames: [0, 1].map((frame) => ({ key: 'ui_arrow', frame })), frameRate: 4, repeat: -1 });
    this.arrow.play('ui_arrow_blink');
    this.pages = [];
    this.setVisible(false);
  }

  setVisible(v) {
    [this.box, this.tag, this.tagText, this.arrow, ...this.lines].forEach((o) => o.setVisible(v));
    if (v) this.arrow.setVisible(this.complete);
    if (v && !this.speaker) {
      this.tag.setVisible(false);
      this.tagText.setVisible(false);
    }
  }

  setSpeaker(name) {
    this.speaker = name;
    if (!name) return;
    this.tagText.setText(name);
    const inkW = Math.ceil(this.tagText.width) - TEXT_PAD_Y * 2;
    const w = Math.max(24, inkW + UI.nametag.padX * 2);
    sizeNineSlice(this.tag, w, UI.nametag.h);
    // Integer position: canvas padding offsets, glyphs roughly centred in the tag.
    this.tagText.setPosition(this.tag.x + UI.nametag.padX - TEXT_PAD_Y, this.tag.y - TEXT_PAD_Y - 1);
  }

  /** Splits script pages into box-sized pages of wrapped lines. */
  layout(pages) {
    const out = [];
    for (const text of pages) {
      const wrapped = wrap(text, this.textWidth);
      const chunks = paginate(wrapped, this.maxLines);
      if (chunks.length > 1 && import.meta.env?.DEV) {
        console.warn(`[dialogue] page split into ${chunks.length} boxes (too long for the chatbox): ${text}`);
      }
      out.push(...chunks);
    }
    return out;
  }

  /**
   * Plays pages. Resolves after the last page is tapped away.
   * hooks: onType(pageIndex), onComplete(pageIndex, isLast)
   * keepOpen: leave the box on screen after the last page (for reply choices).
   */
  play(pages, { speaker = null, hooks = {}, keepOpen = false, waitLastTap = true } = {}) {
    this.pages = this.layout(pages);
    this.hooks = hooks;
    this.keepOpen = keepOpen;
    this.waitLastTap = waitLastTap;
    this.setSpeaker(speaker);
    this.setVisible(true);
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.showPage(0);
    });
  }

  showPage(i) {
    this.pageIndex = i;
    const lines = this.pages[i];
    this.pageGraphemes = lines.map((l) => graphemes(l));
    this.total = this.pageGraphemes.reduce((n, g) => n + g.length, 0);
    this.shown = 0;
    this.complete = false;
    this.arrow.setVisible(false);
    this.render();
    this.hooks.onType?.(i);
  }

  render() {
    let left = Math.floor(this.shown);
    this.lines.forEach((t, li) => {
      const g = this.pageGraphemes[li] ?? [];
      const n = Math.min(left, g.length);
      t.setText(g.slice(0, n).join(''));
      left -= n;
    });
  }

  finishPage() {
    this.shown = this.total;
    this.complete = true;
    this.render();
    const isLast = this.pageIndex === this.pages.length - 1;
    this.arrow.setVisible(!isLast || this.waitLastTap);
    this.hooks.onComplete?.(this.pageIndex, isLast);
    if (isLast && !this.waitLastTap) this.close();
  }

  /** Route a screen tap here while a dialogue is active. */
  tap() {
    if (!this.resolve) return;
    if (!this.complete) {
      this.finishPage();
      return;
    }
    if (this.pageIndex < this.pages.length - 1) this.showPage(this.pageIndex + 1);
    else this.close();
  }

  close() {
    const r = this.resolve;
    this.resolve = null;
    this.arrow.setVisible(false);
    if (!this.keepOpen) this.setVisible(false);
    r?.();
  }

  get active() {
    return !!this.resolve;
  }

  update(dtS) {
    if (!this.resolve || this.complete) return;
    this.shown = Math.min(this.total, this.shown + TYPEWRITER_CPS * dtS);
    this.render();
    if (this.shown >= this.total) this.finishPage();
  }
}
