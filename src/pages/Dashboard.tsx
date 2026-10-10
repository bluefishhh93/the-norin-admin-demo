import type { Booking, Room } from '../types';
import type { PageProps } from '.';
import { useStore } from '../store';
import { branchName, money, statusText } from '../lib/format';
import { scoped, isSystemScope } from '../lib/scope';
import { folioPaid } from '../lib/folio';
import { DataTable, MetricCard, PanelHead, Pill } from '../components/ui';

export const Legend = () => (
  <div className="status-legend">
    <span>
      <i className="legend-dot available" /> Còn trống
    </span>
    <span>
      <i className="legend-dot occupied" /> Có khách
    </span>
    <span>
      <i className="legend-dot reserved" /> Đã đặt
    </span>
    <span>
      <i className="legend-dot cleaning" /> Đang dọn
    </span>
  </div>
);

export const RoomTile = ({ room, onClick }: { room: Room; onClick: () => void }) => {
  const { data } = useStore();
  return (
    <button
      className={`room-tile ${room.status}`}
      type="button"
      title={`${branchName(data, room.branchId)} · Phòng ${room.number} · ${statusText[room.status]}`}
      onClick={onClick}
    >
      <strong>{room.number}</strong>
      <span>{statusText[room.status]}</span>
    </button>
  );
};

export const BOOKING_HEADERS = [
  'MÃ ĐẶT',
  'KHÁCH HÀNG',
  'CHI NHÁNH',
  'PHÒNG / LOẠI',
  'NHẬN PHÒNG',
  'GIÁ TRỊ',
  'TRẠNG THÁI'
];
export const BookingRow = ({ b }: { b: Booking }) => {
  const { data } = useStore();
  return (
    <tr>
      <td>
        <strong>#{b.id}</strong>
      </td>
      <td>
        <strong>{b.customer}</strong>
        <small>{b.phone}</small>
      </td>
      <td>{branchName(data, b.branchId)}</td>
      <td>
        <strong>{b.room}</strong> · {b.type}
      </td>
      <td>{b.time}</td>
      <td>
        <strong>{money(b.amount)}</strong>
      </td>
      <td>
        <Pill status={b.status} />
      </td>
    </tr>
  );
};

const GoLink = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button className="text-link" type="button" onClick={onClick}>
    {label} <i className="bi bi-arrow-right" />
  </button>
);

export function Dashboard({ navigate }: PageProps) {
  const { data, update } = useStore();
  const rooms = scoped(data, data.rooms);
  const bookings = scoped(data, data.bookings);
  const occupied = rooms.filter((r) => r.status === 'occupied').length;
  const upcoming = bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'pending'
  ).length;
  const revenue = bookings
    .filter((b) => b.status === 'checked-in')
    .reduce((s, b) => s + b.amount, 0);
  const all = data.branchId === 'all';

  const cards: [string, string | number, string, string, string][] = [
    ['Doanh thu ghi nhận', money(revenue), 'Dựa trên đặt phòng đã nhận', 'bi-wallet2', 'rose'],
    [
      'Phòng đang sử dụng',
      `${occupied} / ${rooms.length}`,
      `${rooms.length ? Math.round((occupied / rooms.length) * 100) : 0}% công suất hiện tại`,
      'bi-door-open',
      'green'
    ],
    ['Đặt phòng sắp tới', upcoming, 'Đã xác nhận & chờ xác nhận', 'bi-calendar-check', 'blue'],
    [
      'Chi nhánh hoạt động',
      all ? data.branches.length : 1,
      all ? 'Trên toàn hệ thống' : 'Trong phạm vi quản lý',
      'bi-buildings',
      'amber'
    ]
  ];

  const icons = ['bi-door-open', 'bi-calendar-check', 'bi-clock-history', 'bi-bag-check'];
  const colors = ['rose', 'green', 'amber', 'blue'];
  const activity = [
    ...data.activities
      .filter((a) => all || a.branchId === data.branchId)
      .map((a) => ({ ...a, icon: 'bi-plus-circle', color: 'green' })),
    ...bookings.slice(0, 4).map((b, i) => ({
      branchId: b.branchId,
      text: `${b.customer} · Phòng ${b.room}`,
      detail: `${branchName(data, b.branchId)} · ${statusText[b.status]}`,
      time: b.time.split('·')[1]?.trim() || '',
      icon: icons[i],
      color: colors[i]
    }))
  ]
    .filter((a) => all || a.branchId === data.branchId)
    .slice(0, 5);

  if (isSystemScope(data)) return <>
    <div className="metric-grid">
      <MetricCard label="Chi nhánh hoạt động" value={data.branches.filter(b => b.active !== false).length} foot="Trên toàn hệ thống" />
      <MetricCard label="Đã thu ròng" value={money(data.folios.reduce((s, f) => s + folioPaid(f), 0))} foot="Tổng thu trừ các khoản hoàn" />
      <MetricCard label="Công suất hiện tại" value={`${rooms.length ? Math.round(occupied / rooms.length * 100) : 0}%`} foot={`${occupied}/${rooms.length} phòng có khách`} />
    </div>
    <section className="panel table-panel">
      <PanelHead title="Các chi nhánh" subtitle="Mở chi nhánh để quản lý booking, kinh doanh và thiết bị" action={<GoLink label="Quản lý chi nhánh" onClick={() => navigate('branches')} />} />
      <DataTable headers={['CHI NHÁNH', 'TRẠNG THÁI', 'PHÒNG CÓ KHÁCH', 'ĐÃ THU RÒNG', 'THAO TÁC']}>
        {data.branches.map(b => {
          const branchRooms = data.rooms.filter(r => r.branchId === b.id);
          const paid = data.folios.filter(f => f.branchId === b.id).reduce((s, f) => s + folioPaid(f), 0);
          return <tr key={b.id}><td><strong>{b.name}</strong><small>{b.address}</small></td><td>{b.active === false ? 'Dừng hoạt động' : 'Hoạt động'}</td><td>{branchRooms.filter(r => r.status === 'occupied').length}/{branchRooms.length}</td><td>{money(paid)}</td><td><GoLink label="Quản lý chi nhánh" onClick={() => { update(d => { d.branchId = b.id; }); navigate('dashboard'); }} /></td></tr>;
        })}
      </DataTable>
    </section>
  </>;

  return (
    <>
      <div className="metric-grid">
        {cards.map(([label, value, foot, icon, color]) => (
          <MetricCard
            key={label}
            label={label}
            value={value}
            foot={foot}
            icon={icon}
            color={color}
          />
        ))}
      </div>
      <div className="section-grid">
        <section className="panel">
          <PanelHead
            title="Tình trạng phòng"
            subtitle="Tổng quan phòng của chi nhánh đang xem"
            action={<GoLink label="Xem sơ đồ" onClick={() => navigate('bookings')} />}
          />
          <Legend />
          <div className="room-grid">
            {rooms.slice(0, 15).map((r) => (
              <RoomTile
                key={`${r.branchId}:${r.number}`}
                room={r}
                onClick={() => navigate('bookings')}
              />
            ))}
          </div>
        </section>
        <section className="panel">
          <PanelHead title="Hoạt động gần đây" subtitle="Cập nhật từ hoạt động trong bản demo" />
          <div className="activity-list">
            {activity.length ? (
              activity.map((a, i) => (
                <div className="activity-row" key={i}>
                  <span className={`activity-icon ${a.color}`}>
                    <i className={`bi ${a.icon}`} />
                  </span>
                  <div className="activity-copy">
                    <strong>{a.text}</strong>
                    <span>{a.detail}</span>
                  </div>
                  <time className="activity-time">{a.time}</time>
                </div>
              ))
            ) : (
              <div className="empty-state">Chưa có hoạt động.</div>
            )}
          </div>
        </section>
      </div>
      <section className="panel table-panel">
        <PanelHead
          title="Đặt phòng gần đây"
          subtitle="Các lượt đặt phòng mới nhất"
          action={<GoLink label="Xem tất cả" onClick={() => navigate('bookings')} />}
        />
        <DataTable headers={BOOKING_HEADERS}>
          {bookings.slice(0, 5).map((b) => (
            <BookingRow key={b.id} b={b} />
          ))}
        </DataTable>
      </section>
    </>
  );
}
