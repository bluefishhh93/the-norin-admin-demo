import type { DemoData, Folio, PaymentTiming } from '../types';
import { folioPaid, folioTotal } from '../lib/folio';
import { fmtDateTime } from '../lib/format';

export const recordEvent = (folio: Folio, text: string) => {
  folio.events.unshift({ at: new Date().toISOString(), text });
};

export const statusLabel = (b: Folio) =>
  b.outcome === 'no-show'
    ? 'Không đến'
    : b.status === 3
      ? 'Đã hủy'
      : b.actualCheckOutAt || b.status === 2
        ? 'Đã trả phòng'
        : b.detailStatus === 2
          ? 'Đang ở'
          : b.status === 4
            ? 'Chờ xác nhận'
            : b.status === 5
              ? 'Giữ chỗ'
              : 'Đã xác nhận';
export const paymentTiming = (b: Folio): PaymentTiming =>
  b.paymentTiming ?? (folioPaid(b) >= folioTotal(b) ? 'prepaid' : 'postpaid');
export const refundable = (b: Folio) =>
  b.status === 3 ? (b.cancellationRefund ?? 0) : Math.max(0, folioPaid(b) - folioTotal(b));

// Older demo snapshots contain future bookings without folios. Preserve existing transactions.
export function normalizeBookings(d: DemoData) {
  for (const b of d.bookings) {
    let f = d.folios.find((row) => row.code === b.id);
    if (!f && b.startsAt && b.endsAt) {
      f = {
        code: b.id,
        branchId: b.branchId,
        room: b.room,
        masterProductId:
          d.rooms.find((r) => r.branchId === b.branchId && r.number === b.room)?.masterProductId ??
          null,
        customer: b.customer,
        phone: b.phone,
        stayType: b.type,
        status:
          b.status === 'pending'
            ? 4
            : b.status === 'checked-out'
              ? 2
              : b.status === 'cancelled' || b.status === 'no-show'
                ? 3
                : 1,
        detailStatus: b.status === 'checked-in' ? 2 : b.status === 'checked-out' ? 3 : 1,
        checkinDecision: 'ON_TIME',
        originalCheckInTime: b.startsAt,
        originalCheckOutTime: b.endsAt,
        effectiveCheckInTime: b.startsAt,
        effectiveCheckOutTime: b.endsAt,
        checkinAdjustmentStatus: null,
        checkinAssistanceRequestedAt: null,
        checkoutRequestedAt: null,
        actualCheckOutAt: b.status === 'checked-out' ? b.endsAt : null,
        orderDetails: [
          {
            name: `Phòng ${b.room} · ${b.type}`,
            productType: 6,
            phase: 'booking',
            quantity: 1,
            price: b.amount
          }
        ],
        voucherDiscount: 0,
        payments: [],
        source: 'Lễ tân',
        events: [],
        note: b.note,
        securityCode: b.securityCode,
        outcome:
          b.status === 'no-show' ? 'no-show' : b.status === 'cancelled' ? 'cancelled' : undefined
      };
      d.folios.push(f);
    }
    if (f) {
      b.startsAt = f.effectiveCheckInTime;
      b.endsAt = f.orderDetailCheckOutTime || f.effectiveCheckOutTime;
      f.paymentTiming ??= paymentTiming(f);
      f.securityCode ??= b.securityCode;
      f.note ??= b.note || '';
      if (f.status === 3) f.cancellationRefund ??= Math.max(0, folioPaid(f));
      const line = f.orderDetails.find((i) => i.productType === 6 && i.phase === 'booking');
      if (line)
        f.roomRate ??= {
          room: f.room,
          start: f.effectiveCheckInTime,
          end: f.effectiveCheckOutTime,
          amount: line.price * line.quantity
        };
    }
  }
  syncBookings(d);
  d.nextId = Math.max(
    d.nextId,
    ...d.bookings.map((b) => Number(b.id.replace('NR-', '')) + 1).filter(Number.isFinite)
  );
}

// Folios own stay state and money; Booking is a projection for the room board and summaries.
export function syncBookings(d: DemoData) {
  for (const folio of d.folios) syncBooking(d, folio);
}

function syncBooking(d: DemoData, f: Folio) {
  const b = d.bookings.find((row) => row.id === f.code);
  if (!b) return;
  Object.assign(b, {
    room: f.room,
    type: f.stayType,
    customer: f.customer,
    phone: f.phone,
    startsAt: f.effectiveCheckInTime,
    endsAt: f.orderDetailCheckOutTime || f.effectiveCheckOutTime,
    amount: folioTotal(f),
    note: f.note,
    time: fmtDateTime(f.effectiveCheckInTime),
    status:
      f.outcome === 'no-show'
        ? 'no-show'
        : f.status === 3
          ? 'cancelled'
          : f.actualCheckOutAt || f.status === 2
            ? 'checked-out'
            : f.detailStatus === 2
              ? 'checked-in'
              : f.status === 4
                ? 'pending'
                : 'confirmed'
  });
}
