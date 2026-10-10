import { useState, type FormEvent } from 'react';
import type { Room } from '../../types';
import { useStore } from '../../store';
import { branchName } from '../../lib/format';
import { isAllowedBranch } from '../../lib/scope';
import { useScopedClasses } from './classForms';
import { RoomGallery } from './RoomGallery';

export const roomKeyOf = (r: Pick<Room, 'branchId' | 'number'>) => `${r.branchId}:${r.number}`;

export function RoomInfoForm({ room, classId, onSaved }: { room?: Room; classId: string; onSaved: (key: string) => void }) {
  const { data, update, toast } = useStore();
  const classes = useScopedClasses().filter(c => !room || c.branchId === room.branchId);
  const [images, setImages] = useState<string[]>(room?.images ?? []);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const cls = data.classes.find(c => c.id === v.classId);
    const id = +v.masterProductId;
    const number = v.number.trim();
    const clash = data.rooms.some(r => (!room || roomKeyOf(r) !== roomKeyOf(room)) &&
      (r.masterProductId === id || (cls && r.branchId === cls.branchId && r.number.toLowerCase() === number.toLowerCase())));
    const linked = room && (room.number !== number || room.masterProductId !== id) &&
      (data.bookings.some(b => b.branchId === room.branchId && b.room === room.number) || data.locks.some(l => l.branchId === room.branchId && l.room === room.number));
    if (!cls || !isAllowedBranch(data, cls.branchId) || !Number.isSafeInteger(id) || id <= 0) { toast('Kiểm tra hạng phòng và Room ID.'); return; }
    if (clash) { toast('Số phòng hoặc Room ID đã tồn tại.'); return; }
    if (linked) { toast('Phòng đã có đặt phòng/TTLock, không thể đổi số phòng hoặc Room ID.'); return; }
    const details: Partial<Room> = { classId: cls.id, number, name: v.name.trim(), masterProductId: id, images };
    update(d => {
      const target = room && d.rooms.find(r => roomKeyOf(r) === roomKeyOf(room));
      if (target) Object.assign(target, details);
      else d.rooms.push({ branchId: cls.branchId, status: 'available', description: '', amenities: '', music: '', ...details } as Room);
    });
    toast(room ? 'Đã lưu thông tin phòng.' : 'Đã tạo phòng.');
    onSaved(`${cls.branchId}:${number}`);
  };

  return (
    <form className="room-form" onSubmit={submit} key={room ? roomKeyOf(room) : 'new'}>
      <div className="room-form-section">
        <h3>Định danh</h3>
        <div className="room-form-grid">
          <label className="form-label">Hạng phòng
            <select className="form-select mt-1" name="classId" defaultValue={room?.classId ?? classId} required>
              {classes.map(c => <option key={c.id} value={c.id}>{branchName(c.branchId)} · {c.name}</option>)}
            </select>
          </label>
          <label className="form-label">Số phòng<input className="form-control mt-1" name="number" defaultValue={room?.number ?? ''} pattern="[A-Za-z0-9-]{1,16}" maxLength={16} required /></label>
          <label className="form-label">Tên phòng<input className="form-control mt-1" name="name" defaultValue={room?.name ?? ''} maxLength={80} required /></label>
          <label className="form-label">Room ID (masterProductId)<input className="form-control mt-1" name="masterProductId" type="number" min={1} defaultValue={room?.masterProductId ?? ''} required /></label>
        </div>
      </div>
      <div className="room-form-section">
        <h3>Ảnh phòng</h3>
        <RoomGallery images={images} onChange={setImages} />
      </div>
      <div className="room-form-footer"><button type="submit" className="btn-primary-custom">{room ? 'Lưu thông tin' : 'Tạo phòng'}</button></div>
    </form>
  );
}
