import type { Folio } from '../types';
import { Modal } from '../components/Modal';
import { BookingGuests } from './BookingGuests';

export function GuestDocsModal({ b, onClose }: { b: Folio; onClose: () => void }) {
  return (
    <Modal
      open
      eyebrow="GIẤY TỜ KHÁCH"
      title={`${b.code} · Phòng ${b.room}`}
      size="lg"
      onClose={onClose}
      footer={
        <button className="btn btn-light" onClick={onClose}>
          <i className="bi bi-arrow-left" /> Quay lại
        </button>
      }
    >
      <BookingGuests booking={b} />
    </Modal>
  );
}
