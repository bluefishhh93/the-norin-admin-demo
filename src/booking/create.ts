import type { Booking, DemoData, Folio, StayType } from '../types';
import { branchName } from '../lib/format';
import { checkRoomInterval, getRoomPrice } from '../lib/rooms';

export interface BookingInput {
  branchId: string; room: string; type: StayType; customer: string; phone: string; email: string;
  securityCode: string; note: string; contactMethod: string; zaloPhone: string; start: string; end: string;
}

const PHONE = /^(03|05|07|08|09)\d{8}$/;

export const validateBooking = (d: DemoData, v: BookingInput): string | { start: Date; end: Date; amount: number } => {
  const branchId = d.role === 'superadmin' ? v.branchId : 'sontra';
  const room = d.rooms.find(r => r.branchId === branchId && r.number === v.room);
  const start = new Date(v.start);
  const end = new Date(v.end);
  const valid = checkRoomInterval(d, room, start, end, v.type);
  if (valid !== true) return valid;
  if (!v.customer.trim() || !PHONE.test(v.phone.trim()) || !/^\d{6}$/.test(v.securityCode) ||
    (v.contactMethod === 'email' && !v.email.trim()) || (v.contactMethod === 'zalo' && !PHONE.test(v.zaloPhone.trim())))
    return 'Kiểm tra tên, số điện thoại, mã nhận phòng và kênh liên hệ.';
  const amount = getRoomPrice(d, branchId, v.room, v.type, start, end);
  if (amount == null || !Number.isFinite(amount)) return 'Chưa có bảng giá cho phòng này.';
  return { start, end, amount };
};

export const applyBooking = (d: DemoData, v: BookingInput, start: Date, end: Date, amount: number): string => {
  const branchId = d.role === 'superadmin' ? v.branchId : 'sontra';
  const room = d.rooms.find(r => r.branchId === branchId && r.number === v.room);
  const id = `NR-${d.nextId++}`;
  const booking: Booking = {
    id, branchId, room: v.room, type: v.type, customer: v.customer.trim(), phone: v.phone.trim(), email: v.email.trim(),
    securityCode: v.securityCode, contactMethod: v.contactMethod, zaloPhone: v.zaloPhone.trim(), note: v.note.trim(),
    time: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(start).replace(', ', ' · '),
    startsAt: start.toISOString(), endsAt: end.toISOString(), amount, status: 'confirmed'
  };
  d.bookings.unshift(booking);
  if (!d.folios.some(f => f.code === id)) {
    const folio: Folio = {
      code: id, branchId, room: v.room, masterProductId: room?.masterProductId ?? null, customer: booking.customer, phone: booking.phone,
      stayType: v.type, status: 1, detailStatus: 1, checkinDecision: 'ON_TIME',
      originalCheckInTime: booking.startsAt!, originalCheckOutTime: booking.endsAt!, effectiveCheckInTime: booking.startsAt!, effectiveCheckOutTime: booking.endsAt!,
      checkinAdjustmentStatus: null, checkinAssistanceRequestedAt: null, checkoutRequestedAt: null, actualCheckOutAt: null,
      orderDetails: [{ name: `Phòng ${v.room} · ${v.type}`, productType: 6, phase: 'booking', quantity: 1, price: amount }],
      voucherDiscount: 0, payments: [], source: 'Lễ tân', events: [{ at: new Date().toISOString(), text: 'Lễ tân tạo booking trên admin' }]
    };
    d.folios.unshift(folio);
  }
  if (room && start.getTime() - Date.now() < 30 * 60000 && room.status === 'available') room.status = 'reserved';
  d.activities.unshift({ text: `Đã tạo đặt phòng #${id}`, detail: `${booking.customer} · ${branchName(branchId)} · Phòng ${v.room}`, time: 'Vừa xong', branchId });
  return id;
};
