import { useState } from 'react';
import type { Room } from '../../types';
import { useStore } from '../../store';
import { branchName } from '../../lib/format';
import { scoped } from '../../lib/scope';
import { Pill, PrimaryButton, ScopeNote, Toolbar } from '../../components/ui';
import type { PageProps } from '../index';
import { useClassForms, useScopedClasses } from './classForms';
import { RoomDetail, useRoomChecklist } from './RoomDetail';
import { RoomInfoForm, roomKeyOf } from './RoomInfoForm';

function RoomCard({ room, onOpen }: { room: Room; onOpen: () => void }) {
  const list = useRoomChecklist(room);
  const done = list.filter(c => c.done).length;
  return (
    <button type="button" className="room-card" onClick={onOpen}>
      <div className="room-card-top"><strong>{room.number}</strong><Pill status={room.status} /></div>
      <span className="room-card-name">{room.name}</span>
      <small>Room ID {room.masterProductId}</small>
      <div className="room-card-progress">
        <div className="room-progress"><i style={{ width: `${(done / list.length) * 100}%` }} /></div>
        <span>{done}/{list.length}</span>
      </div>
    </button>
  );
}

export function RoomClasses({ navigate }: PageProps) {
  const { data } = useStore();
  const classes = useScopedClasses();
  const { editClass } = useClassForms();
  const [classId, setClassId] = useState<string | null>(null);
  const [roomKey, setRoomKey] = useState<string | null>(null);
  const rooms = scoped(data, data.rooms);
  const cls = classId ? classes.find(c => c.id === classId) : undefined;

  if (classId && !cls) return <ScopeNote>Không tìm thấy hạng phòng. <button type="button" className="text-link" onClick={() => setClassId(null)}>Quay lại</button></ScopeNote>;

  if (cls && roomKey) {
    const room = rooms.find(r => roomKeyOf(r) === roomKey);
    if (roomKey === 'new' || !room) {
      return (
        <>
          <nav className="room-crumbs">
            <button type="button" className="text-link" onClick={() => setRoomKey(null)}><i className="bi bi-arrow-left" /> {cls.name}</button>
            <span>/</span><strong>Phòng mới</strong>
          </nav>
          <section className="panel room-detail-main"><RoomInfoForm classId={cls.id} onSaved={setRoomKey} /></section>
        </>
      );
    }
    const roomCls = classes.find(c => c.id === room.classId) ?? cls;
    return <RoomDetail room={room} cls={roomCls} navigate={navigate}
      onBack={() => { setClassId(roomCls.id); setRoomKey(null); }}
      onSaved={setRoomKey} />;
  }

  if (cls) {
    const list = rooms.filter(r => r.classId === cls.id);
    return (
      <>
        <nav className="room-crumbs">
          <button type="button" className="text-link" onClick={() => setClassId(null)}><i className="bi bi-arrow-left" /> Tất cả hạng phòng</button>
          <span>/</span><strong>{cls.name}</strong>
        </nav>
        <Toolbar>
          <div>
            <h2 className="room-class-title">{cls.name} <small>{cls.code} · {branchName(cls.branchId)}</small></h2>
            <span className="text-muted small">{list.length} phòng · Bấm vào phòng để cài đặt chi tiết</span>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-light" onClick={() => editClass(cls)}><i className="bi bi-pencil" /> Sửa hạng</button>
            <PrimaryButton icon="bi-plus-lg" onClick={() => setRoomKey('new')}>Thêm phòng</PrimaryButton>
          </div>
        </Toolbar>
        {list.length
          ? <div className="room-card-grid">{list.map(r => <RoomCard key={roomKeyOf(r)} room={r} onOpen={() => setRoomKey(roomKeyOf(r))} />)}</div>
          : <ScopeNote>Hạng phòng này chưa có phòng.</ScopeNote>}
      </>
    );
  }

  return (
    <>
      <Toolbar>
        <span className="text-muted small">{classes.length} hạng phòng · Bấm vào một hạng để xem các phòng</span>
        <PrimaryButton icon="bi-plus-lg" onClick={() => editClass()}>Hạng phòng</PrimaryButton>
      </Toolbar>
      <div className="class-list">
        {classes.map(c => {
          const list = rooms.filter(r => r.classId === c.id);
          const free = list.filter(r => r.status === 'available').length;
          return (
            <button type="button" className="class-row" key={c.id} onClick={() => setClassId(c.id)}>
              <span className="class-row-thumb">{c.image ? <img src={c.image} alt="" /> : <i className="bi bi-door-closed" />}</span>
              <span className="class-row-main"><strong>{c.name}</strong><small>{c.code} · {branchName(c.branchId)}</small></span>
              <span className="class-row-stat"><strong>{list.length}</strong><small>phòng</small></span>
              <span className="class-row-stat"><strong className="text-success">{free}</strong><small>đang trống</small></span>
              <i className="bi bi-chevron-right" />
            </button>
          );
        })}
      </div>
    </>
  );
}
