import type { Room } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { branchName } from '../../lib/format';
import { isAllowedBranch, scoped } from '../../lib/scope';
import { DataTable, Panel, TextLink } from '../../components/ui';

export function RoomMusic() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const rooms = scoped(data, data.rooms);
  const setMusic = (room: Room, file: string) => update(d => {
    const target = d.rooms.find(r => r.branchId === room.branchId && r.number === room.number);
    if (target) target.musicFile = file;
  });

  const upload = (room: Room) => {
    if (!isAllowedBranch(data, room.branchId)) return;
    modal.openForm({
      title: `Nhạc phòng ${room.number}`, submitLabel: 'Tải lên',
      body: <label className="form-label d-block">File MP3 (tối đa 5MB)<input className="form-control mt-1" type="file" name="music" accept="audio/mpeg" required /></label>,
      onSubmit: (_v, form) => {
        const file = (form.elements.namedItem('music') as HTMLInputElement).files?.[0];
        if (!file || file.type !== 'audio/mpeg' || file.size > 5 * 1024 * 1024) { toast('Chỉ nhận MP3 tối đa 5MB.'); return false; }
        setMusic(room, file.name);
        toast(`Đã gán nhạc cho phòng ${room.number}.`);
      }
    });
  };

  const remove = (room: Room) => {
    if (!isAllowedBranch(data, room.branchId) || !confirm(`Xóa nhạc phòng ${room.number}?`)) return;
    setMusic(room, '');
    toast('Đã xóa nhạc.');
  };

  return (
    <Panel title="Nhạc tablet theo phòng" subtitle="Mỗi phòng một file MP3, tối đa 5MB; tablet tải theo Room ID">
      <DataTable headers={['PHÒNG', 'CHI NHÁNH', 'ROOM ID', 'NHẠC', 'THAO TÁC']}>
        {rooms.map(r => (
          <tr key={`${r.branchId}:${r.number}`}>
            <td><strong>{r.number}</strong><small>{r.name || ''}</small></td>
            <td>{branchName(r.branchId)}</td>
            <td>{Number(r.masterProductId) || '—'}</td>
            <td>{r.musicFile ? <><i className="bi bi-music-note-beamed" /> {r.musicFile}</> : <span className="text-muted">Chưa có</span>}</td>
            <td>
              <TextLink icon="bi-upload" onClick={() => upload(r)}>{r.musicFile ? 'Đổi nhạc' : 'Tải lên'}</TextLink>{' '}
              {r.musicFile && <TextLink icon="bi-trash" onClick={() => remove(r)}>Xóa</TextLink>}
            </td>
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}
