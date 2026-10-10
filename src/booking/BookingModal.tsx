import { useMemo, useState } from 'react';
import type { StayType } from '../types';
import { Modal } from '../components/Modal';
import { useStore } from '../store';
import { branches } from '../seed/base';
import { localDateTime } from '../lib/format';
import { applyBooking, validateBooking } from './create';
import type { BookingPreset } from './context';

const STAY_HOURS: Record<StayType, number> = { 'Theo giờ': 2, 'Qua đêm': 12, 'Theo ngày': 24 };

const roundedNow = () => {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
  return now;
};

export function BookingModal({ open, preset, onClose, onCreated }: { open: boolean; preset: BookingPreset; onClose: () => void; onCreated: () => void }) {
  const { data, update, toast } = useStore();
  const allowed = data.role === 'superadmin' ? branches : branches.filter(b => b.id === 'sontra');
  const initialBranch = preset.branchId ?? (data.branchId === 'all' ? allowed[0].id : data.branchId);
  const initialStart = preset.start ?? roundedNow();
  const initialType = preset.type ?? 'Theo giờ';

  const [branchId, setBranchId] = useState(initialBranch);
  const [room, setRoom] = useState(preset.room ?? '');
  const [type, setType] = useState<StayType>(initialType);
  const initialEnd = preset.end ?? new Date(initialStart.getTime() + STAY_HOURS[initialType] * 3600000);
  const locked = !!preset.locked;
  const [duration, setDuration] = useState(Math.min(8, Math.max(2, Math.round((initialEnd.getTime() - initialStart.getTime()) / 3600000))));
  const [start, setStart] = useState(localDateTime(initialStart));
  const [end, setEnd] = useState(localDateTime(initialEnd));
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [note, setNote] = useState('');
  const [contactMethod, setContactMethod] = useState('zalo');
  const [zaloPhone, setZaloPhone] = useState('');

  const rooms = useMemo(() => data.rooms.filter(r => r.branchId === branchId && r.status !== 'cleaning'), [data.rooms, branchId]);
  const roomValue = rooms.some(r => r.number === room) ? room : rooms[0]?.number ?? '';

  const syncEnd = (nextStart: string, nextType: StayType, nextDuration: number) => {
    if (!nextStart) return;
    const hours = nextType === 'Theo giờ' ? nextDuration : STAY_HOURS[nextType];
    setEnd(localDateTime(new Date(new Date(nextStart).getTime() + hours * 3600000)));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = { branchId, room: roomValue, type, customer, phone, email, securityCode, note, contactMethod, zaloPhone, start, end };
    const result = validateBooking(data, input);
    if (typeof result === 'string') { toast(result); return; }
    const id = `NR-${data.nextId}`;
    update(d => { applyBooking(d, input, result.start, result.end, result.amount); });
    onCreated();
    toast(`Đã tạo đặt phòng #${id} trong bản demo.`);
  };

  const footer = <>
    <button type="button" className="btn btn-light" onClick={onClose}>Hủy</button>
    <button type="submit" form="bookingForm" className="btn-primary-custom" disabled={!rooms.length}>Tạo đặt phòng <i className="bi bi-arrow-right" /></button>
  </>;

  return (
    <Modal open={open} eyebrow="ĐẶT PHÒNG MỚI" title="Tạo đặt phòng" onClose={onClose} footer={footer}>
      <form id="bookingForm" onSubmit={submit}>
        <div className="row g-3">
          {locked && (
            <div className="col-12">
              <div className="booking-locked-summary">
                <div><small>Phòng</small><strong>{branches.find(b => b.id === branchId)?.name} · {roomValue}</strong></div>
                <div><small>Loại lưu trú</small><strong>{type}</strong></div>
                <div><small>Nhận phòng</small><strong>{start.replace('T', ' ')}</strong></div>
                <div><small>Trả phòng</small><strong>{end.replace('T', ' ')}</strong></div>
              </div>
            </div>
          )}
          {!locked && data.role === 'superadmin' && (
            <div className="col-12">
              <label className="form-label" htmlFor="bookingBranch">Chi nhánh</label>
              <select className="form-select" id="bookingBranch" required value={branchId} onChange={e => setBranchId(e.target.value)}>
                {allowed.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          {!locked && <div className="col-sm-6">
            <label className="form-label" htmlFor="bookingRoom">Phòng</label>
            <select className="form-select" id="bookingRoom" required value={roomValue} onChange={e => setRoom(e.target.value)}>
              {rooms.length ? rooms.map(r => <option key={r.number} value={r.number}>Phòng {r.number}</option>) : <option value="">Không có phòng khả dụng</option>}
            </select>
          </div>}
          {!locked && <div className="col-sm-6">
            <label className="form-label" htmlFor="bookingType">Loại lưu trú</label>
            <select className="form-select" id="bookingType" value={type} onChange={e => { const t = e.target.value as StayType; setType(t); syncEnd(start, t, duration); }}>
              <option>Theo giờ</option><option>Qua đêm</option><option>Theo ngày</option>
            </select>
          </div>}
          {!locked && type === 'Theo giờ' && (
            <div className="col-12">
              <label className="form-label" htmlFor="bookingDuration">Thời lượng theo giờ (2–8 tiếng)</label>
              <select className="form-select" id="bookingDuration" value={duration} onChange={e => { const n = Number(e.target.value); setDuration(n); syncEnd(start, type, n); }}>
                {[2, 3, 4, 5, 6, 7, 8].map(h => <option key={h} value={h}>{h} tiếng</option>)}
              </select>
            </div>
          )}
          <div className="col-12">
            <label className="form-label" htmlFor="bookingCustomer">Tên khách hàng</label>
            <input className="form-control" id="bookingCustomer" required maxLength={60} placeholder="Nhập tên khách hàng" value={customer} onChange={e => setCustomer(e.target.value)} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="bookingPhone">Số điện thoại</label>
            <input className="form-control" id="bookingPhone" type="tel" inputMode="tel" pattern="(03|05|07|08|09)[0-9]{8}" maxLength={10} required placeholder="09xx xxx xxx"
              value={phone} onChange={e => { setPhone(e.target.value); if (contactMethod === 'zalo') setZaloPhone(e.target.value); }} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="bookingEmail">Email (tùy chọn)</label>
            <input className="form-control" id="bookingEmail" type="email" placeholder="Email liên hệ" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="bookingSecurityCode">Mã nhận phòng (6 số)</label>
            <input className="form-control" id="bookingSecurityCode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="off" value={securityCode} onChange={e => setSecurityCode(e.target.value)} />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="bookingNote">Ghi chú</label>
            <textarea className="form-control" id="bookingNote" rows={2} value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="bookingContactMethod">Gửi thông tin qua</label>
            <select className="form-select" id="bookingContactMethod" value={contactMethod} onChange={e => setContactMethod(e.target.value)}>
              <option value="zalo">Zalo</option><option value="email">Email</option>
            </select>
          </div>
          {contactMethod === 'zalo' && (
            <div className="col-sm-6">
              <label className="form-label" htmlFor="bookingZaloPhone">Số Zalo</label>
              <input className="form-control" id="bookingZaloPhone" inputMode="tel" pattern="(03|05|07|08|09)[0-9]{8}" maxLength={10} value={zaloPhone} onChange={e => setZaloPhone(e.target.value)} />
            </div>
          )}
          {!locked && <><div className="col-sm-6">
            <label className="form-label" htmlFor="bookingTime">Giờ nhận phòng</label>
            <input className="form-control" id="bookingTime" type="datetime-local" required value={start} onChange={e => { setStart(e.target.value); syncEnd(e.target.value, type, duration); }} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="bookingEnd">Giờ trả phòng</label>
            <input className="form-control" id="bookingEnd" type="datetime-local" required readOnly={type === 'Theo giờ'} value={end} onChange={e => setEnd(e.target.value)} />
          </div></>}
        </div>
      </form>
    </Modal>
  );
}
