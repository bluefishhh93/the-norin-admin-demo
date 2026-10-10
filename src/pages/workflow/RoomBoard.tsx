import { useStore } from '../../store';
import { branchName, fmtDateTime, money } from '../../lib/format';
import { scoped } from '../../lib/scope';
import { cameraOf, checkoutAt, folioDue, isActive } from '../../lib/folio';
import { Pill, ScopeNote, TextLink } from '../../components/ui';
import { useFolioDialogs } from './shared';

export function RoomBoard() {
  const { data } = useStore();
  const { detail } = useFolioDialogs();
  const folios = scoped(data, data.folios);

  return (
    <>
      <ScopeNote icon={null}>Phòng và trạng thái camera là dữ liệu demo. Giờ trả ưu tiên theo order detail rồi đến giờ hiệu lực; chỉ thao tác thu tiền ở trang Thu ngân.</ScopeNote>
      <div className="reception-grid">
        {scoped(data, data.rooms).map(room => {
          const b = folios.find(f => f.room === room.number && f.branchId === room.branchId && isActive(f) && f.detailStatus === 2);
          const cam = b && cameraOf(data, b);
          return (
            <article className={`reception-room ${room.status}`} key={`${room.branchId}:${room.number}`}>
              <div className="reception-room-top"><strong>{room.number}</strong><Pill status={room.status} /></div>
              <p>{branchName(room.branchId)} · Room ID {Number(room.masterProductId) || '—'}</p>
              <p>{cam ? `Camera: ${cam.state} · ${cam.lastOccupancy} người` : 'Chưa có khách check-in tại kiosk'}</p>
              {b && <>
                <p>Trả phòng: <strong>{fmtDateTime(checkoutAt(b))}</strong></p>
                <p>Còn nợ: <strong>{money(folioDue(b))}</strong></p>
                <TextLink icon="bi-eye" onClick={() => detail(b)}>Xem lượt lưu trú</TextLink>
              </>}
            </article>
          );
        })}
      </div>
    </>
  );
}
