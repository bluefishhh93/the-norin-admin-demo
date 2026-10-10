import { useEffect, useState } from 'react';
import { branchName, fmtDateTime, includesVi, maskPhone, money } from '../../lib/format';
import { checkoutAt, folioDue, folioPaid, folioTotal, isActive } from '../../lib/folio';
import { scoped } from '../../lib/scope';
import { DataTable, Panel, Tabs } from '../../components/ui';
import { useStore } from '../../store';
import { useBooking } from '../../booking/context';
import { BookingDetail } from '../../booking/BookingDetail';
import { paymentTiming, refundable, statusLabel } from '../../booking/model';
import { RoomTimeline } from '../rooms/RoomTimeline';
import '../../booking/booking.css';

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const quickTabs = ['Tất cả', 'Sắp đến', 'Đang ở', 'Sắp trả', 'Đã kết thúc'];

export function BookingLookup() {
  const { data } = useStore();
  const { openDetail, detailCode, closeDetail } = useBooking();
  const [view, setView] = useState('Danh sách');
  const [quick, setQuick] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState(dayKey(new Date()));
  const [to, setTo] = useState(dayKey(new Date()));
  const [allTime, setAllTime] = useState(false);
  const [dateType, setDateType] = useState('stay');
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [type, setType] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const folios = scoped(data, data.folios);
  const selected = folios.find(b => b.code === detailCode);
  useEffect(() => { setPage(1); }, [search, from, to, allTime, dateType, status, payment, type, source, quick, data.branchId]);
  const start = Date.parse(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`); end.setDate(end.getDate() + 1);
  const filtered = folios.filter(b => {
    if (!includesVi(`${b.code} ${b.phone.replace(/\D/g, '')} ${b.phone} ${b.room} ${b.customer}`, search)) return false;
    if (status && statusLabel(b) !== status) return false;
    if (payment === 'prepaid' || payment === 'postpaid') { if (paymentTiming(b) !== payment) return false; }
    if (payment === 'due' && (b.status === 3 || !folioDue(b))) return false;
    if (payment === 'paid' && (b.status === 3 || folioPaid(b) < folioTotal(b))) return false;
    if (payment === 'refund' && !refundable(b)) return false;
    if (type && b.stayType !== type) return false;
    if (source && b.source !== source) return false;
    if (allTime) return true;
    const s = Date.parse(b.effectiveCheckInTime), e = Date.parse(checkoutAt(b));
    if (dateType === 'in') return s >= start && s < +end;
    if (dateType === 'out') return e >= start && e < +end;
    if (dateType === 'created') { const created = Math.min(...b.events.map(e => Date.parse(e.at))); return created >= start && created < +end; }
    return s < +end && (e > start || (b.detailStatus === 2 && isActive(b)));
  });
  const matchQuick = (b: typeof folios[number], tab: string) => tab === 'Tất cả' ? true : tab === 'Sắp đến' ? isActive(b) && b.detailStatus === 1 : tab === 'Đang ở' ? isActive(b) && b.detailStatus === 2 : tab === 'Sắp trả' ? isActive(b) && b.detailStatus === 2 && Date.parse(checkoutAt(b)) <= Date.now() + 2 * 3600000 : !isActive(b) || b.status === 2;
  const list = filtered.filter(b => matchQuick(b, quick)).sort((a, b) => Date.parse(quick === 'Sắp trả' ? checkoutAt(a) : a.effectiveCheckInTime) - Date.parse(quick === 'Sắp trả' ? checkoutAt(b) : b.effectiveCheckInTime));
  const count = Math.max(1, Math.ceil(list.length / 15));
  const current = Math.min(page, count);
  const clear = () => { setSearch(''); setStatus(''); setPayment(''); setType(''); setSource(''); setFrom(dayKey(new Date())); setTo(dayKey(new Date())); setAllTime(false); setDateType('stay'); setQuick('Tất cả'); };
  if (selected) return <BookingDetail key={selected.code} b={selected} />;
  if (detailCode && !selected) return <Panel><p>Booking không thuộc chi nhánh đang xem hoặc không còn tồn tại.</p><button className="btn btn-light" onClick={closeDetail}>Quay lại danh sách</button></Panel>;
  return <>
    <Tabs items={['Danh sách', 'Lịch phòng']} value={view} onChange={setView} />
    {view === 'Lịch phòng' ? <RoomTimeline rooms={scoped(data, data.rooms)} /> : <>
      <div className="panel booking-filters mt-3">
        <div className="booking-filter-search"><label htmlFor="bookingSearch">Tìm booking</label><input id="bookingSearch" className="form-control" placeholder="Mã, khách, số điện thoại, số phòng..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <label>Ngày theo<select className="form-select" value={dateType} onChange={e => setDateType(e.target.value)}><option value="stay">Thời gian lưu trú</option><option value="in">Nhận phòng</option><option value="out">Trả phòng</option><option value="created">Ngày tạo</option></select></label>
        <label>Từ ngày<input className="form-control" type="date" disabled={allTime} value={from} onChange={e => setFrom(e.target.value)} /></label><label>Đến ngày<input className="form-control" type="date" disabled={allTime} min={from} value={to} onChange={e => setTo(e.target.value)} /></label>
        <label>Trạng thái<select className="form-select" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option>{['Đã xác nhận', 'Chờ xác nhận', 'Đang ở', 'Đã trả phòng', 'Đã hủy', 'Không đến'].map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Thanh toán<select className="form-select" value={payment} onChange={e => setPayment(e.target.value)}><option value="">Tất cả</option><option value="prepaid">Trả trước</option><option value="postpaid">Trả sau</option><option value="due">Còn phải thu</option><option value="paid">Đã thu đủ</option><option value="refund">Cần hoàn</option></select></label>
        <details className="booking-more-filters"><summary>Bộ lọc khác</summary><div className="d-flex gap-3 mt-2 flex-wrap"><label>Loại lưu trú<select className="form-select" value={type} onChange={e => setType(e.target.value)}><option value="">Tất cả</option><option>Theo giờ</option><option>Qua đêm</option><option>Theo ngày</option></select></label><label>Nguồn<select className="form-select" value={source} onChange={e => setSource(e.target.value)}><option value="">Tất cả</option>{[...new Set(folios.map(b => b.source))].map(s => <option key={s}>{s}</option>)}</select></label></div></details>
        <div className="booking-filter-footer"><label className="form-check"><input type="checkbox" className="form-check-input" checked={allTime} onChange={e => setAllTime(e.target.checked)} /> Tìm trong toàn bộ thời gian</label><button className="btn btn-light btn-sm" onClick={clear}>Xóa bộ lọc</button></div>
      </div>
      <div className="booking-quick-tabs">{quickTabs.map(q => <button key={q} className={quick === q ? 'active' : ''} onClick={() => setQuick(q)}>{q === 'Sắp trả' ? 'Sắp trả / quá giờ (2h)' : q} <span>{filtered.filter(b => matchQuick(b, q)).length}</span></button>)}</div>
      <Panel><DataTable headers={['BOOKING', 'KHÁCH', 'PHÒNG', 'LƯU TRÚ', 'TRẠNG THÁI', 'THANH TOÁN', 'THAO TÁC']}>
        {list.slice((current - 1) * 15, current * 15).map(b => <tr key={b.code}><td><button className="booking-code" onClick={() => openDetail(b.code)}>{b.code}</button><small>{b.source}</small></td><td>{b.customer}<small>{data.role === 'superadmin' ? b.phone || 'Chưa có SĐT' : maskPhone(b.phone)}</small></td><td><strong>{b.room}</strong>{data.branchId === 'all' && <small>{branchName(b.branchId)}</small>}</td><td>{b.stayType}<small>{fmtDateTime(b.effectiveCheckInTime)}<br />→ {fmtDateTime(checkoutAt(b))}</small></td><td><span className="booking-state">{statusLabel(b)}</span>{isActive(b) && b.detailStatus === 2 && Date.parse(checkoutAt(b)) < Date.now() && <small className="text-danger">Quá giờ trả</small>}{isActive(b) && b.detailStatus === 1 && Date.parse(b.effectiveCheckInTime) < Date.now() && <small className="text-warning">Trễ giờ nhận</small>}{b.checkoutRequestedAt && isActive(b) && <small className="text-warning">Yêu cầu trả phòng</small>}</td><td>{money(folioTotal(b))}<small>{paymentTiming(b) === 'prepaid' ? 'Trả trước' : 'Trả sau'}</small><small className={refundable(b) ? 'text-warning' : folioDue(b) && b.status !== 3 ? 'text-danger' : 'text-success'}>{refundable(b) ? `Cần hoàn ${money(refundable(b))}` : b.status === 3 ? 'Đã kết thúc' : folioDue(b) ? `Còn thu ${money(folioDue(b))}` : 'Đã thu đủ'}</small></td><td><button className="btn btn-light btn-sm" onClick={() => openDetail(b.code)}>Chi tiết</button></td></tr>)}
      </DataTable>{!list.length && <div className="booking-empty"><i className="bi bi-calendar2-check" /><p>Không có booking phù hợp bộ lọc.</p><button className="btn btn-light" onClick={clear}>Xem booking hôm nay</button>{!allTime && <button className="btn btn-link" onClick={() => setAllTime(true)}>Tìm trong toàn bộ thời gian</button>}</div>}</Panel>
      <div className="booking-pagination"><span>{list.length} booking · {allTime ? 'Toàn bộ thời gian' : `${from} → ${to}`}</span><div><button className="btn btn-light btn-sm" disabled={current === 1} onClick={() => setPage(current - 1)}>Trước</button><span className="mx-3">{current} / {count}</span><button className="btn btn-light btn-sm" disabled={current === count} onClick={() => setPage(current + 1)}>Sau</button></div></div>
    </>}
  </>;
}
