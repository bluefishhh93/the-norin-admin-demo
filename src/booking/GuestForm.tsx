import type { BookingGuest, GuestIdType } from '../types';
import { ID_TYPE_LABEL, type GuestErrors, type GuestField } from './guest';
import { GuestPhoto } from './GuestPhoto';

const Req = () => <span className="required-mark">*</span>;

export function GuestForm({
  index,
  guest,
  errors,
  show,
  onTouch,
  onChange,
  onRemove
}: {
  index: number;
  guest: BookingGuest;
  errors: GuestErrors;
  show: (field: GuestField) => boolean;
  onTouch: (field: GuestField) => void;
  onChange: (patch: Partial<BookingGuest>) => void;
  onRemove?: () => void;
}) {
  const id = (field: string) => `guest${index}-${field}`;
  const err = (field: GuestField) => (show(field) ? errors[field] : undefined);
  const control = (field: GuestField) => ({
    id: id(field),
    className: `form-control${err(field) ? ' is-invalid' : ''}`,
    'aria-invalid': !!err(field),
    'aria-describedby': err(field) ? id(`${field}-error`) : undefined,
    onBlur: () => onTouch(field)
  });
  const feedback = (field: GuestField) =>
    err(field) ? (
      <div id={id(`${field}-error`)} className="invalid-feedback">
        {err(field)}
      </div>
    ) : null;
  const passport = guest.idType === 'passport';

  return (
    <fieldset className="gf">
      <legend className="gf-head">
        <span className="gf-index">Khách {index + 1}</span>
        {onRemove && (
          <button type="button" className="text-link gf-remove" onClick={onRemove}>
            <i className="bi bi-trash3" /> Xóa
          </button>
        )}
      </legend>

      <div className="booking-segment mb-3" role="radiogroup" aria-label="Loại giấy tờ">
        {(['id_card', 'passport'] as GuestIdType[]).map((type) => (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={guest.idType === type}
            className={guest.idType === type ? 'active' : ''}
            onClick={() => onChange({ idType: type, idNumber: '' })}
          >
            <i className={`bi ${type === 'passport' ? 'bi-passport' : 'bi-person-vcard'}`} />{' '}
            {ID_TYPE_LABEL[type]}
          </button>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-sm-7">
          <label className="form-label" htmlFor={id('fullName')}>
            Họ và tên <Req />
          </label>
          <input
            {...control('fullName')}
            maxLength={80}
            autoComplete="off"
            placeholder="NGUYỄN VĂN A"
            value={guest.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
          />
          {feedback('fullName')}
        </div>
        <div className="col-sm-5">
          <label className="form-label" htmlFor={id('idNumber')}>
            {passport ? 'Số passport' : 'Số CCCD'} <Req />
          </label>
          <input
            {...control('idNumber')}
            inputMode={passport ? 'text' : 'numeric'}
            maxLength={passport ? 9 : 12}
            autoComplete="off"
            spellCheck={false}
            placeholder={passport ? 'C1234567' : '012345678901'}
            value={guest.idNumber}
            onChange={(e) =>
              onChange({
                idNumber: passport
                  ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                  : e.target.value.replace(/\D/g, '')
              })
            }
          />
          {feedback('idNumber')}
        </div>
        <div className="col-sm-4">
          <label className="form-label" htmlFor={id('dateOfBirth')}>
            Ngày sinh <Req />
          </label>
          <input
            {...control('dateOfBirth')}
            type="date"
            value={guest.dateOfBirth}
            onChange={(e) => onChange({ dateOfBirth: e.target.value })}
          />
          {feedback('dateOfBirth')}
        </div>
        <div className="col-sm-4">
          <label className="form-label" htmlFor={id('gender')}>
            Giới tính
          </label>
          <select
            id={id('gender')}
            className="form-select"
            value={guest.gender}
            onChange={(e) => onChange({ gender: e.target.value as BookingGuest['gender'] })}
          >
            <option value="">—</option>
            <option value="Male">Nam</option>
            <option value="Female">Nữ</option>
          </select>
        </div>
        <div className="col-sm-4">
          <label className="form-label" htmlFor={id('nationality')}>
            Quốc tịch {passport && <Req />}
          </label>
          <input
            {...control('nationality')}
            maxLength={40}
            autoComplete="off"
            placeholder={passport ? 'Hàn Quốc' : 'Việt Nam'}
            value={guest.nationality ?? ''}
            onChange={(e) => onChange({ nationality: e.target.value })}
          />
          {feedback('nationality')}
        </div>
        <div className="col-sm-6">
          <label className="form-label" htmlFor={id('issueDate')}>
            Ngày cấp
          </label>
          <input
            {...control('issueDate')}
            type="date"
            value={guest.issueDate}
            onChange={(e) => onChange({ issueDate: e.target.value })}
          />
          {feedback('issueDate')}
        </div>
        <div className="col-sm-6">
          <label className="form-label" htmlFor={id('expiryDate')}>
            Ngày hết hạn
          </label>
          <input
            {...control('expiryDate')}
            type="date"
            value={guest.expiryDate}
            onChange={(e) => onChange({ expiryDate: e.target.value })}
          />
          {feedback('expiryDate')}
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor={id('address')}>
            Địa chỉ
          </label>
          <input
            id={id('address')}
            className="form-control"
            maxLength={200}
            autoComplete="off"
            value={guest.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
        </div>
        <div className="col-sm-7">
          <GuestPhoto
            id={id('photo')}
            label="Ảnh giấy tờ"
            icon="bi-card-image"
            value={guest.idCardPhoto}
            onChange={(v) => onChange({ idCardPhoto: v })}
          />
        </div>
        <div className="col-sm-5">
          <GuestPhoto
            id={id('avatar')}
            label="Ảnh chân dung"
            icon="bi-person-bounding-box"
            value={guest.idCardAvatar}
            onChange={(v) => onChange({ idCardAvatar: v })}
          />
        </div>
      </div>
    </fieldset>
  );
}
