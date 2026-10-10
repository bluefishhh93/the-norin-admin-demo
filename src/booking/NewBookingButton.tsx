import { useBooking } from './context';

export function NewBookingButton() {
  const { openBooking } = useBooking();
  return <button className="btn-primary-custom" type="button" onClick={() => openBooking()}><i className="bi bi-plus-lg" /> Tạo đặt phòng</button>;
}
