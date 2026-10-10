import { useState } from 'react';
import type { Lock } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { ttlockCatalog } from '../../seed/operations';
import { branches } from '../../seed/base';
import { branchName } from '../../lib/format';
import { defaultBranch, scopedWithAll } from '../../lib/scope';
import { DataTable, Panel, PrimaryButton, ScopeNote, TextLink, Toolbar } from '../../components/ui';

function LockFields({ lock }: { lock?: Lock }) {
  const { data } = useStore();
  const allowed = data.role === 'superadmin' ? branches : branches.filter(b => b.id === 'sontra');
  const [branchId, setBranchId] = useState(lock?.branchId ?? defaultBranch(data));
  const rooms = data.rooms.filter(r => (data.role === 'superadmin' || r.branchId === 'sontra') && r.branchId === branchId);
  const [room, setRoom] = useState(lock?.room ?? rooms[0]?.number ?? '');
  const roomValue = rooms.some(r => r.number === room) ? room : rooms[0]?.number ?? '';
  const masterProductId = rooms.find(r => r.number === roomValue)?.masterProductId ?? '';

  return (
    <>
      <label className="form-label d-block">Chi nhánh
        <select className="form-select mt-1" name="branchId" value={branchId} onChange={e => setBranchId(e.target.value)}>
          {allowed.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>
      <label className="form-label d-block">Phòng
        <select className="form-select mt-1" name="room" value={roomValue} onChange={e => setRoom(e.target.value)}>
          {rooms.map(r => <option key={r.number} value={r.number}>{r.number}</option>)}
        </select>
      </label>
      <label className="form-label d-block">Room ID (masterProductId)
        <input className="form-control mt-1" name="masterProductId" type="number" value={masterProductId} readOnly required />
      </label>
      <label className="form-label d-block">Khóa TTLock (dữ liệu mẫu, chưa kết nối API)
        <select className="form-select mt-1" name="lockId" defaultValue={lock?.lockId}>
          {ttlockCatalog.map(item => (
            <option key={item.lockId} value={item.lockId} disabled={data.locks.some(m => m.lockId === item.lockId && m.id !== lock?.id)}>{item.alias} · {item.lockId}</option>
          ))}
        </select>
      </label>
    </>
  );
}

export function Locks() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const list = scopedWithAll(data, data.locks);

  const openForm = (lock?: Lock) => modal.openForm({
    title: lock ? 'Sửa mapping TTLock' : 'Thêm mapping TTLock',
    body: <LockFields lock={lock} />,
    onSubmit: v => {
      if (data.role !== 'superadmin' && v.branchId !== 'sontra') return false;
      const room = data.rooms.find(r => r.branchId === v.branchId && r.number === v.room);
      const masterProductId = room?.masterProductId;
      if (!masterProductId || masterProductId !== +v.masterProductId) { toast('Room ID phải thuộc đúng phòng và chi nhánh.'); return false; }
      const lockId = +v.lockId;
      if (data.locks.some(x => x.id !== lock?.id && (x.lockId === lockId || +x.masterProductId === masterProductId))) { toast('Room ID hoặc TTLock ID đã có mapping.'); return false; }
      const alias = ttlockCatalog.find(x => x.lockId === lockId)?.alias;
      if (!alias) { toast('Chọn khóa từ danh sách TTLock.'); return false; }
      const fields = { branchId: v.branchId, room: v.room, masterProductId, lockId, alias };
      update(d => {
        const target = lock && d.locks.find(x => x.id === lock.id);
        if (target) Object.assign(target, fields);
        else d.locks.push({ id: `LK-${Date.now()}`, ...fields });
      });
      toast('Đã lưu thay đổi trong bản demo.');
    }
  });

  const remove = (lock: Lock) => {
    if (!confirm(`Xóa mapping ${lock.alias}?`)) return;
    update(d => { d.locks = d.locks.filter(x => x.id !== lock.id); });
    toast('Đã xóa mapping trong bản demo.');
  };

  return (
    <>
      <Toolbar>
        <span className="text-muted small">Chọn phòng thuộc đúng chi nhánh, Room ID tự điền theo phòng đã khai báo</span>
        <PrimaryButton icon="bi-plus-lg" onClick={() => openForm()}>Thêm mapping</PrimaryButton>
      </Toolbar>
      <Panel title="Mapping TTLock" subtitle="Chọn phòng và khóa từ danh sách TTLock mẫu (chưa kết nối API)">
        <DataTable headers={['CHI NHÁNH / PHÒNG', 'ROOM ID', 'TTLOCK ID / TÊN', 'THAO TÁC']}>
          {list.map(l => (
            <tr key={l.id}>
              <td><strong>{branchName(l.branchId)} · {l.room}</strong></td>
              <td>{l.masterProductId}</td>
              <td><strong>{l.lockId}</strong><small>{l.alias}</small></td>
              <td><TextLink onClick={() => openForm(l)}>Sửa</TextLink>{' '}<TextLink icon="bi-trash" onClick={() => remove(l)}>Xóa</TextLink></td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      <ScopeNote icon="bi-shield-lock">Mapping theo Room ID (masterProductId); số phòng là nhãn hiển thị. Danh sách khóa và gateway hiện là mẫu, không gửi lệnh mở khóa thật.</ScopeNote>
    </>
  );
}
