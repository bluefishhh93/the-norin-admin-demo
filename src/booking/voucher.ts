import type {
  AppliedVoucher,
  DemoData,
  Folio,
  ProductSelection,
  StayType,
  Voucher
} from '../types';
import { saleProducts } from './products';

export function voucherEligible(v: Voucher, branchId: string, type: StayType, start: Date) {
  const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  const weekday = start.getDay() || 7;
  return (
    v.active &&
    (v.branchId === branchId || v.branchId === 'all') &&
    (v.stay === 'Tất cả' || v.stay === type) &&
    key >= v.starts &&
    key <= v.ends &&
    v.used < v.quota &&
    v.weekdays.includes(weekday)
  );
}
export function quoteVoucher(
  d: DemoData,
  branchId: string,
  type: StayType,
  start: Date,
  roomAmount: number,
  items: ProductSelection[],
  code: string
): { discount: number; voucher?: AppliedVoucher; error?: string } {
  const products = saleProducts(d, branchId);
  const goods = items.reduce(
    (sum, i) => sum + (products.find((p) => p.id === i.productId)?.price ?? 0) * i.quantity,
    0
  );
  const eligible = d.vouchers.filter((v) => voucherEligible(v, branchId, type, start));
  const manual = code.trim().toUpperCase();
  const candidates = manual
    ? eligible.filter(
        (v) =>
          v.mode === 'MANUAL' &&
          (v.codes.some((c) => c.code.toUpperCase() === manual)
            ? v.codes.some((c) => c.code.toUpperCase() === manual && c.status === 'available')
            : v.code.toUpperCase() === manual)
      )
    : eligible.filter((v) => v.mode === 'AUTO');
  if (manual && !candidates.length)
    return {
      discount: 0,
      error: 'Voucher không hợp lệ hoặc không áp dụng cho lịch/chi nhánh này.'
    };
  const quotes = candidates
    .map((v) => {
      const base = v.scope === 'ROOM_ONLY' ? roomAmount : roomAmount + goods;
      const discount = Math.min(
        base,
        v.type === 'percent' ? Math.round((base * v.value) / 100) : v.value
      );
      return {
        discount,
        voucher: {
          id: v.id,
          code: manual || v.code,
          name: v.name,
          scope: v.scope,
          type: v.type,
          value: v.value,
          base
        } as AppliedVoucher
      };
    })
    .sort((a, b) => b.discount - a.discount);
  return quotes[0] ?? { discount: 0 };
}
export function refreshVoucher(f: Folio) {
  if (!f.voucher) return;
  const base = f.orderDetails
    .filter(
      (i) =>
        i.fulfillment !== 'cancelled' &&
        i.phase === 'booking' &&
        (f.voucher!.scope === 'ENTIRE_BILL' || i.productType === 6)
    )
    .reduce((s, i) => s + i.price * i.quantity, 0);
  // Later additions do not extend an already applied promotion.
  const eligibleBase = Math.min(f.voucher.base, base);
  f.voucherDiscount = Math.min(
    eligibleBase,
    f.voucher.type === 'percent'
      ? Math.round((eligibleBase * f.voucher.value) / 100)
      : f.voucher.value
  );
}
