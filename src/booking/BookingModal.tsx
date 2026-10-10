import { useRef, useState } from 'react';
import type { PaymentTiming, PayMethod, StayType, ProductSelection } from '../types';
import { Modal } from '../components/Modal';
import { useStore } from '../store';
import { localDateTime, money } from '../lib/format';
import { checkRoomInterval, className, getRoomPrice, stayWindow } from '../lib/rooms';
import { applyBooking, validateBooking } from './create';
import type { BookingPreset } from './context';
import './booking.css';
import { ProductPicker } from './ProductPicker';
import { quoteVoucher } from './voucher';
import { saleProducts } from './products';

export function BookingModal({ open, preset, onClose, onCreated }: { open: boolean; preset: BookingPreset; onClose: () => void; onCreated: (code: string, receiveNow: boolean) => void }) {
  const { data, update, toast } = useStore();
  const allowed = data.branches.filter(b => data.role === 'superadmin' || b.id === 'sontra');
  const initialStart = preset.start ?? new Date(Math.ceil(Date.now() / 1800000) * 1800000);
  const initialType = preset.type ?? 'Theo giờ';
  const initialRange = initialType === 'Theo giờ' ? [initialStart, preset.end ?? new Date(+initialStart + 7200000)] : stayWindow(data, initialType, localDateTime(initialStart).slice(0, 10));
  const [branchId, setBranchId] = useState(preset.branchId ?? (data.branchId === 'all' ? allowed[0]?.id ?? '' : data.branchId));
  const [room, setRoom] = useState(preset.room ?? '');
  const [type, setType] = useState<StayType>(initialType);
  const [receiveNow, setReceiveNow] = useState(preset.receiveNow ?? false);
  const [start, setStart] = useState(localDateTime(initialRange[0]));
  const [end, setEnd] = useState(localDateTime(preset.end ?? initialRange[1]));
  const [duration, setDuration] = useState(Math.max(2, Math.round((+(preset.end ?? initialRange[1]) - +initialRange[0]) / 3600000)));
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [timing, setTiming] = useState<PaymentTiming>('postpaid');
  const [method, setMethod] = useState<PayMethod>('cash');
  const [products, setProducts] = useState<ProductSelection[]>([]);
  const [voucherCode, setVoucherCode] = useState('');
  const [error, setError] = useState('');
  const submitted = useRef(false);
  const actualStart = receiveNow ? new Date() : new Date(start);
  const actualEnd = receiveNow && type === 'Theo giờ' ? new Date(+actualStart + duration * 3600000) : new Date(end);
  const options = data.rooms.filter(r => r.branchId === branchId).map(r => ({ room: r, reason: checkRoomInterval(data, r, actualStart, actualEnd, type) }));
  const price = room ? getRoomPrice(data, branchId, room, type, actualStart, actualEnd) : null;
  const selectedReason = options.find(o => o.room.number === room)?.reason;
  const productTotal = products.reduce((s, i) => s + (saleProducts(data, branchId).find(p => p.id === i.productId)?.price ?? 0) * i.quantity, 0);
  const quote = quoteVoucher(data, branchId, type, actualStart, price ?? 0, products, voucherCode);
  const total = Math.max(0, (price ?? 0) + productTotal - quote.discount);

  const schedule = (value: string, nextType = type, hours = duration) => {
    if (nextType === 'Theo giờ') {
      setStart(value);
      if (value) setEnd(localDateTime(new Date(Date.parse(value) + hours * 3600000)));
    } else {
      const [s, e] = stayWindow(data, nextType, value.slice(0, 10));
      setStart(localDateTime(s)); setEnd(localDateTime(e));
    }
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted.current) return;
    const input = { branchId, room, type, customer, phone, email, note, start, end, paymentTiming: timing, method, receiveNow, products, voucherCode };
    const result = validateBooking(data, input);
    if (typeof result === 'string') { setError(result); return; }
    submitted.current = true;
    const code = `NR-${data.nextId}`;
    update(d => { applyBooking(d, input, result.start, result.end, result.amount); });
    onCreated(code, receiveNow);
    toast(`Đã tạo booking ${code}.`);
  };

  return <Modal open={open} title="Tạo booking" eyebrow="ĐẶT PHÒNG" size="lg" onClose={onClose} footer={<><button className="btn btn-light" onClick={onClose}>Đóng</button><button className="btn-primary-custom" type="submit" form="bookingForm">{receiveNow ? 'Tạo và kiểm tra nhận phòng' : 'Tạo booking'}</button></>}>
    <form id="bookingForm" onSubmit={submit} className="booking-create-layout">
      <div>
        <div className="booking-segment mb-3"><button type="button" className={!receiveNow ? 'active' : ''} onClick={() => setReceiveNow(false)}>Đặt trước</button><button type="button" className={receiveNow ? 'active' : ''} onClick={() => { setReceiveNow(true); schedule(localDateTime(new Date())); }}>Nhận ngay</button></div>
        <h3 className="workflow-heading">Lịch & phòng</h3>
        <div className="row g-3">
          <div className="col-sm-6"><label className="form-label" htmlFor="bookingBranch">Chi nhánh</label><select id="bookingBranch" className="form-select" value={branchId} onChange={e => { setBranchId(e.target.value); setRoom(''); setProducts([]); setVoucherCode(''); }}>{allowed.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className="col-sm-6"><label className="form-label" htmlFor="bookingType">Loại lưu trú</label><select id="bookingType" className="form-select" value={type} onChange={e => { const t = e.target.value as StayType; setType(t); schedule(start, t); }}><option>Theo giờ</option><option>Qua đêm</option><option>Theo ngày</option></select></div>
          <div className="col-sm-6"><label className="form-label" htmlFor="bookingTime">Nhận phòng</label><input id="bookingTime" type="datetime-local" className="form-control" required readOnly={receiveNow && type === 'Theo giờ'} value={receiveNow && type === 'Theo giờ' ? localDateTime(actualStart) : start} onChange={e => schedule(e.target.value)} /></div>
          {type === 'Theo giờ' ? <div className="col-sm-6"><label className="form-label" htmlFor="bookingDuration">Thời lượng</label><select id="bookingDuration" className="form-select" value={duration} onChange={e => { const h = Number(e.target.value); setDuration(h); schedule(start, type, h); }}>{Array.from({ length: Math.max(1, data.rules.maxHourlyStay - 1) }, (_, i) => i + 2).map(h => <option key={h} value={h}>{h} tiếng</option>)}</select></div> : <div className="col-sm-6"><label className="form-label" htmlFor="bookingEnd">Trả phòng</label><input id="bookingEnd" type="datetime-local" className="form-control" required value={end} onChange={e => setEnd(e.target.value)} /></div>}
          <div className="col-12"><label className="form-label" htmlFor="bookingRoom">Phòng khả dụng</label><select id="bookingRoom" className="form-select" required value={room} onChange={e => setRoom(e.target.value)}><option value="">Chọn phòng</option>{options.map(o => <option key={o.room.number} value={o.room.number} disabled={o.reason !== true}>{o.room.number} · {className(data, o.room)}{o.reason !== true ? ' · Không khả dụng' : ''}</option>)}</select>{selectedReason && selectedReason !== true && <p className="text-danger small mt-1">{selectedReason}</p>}<small className="text-muted">{options.filter(o => o.reason === true).length} phòng phù hợp toàn bộ lịch đã chọn.</small></div>
        </div>
        <h3 className="workflow-heading mt-4">Khách liên hệ</h3><div className="row g-3">
          <div className="col-sm-6"><label className="form-label" htmlFor="bookingCustomer">Tên khách *</label><input id="bookingCustomer" className="form-control" required maxLength={60} value={customer} onChange={e => setCustomer(e.target.value)} /></div>
          <div className="col-sm-6"><label className="form-label" htmlFor="bookingPhone">Số điện thoại (nếu có)</label><input id="bookingPhone" className="form-control" type="tel" value={phone} onChange={e => { const v = e.target.value; setPhone(v); const old = data.folios.find(f => f.phone.replace(/\D/g, '') === v.replace(/\D/g, '') && v.replace(/\D/g, '').length >= 8); if (old) setCustomer(old.customer); }} /></div>
          <div className="col-12"><label className="form-label" htmlFor="bookingNote">Ghi chú</label><textarea id="bookingNote" className="form-control" rows={2} value={note} onChange={e => setNote(e.target.value)} /></div>
        </div><details className="mt-4"><summary>Thêm sản phẩm cùng booking</summary><div className="mt-3"><ProductPicker branchId={branchId} value={products} onChange={setProducts} /></div></details><details className="mt-3"><summary>Liên hệ bổ sung</summary><label className="form-label mt-2" htmlFor="bookingEmail">Email</label><input id="bookingEmail" className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} /></details>
      </div>
      <aside className="booking-price-summary"><h3 className="workflow-heading">Tóm tắt booking</h3><p>{room ? `Phòng ${room}` : 'Chưa chọn phòng'} · {type}</p><p className="small">{actualStart.toLocaleString('vi-VN')}<br />→ {actualEnd.toLocaleString('vi-VN')}</p><div className="booking-price-total"><span>Tiền phòng</span><strong>{price == null ? '—' : money(price)}</strong></div>
        {products.length > 0 && <p className="mt-2">Sản phẩm: {money(productTotal)}</p>}
        <label className="form-label mt-3" htmlFor="bookingVoucher">Mã voucher (nếu có)</label><input id="bookingVoucher" className="form-control" value={voucherCode} onChange={e => setVoucherCode(e.target.value)} />
        {quote.error && <p className="text-danger small mt-2">{quote.error}</p>}{quote.voucher && <p className="small mt-2">{quote.voucher.name} · {quote.voucher.scope === 'ROOM_ONLY' ? 'Giảm tiền phòng' : 'Giảm toàn booking'}: −{money(quote.discount)}</p>}
        <div className="booking-price-total mt-3"><span>Tổng booking</span><strong>{price == null ? '—' : money(total)}</strong></div>
        <label className="form-label mt-3" htmlFor="bookingTiming">Thanh toán</label><select id="bookingTiming" className="form-select" value={timing} onChange={e => setTiming(e.target.value as PaymentTiming)}><option value="postpaid">Trả sau</option><option value="prepaid">Trả trước</option></select>
        {timing === 'prepaid' && <><label className="form-label mt-3" htmlFor="bookingMethod">Đã nhận tiền bằng</label><select id="bookingMethod" className="form-select" value={method} onChange={e => setMethod(e.target.value as PayMethod)}><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản tại quầy</option><option value="card">Thẻ tại quầy</option></select><p className="small mt-2">Ghi nhận đã thu đủ tổng booking, gồm sản phẩm đã chọn và voucher. Chỉ chọn khi đã nhận tiền.</p></>}
        {timing === 'postpaid' && <p className="small text-muted mt-2">Chưa thu khi tạo. Quyết toán tiền phòng và các khoản phát sinh lúc trả phòng.</p>}
        {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
      </aside>
    </form>
  </Modal>;
}
