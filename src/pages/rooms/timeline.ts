import type { Booking, DemoData, Room, StayType } from '../../types';
import { roomBusy, stayWindow } from '../../lib/rooms';

export const SLOT_MS = 30 * 60000;
export type TimelineView = 'hour' | 'night' | 'day';
export type StayOnly = Exclude<StayType, 'Theo giờ'>;
export const VIEW_STAY: Record<TimelineView, StayType> = {
  hour: 'Theo giờ',
  night: 'Qua đêm',
  day: 'Theo ngày'
};
export interface Column {
  key: string;
  start: number;
  end: number;
  label: string;
  sub: string;
}
export type CellKind = 'open' | 'booked' | 'cleaning' | 'past' | 'blocked';
export interface Cell {
  key: string;
  start: number;
  end: number;
  kind: CellKind;
  reason: string;
  booking?: Booking;
  head?: boolean;
  span?: number;
  continuesBefore?: boolean;
  continuesAfter?: boolean;
}

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const bookingState = (booking: Booking) =>
  ({
    confirmed: 'Đã xác nhận',
    'checked-in': 'Đang ở',
    pending: 'Chờ xác nhận',
    'checked-out': 'Đã trả phòng',
    cancelled: 'Đã hủy',
    'no-show': 'Không đến'
  })[booking.status];

export const hourlyColumns = (day: string): Column[] =>
  Array.from({ length: 48 }, (_, i) => {
    const start = new Date(`${day}T00:00:00`);
    start.setHours(Math.floor(i / 2), i % 2 ? 30 : 0, 0, 0);
    return {
      key: `${day}-${i}`,
      start: start.getTime(),
      end: start.getTime() + SLOT_MS,
      label: `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
      sub: ''
    };
  });

export const clockOf = (ms: number) =>
  new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export const stayColumns = (d: DemoData, day: string, stay: StayOnly): Column[] => {
  const first = new Date(`${day.slice(0, 7)}-01T00:00:00`);
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(first);
    date.setDate(i + 1);
    const key = dateKey(date);
    const [start, end] = stayWindow(d, stay, key);
    return {
      key,
      start: start.getTime(),
      end: end.getTime(),
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      sub: `${WEEKDAY[date.getDay()]} · ${clockOf(start.getTime())} → ${clockOf(end.getTime())}`
    };
  });
};

export const blockReason = (
  d: DemoData,
  room: Room,
  start: number,
  end: number
): string | undefined => {
  const block = d.blocks.find(
    (b) =>
      b.enabled &&
      b.branchId === room.branchId &&
      b.classId === room.classId &&
      start < Date.parse(b.to || '9999-12-31') &&
      end > Date.parse(b.from)
  );
  return block ? `Khóa bán: ${block.reason || 'Hạng phòng ngừng bán trong khoảng này'}` : undefined;
};

export const buildCells = (
  d: DemoData,
  room: Room,
  cols: Column[],
  now: number,
  pastAt: 'start' | 'end' = 'end',
  cleaning = true
): Cell[] => {
  const busy = roomBusy(d, room).sort((a, b) => a.start - b.start);
  const buffer = d.rules.cleaningBuffer * 60000;
  const pad = cleaning ? 0 : buffer;
  const cells: Cell[] = cols.map((c) => {
    const hit = busy.find((b) => c.start < b.end + pad && c.end + pad > b.start);
    if (hit)
      return {
        ...c,
        kind: 'booked',
        booking: hit.booking,
        reason: `${bookingState(hit.booking)} · ${hit.booking.id} · ${hit.booking.customer}`
      };
    const near = cleaning && busy.find((b) => c.start < b.end + buffer && c.end > b.end);
    if (near)
      return {
        ...c,
        kind: 'cleaning',
        booking: near.booking,
        reason: `Dọn dự kiến ${d.rules.cleaningBuffer} phút sau ${near.booking.id}`
      };
    const ahead = cleaning && busy.find((b) => c.end > b.start - buffer && c.start < b.start);
    if (ahead)
      return {
        ...c,
        kind: 'cleaning',
        booking: ahead.booking,
        reason: `Dọn chuẩn bị ${d.rules.cleaningBuffer} phút trước ${ahead.booking.id}`
      };
    const blocked = blockReason(d, room, c.start, c.end);
    if (blocked) return { ...c, kind: 'blocked', reason: blocked };
    if (
      room.status === 'cleaning' &&
      c.end > now &&
      c.start < (room.cleaningReadyAt ? Date.parse(room.cleaningReadyAt) : now + buffer)
    ) {
      return {
        ...c,
        kind: 'cleaning',
        reason: room.cleaningReadyAt
          ? `Đang dọn · dự kiến xong ${new Date(room.cleaningReadyAt).toLocaleString('vi-VN')}`
          : `Chờ dọn · dự kiến cần ${d.rules.cleaningBuffer} phút; phải hoàn tất dọn trước khi nhận khách`
      };
    }
    if ((pastAt === 'start' ? c.start : c.end) <= now)
      return {
        ...c,
        kind: 'past',
        reason:
          c.end > now
            ? 'Đã qua giờ nhận phòng của khung này, không thể tạo booking mới'
            : 'Thời gian đã qua, không thể tạo booking mới tại ô này'
      };
    return { ...c, kind: 'open', reason: 'Trống · bấm để chọn' };
  });
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (c.kind !== 'booked' && c.kind !== 'cleaning') continue;
    const prev = cells[i - 1];
    if (
      prev &&
      prev.kind === c.kind &&
      prev.booking?.id === c.booking?.id &&
      prev.reason === c.reason
    )
      continue;
    let span = 1;
    while (
      cells[i + span] &&
      cells[i + span].kind === c.kind &&
      cells[i + span].booking?.id === c.booking?.id &&
      cells[i + span].reason === c.reason
    )
      span++;
    c.head = true;
    c.span = span;
    const range = c.booking && busy.find((b) => b.booking.id === c.booking!.id);
    c.continuesBefore = !!range && range.start < cols[0].start;
    c.continuesAfter = !!range && range.end > cols[cols.length - 1].end;
  }
  return cells;
};
