import { useState } from 'react';
import type { Folio } from '../types';
import { isActive } from '../lib/folio';
import { money } from '../lib/format';
import { useStore } from '../store';
import { Modal } from '../components/Modal';
import { useBookingActions } from './actions';
import { isProduct } from './products';

export const productStatus = { new: 'Mới', preparing: 'Đang chuẩn bị', delivered: 'Đã giao', cancelled: 'Đã hủy' };
export function BookingProducts({ b }: { b: Folio }) {
  const act = useBookingActions();
  const { toast } = useStore();
  const [cancelIndex, setCancelIndex] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const lines = b.orderDetails.map((item, index) => ({ item, index })).filter(({ item }) => isProduct(item));
  return <>
    {!lines.length ? <p className="text-muted">Booking chưa có sản phẩm. Chọn Thêm sản phẩm để bán từ danh mục.</p> : <div className="table-responsive"><table className="table"><thead><tr><th>Sản phẩm</th><th>SL</th><th>Thành tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{lines.map(({ item, index }) => <tr key={index} className={item.fulfillment === 'cancelled' ? 'text-muted' : ''}><td>{item.name}<small className="d-block">{item.phase === 'booking' ? 'Đặt cùng booking' : 'Gọi thêm'} · {item.source ?? (item.phase === 'booking' ? b.source : 'Tablet')}</small></td><td>{item.quantity}</td><td>{money(item.price * item.quantity)}{item.fulfillment === 'cancelled' && <small className="d-block">Không tính tiền</small>}</td><td>{productStatus[item.fulfillment ?? 'new']}</td><td>{isActive(b) && item.fulfillment !== 'delivered' && item.fulfillment !== 'cancelled' && <div className="d-flex gap-2"><button className="btn btn-light btn-sm" onClick={() => act.fulfill(b.code, index)}>{item.fulfillment === 'preparing' ? 'Đã giao' : 'Chuẩn bị'}</button><button className="btn btn-outline-danger btn-sm" onClick={() => { setCancelIndex(index); setReason(''); setError(''); }}>Hủy món</button></div>}</td></tr>)}</tbody></table></div>}
    {cancelIndex !== null && <Modal open title={`Hủy ${b.orderDetails[cancelIndex].name}`} onClose={() => setCancelIndex(null)} footer={<><button className="btn btn-light" onClick={() => setCancelIndex(null)}>Đóng</button><button className="btn btn-danger" onClick={() => { const result = act.cancelProduct(b.code, cancelIndex, reason); if (result) { setError(result); return; } setCancelIndex(null); toast('Đã hủy món, cập nhật tiền và hoàn lại tồn đã giữ.'); }}>Xác nhận hủy món</button></>}><p>Chỉ hủy món chưa giao. Khoản đã thu dư sẽ được theo dõi để hoàn riêng.</p><label htmlFor="cancelProductReason" className="form-label">Lý do</label><textarea id="cancelProductReason" className="form-control" value={reason} onChange={e => setReason(e.target.value)} />{error && <p className="text-danger mt-2">{error}</p>}</Modal>}
  </>;
}
