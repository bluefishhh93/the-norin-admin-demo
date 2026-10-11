import type { DemoData } from '../types';
import { fmtDateTime, money } from '../lib/format';
import { scoped } from '../lib/scope';
import { checkoutAt, folioDue, isActive, isOverstay } from '../lib/folio';

export type AlertKind = 'booking' | 'ops';

export interface Alert {
  id: string;
  kind: AlertKind;
  icon: string;
  tone: 'accent' | 'green' | 'amber' | 'blue' | 'red';
  title: string;
  detail: string;
  at: string;
  page: string;
  branchId: string;
  code?: string;
}

const BOOKING_WINDOW = 48 * 3600000;

export function buildAlerts(d: DemoData): Alert[] {
  const now = Date.now();
  const folios = scoped(d, d.folios);
  const active = folios.filter(isActive);
  const list: Alert[] = [];

  for (const b of folios) {
    const created = b.events[0]?.at;
    if (!created || now - Date.parse(created) > BOOKING_WINDOW) continue;
    list.push({
      id: `bk:${b.code}`,
      kind: 'booking',
      icon: 'bi-calendar-plus',
      tone: 'accent',
      title: `Booking mới #${b.code}`,
      detail: `${b.customer} · Phòng ${b.room} · ${b.stayType} · ${b.source}`,
      at: created,
      page: 'booking-lookup',
      branchId: b.branchId,
      code: b.code
    });
  }

  for (const r of scoped(d, d.requests).filter((r) => r.status === 'pending')) {
    const f = folios.find((x) => x.code === r.code);
    list.push({
      id: `cash:${r.id}`,
      kind: 'ops',
      icon: 'bi-cash-coin',
      tone: 'green',
      title: r.context === 'CHECKOUT' ? 'Kiosk yêu cầu thu tiền trả phòng' : 'Kiosk yêu cầu thu tiền đặt phòng',
      detail: `#${r.code}${f ? ` · Phòng ${f.room} · ${money(folioDue(f))}` : ''} · ${r.kiosk}`,
      at: r.requestedAt,
      page: 'cashier',
      branchId: r.branchId,
      code: r.code
    });
  }

  for (const b of active) {
    b.orderDetails.forEach((item, i) => {
      if (item.phase !== 'stay' || item.fulfillment !== 'new') return;
      list.push({
        id: `order:${b.code}:${i}`,
        kind: 'ops',
        icon: 'bi-bag-check',
        tone: 'blue',
        title: `Phòng ${b.room} gọi thêm món`,
        detail: `${item.name} × ${item.quantity}`,
        at: item.orderedAt || b.events[0]?.at || new Date(now).toISOString(),
        page: 'stay-orders',
        branchId: b.branchId,
        code: b.code
      });
    });
    if (b.checkinAdjustmentStatus === 'PENDING_REVIEW')
      list.push({
        id: `adj:${b.code}`,
        kind: 'ops',
        icon: 'bi-clock-history',
        tone: 'amber',
        title: `Chờ duyệt điều chỉnh giờ · Phòng ${b.room}`,
        detail: `#${b.code} · ${fmtDateTime(b.originalCheckInTime)} → ${fmtDateTime(b.effectiveCheckInTime)}`,
        at: b.effectiveCheckInTime,
        page: 'work-queue',
        branchId: b.branchId,
        code: b.code
      });
    if (b.checkinAssistanceRequestedAt && !b.assistanceResolvedAt)
      list.push({
        id: `assist:${b.code}:${b.checkinAssistanceRequestedAt}`,
        kind: 'ops',
        icon: 'bi-person-raised-hand',
        tone: 'amber',
        title: `Khách cần hỗ trợ check-in · Phòng ${b.room}`,
        detail: `#${b.code} · ${b.customer}`,
        at: b.checkinAssistanceRequestedAt,
        page: 'work-queue',
        branchId: b.branchId,
        code: b.code
      });
    if (b.checkoutRequestedAt && !b.checkoutHandledAt)
      list.push({
        id: `co:${b.code}:${b.checkoutRequestedAt}`,
        kind: 'ops',
        icon: 'bi-box-arrow-right',
        tone: 'blue',
        title: `Yêu cầu trả phòng · Phòng ${b.room}`,
        detail: `#${b.code} · ${folioDue(b) ? `còn nợ ${money(folioDue(b))}` : 'đã trả đủ'}`,
        at: b.checkoutRequestedAt,
        page: 'work-queue',
        branchId: b.branchId,
        code: b.code
      });
    if (isOverstay(d, b))
      list.push({
        id: `over:${b.code}:${checkoutAt(b)}`,
        kind: 'ops',
        icon: 'bi-exclamation-triangle',
        tone: 'red',
        title: `Quá giờ · Phòng ${b.room}`,
        detail: `#${b.code} · quá ${Math.floor((now - Date.parse(checkoutAt(b))) / 60000)} phút, camera còn khách`,
        at: checkoutAt(b),
        page: 'work-queue',
        branchId: b.branchId,
        code: b.code
      });
  }

  scoped(d, d.notifications).forEach((n) =>
    list.push({
      id: `noti:${n.code}:${n.at}`,
      kind: 'ops',
      icon: 'bi-bell',
      tone: 'accent',
      title: n.text,
      detail: `#${n.code}`,
      at: n.at,
      page: 'booking-lookup',
      branchId: n.branchId,
      code: n.code
    })
  );

  return list.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 50);
}

export const timeAgo = (at: string) => {
  const diff = Math.max(0, Date.now() - Date.parse(at));
  if (diff < 60000) return 'Vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return fmtDateTime(at);
};
