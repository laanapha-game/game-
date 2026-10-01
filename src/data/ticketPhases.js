// Ticket phases (spec 7.5). Edit prices and dates here only.
// Dates are inclusive, Asia/Bangkok calendar days, YYYY-MM-DD.
// From the official ticket poster (Flash 9 Oct, Early Bird 12-16 Oct, General 17-23 Oct, At door 24-25 Oct).
export const PHASES = [
  { id: 'flash', name: 'Flash Ticket', start: '2026-10-09', end: '2026-10-09', price: 189 },
  { id: 'early', name: 'Early Bird', start: '2026-10-12', end: '2026-10-16', price: 320 },
  { id: 'general', name: 'General Ticket', start: '2026-10-17', end: '2026-10-23', price: 390 },
  { id: 'door', name: 'At Door 1 Day Pass', start: '2026-10-24', end: '2026-10-25', price: 450 },
];

export const EVENT_END = '2026-10-25';
