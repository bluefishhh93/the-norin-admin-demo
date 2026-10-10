import type { Booking, DemoData, PriceType, Room, StayType } from '../types';

export const ACTIVE_BOOKING = ['confirmed', 'checked-in', 'pending'];

export const roomKey = (room: Pick<Room, 'branchId' | 'number'>) => `${room.branchId}:${room.number}`;
export const classOf = (d: DemoData, room: Room) => d.classes.find(c => c.id === room.classId);
export const className = (d: DemoData, room: Room) => classOf(d, room)?.name || 'Chưa gán hạng';

export const bookingInterval = (d: DemoData, b: Booking): [number, number] | null => {
  const folio = d.folios.find(f => f.code === b.id);
  const start = Date.parse(folio?.effectiveCheckInTime || b.startsAt || '');
  const end = Date.parse(folio?.orderDetailCheckOutTime || folio?.effectiveCheckOutTime || b.endsAt || '');
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? [start, end] : null;
};

export interface BusyRange { booking: Booking; start: number; end: number }

export const roomBusy = (d: DemoData, room: Room): BusyRange[] =>
  d.bookings
    .filter(b => b.branchId === room.branchId && b.room === room.number && ACTIVE_BOOKING.includes(b.status))
    .flatMap(booking => {
      const i = bookingInterval(d, booking);
      const folio = d.folios.find(f => f.code === booking.id);
      const occupied = folio?.detailStatus === 2 && !folio.actualCheckOutAt;
      return i ? [{ booking, start: i[0], end: occupied ? Math.max(i[1], Date.now()) : i[1] }] : [];
    });

const clock = (value: string) => { const [h, m] = value.split(':').map(Number); return [h || 0, m || 0] as const; };

export const stayWindow = (d: DemoData, type: Exclude<StayType, 'Theo giờ'>, dateKey: string, nights = 1): [Date, Date] => {
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

export const checkRoomInterval = (d: DemoData, room: Room | undefined, start: Date, end: Date, type: StayType, excludeCode?: string, allowPast = false, validateDuration = true): true | string => {
  if (!room || (d.role !== 'superadmin' && room.branchId !== 'sontra')) return 'Phòng không khả dụng.';
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || (!allowPast && start.getTime() < Date.now() - 60000)) return 'Kiểm tra thời điểm nhận và trả phòng.';
  if (room.status === 'cleaning' && start.getTime() < Math.max(Date.now() + 60000, Date.parse(room.cleaningReadyAt || '') || Date.now() + d.rules.cleaningBuffer * 60000)) return 'Phòng đang dọn, chưa sẵn sàng trong khoảng này.';
  const current = d.folios.find(f => f.branchId === room.branchId && f.room === room.number && f.code !== excludeCode && f.detailStatus === 2 && f.status !== 3 && !f.actualCheckOutAt);
  if (current && start.getTime() <= Date.now() + 60000) return 'Phòng đang có khách, chưa thể nhận khách mới.';
  const hours = (end.getTime() - start.getTime()) / 3600000;
  if (validateDuration && type === 'Theo giờ' && (!Number.isInteger(hours) || hours < 2 || hours > d.rules.maxHourlyStay)) return `Đặt theo giờ từ 2 đến ${d.rules.maxHourlyStay} tiếng, bước 1 tiếng.`;
  if (validateDuration && type === 'Qua đêm' && (hours < 2 || hours > 24 || start.toDateString() === end.toDateString())) return 'Kiểm tra thời gian qua đêm.';
  if (validateDuration && type === 'Theo ngày' && (hours < 12 || start.toDateString() === end.toDateString())) return 'Đặt theo ngày phải trả phòng vào ngày hôm sau trở đi.';
  const buffer = d.rules.cleaningBuffer * 60000;
  const conflict = roomBusy(d, room).some(b => b.booking.id !== excludeCode && start.getTime() < b.end + buffer && end.getTime() + buffer > b.start);
  if (conflict) return `Lịch trùng booking khác hoặc chưa đủ ${d.rules.cleaningBuffer} phút dọn giữa hai lượt.`;
  const cls = classOf(d, room);
  const blocked = d.blocks.some(b => b.enabled && b.branchId === room.branchId && b.category === cls?.name &&
    start.getTime() < Date.parse(b.to || '9999-12-31') && end.getTime() > Date.parse(b.from));
  return blocked ? 'Hạng phòng đang bị khóa bán trong khoảng này.' : true;
};

const stayToPrice: Record<StayType, PriceType> = { 'Theo giờ': 'Giờ', 'Qua đêm': 'Qua đêm', 'Theo ngày': 'Ngày đêm' };

export const getRoomPrice = (d: DemoData, branchId: string, roomNumber: string, type: StayType, at: Date, end: Date): number | null => {
  const room = d.rooms.find(r => r.branchId === branchId && r.number === roomNumber);
  if (!room || !Number.isFinite(at.getTime()) || !Number.isFinite(end.getTime()) || end <= at) return null;
  const category = className(d, room);
  const p = d.pricebooks.find(row => row.branchId === branchId && row.category === category);
  if (!p) return null;
  const extra = Number(p.hourlySteps?.[1]?.price) || 0;
  const dateKey = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
  const priceType = stayToPrice[type];
  const season = d.season.find(s => s.branchId === branchId && s.category === category && s.type === priceType && dateKey >= s.from && dateKey <= s.to);
  const weekday = p.weekdayRates?.[priceType]?.[String(at.getDay())];
  if (type !== 'Theo giờ') {
    const first = new Date(at.getFullYear(), at.getMonth(), at.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    let total = 0;
    for (const day = new Date(first); day < last; day.setDate(day.getDate() + 1)) {
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      const rate = d.season.find(s => s.branchId === branchId && s.category === category && s.type === priceType && key >= s.from && key <= s.to);
      total += Number(rate?.price ?? p.weekdayRates?.[priceType]?.[String(day.getDay())] ?? (type === 'Qua đêm' ? p.overnight : p.daily));
    }
    return total;
  }
  const hours = Math.max(2, Math.ceil((end.getTime() - at.getTime()) / 3600000));
  if (hours > d.rules.maxHourlyStay) return null;
  return Number(season?.price ?? weekday ?? p.hourlySteps?.[0]?.price ?? p.hourly) + (hours - 2) * extra;
};

export const priceValue = (p: DemoData['pricebooks'][number], type: PriceType) =>
  ({ 'Ngày đêm': p.daily, 'Qua đêm': p.overnight, 'Giờ': p.hourlySteps?.[0]?.price ?? p.hourly })[type];
