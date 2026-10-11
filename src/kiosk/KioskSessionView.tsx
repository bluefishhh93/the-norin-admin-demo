import type { Kiosk } from '../types';
import { useStore } from '../store';
import { useBooking } from '../booking/context';
import { fmtDateTime, money } from '../lib/format';
import { checkoutAt, folioDue, folioPaid } from '../lib/folio';
import { useNow } from '../lib/useNow';
import { Pill } from '../components/ui';
import { useKioskActions } from './actions';
import { KioskStepControls } from './KioskStepControls';
import {
  FLOW_LABEL,
  STEP_STATE,
  SUPPORT_STATUS,
  fmtAgo,
  fmtElapsed,
  hasUnknown,
  minutesSince,
  openSupport,
  sessionFolio,
  stepsFor
} from './session';

const STEP_PILL = {
  todo: 'reserved',
  running: 'occupied',
  done: 'available',
  failed: 'cleaning',
  unknown: 'pending'
} as const;

function SessionFacts({
  startedAt,
  updatedAt,
  checkIn,
  checkOut
}: {
  startedAt: string;
  updatedAt: string;
  checkIn?: string;
  checkOut?: string;
}) {
  const now = useNow(1000);
  return (
    <dl className="kiosk-session-facts">
      <div>
        <dt>Nhận phòng</dt>
        <dd>{fmtDateTime(checkIn)}</dd>
      </div>
      <div>
        <dt>Trả phòng</dt>
        <dd>{fmtDateTime(checkOut)}</dd>
      </div>
      <div>
        <dt>Vào kiosk</dt>
        <dd>{fmtDateTime(startedAt)}</dd>
      </div>
      <div>
        <dt>Đã sử dụng</dt>
        <dd>
          {fmtElapsed(startedAt, now)}
          <small>Cập nhật {fmtAgo(updatedAt, now)}</small>
        </dd>
      </div>
    </dl>
  );
}

export function KioskSessionView({ k, onOpenBooking }: { k: Kiosk; onOpenBooking: () => void }) {
  const { data, toast } = useStore();
  const { openDetail } = useBooking();
  const act = useKioskActions();
  const s = k.session;
  if (!s) return <p className="text-muted">Máy đang rảnh, không có phiên nhận phòng.</p>;
  const f = sessionFolio(data, s);
  const support = openSupport(s);
  const active = stepsFor(s).find((step) => s.steps[step.key].state !== 'done');
  const openBooking = () => {
    if (!f) return;
    onOpenBooking();
    openDetail(f.code);
  };
  return (
    <div className="kiosk-session">
      <div className="kiosk-session-head">
        <div>
          <span className="kiosk-flow-label">{FLOW_LABEL[s.flow]}{active ? ` · ${active.label}` : ''}</span>
          <strong>{f ? `${f.code} · Phòng ${f.room}` : s.flow === 'checkout' ? 'Chờ đọc thẻ để tìm booking' : s.flow === 'booking' ? 'Khách đang chọn phòng' : 'Chưa tìm thấy booking'}</strong>
          {f && <small>{f.customer}</small>}
        </div>
        {f && (
          <small>
            Đã thu <strong>{money(folioPaid(f))}</strong> · còn {money(folioDue(f))}
          </small>
        )}
      </div>
      <SessionFacts startedAt={s.startedAt} updatedAt={s.updatedAt} checkIn={f?.effectiveCheckInTime} checkOut={f && checkoutAt(f)} />
      {support && (
        <div className="ci-note warn"><i className="bi bi-exclamation-triangle" /><span>{FLOW_LABEL[s.flow]} · {support.reason}{support.status === 'handling' ? ' · Lễ tân đang xử lý tại đây' : ''}</span></div>
      )}
      {!k.agentOnline && !s.staffHandling && (
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
          <span>Phiên đã chuyển sang quầy trước đó. Tiến độ và hồ sơ đã lưu được giữ nguyên.</span>
        </div>
      )}
      <ol className="kiosk-steps">
        {stepsFor(s).map(({ key, label }, i) => {
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
      {!s.handedOver && (!support || support.status === 'handling') && (
        <KioskStepControls key={`${s.startedAt}:${stepsFor(s).filter(({ key }) => s.steps[key].state === 'done').length}`} k={k} />
      )}

      {s.flow === 'checkout' && s.steps.lookup.state === 'failed' && !s.checkoutCardEjected && (
        <div className="kiosk-support">
          <strong>Thẻ chưa được trả về khe</strong>
          <button className="btn-primary-custom" disabled={!k.agentOnline} onClick={() => {
            const error = act.ejectCheckoutCard(k.id);
            toast(error ?? 'Đã gửi lệnh nhả thẻ về khe. Mời khách mang thẻ tới lễ tân.');
          }}>Nhả thẻ ra khe · mời khách tới lễ tân</button>
        </div>
      )}
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
            <p className="text-muted small mb-0">Lễ tân đang tiếp tục xử lý các bước ngay trong phiên này. Yêu cầu hỗ trợ tự đóng khi phiên hoàn tất.</p>
          )}
          {hasUnknown(s) && !s.staffHandling && (
            <small className="text-danger">
              Còn bước “Chưa rõ”: đối chiếu giao dịch hoặc kết quả thẻ trước khi tiếp tục.
            </small>
          )}
        </div>
      )}

      <div className="booking-detail-actions">
        {f && (
          <button className="btn btn-light" onClick={openBooking}>
            <i className="bi bi-box-arrow-up-right" /> Mở booking
          </button>
        )}
      </div>
    </div>
  );
}
