import { useState } from 'react';
import type { Kiosk, SupportOutcome } from '../types';
import { useStore } from '../store';
import { useBooking } from '../booking/context';
import { fmtDateTime, money } from '../lib/format';
import { folioDue, folioPaid } from '../lib/folio';
import { Pill } from '../components/ui';
import { useKioskActions } from './actions';
import { KioskStepControls } from './KioskStepControls';
import {
  OUTCOME_LABEL,
  STEPS,
  STEP_STATE,
  SUPPORT_STATUS,
  hasUnknown,
  minutesSince,
  openSupport,
  sessionFolio
} from './session';

const STEP_PILL = {
  todo: 'reserved',
  running: 'occupied',
  done: 'available',
  failed: 'cleaning',
  unknown: 'pending'
} as const;

export function KioskSessionView({ k, onOpenBooking }: { k: Kiosk; onOpenBooking: () => void }) {
  const { data, toast } = useStore();
  const { openDetail } = useBooking();
  const act = useKioskActions();
  const [outcome, setOutcome] = useState<SupportOutcome>('kiosk');
  const [note, setNote] = useState('');
  const s = k.session;
  if (!s) return <p className="text-muted">Máy đang rảnh, không có phiên nhận phòng.</p>;
  const f = sessionFolio(data, s);
  const support = openSupport(s);
  const openBooking = () => {
    if (!f) return;
    onOpenBooking();
    openDetail(f.code);
  };
  const resolve = () => {
    const selected = s.handedOver && outcome === 'kiosk' ? 'desk' : outcome;
    const error = act.resolve(k.id, selected, note);
    toast(error ?? `Đã đóng hỗ trợ: ${OUTCOME_LABEL[selected]}.`);
  };

  return (
    <div className="kiosk-session">
      <div className="kiosk-session-head">
        <div>
          <strong>{f ? `${f.code} · Phòng ${f.room}` : 'Chưa tìm thấy booking'}</strong>
          <small>
            {f ? `${f.customer} · ` : ''}Bắt đầu {fmtDateTime(s.startedAt)} · cập nhật{' '}
            {minutesSince(s.updatedAt)} phút trước
          </small>
        </div>
        {f && (
          <small>
            Đã thu <strong>{money(folioPaid(f))}</strong> · còn {money(folioDue(f))}
          </small>
        )}
      </div>
      {!k.agentOnline && (
        <div className="ci-note warn">
          <i className="bi bi-wifi-off" />
          <span>
            Mất kết nối agent lúc {fmtDateTime(k.lastSeenAt)}. Kết quả bên dưới là lần cập nhật cuối,
            chưa coi là thất bại.
          </span>
        </div>
      )}
      {s.handedOver && (
        <div className="ci-note">
          <i className="bi bi-arrow-left-right" />
          <span>Đã chuyển sang quầy · kiosk không nhận thao tác mới cho phiên này.</span>
        </div>
      )}
      <ol className="kiosk-steps">
        {STEPS.map(({ key, label }, i) => {
          const step = s.steps[key];
          return (
            <li key={key} className={step.state}>
              <span className="kiosk-step-no">{i + 1}</span>
              <div>
                <strong>{label}</strong>
                {step.note && <small>{step.note}</small>}
              </div>
              <Pill status={STEP_PILL[step.state]} label={STEP_STATE[step.state]} />
            </li>
          );
        })}
      </ol>
      <KioskStepControls key={`${s.bookingCode}:${s.startedAt}:${Object.values(s.steps).filter((step) => step.state === 'done').length}`} k={k} />

      {support && (
        <div className="kiosk-support">
          <div>
            <strong>{support.reason}</strong>
            <small>
              {SUPPORT_STATUS[support.status]} · chờ {minutesSince(support.requestedAt)} phút ·{' '}
              {support.assignee ? `${support.assignee} phụ trách` : 'Chưa ai nhận'}
            </small>
          </div>
          {support.status === 'waiting' ? (
            <button className="btn-primary-custom" onClick={() => act.accept(k.id)}>
              Tiếp nhận
            </button>
          ) : (
            <div className="kiosk-resolve">
              <select
                className="form-select"
                value={s.handedOver && outcome === 'kiosk' ? 'desk' : outcome}
                onChange={(e) => setOutcome(e.target.value as SupportOutcome)}
              >
                {(Object.keys(OUTCOME_LABEL) as SupportOutcome[])
                  .filter((o) => !(o === 'kiosk' && s.handedOver))
                  .map((o) => (
                    <option key={o} value={o}>
                      {OUTCOME_LABEL[o]}
                    </option>
                  ))}
              </select>
              <input
                className="form-control"
                placeholder={outcome === 'no-show' ? 'Lý do (bắt buộc)' : 'Ghi chú'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button className="btn-primary-custom" disabled={hasUnknown(s)} onClick={resolve}>
                Đã xong
              </button>
            </div>
          )}
          {hasUnknown(s) && (
            <small className="text-danger">
              Còn bước “Chưa rõ”: đối chiếu giao dịch / thẻ trước khi đóng.
            </small>
          )}
          {outcome === 'no-show' && f && folioPaid(f) > 0 && (
            <small>Booking đã thu {money(folioPaid(f))}: hủy và tạo hoàn tiền trong booking.</small>
          )}
        </div>
      )}

      <div className="booking-detail-actions">
        {f && (
          <button className="btn btn-light" onClick={openBooking}>
            <i className="bi bi-box-arrow-up-right" /> Mở booking
          </button>
        )}
        {!s.handedOver && (
          <button className="btn btn-outline-secondary" onClick={() => act.handover(k.id)}>
            <i className="bi bi-arrow-left-right" /> Chuyển sang quầy
          </button>
        )}
      </div>
    </div>
  );
}
