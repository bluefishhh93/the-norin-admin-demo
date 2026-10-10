import { money } from '../../lib/format';
import { DataTable, Panel, TextLink } from '../../components/ui';
import { useFlowActions } from './actions';
import { useFolios } from './shared';

const LABEL = { new: 'Mới', preparing: 'Đang chuẩn bị', delivered: 'Đã giao' };

export function StayOrders() {
  const folios = useFolios();
  const act = useFlowActions();
  const lines = folios.flatMap(b => b.orderDetails.map((item, i) => ({ b, item, i }))).filter(({ item }) => item.phase === 'stay');

  return (
    <Panel title="Đơn gọi thêm từ tablet" subtitle="Các món phát sinh khi khách đang ở phòng; cộng vào số còn nợ">
      <DataTable headers={['BOOKING / PHÒNG', 'SẢN PHẨM', 'SỐ LƯỢNG', 'THÀNH TIỀN', 'TRẠNG THÁI', 'THAO TÁC']}>
        {lines.map(({ b, item, i }) => (
          <tr key={`${b.code}-${i}`}>
            <td>{b.code} · {b.room}</td>
            <td>{item.name}</td>
            <td>{Number(item.quantity)}</td>
            <td>{money(Number(item.price) * Number(item.quantity))}</td>
            <td>{LABEL[item.fulfillment || 'new']}</td>
            <td>{item.fulfillment !== 'delivered'
              ? <TextLink icon="bi-arrow-right" onClick={() => act.fulfill(b.code, i)}>{item.fulfillment === 'preparing' ? 'Đã giao' : 'Bắt đầu chuẩn bị'}</TextLink>
              : 'Hoàn tất'}</td>
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}
