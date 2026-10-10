import type { Room, RoomClass } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field, Select } from '../../components/Form';
import { branches } from '../../seed/base';
import { branchName } from '../../lib/format';
import { defaultBranch, isAllowedBranch } from '../../lib/scope';

const BASE_STEPS = [
  { fromThHour: 1, toHour: 2, price: 490000, type: 'block' as const },
  { fromThHour: 3, toHour: 8, price: 120000, type: 'hourly' as const }
];

const CLASS_TEXT: [keyof RoomClass, string, number][] = [
  ['description', 'Mô tả ngắn', 200], ['image', 'Ảnh đại diện (URL)', 500]
];

export const useScopedClasses = () => {
  const { data } = useStore();
  return data.classes.filter(c => data.role === 'superadmin' ? data.branchId === 'all' || c.branchId === data.branchId : c.branchId === 'sontra');
};

export function useClassForms() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const scopedClasses = useScopedClasses();
  const branchOpts = (data.role === 'superadmin' ? branches : branches.filter(b => b.id === 'sontra')).map(b => [b.id, b.name] as [string, string]);

  const editClass = (item?: RoomClass) => modal.openForm({
    title: item ? 'Sửa hạng phòng' : 'Tạo hạng phòng',
    body: <>
      <Select label="Chi nhánh" name="branchId" options={branchOpts} defaultValue={item?.branchId ?? defaultBranch(data)} required />
      <Field label="Tên hạng" name="name" defaultValue={item?.name ?? ''} maxLength={80} required />
      <Field label="Mã hạng" name="code" defaultValue={item?.code ?? ''} maxLength={40} required />
      {CLASS_TEXT.map(([key, label, max]) => <Field key={key} label={label} name={key} defaultValue={String(item?.[key] ?? '')} maxLength={max} />)}
    </>,
    onSubmit: v => {
      const movedWithRooms = item && item.branchId !== v.branchId && data.rooms.some(r => r.classId === item.id);
      const duplicate = data.classes.some(c => c.id !== item?.id && c.branchId === v.branchId &&
        (c.code.toLowerCase() === v.code.toLowerCase() || c.name.toLowerCase() === v.name.toLowerCase()));
      if (!isAllowedBranch(data, v.branchId) || movedWithRooms || duplicate) {
        toast('Tên hoặc mã hạng trùng, hoặc không thể chuyển hạng đang có phòng sang chi nhánh khác.'); return false;
      }
      update(d => {
        const target = item && d.classes.find(c => c.id === item.id);
        if (target) {
          d.pricebooks.filter(p => p.branchId === target.branchId && p.category === target.name).forEach(p => { p.category = v.name; p.branchId = v.branchId; });
          Object.assign(target, v);
        } else {
          d.classes.push({ ...(v as unknown as RoomClass), id: `class-${Date.now()}`, active: true });
          d.pricebooks.push({ branchId: v.branchId, category: v.name, hourly: 490000, overnight: 890000, daily: 1490000, hourlySteps: structuredClone(BASE_STEPS) });
        }
      });
      toast('Đã lưu thay đổi trong bản demo.');
    }
  });

  const editRoom = (classId?: string, room?: Room) => {
    const available = scopedClasses.filter(c => !room || c.branchId === room.branchId);
    const fallback = data.classes.find(c => c.id === classId)?.id ?? available[0]?.id;
    modal.openForm({
      title: room ? 'Sửa phòng vật lý' : 'Tạo phòng vật lý',
      body: <>
        <Select label="Hạng phòng" name="classId" options={available.map(c => [c.id, `${branchName(c.branchId)} · ${c.name}`])} defaultValue={room?.classId ?? fallback} required />
        <Field label="Số phòng hiển thị" name="number" defaultValue={room?.number ?? ''} pattern="[A-Za-z0-9-]{1,16}" maxLength={16} required />
        <Field label="Tên phòng" name="name" defaultValue={room?.name ?? ''} maxLength={80} required />
        <Field label="Room ID (masterProductId)" name="masterProductId" type="number" min={1} defaultValue={room?.masterProductId ?? ''} required />
        <Field label="Mô tả" name="description" defaultValue={room?.description ?? ''} maxLength={500} />
        <Field label="Tiện nghi (ngăn cách bằng dấu phẩy)" name="amenities" defaultValue={room?.amenities ?? ''} maxLength={500} />
        <Field label="Nhạc phòng (URL)" name="music" defaultValue={room?.music ?? ''} maxLength={500} />
        <Field label="Ảnh phòng (URL)" name="image" defaultValue={room?.images?.[0] ?? ''} maxLength={500} />
      </>,
      onSubmit: v => {
        const cls = data.classes.find(c => c.id === v.classId);
        const id = +v.masterProductId;
        const clash = data.rooms.some(r => (!room || roomKeyOf(r) !== roomKeyOf(room)) &&
          (r.masterProductId === id || (cls && r.branchId === cls.branchId && r.number.toLowerCase() === v.number.toLowerCase())));
        const linked = room && (room.number !== v.number || room.classId !== v.classId || room.masterProductId !== id) &&
          (data.bookings.some(b => b.branchId === room.branchId && b.room === room.number) || data.locks.some(l => l.branchId === room.branchId && l.room === room.number));
        if (!cls || !isAllowedBranch(data, cls.branchId) || !Number.isSafeInteger(id) || id <= 0 || clash || linked) {
          toast('Phòng trùng số hoặc đã liên kết đặt phòng/TTLock.'); return false;
        }
        const details = { classId: cls.id, number: v.number, name: v.name, masterProductId: id, description: v.description, amenities: v.amenities, music: v.music, images: v.image ? [v.image] : [] };
        update(d => {
          const target = room && d.rooms.find(r => roomKeyOf(r) === roomKeyOf(room));
          if (target) Object.assign(target, details);
          else d.rooms.push({ branchId: cls.branchId, ...details, status: 'available' });
        });
        toast('Đã lưu thay đổi trong bản demo.');
      }
    });
  };

  return { editClass, editRoom };
}

const roomKeyOf = (r: Pick<Room, 'branchId' | 'number'>) => `${r.branchId}:${r.number}`;
