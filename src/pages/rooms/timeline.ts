import type { Booking, DemoData, Room } from '../../types';
import { roomBusy } from '../../lib/rooms';

export const SLOT_MS = 30 * 60000;
export type TimelineView = 'day' | 'week' | 'month';
export interface Column { key: string; start: number; end: number; label: string; sub: string }
export type CellKind = 'open' | 'booked' | 'cleaning' | 'past' | 'blocked';
export interface Cell {
  key: string; start: number; end: number; kind: CellKind; reason: string;
  booking?: Booking; head?: boolean; span?: number; continuesBefore?: boolean; continuesAfter?: boolean;
}

export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const bookingState = (booking: Booking) => ({ confirmed: 'Đã xác nhận', 'checked-in': 'Đang ở', pending: 'Chờ xác nhận', 'checked-out': 'Đã trả phòng', cancelled: 'Đã hủy', 'no-show': 'Không đến' })[booking.status];

export const hourlyColumns = (day: string): Column[] => {
  const base = new Date(`${day}T00:00:00`).getTime();
  return Array.from({ length: 48 }, (_, i) => ({
    key: `${day}-${i}`, start: base + i * SLOT_MS, end: base + (i + 1) * SLOT_MS,
    label: `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`, sub: ''
  }));
};

export const calendarColumns = (day: string, view: Exclude<TimelineView, 'day'>): Column[] => {
  const start = new Date(`${day}T00:00:00`);
  if (view === 'month') start.setDate(1);
  else start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const count = view === 'month' ? new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate() : 7;
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    return { key: dateKey(date), start: date.getTime(), end: end.getTime(), label: `${date.getDate()}/${date.getMonth() + 1}`, sub: WEEKDAY[date.getDay()] };
  });
};

export const blockReason = (d: DemoData, room: Room, start: number, end: number): string | undefined => {
  const cls = d.classes.find(c => c.id === room.classId);
  const block = d.blocks.find(b => b.enabled && b.branchId === room.branchId && b.category === cls?.name &&
    start < Date.parse(b.to || '9999-12-31') && end > Date.parse(b.from));
  return block ? `Khóa bán: ${block.reason || 'Hạng phòng ngừng bán trong khoảng này'}` : undefined;
};

export const buildCells = (d: DemoData, room: Room, cols: Column[], now: number): Cell[] => {
  const busy = roomBusy(d, room).sort((a, b) => a.start - b.start);
  const buffer = d.rules.cleaningBuffer * 60000;
  const cells: Cell[] = cols.map(c => {
    const hit = busy.find(b => c.start < b.end && c.end > b.start);
    if (hit) return { ...c, kind: 'booked', booking: hit.booking, reason: `${bookingState(hit.booking)} · ${hit.booking.id} · ${hit.booking.customer}` };
    const near = busy.find(b => c.start < b.end + buffer && c.end > b.end);
    if (near) return { ...c, kind: 'cleaning', booking: near.booking, reason: `Dọn dự kiến ${d.rules.cleaningBuffer} phút sau ${near.booking.id}` };
    const blocked = blockReason(d, room, c.start, c.end);
    if (blocked) return { ...c, kind: 'blocked', reason: blocked };
    if (room.status === 'cleaning' && c.end > now && c.start < (room.cleaningReadyAt ? Date.parse(room.cleaningReadyAt) : now + buffer)) {
      return { ...c, kind: 'cleaning', reason: room.cleaningReadyAt ? `Đang dọn · dự kiến xong ${new Date(room.cleaningReadyAt).toLocaleString('vi-VN')}` : `Chờ dọn · dự kiến cần ${d.rules.cleaningBuffer} phút; phải hoàn tất dọn trước khi nhận khách` };
    }
    if (c.end <= now) return { ...c, kind: 'past', reason: 'Thời gian đã qua, không thể tạo booking mới tại ô này' };
    return { ...c, kind: 'open', reason: 'Trống · mở form để chọn lịch và kiểm tra khả dụng' };
  });
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (c.kind !== 'booked' && c.kind !== 'cleaning') continue;
    const prev = cells[i - 1];
    if (prev && prev.kind === c.kind && prev.booking?.id === c.booking?.id && prev.reason === c.reason) continue;
    let span = 1;
    while (cells[i + span] && cells[i + span].kind === c.kind && cells[i + span].booking?.id === c.booking?.id && cells[i + span].reason === c.reason) span++;
    c.head = true;
    c.span = span;
    const range = c.booking && busy.find(b => b.booking.id === c.booking!.id);
    c.continuesBefore = !!range && range.start < cols[0].start;
    c.continuesAfter = !!range && range.end > cols[cols.length - 1].end;
  }
  return cells;
};
