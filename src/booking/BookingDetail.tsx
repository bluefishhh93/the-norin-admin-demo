import { useRef, useState } from 'react';
import type { Folio, PayMethod, ProductSelection } from '../types';
import { useStore } from '../store';
import { useBooking } from './context';
import { useBookingActions } from './actions';
import { checkinSchedule } from './checkin';
import { paymentTiming, refundable, statusLabel } from './model';
import { branchName, fmtDateTime, localDateTime, methodLabel, money } from '../lib/format';
import { checkoutAt, folioDue, folioPaid, folioTotal, isActive } from '../lib/folio';
import { checkRoomInterval, className } from '../lib/rooms';
import { Modal } from '../components/Modal';
import { Tabs } from '../components/ui';
import { useFolioDialogs } from '../pages/workflow/shared';
import { ProductPicker } from './ProductPicker';
import { isProduct } from './products';
import { roomChangePrice } from './room-change';
import { BookingProducts } from './BookingProducts';
type Task = 'checkin' | 'edit' | 'move' | 'extend' | 'checkout' | 'cancel' | 'no-show' | 'refund' | 'products';

export function BookingDetail({ b }: { b: Folio }) {
  const { data, toast } = useStore();
  const { closeDetail, initialCheckin, clearInitialCheckin } = useBooking();
  const act = useBookingActions();
  const { collect } = useFolioDialogs();
  const [tab, setTab] = useState('Tổng quan');
  const [task, setTask] = useState<Task | null>(initialCheckin ? 'checkin' : null);
  const [note, setNote] = useState(b.note ?? '');
  const [guests, setGuests] = useState(b.guests ?? [{ name: b.customer, document: '' }]);
  const [showSecret, setShowSecret] = useState(false);
  const active = isActive(b);
  const pending = active && b.detailStatus === 1;
  const inHouse = active && b.detailStatus === 2;
  const due = folioDue(b), refund = refundable(b);
  const room = data.rooms.find(r => r.branchId === b.branchId && r.number === b.room);
  const next = data.folios.filter(f => f.code !== b.code && f.branchId === b.branchId && f.room === b.room && isActive(f) && Date.parse(f.effectiveCheckInTime) >= Date.parse(checkoutAt(b))).sort((a, c) => Date.parse(a.effectiveCheckInTime) - Date.parse(c.effectiveCheckInTime))[0];
  const open = (value: Task) => { clearInitialCheckin(); setTask(value); };
  const copy = async () => {
    const text = `${b.code} · ${branchName(b.branchId)} · Phòng ${b.room}\n${b.customer}\n${fmtDateTime(b.effectiveCheckInTime)} → ${fmtDateTime(checkoutAt(b))}\nTổng: ${money(folioTotal(b))} · ${paymentTiming(b) === 'prepaid' ? 'Trả trước' : 'Trả sau'}`;
    try { await navigator.clipboard.writeText(text); toast('Đã sao chép thông tin xác nhận.'); } catch { toast('Trình duyệt không cho sao chép.'); }
  };

  return <section className="booking-detail-page">
    <button className="btn btn-light mb-3" onClick={closeDetail}><i className="bi bi-arrow-left" /> Quay lại booking</button>
    <div className="booking-detail-header"><div><div className="eyebrow">{b.source} · {branchName(b.branchId)}</div><h2>{b.code} <span className="booking-state">{statusLabel(b)}</span></h2><p>Phòng {b.room} · {room && className(data, room)} · {b.stayType}</p></div><div className="booking-detail-actions">
      {b.status === 4 && <button className="btn-primary-custom" onClick={() => act.confirm(b.code)}>Xác nhận booking</button>}
      {pending && b.status === 1 && <button className="btn-primary-custom" onClick={() => open('checkin')}>Nhận phòng</button>}
      {inHouse && <button className="btn-primary-custom" onClick={() => open('checkout')}>Trả phòng</button>}
      {active && due > 0 && <button className="btn btn-outline-success" onClick={() => collect(b)}>Thu tiền</button>}
      {refund > 0 && data.role === 'superadmin' && <button className="btn btn-outline-warning" onClick={() => open('refund')}>Hoàn tiền</button>}
    </div></div>
    {b.checkinAssistanceRequestedAt && !b.assistanceResolvedAt && <div className="alert alert-warning">Khách yêu cầu hỗ trợ nhận phòng từ kiosk. Kiểm tra lịch và phòng trước khi tiếp nhận.</div>}
    {b.checkoutRequestedAt && inHouse && <div className="alert alert-info">Khách yêu cầu trả phòng lúc {fmtDateTime(b.checkoutRequestedAt)}. Booking vẫn đang ở cho đến khi hoàn tất trả phòng.</div>}
    {inHouse && Date.parse(checkoutAt(b)) < Date.now() && <div className="alert alert-warning">Đã quá giờ trả phòng. {next ? `Lượt tiếp theo ${next.code} nhận lúc ${fmtDateTime(next.effectiveCheckInTime)}.` : 'Chưa có lịch nhận phòng kế tiếp.'}</div>}
    <div className="booking-money-strip"><div><small>Tổng phải trả</small><strong>{money(folioTotal(b))}</strong></div><div><small>Đã thanh toán</small><strong>{money(folioPaid(b))}</strong></div><div><small>{refund > 0 ? 'Cần hoàn' : 'Còn phải thu'}</small><strong>{money(refund || (b.status === 3 ? 0 : due))}</strong></div><div><small>Hình thức</small><strong>{paymentTiming(b) === 'prepaid' ? 'Trả trước' : 'Trả sau'}</strong></div></div>
    <Tabs items={['Tổng quan', 'Sản phẩm', 'Chi phí & thanh toán', 'Khách lưu trú', 'Lịch sử']} value={tab} onChange={setTab} />
    <div className="panel p-4 mt-3">
      {tab === 'Tổng quan' && <>
        <div className="booking-overview-grid"><div><small>Khách liên hệ</small><strong>{b.customer}</strong><span>{b.phone || 'Chưa có số điện thoại'}</span></div><div><small>Nhận → trả hiệu lực</small><strong>{fmtDateTime(b.effectiveCheckInTime)}</strong><span>→ {fmtDateTime(checkoutAt(b))}</span></div><div><small>Nhận / trả thực tế</small><span>{b.actualCheckInAt ? fmtDateTime(b.actualCheckInAt) : inHouse ? 'Đã nhận (dữ liệu cũ)' : 'Chưa nhận'}</span><span>{b.actualCheckOutAt ? fmtDateTime(b.actualCheckOutAt) : 'Chưa trả'}</span></div><div><small>Truy cập phòng</small><span>{inHouse ? `Hiệu lực đến ${fmtDateTime(checkoutAt(b))}` : 'Chưa có quyền đang sử dụng'}</span>{data.role === 'superadmin' && b.securityCode && <button className="btn btn-link p-0 text-start" onClick={() => setShowSecret(v => !v)}>Mã nhận phòng: {showSecret ? b.securityCode : '••••••'}</button>}</div></div>
        {(b.originalCheckInTime !== b.effectiveCheckInTime || b.originalCheckOutTime !== checkoutAt(b)) && <p className="small text-muted mt-3">Lịch ban đầu: {fmtDateTime(b.originalCheckInTime)} → {fmtDateTime(b.originalCheckOutTime)}</p>}
        {next && <p className="mt-3">Lượt kế tiếp: <strong>{next.code}</strong> · {fmtDateTime(next.effectiveCheckInTime)} · cần chừa {data.rules.cleaningBuffer} phút dọn.</p>}
        <div className="booking-detail-actions mt-3">{pending && <button className="btn btn-light" onClick={() => open('edit')}>Sửa lịch</button>}{active && <button className="btn btn-light" onClick={() => open('move')}>Đổi phòng</button>}{inHouse && <button className="btn btn-light" onClick={() => open('extend')}>Gia hạn</button>}{pending && <><button className="btn btn-outline-danger" onClick={() => open('cancel')}>Hủy booking</button>{Date.parse(b.effectiveCheckInTime) < Date.now() && <details className="booking-secondary-actions"><summary>Thao tác khác</summary><button className="btn btn-light" onClick={() => open('no-show')}>Khách không đến</button></details>}</>}</div>
        <label className="form-label mt-4" htmlFor="detailNote">Ghi chú</label><textarea id="detailNote" className="form-control" rows={3} value={note} onChange={e => setNote(e.target.value)} /><button className="btn btn-light mt-2" disabled={note === (b.note ?? '')} onClick={() => { act.saveNote(b.code, note); toast('Đã lưu ghi chú.'); }}>Lưu ghi chú</button>
        <div className="booking-detail-actions mt-4"><button className="btn btn-light" onClick={copy}><i className="bi bi-copy" /> Sao chép xác nhận</button></div>
      </>}
      {tab === 'Sản phẩm' && <><div className="d-flex justify-content-between align-items-center mb-3"><h3 className="workflow-heading mb-0">Sản phẩm của booking</h3>{active && <button className="btn-primary-custom" onClick={() => open('products')}>Thêm sản phẩm</button>}</div><BookingProducts b={b} /></>}
      {tab === 'Chi phí & thanh toán' && <>
        <div className="table-responsive"><table className="table"><thead><tr><th>Nội dung</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{b.orderDetails.filter(i => i.fulfillment !== 'cancelled').map((i, n) => <tr key={n}><td>{i.name}<small className="d-block text-muted">{isProduct(i) ? 'Sản phẩm' : i.phase === 'stay' ? 'Điều chỉnh tiền phòng' : 'Tiền phòng'}</small></td><td>{i.quantity}</td><td>{money(i.price)}</td><td>{money(i.price * i.quantity)}</td></tr>)}</tbody></table></div>
        {b.voucherDiscount > 0 && <p>Voucher: {b.voucher ? `${b.voucher.name} (${b.voucher.code}) · ${b.voucher.scope === 'ROOM_ONLY' ? 'Tiền phòng' : 'Booking ban đầu'}` : 'Ưu đãi đã ghi nhận'} · −{money(b.voucherDiscount)}</p>}
        {b.status === 3 && <p>Booking đã hủy. Khoản giữ lại: {money(folioTotal(b))} · Cần hoàn: {money(refund)}.</p>}
        <h3 className="workflow-heading mt-4">Giao dịch thu / hoàn</h3>{b.payments.length ? b.payments.map(p => <div className="booking-payment-row" key={p.id}><span>{fmtDateTime(p.createdAt)}<small className="d-block">{methodLabel[p.method]} · {p.collector}</small></span><strong className={p.amount < 0 ? 'text-warning' : ''}>{p.amount < 0 ? 'Hoàn ' : 'Thu '}{money(Math.abs(p.amount))}</strong></div>) : <p className="text-muted">Chưa có giao dịch. Booking trả sau sẽ thu khi quyết toán.</p>}
      </>}
      {tab === 'Khách lưu trú' && <><p className="text-muted">Bổ sung khách thực tế khi nhận phòng. Hồ sơ trong bản demo được lưu tại trình duyệt.</p>{guests.map((g, i) => <div className="row g-3 mb-3" key={i}><div className="col-sm-5"><label className="form-label" htmlFor={`guestName${i}`}>Tên khách {i + 1}</label><input id={`guestName${i}`} className="form-control" value={g.name} onChange={e => setGuests(rows => rows.map((r, n) => n === i ? { ...r, name: e.target.value } : r))} /></div><div className="col-sm-5"><label className="form-label" htmlFor={`guestDoc${i}`}>Giấy tờ</label><input id={`guestDoc${i}`} className="form-control" value={g.document} onChange={e => setGuests(rows => rows.map((r, n) => n === i ? { ...r, document: e.target.value } : r))} /></div><div className="col-sm-2 d-flex align-items-end"><button className="btn btn-light" onClick={() => setGuests(rows => rows.filter((_, n) => n !== i))}>Xóa</button></div></div>)}<div className="booking-detail-actions"><button className="btn btn-light" onClick={() => setGuests(rows => [...rows, { name: '', document: '' }])}>Thêm khách</button><button className="btn-primary-custom" onClick={() => { if (guests.some(g => !g.name.trim())) { toast('Nhập tên các khách trước khi lưu.'); return; } act.saveGuests(b.code, guests); toast('Đã lưu khách lưu trú.'); }}>Lưu hồ sơ</button></div></>}
      {tab === 'Lịch sử' && <ol className="booking-history">{[...b.events].sort((a, c) => Date.parse(c.at) - Date.parse(a.at)).map((e, i) => <li key={i}><small>{fmtDateTime(e.at)}</small><p>{e.text}</p></li>)}</ol>}
    </div>
    {task && <BookingTask key={`${b.code}-${task}`} task={task} b={b} onClose={() => { setTask(null); clearInitialCheckin(); }} />}
  </section>;
}

function BookingTask({ task, b, onClose }: { task: Task; b: Folio; onClose: () => void }) {
  const { data, toast } = useStore();
  const act = useBookingActions();
  const { collect } = useFolioDialogs();
  const [room, setRoom] = useState(b.room);
  const [start, setStart] = useState(localDateTime(new Date(b.effectiveCheckInTime)));
  const [end, setEnd] = useState(localDateTime(new Date(task === 'extend' ? Date.parse(checkoutAt(b)) + 3600000 : checkoutAt(b))));
  const [reason, setReason] = useState('');
  const [products, setProducts] = useState<ProductSelection[]>([]);
  const [refundAmount, setRefundAmount] = useState('0');
  const [method, setMethod] = useState<PayMethod>('cash');
  const [error, setError] = useState('');
  const submitted = useRef(false);
  const [checkinAt] = useState(() => new Date());
  const title: Record<Task, string> = { checkin: 'Nhận phòng', edit: 'Sửa lịch', move: 'Đổi phòng', extend: 'Gia hạn', checkout: 'Trả phòng', cancel: 'Hủy booking', 'no-show': 'Xác nhận không đến', refund: 'Hoàn tiền', products: 'Thêm sản phẩm' };
  const scheduling = ['edit', 'move', 'extend'].includes(task);
  const schedule = checkinSchedule(data, b, checkinAt);
  const nextStart = schedule.start, nextEnd = schedule.end;
  const check = checkRoomInterval(data, data.rooms.find(r => r.branchId === b.branchId && r.number === b.room), nextStart, nextEnd, b.stayType, b.code, true, false);
  const proposedPrice = scheduling ? roomChangePrice(data, b, room, new Date(start), new Date(end)) : null;
  const currentRoomPrice = b.orderDetails.filter(i => i.productType === 6 && i.fulfillment !== 'cancelled').reduce((s, i) => s + i.price * i.quantity, 0);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted.current) return;
    let result: string | null = null;
    if (task === 'checkin') result = act.checkin(b.code, nextStart.toISOString(), nextEnd.toISOString());
    else if (scheduling) result = act.reschedule(b.code, room, new Date(start).toISOString(), new Date(end).toISOString(), reason, task === 'extend');
    else if (task === 'checkout') result = act.checkout(b.code);
    else if (task === 'cancel' || task === 'no-show') result = act.cancel(b.code, reason, Number(refundAmount), task === 'no-show');
    else if (task === 'refund') result = act.refund(b.code, method, reason);
    else if (task === 'products') result = act.addProducts(b.code, products);
    if (result) { setError(result); return; }
    submitted.current = true;
    toast(`Đã xử lý: ${title[task].toLowerCase()}.`); onClose();
  };
  return <Modal open title={`${title[task]} · ${b.code}`} onClose={onClose} size="lg" footer={<><button className="btn btn-light" onClick={onClose}>Đóng</button><button className={task === 'cancel' || task === 'no-show' ? 'btn btn-danger' : 'btn-primary-custom'} type="submit" form="bookingTask">{task === 'checkin' ? 'Xác nhận nhận phòng' : task === 'checkout' ? 'Hoàn tất trả phòng' : title[task]}</button></>}>
    <form id="bookingTask" onSubmit={submit}>
      {task === 'checkin' && <><p>Khách: <strong>{b.customer}</strong> · Phòng {b.room}</p><p>Lịch hiệu lực: {fmtDateTime(nextStart.toISOString())} → {fmtDateTime(nextEnd.toISOString())}</p><div className="alert alert-info">{schedule.message}</div>{check !== true && <div className="alert alert-warning mt-3">{check}</div>}<p className="small text-muted mt-3">{b.stayType === 'Theo giờ' ? 'Giữ lịch đã xác nhận hoặc dời cả khung giờ nếu không xung đột. Lịch ban đầu luôn được giữ trong lịch sử.' : 'Giữ giờ nhận/trả theo gói ngày/đêm. Quyền phòng chỉ có hiệu lực theo lịch.'} Kiểm tra hồ sơ khách trong tab Khách lưu trú trước khi xác nhận. Cấp quyền phòng là mô phỏng.</p>{paymentTiming(b) === 'prepaid' && folioDue(b) > 0 && <div className="alert alert-warning">Cần thu đủ {money(folioDue(b))} trước khi nhận phòng.</div>}</>}
      {scheduling && <><p>Lịch hiện tại: phòng {b.room} · {fmtDateTime(b.effectiveCheckInTime)} → {fmtDateTime(checkoutAt(b))}</p>{task === 'move' && <><label className="form-label" htmlFor="newRoom">Phòng mới</label><select id="newRoom" className="form-select mb-3" value={room} onChange={e => setRoom(e.target.value)}>{data.rooms.filter(r => r.branchId === b.branchId).map(r => <option key={r.number} value={r.number}>{r.number} · {className(data, r)}</option>)}</select></>}<div className="row g-3"><div className="col-sm-6"><label className="form-label" htmlFor="newStart">Nhận phòng</label><input id="newStart" type="datetime-local" className="form-control" required value={start} readOnly={task !== 'edit'} onChange={e => setStart(e.target.value)} /></div><div className="col-sm-6"><label className="form-label" htmlFor="newEnd">Trả phòng</label><input id="newEnd" type="datetime-local" className="form-control" required value={end} readOnly={task === 'move'} onChange={e => setEnd(e.target.value)} /></div></div><div className="alert alert-light mt-3">Tiền phòng mới: <strong>{proposedPrice == null ? 'Chưa có giá phù hợp' : money(proposedPrice)}</strong>{proposedPrice != null && <> · Chênh lệch {money(proposedPrice - currentRoomPrice)}</>}. Các khoản đã phát sinh được giữ nguyên.</div><p className="small text-muted">Lịch mới phải chừa {data.rules.cleaningBuffer} phút dọn trước lượt tiếp theo. Gia hạn theo giờ giới hạn {data.rules.maxHourlyStay} tiếng theo cấu hình.</p></>}
      {task === 'checkout' && <><p>Giờ trả thực tế: {fmtDateTime(new Date().toISOString())}</p><p>Tổng {money(folioTotal(b))} · Đã thu {money(folioPaid(b))} · Còn thu {money(folioDue(b))}</p>{folioDue(b) > 0 && <button type="button" className="btn btn-outline-success mb-3" onClick={() => { onClose(); collect(b); }}>Thu đủ tiền trước khi chốt</button>}{refundable(b) > 0 && <p className="text-warning">Cần hoàn {money(refundable(b))} trước khi chốt.</p>}<p>Hoàn tất trả phòng sẽ đưa phòng sang Chờ dọn. Chưa bán phòng cho khách mới cho đến khi dọn xong.</p></>}
      {(task === 'cancel' || task === 'no-show') && <><div className="alert alert-warning">Giải phóng lịch và hủy sản phẩm chưa giao. Tiền đã thu {money(folioPaid(b))} được giữ trong lịch sử. Chọn số được hoàn theo chính sách hủy; hệ thống không tự mặc định hoàn toàn bộ.</div>{folioPaid(b) > 0 && <><label className="form-label" htmlFor="cancelRefund">Số tiền được duyệt hoàn (₫)</label><input id="cancelRefund" className="form-control mb-3" type="number" min={0} max={folioPaid(b)} step={1} required value={refundAmount} onChange={e => setRefundAmount(e.target.value)} /><p>Giữ lại: {money(Math.max(0, folioPaid(b) - Number(refundAmount)))}</p></>}</>}
      {task === 'refund' && <><p>Hoàn đủ số cần hoàn: <strong>{money(refundable(b))}</strong></p><label className="form-label" htmlFor="refundMethod">Phương thức đã hoàn</label><select id="refundMethod" className="form-select mb-3" value={method} onChange={e => setMethod(e.target.value as PayMethod)}><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option><option value="card">Thẻ</option></select><p className="small text-muted">Chỉ ghi nhận sau khi đã hoàn tiền thực tế. Thao tác demo không gửi lệnh ra ngân hàng.</p></>}
      {task === 'products' && <ProductPicker branchId={b.branchId} value={products} onChange={setProducts} />}
      {task !== 'checkin' && task !== 'checkout' && task !== 'products' && <><label className="form-label" htmlFor="changeReason">Lý do *</label><textarea id="changeReason" className="form-control" required rows={2} value={reason} onChange={e => setReason(e.target.value)} /></>}
      {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
    </form>
  </Modal>;
}
