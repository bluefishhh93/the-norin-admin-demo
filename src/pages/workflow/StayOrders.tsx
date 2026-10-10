import { useState } from 'react';
import { money, branchName } from '../../lib/format';
import { DataTable, Panel } from '../../components/ui';
import { useFolios } from './shared';
import { useBooking } from '../../booking/context';
import { isProduct } from '../../booking/products';
import { productStatus } from '../../booking/BookingProducts';
import { isActive } from '../../lib/folio';
import { useBookingActions } from '../../booking/actions';

export function StayOrders() {
  const folios = useFolios();
  const { openDetail } = useBooking();
  const act = useBookingActions();
  const [status, setStatus] = useState('pending');
  const lines = folios.flatMap(b => b.orderDetails.map((item, i) => ({ b, item, i }))).filter(({ b, item }) => isProduct(item) && (status === 'all' || isActive(b) && item.fulfillment !== 'delivered' && item.fulfillment !== 'cancelled'));
  return <Panel title="Đơn sản phẩm" subtitle="Sản phẩm đặt cùng booking và gọi thêm từ web, kiosk, tablet hoặc tại quầy">
    <label className="form-label mb-3">Hiển thị<select className="form-select" value={status} onChange={e => setStatus(e.target.value)}><option value="pending">Cần chuẩn bị / giao</option><option value="all">Tất cả</option></select></label>
    <DataTable headers={['BOOKING / PHÒNG', 'SẢN PHẨM', 'NGUỒN', 'SỐ LƯỢNG', 'THÀNH TIỀN', 'TRẠNG THÁI', 'THAO TÁC']}>
      {lines.map(({ b, item, i }) => <tr key={`${b.code}-${i}`}><td>{b.code} · {b.room}<small>{branchName(b.branchId)}</small></td><td>{item.name}<small>{item.phase === 'booking' ? 'Đặt cùng booking' : 'Gọi thêm'}</small></td><td>{item.source ?? (item.phase === 'booking' ? b.source : 'Tablet')}</td><td>{item.quantity}</td><td>{money(item.price * item.quantity)}{item.fulfillment === 'cancelled' && <small>Không tính tiền</small>}</td><td>{productStatus[item.fulfillment ?? 'new']}</td><td><div className="d-flex gap-2">{isActive(b) && item.fulfillment !== 'delivered' && item.fulfillment !== 'cancelled' && <button className="btn-primary-custom btn-sm" onClick={() => act.fulfill(b.code, i)}>{item.fulfillment === 'preparing' ? 'Đã giao' : 'Chuẩn bị'}</button>}<button className="btn btn-light btn-sm" onClick={() => openDetail(b.code)}>Xem booking</button></div></td></tr>)}
    </DataTable>{!lines.length && <p className="text-muted p-3">Không có đơn sản phẩm phù hợp.</p>}
  </Panel>;
}
