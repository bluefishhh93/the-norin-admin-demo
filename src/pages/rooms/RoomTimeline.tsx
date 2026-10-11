import { useEffect, useMemo, useRef, useState } from 'react';
import type { Room, StayType } from '../../types';
import { useStore } from '../../store';
import { useBooking } from '../../booking/context';
import { fmtDateTime, moneyComma } from '../../lib/format';
import { scoped } from '../../lib/scope';
import { bookingInterval, className, getRoomPrice, roomKey } from '../../lib/rooms';
import {
  bookingState,
  buildCells,
  clockOf,
  dateKey,
  hourlyColumns,
  stayColumns,
  VIEW_STAY,
  type TimelineView
} from './timeline';
import {
  blockedIn,
  nextHourRange,
  nextSelection,
  slotColumns,
  type HourRange,
  type Selection
} from './selection';
import './booking-rooms.css';

const VIEW_LABELS: Record<TimelineView, string> = { hour: 'Giờ', night: 'Đêm', day: 'Ngày' };
const dateTime = (ms: number) => fmtDateTime(new Date(ms).toISOString());
const STAY_META: Record<StayType, { key: string; label: string; icon: string }> = {
  'Theo giờ': { key: 'hour', label: 'Giờ', icon: 'bi-clock' },
  'Qua đêm': { key: 'night', label: 'Qua đêm', icon: 'bi-moon-stars' },
  'Theo ngày': { key: 'day', label: 'Theo ngày', icon: 'bi-sun' }
};
const stamp = (ms: number, ref: number) => {
  const d = new Date(ms);
  return dateKey(d) === dateKey(new Date(ref))
    ? clockOf(ms)
    : `${clockOf(ms)} ${d.getDate()}/${d.getMonth() + 1}`;
};
export function RoomTimeline({ rooms }: { rooms: Room[] }) {
  const { data, toast } = useStore();
  const { openBooking, openDetail } = useBooking();
  const [view, setView] = useState<TimelineView>('hour');
  const [day, setDay] = useState(() => dateKey(new Date()));
  const [stay, setStay] = useState<Selection | null>(null);
  const [hourSel, setHourSel] = useState<HourRange | null>(null);
  const hourly = view === 'hour';
  const branchRooms = scoped(data, rooms);
  const [category, setCategory] = useState('all');
  const [now, setNow] = useState(Date.now);
  const scroll = useRef<HTMLDivElement>(null);
  const categories = [...new Set(branchRooms.map((room) => room.classId))];
  const classOrder = (id: string) => {
    const i = data.classes.findIndex((c) => c.id === id);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  const visibleRooms = branchRooms
    .filter((room) => category === 'all' || room.classId === category)
    .sort(
      (a, b) =>
        a.branchId.localeCompare(b.branchId) ||
        classOrder(a.classId) - classOrder(b.classId) ||
        a.number.localeCompare(b.number, undefined, { numeric: true })
    );
  const cols = useMemo(
    () =>
      view === 'hour'
        ? hourlyColumns(day)
        : stayColumns(data, day, view === 'night' ? 'Qua đêm' : 'Theo ngày'),
    [view, day, data]
  );
  const colWidth = hourly ? 68 : 124;
  const labelWidth = 180;
  const width = labelWidth + cols.length * colWidth;
  const gridStyle = {
    gridTemplateColumns: `${labelWidth}px repeat(${cols.length}, ${colWidth}px)`
  };
  const today = dateKey(new Date(now));
  const nowPosition =
    labelWidth +
    ((now - cols[0].start) / (cols[cols.length - 1].end - cols[0].start)) * cols.length * colWidth;
  const rowCells = useMemo(
    () =>
      new Map(
        visibleRooms.map((room) => [
          roomKey(room),
          buildCells(data, room, cols, now, hourly ? 'end' : 'start', hourly)
        ])
      ),
    [visibleRooms, data, cols, now, hourly]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setStay(null);
  }, [view, day, category]);
  useEffect(() => {
    setHourSel(null);
  }, [view, category]);
  useEffect(() => {
    if (!scroll.current) return;
    const todayIndex = cols.findIndex((c) => c.key === today || c.key.startsWith(`${today}-`));
    scroll.current.scrollLeft = hourly
      ? day === today
        ? Math.max(0, ((Date.now() - cols[0].start) / 1800000) * colWidth - colWidth * 2)
        : 0
      : Math.max(0, (todayIndex - 1) * colWidth);
  }, [view, day, cols, colWidth, hourly, today]);
  const shift = (amount: number) => {
    const date = new Date(`${day}T00:00:00`);
    if (hourly) date.setDate(date.getDate() + amount);
    else {
      date.setDate(1);
      date.setMonth(date.getMonth() + amount);
    }
    setDay(dateKey(date));
  };

  const selection = hourly
    ? hourSel && {
        roomKey: hourSel.roomKey,
        from: cols.findIndex((c) => c.end > hourSel.start),
        to: cols.filter((c) => c.start < hourSel.end).length - 1
      }
    : stay;
  const visible =
    !!selection &&
    selection.from >= 0 &&
    selection.to >= selection.from &&
    (!hourSel || (hourSel.start < cols[cols.length - 1].end && hourSel.end > cols[0].start));
  const selectedRoom = selection
    ? visibleRooms.find((room) => roomKey(room) === selection.roomKey)
    : undefined;
  const range = hourly
    ? hourSel && { start: hourSel.start, end: hourSel.end }
    : stay && { start: cols[stay.from].start, end: cols[stay.to].end };
  const hours = range ? (range.end - range.start) / 3600000 : 0;
  const units = hourly ? hours : stay ? stay.to - stay.from + 1 : 0;
  const unitLabel = hourly ? 'giờ' : view === 'night' ? 'đêm' : 'ngày';
  const maxHours = data.rules.maxHourlyStay;
  const hourCheck = (room: Room) => (from: number, to: number) =>
    blockedIn(buildCells(data, room, slotColumns(from, to), now), 0, (to - from) / 1800000 - 1);
  const price =
    selectedRoom && range
      ? getRoomPrice(
          data,
          selectedRoom.branchId,
          selectedRoom.number,
          VIEW_STAY[view],
          new Date(range.start),
          new Date(range.end)
        )
      : null;
  const canShrink = !!range && (hourly ? units > 2 : view === 'day' && units > 1);
  const canGrow = !!range && (hourly ? units < maxHours : view === 'day');
  const clear = () => (hourly ? setHourSel(null) : setStay(null));

  const choose = (room: Room, index: number) => {
    const key = roomKey(room);
    const result = hourly
      ? nextHourRange(hourSel, key, cols[index].start, hourCheck(room), maxHours)
      : nextSelection(view, stay, key, index, rowCells.get(key) || [], 1, 1);
    if (typeof result === 'string') toast(result);
    else if ('anchor' in result) setStay(result);
    else setHourSel(result);
  };

  const step = (delta: number) => {
    if (hourly) {
      if (!hourSel || !selectedRoom) return;
      const end = hourSel.end + delta * 3600000;
      const blocked = delta > 0 && hourCheck(selectedRoom)(hourSel.start, end);
      if (blocked) toast(blocked);
      else setHourSel({ ...hourSel, end });
      return;
    }
    if (!stay) return;
    const to = stay.to + delta;
    const blocked = blockedIn(rowCells.get(stay.roomKey) || [], stay.from, to);
    if (delta > 0 && blocked) toast(blocked);
    else setStay({ ...stay, to });
  };

  const confirm = () => {
    if (!selectedRoom || !range) return;
    const start = hourly ? Math.max(range.start, Date.now()) : range.start;
    openBooking({
      branchId: selectedRoom.branchId,
      room: selectedRoom.number,
      type: VIEW_STAY[view],
      start: new Date(start),
      end: new Date(hourly ? start + hours * 3600000 : range.end)
    });
    clear();
  };

  return (
    <div className="booking-room-timeline">
      <div className="booking-timeline-toolbar">
        <div className="booking-timeline-views" aria-label="Loại lưu trú">
          {(['hour', 'night', 'day'] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={view === value}
              className={view === value ? 'active' : ''}
              onClick={() => setView(value)}
            >
              {VIEW_LABELS[value]}
            </button>
          ))}
        </div>
        <div className="booking-timeline-date">
          <button
            type="button"
            className="btn btn-light"
            aria-label={hourly ? 'Ngày trước' : 'Tháng trước'}
            onClick={() => shift(-1)}
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <label className={hourly ? undefined : 'booking-timeline-month'}>
            <span className="visually-hidden">{hourly ? 'Ngày đang xem' : 'Tháng đang xem'}</span>
            <input
              className="form-control"
              type={hourly ? 'date' : 'month'}
              value={hourly ? day : day.slice(0, 7)}
              onClick={(e) => !hourly && e.currentTarget.showPicker?.()}
              onChange={(e) =>
                e.target.value && setDay(hourly ? e.target.value : `${e.target.value}-01`)
              }
            />
            {!hourly && (
              <span className="booking-timeline-month-value" aria-hidden="true">
                {day.slice(5, 7)}/{day.slice(0, 4)}
                <i className="bi bi-calendar3" />
              </span>
            )}
          </label>
          <button
            type="button"
            className="btn btn-light"
            aria-label={hourly ? 'Ngày sau' : 'Tháng sau'}
            onClick={() => shift(1)}
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="booking-timeline-today"
            disabled={hourly ? day === today : day.slice(0, 7) === today.slice(0, 7)}
            onClick={() => {
              setDay(dateKey(new Date()));
              setNow(Date.now());
            }}
          >
            <i className="bi bi-calendar-check" aria-hidden="true" />
            {hourly ? 'Hôm nay' : 'Tháng này'}
          </button>
        </div>
        <label>
          Hạng phòng
          <select
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Tất cả hạng</option>
            {categories.map((id) => (
              <option key={id} value={id}>
                {data.classes.find((c) => c.id === id)?.name || 'Chưa gán hạng'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="booking-timeline-hint">
        {view === 'hour'
          ? `Bấm giờ bắt đầu, hệ thống chọn sẵn 2 tiếng. Bấm ô xa hơn hoặc dùng nút +/− để đổi số giờ (tối đa ${data.rules.maxHourlyStay} tiếng), rồi bấm Xác nhận.`
          : view === 'night'
            ? `Qua đêm cố định ${data.timeSetting.nightCheckIn} → ${data.timeSetting.nightCheckOut} hôm sau, chỉ chọn 1 đêm. Bấm ô trống rồi bấm Xác nhận.`
            : `Theo ngày nhận ${data.timeSetting.dayCheckIn}, trả ${data.timeSetting.dayCheckOut} hôm sau. Bấm ngày đầu và ngày cuối để chọn nhiều ngày, sau đó bấm Xác nhận.`}
        {hourly &&
          ` Đặt qua 0h: chọn giờ bắt đầu rồi bấm › sang ngày sau để bấm thêm giờ. Ô dọn phòng ${data.rules.cleaningBuffer} phút ở trước và sau mỗi booking.`}
      </p>
      <div className="booking-timeline-legend">
        <span className="confirmed">Đã xác nhận</span>
        <span className="checked-in">Đang ở</span>
        <span className="pending">Chờ xác nhận</span>
        {hourly && <span className="cleaning">Dọn phòng</span>}
        <span className="blocked">Khóa bán</span>
        <span className="past">Đã qua</span>
        <span className="selected">Đang chọn</span>
      </div>
      {selectedRoom && range && (
        <div className="booking-timeline-confirm" role="status">
          <span className="booking-timeline-confirm-icon" aria-hidden="true">
            <i className={`bi ${hourly ? 'bi-clock' : view === 'night' ? 'bi-moon-stars' : 'bi-sun'}`} />
          </span>
          <div className="booking-timeline-confirm-info">
            <strong>
              {selectedRoom.name} · {VIEW_STAY[view]}
            </strong>
            <span>
              {dateTime(range.start)} → {dateTime(range.end)}
            </span>
          </div>
          {(hourly || view === 'day') && (
            <div className="booking-timeline-stepper" aria-label={`Số ${unitLabel}`}>
              <button
                type="button"
                aria-label={`Bớt 1 ${unitLabel}`}
                disabled={!canShrink}
                onClick={() => step(-1)}
              >
                <i className="bi bi-dash" aria-hidden="true" />
              </button>
              <span>
                {units} {unitLabel}
              </span>
              <button
                type="button"
                aria-label={`Thêm 1 ${unitLabel}`}
                disabled={!canGrow}
                onClick={() => step(1)}
              >
                <i className="bi bi-plus" aria-hidden="true" />
              </button>
            </div>
          )}
          {view === 'night' && <span className="booking-timeline-chip">1 đêm</span>}
          {price !== null && (
            <div className="booking-timeline-confirm-price">
              <small>Tạm tính</small>
              <strong>{moneyComma(price)}</strong>
            </div>
          )}
          <div className="booking-timeline-confirm-actions">
            <button type="button" className="btn btn-light" onClick={clear}>
              Bỏ chọn
            </button>
            <button type="button" className="btn btn-primary-custom" onClick={confirm}>
              <i className="bi bi-check2" aria-hidden="true" /> Xác nhận
            </button>
          </div>
        </div>
      )}
      {!visibleRooms.length ? (
        <div className="room-board-empty">Không có phòng phù hợp với bộ lọc.</div>
      ) : (
        <div
          className="booking-timeline-scroll"
          ref={scroll}
          tabIndex={0}
          aria-label={`Lịch phòng theo ${VIEW_LABELS[view].toLowerCase()}, có thể cuộn ngang và dọc`}
        >
          <div className="booking-timeline-grid" style={{ width }}>
            <div className="booking-timeline-head" style={gridStyle}>
              <div className="booking-timeline-room">Hạng phòng / Phòng</div>
              {cols.map((c) => (
                <div
                  key={c.key}
                  className={dateKey(new Date(c.start)) === today && !hourly ? 'today' : ''}
                >
                  <strong>{c.label}</strong>
                  {c.sub && <small>{c.sub}</small>}
                </div>
              ))}
            </div>
            {hourly && now >= cols[0].start && now < cols[cols.length - 1].end && (
              <div
                className="booking-timeline-now"
                style={{ left: nowPosition }}
                aria-hidden="true"
              >
                <span>Bây giờ</span>
              </div>
            )}
            {visibleRooms.map((room, index) => {
              const key = roomKey(room);
              const prev = visibleRooms[index - 1];
              const newGroup =
                !prev || prev.branchId !== room.branchId || prev.classId !== room.classId;
              const groupCount = newGroup
                ? visibleRooms.filter(
                    (r) => r.branchId === room.branchId && r.classId === room.classId
                  ).length
                : 0;
              const rowSelected = visible && selection?.roomKey === key;
              return (
                <div key={key}>
                  {newGroup && (
                    <div className="booking-timeline-group">
                      <span>
                        <strong>{className(data, room)}</strong>
                        <em>{groupCount} phòng</em>
                      </span>
                    </div>
                  )}
                  <div
                    className={`booking-timeline-row${rowSelected ? ' is-selecting' : ''}`}
                    style={gridStyle}
                  >
                    <div className="booking-timeline-room">
                      <strong>{room.name || `Phòng ${room.number}`}</strong>
                      <small>Số phòng {room.number}</small>
                    </div>
                    {(rowCells.get(key) || []).map((c, i) => {
                      if ((c.kind === 'booked' || c.kind === 'cleaning') && !c.head) return null;
                      const style = c.span ? { gridColumn: `span ${c.span}` } : undefined;
                      const interval = c.booking && bookingInterval(data, c.booking);
                      const overdue =
                        c.booking?.status === 'checked-in' && interval && interval[1] < now;
                      if (rowSelected && selection && i > selection.from && i <= selection.to)
                        return null;
                      if (rowSelected && selection && i === selection.from && range)
                        return (
                          <button
                            type="button"
                            key={c.key}
                            className="booking-timeline-pick"
                            style={{ gridColumn: `span ${selection.to - selection.from + 1}` }}
                            aria-label={`Bỏ chọn ${room.name} · ${dateTime(range.start)} → ${dateTime(range.end)}`}
                            onClick={clear}
                          >
                            <strong>
                              {range.start < cols[0].start ? '← ' : ''}
                              {units} {unitLabel}
                              {range.end > cols[cols.length - 1].end ? ' →' : ''}
                            </strong>
                            <small>
                              {clockOf(range.start)} → {clockOf(range.end)}
                            </small>
                            <i className="bi bi-x" aria-hidden="true" />
                          </button>
                        );
                      const label = `Phòng ${room.number} · ${dateTime(c.start)} · ${c.reason}${c.booking ? ` · ${c.booking.type}` : ''}${interval ? ` · Check-in ${dateTime(interval[0])} · Check-out ${dateTime(interval[1])}` : ''}${overdue ? ' · Quá giờ trả phòng' : ''}`;
                      return (
                        <button
                          type="button"
                          key={c.key}
                          className={`booking-timeline-cell ${c.kind} ${c.booking && c.kind === 'booked' ? c.booking.status : ''}`}
                          style={style}
                          title={label}
                          aria-label={label}
                          onClick={() =>
                            c.kind === 'booked' && c.booking
                              ? openDetail(c.booking.id)
                              : c.kind === 'open'
                                ? choose(room, i)
                                : toast(c.reason)
                          }
                        >
                          {c.kind === 'booked' && c.booking ? (
                            <>
                              <span className="booking-timeline-cell-top">
                                <strong>
                                  {c.continuesBefore ? '← ' : ''}
                                  {c.booking.id}
                                  {c.continuesAfter ? ' →' : ''}
                                </strong>
                                <em className={`stay-${STAY_META[c.booking.type].key}`}>
                                  <i className={`bi ${STAY_META[c.booking.type].icon}`} aria-hidden="true" />
                                  {STAY_META[c.booking.type].label}
                                </em>
                              </span>
                              <span>{c.booking.customer}</span>
                              {interval && (
                                <small className="booking-timeline-cell-time">
                                  <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
                                  {stamp(interval[0], c.start)}
                                  <i className="bi bi-box-arrow-right" aria-hidden="true" />
                                  {stamp(interval[1], c.start)}
                                </small>
                              )}
                              <small>
                                {bookingState(c.booking)}
                                {overdue ? ' · Quá giờ' : ''}
                              </small>
                            </>
                          ) : c.kind === 'cleaning' ? (
                            <span>Dọn</span>
                          ) : c.kind === 'blocked' ? (
                            <span>Khóa</span>
                          ) : c.kind === 'open' ? (
                            <i className="bi bi-plus" aria-hidden="true" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
