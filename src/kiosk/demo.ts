import type { DemoData, Kiosk, KioskFlow } from '../types';
import { checkRoomInterval } from '../lib/rooms';
import { recordPayment } from '../booking/actions';
import { demoGuests } from './workflow';
import { FLOW_LABEL, issueKioskCard, newSteps } from './session';

export const SCENARIOS = [
  { key: 'checkin-normal', flow: 'checkin', label: 'Nhận phòng · Từng bước' },
  { key: 'scan', flow: 'checkin', label: 'Nhận phòng · Quét CCCD lỗi' },
  { key: 'checkin-schedule', flow: 'checkin', label: 'Nhận phòng · Cần xác nhận giờ' },
  { key: 'checkin-face', flow: 'checkin', label: 'Nhận phòng · Chụp ảnh lỗi' },
  { key: 'card', flow: 'checkin', label: 'Nhận phòng · Kích hoạt thẻ chưa rõ' },
  { key: 'jam', flow: 'checkin', label: 'Nhận phòng · Kẹt thẻ khi nhả' },
  { key: 'empty', flow: 'checkin', label: 'Nhận phòng · Hết thẻ' },
  { key: 'bin', flow: 'checkin', label: 'Nhận phòng · Hộp thu hồi đầy' },
  { key: 'offline', flow: 'checkin', label: 'Nhận phòng · Mất kết nối agent' },
  { key: 'booking-normal', flow: 'booking', label: 'Đặt phòng · Từng bước' },
  { key: 'booking-cash', flow: 'booking', label: 'Đặt phòng · Chờ thu tiền mặt' },
  { key: 'booking-payment-failed', flow: 'booking', label: 'Đặt phòng · Thanh toán thất bại' },
  { key: 'booking-payment', flow: 'booking', label: 'Đặt phòng · Chưa có kết quả thanh toán' },
  { key: 'checkout-normal', flow: 'checkout', label: 'Trả phòng · Từng bước' },
  { key: 'checkout-card', flow: 'checkout', label: 'Trả phòng · Không đọc được thẻ' },
  { key: 'checkout-cash', flow: 'checkout', label: 'Trả phòng · Chờ thu tiền mặt' },
  { key: 'checkout-payment-failed', flow: 'checkout', label: 'Trả phòng · Thanh toán thất bại' },
  { key: 'checkout-payment', flow: 'checkout', label: 'Trả phòng · Chưa có kết quả thanh toán' },
  { key: 'checkout-print', flow: 'checkout', label: 'Trả phòng · Lỗi in hóa đơn' },
  { key: 'ready', flow: null, label: 'Máy rảnh' }
] as const;
export type Scenario = typeof SCENARIOS[number]['key'];

export function loadScenario(d: DemoData, k: Kiosk, scenario: Scenario): string | null {
  const config = SCENARIOS.find((row) => row.key === scenario)!;
  const code = `DEMO-${k.id}`;
  const previous = d.folios.find((f) => f.code === code);
  const start = new Date();
  const end = new Date(+start + 7200000);
  const room = d.rooms.find((r) => r.branchId === k.branchId &&
    d.locks.some((l) => l.branchId === k.branchId && l.room === r.number) &&
    checkRoomInterval(d, r, start, end, 'Theo giờ', code) === true);
  if (scenario !== 'ready' && !room) return 'Không có phòng có khóa còn trống trong 2 giờ tới để tạo demo.';
  if (previous?.detailStatus === 2) {
    const previousRoom = d.rooms.find((r) => r.branchId === k.branchId && r.number === previous.room);
    if (previousRoom) previousRoom.status = 'available';
  }
  d.folios = d.folios.filter((f) => f.code !== code);
  d.bookings = d.bookings.filter((b) => b.id !== code);
  d.cashbook = d.cashbook.filter((c) => !c.note.startsWith(`${code} ·`));
  d.cameras = d.cameras.filter((c) => c.bookingCode !== code);
  d.requests = d.requests.filter((r) => r.code !== code);
  Object.assign(k, { agentOnline: true, lastSeenAt: start.toISOString(), paused: false,
    cardStock: 'ok', rejectBinFull: false, faults: [], session: null });
  if (scenario === 'ready') return null;
  const flow = config.flow as KioskFlow;
  const f: DemoData['folios'][number] = {
    code, branchId: k.branchId, room: room!.number, masterProductId: room!.masterProductId,
    customer: 'Nguyễn Minh An', phone: '0901234567', stayType: 'Theo giờ',
    status: 1, detailStatus: flow === 'checkout' ? 2 : 1,
    checkinDecision: 'ON_TIME', paymentTiming: flow === 'checkin' ? 'postpaid' : 'prepaid',
    originalCheckInTime: start.toISOString(), originalCheckOutTime: end.toISOString(),
    effectiveCheckInTime: start.toISOString(), effectiveCheckOutTime: end.toISOString(),
    checkinAdjustmentStatus: null, checkoutRequestedAt: null, actualCheckOutAt: null,
    orderDetails: [{ name: `Phòng ${room!.number} · demo kiosk`, productType: 6, phase: 'booking', quantity: 1, price: 490000 }],
    voucherDiscount: 0, payments: [], source: 'Kiosk', guests: [], roomCards: [],
    events: [{ at: start.toISOString(), text: `Demo ${FLOW_LABEL[flow]}: ${config.label}` }]
  };
  if (flow === 'checkout') {
    room!.status = 'occupied';
    f.guests = demoGuests(f.customer);
    f.roomCards = [issueKioskCard(d, f)];
    d.cameras.push({
      roomKey: `${f.branchId}:${f.room}`, bookingCode: code, state: 'WAITING_GUEST',
      lastOccupancy: 0, scheduledCheckOutAt: f.effectiveCheckOutTime,
      settledAt: null, notifiedAt: null, cleaningArmedAt: null
    });
  }
  d.folios.unshift(f);
  d.bookings.unshift({ id: code, branchId: k.branchId, room: f.room, customer: f.customer,
    phone: f.phone, type: f.stayType, time: '', amount: 490000,
    status: flow === 'checkout' ? 'checked-in' : 'confirmed',
    startsAt: f.effectiveCheckInTime, endsAt: f.effectiveCheckOutTime });
  const s: NonNullable<Kiosk['session']> = {
    flow, bookingCode: code, startedAt: start.toISOString(), updatedAt: start.toISOString(),
    handedOver: false, support: null, paymentMethod: scenario.endsWith('cash') ? 'cash' : 'card',
    steps: newSteps({ lookup: { state: 'running' } })
  };
  k.session = s;
  if (scenario === 'checkin-normal') return null;
  const done = (key: keyof typeof s.steps, note: string) => { s.steps[key] = { state: 'done', note }; };
  const fail = (key: keyof typeof s.steps, state: 'failed' | 'unknown', note: string) => {
    s.steps[key] = { state, note };
    s.support = { reason: note, requestedAt: start.toISOString(), status: 'waiting' };
  };
  if (flow === 'checkin') {
    done('lookup', `Tìm thấy booking ${code}`);
    done('schedule', 'Giờ nhận phòng hợp lệ');
    if (scenario === 'checkin-schedule') {
      s.steps.schedule = { state: 'running', note: 'Khách cần xác nhận điều chỉnh giờ nhận phòng' };
      return null;
    }
    if (scenario === 'scan') return fail('guests', 'failed', 'Máy quét không đọc được CCCD'), null;
    f.guests = demoGuests(f.customer);
    done('guests', 'Đã xác nhận hồ sơ CCCD');
    if (scenario === 'checkin-face') return fail('face', 'failed', 'Chụp hoặc gửi ảnh khuôn mặt thất bại'), null;
    done('face', 'Đã lưu ảnh khuôn mặt');
    done('policy', 'Khách đã đồng ý chính sách');
    if (scenario === 'offline') k.agentOnline = false;
    if (scenario === 'card') fail('card', 'unknown', 'Đã gửi lệnh kích hoạt thẻ, chưa nhận được kết quả');
    if (scenario === 'empty') { k.cardStock = 'empty'; fail('card', 'failed', 'Hộp chứa thẻ K750 bị rỗng'); }
    if (scenario === 'bin') { k.rejectBinFull = true; fail('card', 'failed', 'Hộp thu hồi thẻ đầy'); }
    if (scenario === 'jam') {
      const card = issueKioskCard(d, f);
      done('card', `UID ${card.uid} · TTLock đã nhận thẻ`);
      k.faults = ['K750: kẹt thẻ (0x0020)'];
      fail('release', 'failed', 'K750 kẹt thẻ khi nhả (0x0020)');
    }
  } else if (flow === 'booking') {
    done('lookup', `Chọn phòng ${f.room} · 2 giờ`);
    done('guests', 'Đã nhập thông tin đặt phòng');
    if (scenario === 'booking-normal') s.steps.payment = { state: 'running', note: 'Đang chờ kết quả thanh toán đặt phòng' };
    if (scenario === 'booking-cash') s.steps.payment = { state: 'running', note: 'Chờ lễ tân xác nhận thu tiền mặt' };
    if (scenario === 'booking-payment-failed') fail('payment', 'failed', 'SmartPOS báo thanh toán thất bại');
    if (scenario === 'booking-payment') fail('payment', 'unknown', 'Chưa nhận được kết quả thanh toán / IPN');
  } else {
    if (scenario === 'checkout-card') {
      s.bookingCode = null;
      return fail('lookup', 'failed', 'Kiosk không nhận dạng được thẻ · cần nhả thẻ ra khe và mời khách mang tới lễ tân đọc bằng E3'), null;
    }
    done('lookup', `Đã đọc thẻ phòng ${f.room}`);
    done('schedule', 'Đã hiển thị chi phí phòng và dịch vụ');
    if (scenario === 'checkout-normal') s.steps.payment = { state: 'running', note: 'Đang chờ kết quả thanh toán trả phòng' };
    if (scenario === 'checkout-cash') s.steps.payment = { state: 'running', note: 'Chờ lễ tân xác nhận thu tiền mặt' };
    if (scenario === 'checkout-payment-failed') fail('payment', 'failed', 'Thanh toán trả phòng thất bại');
    if (scenario === 'checkout-payment') fail('payment', 'unknown', 'Chưa nhận được kết quả thanh toán / IPN');
    if (scenario === 'checkout-print') {
      recordPayment(d, f, 490000, 'card', 'Thanh toán trả phòng (demo)', 'Kiosk');
      done('payment', 'Đã thanh toán đủ');
      f.actualCheckOutAt = start.toISOString();
      f.checkoutHandledAt = f.actualCheckOutAt;
      f.status = 2;
      f.detailStatus = 3;
      f.roomCards = [];
      const cam = d.cameras.find((c) => c.bookingCode === code);
      if (cam) { cam.state = 'DISARMED'; cam.settledAt = f.actualCheckOutAt; }
      room!.status = 'cleaning';
      room!.cleaningReadyAt = new Date(+start + d.rules.cleaningBuffer * 60000).toISOString();
      done('release', 'Kiosk đã hoàn tất trả phòng và thu hồi thẻ');
      fail('receipt', 'failed', 'Máy in không in được hóa đơn');
    }
  }
  return null;
}
