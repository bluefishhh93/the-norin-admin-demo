import { useEffect, useMemo, useState } from 'react';
import type { Booking, Room, StayType } from '../../types';
import { useStore } from '../../store';
import { useBooking } from '../../booking/context';
import { branchName } from '../../lib/format';
import { className, roomKey, stayWindow } from '../../lib/rooms';
import { buildCells, dateKey, hourlyColumns, MAX_HOURLY_SLOTS, MIN_HOURLY_SLOTS, monthColumns, SLOT_MS, type Cell } from './timeline';
import { BookingDetailModal } from './BookingDetailModal';

interface Selection { room: Room; from: number; to: number }

const fmtTime = (ms: number) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ms);

export function RoomTimeline({ rooms }: { rooms: Room[] }) {
  const { data, toast } = useStore();
  const { openBooking } = useBooking();
  const [stay, setStay] = useState<StayType>('Theo giờ');
  const [day, setDay] = useState(() => dateKey(new Date()));
  const [month, setMonth] = useState(() => dateKey(new Date()).slice(0, 7));
  const [sel, setSel] = useState<Selection | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);
  const hourly = stay === 'Theo giờ';

  useEffect(() => setSel(null), [stay, day, month, data.branchId]);

  const cols = useMemo(() => hourly ? hourlyColumns(day) : monthColumns(data, month, stay as Exclude<StayType, 'Theo giờ'>), [hourly, day, month, stay, data]);
  const rows = useMemo(() => {
    const now = Date.now();
    return rooms.map(room => ({ room, cells: buildCells(data, room, cols, now) }));
  }, [rooms, cols, data]);

  const cellsOf = (room: Room) => rows.find(r => roomKey(r.room) === roomKey(room))?.cells ?? [];
  const allOpen = (cells: Cell[], from: number, to: number) => from >= 0 && to < cells.length && cells.slice(from, to + 1).every(c => c.kind === 'open');

  const pick = (room: Room, index: number) => {
    const cells = cellsOf(room);
    const same = sel && roomKey(sel.room) === roomKey(room);
    if (hourly) {
      if (!same) {
        if (!allOpen(cells, index, index + MIN_HOURLY_SLOTS - 1)) { toast('Theo giờ tối thiểu 2 tiếng; khoảng sau ô này không đủ trống (tính cả 30 phút dọn).'); return; }
        setSel({ room, from: index, to: index + MIN_HOURLY_SLOTS - 1 });
        return;
      }
      const { from, to } = sel!;
      if (index >= from && index <= to) {
        const next = index - from < to - index ? { from: from + 2, to } : { from, to: to - 2 };
        setSel(next.to - next.from + 1 < MIN_HOURLY_SLOTS ? null : { room, ...next });
        return;
      }
      let nf = Math.min(from, index), nt = Math.max(to, index);
      if ((nt - nf + 1) % 2) { if (index < from) nf -= 1; else nt += 1; }
      if (nt - nf + 1 > MAX_HOURLY_SLOTS) { toast('Theo giờ tối đa 8 tiếng.'); return; }
      if (!allOpen(cells, nf, nt)) { toast('Khoảng chọn bị chặn bởi booking hoặc 30 phút dọn phòng.'); return; }
      setSel({ room, from: nf, to: nt });
      return;
    }
    if (stay === 'Qua đêm' || !same) { setSel(same && sel!.from === index && sel!.to === index ? null : { room, from: index, to: index }); return; }
    const { from, to } = sel!;
    if (index >= from && index <= to) {
      const next = index === from ? { from: from + 1, to } : { from, to: index - 1 };
      setSel(next.from > next.to ? null : { room, ...next });
      return;
    }
    const nf = Math.min(from, index), nt = Math.max(to, index);
    if (!allOpen(cells, nf, nt)) { toast('Các ngày ở giữa đã có booking, không thể chọn liền.'); return; }
    setSel({ room, from: nf, to: nt });
  };

  const range = useMemo(() => {
    if (!sel) return null;
    if (hourly) return [cols[sel.from].start, cols[sel.to].start + SLOT_MS] as const;
    const [s, e] = stayWindow(data, stay as Exclude<StayType, 'Theo giờ'>, cols[sel.from].key, sel.to - sel.from + 1);
    return [s.getTime(), e.getTime()] as const;
  }, [sel, hourly, cols, data, stay]);

  const confirm = () => {
    if (!sel || !range) return;
    openBooking({ branchId: sel.room.branchId, room: sel.room.number, type: stay, start: new Date(range[0]), end: new Date(range[1]), locked: true });
    setSel(null);
  };

  const unit = hourly ? `${((sel ? sel.to - sel.from + 1 : 0) / 2)} giờ` : stay === 'Qua đêm' ? '1 đêm' : `${sel ? sel.to - sel.from + 1 : 0} ngày`;
  const shiftMonth = (n: number) => { const [y, m] = month.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); setMonth(dateKey(d).slice(0, 7)); };
  const s = data.timeSetting;

  return (
    <>
      <div className="reception-grid-controls">
        <div className="timeline-controls-left">
          <label>Loại lưu trú
            <select className="form-select" value={stay} onChange={e => setStay(e.target.value as StayType)}>
              <option>Theo giờ</option><option>Qua đêm</option><option>Theo ngày</option>
            </select>
          </label>
          {hourly
            ? <label>Ngày xem <input className="form-control" type="date" value={day} onChange={e => setDay(e.target.value)} /></label>
            : <div className="timeline-month">
                <button type="button" aria-label="Tháng trước" onClick={() => shiftMonth(-1)}><i className="bi bi-chevron-left" /></button>
                <input className="form-control" type="month" value={month} onChange={e => e.target.value && setMonth(e.target.value)} />
                <button type="button" aria-label="Tháng sau" onClick={() => shiftMonth(1)}><i className="bi bi-chevron-right" /></button>
              </div>}
        </div>
        <span>
          {hourly ? 'Bấm ô trống để chọn từ 2 đến 8 tiếng · hai đầu mỗi booking có 30 phút dọn phòng'
            : stay === 'Qua đêm' ? `Qua đêm ${s.nightCheckIn} → ${s.nightCheckOut} hôm sau · chọn 1 đêm`
            : `Theo ngày ${s.dayCheckIn} → ${s.dayCheckOut} hôm sau · bấm thêm ngày để chọn nhiều ngày liền`}
        </span>
      </div>
      <div className="timeline-legend">
        <span><i className="lg-open" />Trống</span><span><i className="lg-booked" />Đã đặt</span>
        <span><i className="lg-cleaning" />Dọn phòng 30'</span><span><i className="lg-selected" />Đang chọn</span><span><i className="lg-past" />Đã qua / khóa bán</span>
      </div>
      <div className={`reception-timeline ${hourly ? 'is-hourly' : 'is-calendar'}`}>
        <div className="timeline-head" style={{ gridTemplateColumns: `180px repeat(${cols.length}, var(--tl-col))` }}>
          <div>CHI NHÁNH / PHÒNG</div>
          {cols.map(c => <div key={c.key}><span>{c.label}</span>{c.sub && <small>{c.sub}</small>}</div>)}
        </div>
        {rows.map(({ room, cells }) => (
          <div className="timeline-row" key={roomKey(room)} style={{ gridTemplateColumns: `180px repeat(${cols.length}, var(--tl-col))` }}>
            <div className="timeline-room"><strong>{branchName(room.branchId)} · {room.number}</strong><small>{room.name || className(data, room)}</small></div>
            {cells.map((c, i) => {
              if ((c.kind === 'booked' || c.kind === 'cleaning') && !c.head) return null;
              const style = c.span && c.span > 1 ? { gridColumn: `span ${c.span}` } : undefined;
              if (c.kind === 'booked' && c.booking) {
                return (
                  <button key={c.key} type="button" className="timeline-slot booked" style={style} onClick={() => setDetail(c.booking!)}
                    title={`${c.booking.id} · ${c.booking.customer}`}>
                    <strong>{c.booking.id}</strong><span>{c.booking.customer}</span>
                  </button>
                );
              }
              if (c.kind === 'cleaning') {
                return <button key={c.key} type="button" className="timeline-slot cleaning" style={style} disabled title="30 phút dọn phòng"><span>Dọn</span></button>;
              }
              const selected = !!sel && roomKey(sel.room) === roomKey(room) && i >= sel.from && i <= sel.to;
              const open = c.kind === 'open';
              return (
                <button key={c.key} type="button" className={`timeline-slot ${c.kind} ${selected ? 'selected' : ''}`} disabled={!open}
                  onClick={open ? () => pick(room, i) : undefined} title={`${room.number} · ${fmtTime(c.start)}`} />
              );
            })}
          </div>
        ))}
      </div>
      {sel && range && (
        <div className="timeline-confirm">
          <div>
            <strong>{branchName(sel.room.branchId)} · Phòng {sel.room.number}</strong>
            <span>{stay} · {unit} · {fmtTime(range[0])} → {fmtTime(range[1])}</span>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-light" onClick={() => setSel(null)}>Bỏ chọn</button>
            <button type="button" className="btn-primary-custom" onClick={confirm}>Xác nhận <i className="bi bi-arrow-right" /></button>
          </div>
        </div>
      )}
      <BookingDetailModal booking={detail} onClose={() => setDetail(null)}
        onDetail={b => { setDetail(null); toast(`Trang chi tiết booking ${b.id} sẽ làm ở bước sau.`); }} />
    </>
  );
}
