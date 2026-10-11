import { useState } from 'react';
import { useBooking } from './context';
import { CardLookupModal } from './CardLookupModal';

export function CardCheckoutButton() {
  const { openDetail } = useBooking();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-outline-custom" type="button" onClick={() => setOpen(true)}>
        <i className="bi bi-credit-card-2-front" /> Trả phòng bằng thẻ
      </button>
      {open && (
        <CardLookupModal
          onClose={() => setOpen(false)}
          onOpenDetail={(code) => {
            setOpen(false);
            openDetail(code);
          }}
        />
      )}
    </>
  );
}
