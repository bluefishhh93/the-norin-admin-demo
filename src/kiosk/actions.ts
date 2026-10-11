import type { BookingGuest, DemoData, Kiosk, KioskStepKey, PayMethod, SupportOutcome } from '../types';
import { useStore } from '../store';
import { isAllowedBranch } from '../lib/scope';
import { folioDue } from '../lib/folio';
import { recordPayment } from '../booking/actions';
import { OUTCOME_LABEL, currentStep, hasUnknown, issueKioskCard, logSession as log, openSupport, sessionFolio, staffName } from './session';
import { confirmGuests, confirmPayment, finishStep, receiveDemoResult, retryStep, stepError } from './workflow';
import { loadScenario, type Scenario } from './demo';

export function useKioskActions() {
  const { data, update, toast } = useStore();
  const me = staffName(data);
  const change = (id: string, fn: (d: DemoData, k: Kiosk) => void) =>
    update((d) => {
      const k = d.kiosks.find((x) => x.id === id);
      if (k && isAllowedBranch(d, k.branchId)) fn(d, k);
    });
  const find = (id: string) => data.kiosks.find((k) => k.id === id)!;

  const perform = (id: string, fn: (d: DemoData, k: Kiosk) => string | null) => {
    const k = find(id);
    if (!k || !isAllowedBranch(data, k.branchId)) return 'Kiosk không thuộc chi nhánh đang quản lý.';
    const draft = structuredClone(data);
    const error = fn(draft, draft.kiosks.find((row) => row.id === id)!);
    if (error) return error;
    change(id, (d, row) => { fn(d, row); });
    return null;
  };

  return {
    saveGuests: (id: string, guests: BookingGuest[]) => perform(id, (d, k) => confirmGuests(d, k, guests, me)),
    collect: (id: string, method: PayMethod, reference: string) => perform(id, (d, k) => confirmPayment(d, k, method, reference, me)),
    retry: (id: string, step: KioskStepKey) => perform(id, (d, k) => retryStep(d, k, step, me)),
    demoResult: (id: string, result: 'done' | 'failed' | 'unknown') => perform(id, (d, k) => receiveDemoResult(d, k, result)),
    scenario: (id: string, scenario: Scenario) => perform(id, (d, k) => loadScenario(d, k, scenario)),
    reconnect: (id: string) => change(id, (_d, k) => {
      k.agentOnline = true;
      k.lastSeenAt = new Date().toISOString();
    }),
    accept: (id: string) =>
      change(id, (d, k) => {
        const support = openSupport(k.session);
        if (!support || support.status !== 'waiting') return;
        Object.assign(support, { status: 'handling', assignee: me });
        log(d, k.session!, `${me} tiếp nhận hỗ trợ tại ${k.name}: ${support.reason}`);
      }),

    resolve: (id: string, outcome: SupportOutcome, note: string): string | null => {
      const s = find(id).session;
      if (!s || !openSupport(s)) return 'Không còn yêu cầu hỗ trợ đang mở.';
      if (hasUnknown(s)) return 'Đối chiếu thanh toán / thẻ đang “Chưa rõ” trước khi đóng.';
      if (outcome === 'no-show' && !note.trim()) return 'Ghi chú lý do khách không nhận phòng.';
      if (outcome === 'desk' && sessionFolio(data, s)?.detailStatus !== 2)
        return 'Booking chưa nhận phòng. Hoàn tất nhận phòng tại quầy trước.';
      if (outcome === 'kiosk' && s.handedOver)
        return 'Phiên đã chuyển sang quầy, không thể tiếp tục tại kiosk.';
      if (outcome === 'kiosk' && (!find(id).agentOnline || s.steps[currentStep(s).key].state !== 'running'))
        return 'Xử lý bước đang mắc hoặc gửi lệnh thử lại trước khi đóng hỗ trợ.';
      change(id, (d, k) => {
        const session = k.session!;
        log(
          d,
          session,
          `${me} đóng hỗ trợ ${k.name}: ${OUTCOME_LABEL[outcome]}${note.trim() ? ` · ${note.trim()}` : ''}`
        );
        if (outcome === 'kiosk') {
          Object.assign(session.support!, { status: 'done', outcome, note, assignee: me });
          for (const step of Object.values(session.steps))
            if (step.state === 'failed') step.state = 'todo';
          session.updatedAt = new Date().toISOString();
        } else k.session = null;
      });
      return null;
    },

    handover: (id: string) =>
      change(id, (d, k) => {
        const s = k.session;
        if (!s || s.handedOver) return;
        s.handedOver = true;
        s.updatedAt = new Date().toISOString();
        const support = openSupport(s);
        if (support) Object.assign(support, { status: 'handling', assignee: support.assignee ?? me });
        else
          s.support = {
            reason: 'Chuyển sang quầy',
            requestedAt: s.updatedAt,
            status: 'handling',
            assignee: me
          };
        log(d, s, `${me} chuyển phiên ${k.name} sang quầy · giữ hồ sơ, thanh toán và thẻ đã có`);
      }),

    reconcile: (id: string, step: 'payment' | 'card', ok: boolean, reference: string) =>
      perform(id, (d, k) => {
        const error = stepError(k, step);
        if (error) return error;
        const s = k.session!;
        if (s.steps[step].state !== 'unknown') return 'Bước này không cần đối chiếu.';
        if (!reference.trim()) return 'Nhập mã giao dịch / UID và kết quả đã đối chiếu.';
        const f = sessionFolio(d, s);
        if (!f) return 'Chưa tìm thấy booking.';
        if (step === 'card' && ok && !/^[A-Fa-f0-9]{8,16}$/.test(reference.trim()))
          return 'Nhập UID thẻ dạng hex (8–16 ký tự).';
        if (step === 'card' && ok && !d.locks.some((l) => l.branchId === f.branchId && l.room === f.room))
          return 'Phòng chưa có khóa TTLock.';
        if (ok) {
          if (step === 'payment' && folioDue(f) > 0)
            recordPayment(d, f, folioDue(f), 'card', `Đối chiếu SmartPOS · ${reference.trim()}`, me);
          if (step === 'card' && !f.roomCards?.some((c) => c.uid === reference.trim().toUpperCase())) {
            const card = issueKioskCard(d, f);
            card.uid = reference.trim().toUpperCase();
          }
          finishStep(d, k, step, `${me} đối chiếu thành công · ${reference.trim()}`);
        } else {
          s.steps[step] = { state: 'failed', note: `${me} đối chiếu thất bại · ${reference.trim()}` };
          s.updatedAt = new Date().toISOString();
          log(d, s, s.steps[step].note!);
        }
        return null;
      }),

    setPaused: (id: string, paused: boolean) =>
      change(id, (_d, k) => {
        k.paused = paused;
      }),

    supply: (id: string, cardsAdded: number, binCleared: boolean) => {
      change(id, (_d, k) => {
        if (cardsAdded > 0) k.cardStock = 'ok';
        if (binCleared) k.rejectBinFull = false;
        k.lastSupply = { at: new Date().toISOString(), cardsAdded, binCleared };
      });
      toast(`${find(id).name}: đã ghi nhận vật tư.`);
    },

    clearFault: (id: string, fault: string) =>
      change(id, (_d, k) => {
        k.faults = k.faults.filter((f) => f !== fault);
      })
  };
}
