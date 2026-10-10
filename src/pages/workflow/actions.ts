import type { DemoData, Folio } from '../../types';
import { useStore } from '../../store';
import { fmtDateTime, fmtTime, money } from '../../lib/format';
import { cameraOf, extraHourFee, folioDue, isActive, isOverstay, overstayType } from '../../lib/folio';
import { notifyEvent, recordEvent } from './shared';

export function useFlowActions() {
  const { data, update, toast } = useStore();
  const find = (code: string) => data.folios.find(f => f.code === code);
  const mutate = (code: string, fn: (d: DemoData, b: Folio) => void) =>
    update(d => { const b = d.folios.find(f => f.code === code); if (b) fn(d, b); });

  return {
    applyHour: (code: string) => mutate(code, (_d, b) => {
      b.checkinAdjustmentStatus = 'APPLIED';
      b.originalCheckInTime = b.effectiveCheckInTime;
      b.originalCheckOutTime = b.effectiveCheckOutTime;
      recordEvent(b, `Lễ tân duyệt giờ hiệu lực ${fmtDateTime(b.effectiveCheckInTime)} → ${fmtDateTime(b.effectiveCheckOutTime)}`);
    }),

    resolveAssistance: (code: string) => mutate(code, (_d, b) => { b.assistanceResolvedAt = new Date().toISOString(); recordEvent(b, 'Lễ tân đã tiếp nhận yêu cầu hỗ trợ check-in'); }),

    resolveOverstay: (code: string) => mutate(code, (_d, b) => { b.overstayHandledAt = new Date().toISOString(); recordEvent(b, 'Lễ tân đã lên phòng xử lý khách quá giờ'); }),

    extendHour: (code: string) => {
      const b = find(code);
      if (!b) return;
      if (!isOverstay(data, b) || overstayType(data, b) !== 'EXTENDABLE') { toast('Khung giờ sau không đủ 1 tiếng ở thêm và 30 phút dọn.'); return; }
      const fee = extraHourFee(data, b);
      if (!Number.isFinite(fee)) { toast('Chưa có bảng giá theo giờ cho hạng phòng này.'); return; }
      mutate(code, (d, f) => {
        const old = f.effectiveCheckOutTime;
        f.effectiveCheckOutTime = new Date(Date.parse(old) + 3600000).toISOString();
        f.orderDetails.push({ name: 'Phụ thu quá giờ · 1 tiếng', productType: 6, phase: 'stay', quantity: 1, price: fee, fulfillment: 'delivered' });
        const cam = cameraOf(d, f);
        if (cam) { cam.scheduledCheckOutAt = f.effectiveCheckOutTime; cam.cleaningArmedAt = new Date().toISOString(); }
        notifyEvent(d, f, `Cộng 1 tiếng: ${fmtTime(old)} → ${fmtTime(f.effectiveCheckOutTime)} · phụ thu ${money(fee)}`);
      });
    },

    checkinDesk: (code: string) => {
      const b = find(code);
      if (!b || b.detailStatus !== 1 || !isActive(b)) return;
      const room = data.rooms.find(r => r.branchId === b.branchId && r.number === b.room);
      if (room?.status === 'cleaning') { toast('Phòng chưa dọn xong.'); return; }
      mutate(code, (d, f) => {
        const r = d.rooms.find(x => x.branchId === f.branchId && x.number === f.room);
        if (r) r.status = 'occupied';
        f.detailStatus = 2;
        const source = d.bookings.find(x => x.id === f.code);
        if (source) source.status = 'checked-in';
        if (!cameraOf(d, f)) d.cameras.push({ roomKey: `${f.branchId}:${f.room}`, bookingCode: f.code, state: 'WAITING_GUEST', lastOccupancy: 0, scheduledCheckOutAt: f.effectiveCheckOutTime, settledAt: null, notifiedAt: null, cleaningArmedAt: null });
        notifyEvent(d, f, 'Lễ tân nhận phòng tại quầy, cấp mã TTLock theo giờ hiệu lực (mô phỏng)');
      });
    },

    completeCheckout: (code: string) => {
      const b = find(code);
      if (!b || folioDue(b) > 0 || b.actualCheckOutAt || b.detailStatus !== 2) { toast('Chỉ chốt sổ khi booking đã nhận phòng và trả đủ tiền.'); return; }
      mutate(code, (d, f) => {
        const now = new Date().toISOString();
        f.actualCheckOutAt = now; f.detailStatus = 3; f.status = 2; f.checkoutHandledAt = now;
        const cam = cameraOf(d, f);
        if (cam) { cam.settledAt = now; cam.state = 'DISARMED'; cam.lastOccupancy = 0; cam.notifiedAt ||= now; }
        const r = d.rooms.find(x => x.branchId === f.branchId && x.number === f.room);
        if (r) { r.status = 'cleaning'; r.cleaningReadyAt = new Date(Date.now() + 30 * 60000).toISOString(); }
        const source = d.bookings.find(x => x.id === f.code);
        if (source) source.status = 'checked-out';
        notifyEvent(d, f, 'Hoàn tất trả phòng, thu hồi thẻ/mã TTLock và gọi dọn phòng 30 phút (mô phỏng)');
      });
    },

    finishClean: (key: string) => {
      const room = data.rooms.find(r => `${r.branchId}:${r.number}` === key && (data.role === 'superadmin' || r.branchId === 'sontra'));
      if (!room || room.status !== 'cleaning') return;
      if (room.cleaningReadyAt && Date.now() < Date.parse(room.cleaningReadyAt)) { toast(`Chưa đủ 30 phút dọn; sớm nhất ${fmtDateTime(room.cleaningReadyAt)}.`); return; }
      update(d => {
        const r = d.rooms.find(x => `${x.branchId}:${x.number}` === key);
        if (r) { r.status = 'available'; r.cleaningReadyAt = null; }
        d.housekeeping = d.housekeeping.filter(t => t.key !== key);
      });
      toast(`Phòng ${room.number} đã sẵn sàng bán.`);
    },

    fulfill: (code: string, index: number) => mutate(code, (_d, b) => {
      const item = b.orderDetails[index];
      if (!item || item.phase !== 'stay') return;
      item.fulfillment = item.fulfillment === 'preparing' ? 'delivered' : 'preparing';
      recordEvent(b, `${item.name}: ${item.fulfillment === 'delivered' ? 'đã giao' : 'đang chuẩn bị'}`);
    })
  };
}
