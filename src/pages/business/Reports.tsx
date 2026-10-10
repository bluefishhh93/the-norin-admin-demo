import { useStore } from '../../store';
import { methodLabel, money } from '../../lib/format';
import { scoped, scopedWithAll } from '../../lib/scope';
import { folioDue } from '../../lib/folio';
import { DataTable, MetricCard, Panel, PanelHead, ScopeNote } from '../../components/ui';

const Bar = ({ label, value, max, text }: { label: string; value: number; max: number; text: string }) => (
  <div className="pms-bar">
    <span>{label}</span>
    <div><i style={{ width: `${max ? Math.max(2, Math.round(value / max * 100)) : 0}%` }} /></div>
    <strong>{text}</strong>
  </div>
);

export function Reports() {
  const { data } = useStore();
  const folios = scopedWithAll(data, data.folios);
  const payments = folios.flatMap(b => b.payments);
  const byMethod = (['cash', 'transfer', 'card'] as const).map(m => [methodLabel[m], payments.filter(p => p.method === m).reduce((s, p) => s + Number(p.amount), 0)] as const);
  const lines = folios.flatMap(b => b.orderDetails);
  const roomRev = lines.filter(i => i.productType === 6 && !/Phụ thu/.test(i.name)).reduce((s, i) => s + i.price * i.quantity, 0);
  const surcharge = lines.filter(i => /Phụ thu/.test(i.name)).reduce((s, i) => s + i.price * i.quantity, 0);
  const goods = lines.filter(i => i.productType !== 6).reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = folios.reduce((s, b) => s + Number(b.voucherDiscount || 0), 0);
  const byType = (['Theo giờ', 'Qua đêm', 'Theo ngày'] as const).map(t => [t, folios.filter(b => b.stayType === t).length] as const);
  const rooms = scoped(data, data.rooms);
  const occ = rooms.filter(r => r.status === 'occupied').length;
  const products = Object.entries(lines.filter(i => i.productType !== 6).reduce<Record<string, number>>((m, i) => {
    const n = i.name.split(' · ')[0]; m[n] = (m[n] || 0) + i.quantity; return m;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxM = Math.max(...byMethod.map(x => x[1]), 1);
  const maxT = Math.max(...byType.map(x => x[1]), 1);
  const debt = folios.reduce((s, b) => s + folioDue(b), 0);

  return (
    <>
      <div className="metric-grid">
        <MetricCard label="Doanh thu (sau giảm giá)" value={money(roomRev + surcharge + goods - discount)} foot={`Phòng ${money(roomRev)} · Dịch vụ ${money(goods)}`} />
        <MetricCard label="Đã thu" value={money(payments.reduce((s, p) => s + Number(p.amount), 0))} foot={`Còn nợ ${money(debt)}`} />
        <MetricCard label="Công suất hiện tại" value={`${rooms.length ? Math.round(occ / rooms.length * 100) : 0}%`} foot={`${occ}/${rooms.length} phòng có khách`} />
        <MetricCard label="Phụ thu quá giờ · Giảm giá" value={money(surcharge)} foot={`Voucher −${money(discount)}`} />
      </div>
      <div className="section-grid">
        <section className="panel">
          <PanelHead title="Theo phương thức thanh toán" subtitle="Tiền đã thu theo từng kênh" />
          {byMethod.map(([l, v]) => <Bar key={l} label={l} value={v} max={maxM} text={money(v)} />)}
        </section>
        <section className="panel">
          <PanelHead title="Theo hình thức lưu trú" subtitle="Số lượt booking" />
          {byType.map(([l, v]) => <Bar key={l} label={l} value={v} max={maxT} text={`${v} lượt`} />)}
        </section>
      </div>
      <Panel title="Sản phẩm bán chạy" subtitle="Món gọi kèm và gọi tại phòng">
        <DataTable headers={['SẢN PHẨM', 'SỐ LƯỢNG']}>{products.map(([n, q]) => <tr key={n}><td><strong>{n}</strong></td><td>{q}</td></tr>)}</DataTable>
      </Panel>
      <ScopeNote>Số liệu tính trực tiếp từ folio và thanh toán trong admin, không qua KiotViet.</ScopeNote>
    </>
  );
}
