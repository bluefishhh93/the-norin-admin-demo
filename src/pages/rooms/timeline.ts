import type { Booking, DemoData, Room, StayType } from '../../types';
import { CLEANING_MS, roomBusy, stayWindow } from '../../lib/rooms';

export const SLOT_MS = 30 * 60000;
export const MIN_HOURLY_SLOTS = 4;
export const MAX_HOURLY_SLOTS = 16;

export type CellKind = 'open' | 'booked' | 'cleaning' | 'past' | 'blocked';
export interface Cell { key: string; start: number; end: number; kind: CellKind; booking?: Booking; head?: boolean; span?: number }

export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const hourlyColumns = (day: string) => {
  const base = new Date(`${day}T00:00:00`).getTime();
  return Array.from({ length: 48 }, (_, i) => ({
    key: `${day}-${i}`, start: base + i * SLOT_MS, end: base + (i + 1) * SLOT_MS,
    label: `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`, sub: ''
  }));
};

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const monthColumns = (d: DemoData, month: string, type: Exclude<StayType, 'Theo giờ'>) => {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const key = `${month}-${String(i + 1).padStart(2, '0')}`;
    const [s, e] = stayWindow(d, type, key);
    return { key, start: s.getTime(), end: e.getTime(), label: String(i + 1).padStart(2, '0'), sub: WEEKDAY[s.getDay()] };
  });
};

const isBlocked = (d: DemoData, room: Room, start: number, end: number) => {
  const cls = d.classes.find(c => c.id === room.classId);
  return d.blocks.some(b => b.enabled && b.branchId === room.branchId && b.category === cls?.name &&
    start < Date.parse(b.to || '9999-12-31') && end > Date.parse(b.from));
};

export const buildCells = (d: DemoData, room: Room, cols: { key: string; start: number; end: number }[], now: number): Cell[] => {
  const busy = roomBusy(d, room);
  const cells: Cell[] = cols.map(c => {
    const hit = busy.find(b => c.start < b.end && c.end > b.start);
    if (hit) return { ...c, kind: 'booked', booking: hit.booking };
    const near = busy.find(b => c.start < b.end + CLEANING_MS && c.end > b.start - CLEANING_MS);
    if (near) return { ...c, kind: 'cleaning', booking: near.booking };
    if (isBlocked(d, room, c.start, c.end)) return { ...c, kind: 'blocked' };
    if (c.start < now) return { ...c, kind: 'past' };
    return { ...c, kind: 'open' };
  });
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (c.kind !== 'booked' && c.kind !== 'cleaning') continue;
    const prev = cells[i - 1];
    if (prev && prev.kind === c.kind && prev.booking?.id === c.booking?.id) continue;
    let span = 1;
    while (cells[i + span] && cells[i + span].kind === c.kind && cells[i + span].booking?.id === c.booking?.id) span++;
    c.head = true;
    c.span = span;
  }
  return cells;
};
