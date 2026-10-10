import type { Booking, DemoData, PriceType, Room, StayType } from '../types';

export const CLEANING_MS = 30 * 60000;
export const ACTIVE_BOOKING = ['confirmed', 'checked-in', 'pending'];

export const roomKey = (room: Pick<Room, 'branchId' | 'number'>) => `${room.branchId}:${room.number}`;
export const classOf = (d: DemoData, room: Room) => d.classes.find(c => c.id === room.classId);
export const className = (d: DemoData, room: Room) => classOf(d, room)?.name || 'Chưa gán hạng';

export const bookingInterval = (d: DemoData, b: Booking): [number, number] | null => {
  const folio = d.folios.find(f => f.code === b.id);
  const start = Date.parse(b.startsAt || folio?.effectiveCheckInTime || '');
  const end = Date.parse(b.endsAt || folio?.effectiveCheckOutTime || '');
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? [start, end] : null;
};

export interface BusyRange { booking: Booking; start: number; end: number }

export const roomBusy = (d: DemoData, room: Room): BusyRange[] =>
  d.bookings
    .filter(b => b.branchId === room.branchId && b.room === room.number && ACTIVE_BOOKING.includes(b.status))
    .flatMap(booking => { const i = bookingInterval(d, booking); return i ? [{ booking, start: i[0], end: i[1] }] : []; });

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

export const checkRoomInterval = (d: DemoData, room: Room | undefined, start: Date, end: Date, type: StayType): true | string => {
  if (!room || (d.role !== 'superadmin' && room.branchId !== 'sontra')) return 'Phòng không khả dụng.';
  if (room.status === 'cleaning') return 'Phòng đang dọn; hãy hoàn tất dọn trước khi đặt.';
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || start < new Date()) return 'Kiểm tra thời điểm nhận và trả phòng.';
  const hours = (end.getTime() - start.getTime()) / 3600000;
  if (type === 'Theo giờ' && (!Number.isInteger(hours) || hours < 2 || hours > 8)) return 'Đặt theo giờ phải từ 2 đến 8 tiếng, bước 1 tiếng.';
  if (type === 'Qua đêm' && (hours < 2 || hours > 24 || start.toDateString() === end.toDateString())) return 'Kiểm tra thời gian qua đêm.';
  if (type === 'Theo ngày' && (hours < 12 || start.toDateString() === end.toDateString())) return 'Đặt theo ngày phải trả phòng vào ngày hôm sau trở đi.';
  const conflict = roomBusy(d, room).some(b => start.getTime() < b.end + CLEANING_MS && end.getTime() > b.start - CLEANING_MS);
  if (conflict) return 'Khoảng giờ đã có khách hoặc thuộc thời gian dọn phòng trước/sau 30 phút.';
  const cls = classOf(d, room);
  const blocked = d.blocks.some(b => b.enabled && b.branchId === room.branchId && b.category === cls?.name &&
    start.getTime() < Date.parse(b.to || '9999-12-31') && end.getTime() > Date.parse(b.from));
  return blocked ? 'Hạng phòng đang bị khóa bán trong khoảng này.' : true;
};

const stayToPrice: Record<StayType, PriceType> = { 'Theo giờ': 'Giờ', 'Qua đêm': 'Qua đêm', 'Theo ngày': 'Ngày đêm' };

export const getRoomPrice = (d: DemoData, branchId: string, roomNumber: string, type: StayType, at: Date, end: Date): number | null => {
  const room = d.rooms.find(r => r.branchId === branchId && r.number === roomNumber);
  const category = room ? className(d, room) : 'Deluxe';
  const p = d.pricebooks.find(row => row.branchId === branchId && row.category === category);
  if (!p) return null;
  const extra = Number(p.hourlySteps?.[1]?.price) || 0;
  const extraHours = Math.max(0, (end.getTime() - at.getTime()) / 3600000 - 2);
  const dateKey = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
  const priceType = stayToPrice[type];
  const season = d.season.find(s => s.branchId === branchId && s.category === category && s.type === priceType && dateKey >= s.from && dateKey <= s.to);
  if (season) return type === 'Theo giờ' ? Number(season.price) + extraHours * extra : Number(season.price);
  const weekday = p.weekdayRates?.[priceType]?.[String(at.getDay())];
  if (weekday != null) return type === 'Theo giờ' ? Number(weekday) + extraHours * extra : Number(weekday);
  if (type !== 'Theo giờ') return type === 'Qua đêm' ? +p.overnight : +p.daily;
  const hours = (end.getTime() - at.getTime()) / 3600000;
  if (!Number.isInteger(hours) || hours < 2 || hours > 8) return null;
  return (Number(p.hourlySteps?.[0]?.price) || +p.hourly) + (hours - 2) * extra;
};

export const priceValue = (p: DemoData['pricebooks'][number], type: PriceType) =>
  ({ 'Ngày đêm': p.daily, 'Qua đêm': p.overnight, 'Giờ': p.hourlySteps?.[0]?.price ?? p.hourly })[type];
