// The ending's ticket line by date (Asia/Bangkok, spec 6.6). Pure.
// Gap and after-event wording are from the owner's brief; the active-phase wording
// follows scene 2's stall 3 lines (ASSUMPTION).
import { ticketMode, thaiShortDate, resolveToday } from '../../logic/ticket.js';
import { TICKET_PHASES, EVENT_END } from '../config.js';
import { AFTER_EVENT_LINE } from '../data/script.js';

export { resolveToday };

export function ticketLine(today, phases = TICKET_PHASES, eventEnd = EVENT_END) {
  const s = ticketMode(today, phases, eventEnd);
  if (s.mode === 'AFTER_EVENT') return AFTER_EVENT_LINE;
  if (s.mode === 'ACTIVE') {
    const p = s.phase;
    if (p.id === 'flash') return `ตอนนี้ ${p.name} ${p.price} บาท วันนี้วันเดียวเท่านั้น!`;
    if (p.id === 'door') return `วันงานซื้อบัตรหน้างานได้ ราคา ${p.price} บาท`;
    return `ตอนนี้ ${p.name} ${p.price} บาท ขายถึง ${thaiShortDate(p.end)}`;
  }
  const { prev, next } = s;
  if (prev) return `${prev.name} หมดแล้ว! ${next.name} เปิด ${thaiShortDate(next.start)} ราคา ${next.price} บาท`;
  return `${next.name} เปิดขาย ${thaiShortDate(next.start)} ราคา ${next.price} บาท`;
}
