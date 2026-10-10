import type { Booking } from '../../types';
import { Modal } from '../../components/Modal';
import { useStore } from '../../store';
import { bookingInterval } from '../../lib/rooms';
import { branchName, money } from '../../lib/format';
import { folioPaid, folioTotal } from '../../lib/folio';

const STATUS: Record<string, string> = { confirmed: 'Đã đặt', 'checked-in': 'Đang sử dụng', 'checked-out': 'Đã trả', pending: 'Chờ xác nhận' };
const fmt = (ms: number) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ms);
const duration = (ms: number) => {
  const min = Math.round(ms / 60000);
  const days = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  return [days && `${days} ngày`, h && `${h} giờ`, m && `${m} phút`].filter(Boolean).join(' ') || '0 phút';
};

export function BookingDetailModal({ booking, onClose, onDetail }: { booking: Booking | null; onClose: () => void; onDetail: (b: Booking) => void }) {
  const { data } = useStore();
  const b = booking;
  const room = b && data.rooms.find(r => r.branchId === b.branchId && r.number === b.room);
  const folio = b && data.folios.find(f => f.code === b.id);
  const range = b && bookingInterval(data, b);
  const total = folio ? folioTotal(folio) : b?.amount ?? 0;
  const paid = folio ? folioPaid(folio) : 0;

  return (
    <Modal open={!!b} title={b ? `Chi tiết ${room?.name || `Phòng ${b.room}`}` : ''} onClose={onClose}
      footer={b && <button type="button" className="btn-success-custom" onClick={() => onDetail(b)}>Xem chi tiết</button>}>
      {b && <>
        <div className="booking-detail-card">
          <div className="booking-detail-head">
            <strong>{room?.name || `Phòng ${b.room}`}</strong>
            <span className={`status-pill ${b.status}`}>{STATUS[b.status] || b.status}</span>
            <span className="booking-detail-source"><i className="bi bi-globe" /> {folio?.source || 'Đặt phòng'}</span>
          </div>
          <div className="booking-detail-grid">
            <div><small>Khách hàng</small><span>{b.customer} - {b.phone}</span></div>
            <div><small>Chi nhánh</small><span>{branchName(b.branchId)} · Phòng {b.room}</span></div>
            <div><small>Mã đặt phòng</small><span>{b.id}</span></div>
            <div><small>Nhận phòng</small><span>{range ? fmt(range[0]) : b.time || '—'}</span></div>
            <div><small>Trả phòng</small><span>{range ? fmt(range[1]) : '—'}</span></div>
            <div><small>Thời gian lưu trú</small><span>{range ? duration(range[1] - range[0]) : '—'} · {b.type}</span></div>
          </div>
        </div>
        <div className="booking-detail-foot">
          <span className="text-muted small"><i className="bi bi-pencil" /> [Secret code] {b.securityCode || '—'}</span>
          <div className="booking-detail-money">
            <div><span>{b.type}</span><strong>{money(total)}</strong></div>
            <div><span>Khách đã trả</span><strong>{money(paid)}</strong></div>
          </div>
        </div>
      </>}
    </Modal>
  );
}
