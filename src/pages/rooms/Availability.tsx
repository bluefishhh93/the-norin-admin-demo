import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field, Select } from '../../components/Form';
import { branches } from '../../seed/base';
import { branchName } from '../../lib/format';
import { defaultBranch, scopedWithAll } from '../../lib/scope';
import { DataTable, Panel, Pill, PrimaryButton, ScopeNote, TextLink, Toolbar } from '../../components/ui';

export function Availability() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const list = scopedWithAll(data, data.blocks);
  const branchOpts = (data.role === 'superadmin' ? branches : branches.filter(b => b.id === 'sontra')).map(b => [b.id, b.name] as [string, string]);

  const add = () => modal.openForm({
    title: 'Khóa bán hạng phòng',
    body: <>
      <Select label="Chi nhánh" name="branchId" options={branchOpts} defaultValue={defaultBranch(data)} required />
      <Field label="Hạng phòng" name="category" maxLength={50} required />
      <Field label="Từ thời điểm" name="from" type="datetime-local" required />
      <Field label="Đến thời điểm" name="to" type="datetime-local" required />
      <Field label="Lý do" name="reason" maxLength={100} required />
    </>,
    onSubmit: v => {
      if ((data.role !== 'superadmin' && v.branchId !== 'sontra') || v.to <= v.from) { toast('Kiểm tra chi nhánh và thời điểm kết thúc.'); return false; }
      update(d => { d.blocks.push({ id: `BL-${Date.now()}`, branchId: v.branchId, category: v.category, from: v.from, to: v.to, reason: v.reason, enabled: true }); });
      toast('Đã lưu thay đổi trong bản demo.');
    }
  });

  const toggle = (id: string) => {
    const b = data.blocks.find(x => x.id === id);
    if (!b || (data.role !== 'superadmin' && b.branchId !== 'sontra')) return;
    update(d => { const t = d.blocks.find(x => x.id === id); if (t) t.enabled = !t.enabled; });
    toast(b.enabled ? 'Đã mở bán.' : 'Đã khóa bán.');
  };

  return (
    <>
      <Toolbar>
        <span className="text-muted small">Chặn bán hạng phòng theo khung giờ hoặc vô thời hạn</span>
        <PrimaryButton icon="bi-plus-lg" onClick={add}>Khóa bán</PrimaryButton>
      </Toolbar>
      <Panel title="Danh sách khóa bán" subtitle="Lịch tạm dừng bán hạng phòng trong bản demo">
        <DataTable headers={['CHI NHÁNH', 'HẠNG PHÒNG', 'TỪ', 'ĐẾN', 'LÝ DO', 'TRẠNG THÁI', 'THAO TÁC']}>
          {list.map(b => (
            <tr key={b.id}>
              <td><strong>{branchName(b.branchId)}</strong></td>
              <td>{b.category}</td>
              <td>{b.from.replace('T', ' ')}</td>
              <td>{b.to?.replace('T', ' ') || 'Vô thời hạn'}</td>
              <td>{b.reason}</td>
              <td><Pill status={b.enabled ? 'cleaning' : 'available'} /></td>
              <td><TextLink onClick={() => toggle(b.id)}>{b.enabled ? 'Mở bán' : 'Khóa lại'}</TextLink></td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      <ScopeNote>Khóa bán hạng phòng khác với trạng thái vệ sinh của từng phòng. Đây là dữ liệu minh họa, chưa ngăn đặt chỗ ở backend.</ScopeNote>
    </>
  );
}
