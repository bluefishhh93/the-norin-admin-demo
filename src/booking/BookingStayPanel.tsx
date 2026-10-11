import type { Folio } from '../types';
import { fmtDateTime } from '../lib/format';
import { formatUid } from './card';
import { ID_TYPE_LABEL, floorOf, hasGuestProfile } from './guest';

export function BookingStayPanel({
  b,
  roomClass,
  lockAlias,
  editable,
  onIssue,
  onRevoke,
  onGuests
}: {
  b: Folio;
  roomClass: string;
  lockAlias?: string;
  editable: boolean;
  onIssue: () => void;
  onRevoke: (uid: string) => void;
  onGuests: () => void;
}) {
  const cards = b.roomCards ?? [];
  const guests = b.guests ?? [];
  const complete = hasGuestProfile(guests);

  return (
    <div className="bsp">
      <section className="bsp-box">
        <header className="bsp-head">
          <span className="bsp-title">
            <i className="bi bi-credit-card-2-front" aria-hidden="true" /> Thẻ phòng
          </span>
          <span className="bsp-sub">
            Tầng {floorOf(b.room)} · {roomClass}
            {lockAlias ? ` · ${lockAlias}` : ''}
          </span>
        </header>
        {cards.length ? (
          <ul className="bsp-cards">
            {cards.map((card) => (
              <li key={card.uid}>
                <span className="bsp-uid">{formatUid(card.uid)}</span>
                <span className="bsp-time">
                  Phát {fmtDateTime(card.issuedAt)} · hết hạn {fmtDateTime(card.validTo)}
                </span>
                {editable && (
                  <button
                    type="button"
                    className="bsp-revoke"
                    aria-label={`Thu hồi thẻ ${card.uid}`}
                    title="Thu hồi thẻ"
                    onClick={() => onRevoke(card.uid)}
                  >
                    <i className="bi bi-x-circle" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="bsp-empty">Chưa phát thẻ phòng.</p>
        )}
        {editable && !lockAlias && <p className="bsp-empty text-danger">Phòng chưa liên kết khóa TTLock.</p>}
        {editable && (
          <button
            type="button"
            className="btn btn-light btn-sm"
            onClick={onIssue}
            disabled={!lockAlias}
          >
            <i className="bi bi-plus-lg" /> {cards.length ? 'Phát thêm thẻ' : 'Phát thẻ phòng'}
          </button>
        )}
      </section>

      <section className="bsp-box">
        <header className="bsp-head">
          <span className="bsp-title">
            <i className="bi bi-person-vcard" aria-hidden="true" /> Khách lưu trú
          </span>
          <span className={`bsp-badge ${complete ? 'ok' : 'warn'}`}>
            {complete ? `${guests.length} khách` : 'Chưa nhập'}
          </span>
        </header>
        {guests.length ? (
          <ul className="bsp-guests">
            {guests.map((g, i) => (
              <li key={i}>
                <strong>{g.fullName || '—'}</strong>
                <span>
                  {ID_TYPE_LABEL[g.idType]} {g.idNumber || '—'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="bsp-empty">Nhập CCCD hoặc passport để lưu trú hợp lệ.</p>
        )}
        {editable && (
          <button type="button" className="btn btn-light btn-sm" onClick={onGuests}>
            <i className={`bi ${guests.length ? 'bi-pencil' : 'bi-person-plus'}`} />{' '}
            {guests.length ? 'Sửa thông tin' : 'Nhập thông tin khách'}
          </button>
        )}
      </section>
    </div>
  );
}
