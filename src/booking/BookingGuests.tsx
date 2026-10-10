import { useState } from 'react';
import type { Folio } from '../types';
import { useStore } from '../store';
import { useBookingActions } from './actions';

export function BookingGuests({ booking }: { booking: Folio }) {
  const { toast } = useStore();
  const actions = useBookingActions();
  const [guests, setGuests] = useState(
    booking.guests ?? [{ name: booking.customer, document: '' }]
  );
  const save = () => {
    if (guests.some((guest) => !guest.name.trim())) {
      toast('Nhập tên các khách trước khi lưu.');
      return;
    }
    actions.saveGuests(booking.code, guests);
    toast('Đã lưu khách lưu trú.');
  };
  return (
    <>
      <p className="text-muted">
        Bổ sung khách thực tế khi nhận phòng. Hồ sơ trong bản demo được lưu tại trình duyệt.
      </p>
      {guests.map((guest, index) => (
        <div className="row g-3 mb-3" key={index}>
          <div className="col-sm-5">
            <label className="form-label" htmlFor={`guestName${index}`}>
              Tên khách {index + 1}
            </label>
            <input
              id={`guestName${index}`}
              className="form-control"
              value={guest.name}
              onChange={(e) =>
                setGuests((rows) =>
                  rows.map((row, i) => (i === index ? { ...row, name: e.target.value } : row))
                )
              }
            />
          </div>
          <div className="col-sm-5">
            <label className="form-label" htmlFor={`guestDoc${index}`}>
              Giấy tờ
            </label>
            <input
              id={`guestDoc${index}`}
              className="form-control"
              value={guest.document}
              onChange={(e) =>
                setGuests((rows) =>
                  rows.map((row, i) => (i === index ? { ...row, document: e.target.value } : row))
                )
              }
            />
          </div>
          <div className="col-sm-2 d-flex align-items-end">
            <button
              className="btn btn-light"
              onClick={() => setGuests((rows) => rows.filter((_, i) => i !== index))}
            >
              Xóa
            </button>
          </div>
        </div>
      ))}
      <div className="booking-detail-actions">
        <button
          className="btn btn-light"
          onClick={() => setGuests((rows) => [...rows, { name: '', document: '' }])}
        >
          Thêm khách
        </button>
        <button className="btn-primary-custom" onClick={save}>
          Lưu hồ sơ
        </button>
      </div>
    </>
  );
}
