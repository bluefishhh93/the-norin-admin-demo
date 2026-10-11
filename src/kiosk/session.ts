import type {
  DemoData,
  Folio,
  Kiosk,
  KioskFlow,
  KioskSession,
  KioskStep,
  KioskStepKey,
  KioskStepState,
  SupportOutcome
} from '../types';
import { scoped } from '../lib/scope';
import { recordEvent } from '../booking/model';

export const FLOW_LABEL: Record<KioskFlow, string> = {
  booking: 'Đặt phòng',
  checkin: 'Nhận phòng',
  checkout: 'Trả phòng'
};

export const FLOW_STEPS: Record<KioskFlow, { key: KioskStepKey; label: string }[]> = {
  booking: [
    { key: 'lookup', label: 'Chọn phòng & thời gian' },
    { key: 'guests', label: 'Thông tin đặt phòng' },
    { key: 'payment', label: 'Thanh toán đặt phòng' }
  ],
  checkin: [
    { key: 'lookup', label: 'Tra cứu booking' },
    { key: 'schedule', label: 'Kiểm tra giờ nhận phòng' },
    { key: 'guests', label: 'Quét CCCD & xác nhận hồ sơ' },
    { key: 'face', label: 'Chụp khuôn mặt' },
    { key: 'policy', label: 'Đồng ý chính sách' },
    { key: 'card', label: 'Kích hoạt thẻ' },
    { key: 'release', label: 'Nhả thẻ & hoàn tất' }
  ],
  checkout: [
    { key: 'lookup', label: 'Đọc thẻ & tra cứu lượt ở' },
    { key: 'schedule', label: 'Xem chi phí trả phòng' },
    { key: 'payment', label: 'Thanh toán khoản còn lại' },
    { key: 'release', label: 'Hoàn tất & thu hồi thẻ' },
    { key: 'receipt', label: 'In hóa đơn' }
  ]
};

export const stepsFor = (s: KioskSession) => {
  if (s.flow === 'checkin' && s.staffHandling)
    return FLOW_STEPS.checkin
      .filter(({ key }) => key !== 'face' && key !== 'policy' && key !== 'release')
      .map((step) => step.key === 'guests' ? { ...step, label: 'Hồ sơ khách (lễ tân)' }
        : step.key === 'card' ? { ...step, label: 'Phát thẻ bằng E3 & nhận phòng' } : step);
  if (s.flow === 'checkout' && s.staffHandling)
    return FLOW_STEPS.checkout.map((step) => step.key === 'lookup'
      ? { ...step, label: 'Đọc thẻ bằng E3 & tìm booking' } : step);
  return FLOW_STEPS[s.flow];
};

export const newSteps = (
  states: Partial<Record<KioskStepKey, KioskStep>> = {}
): Record<KioskStepKey, KioskStep> => ({
  lookup: { state: 'todo' },
  schedule: { state: 'todo' },
  guests: { state: 'todo' },
  face: { state: 'todo' },
  policy: { state: 'todo' },
  payment: { state: 'todo' },
  card: { state: 'todo' },
  release: { state: 'todo' },
  receipt: { state: 'todo' },
  ...states
});

export const STEP_STATE: Record<KioskStepState, string> = {
  todo: 'Chưa làm',
  running: 'Đang làm',
  done: 'Xong',
  failed: 'Lỗi',
  unknown: 'Chưa rõ'
};

export type KioskStatus = 'support' | 'offline' | 'serving' | 'paused' | 'ready';

export const KIOSK_STATUS: Record<KioskStatus, { label: string; pill: string; rank: number }> = {
  support: { label: 'Cần hỗ trợ', pill: 'cleaning', rank: 0 },
  offline: { label: 'Mất kết nối', pill: 'cleaning', rank: 1 },
  serving: { label: 'Đang phục vụ', pill: 'occupied', rank: 2 },
  paused: { label: 'Tạm ngừng', pill: 'reserved', rank: 3 },
  ready: { label: 'Sẵn sàng', pill: 'available', rank: 4 }
};

export const SUPPORT_STATUS = {
  waiting: 'Chờ tiếp nhận',
  handling: 'Đang xử lý',
  done: 'Đã xong'
} as const;

export const openSupport = (s: KioskSession | null) =>
  s?.support && s.support.status !== 'done' ? s.support : null;

export const kioskStatus = (k: Kiosk): KioskStatus =>
  openSupport(k.session)
    ? 'support'
    : !k.agentOnline
      ? 'offline'
      : k.session
        ? 'serving'
        : k.paused
          ? 'paused'
          : 'ready';

export const currentStep = (s: KioskSession) => {
  const steps = stepsFor(s);
  return steps.find((step) => s.steps[step.key].state !== 'done') ?? steps[steps.length - 1];
};

export const hasUnknown = (s: KioskSession) =>
  stepsFor(s).some(({ key }) => s.steps[key].state === 'unknown');

export const isUrgent = (s: KioskSession) =>
  hasUnknown(s) ||
  (s.flow === 'checkin' && !s.staffHandling && s.steps.card.state === 'done' && s.steps.release.state !== 'done') ||
  (s.flow === 'checkout' && s.steps.payment.state === 'done' && s.steps.release.state !== 'done');

export const kioskWarnings = (k: Kiosk) => [
  ...(k.cardStock === 'empty' ? ['Hết thẻ'] : k.cardStock === 'low' ? ['Thẻ sắp hết'] : []),
  ...(k.rejectBinFull ? ['Hộp thu hồi đầy'] : []),
  ...k.faults
];

export const minutesSince = (at: string, now = Date.now()) =>
  Math.max(0, Math.floor((now - Date.parse(at)) / 60000));

export const fmtElapsed = (at: string, now = Date.now()) => {
  const total = minutesSince(at, now);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h} giờ ${String(m).padStart(2, '0')} phút` : `${m} phút`;
};

export const fmtAgo = (at: string, now = Date.now()) => {
  const m = minutesSince(at, now);
  return m < 1 ? 'vừa xong' : m < 60 ? `${m} phút trước` : `${fmtElapsed(at, now)} trước`;
};

export const sessionFolio = (d: DemoData, s: KioskSession): Folio | undefined =>
  s.bookingCode ? d.folios.find((f) => f.code === s.bookingCode) : undefined;

export const kioskOfBooking = (d: DemoData, code: string) =>
  d.kiosks.find((k) => k.session?.bookingCode === code);

export const openSupports = (d: DemoData) =>
  scoped(d, d.kiosks)
    .filter((k) => openSupport(k.session))
    .sort(
      (a, b) =>
        Number(isUrgent(b.session!)) - Number(isUrgent(a.session!)) ||
        Date.parse(a.session!.support!.requestedAt) - Date.parse(b.session!.support!.requestedAt)
    );

export const staffName = (d: Pick<DemoData, 'role'>) =>
  d.role === 'superadmin' ? 'Nguyễn Anh' : 'Lê Minh';

export const OUTCOME_LABEL: Record<SupportOutcome, string> = {
  kiosk: 'Tiếp tục tại kiosk',
  desk: 'Nhận phòng tại quầy',
  'no-show': 'Khách không nhận phòng'
};

export const logSession = (d: DemoData, s: KioskSession, text: string) => {
  const f = sessionFolio(d, s);
  if (f) recordEvent(f, text);
};

// K750 writes the card and TTLock registers it for the stay window.
export function issueKioskCard(d: DemoData, f: Folio) {
  const card = {
    uid: crypto.getRandomValues(new Uint32Array(1))[0].toString(16).toUpperCase().padStart(8, '0'),
    lockId: d.locks.find((l) => l.branchId === f.branchId && l.room === f.room)?.lockId ?? null,
    issuedAt: new Date().toISOString(),
    validFrom: f.effectiveCheckInTime,
    validTo: f.effectiveCheckOutTime
  };
  f.roomCards = [...(f.roomCards ?? []), card];
  return card;
}

// Desk check-in ends the kiosk session it was handed over from.
export function closeSessionAtDesk(d: DemoData, code: string) {
  const k = kioskOfBooking(d, code);
  if (!k?.session) return;
  if (openSupport(k.session))
    logSession(d, k.session, `Đóng hỗ trợ ${k.name}: ${OUTCOME_LABEL.desk}`);
  k.session = null;
}
