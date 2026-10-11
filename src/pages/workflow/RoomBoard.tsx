import { useState } from 'react';
import { useStore } from '../../store';
import { useBooking } from '../../booking/context';
import { branchName, fmtDateTime, money } from '../../lib/format';
import { scoped } from '../../lib/scope';
import { checkoutAt, folioDue, isActive } from '../../lib/folio';
import { ACTIVE_BOOKING, bookingInterval, className, roomKey } from '../../lib/rooms';
import { useFlowActions } from './actions';
import '../rooms/booking-rooms.css';

type Filter = 'all' | 'available' | 'occupied' | 'cleaning';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'available', label: 'Trống sạch' },
  { value: 'occupied', label: 'Có khách' },
  { value: 'cleaning', label: 'Cần dọn' }
];
const floorOf = (number: string) => number.slice(0, -2) || '1';

export function RoomBoard() {
  const { data, update } = useStore();
  const { openBooking, openDetail } = useBooking();
  const act = useFlowActions();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [floor, setFloor] = useState('all');
  const now = Date.now();
  const rows = scoped(data, data.rooms).map((room) => {
    const current = data.folios.find(
      (f) =>
        f.branchId === room.branchId &&
        f.room === room.number &&
        isActive(f) &&
        f.detailStatus === 2
    );
    const currentBooking = data.bookings.find(
      (b) => b.branchId === room.branchId && b.room === room.number && b.status === 'checked-in'
    );
    const next = data.bookings
      .filter(
        (b) =>
          b.branchId === room.branchId &&
          b.room === room.number &&
          b.id !== current?.code &&
          b.status !== 'checked-in' &&
          ACTIVE_BOOKING.includes(b.status)
      )
      .map((booking) => ({ booking, interval: bookingInterval(data, booking) }))
      .filter((item) => item.interval)
      .sort((a, b) => a.interval![0] - b.interval![0])[0];
    const status: Exclude<Filter, 'all'> =
      current || currentBooking || room.status === 'occupied'
        ? 'occupied'
        : room.status === 'cleaning'
          ? 'cleaning'
          : 'available';
    return { room, current, currentBooking, next, status };
  });
  const floors = [...new Set(rows.map(({ room }) => floorOf(room.number)))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
  const query = search.trim().toLocaleLowerCase('vi');
  const visible = rows.filter(
    (row) =>
      (filter === 'all' || row.status === filter) &&
      (floor === 'all' || floorOf(row.room.number) === floor) &&
      [
        row.room.number,
        className(data, row.room),
        row.current?.customer,
        row.current?.code,
        row.currentBooking?.customer,
        row.currentBooking?.id,
        row.next?.booking.customer,
        row.next?.booking.id
      ].some((value) => value?.toLocaleLowerCase('vi').includes(query))
  );
  const branchIds = [...new Set(visible.map(({ room }) => room.branchId))];

  return (
    <div className="booking-room-board">
      <div className="room-board-toolbar">
        <label className="room-board-search">
          Tìm phòng hoặc khách
          <input
            className="form-control"
            type="search"
            placeholder="Số phòng, tên khách, mã booking"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
        <button
          type="button"
          className="btn-primary-custom"
          onClick={() => openBooking(data.branchId === 'all' ? {} : { branchId: data.branchId })}
        >
          Tạo booking
        </button>
      </div>
      <div className="room-board-filters" aria-label="Lọc trạng thái phòng">
        {FILTERS.map((item) => (
          <button
            type="button"
            key={item.value}
            className={filter === item.value ? 'active' : ''}
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}{' '}
            <span>
              {rows.filter((row) => item.value === 'all' || row.status === item.value).length}
            </span>
          </button>
        ))}
      </div>
      <p className="room-board-hint">
        {visible.length} phòng phù hợp · Bấm booking để xem và xử lý nhận / trả phòng. Lịch sắp đến
        không thay đổi trạng thái phòng hiện tại.
      </p>
      {!visible.length && (
        <div className="room-board-empty">Không có phòng phù hợp với bộ lọc.</div>
      )}
      {branchIds.map((branchId) => (
        <section className="room-board-branch" key={branchId}>
          <h2>{branchName(data, branchId)}</h2>
          {floors.map((value) => {
            const group = visible.filter(
              ({ room }) => room.branchId === branchId && floorOf(room.number) === value
            );
            if (!group.length) return null;
            return (
              <section className="room-board-floor" key={value}>
                <h3>Tầng {value}</h3>
                <div className="room-board-grid">
                  {group
                    .sort((a, b) =>
                      a.room.number.localeCompare(b.room.number, undefined, { numeric: true })
                    )
                    .map(({ room, current, currentBooking, next, status }) => {
                      const code = current?.code || currentBooking?.id;
                      const end = current
                        ? Date.parse(checkoutAt(current))
                        : currentBooking
                          ? bookingInterval(data, currentBooking)?.[1]
                          : undefined;
                      const overdue = end != null && end < now;
                      const cleaning = status === 'cleaning' && !!room.cleaningReadyAt;
                      const nextStart = next?.interval?.[0];
                      const affected =
                        nextStart != null &&
                        status === 'occupied' &&
                        Math.max(end || now, now) + data.rules.cleaningBuffer * 60000 > nextStart;
                      return (
                        <article className={`room-board-card ${status}`} key={roomKey(room)}>
                          <div className="room-board-card-head">
                            {code ? (
                              <button
                                type="button"
                                className="room-board-number"
                                onClick={() => openDetail(code)}
                                aria-label={`Phòng ${room.number}, xem booking ${code}`}
                              >
                                {room.number}
                              </button>
                            ) : (
                              <strong className="room-board-number">{room.number}</strong>
                            )}
                            <span className={`room-board-status ${status}`}>
                              {status === 'occupied'
                                ? 'Có khách'
                                : status === 'cleaning'
                                  ? cleaning
                                    ? 'Đang dọn'
                                    : 'Chờ dọn'
                                  : 'Trống sạch'}
                            </span>
                          </div>
                          <p className="room-board-class">{className(data, room)}</p>
                          {status === 'occupied' && (
                            <div className="room-board-stay">
                              <strong>
                                {current?.customer ||
                                  currentBooking?.customer ||
                                  'Chưa có thông tin khách'}
                              </strong>
                              <p>
                                Trả phòng:{' '}
                                <strong>
                                  {end
                                    ? fmtDateTime(new Date(end).toISOString())
                                    : 'Chưa có lịch trả'}
                                </strong>
                              </p>
                              {overdue && (
                                <p className="room-board-warning">
                                  Quá giờ trả · khách chưa trả phòng
                                </p>
                              )}
                              {current && (
                                <p>
                                  Còn thu: <strong>{money(folioDue(current))}</strong>
                                </p>
                              )}
                              {current?.checkoutRequestedAt && !current.checkoutHandledAt && (
                                <p className="room-board-warning">Khách yêu cầu trả phòng</p>
                              )}
                            </div>
                          )}
                          {status === 'cleaning' && (
                            <p>
                              {room.cleaningReadyAt
                                ? `Dự kiến xong: ${fmtDateTime(room.cleaningReadyAt)}`
                                : 'Cần dọn trước khi nhận khách.'}
                            </p>
                          )}
                          {next && (
                            <button
                              type="button"
                              className="room-board-next"
                              onClick={() => openDetail(next.booking.id)}
                            >
                              <span>
                                Lượt kế tiếp ·{' '}
                                {next.booking.status === 'pending' ? 'Chờ xác nhận' : 'Đã xác nhận'}
                              </span>
                              <strong>
                                {fmtDateTime(new Date(next.interval![0]).toISOString())}
                              </strong>
                              <span>
                                {next.booking.id} · {next.booking.customer}
                              </span>
                              {nextStart! < now && (
                                <span className="room-board-warning">Đã trễ giờ nhận</span>
                              )}
                              {affected && (
                                <span className="room-board-warning">
                                  Lượt đang ở chưa đủ thời gian trả và dọn trước lượt này.
                                </span>
                              )}
                            </button>
                          )}
                          <div className="room-board-actions">
                            {status === 'available' && (
                              <>
                                <button
                                  type="button"
                                  className="btn-primary-custom"
                                  onClick={() =>
                                    openBooking({
                                      branchId: room.branchId,
                                      room: room.number,
                                      receiveNow: true
                                    })
                                  }
                                >
                                  Nhận khách
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-light"
                                  onClick={() =>
                                    openBooking({ branchId: room.branchId, room: room.number })
                                  }
                                >
                                  Đặt trước
                                </button>
                              </>
                            )}
                            {status === 'occupied' && code && (
                              <button
                                type="button"
                                className="btn-primary-custom"
                                onClick={() => openDetail(code)}
                              >
                                {current?.checkoutRequestedAt ? 'Xử lý trả phòng' : 'Trả phòng'}
                              </button>
                            )}
                            {status === 'cleaning' &&
                              (cleaning ? (
                                <button
                                  type="button"
                                  className="btn btn-light"
                                  onClick={() => act.finishClean(roomKey(room))}
                                >
                                  Hoàn tất dọn
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-light"
                                  onClick={() =>
                                    update((d) => {
                                      const target = d.rooms.find(
                                        (r) => roomKey(r) === roomKey(room)
                                      );
                                      if (target)
                                        target.cleaningReadyAt = new Date(
                                          Date.now() + d.rules.cleaningBuffer * 60000
                                        ).toISOString();
                                    })
                                  }
                                >
                                  Bắt đầu dọn
                                </button>
                              ))}
                          </div>
                        </article>
                      );
                    })}
                </div>
              </section>
            );
          })}
        </section>
      ))}
    </div>
  );
}
