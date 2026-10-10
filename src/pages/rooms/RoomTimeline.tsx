import { useEffect, useMemo, useRef, useState } from 'react';
import type { Room, StayType } from '../../types';
import { useStore } from '../../store';
import { useBooking } from '../../booking/context';
import { branchName, fmtDateTime } from '../../lib/format';
import { scoped } from '../../lib/scope';
import { bookingInterval, className, roomBusy, roomKey, stayWindow } from '../../lib/rooms';
import {
  blockReason,
  bookingState,
  buildCells,
  calendarColumns,
  dateKey,
  hourlyColumns,
  type TimelineView
} from './timeline';
import './booking-rooms.css';

const VIEW_LABELS = { day: 'Ngày', week: 'Tuần', month: 'Tháng' };
const dateTime = (ms: number) => fmtDateTime(new Date(ms).toISOString());
const floorOf = (number: string) => number.slice(0, -2) || '1';

export function RoomTimeline({ rooms }: { rooms: Room[] }) {
  const { data, toast } = useStore();
  const { openBooking, openDetail } = useBooking();
  const [view, setView] = useState<TimelineView>('day');
  const [day, setDay] = useState(() => dateKey(new Date()));
  const [stay, setStay] = useState<StayType>('Theo giờ');
  const allowedRooms = scoped(data, rooms);
  const branches = [...new Set(allowedRooms.map((room) => room.branchId))];
  const [branch, setBranch] = useState(() => branches[0] || 'all');
  const [floor, setFloor] = useState('all');
  const [category, setCategory] = useState('all');
  const [now, setNow] = useState(Date.now);
  const scroll = useRef<HTMLDivElement>(null);
  const selectedBranch =
    branches.includes(branch) || branch === 'all' ? branch : branches[0] || 'all';
  const branchRooms = allowedRooms.filter(
    (room) => selectedBranch === 'all' || room.branchId === selectedBranch
  );
  const floors = [...new Set(branchRooms.map((room) => floorOf(room.number)))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
  const categories = [...new Set(branchRooms.map((room) => room.classId))];
  const visibleRooms = branchRooms
    .filter(
      (room) =>
        (floor === 'all' || floorOf(room.number) === floor) &&
        (category === 'all' || room.classId === category)
    )
    .sort(
      (a, b) =>
        a.branchId.localeCompare(b.branchId) ||
        a.number.localeCompare(b.number, undefined, { numeric: true })
    );
  const cols = useMemo(
    () => (view === 'day' ? hourlyColumns(day) : calendarColumns(day, view)),
    [view, day]
  );
  const colWidth = view === 'day' ? 68 : view === 'week' ? 170 : 130;
  const labelWidth = 180;
  const width = labelWidth + cols.length * colWidth;
  const gridStyle = {
    gridTemplateColumns: `${labelWidth}px repeat(${cols.length}, ${colWidth}px)`
  };
  const today = dateKey(new Date(now));
  const nowPosition =
    labelWidth +
    ((now - cols[0].start) / (cols[cols.length - 1].end - cols[0].start)) * cols.length * colWidth;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (scroll.current)
      scroll.current.scrollLeft =
        view === 'day' && day === dateKey(new Date())
          ? Math.max(0, ((Date.now() - cols[0].start) / 1800000) * colWidth - colWidth * 2)
          : 0;
  }, [view, day, cols, colWidth]);

  const shift = (amount: number) => {
    const date = new Date(`${day}T00:00:00`);
    if (view === 'month') {
      date.setDate(1);
      date.setMonth(date.getMonth() + amount);
    } else date.setDate(date.getDate() + amount * (view === 'week' ? 7 : 1));
    setDay(dateKey(date));
  };
  const drill = (key: string) => {
    setDay(key);
    setView('day');
  };
  const pick = (room: Room, start: number) => {
    const from = new Date(Math.max(start, Date.now()));
    const [presetStart, end] =
      stay === 'Theo giờ'
        ? [from, new Date(from.getTime() + 2 * 3600000)]
        : stayWindow(data, stay, dateKey(from));
    openBooking({
      branchId: room.branchId,
      room: room.number,
      type: stay,
      start: presetStart,
      end
    });
  };

  return (
    <div className="booking-room-timeline">
      <div className="booking-timeline-toolbar">
        <div className="booking-timeline-views" aria-label="Chế độ lịch">
          {(['day', 'week', 'month'] as const).map((value) => (
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
            aria-label={`${VIEW_LABELS[view]} trước`}
            onClick={() => shift(-1)}
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <label>
            <span className="visually-hidden">Ngày đang xem</span>
            <input
              className="form-control"
              type={view === 'month' ? 'month' : 'date'}
              value={view === 'month' ? day.slice(0, 7) : day}
              onChange={(e) =>
                e.target.value && setDay(view === 'month' ? `${e.target.value}-01` : e.target.value)
              }
            />
          </label>
          <button
            type="button"
            className="btn btn-light"
            aria-label={`${VIEW_LABELS[view]} sau`}
            onClick={() => shift(1)}
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => {
              setDay(dateKey(new Date()));
              setNow(Date.now());
            }}
          >
            Hôm nay
          </button>
        </div>
        <label>
          Chi nhánh
          <select
            className="form-select"
            value={selectedBranch}
            onChange={(e) => {
              setBranch(e.target.value);
              setFloor('all');
              setCategory('all');
            }}
          >
            <option value="all">Tất cả chi nhánh</option>
            {branches.map((id) => (
              <option key={id} value={id}>
                {branchName(data, id)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tầng
          <select className="form-select" value={floor} onChange={(e) => setFloor(e.target.value)}>
            <option value="all">Tất cả tầng</option>
            {floors.map((value) => (
              <option key={value} value={value}>
                Tầng {value}
              </option>
            ))}
          </select>
        </label>
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
        {view === 'day' && (
          <label>
            Loại booking mới
            <select
              className="form-select"
              value={stay}
              onChange={(e) => setStay(e.target.value as StayType)}
            >
              <option>Theo giờ</option>
              <option>Qua đêm</option>
              <option>Theo ngày</option>
            </select>
          </label>
        )}
      </div>
      <p className="booking-timeline-hint">
        {view === 'day'
          ? 'Bấm ô trống để mở form với phòng và lịch gợi ý; có thể sửa trong form. Bấm ô bị chặn để xem lý do.'
          : 'Bấm một ngày để xem lịch theo giờ; ngày có booking vẫn có thể còn khoảng trống.'}{' '}
        Luôn hiển thị mọi loại lưu trú · Dọn dự kiến {data.rules.cleaningBuffer} phút sau mỗi lượt.
      </p>
      <div className="booking-timeline-legend">
        <span className="confirmed">Đã xác nhận</span>
        <span className="checked-in">Đang ở</span>
        <span className="pending">Chờ xác nhận</span>
        <span className="cleaning">Dọn phòng</span>
        <span className="blocked">Khóa bán</span>
        <span className="past">Đã qua</span>
      </div>
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
              <div className="booking-timeline-room">Chi nhánh / Phòng</div>
              {cols.map((c) => (
                <div key={c.key} className={dateKey(new Date(c.start)) === today ? 'today' : ''}>
                  <strong>{c.label}</strong>
                  {c.sub && <small>{c.sub}</small>}
                </div>
              ))}
            </div>
            {view === 'day' && day === today && (
              <div
                className="booking-timeline-now"
                style={{ left: nowPosition }}
                aria-hidden="true"
              >
                <span>Bây giờ</span>
              </div>
            )}
            {visibleRooms.map((room, index) => {
              const newGroup =
                index === 0 ||
                visibleRooms[index - 1].branchId !== room.branchId ||
                floorOf(visibleRooms[index - 1].number) !== floorOf(room.number);
              const busy = roomBusy(data, room);
              return (
                <div key={roomKey(room)}>
                  {newGroup && (
                    <div className="booking-timeline-group">
                      <span>
                        {branchName(data, room.branchId)} · Tầng {floorOf(room.number)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`booking-timeline-row ${view !== 'day' ? 'overview' : ''}`}
                    style={gridStyle}
                  >
                    <div className="booking-timeline-room">
                      <strong>Phòng {room.number}</strong>
                      <small>{className(data, room)}</small>
                    </div>
                    {view === 'day'
                      ? buildCells(data, room, cols, now).map((c) => {
                          if ((c.kind === 'booked' || c.kind === 'cleaning') && !c.head)
                            return null;
                          const style = c.span ? { gridColumn: `span ${c.span}` } : undefined;
                          const range = c.booking && bookingInterval(data, c.booking);
                          const overdue =
                            c.booking?.status === 'checked-in' && range && range[1] < now;
                          const label = `Phòng ${room.number} · ${dateTime(c.start)} · ${c.reason}${range ? ` · ${dateTime(range[0])} → ${dateTime(range[1])}` : ''}${overdue ? ' · Quá giờ trả phòng' : ''}`;
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
                                    ? pick(room, c.start)
                                    : toast(c.reason)
                              }
                            >
                              {c.kind === 'booked' && c.booking ? (
                                <>
                                  <strong>
                                    {c.continuesBefore ? '← ' : ''}
                                    {c.booking.id}
                                    {c.continuesAfter ? ' →' : ''}
                                  </strong>
                                  <span>{c.booking.customer}</span>
                                  <small>
                                    {bookingState(c.booking)}
                                    {overdue ? ' · Quá giờ' : ''}
                                  </small>
                                </>
                              ) : c.kind === 'cleaning' ? (
                                <span>Dọn</span>
                              ) : c.kind === 'blocked' ? (
                                <span>Khóa</span>
                              ) : null}
                            </button>
                          );
                        })
                      : cols.map((c) => {
                          const reservations = busy.filter(
                            (b) => c.start < b.end && c.end > b.start
                          );
                          const blocked = blockReason(data, room, c.start, c.end);
                          const cleaningRanges = busy.filter(
                            (b) =>
                              b.end < c.end && b.end + data.rules.cleaningBuffer * 60000 > c.start
                          );
                          return (
                            <div
                              className={`booking-timeline-day ${blocked ? 'blocked' : ''} ${c.end <= now ? 'past' : ''}`}
                              key={c.key}
                            >
                              <button
                                type="button"
                                className="booking-timeline-drill"
                                title={`Xem lịch theo giờ: phòng ${room.number}, ${c.label}`}
                                aria-label={`Xem ngày ${c.label}, phòng ${room.number}${blocked ? `, ${blocked}` : ''}`}
                                onClick={() => drill(c.key)}
                              >
                                {reservations.length
                                  ? `${reservations.length} lượt · Xem ngày`
                                  : 'Xem ngày'}
                              </button>
                              {reservations.map(({ booking, start, end }) => (
                                <button
                                  type="button"
                                  key={booking.id}
                                  className={`booking-timeline-reservation ${booking.status}`}
                                  onClick={() => openDetail(booking.id)}
                                  title={`${booking.id} · ${booking.customer} · ${bookingState(booking)} · ${dateTime(start)} → ${dateTime(end)}`}
                                >
                                  <strong>
                                    {start < c.start ? '← ' : ''}
                                    {booking.id}
                                    {end > c.end ? ' →' : ''}
                                  </strong>
                                  <span>{bookingState(booking)}</span>
                                  <small>
                                    {new Date(Math.max(start, c.start)).toLocaleTimeString(
                                      'vi-VN',
                                      { hour: '2-digit', minute: '2-digit' }
                                    )}{' '}
                                    →{' '}
                                    {end >= c.end
                                      ? '24:00'
                                      : new Date(end).toLocaleTimeString('vi-VN', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                  </small>
                                </button>
                              ))}
                              {cleaningRanges.map((range) => (
                                <span
                                  key={`clean-${range.booking.id}`}
                                  className="booking-timeline-clean-note"
                                  title={`Dọn sau ${range.booking.id}: ${dateTime(range.end)} → ${dateTime(range.end + data.rules.cleaningBuffer * 60000)}`}
                                >
                                  Dọn {data.rules.cleaningBuffer} phút sau{' '}
                                  {new Date(range.end).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              ))}
                              {blocked && (
                                <button
                                  type="button"
                                  className="booking-timeline-block-reason"
                                  onClick={() => toast(blocked)}
                                >
                                  Khóa bán · Xem lý do
                                </button>
                              )}
                              {room.status === 'cleaning' &&
                                c.end > now &&
                                c.start <
                                  (room.cleaningReadyAt
                                    ? Date.parse(room.cleaningReadyAt)
                                    : now + data.rules.cleaningBuffer * 60000) && (
                                  <span className="booking-timeline-clean-note">
                                    {room.cleaningReadyAt ? 'Đang dọn' : 'Chờ dọn'}
                                  </span>
                                )}
                            </div>
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
