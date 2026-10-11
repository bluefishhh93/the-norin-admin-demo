import { useState } from 'react';
import type { BookingGuest, Folio } from '../types';
import { GuestForm } from '../booking/GuestForm';
import { emptyGuest, guestErrors, MAX_GUESTS } from '../booking/guest';
import { demoGuests } from './workflow';

export function KioskGuestEditor({ folio, onConfirm, onCancel }: {
  folio: Folio;
  onConfirm: (guests: BookingGuest[]) => void;
  onCancel: () => void;
}) {
  const [guests, setGuests] = useState<BookingGuest[]>(() =>
    folio.guests?.length ? structuredClone(folio.guests) : [emptyGuest(folio.customer)]);
  const [submitted, setSubmitted] = useState(false);
  const confirm = () => {
    setSubmitted(true);
    if (guests.some((g) => Object.keys(guestErrors(g)).length)) return;
    onConfirm(guests);
  };
  return (
    <div className="kiosk-guest-editor">
      <strong>Nhập hồ sơ thay cho máy quét</strong>
      <p className="text-muted small">Kiểm tra giấy tờ của khách, nhập thông tin rồi xác nhận. Hồ sơ được lưu vào booking và kiosk chuyển sang thanh toán.</p>
      {guests.map((guest, i) => (
        <GuestForm key={i} index={i} guest={guest} errors={guestErrors(guest)}
          show={() => submitted} onTouch={() => {}}
          onChange={(patch) => setGuests((rows) => rows.map((g, index) => index === i ? { ...g, ...patch } : g))}
          onRemove={guests.length > 1 ? () => setGuests((rows) => rows.filter((_, index) => index !== i)) : undefined} />
      ))}
      <div className="booking-detail-actions">
        {guests.length < MAX_GUESTS && <button className="btn btn-light" onClick={() => setGuests((rows) => [...rows, emptyGuest()])}>Thêm khách</button>}
        <button className="btn btn-light" onClick={() => setGuests(demoGuests(folio.customer))}>Điền hồ sơ mẫu (demo)</button>
        <button className="btn-primary-custom" onClick={confirm}>Xác nhận hồ sơ & tiếp tục kiosk</button>
        <button className="btn btn-light" onClick={onCancel}>Đóng nhập hồ sơ</button>
      </div>
    </div>
  );
}
