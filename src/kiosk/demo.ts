import type { DemoData, Kiosk } from '../types';
import { checkRoomInterval } from '../lib/rooms';
import { recordPayment } from '../booking/actions';
import { demoGuests, receiveDemoResult } from './workflow';
import { issueKioskCard, newSteps } from './session';

export const SCENARIOS = [
  { key: 'normal', label: 'Từng bước bình thường' },
  { key: 'scan', label: 'Quét CCCD lỗi' },
  { key: 'payment-success', label: 'Thanh toán tự động thành công → kích hoạt thẻ' },
  { key: 'cash', label: 'Chờ thu tiền mặt' },
  { key: 'payment-failed', label: 'Thanh toán thất bại' },
  { key: 'payment', label: 'Thanh toán chưa rõ / IPN chưa về' },
  { key: 'card', label: 'Kích hoạt thẻ chưa rõ' },
  { key: 'jam', label: 'Đã thu tiền · kẹt thẻ' },
  { key: 'offline', label: 'Mất kết nối agent' },
  { key: 'empty', label: 'Hết thẻ' },
  { key: 'bin', label: 'Hộp thu hồi đầy' },
  { key: 'ready', label: 'Máy rảnh' }
] as const;
export type Scenario = typeof SCENARIOS[number]['key'];

export function loadScenario(d: DemoData, k: Kiosk, scenario: Scenario): string | null {
  const code = `DEMO-${k.id}`;
  const previous = d.folios.find((f) => f.code === code);
  const start = new Date();
  const end = new Date(+start + 7200000);
  const room = d.rooms.find((r) => r.branchId === k.branchId &&
    d.locks.some((l) => l.branchId === k.branchId && l.room === r.number) &&
    checkRoomInterval(d, r, start, end, 'Theo giờ', code) === true);
  if (scenario !== 'ready' && !room) return 'Không có phòng có khóa còn trống trong 2 giờ tới để tạo demo.';
  if (previous?.detailStatus === 2) {
    const previousRoom = d.rooms.find((r) => r.branchId === k.branchId && r.number === previous.room)!;
    previousRoom.status = 'available';
  }
  d.folios = d.folios.filter((f) => f.code !== code);
  d.bookings = d.bookings.filter((b) => b.id !== code);
  d.cashbook = d.cashbook.filter((c) => !c.note.startsWith(`${code} ·`));
  d.cameras = d.cameras.filter((c) => c.bookingCode !== code);
  d.requests = d.requests.filter((r) => r.code !== code);
  Object.assign(k, { agentOnline: true, lastSeenAt: start.toISOString(), paused: false,
    cardStock: 'ok', rejectBinFull: false, faults: [], session: null });
  if (scenario === 'ready') return null;
  const f: DemoData['folios'][number] = {
    code, branchId: k.branchId, room: room!.number, masterProductId: room!.masterProductId,
    customer: 'Nguyễn Minh An', phone: '0901234567', stayType: 'Theo giờ',
    status: 1, detailStatus: 1, checkinDecision: 'ON_TIME', paymentTiming: 'prepaid',
    originalCheckInTime: start.toISOString(), originalCheckOutTime: end.toISOString(),
    effectiveCheckInTime: start.toISOString(), effectiveCheckOutTime: end.toISOString(),
    checkinAdjustmentStatus: null, checkoutRequestedAt: null, actualCheckOutAt: null,
    orderDetails: [{ name: `Phòng ${room!.number} · demo kiosk`, productType: 6, phase: 'booking', quantity: 1, price: 490000 }],
    voucherDiscount: 0, payments: [], source: 'Kiosk', guests: [], roomCards: [],
    events: [{ at: start.toISOString(), text: `Demo: ${SCENARIOS.find((s) => s.key === scenario)!.label}` }]
  };
  d.folios.unshift(f);
  d.bookings.unshift({ id: code, branchId: k.branchId, room: f.room, customer: f.customer,
    phone: f.phone, type: f.stayType, time: '', amount: 490000, status: 'confirmed',
    startsAt: f.effectiveCheckInTime, endsAt: f.effectiveCheckOutTime });
  const s = k.session = { bookingCode: code, startedAt: start.toISOString(), updatedAt: start.toISOString(),
    handedOver: false, support: null, paymentMethod: scenario === 'cash' ? 'cash' : 'card', steps: newSteps({ lookup: { state: 'running' } }) } as NonNullable<Kiosk['session']>;
  if (scenario === 'normal') return null;
  s.steps.lookup = { state: 'done', note: `Phòng ${f.room} · lịch hợp lệ` };
  s.steps.guests = { state: 'running' };
  if (scenario === 'scan') {
    s.steps.guests = { state: 'failed', note: 'Không đọc được CCCD · lễ tân nhập hồ sơ thủ công' };
  } else {
    f.guests = demoGuests(f.customer);
    s.steps.guests = { state: 'done', note: '1 hồ sơ hợp lệ' };
    s.steps.payment = { state: 'running', note: scenario === 'cash' ? 'Khách chọn tiền mặt · chờ lễ tân thu' : 'Đang chờ kết quả thanh toán SmartPOS / IPN' };
    if (scenario === 'payment-success') return receiveDemoResult(d, k, 'done');
    if (scenario === 'payment-failed') s.steps.payment = { state: 'failed', note: 'SmartPOS báo thanh toán thất bại · chưa thu tiền' };
    if (scenario === 'payment' || scenario === 'offline')
      s.steps.payment = { state: 'unknown', note: `SmartPOS · GD SP-${k.id} · chưa có kết quả` };
    if (['card', 'jam', 'empty', 'bin'].includes(scenario)) {
      recordPayment(d, f, 490000, 'card', 'VNPay SmartPOS (demo)', 'Kiosk');
      s.steps.payment = { state: 'done', note: 'Đã thu đủ 490.000đ' };
      s.steps.card = { state: scenario === 'card' ? 'unknown' : 'failed', note: 'Chờ xử lý thiết bị / đối chiếu thẻ' };
    }
    if (scenario === 'jam') {
      const card = issueKioskCard(d, f);
      s.steps.card = { state: 'done', note: `UID ${card.uid} · TTLock đã nhận thẻ` };
      s.steps.release = { state: 'failed', note: 'K750 kẹt thẻ khi nhả (0x0020)' };
      k.faults = ['K750: kẹt thẻ (0x0020)'];
    }
    if (scenario === 'empty') k.cardStock = 'empty';
    if (scenario === 'bin') k.rejectBinFull = true;
    if (scenario === 'offline') k.agentOnline = false;
  }
  if (scenario !== 'cash') s.support = { reason: SCENARIOS.find((row) => row.key === scenario)!.label,
    requestedAt: start.toISOString(), status: 'waiting' };
  return null;
}
