import { isAllowedBranch } from './scope';
import type { Booking, DemoData, PriceType, Room, RoomPrice, Season, StayType } from '../types';

export const ACTIVE_BOOKING = ['confirmed', 'checked-in', 'pending'];

export const roomKey = (room: Pick<Room, 'branchId' | 'number'>) =>
  `${room.branchId}:${room.number}`;
export const classOf = (d: DemoData, room: Room) => d.classes.find((c) => c.id === room.classId);
export const className = (d: DemoData, room: Room) => classOf(d, room)?.name || 'Chưa gán hạng';

export const bookingInterval = (d: DemoData, b: Booking): [number, number] | null => {
  const folio = d.folios.find((f) => f.code === b.id);
  const start = Date.parse(folio?.effectiveCheckInTime || b.startsAt || '');
  const end = Date.parse(
    folio?.orderDetailCheckOutTime || folio?.effectiveCheckOutTime || b.endsAt || ''
  );
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? [start, end] : null;
};

export interface BusyRange {
  booking: Booking;
  start: number;
  end: number;
}

export const roomBusy = (d: DemoData, room: Room): BusyRange[] =>
  d.bookings
    .filter(
      (b) =>
        b.branchId === room.branchId && b.room === room.number && ACTIVE_BOOKING.includes(b.status)
    )
    .flatMap((booking) => {
      const i = bookingInterval(d, booking);
      const folio = d.folios.find((f) => f.code === booking.id);
      const occupied = folio?.detailStatus === 2 && !folio.actualCheckOutAt;
      return i ? [{ booking, start: i[0], end: occupied ? Math.max(i[1], Date.now()) : i[1] }] : [];
    });

const clock = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  return [h || 0, m || 0] as const;
};

export const stayWindow = (
  d: DemoData,
  type: Exclude<StayType, 'Theo giờ'>,
  dateKey: string,
  nights = 1
): [Date, Date] => {
  const s = d.timeSetting;
  const [inH, inM] = clock(type === 'Qua đêm' ? s.nightCheckIn : s.dayCheckIn);
  const [outH, outM] = clock(type === 'Qua đêm' ? s.nightCheckOut : s.dayCheckOut);
  const start = new Date(`${dateKey}T00:00:00`);
  start.setHours(inH, inM, 0, 0);
  const end = new Date(`${dateKey}T00:00:00`);
  end.setDate(end.getDate() + nights);
  end.setHours(outH, outM, 0, 0);
  return [start, end];
};

export const checkRoomInterval = (
  d: DemoData,
  room: Room | undefined,
  start: Date,
  end: Date,
  type: StayType,
  excludeCode?: string,
  allowPast = false,
  validateDuration = true
): true | string => {
  if (!room || !isAllowedBranch(d, room.branchId))
    return 'Phòng không khả dụng.';
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start ||
    (!allowPast && start.getTime() < Date.now() - 60000)
  )
    return 'Kiểm tra thời điểm nhận và trả phòng.';
  if (
    room.status === 'cleaning' &&
    start.getTime() <
      Math.max(
        Date.now() + 60000,
        Date.parse(room.cleaningReadyAt || '') || Date.now() + d.rules.cleaningBuffer * 60000
      )
  )
    return 'Phòng đang dọn, chưa sẵn sàng trong khoảng này.';
  const current = d.folios.find(
    (f) =>
      f.branchId === room.branchId &&
      f.room === room.number &&
      f.code !== excludeCode &&
      f.detailStatus === 2 &&
      f.status !== 3 &&
      !f.actualCheckOutAt
  );
  if (current && start.getTime() <= Date.now() + 60000)
    return 'Phòng đang có khách, chưa thể nhận khách mới.';
  const hours = (end.getTime() - start.getTime()) / 3600000;
  if (
    validateDuration &&
    type === 'Theo giờ' &&
    (!Number.isInteger(hours) || hours < 2 || hours > d.rules.maxHourlyStay)
  )
    return `Đặt theo giờ từ 2 đến ${d.rules.maxHourlyStay} tiếng, bước 1 tiếng.`;
  if (
    validateDuration &&
    type === 'Qua đêm' &&
    (hours < 2 || hours > 24 || start.toDateString() === end.toDateString())
  )
    return 'Kiểm tra thời gian qua đêm.';
  if (
    validateDuration &&
    type === 'Theo ngày' &&
    (hours < 12 || start.toDateString() === end.toDateString())
  )
    return 'Đặt theo ngày phải trả phòng vào ngày hôm sau trở đi.';
  const buffer = d.rules.cleaningBuffer * 60000;
  const conflict = roomBusy(d, room).some(
    (b) =>
      b.booking.id !== excludeCode &&
      start.getTime() < b.end + buffer &&
      end.getTime() + buffer > b.start
  );
  if (conflict)
    return `Lịch trùng booking khác hoặc chưa đủ ${d.rules.cleaningBuffer} phút dọn giữa hai lượt.`;
  const blocked = d.blocks.some(
    (b) =>
      b.enabled &&
      b.branchId === room.branchId &&
      b.classId === room.classId &&
      start.getTime() < Date.parse(b.to || '9999-12-31') &&
      end.getTime() > Date.parse(b.from)
  );
  return blocked ? 'Hạng phòng đang bị khóa bán trong khoảng này.' : true;
};

const stayToPrice: Record<StayType, PriceType> = {
  'Theo giờ': 'Giờ',
  'Qua đêm': 'Qua đêm',
  'Theo ngày': 'Ngày đêm'
};

export const roomRate = (d: DemoData, room: Room): RoomPrice | null => {
  if (room.price) return room.price;
  const p = d.pricebooks.find(
    (row) => row.branchId === room.branchId && row.classId === room.classId
  );
  if (!p) return null;
  return {
    hourly: Number(p.hourlySteps?.[0]?.price) || +p.hourly,
    extra: Number(p.hourlySteps?.[1]?.price) || 0,
    overnight: +p.overnight,
    daily: +p.daily,
    weekdayRates: p.weekdayRates
  };
};

export const dayKeyOf = (at: Date) =>
  `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;

export const activeSeasons = (d: DemoData) =>
  (d.season || []).filter((s) => Array.isArray(s.rooms) && s.mode);

export const seasonFor = (d: DemoData, room: Pick<Room, 'branchId' | 'number'>, dayKey: string) =>
  activeSeasons(d).find(
    (s) =>
      s.branchId === room.branchId &&
      s.rooms.includes(room.number) &&
      dayKey >= s.from &&
      dayKey <= s.to
  );

export const applySeason = (price: number, s?: Season) =>
  !s
    ? price
    : s.mode === 'percent'
      ? Math.round((price * (1 + s.value / 100)) / 1000) * 1000
      : price + s.value;

export const baseRate = (rate: RoomPrice, type: PriceType, weekday?: number) => {
  const custom = weekday == null ? undefined : rate.weekdayRates?.[type]?.[String(weekday)];
  if (custom != null) return Number(custom);
  return type === 'Giờ' ? rate.hourly : type === 'Qua đêm' ? rate.overnight : rate.daily;
};

export const getRoomPrice = (
  d: DemoData,
  branchId: string,
  roomNumber: string,
  type: StayType,
  at: Date,
  end: Date
): number | null => {
  const room = d.rooms.find((r) => r.branchId === branchId && r.number === roomNumber);
  if (!room || !Number.isFinite(at.getTime()) || !Number.isFinite(end.getTime()) || end <= at)
    return null;
  const rate = roomRate(d, room);
  if (!rate) return null;
  const priceType = stayToPrice[type];
  if (type !== 'Theo giờ') {
    const first = new Date(at.getFullYear(), at.getMonth(), at.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    let total = 0;
    for (const day = new Date(first); day < last; day.setDate(day.getDate() + 1)) {
      total += applySeason(
        baseRate(rate, priceType, day.getDay()),
        seasonFor(d, room, dayKeyOf(day))
      );
    }
    return total;
  }
  const season = seasonFor(d, room, dayKeyOf(at));
  const base = applySeason(baseRate(rate, priceType, at.getDay()), season);
  const hours = Math.max(2, Math.ceil((end.getTime() - at.getTime()) / 3600000));
  if (hours > d.rules.maxHourlyStay) return null;
  return base + (hours - 2) * applySeason(rate.extra, season);
};
