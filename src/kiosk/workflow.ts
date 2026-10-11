import type { BookingGuest, DemoData, Kiosk, KioskStepKey, PayMethod } from '../types';
import { applyCheckin, checkinError, recordPayment } from '../booking/actions';
import { hasGuestProfile, MAX_GUESTS } from '../booking/guest';
import { recordEvent } from '../booking/model';
import { folioDue } from '../lib/folio';
import { currentStep, issueKioskCard, logSession, openSupport, sessionFolio, stepsFor } from './session';

export function stepError(k: Kiosk, key: KioskStepKey): string | null {
  const s = k.session;
  if (!s) return 'Không có phiên đang xử lý.';
  if (s.handedOver) return 'Phiên đã chuyển sang quầy.';
  if (!s.staffHandling && !k.agentOnline && (key === 'card' || (key === 'release' && s.flow === 'checkin')))
    return 'Agent mất kết nối. Kết nối lại trước khi thao tác thẻ.';
  if (currentStep(s).key !== key || s.steps[key].state === 'done')
    return 'Chỉ xử lý bước hiện tại theo đúng thứ tự.';
  return null;
}

export function finishStep(d: DemoData, k: Kiosk, key: KioskStepKey, note: string) {
  const s = k.session!;
  s.steps[key] = { state: 'done', note };
  s.updatedAt = new Date().toISOString();
  const support = openSupport(s);
  if (support && support.status === 'waiting') support.status = 'handling';
  const steps = stepsFor(s);
  logSession(d, s, `${k.name}: ${steps.find((step) => step.key === key)!.label} · ${note}`);
  const next = steps[steps.findIndex((step) => step.key === key) + 1];
  if (next) {
    s.steps[next.key] = { state: 'running', note: next.key === 'payment'
      ? s.paymentMethod === 'cash' ? 'Khách chọn tiền mặt · chờ lễ tân thu' : 'Đang chờ kết quả thanh toán SmartPOS / IPN'
      : 'Kiosk đã chuyển sang bước này' };
    if (next.key === 'payment' && folioDue(sessionFolio(d, s)!) === 0)
      finishStep(d, k, 'payment', 'Booking đã thanh toán đủ');
  } else {
    const f = sessionFolio(d, s)!;
    if (s.flow === 'checkin') applyCheckin(d, f, f.effectiveCheckInTime, f.effectiveCheckOutTime, s.staffHandling ? 'quầy' : 'kiosk');
    if (s.flow === 'checkout') recordEvent(f, 'Kiosk đã hoàn tất phiên trả phòng');
    k.session = null;
  }
}

export function confirmGuests(d: DemoData, k: Kiosk, guests: BookingGuest[], by: string): string | null {
  const error = stepError(k, 'guests');
  if (error) return error;
  if (k.session!.flow !== 'checkin') return 'Chỉ nhập hồ sơ khách khi nhận phòng.';
  if (guests.length > MAX_GUESTS || !hasGuestProfile(guests))
    return `Nhập đầy đủ hồ sơ hợp lệ cho 1–${MAX_GUESTS} khách.`;
  if (new Set(guests.map((g) => g.idNumber.trim())).size !== guests.length)
    return 'Số giấy tờ của các khách không được trùng nhau.';
  const f = sessionFolio(d, k.session!);
  if (!f) return 'Chưa tìm thấy booking.';
  f.guests = structuredClone(guests);
  finishStep(d, k, 'guests', `${by} xác nhận ${guests.length} hồ sơ khách hợp lệ`);
  return null;
}

export function confirmPayment(d: DemoData, k: Kiosk, method: PayMethod, reference: string, by: string): string | null {
  const error = stepError(k, 'payment');
  if (error) return error;
  if (k.session!.steps.payment.state === 'unknown')
    return 'Đối chiếu giao dịch SmartPOS trước, tránh thu tiền hai lần.';
  if (k.session!.steps.payment.state === 'running' && k.session!.paymentMethod !== 'cash' && !k.session!.staffHandling)
    return 'Đang chờ thanh toán tự động. Không thu thêm tại quầy khi chưa biết kết quả.';
  const f = sessionFolio(d, k.session!);
  if (!f) return 'Chưa tìm thấy booking.';
  if (method !== 'cash' && !reference.trim()) return 'Nhập mã giao dịch đã kiểm tra.';
  const due = folioDue(f);
  if (due > 0) recordPayment(d, f, due, method, `Lễ tân hỗ trợ ${k.name}${reference.trim() ? ` · ${reference.trim()}` : ''}`, by);
  finishStep(d, k, 'payment', due > 0 ? `${by} xác nhận đã thu đủ${reference.trim() ? ` · ${reference.trim()}` : ''}` : 'Booking đã thanh toán đủ');
  return null;
}

export function retryStep(d: DemoData, k: Kiosk, key: KioskStepKey, by: string): string | null {
  const error = stepError(k, key);
  if (error) return error;
  const s = k.session!;
  if (s.steps[key].state !== 'failed' && s.steps[key].state !== 'todo')
    return 'Bước đang chạy hoặc chưa rõ kết quả. Chờ kết quả / đối chiếu trước khi gửi lại.';
  if ((key === 'card' || key === 'release') && k.faults.length)
    return 'Khắc phục lỗi thiết bị trước khi thử lại.';
  if (key === 'card' && (k.cardStock === 'empty' || k.rejectBinFull))
    return 'Bổ sung thẻ / dọn hộp thu hồi trước khi kích hoạt thẻ.';
  s.steps[key] = { state: 'running', note: `${by} yêu cầu kiosk thử lại · đang chờ kết quả` };
  s.updatedAt = new Date().toISOString();
  logSession(d, s, `${by} yêu cầu ${k.name} thử lại ${stepsFor(s).find((step) => step.key === key)!.label}`);
  return null;
}

export function completeCheckout(d: DemoData, k: Kiosk, note: string): string | null {
  const s = k.session;
  if (!s || s.flow !== 'checkout') return 'Không có phiên trả phòng đang xử lý.';
  const f = sessionFolio(d, s);
  if (!f || f.detailStatus !== 2 || folioDue(f) > 0 || !(f.roomCards?.length))
    return 'Booking chưa đủ điều kiện trả phòng hoặc chưa có thẻ cần thu hồi.';
  f.actualCheckOutAt = new Date().toISOString();
  f.checkoutHandledAt = f.actualCheckOutAt;
  f.status = 2;
  f.detailStatus = 3;
  f.roomCards = [];
  const cam = d.cameras.find((c) => c.bookingCode === f.code);
  if (cam) { cam.state = 'DISARMED'; cam.settledAt = f.actualCheckOutAt; }
  const room = d.rooms.find((r) => r.branchId === f.branchId && r.number === f.room);
  if (room) {
    room.status = 'cleaning';
    room.cleaningReadyAt = new Date(Date.now() + d.rules.cleaningBuffer * 60000).toISOString();
  }
  recordEvent(f, note);
  finishStep(d, k, 'release', note);
  return null;
}

export function receiveDemoResult(d: DemoData, k: Kiosk, result: 'done' | 'failed' | 'unknown'): string | null {
  const s = k.session;
  if (!s) return 'Không có phiên đang xử lý.';
  const key = currentStep(s).key;
  const error = stepError(k, key);
  if (error) return error;
  if (s.steps[key].state !== 'running') return 'Chỉ mô phỏng kết quả cho bước đang chạy.';
  if (s.flow === 'checkout' && key === 'lookup' && result === 'done' && !s.bookingCode)
    return 'Kiosk chưa nhận dạng được thẻ. Trả thẻ ra khe và chuyển khách tới lễ tân đọc bằng E3.';
  if (result === 'unknown' && key !== 'payment' && key !== 'card')
    return 'Chỉ thanh toán / kích hoạt thẻ có kết quả cần đối chiếu.';
  const f = sessionFolio(d, s);
  if (!f && !(s.flow === 'checkout' && key === 'lookup' && result === 'failed')) return 'Chưa tìm thấy booking.';
  if (key === 'payment' && s.paymentMethod === 'cash')
    return 'Khách chọn tiền mặt. Lễ tân xác nhận khoản thu tại quầy.';
  if (result !== 'done') {
    const note = result === 'unknown' ? key === 'payment'
      ? 'Chưa nhận được kết quả thanh toán / IPN · cần đối chiếu trước khi thu lại'
      : 'Đã gửi lệnh, chưa nhận được kết quả' : {
      lookup: s.flow === 'checkout' ? 'Không nhận dạng được thẻ · cần nhả thẻ ra khe và mời khách mang tới lễ tân đọc bằng E3' : 'Không tìm thấy booking hoặc phòng',
      schedule: s.flow === 'checkout' ? 'Không tải được chi phí trả phòng' : 'Không xác nhận được giờ nhận phòng',
      guests: s.flow === 'booking' ? 'Không lưu được thông tin đặt phòng' : 'Máy quét không đọc được CCCD',
      face: 'Chụp hoặc gửi ảnh khuôn mặt thất bại',
      policy: 'Không xác nhận được chính sách',
      payment: 'SmartPOS báo thanh toán thất bại',
      card: 'K750 / TTLock báo kích hoạt thẻ thất bại',
      release: s.flow === 'checkout' ? 'Không hoàn tất được trả phòng' : 'K750 kẹt thẻ khi nhả (0x0020)',
      receipt: 'Máy in không in được hóa đơn'
    }[key];
    s.steps[key] = { state: result, note };
    s.updatedAt = new Date().toISOString();
    s.support = { reason: note, requestedAt: s.updatedAt, status: 'waiting' };
    if (key === 'release' && result === 'failed') k.faults = ['K750: kẹt thẻ (0x0020)'];
    logSession(d, s, `${k.name}: ${note}`);
    return null;
  }
  if (!f) return 'Chưa tìm thấy booking.';
  if (key === 'lookup' && s.flow === 'checkin') {
    const blocked = checkinError(d, f.code, f.effectiveCheckInTime, f.effectiveCheckOutTime, true);
    if (blocked) return blocked;
  }
  if (key === 'guests' && s.flow === 'checkin') return confirmGuests(d, k, demoGuests(f.customer), 'Máy quét (demo)');
  if (key === 'payment' && folioDue(f) > 0)
    recordPayment(d, f, folioDue(f), 'card', `Thanh toán ${s.flow === 'booking' ? 'đặt phòng' : 'trả phòng'} · ${k.name} (demo)`, 'Kiosk');
  if (key === 'card') {
    if (k.cardStock === 'empty' || k.rejectBinFull || k.faults.length)
      return 'Thiết bị thẻ chưa sẵn sàng.';
    if (!hasGuestProfile(f.guests)) return 'Cần hồ sơ khách hợp lệ.';
    if (!d.locks.some((l) => l.branchId === f.branchId && l.room === f.room))
      return 'Phòng chưa có khóa TTLock. Cấu hình khóa hoặc chuyển sang quầy.';
    const card = issueKioskCard(d, f);
    finishStep(d, k, key, `UID ${card.uid} · TTLock đã nhận thẻ · giữ thẻ tại đầu đọc`);
    return null;
  }
  if (key === 'release' && s.flow === 'checkin') {
    if (k.faults.length) return 'Khắc phục lỗi thiết bị trước khi nhả thẻ.';
    const blocked = checkinError(d, f.code, f.effectiveCheckInTime, f.effectiveCheckOutTime, true);
    if (blocked) return blocked;
    if (!hasGuestProfile(f.guests) || !f.roomCards?.length)
      return 'Chưa đủ hồ sơ hoặc thẻ phòng để hoàn tất.';
  }
  if (key === 'release' && s.flow === 'checkout')
    return completeCheckout(d, k, 'Hoàn tất trả phòng tại kiosk · đã thu hồi thẻ');
  finishStep(d, k, key, key === 'payment'
    ? 'Đã nhận kết quả thanh toán thành công · kiosk tự chuyển sang kích hoạt thẻ (demo)'
    : 'Kiosk báo thành công (demo)');
  return null;
}

export const demoGuests = (name: string): BookingGuest[] => [{
  fullName: name,
  dateOfBirth: '1992-04-18',
  gender: 'Male',
  idType: 'id_card',
  idNumber: '048092001234',
  nationality: 'Việt Nam',
  address: 'Đà Nẵng',
  issueDate: '2021-06-01',
  expiryDate: '2037-04-18'
}];
