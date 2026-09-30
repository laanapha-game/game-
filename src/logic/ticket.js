// Stall 3 date-based ticket text (spec 7.5). Pure functions, no Phaser.
import { PHASES, EVENT_END } from '../data/ticketPhases.js';
import { STALL3_PAGE1, STALL3_PAGE2, STALL3_PAGE4, STALL3_AFTER_EVENT } from '../data/script.js';

const THAI_SHORT_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Device clock as an Asia/Bangkok calendar date, YYYY-MM-DD. */
export function bangkokDate(now = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Today's date; `?today=YYYY-MM-DD` overrides it in dev builds only. */
export function resolveToday({ now = new Date(), search = '', isDev = false } = {}) {
  if (isDev) {
    const override = new URLSearchParams(search).get('today');
    if (override && ISO_DATE.test(override)) return override;
  }
  return bangkokDate(now);
}

/** '2026-10-14' -> '14 ต.ค.' */
export function thaiShortDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${THAI_SHORT_MONTHS[m - 1]}`;
}

/** ISO dates compare correctly as strings. */
export function ticketMode(today, phases = PHASES, eventEnd = EVENT_END) {
  if (today > eventEnd) return { mode: 'AFTER_EVENT' };
  const active = phases.find((p) => today >= p.start && today <= p.end);
  if (active) return { mode: 'ACTIVE', phase: active };
  const ended = phases.filter((p) => p.end < today);
  const prev = ended.length ? ended[ended.length - 1] : null;
  const next = phases.find((p) => p.start > today) ?? null;
  return { mode: 'GAP', prev, next };
}

export function priceLine(state) {
  if (state.mode === 'ACTIVE') {
    const p = state.phase;
    if (p.id === 'flash') return `ตอนนี้ ${p.name} ${p.price} บาท (หนัง + กิจกรรม) วันนี้วันเดียวเท่านั้น!`;
    if (p.id === 'door') return `วันงานซื้อหน้างานได้ 1 Day Pass ${p.price} บาท`;
    return `ตอนนี้ ${p.name} ${p.price} บาท (หนัง + กิจกรรม) ขายถึง ${thaiShortDate(p.end)}`;
  }
  if (state.mode === 'GAP') {
    const { prev, next } = state;
    // next is always set: today <= EVENT_END and the door phase ends on EVENT_END.
    if (prev) return `${prev.name} หมดแล้ว! ${next.name} เปิด ${thaiShortDate(next.start)} ราคา ${next.price} บาท`;
    return `${next.name} เปิดขาย ${thaiShortDate(next.start)} ราคา ${next.price} บาท`;
  }
  return null;
}

/** All stall 3 dialogue pages for a given date. */
export function stall3Pages(today, phases = PHASES, eventEnd = EVENT_END) {
  const state = ticketMode(today, phases, eventEnd);
  if (state.mode === 'AFTER_EVENT') return [STALL3_PAGE1, STALL3_AFTER_EVENT];
  return [STALL3_PAGE1, STALL3_PAGE2, priceLine(state), STALL3_PAGE4];
}
