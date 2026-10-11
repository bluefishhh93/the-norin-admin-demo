import type { Folio } from '../types';
import { ID_TYPE_LABEL, ageOf } from './guest';

const GENDER: Record<string, string> = { Male: 'Nam', Female: 'Nữ' };
const day = (value: string) => (value ? value.slice(0, 10).split('-').reverse().join('/') : '—');

export function BookingGuests({ booking, onEdit }: { booking: Folio; onEdit?: () => void }) {
  const guests = booking.guests ?? [];
  if (!guests.length)
    return (
      <div className="bg-empty">
        <i className="bi bi-person-vcard" aria-hidden="true" />
        <strong>Chưa có thông tin khách lưu trú</strong>
        <p>Nhập CCCD hoặc passport của khách sau khi nhận phòng.</p>
        {onEdit && (
          <button className="btn-primary-custom" onClick={onEdit}>
            <i className="bi bi-person-plus" /> Nhập thông tin khách
          </button>
        )}
      </div>
    );
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="workflow-heading mb-0">{guests.length} khách lưu trú</h3>
        {onEdit && (
          <button className="btn btn-light" onClick={onEdit}>
            <i className="bi bi-pencil" /> Sửa thông tin
          </button>
        )}
      </div>
      <div className="bg-list">
        {guests.map((g, i) => (
          <article className="bg-card" key={i}>
            {g.idCardAvatar ? (
              <img className="bg-avatar" src={g.idCardAvatar} alt={`Chân dung ${g.fullName}`} />
            ) : (
              <span className="bg-avatar" aria-hidden="true">
                {g.fullName.trim().charAt(0).toUpperCase() || '?'}
              </span>
            )}
            <div className="bg-body">
              <div className="bg-title">
                <strong>{g.fullName || '—'}</strong>
                <span className="booking-state">{ID_TYPE_LABEL[g.idType]}</span>
              </div>
              <dl className="bg-facts">
                <div>
                  <dt>Số giấy tờ</dt>
                  <dd className="bg-mono">{g.idNumber || '—'}</dd>
                </div>
                <div>
                  <dt>Ngày sinh</dt>
                  <dd>
                    {day(g.dateOfBirth)}
                    {g.dateOfBirth && ` · ${ageOf(g.dateOfBirth)} tuổi`}
                  </dd>
                </div>
                <div>
                  <dt>Giới tính</dt>
                  <dd>{GENDER[g.gender] ?? '—'}</dd>
                </div>
                <div>
                  <dt>Quốc tịch</dt>
                  <dd>{g.nationality || '—'}</dd>
                </div>
                <div>
                  <dt>Cấp / hết hạn</dt>
                  <dd>
                    {day(g.issueDate)} → {day(g.expiryDate)}
                  </dd>
                </div>
                <div className="wide">
                  <dt>Địa chỉ</dt>
                  <dd>{g.address || '—'}</dd>
                </div>
              </dl>
            </div>
            {g.idCardPhoto && (
              <a className="bg-doc" href={g.idCardPhoto} target="_blank" rel="noreferrer">
                <img src={g.idCardPhoto} alt={`Giấy tờ của ${g.fullName}`} />
              </a>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
