import type { CashEntry, PayMethod } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field, Select } from '../../components/Form';
import { branches } from '../../seed/base';
import { branchName, fmtDateTime, methodLabel, money } from '../../lib/format';
import { defaultBranch, isAllowedBranch, scopedWithAll } from '../../lib/scope';
import { DataTable, MetricCard, Panel, PrimaryButton, Toolbar } from '../../components/ui';

const CATEGORIES = { in: ['Tiền phòng', 'Dịch vụ / đồ gọi thêm', 'Phụ thu', 'Thu khác'], out: ['Mua hàng', 'Hoàn tiền khách', 'Chi phí vận hành', 'Nộp tiền về công ty', 'Chi khác'] };

export function Cashbook() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const receipts: CashEntry[] = data.folios.flatMap(b => b.payments.map(p => ({
    id: p.id, type: 'in' as const, branchId: b.branchId, at: p.createdAt, category: 'Tiền phòng & dịch vụ',
    amount: Number(p.amount), method: p.method, note: `Folio ${b.code} · phòng ${b.room}`, by: p.collector || 'Kiosk'
  })));
  const list = scopedWithAll(data, [...data.cashbook, ...receipts]).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const sum = (type: 'in' | 'out', method?: PayMethod) => list.filter(x => x.type === type && (!method || x.method === method)).reduce((s, x) => s + x.amount, 0);
  const branchChoices = (data.role === 'superadmin' ? branches : branches.filter(b => b.id === 'sontra')).map(b => [b.id, b.name] as [string, string]);

  const openForm = (type: 'in' | 'out') => modal.openForm({
    title: type === 'in' ? 'Lập phiếu thu' : 'Lập phiếu chi', submitLabel: 'Lưu', size: 'lg',
    body: <div className="row g-3">
      <div className="col-sm-6"><Select label="Chi nhánh" name="branchId" options={branchChoices} defaultValue={defaultBranch(data)} /></div>
      <div className="col-sm-6"><Select label="Hạng mục" name="category" options={CATEGORIES[type].map(c => [c, c])} /></div>
      <div className="col-sm-6"><Field label="Số tiền (₫)" name="amount" type="number" min={1000} step={1000} required /></div>
      <div className="col-sm-6"><Select label="Phương thức" name="method" options={Object.entries(methodLabel)} defaultValue="cash" /></div>
      <div className="col-12"><Field label="Ghi chú / mã booking" name="note" maxLength={120} /></div>
      <div className="col-12"><Field label="Người lập" name="by" defaultValue="Lễ tân" required maxLength={60} /></div>
    </div>,
    onSubmit: v => {
      const amount = Number(v.amount);
      if (!Number.isSafeInteger(amount) || amount < 1000 || !isAllowedBranch(data, v.branchId)) { toast('Kiểm tra số tiền và chi nhánh.'); return false; }
      update(d => {
        const n = d.cashbook.filter(x => x.type === type).length + 1;
        d.cashbook.push({ id: `${type === 'in' ? 'PT' : 'PC'}-${String(n).padStart(4, '0')}`, type, at: new Date().toISOString(), branchId: v.branchId, category: v.category, amount, method: v.method as PayMethod, note: v.note, by: v.by });
      });
      toast(`Đã lập ${type === 'in' ? 'phiếu thu' : 'phiếu chi'} ${money(amount)}.`);
    }
  });

  return (
    <>
      <div className="metric-grid">
        <MetricCard label="Tổng thu" value={money(sum('in'))} />
        <MetricCard label="Tổng chi" value={money(sum('out'))} />
        <MetricCard label="Tồn quỹ tiền mặt" value={money(sum('in', 'cash') - sum('out', 'cash'))} />
        <MetricCard label="Số phiếu" value={list.length} />
      </div>
      <Toolbar>
        <span className="text-muted small">Tiền thu từ booking ở trang Thu ngân được ghi vào sổ quỹ tự động</span>
        <div className="d-flex gap-2">
          <PrimaryButton icon="bi-plus-lg" onClick={() => openForm('in')}>Phiếu thu</PrimaryButton>
          <PrimaryButton icon="bi-dash-lg" onClick={() => openForm('out')}>Phiếu chi</PrimaryButton>
        </div>
      </Toolbar>
      <Panel title="Sổ quỹ" subtitle="Thu chi tiền mặt, chuyển khoản và thẻ theo chi nhánh">
        <DataTable headers={['MÃ PHIẾU', 'THỜI GIAN', 'CHI NHÁNH', 'LOẠI', 'PHƯƠNG THỨC', 'SỐ TIỀN', 'GHI CHÚ', 'NGƯỜI LẬP']}>
          {list.map(x => (
            <tr key={x.id}>
              <td><strong>{x.id}</strong></td><td>{fmtDateTime(x.at)}</td><td>{branchName(x.branchId)}</td><td>{x.category}</td>
              <td>{methodLabel[x.method] || x.method}</td>
              <td><strong className={x.type === 'out' ? 'workflow-alert' : ''}>{x.type === 'out' ? '−' : '+'}{money(x.amount)}</strong></td>
              <td>{x.note || '—'}</td><td>{x.by}</td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
