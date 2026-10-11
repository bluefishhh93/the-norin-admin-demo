import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field, Select } from '../../components/Form';
import { branchName } from '../../lib/format';
import { defaultBranch, isAllowedBranch, scoped } from '../../lib/scope';
import {
  DataTable,
  Panel,
  Pill,
  PrimaryButton,
  ScopeNote,
  TextLink,
  Toolbar
} from '../../components/ui';
import type { DemoData } from '../../types';

function BlockFields({ data }: { data: DemoData }) {
  const branchId = defaultBranch(data);
  const classes = data.classes.filter((c) => c.branchId === branchId);
  return (
    <>
      <input type="hidden" name="branchId" value={branchId} />
      <Select
        label="Hạng phòng"
        name="classId"
        options={classes.map((c) => [c.id, c.name])}
        required
      />
      <Field label="Từ thời điểm" name="from" type="datetime-local" required />
      <Field label="Đến thời điểm" name="to" type="datetime-local" required />
      <Field label="Lý do" name="reason" maxLength={100} required />
    </>
  );
}

export function Availability() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const list = scoped(data, data.blocks);

  const add = () =>
    modal.openForm({
      title: 'Khóa bán hạng phòng',
      body: <BlockFields data={data} />,
      onSubmit: (v) => {
        const cls = data.classes.find((c) => c.id === v.classId && c.branchId === v.branchId);
        if (!cls || !isAllowedBranch(data, v.branchId) || v.to <= v.from) {
          toast('Kiểm tra hạng phòng, chi nhánh và thời điểm kết thúc.');
          return false;
        }
        update((d) => {
          d.blocks.push({
            id: `BL-${crypto.randomUUID()}`,
            branchId: v.branchId,
            classId: cls.id,
            from: v.from,
            to: v.to,
            reason: v.reason,
            enabled: true
          });
        });
        toast('Đã lưu thay đổi trong bản demo.');
      }
    });

  const toggle = (id: string) => {
    const b = data.blocks.find((x) => x.id === id);
    if (!b || !isAllowedBranch(data, b.branchId)) return;
    update((d) => {
      const t = d.blocks.find((x) => x.id === id);
      if (t) t.enabled = !t.enabled;
    });
    toast(b.enabled ? 'Đã mở bán.' : 'Đã khóa bán.');
  };

  return (
    <>
      <Toolbar>
        <span className="text-muted small">
          Chặn bán hạng phòng theo khung giờ hoặc vô thời hạn
        </span>
        <PrimaryButton icon="bi-plus-lg" onClick={add}>
          Khóa bán
        </PrimaryButton>
      </Toolbar>
      <Panel title="Danh sách khóa bán" subtitle="Lịch tạm dừng bán hạng phòng trong bản demo">
        <DataTable
          headers={['CHI NHÁNH', 'HẠNG PHÒNG', 'TỪ', 'ĐẾN', 'LÝ DO', 'TRẠNG THÁI', 'THAO TÁC']}
        >
          {list.map((b) => (
            <tr key={b.id}>
              <td>
                <strong>{branchName(data, b.branchId)}</strong>
              </td>
              <td>
                {data.classes.find((c) => c.id === b.classId)?.name ??
                  'Hạng phòng không còn tồn tại'}
              </td>
              <td>{b.from.replace('T', ' ')}</td>
              <td>{b.to?.replace('T', ' ') || 'Vô thời hạn'}</td>
              <td>{b.reason}</td>
              <td>
                <Pill status={b.enabled ? 'cleaning' : 'available'} />
              </td>
              <td>
                <TextLink onClick={() => toggle(b.id)}>
                  {b.enabled ? 'Mở bán' : 'Khóa lại'}
                </TextLink>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      <ScopeNote>
        Khóa bán hạng phòng khác với trạng thái vệ sinh của từng phòng. Đây là dữ liệu minh họa,
        chưa ngăn đặt chỗ ở backend.
      </ScopeNote>
    </>
  );
}
