import type { Product } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field } from '../../components/Form';
import { branchName, fmtDateTime } from '../../lib/format';
import { isAllowedBranch, scopedWithAll } from '../../lib/scope';
import { DataTable, Panel, TextLink, Toolbar } from '../../components/ui';

export const Level = ({ value, low, suffix = 'sắp hết' }: { value: number; low: number; suffix?: string }) =>
  <span className={`status-pill ${value <= low ? 'cleaning' : 'available'}`}>{value}{value <= low ? ` · ${suffix}` : ''}</span>;

export function Inventory() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const products = scopedWithAll(data, data.products);
  const moves = scopedWithAll(data, data.stockMoves).slice(0, 30);

  const stockForm = (p: Product, type: 'in' | 'out') => {
    if (!isAllowedBranch(data, p.branchId)) return;
    modal.openForm({
      title: `${type === 'in' ? 'Nhập hàng' : 'Xuất hủy'} · ${p.name}`,
      body: <>
        <p>Tồn hiện tại: <strong>{p.stock}</strong></p>
        <Field label="Số lượng" name="qty" type="number" min={1} max={type === 'out' ? p.stock : undefined} required />
        {type === 'in' && <Field label="Đơn giá nhập (₫, ghi phiếu chi nếu > 0)" name="cost" type="number" min={0} step={1000} defaultValue={0} />}
        <Field label="Ghi chú" name="note" maxLength={100} />
      </>,
      onSubmit: v => {
        const qty = Number(v.qty);
        if (!Number.isInteger(qty) || qty < 1 || (type === 'out' && qty > p.stock)) { toast('Số lượng không hợp lệ.'); return false; }
        const next = p.stock + (type === 'in' ? qty : -qty);
        const cost = Number(v.cost || 0) * qty;
        update(d => {
          const target = d.products.find(x => x.id === p.id);
          if (!target) return;
          target.stock = next;
          d.stockMoves.unshift({ at: new Date().toISOString(), branchId: p.branchId, name: p.name, type, qty, note: v.note });
          if (type === 'in' && cost > 0) {
            d.cashbook.push({
              id: `PC-${String(d.cashbook.filter(x => x.type === 'out').length + 1).padStart(4, '0')}`, type: 'out', branchId: p.branchId,
              at: new Date().toISOString(), category: 'Mua hàng', amount: cost, method: 'cash', note: `Nhập ${qty} ${p.name}`, by: 'Quản lý'
            });
          }
        });
        toast(`Tồn mới: ${next}.`);
      }
    });
  };

  return (
    <>
      <Toolbar><span className="text-muted small">Tồn kho giảm khi khách gọi món; nhập hàng tại đây</span></Toolbar>
      <Panel title="Tồn kho sản phẩm" subtitle="Cảnh báo khi còn từ 10 trở xuống">
        <DataTable headers={['SẢN PHẨM', 'CHI NHÁNH', 'NHÓM', 'TỒN', 'THAO TÁC']}>
          {products.map(p => (
            <tr key={p.id}>
              <td><strong>{p.name}</strong><small>{p.id}</small></td>
              <td>{branchName(p.branchId)}</td>
              <td>{p.group}</td>
              <td><Level value={p.stock} low={10} /></td>
              <td>
                <TextLink icon="bi-box-arrow-in-down" onClick={() => stockForm(p, 'in')}>Nhập hàng</TextLink>{' '}
                <TextLink icon="bi-box-arrow-up" onClick={() => stockForm(p, 'out')}>Xuất hủy</TextLink>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      <Panel title="Lịch sử nhập / xuất" subtitle="Gần nhất trước">
        <DataTable headers={['THỜI GIAN', 'SẢN PHẨM', 'LOẠI', 'SỐ LƯỢNG', 'GHI CHÚ']}>
          {moves.map((m, i) => (
            <tr key={i}><td>{fmtDateTime(m.at)}</td><td>{m.name}</td><td>{m.type === 'in' ? 'Nhập' : 'Xuất hủy'}</td><td>{m.type === 'in' ? '+' : '−'}{m.qty}</td><td>{m.note || '—'}</td></tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
