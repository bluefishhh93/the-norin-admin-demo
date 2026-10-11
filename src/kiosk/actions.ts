import type { BookingGuest, DemoData, Kiosk, KioskStepKey, PayMethod, RoomCard, SupportOutcome } from '../types';
import { useStore } from '../store';
import { isAllowedBranch } from '../lib/scope';
import { folioDue } from '../lib/folio';
import { recordPayment } from '../booking/actions';
import { cardConflict, findCardHolder, parseCardUid } from '../booking/card';
import { hasGuestProfile } from '../booking/guest';
import { OUTCOME_LABEL, currentStep, hasUnknown, issueKioskCard, logSession as log, openSupport, sessionFolio, staffName } from './session';
import { checkinError } from '../booking/actions';
import { completeCheckout, confirmGuests, confirmPayment, finishStep, receiveDemoResult, retryStep, stepError } from './workflow';
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
    issueAtDesk: (id: string, card: RoomCard) => perform(id, (d, k) => {
      const s = k.session;
      if (!s?.staffHandling || s.flow !== 'checkin') return 'Lễ tân cần tiếp nhận phiên nhận phòng trước.';
      const error = stepError(k, 'card');
      if (error) return error;
      const f = sessionFolio(d, s);
      if (!f) return 'Chưa tìm thấy booking.';
      if (!hasGuestProfile(f.guests)) return 'Cần nhập đủ hồ sơ khách trước khi phát thẻ.';
      if (card.lockId == null || !d.locks.some((lock) => lock.branchId === f.branchId && lock.room === f.room && lock.lockId === card.lockId))
        return 'Thẻ không khớp khóa TTLock của phòng.';
      const blocked = checkinError(d, f.code, f.effectiveCheckInTime, f.effectiveCheckOutTime, true);
      if (blocked) return blocked;
      const existing = f.roomCards?.find((row) => row.uid === card.uid);
      if ((f.roomCards?.length ?? 0) > 0 && !existing)
        return 'Thẻ kiosk đã kích hoạt có UID khác. Đối chiếu thẻ cũ trước khi phát thẻ mới.';
      if (!existing) {
        const conflict = cardConflict(d, f.code, card.uid);
        if (conflict) return conflict;
        f.roomCards = [...(f.roomCards ?? []), card];
      }
      finishStep(d, k, 'card', `${me} ${existing ? 'xác nhận thẻ đã kích hoạt' : 'phát thẻ bằng E3'} · UID ${card.uid}`);
      return null;
    }),
    ejectCheckoutCard: (id: string) => perform(id, (d, k) => {
      const s = k.session;
      if (!s || s.flow !== 'checkout' || s.steps.lookup.state !== 'failed')
        return 'Chỉ nhả thẻ khi kiosk báo không nhận dạng được thẻ trả phòng.';
      if (s.checkoutCardEjected) return 'Thẻ đã được nhả ra khe.';
      if (!k.agentOnline) return 'Agent mất kết nối. Không thể gửi lệnh nhả thẻ.';
      s.checkoutCardEjected = true;
      s.updatedAt = new Date().toISOString();
      s.steps.lookup = { state: s.staffHandling ? 'running' : 'failed', note: 'agent.card.release · đã nhả thẻ ra khe; mời khách mang tới lễ tân đọc bằng E3' };
      log(d, s, `${me} gửi lệnh agent.card.release · nhả thẻ về khe ngoài`);
      return null;
    }),
    lookupAtDesk: (id: string, uid: string) => perform(id, (d, k) => {
      const s = k.session;
      if (!s?.staffHandling || s.flow !== 'checkout') return 'Lễ tân cần tiếp nhận phiên trả phòng trước.';
      if (!s.checkoutCardEjected) return 'Cần nhả thẻ về khe và mời khách mang tới lễ tân trước khi đọc E3.';
      const error = stepError(k, 'lookup');
      if (error) return error;
      const parsed = parseCardUid(uid);
      if (!parsed) return 'Không nhận dạng được UID. Đặt lại thẻ lên E3.';
      const f = findCardHolder(d, parsed.hex);
      if (!f) return 'Thẻ chưa thuộc booking đang ở hoặc đã bị thu hồi.';
      if (f.branchId !== k.branchId) return 'Thẻ thuộc chi nhánh khác.';
      const current = sessionFolio(d, s);
      if (current && current.code !== f.code) return `Thẻ thuộc booking ${f.code}, khác phiên ${current.code}.`;
      if (f.detailStatus !== 2 || f.actualCheckOutAt) return 'Booking trên thẻ không còn ở trạng thái đang ở.';
      s.bookingCode = f.code;
      finishStep(d, k, 'lookup', `${me} đối chiếu thẻ bằng E3 · UID ${parsed.hex}`);
      return null;
    }),
    collect: (id: string, method: PayMethod, reference: string) => perform(id, (d, k) => confirmPayment(d, k, method, reference, me)),
    retry: (id: string, step: KioskStepKey) => perform(id, (d, k) => retryStep(d, k, step, me)),
    complete: (id: string, step: KioskStepKey) => perform(id, (d, k) => {
      const error = stepError(k, step);
      if (error) return error;
      if (!['lookup', 'schedule', 'face', 'policy', 'release', 'receipt'].includes(step) ||
          (step === 'release' && k.session!.flow !== 'checkout'))
        return 'Bước thiết bị hoặc thanh toán cần kết quả đã xác minh.';
      const s = k.session!;
      const f = sessionFolio(d, s);
      if (!f) return 'Chưa tìm thấy booking.';
      if (s.steps[step].state !== 'running' && !(s.staffHandling && s.steps[step].state === 'failed' && step === 'schedule'))
        return 'Gửi yêu cầu thử lại trước khi xác nhận bước này.';
      if (step === 'release' && (folioDue(f) > 0 || f.detailStatus !== 2))
        return 'Cần booking đang ở và đã quyết toán đủ trước khi trả phòng.';
      if (step === 'release' && s.flow === 'checkout') return completeCheckout(d, k, `${me} xác nhận đã nhận thẻ bằng E3 và hoàn tất trả phòng`);
      if (step === 'lookup' && s.flow === 'checkin') {
        const blocked = checkinError(d, f.code, f.effectiveCheckInTime, f.effectiveCheckOutTime, true);
        if (blocked) return blocked;
      }
      finishStep(d, k, step, `${me} đã kiểm tra và xác nhận tại kiosk`);
      return null;
    }),
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
        k.session!.handedOver = false;
        const s = k.session!;
        s.staffHandling = true;
        s.updatedAt = new Date().toISOString();
        if (s.flow === 'checkin') {
          if (s.steps.face.state !== 'done') s.steps.face = { state: 'done', note: 'Lễ tân tiếp nhận trực tiếp' };
          if (s.steps.policy.state !== 'done') s.steps.policy = { state: 'done', note: 'Lễ tân xác nhận trực tiếp' };
          if (s.steps.card.state !== 'done' || s.steps.release.state !== 'done') {
            const existing = sessionFolio(d, s)?.roomCards?.length;
            s.steps.card = { state: 'todo', note: existing ? 'Đọc lại thẻ đã kích hoạt bằng E3 để giao khách' : 'Chờ lễ tân phát thẻ bằng E3' };
          }
        }
        if (s.flow === 'checkout' && s.steps.lookup.state !== 'done' && s.checkoutCardEjected) {
          s.paymentMethod = 'cash';
          s.steps.lookup = { state: 'running', note: 'Kiosk đã trả thẻ ra khe · khách mang thẻ tới quầy để đọc bằng E3' };
        }
        log(d, s, `${me} tiếp nhận hỗ trợ tại ${k.name}: ${support.reason}`);
      }),

    resolve: (id: string, outcome: SupportOutcome, note: string): string | null => {
      const s = find(id).session;
      if (!s || !openSupport(s)) return 'Không còn yêu cầu hỗ trợ đang mở.';
      if (hasUnknown(s)) return 'Đối chiếu thanh toán / thẻ đang “Chưa rõ” trước khi đóng.';
      if (outcome === 'no-show' && !note.trim()) return 'Ghi chú lý do khách không nhận phòng.';
      if (outcome === 'desk' && s.flow === 'checkin' && sessionFolio(data, s)?.detailStatus !== 2)
        return 'Booking chưa nhận phòng. Hoàn tất nhận phòng tại quầy trước.';
      if (outcome === 'kiosk' && s.handedOver)
        return 'Phiên đã chuyển sang quầy, không thể tiếp tục tại kiosk.';
      if (outcome === 'kiosk' && s.steps[currentStep(s).key].state !== 'running')
        return 'Xử lý bước đang mắc trước khi đóng hỗ trợ.';
      change(id, (d, k) => {
        const session = k.session!;
        log(
          d,
          session,
          `${me} đóng hỗ trợ ${k.name}: ${OUTCOME_LABEL[outcome]}${note.trim() ? ` · ${note.trim()}` : ''}`
        );
        if (outcome === 'kiosk') {
          Object.assign(session.support!, { status: 'done', outcome, note, assignee: me });
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
