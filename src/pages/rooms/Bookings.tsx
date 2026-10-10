import { useState } from 'react';
import type { Room } from '../../types';
import { useStore } from '../../store';
import { useBooking } from '../../booking/context';
import { branches } from '../../seed/base';
import { branchName, moneyOrDash } from '../../lib/format';
import { isAllowedBranch, scoped } from '../../lib/scope';
import { ACTIVE_BOOKING, className, roomKey } from '../../lib/rooms';
import { RoomTimeline } from './RoomTimeline';
import { DataTable, Panel, PanelHead, ScopeNote, Tabs, TextLink } from '../../components/ui';
import { RoomBoard } from '../workflow/RoomBoard';
import { useFlowActions } from '../workflow/actions';

type View = 'grid' | 'list' | 'diagram' | 'live';
const VIEW_LABELS: Record<View, string> = { grid: 'Lưới', list: 'Danh sách', diagram: 'Sơ đồ', live: 'Camera & folio' };
const STATUS: Record<string, string> = { available: 'Trống', reserved: 'Đã đặt', occupied: 'Có khách', cleaning: 'Đang dọn' };
const Badge = ({ status }: { status: string }) => <span className={`status-pill ${status}`}>{STATUS[status] || status}</span>;

export function Bookings() {
  const { data, toast } = useStore();
  const { openBooking } = useBooking();
  const act = useFlowActions();
  const [view, setView] = useState<View>('grid');
  const rooms = scoped(data, data.rooms);
  const bookings = scoped(data, data.bookings);
  const bookingFor = (room: Room) => bookings.find(b => b.branchId === room.branchId && b.room === room.number && ACTIVE_BOOKING.includes(b.status));

  const book = (room: Room) => {
    if (!isAllowedBranch(data, room.branchId)) return;
    if (room.status === 'cleaning') { toast('Phòng đang dọn; hãy hoàn tất dọn trước khi đặt.'); return; }
    openBooking({ branchId: room.branchId, room: room.number });
  };

  const action = (room: Room) => room.status === 'cleaning'
    ? <TextLink icon="bi-check-circle" onClick={() => act.finishClean(roomKey(room))}>Hoàn tất dọn</TextLink>
    : <TextLink icon="bi-plus-lg" onClick={() => book(room)}>Đặt phòng</TextLink>;

  const visibleBranches = data.branchId === 'all' ? branches : branches.filter(b => b.id === data.branchId);

  return (
    <>
      <div className="reception-toolbar">
        <Tabs items={['grid', 'list', 'diagram', 'live'] as View[]} value={view} onChange={setView} labels={VIEW_LABELS} />
        <span className="text-muted small">{rooms.length} phòng · {bookings.length} lượt đặt</span>
      </div>
      {view !== 'live' && <ScopeNote>Chọn khoảng trống trên lưới rồi bấm Xác nhận để nhập thông tin khách. Bấm vào booking để xem chi tiết.</ScopeNote>}

      {view === 'grid' && <RoomTimeline rooms={rooms} />}

      {view === 'list' && (
        <Panel>
          <DataTable headers={['PHÒNG', 'CHI NHÁNH', 'HẠNG', 'TRẠNG THÁI', 'KHÁCH / LỊCH NHẬN', 'THAO TÁC']}>
            {rooms.map(room => {
              const b = bookingFor(room);
              return (
                <tr key={roomKey(room)}>
                  <td><strong>{room.number}</strong><small>Room ID {Number(room.masterProductId) || 0}</small></td>
                  <td>{branchName(room.branchId)}</td>
                  <td>{className(data, room)}</td>
                  <td><Badge status={room.status} /></td>
                  <td>{b ? <>{b.customer}<small>{b.time || '—'}</small></> : '—'}</td>
                  <td>{action(room)}</td>
                </tr>
              );
            })}
          </DataTable>
        </Panel>
      )}

      {view === 'diagram' && visibleBranches.map(branch => (
        <section className="reception-floor" key={branch.id}>
          <h3>{branch.name}</h3>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(floor => {
            const floorRooms = rooms.filter(r => r.branchId === branch.id && r.number.startsWith(String(floor)));
            return floorRooms.length ? (
              <div className="floor-line" key={floor}>
                <span>Tầng {floor}</span>
                <div className="floor-rooms">
                  {floorRooms.map(r => <div className={`floor-room ${r.status}`} key={r.number}><strong>{r.number}</strong><small>{className(data, r)}</small><Badge status={r.status} /></div>)}
                </div>
              </div>
            ) : null;
          })}
        </section>
      ))}

      {view === 'live' && <RoomBoard />}

      <section className="panel table-panel mt-3">
        <PanelHead className="px-3" title="Đặt phòng gần đây" subtitle="Các lượt đặt mẫu của chi nhánh đang xem" />
        <DataTable headers={['MÃ', 'KHÁCH', 'PHÒNG', 'NHẬN PHÒNG', 'GIÁ TRỊ']}>
          {bookings.map(b => <tr key={b.id}><td><strong>{b.id}</strong></td><td>{b.customer}</td><td>{branchName(b.branchId)} · {b.room}</td><td>{b.time || '—'}</td><td>{moneyOrDash(b.amount)}</td></tr>)}
        </DataTable>
      </section>
    </>
  );
}
