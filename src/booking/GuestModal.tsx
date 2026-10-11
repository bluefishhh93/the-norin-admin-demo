import { useState } from 'react';
import type { BookingGuest, Folio } from '../types';
import { useStore } from '../store';
import { Modal } from '../components/Modal';
import { useBookingActions } from './actions';
import {
  GUEST_FIELDS,
  MAX_GUESTS,
  emptyGuest,
  guestErrors,
  type GuestField
} from './guest';
import { GuestForm } from './GuestForm';

export function GuestModal({ b, onClose }: { b: Folio; onClose: () => void }) {
  const { toast } = useStore();
  const act = useBookingActions();
  const [guests, setGuests] = useState<BookingGuest[]>(() =>
    b.guests?.length ? structuredClone(b.guests) : [emptyGuest(b.customer)]
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const errors = guests.map(guestErrors);

  const patch = (index: number, next: Partial<BookingGuest>) =>
    setGuests((rows) => rows.map((row, i) => (i === index ? { ...row, ...next } : row)));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    const at = errors.findIndex((row) => Object.keys(row).length);
    if (at >= 0) {
      const field = GUEST_FIELDS.find((f) => errors[at][f]);
      document.getElementById(`guest${at}-${field}`)?.focus();
      return;
    }
    act.saveGuests(
      b.code,
      guests.map((g) => ({
        ...g,
        fullName: g.fullName.trim(),
        idNumber: g.idNumber.trim(),
        nationality: g.nationality?.trim(),
        address: g.address.trim()
      }))
    );
    toast(`Đã lưu ${guests.length} khách lưu trú.`);
    onClose();
  };

  return (
    <Modal
      open
      eyebrow="KHÁCH LƯU TRÚ"
      title={`${b.code} · Phòng ${b.room}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-light me-auto"
            disabled
            title="Sắp có – dùng máy quét CCCD/Passport tại quầy"
          >
            <i className="bi bi-upc-scan" /> Quét giấy tờ
          </button>
          <button className="btn btn-light" onClick={onClose}>
            Đóng
          </button>
          <button className="btn-primary-custom" type="submit" form="guestForm">
            Lưu thông tin
          </button>
        </>
      }
    >
      <form id="guestForm" onSubmit={save} noValidate>
        {guests.map((guest, index) => (
          <GuestForm
            key={index}
            index={index}
            guest={guest}
            errors={errors[index]}
            show={(field: GuestField) => tried || !!touched[`${index}:${field}`]}
            onTouch={(field) => setTouched((t) => ({ ...t, [`${index}:${field}`]: true }))}
            onChange={(next) => patch(index, next)}
            onRemove={
              guests.length > 1
                ? () => {
                    setGuests((rows) => rows.filter((_, i) => i !== index));
                    setTouched({});
                  }
                : undefined
            }
          />
        ))}
        {guests.length < MAX_GUESTS && (
          <button
            type="button"
            className="gf-add"
            onClick={() => setGuests((rows) => [...rows, emptyGuest()])}
          >
            <i className="bi bi-person-plus" /> Thêm khách
          </button>
        )}
      </form>
    </Modal>
  );
}
