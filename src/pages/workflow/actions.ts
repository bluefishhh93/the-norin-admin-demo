import type { DemoData, Folio } from '../../types';
import { useStore } from '../../store';
import { fmtDateTime } from '../../lib/format';
import { recordEvent } from './shared';

export function useFlowActions() {
  const { data, update, toast } = useStore();
  const mutate = (code: string, fn: (d: DemoData, b: Folio) => void) =>
    update(d => { const b = d.folios.find(f => f.code === code); if (b) fn(d, b); });

  return {
    applyHour: (code: string) => mutate(code, (_d, b) => {
      b.checkinAdjustmentStatus = 'APPLIED';
      recordEvent(b, `Lễ tân duyệt giờ hiệu lực ${fmtDateTime(b.effectiveCheckInTime)} → ${fmtDateTime(b.effectiveCheckOutTime)}`);
    }),

    resolveAssistance: (code: string) => mutate(code, (_d, b) => { b.assistanceResolvedAt = new Date().toISOString(); recordEvent(b, 'Lễ tân đã tiếp nhận yêu cầu hỗ trợ check-in'); }),

    resolveOverstay: (code: string) => mutate(code, (_d, b) => { b.overstayHandledAt = new Date().toISOString(); recordEvent(b, 'Lễ tân đã lên phòng xử lý khách quá giờ'); }),

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
    }  };
}
