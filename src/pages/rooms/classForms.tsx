import type { RoomClass } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field, Select } from '../../components/Form';
import { defaultBranch, isAllowedBranch, scoped } from '../../lib/scope';

const BASE_STEPS = [
  { fromThHour: 1, toHour: 2, price: 490000, type: 'block' as const },
  { fromThHour: 3, toHour: 8, price: 120000, type: 'hourly' as const }
];

export const useScopedClasses = () => {
  const { data } = useStore();
  return scoped(data, data.classes);
};

export function useClassForms() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const branchOpts = data.branches
    .filter((b) => isAllowedBranch(data, b.id))
    .map((b) => [b.id, b.name] as [string, string]);

  const editClass = (item?: RoomClass) =>
    modal.openForm({
      title: item ? 'Sửa hạng phòng' : 'Tạo hạng phòng',
      body: (
        <>
          <Select
            label="Chi nhánh"
            name="branchId"
            options={branchOpts}
            defaultValue={item?.branchId ?? defaultBranch(data)}
            required
          />
          <Field
            label="Tên hạng"
            name="name"
            defaultValue={item?.name ?? ''}
            maxLength={80}
            required
          />
          <Field
            label="Mã hạng"
            name="code"
            defaultValue={item?.code ?? ''}
            maxLength={40}
            required
          />
          <Field
            label="Mô tả ngắn"
            name="description"
            defaultValue={item?.description ?? ''}
            maxLength={200}
          />
          <Field
            label="Ảnh đại diện (URL)"
            name="image"
            defaultValue={item?.image ?? ''}
            maxLength={500}
          />
        </>
      ),
      onSubmit: (v) => {
        const name = v.name.trim(),
          code = v.code.trim();
        const movedWithRooms =
          item && item.branchId !== v.branchId && data.rooms.some((r) => r.classId === item.id);
        const duplicate = data.classes.some(
          (c) =>
            c.id !== item?.id &&
            c.branchId === v.branchId &&
            (c.code.toLowerCase() === code.toLowerCase() ||
              c.name.toLowerCase() === name.toLowerCase())
        );
        if (!name || !code || !isAllowedBranch(data, v.branchId) || movedWithRooms || duplicate) {
          toast(
            'Tên hoặc mã hạng trùng, hoặc không thể chuyển hạng đang có phòng sang chi nhánh khác.'
          );
          return false;
        }
        update((d) => {
          const target = item && d.classes.find((c) => c.id === item.id);
          const fields = {
            branchId: v.branchId,
            name,
            code,
            description: v.description,
            image: v.image
          };
          if (target) {
            d.pricebooks
              .filter((p) => p.classId === target.id)
              .forEach((p) => {
                p.branchId = v.branchId;
              });
            d.blocks
              .filter((b) => b.classId === target.id)
              .forEach((b) => {
                b.branchId = v.branchId;
              });
            Object.assign(target, fields);
          } else {
            const id = `class-${crypto.randomUUID()}`;
            d.classes.push({
              id,
              ...fields,
              amenities: '',
              privileges: '',
              music: '',
              active: true
            });
            d.pricebooks.push({
              branchId: v.branchId,
              classId: id,
              hourly: 490000,
              overnight: 890000,
              daily: 1490000,
              hourlySteps: structuredClone(BASE_STEPS)
            });
          }
        });
        toast('Đã lưu thay đổi trong bản demo.');
      }
    });

  return { editClass };
}
