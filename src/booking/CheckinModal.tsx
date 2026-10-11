import { useRef, useState } from 'react';
import type { Folio, RoomCard } from '../types';
import { useStore } from '../store';
import { Modal } from '../components/Modal';
import { fmtTime, money } from '../lib/format';
import { folioDue } from '../lib/folio';
import { className } from '../lib/rooms';
import { useBookingActions } from './actions';
import { checkinSchedule } from './checkin';
import { paymentTiming } from './model';
import { floorOf } from './guest';
import { IssueCardModal } from './IssueCardModal';
import { STAY_ICON, fmtDay, stayLength } from './stay';

export function CheckinModal({ b, onClose }: { b: Folio; onClose: () => void }) {
  const { data, toast } = useStore();
  const act = useBookingActions();
  const [checkinAt] = useState(() => new Date());
  const [issuing, setIssuing] = useState(false);
  const schedule = checkinSchedule(data, b, checkinAt);
  const start = schedule.start.toISOString(),
    end = schedule.end.toISOString();
  const room = data.rooms.find((r) => r.branchId === b.branchId && r.number === b.room);
  const lock = data.locks.find((l) => l.branchId === b.branchId && l.room === b.room);
  const due = folioDue(b);
  const blocked = act.checkinError(b.code, start, end);
  const shifted = start !== b.effectiveCheckInTime || end !== b.effectiveCheckOutTime;

  const done = useRef(false);
  const finish = (card?: RoomCard) => {
    const failure = act.checkin(b.code, start, end, card);
    if (!failure) {
      done.current = true;
      toast(`Đã nhận phòng ${b.room}.`);
    }
    return failure;
  };

  if (issuing)
    return (
      <IssueCardModal
        bookingCode={b.code}
        room={b.room}
        lockId={lock?.lockId ?? null}
        lockAlias={lock?.alias}
        validFrom={start}
        validTo={end}
        confirmLabel="Kích hoạt & nhận phòng"
        onIssued={finish}
        onClose={() => (done.current ? onClose() : setIssuing(false))}
      />
    );

  return (
    <Modal
      open
      eyebrow="NHẬN PHÒNG"
      title={b.code}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-light" onClick={onClose}>
            Đóng
          </button>
          {!lock && !blocked && (
            <button
              className="btn btn-outline-secondary"
              onClick={() => {
                if (!finish()) onClose();
              }}
            >
              Nhận phòng không phát thẻ
            </button>
          )}
          <button
            className="btn-primary-custom"
            disabled={!!blocked || !lock}
            onClick={() => setIssuing(true)}
          >
            <i className="bi bi-credit-card-2-front" /> Phát thẻ phòng
          </button>
        </>
      }
    >
      <div className="ci-room">
        <div className="ci-room-no">
          <small>Phòng</small>
          <strong>{b.room}</strong>
        </div>
        <dl className="ci-room-facts">
          <div>
            <dt>Tầng</dt>
            <dd>{floorOf(b.room)}</dd>
          </div>
          <div>
            <dt>Hạng phòng</dt>
            <dd>{room ? className(data, room) : '—'}</dd>
          </div>
          <div>
            <dt>Tên phòng</dt>
            <dd>{room?.name || '—'}</dd>
          </div>
          <div>
            <dt>Khóa cửa</dt>
            <dd>
              {lock ? (
                <span className="ci-lock ok">
                  <i className="bi bi-shield-lock" /> {lock.alias}
                </span>
              ) : (
                <span className="ci-lock off">
                  <i className="bi bi-shield-exclamation" /> Chưa liên kết
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="ci-row">
        <div className="bd-guest">
          <span className="bd-avatar" aria-hidden="true">
            {b.customer.trim().charAt(0).toUpperCase() || '?'}
          </span>
          <div className="bd-guest-info">
            <strong>{b.customer}</strong>
            <span>{b.phone || '—'}</span>
          </div>
        </div>
        <div className="bd-stay">
          <div className="bd-stay-point">
            <small>Nhận phòng</small>
            <strong>{fmtTime(start)}</strong>
            <span>{fmtDay(start)}</span>
          </div>
          <div className="bd-stay-line">
            <span className="bd-stay-type">
              <i className={`bi ${STAY_ICON[b.stayType]}`} aria-hidden="true" /> {b.stayType}
            </span>
            <small>{stayLength(b.stayType, start, end)}</small>
          </div>
          <div className="bd-stay-point end">
            <small>Trả phòng</small>
            <strong>{fmtTime(end)}</strong>
            <span>{fmtDay(end)}</span>
          </div>
        </div>
      </div>

      <div className={`ci-note${shifted ? ' warn' : ''}`}>
        <i className={`bi ${shifted ? 'bi-arrow-left-right' : 'bi-check2-circle'}`} />
        <span>{schedule.message}</span>
      </div>
      {paymentTiming(b) === 'prepaid' && due > 0 && (
        <div className="ci-note danger">
          <i className="bi bi-cash-coin" />
          <span>Cần thu đủ {money(due)} trước khi nhận phòng.</span>
        </div>
      )}
      {blocked && !(paymentTiming(b) === 'prepaid' && due > 0) && (
        <div className="ci-note danger">
          <i className="bi bi-exclamation-octagon" />
          <span>{blocked}</span>
        </div>
      )}
    </Modal>
  );
}
