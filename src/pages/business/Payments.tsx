import { useStore } from '../../store';
import { branchName, fmtDateTime, money } from '../../lib/format';
import { scoped } from '../../lib/scope';
import { folioDue, folioTotal } from '../../lib/folio';
import { DataTable, Panel, Pill } from '../../components/ui';

export function Payments() {
  const { data } = useStore();
  return (
    <Panel title="Hóa đơn" subtitle="Thông tin cơ bản và số tiền của từng hóa đơn">
      <DataTable headers={['MÃ HÓA ĐƠN', 'KHÁCH HÀNG', 'CHI NHÁNH', 'NGÀY', 'SỐ TIỀN', 'TRẠNG THÁI']}>
        {scoped(data, data.folios).map(b => (
          <tr key={b.code}>
            <td><strong>#{b.code}</strong></td>
            <td>{b.customer}</td>
            <td>{branchName(b.branchId)}</td>
            <td>{fmtDateTime(b.effectiveCheckInTime)}</td>
            <td><strong>{money(folioTotal(b))}</strong></td>
            <td>{folioDue(b) ? <Pill status="pending" label="Chưa thanh toán" /> : <Pill status="confirmed" label="Đã thanh toán" />}</td>
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}
