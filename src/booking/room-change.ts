import type { DemoData, Folio } from '../types';
import { getRoomPrice } from '../lib/rooms';

export function roomChangePrice(d: DemoData, f: Folio, room: string, start: Date, end: Date) {
  const rate = f.roomRate;
  if (!rate) return null;
  const originalStart = new Date(rate.start), originalEnd = new Date(rate.end);
  const oldQuote = getRoomPrice(d, f.branchId, rate.room, f.stayType, originalStart, originalEnd);
  // Compare both intervals against the same current pricebook; never replace the agreed price.
  const full = getRoomPrice(d, f.branchId, room, f.stayType, start, end);
  if (oldQuote == null || full == null || !Number.isFinite(oldQuote) || !Number.isFinite(full)) return null;
  return Math.max(0, rate.amount + full - oldQuote);
}
