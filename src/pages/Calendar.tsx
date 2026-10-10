import { useMemo } from 'react';
import { useStore } from '../store';
import { useBooking } from '../booking/context';
import { branchName } from '../lib/format';
import { scoped } from '../lib/scope';
import { DataTable, Panel, Pill, PrimaryButton, ScopeNote, Toolbar } from '../components/ui';

const dayFmt = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });

export function Calendar() {
  const { data } = useStore();
  const { openBooking } = useBooking();
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }), []);
  const rooms = scoped(data, data.rooms);
  const bookings = scoped(data, data.bookings);

  return (
    <>
      <ScopeNote icon="bi-calendar-week">Trạng thái phòng hôm nay được mô phỏng từ sơ đồ phòng. Các ngày tiếp theo dựa trên lịch đặt mẫu; chưa có hệ thống giữ chỗ theo khoảng thời gian.</ScopeNote>
      <Toolbar>
        <PrimaryButton icon="bi-plus-lg" onClick={() => openBooking()}>Tạo đặt phòng</PrimaryButton>
        <span className="text-muted small">7 ngày tới · {rooms.length} phòng</span>
      </Toolbar>
      <Panel title="Lịch sử dụng phòng" subtitle="Đối chiếu ngày lưu trú và đặt phòng sắp đến">
        <DataTable className="calendar-table" headers={['CHI NHÁNH / PHÒNG', ...dates.map(d => dayFmt.format(d))]}>
          {rooms.map(r => {
            const booked = bookings.filter(b => b.branchId === r.branchId && b.room === r.number);
            return (
              <tr key={`${r.branchId}:${r.number}`}>
                <td><strong>{branchName(r.branchId)}</strong><small>Phòng {r.number}</small></td>
                {dates.map((d, i) => {
                  const match = booked.find(b => { const p = b.time.match(/(\d{2})\/(\d{2})/); return p && +p[1] === d.getDate() && +p[2] === d.getMonth() + 1; });
                  const status = i === 0 ? r.status : match ? 'reserved' : 'available';
                  return <td key={i}><Pill status={status} />{match && <small>{match.customer}</small>}</td>;
                })}
              </tr>
            );
          })}
        </DataTable>
      </Panel>
    </>
  );
}
