import type { Voucher } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field, Select } from '../../components/Form';
import { branches } from '../../seed/base';
import { branchName, money } from '../../lib/format';
import { scopedWithAll } from '../../lib/scope';
import { DataTable, Panel, PrimaryButton, ScopeNote, TextLink, Toolbar } from '../../components/ui';

const WEEKDAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const CODE_STATUS: Record<string, string> = { available: 'Chưa dùng', reserved: 'Đang giữ', used: 'Đã dùng' };

const voucherStatus = (v: Voucher) => {
  const today = new Date().toISOString().slice(0, 10);
  if (!v.active) return 'Tạm dừng';
  if (v.starts > today) return 'Sắp diễn ra';
  if (v.ends < today) return 'Hết hạn';
  if (v.used >= v.quota) return 'Hết lượt';
  return 'Đang áp dụng';
};

export function Vouchers() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const isSuper = data.role === 'superadmin';
  const list = scopedWithAll(data, data.vouchers);

  const showCodes = (v: Voucher) => modal.openInfo({
    title: `Mã voucher · ${v.name}`,
    body: <DataTable headers={['MÃ', 'TRẠNG THÁI', 'BOOKING']}>
      {v.codes.map(c => <tr key={c.code}><td><strong>{c.code}</strong></td><td>{CODE_STATUS[c.status] || c.status}</td><td>{c.bookingCode || '—'}</td></tr>)}
    </DataTable>
  });

  const openForm = (voucher?: Voucher) => {
    const branchOpts: [string, string][] = isSuper
      ? [['all', 'Toàn hệ thống'], ...branches.map(b => [b.id, b.name] as [string, string])]
      : [['sontra', branchName('sontra')]];
    const selectedDays = voucher?.weekdays ?? [1, 2, 3, 4, 5, 6, 7];
    modal.openForm({
      title: voucher ? 'Sửa voucher' : 'Tạo voucher',
      body: <>
        <Select label="Phạm vi chi nhánh" name="branchId" options={branchOpts} defaultValue={voucher?.branchId ?? branchOpts[0][0]} />
        <Field label="Tên chương trình" name="name" defaultValue={voucher?.name ?? ''} maxLength={70} required />
        <Field label="Mã voucher" name="code" defaultValue={voucher?.code ?? ''} maxLength={24} required />
        <Select label="Kiểu ưu đãi" name="type" options={[['percent', 'Phần trăm'], ['fixed', 'Số tiền cố định']]} defaultValue={voucher?.type ?? 'percent'} />
        <Field label="Giá trị" name="value" type="number" min={1} defaultValue={voucher?.value ?? 10} required />
        <Select label="Phạm vi giảm" name="scope" options={[['ROOM_ONLY', 'Giá phòng'], ['ENTIRE_BILL', 'Toàn hóa đơn']]} defaultValue={voucher?.scope ?? 'ROOM_ONLY'} />
        <Select label="Áp dụng lưu trú" name="stay" options={['Tất cả', 'Theo giờ', 'Qua đêm', 'Theo ngày'].map(s => [s, s])} defaultValue={voucher?.stay ?? 'Tất cả'} />
        <Select label="Áp dụng mã" name="mode" options={[['MANUAL', 'MANUAL'], ['AUTO', 'AUTO']]} defaultValue={voucher?.mode ?? 'MANUAL'} />
        <Field label="Bắt đầu" name="starts" type="date" defaultValue={voucher?.starts ?? '2026-10-08'} required />
        <Field label="Kết thúc" name="ends" type="date" defaultValue={voucher?.ends ?? '2026-12-31'} required />
        <Field label="Số lượt phát hành" name="quota" type="number" min={1} defaultValue={voucher?.quota ?? 100} required />
        <fieldset className="voucher-weekdays">
          <legend>Thứ áp dụng</legend>
          <div className="d-flex flex-wrap gap-2">
            {WEEKDAY_NAMES.map((day, i) => <label key={day}><input type="checkbox" name="weekdays" value={i + 1} defaultChecked={selectedDays.includes(i + 1)} /> {day}</label>)}
          </div>
        </fieldset>
      </>,
      onSubmit: (v, form) => {
        const weekdays = [...form.querySelectorAll<HTMLInputElement>('input[name="weekdays"]:checked')].map(i => Number(i.value));
        const code = v.code.trim().toUpperCase();
        if (!isSuper && v.branchId !== 'sontra') return false;
        if (!weekdays.length || v.ends < v.starts || +v.quota < (voucher?.used ?? 0) || (v.type === 'percent' && +v.value > 100) || data.vouchers.some(x => x.code === code && x.id !== voucher?.id)) {
          toast('Kiểm tra ngày, giá trị, số lượt và mã voucher trùng.'); return false;
        }
        const fields = {
          branchId: v.branchId, name: v.name, code, type: v.type as Voucher['type'], value: +v.value, scope: v.scope as Voucher['scope'],
          stay: v.stay, mode: v.mode as Voucher['mode'], starts: v.starts, ends: v.ends, quota: +v.quota, weekdays
        };
        update(d => {
          const target = voucher && d.vouchers.find(x => x.id === voucher.id);
          if (target) Object.assign(target, fields);
          else d.vouchers.push({ id: `VC-${Date.now()}`, ...fields, used: 0, active: true, codes: [{ code, status: 'available', bookingCode: '' }] });
        });
        toast('Đã lưu thay đổi trong bản demo.');
      }
    });
  };

  return (
    <>
      <Toolbar>
        <span className="text-muted small">Ưu đãi phòng và toàn hóa đơn</span>
        <PrimaryButton icon="bi-plus-lg" onClick={() => openForm()}>Tạo voucher</PrimaryButton>
      </Toolbar>
      <Panel title="Chương trình voucher" subtitle="Mã thủ công hoặc tự động, thời hạn và số lượt sử dụng">
        <DataTable headers={['CHƯƠNG TRÌNH / MÃ', 'CHI NHÁNH', 'ƯU ĐÃI', 'ÁP DỤNG', 'THỜI HẠN', 'LƯỢT DÙNG', 'TRẠNG THÁI', 'THAO TÁC']}>
          {list.map(v => (
            <tr key={v.id}>
              <td><strong>{v.name}</strong><small>{v.code} · {v.mode}</small></td>
              <td>{v.branchId === 'all' ? 'Toàn hệ thống' : branchName(v.branchId)}</td>
              <td>{v.type === 'percent' ? `${v.value}%` : money(v.value)}</td>
              <td>{v.scope === 'ROOM_ONLY' ? 'Giá phòng' : 'Toàn hóa đơn'}<small>{v.stay} · {v.weekdays.map(day => WEEKDAY_NAMES[day - 1]).filter(Boolean).join(', ')}</small></td>
              <td>{v.starts} → {v.ends}</td>
              <td>{v.used}/{v.quota}</td>
              <td>{voucherStatus(v)}</td>
              <td>{v.branchId === 'all' && !isSuper ? 'Chỉ xem' : <>
                <TextLink icon="bi-list-ul" onClick={() => showCodes(v)}>Mã</TextLink>{' '}
                <TextLink onClick={() => openForm(v)}>Sửa</TextLink>
              </>}</td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      <ScopeNote>Voucher được kiểm tra khi tạo booking theo chi nhánh, lịch lưu trú, thời hạn, thứ và số lượt. Ưu đãi chỉ áp dụng cho booking ban đầu, không cộng thêm cho sản phẩm hoặc gia hạn về sau.</ScopeNote>
    </>
  );
}
