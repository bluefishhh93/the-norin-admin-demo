import { useState } from 'react';
import type { Room } from '../../types';
import { useStore } from '../../store';
import { ttlockCatalog } from '../../seed/operations';
import { QrDomainInput, QrImage } from './RoomQr';
import { roomQrUrl } from '../../lib/roomQr';
import { roomKeyOf } from './RoomInfoForm';

export function MusicTab({ room }: { room: Room }) {
  const { update, toast } = useStore();
  const setMusic = (file: string) => update(d => {
    const t = d.rooms.find(r => roomKeyOf(r) === roomKeyOf(room));
    if (t) t.musicFile = file;
  });
  const onFile = (file?: File) => {
    if (!file) return;
    if (file.type !== 'audio/mpeg' || file.size > 5 * 1024 * 1024) { toast('Chỉ nhận MP3 tối đa 5MB.'); return; }
    setMusic(file.name);
    toast(`Đã gán nhạc cho phòng ${room.number}.`);
  };
  return (
    <div className="room-setting-box">
      <div className="room-setting-row">
        <span className="room-setting-icon"><i className="bi bi-music-note-beamed" /></span>
        <div className="flex-grow-1">
          <strong>{room.musicFile || 'Chưa có nhạc'}</strong>
          <small>Tablet tại phòng tự phát theo Room ID {room.masterProductId}. MP3, tối đa 5MB.</small>
        </div>
        <label className="btn-primary-custom mb-0">
          <i className="bi bi-upload" /> {room.musicFile ? 'Đổi nhạc' : 'Tải lên'}
          <input type="file" accept="audio/mpeg" hidden onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {room.musicFile && <button type="button" className="btn btn-light" onClick={() => { setMusic(''); toast('Đã xóa nhạc.'); }}>Xóa</button>}
      </div>
    </div>
  );
}

export function LockTab({ room }: { room: Room }) {
  const { data, update, toast } = useStore();
  const lock = data.locks.find(l => l.branchId === room.branchId && l.room === room.number);
  const [lockId, setLockId] = useState(String(lock?.lockId ?? ''));
  const save = () => {
    const id = +lockId;
    const alias = ttlockCatalog.find(x => x.lockId === id)?.alias;
    if (!alias) { toast('Chọn khóa TTLock.'); return; }
    if (data.locks.some(l => l.id !== lock?.id && l.lockId === id)) { toast('Khóa này đã gán cho phòng khác.'); return; }
    update(d => {
      const t = lock && d.locks.find(l => l.id === lock.id);
      const fields = { branchId: room.branchId, room: room.number, masterProductId: room.masterProductId, lockId: id, alias };
      if (t) Object.assign(t, fields); else d.locks.push({ id: `LK-${Date.now()}`, ...fields });
    });
    toast('Đã lưu mapping TTLock.');
  };
  const remove = () => {
    if (!lock || !confirm(`Gỡ khóa ${lock.alias} khỏi phòng ${room.number}?`)) return;
    update(d => { d.locks = d.locks.filter(l => l.id !== lock.id); });
    setLockId('');
    toast('Đã gỡ mapping.');
  };
  return (
    <div className="room-setting-box">
      <div className="room-setting-row">
        <span className="room-setting-icon"><i className="bi bi-key" /></span>
        <div className="flex-grow-1">
          <strong>{lock ? `${lock.alias} · ${lock.lockId}` : 'Chưa gán khóa'}</strong>
          <small>Mapping theo Room ID {room.masterProductId}. Danh sách khóa là dữ liệu mẫu.</small>
        </div>
      </div>
      <div className="d-flex gap-2 mt-3">
        <select className="form-select" value={lockId} onChange={e => setLockId(e.target.value)}>
          <option value="">Chọn khóa TTLock</option>
          {ttlockCatalog.map(x => (
            <option key={x.lockId} value={x.lockId} disabled={data.locks.some(l => l.lockId === x.lockId && l.id !== lock?.id)}>{x.alias} · {x.lockId}</option>
          ))}
        </select>
        <button type="button" className="btn-primary-custom" onClick={save}>Lưu</button>
        {lock && <button type="button" className="btn btn-light" onClick={remove}>Gỡ</button>}
      </div>
    </div>
  );
}

export function QrTab({ room, navigate }: { room: Room; navigate: (p: string) => void }) {
  const { data } = useStore();
  if (!data.qrDomain) {
    return (
      <div className="room-setting-box">
        <p className="text-muted small mb-3">Chưa cấu hình tên miền trang khách để tạo QR.</p>
        <QrDomainInput />
      </div>
    );
  }
  return (
    <div className="room-setting-box">
      <div className="branch-qr-card single">
        <QrImage url={roomQrUrl(data.qrDomain, room.masterProductId)} id={room.masterProductId} name={room.name}
          caption={<div className="branch-qr-cap"><strong>{room.name}</strong><small>Room ID: {room.masterProductId}</small></div>} />
      </div>
      <button type="button" className="text-link mt-3" onClick={() => navigate('branches')}>QR tất cả phòng của chi nhánh <i className="bi bi-arrow-right" /></button>
    </div>
  );
}
