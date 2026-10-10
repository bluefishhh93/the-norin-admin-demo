import type { Booking, DemoData, Folio, PaymentTiming, PayMethod, StayType } from '../types';
import { branchName } from '../lib/format';
import { checkRoomInterval, getRoomPrice } from '../lib/rooms';
import { recordPayment } from './actions';
import { addProducts, validateProducts } from './products';
import { quoteVoucher } from './voucher';
import { folioTotal } from '../lib/folio';
import type { ProductSelection } from '../types';

export interface BookingInput {
  branchId: string;
  room: string;
  type: StayType;
  customer: string;
  phone: string;
  email: string;
  note: string;
  start: string;
  end: string;
  paymentTiming: PaymentTiming;
  method: PayMethod;
  receiveNow: boolean;
  products: ProductSelection[];
  voucherCode: string;
}

export const validateBooking = (
  d: DemoData,
  v: BookingInput
): string | { start: Date; end: Date; amount: number } => {
  const room = d.rooms.find((r) => r.branchId === v.branchId && r.number === v.room);
  const start = v.receiveNow ? new Date() : new Date(v.start);
  if (v.receiveNow) start.setSeconds(0, 0);
  const end =
    v.receiveNow && v.type === 'Theo giờ'
      ? new Date(start.getTime() + (Date.parse(v.end) - Date.parse(v.start)))
      : new Date(v.end);
  const valid = checkRoomInterval(d, room, start, end, v.type);
  if (valid !== true) return valid;
  if (!v.customer.trim() || (v.phone && !/^\+?[\d\s()-]{8,20}$/.test(v.phone.trim())))
    return 'Nhập tên khách và kiểm tra số điện thoại.';
  const amount = getRoomPrice(d, v.branchId, v.room, v.type, start, end);
  if (amount == null || !Number.isFinite(amount)) return 'Chưa có bảng giá cho phòng này.';
  const productError = validateProducts(d, v.branchId, v.products);
  if (productError) return productError;
  const quote = quoteVoucher(d, v.branchId, v.type, start, amount, v.products, v.voucherCode);
  if (quote.error) return quote.error;
  return { start, end, amount };
};

export const applyBooking = (
  d: DemoData,
  v: BookingInput,
  start: Date,
  end: Date,
  amount: number
): string => {
  const room = d.rooms.find((r) => r.branchId === v.branchId && r.number === v.room)!;
  const id = `NR-${d.nextId++}`;
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
  const booking: Booking = {
    id,
    branchId: v.branchId,
    room: v.room,
    type: v.type,
    customer: v.customer.trim(),
    phone: v.phone.trim(),
    email: v.email.trim(),
    securityCode: code,
    note: v.note.trim(),
    time: '',
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    amount,
    status: 'confirmed'
  };
  d.bookings.unshift(booking);
  const folio: Folio = {
    code: id,
    branchId: v.branchId,
    room: v.room,
    masterProductId: room.masterProductId,
    customer: booking.customer,
    phone: booking.phone,
    stayType: v.type,
    status: 1,
    detailStatus: 1,
    checkinDecision: 'ON_TIME',
    paymentTiming: v.paymentTiming,
    securityCode: code,
    note: booking.note,
    originalCheckInTime: booking.startsAt!,
    originalCheckOutTime: booking.endsAt!,
    effectiveCheckInTime: booking.startsAt!,
    effectiveCheckOutTime: booking.endsAt!,
    checkinAdjustmentStatus: null,
    checkinAssistanceRequestedAt: null,
    checkoutRequestedAt: null,
    actualCheckOutAt: null,
    orderDetails: [
      {
        name: `Phòng ${v.room} · ${v.type}`,
        productType: 6,
        phase: 'booking',
        quantity: 1,
        price: amount
      }
    ],
    voucherDiscount: 0,
    payments: [],
    source: 'Lễ tân',
    events: [
      {
        at: new Date().toISOString(),
        text: `Tạo booking · ${v.paymentTiming === 'prepaid' ? 'Trả trước' : 'Trả sau'}`
      }
    ]
  };
  const quote = quoteVoucher(d, v.branchId, v.type, start, amount, v.products, v.voucherCode);
  addProducts(d, folio, v.products, 'booking');
  folio.roomRate = { room: v.room, start: start.toISOString(), end: end.toISOString(), amount };
  folio.voucherDiscount = quote.discount;
  folio.voucher = quote.voucher;
  if (quote.voucher) {
    const program = d.vouchers.find((row) => row.id === quote.voucher!.id)!;
    program.used++;
    const voucherCode = program.codes.find(
      (c) => c.code.toUpperCase() === quote.voucher!.code.toUpperCase()
    );
    if (voucherCode) {
      voucherCode.status = 'used';
      voucherCode.bookingCode = id;
    }
    folio.events.push({
      at: new Date().toISOString(),
      text: `Áp dụng voucher ${quote.voucher.code}`
    });
  }
  booking.amount = folioTotal(folio);
  if (v.paymentTiming === 'prepaid' && booking.amount > 0) {
    recordPayment(d, folio, booking.amount, v.method, 'Trả trước toàn bộ booking tại quầy');
  }
  d.folios.unshift(folio);
  d.activities.unshift({
    text: `Đã tạo booking #${id}`,
    detail: `${booking.customer} · ${branchName(d, v.branchId)} · Phòng ${v.room}`,
    time: 'Vừa xong',
    branchId: v.branchId
  });
  return id;
};
