import type { DemoData, Folio, PayMethod } from '../types';
import { useStore } from '../store';
import { checkRoomInterval } from '../lib/rooms';
import { cameraOf, checkoutAt, folioDue, folioPaid, isActive } from '../lib/folio';
import { fmtDateTime, money } from '../lib/format';
import { syncBooking, refundable } from './model';
import { addProducts, cancelProduct, isProduct, validateProducts } from './products';
import { refreshVoucher } from './voucher';
import { roomChangePrice } from './room-change';
import type { ProductSelection } from '../types';

const event = (f: Folio, text: string) => f.events.unshift({ at: new Date().toISOString(), text });
export function recordPayment(d: DemoData, f: Folio, amount: number, method: PayMethod, reason: string) {
  const id = crypto.randomUUID();
  const at = new Date().toISOString();
  f.payments.push({ id: `PM-${id}`, amount, method, createdAt: at, collector: 'Nguyễn Anh' });
  d.cashbook.unshift({ id: `CB-${id}`, type: amount < 0 ? 'out' : 'in', branchId: f.branchId, at, category: amount < 0 ? 'Hoàn booking' : 'Thu booking', amount: Math.abs(amount), method, note: `${f.code} · ${reason}`, by: 'Nguyễn Anh' });
  event(f, `${amount < 0 ? 'Hoàn' : 'Thu'} ${money(Math.abs(amount))} · ${reason} (demo)`);
  if (!folioDue(f)) d.requests.filter(r => r.code === f.code && r.status === 'pending').forEach(r => { r.status = 'collected'; });
}

export function useBookingActions() {
  const { data, update } = useStore();
  const change = (code: string, apply: (d: DemoData, f: Folio) => void) => update(d => {
    const f = d.folios.find(b => b.code === code);
    if (!f || (d.role !== 'superadmin' && f.branchId !== 'sontra')) return;
    apply(d, f); syncBooking(d, f);
  });
  const find = (code: string) => data.folios.find(f => f.code === code)!;
  return {
    confirm: (code: string) => change(code, (_d, f) => { if (f.status === 4) { f.status = 1; event(f, 'Xác nhận booking'); } }),
    saveNote: (code: string, note: string) => change(code, (_d, f) => { f.note = note; event(f, 'Cập nhật ghi chú'); }),
    saveGuests: (code: string, guests: Folio['guests']) => change(code, (_d, f) => { f.guests = guests; event(f, 'Cập nhật hồ sơ khách lưu trú'); }),
    checkin: (code: string, start: string, end: string): string | null => {
      const f = find(code);
      if (f.status !== 1 || f.detailStatus !== 1) return 'Chỉ nhận booking đã xác nhận và chưa nhận phòng.';
      if (f.paymentTiming === 'prepaid' && folioDue(f) > 0) return 'Booking trả trước cần thu đủ trước khi nhận phòng.';
      if (Date.now() > Date.parse(end)) return 'Lịch lưu trú đã hết hạn. Hãy sửa lịch hoặc xác nhận không đến.';
      const room = data.rooms.find(r => r.branchId === f.branchId && r.number === f.room);
      if (!room || room.status === 'cleaning') return 'Phòng chưa dọn xong.';
      if (data.folios.some(o => o.code !== code && o.branchId === f.branchId && o.room === f.room && o.detailStatus === 2 && isActive(o))) return 'Phòng vẫn còn khách, chưa thể nhận booking mới.';
      const result = checkRoomInterval(data, room, new Date(start), new Date(end), f.stayType, code, true, false);
      if (result !== true) return result;
      change(code, (d, b) => {
        b.effectiveCheckInTime = start; b.effectiveCheckOutTime = end; b.orderDetailCheckOutTime = end;
        b.roomRate = { room: b.room, start, end, amount: b.orderDetails.filter(i => i.productType === 6 && i.fulfillment !== 'cancelled').reduce((s, i) => s + i.price * i.quantity, 0) };
        b.detailStatus = 2; b.actualCheckInAt = new Date().toISOString();
        b.checkinDecision = start === b.originalCheckInTime && end === b.originalCheckOutTime ? 'ON_TIME' : 'DESK_ADJUSTED';
        const r = d.rooms.find(row => row.branchId === b.branchId && row.number === b.room)!; r.status = 'occupied';
        d.cameras.push({ roomKey: `${b.branchId}:${b.room}`, bookingCode: code, state: 'WAITING_GUEST', lastOccupancy: 0, scheduledCheckOutAt: end, settledAt: null, notifiedAt: null, cleaningArmedAt: null });
        event(b, `Nhận phòng tại quầy · hiệu lực ${fmtDateTime(start)} → ${fmtDateTime(end)} · quyền phòng mô phỏng`);
      }); return null;
    },
    reschedule: (code: string, roomNumber: string, start: string, end: string, reason: string, extend = false): string | null => {
      const f = find(code);
      if (!isActive(f) || ![1, 4].includes(f.status)) return 'Booking đã kết thúc, không thể đổi lịch/phòng.';
      if (!reason.trim()) return 'Nhập lý do thay đổi.';
      const room = data.rooms.find(r => r.branchId === f.branchId && r.number === roomNumber);
      if (f.detailStatus === 2 && roomNumber !== f.room && (room?.status === 'cleaning' || data.folios.some(o => o.code !== code && o.branchId === f.branchId && o.room === roomNumber && o.detailStatus === 2 && isActive(o)))) return 'Phòng mới chưa sẵn sàng nhận khách.';
      if (f.detailStatus === 2 && roomNumber === f.room && !extend) return 'Chọn một phòng khác để chuyển khách.';
      const result = checkRoomInterval(data, room, new Date(start), new Date(end), f.stayType, code, f.detailStatus === 2, f.detailStatus !== 2);
      if (result !== true) return result;
      const price = roomChangePrice(data, f, roomNumber, new Date(start), new Date(end));
      if (price == null) return 'Chưa có giá cho lịch/phòng này.';
      if (extend && Date.parse(end) <= Date.parse(checkoutAt(f))) return 'Giờ trả mới phải sau giờ trả hiện tại.';
      change(code, (d, b) => {
        const oldRoom = b.room, oldEnd = checkoutAt(b);
        if (b.detailStatus === 2 && oldRoom !== roomNumber) {
          const old = d.rooms.find(r => r.branchId === b.branchId && r.number === oldRoom)!;
          old.status = 'cleaning'; old.cleaningReadyAt = new Date(Date.now() + d.rules.cleaningBuffer * 60000).toISOString();
          room && (d.rooms.find(r => r.branchId === b.branchId && r.number === roomNumber)!.status = 'occupied');
        }
        b.room = roomNumber; b.masterProductId = room!.masterProductId;
        b.effectiveCheckInTime = start; b.effectiveCheckOutTime = end; b.orderDetailCheckOutTime = end;
        const charged = b.orderDetails.filter(i => i.productType === 6 && i.fulfillment !== 'cancelled').reduce((s, i) => s + i.price * i.quantity, 0);
        const delta = price - charged;
        if (delta) b.orderDetails.push({ name: `${extend ? 'Gia hạn' : oldRoom !== roomNumber ? 'Chênh lệch đổi phòng' : 'Chênh lệch sửa lịch'} · ${fmtDateTime(oldEnd)} → ${fmtDateTime(end)}`, productType: 6, phase: 'stay', quantity: 1, price: delta });
        const cam = cameraOf(d, b); if (cam) { cam.roomKey = `${b.branchId}:${roomNumber}`; cam.scheduledCheckOutAt = end; }
        event(b, `${extend ? 'Gia hạn' : oldRoom !== roomNumber ? 'Đổi phòng' : 'Sửa lịch'} · phòng ${oldRoom} → ${roomNumber} · trả ${fmtDateTime(oldEnd)} → ${fmtDateTime(end)} · ${reason}`);
      }); return null;
    },
    checkout: (code: string): string | null => {
      const f = find(code);
      if (!isActive(f) || f.detailStatus !== 2) return 'Booking chưa nhận phòng hoặc đã kết thúc.';
      if (folioDue(f) > 0 || refundable(f) > 0) return 'Quyết toán đủ khoản phải thu/hoàn trước khi trả phòng.';
      if (f.orderDetails.some(i => isProduct(i) && i.fulfillment !== 'cancelled' && i.fulfillment !== 'delivered')) return 'Còn sản phẩm chưa giao. Vào tab Sản phẩm để giao hoặc hủy món trước khi chốt.';
      change(code, (d, b) => {
        b.actualCheckOutAt = new Date().toISOString(); b.checkoutHandledAt = b.actualCheckOutAt; b.status = 2; b.detailStatus = 3;
        const r = d.rooms.find(row => row.branchId === b.branchId && row.number === b.room)!;
        r.status = 'cleaning'; r.cleaningReadyAt = new Date(Date.now() + d.rules.cleaningBuffer * 60000).toISOString();
        const cam = cameraOf(d, b); if (cam) { cam.state = 'DISARMED'; cam.settledAt = b.actualCheckOutAt; }
        event(b, `Hoàn tất trả phòng · chờ dọn ${d.rules.cleaningBuffer} phút · thu hồi quyền phòng (demo)`);
      }); return null;
    },
    cancel: (code: string, reason: string, refundAmount: number, noShow = false): string | null => {
      const f = find(code);
      if (!isActive(f) || f.detailStatus === 2) return 'Chỉ hủy booking chưa nhận phòng.';
      if (!reason.trim()) return 'Nhập lý do.';
      if (!Number.isSafeInteger(refundAmount) || refundAmount < 0 || refundAmount > folioPaid(f)) return 'Tiền được duyệt hoàn phải từ 0 đến số đã thu.';
      change(code, (d, b) => {
        b.cancellationRefund = refundAmount;
        b.orderDetails.forEach((_, index) => cancelProduct(d, b, index));
        b.status = 3; b.outcome = noShow ? 'no-show' : 'cancelled';
        const r = d.rooms.find(row => row.branchId === b.branchId && row.number === b.room);
        if (r?.status === 'reserved' && !d.folios.some(o => o.code !== code && o.branchId === b.branchId && o.room === b.room && isActive(o))) r.status = 'available';
        event(b, `${noShow ? 'Xác nhận khách không đến' : 'Hủy booking'} · ${reason}. Duyệt hoàn ${money(refundAmount)}, giữ lại ${money(folioPaid(b) - refundAmount)}. Hoàn tiền được ghi nhận riêng.`);
      }); return null;
    },
    refund: (code: string, method: PayMethod, reason: string): string | null => {
      const f = find(code);
      if (data.role !== 'superadmin') return 'Chỉ Superadmin có quyền hoàn tiền trong demo.';
      if (!reason.trim() || !refundable(f)) return 'Nhập lý do và kiểm tra số tiền được hoàn.';
      change(code, (d, b) => { recordPayment(d, b, -refundable(b), method, reason); if (b.status === 3) b.cancellationRefund = 0; }); return null;
    },
    addProducts: (code: string, selections: ProductSelection[]): string | null => {
      const f = find(code);
      if (!isActive(f)) return 'Booking đã kết thúc.';
      if (!selections.length) return 'Chọn ít nhất một sản phẩm.';
      const error = validateProducts(data, f.branchId, selections);
      if (error) return error;
      change(code, (d, b) => { addProducts(d, b, selections, 'stay'); event(b, 'Lễ tân thêm sản phẩm từ danh mục'); }); return null;
    },
    fulfill: (code: string, index: number) => change(code, (_d, b) => {
      const item = b.orderDetails[index];
      if (!isActive(b) || !isProduct(item) || item.fulfillment === 'cancelled' || item.fulfillment === 'delivered') return;
      item.fulfillment = item.fulfillment === 'preparing' ? 'delivered' : 'preparing';
      event(b, `${item.name}: ${item.fulfillment === 'delivered' ? 'đã giao' : 'đang chuẩn bị'}`);
    }),
    cancelProduct: (code: string, index: number, reason: string): string | null => {
      const f = find(code), item = f.orderDetails[index];
      if (!isActive(f) || !isProduct(item) || item.fulfillment === 'delivered' || item.fulfillment === 'cancelled') return 'Chỉ hủy sản phẩm chưa giao trong booking còn hoạt động.';
      if (!reason.trim()) return 'Nhập lý do hủy sản phẩm.';
      change(code, (d, b) => { cancelProduct(d, b, index); refreshVoucher(b); event(b, `Hủy ${item.name} · ${reason}`); }); return null;
    }
  };
}
