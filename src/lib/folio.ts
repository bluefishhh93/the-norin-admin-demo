import type { DemoData, Folio } from '../types';
import { getRoomPrice } from './rooms';

export const folioTotal = (b: Folio) =>
  Math.max(0, b.orderDetails.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0) - Number(b.voucherDiscount || 0));
export const folioPaid = (b: Folio) => b.payments.reduce((s, p) => s + Number(p.amount), 0);
export const folioDue = (b: Folio) => Math.max(0, folioTotal(b) - folioPaid(b));
export const isActive = (b: Folio) => b.status !== 3 && !b.actualCheckOutAt;
export const checkoutAt = (b: Folio) => b.orderDetailCheckOutTime || b.effectiveCheckOutTime || b.originalCheckOutTime;
export const cameraOf = (d: DemoData, b: Folio) => d.cameras.find(c => c.bookingCode === b.code);

export const nextFolio = (d: DemoData, b: Folio) => d.folios
  .filter(o => o.code !== b.code && o.branchId === b.branchId && o.room === b.room && isActive(o) && Date.parse(o.effectiveCheckInTime) > Date.now())
  .sort((a, c) => Date.parse(a.effectiveCheckInTime) - Date.parse(c.effectiveCheckInTime))[0];

export const isOverstay = (d: DemoData, b: Folio) => {
  const cam = cameraOf(d, b);
  const late = Date.now() - Date.parse(checkoutAt(b));
  return b.stayType === 'Theo giờ' && b.detailStatus === 2 && isActive(b) && cam?.state === 'GUEST_IN' && !cam.settledAt && late >= 15 * 60000 && late <= 12 * 3600000;
};

export const overstayType = (d: DemoData, b: Folio) => {
  const next = nextFolio(d, b);
  return !next || Date.parse(next.effectiveCheckInTime) - Date.now() >= 90 * 60000 ? 'EXTENDABLE' : 'BLOCKED';
};

export const extraHourFee = (d: DemoData, b: Folio) => {
  const start = new Date(b.effectiveCheckInTime);
  const two = getRoomPrice(d, b.branchId, b.room, 'Theo giờ', start, new Date(start.getTime() + 2 * 3600000));
  const three = getRoomPrice(d, b.branchId, b.room, 'Theo giờ', start, new Date(start.getTime() + 3 * 3600000));
  return two != null && three != null ? three - two : NaN;
};
