import type {
  DemoData,
  Folio,
  Kiosk,
  KioskSession,
  KioskStep,
  KioskStepKey,
  KioskStepState,
  SupportOutcome
} from '../types';
import { scoped } from '../lib/scope';
import { recordEvent } from '../booking/model';

// Mirrors kiosk-agent: scan (agent.scan.*), VNPay SmartPOS, K750 write + TTLock add
// (agent.card.issue, held at reader), then agent.card.release.
export const STEPS: { key: KioskStepKey; label: string }[] = [
  { key: 'lookup', label: 'Tra cứu & kiểm tra lịch' },
  { key: 'guests', label: 'Hồ sơ khách' },
  { key: 'payment', label: 'Thanh toán' },
  { key: 'card', label: 'Kích hoạt thẻ' },
  { key: 'release', label: 'Nhả thẻ & hoàn tất' }
];

export const newSteps = (
  states: Partial<Record<KioskStepKey, KioskStep>> = {}
): Record<KioskStepKey, KioskStep> => ({
  lookup: { state: 'todo' },
  guests: { state: 'todo' },
  payment: { state: 'todo' },
  card: { state: 'todo' },
  release: { state: 'todo' },
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

export const currentStep = (s: KioskSession) =>
  STEPS.find((step) => s.steps[step.key].state !== 'done') ?? STEPS[STEPS.length - 1];

export const hasUnknown = (s: KioskSession) =>
  s.steps.payment.state === 'unknown' || s.steps.card.state === 'unknown';

// Paid but card not handed over, or POS/agent result pending: most urgent.
export const isUrgent = (s: KioskSession) =>
  hasUnknown(s) || (s.steps.payment.state === 'done' && s.steps.release.state !== 'done');

export const kioskWarnings = (k: Kiosk) => [
  ...(k.cardStock === 'empty' ? ['Hết thẻ'] : k.cardStock === 'low' ? ['Thẻ sắp hết'] : []),
  ...(k.rejectBinFull ? ['Hộp thu hồi đầy'] : []),
  ...k.faults
];

export const minutesSince = (at: string) => Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 60000));

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
