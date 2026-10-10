import { useStore } from '../../store';
import { branchName, money } from '../../lib/format';
import { scoped } from '../../lib/scope';
import { folioDue, folioPaid, folioTotal } from '../../lib/folio';
import { DataTable, Panel, Pill, ScopeNote, TextLink } from '../../components/ui';
import { useFolioDialogs } from '../workflow/shared';

export function Payments() {
  const { data } = useStore();
  const { detail } = useFolioDialogs();
  return (
    <>
      <Panel title="Hóa đơn" subtitle="Folio của từng lượt lưu trú: tiền phòng, món gọi thêm, phụ thu, voucher và thanh toán">
        <DataTable headers={['MÃ ĐẶT', 'KHÁCH HÀNG', 'CHI NHÁNH', 'TỔNG', 'ĐÃ THU', 'CÒN NỢ', 'CHỨNG TỪ']}>
          {scoped(data, data.folios).map(b => (
            <tr key={b.code}>
              <td><strong>#{b.code}</strong><small>{b.source}</small></td>
              <td>{b.customer}</td>
              <td>{branchName(b.branchId)} · {b.room}</td>
              <td><strong>{money(folioTotal(b))}</strong></td>
              <td>{money(folioPaid(b))}</td>
              <td>{folioDue(b) ? <strong className="workflow-alert">{money(folioDue(b))}</strong> : <Pill status="confirmed" />}</td>
              <td><TextLink icon="bi-eye" onClick={() => detail(b)}>Chi tiết</TextLink></td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      <ScopeNote>Thu tiền mặt, chuyển khoản, thẻ tại trang Thu ngân. Thanh toán VNPay/SPOS từ kiosk ghi trực tiếp vào folio này.</ScopeNote>
    </>
  );
}
