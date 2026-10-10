import { useState } from 'react';
import { useStore } from '../../store';
import { branchName, fmtTime, methodLabel, money } from '../../lib/format';
import { scopedWithAll } from '../../lib/scope';
import { folioDue } from '../../lib/folio';
import { dateKey } from '../rooms/timeline';
import { DataTable, MetricCard, Panel, PanelHead } from '../../components/ui';

const Bar = ({ label, value, max, text }: { label: string; value: number; max: number; text: string }) => (
  <div className="pms-bar">
    <span>{label}</span>
    <div><i style={{ width: `${max ? Math.max(2, Math.round(value / max * 100)) : 0}%` }} /></div>
    <strong>{text}</strong>
  </div>
);

const shiftDay = (key: string, n: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + n));
};

const dayLabel = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(y, m - 1, d));
};

export function Reports() {
  const { data } = useStore();
  const today = dateKey(new Date());
  const [day, setDay] = useState(today);
  const folios = scopedWithAll(data, data.folios);
  const receipts = folios
    .flatMap(b => b.payments.map(p => ({ ...p, code: b.code, customer: b.customer, branchId: b.branchId, day: dateKey(new Date(p.createdAt)) })))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const sumOf = (list: typeof receipts) => list.reduce((s, p) => s + Number(p.amount), 0);
  const dayReceipts = receipts.filter(p => p.day === day);
  const total = sumOf(dayReceipts);
  const prevTotal = sumOf(receipts.filter(p => p.day === shiftDay(day, -1)));
  const byMethod = (['cash', 'transfer', 'card'] as const).map(m => [methodLabel[m], sumOf(dayReceipts.filter(p => p.method === m))] as const);
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(day, i - 6)).map(k => [k, sumOf(receipts.filter(p => p.day === k))] as const);
  const due = folios.filter(b => dateKey(new Date(b.effectiveCheckInTime)) === day).reduce((s, b) => s + folioDue(b), 0);
  const maxM = Math.max(...byMethod.map(x => x[1]), 1);
  const maxW = Math.max(...week.map(x => x[1]), 1);
  const diff = total - prevTotal;

  return (
    <>
      <div className="reception-grid-controls">
        <div className="timeline-controls-left">
          <div className="timeline-month">
            <button type="button" aria-label="Ngày trước" onClick={() => setDay(shiftDay(day, -1))}><i className="bi bi-chevron-left" /></button>
            <input className="form-control" type="date" value={day} max={today} onChange={e => e.target.value && setDay(e.target.value)} />
            <button type="button" aria-label="Ngày sau" disabled={day >= today} onClick={() => setDay(shiftDay(day, 1))}><i className="bi bi-chevron-right" /></button>
          </div>
        </div>
        <span>{day === today ? 'Hôm nay' : dayLabel(day)}</span>
      </div>
      <div className="metric-grid">
        <MetricCard label="Tiền đã nhận" value={money(total)} foot={`${diff >= 0 ? '+' : '−'}${money(Math.abs(diff))} so với hôm trước`} />
        <MetricCard label="Số giao dịch" value={dayReceipts.length} foot={dayReceipts.length ? `Trung bình ${money(Math.round(total / dayReceipts.length))}` : 'Chưa có giao dịch'} />
        <MetricCard label="Tiền mặt" value={money(byMethod[0][1])} foot={`Chuyển khoản / thẻ ${money(byMethod[1][1] + byMethod[2][1])}`} />
        <MetricCard label="Còn phải thu" value={money(due)} foot="Booking nhận phòng trong ngày" />
      </div>
      <div className="section-grid">
        <section className="panel">
          <PanelHead title="7 ngày gần nhất" subtitle="Tiền đã nhận mỗi ngày" />
          {week.map(([k, v]) => <Bar key={k} label={dayLabel(k)} value={v} max={maxW} text={money(v)} />)}
        </section>
        <section className="panel">
          <PanelHead title="Theo phương thức" subtitle="Tiền đã nhận trong ngày" />
          {byMethod.map(([l, v]) => <Bar key={l} label={l} value={v} max={maxM} text={money(v)} />)}
        </section>
      </div>
      <Panel title="Giao dịch trong ngày" subtitle="Các khoản tiền đã nhận">
        <DataTable headers={['GIỜ', 'MÃ ĐẶT', 'KHÁCH HÀNG', 'CHI NHÁNH', 'PHƯƠNG THỨC', 'SỐ TIỀN']}>
          {dayReceipts.map(p => (
            <tr key={p.id}>
              <td>{fmtTime(p.createdAt)}</td>
              <td><strong>#{p.code}</strong></td>
              <td>{p.customer}</td>
              <td>{branchName(p.branchId)}</td>
              <td>{methodLabel[p.method] || p.method}</td>
              <td><strong>{money(Number(p.amount))}</strong></td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
