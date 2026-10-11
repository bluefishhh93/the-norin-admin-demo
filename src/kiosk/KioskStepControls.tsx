import { useState } from 'react';
import type { Kiosk, PayMethod } from '../types';
import { useStore } from '../store';
import { money } from '../lib/format';
import { folioDue } from '../lib/folio';
import { paymentTiming } from '../booking/model';
import { useKioskActions } from './actions';
import { currentStep, sessionFolio } from './session';
import { KioskGuestEditor } from './KioskGuestEditor';

export function KioskStepControls({ k }: { k: Kiosk }) {
  const { data, toast } = useStore();
  const act = useKioskActions();
  const [editingGuests, setEditingGuests] = useState(false);
  const [method, setMethod] = useState<PayMethod>('cash');
  const [reference, setReference] = useState('');
  const s = k.session;
  if (!s || s.handedOver) return null;
  const f = sessionFolio(data, s);
  const { key, label } = currentStep(s);
  const step = s.steps[key];
  const run = (fn: () => string | null, message: string) => {
    const error = fn();
    toast(error ?? message);
    return !error;
  };
  if (!k.agentOnline) return (
    <div className="kiosk-step-controls">
      <p className="text-muted small">Chưa thể gửi lệnh tiếp tục. Đối chiếu kết quả sau khi agent kết nối lại hoặc chuyển sang quầy.</p>
      <button className="btn btn-light" onClick={() => act.reconnect(k.id)}>Demo: kết nối lại agent</button>
    </div>
  );
  return (
    <div className="kiosk-step-controls">
      <strong>Xử lý bước hiện tại: {label}</strong>
      {key === 'lookup' && <p className="text-muted small">Kiểm tra lịch và phòng trong booking. Nếu cần đổi lịch/phòng, mở booking để sửa rồi yêu cầu kiosk kiểm tra lại.</p>}
      {key === 'guests' && f && <>
        {!editingGuests ? <div className="booking-detail-actions">
          <button className="btn-primary-custom" onClick={() => setEditingGuests(true)}>Nhập / sửa hồ sơ thủ công</button>
        </div> : <KioskGuestEditor folio={f} onCancel={() => setEditingGuests(false)} onConfirm={(guests) => {
          if (run(() => act.saveGuests(k.id, guests), 'Đã lưu hồ sơ. Kiosk chuyển sang thanh toán.')) setEditingGuests(false);
        }} />}
      </>}
      {key === 'payment' && step.state === 'running' && s.paymentMethod !== 'cash' && <p className="text-muted small">Khách đang thanh toán trên kiosk. Khi nhận kết quả thành công, kiosk tự chuyển sang kích hoạt thẻ; lễ tân không cần xác nhận khoản thu.</p>}
      {key === 'payment' && step.state !== 'unknown' && (s.paymentMethod === 'cash' || step.state === 'failed') && f && <>
        <p className="text-muted small">{paymentTiming(f) === 'postpaid' ? 'Booking trả sau: kiosk có thể tiếp tục và thu khi trả phòng. Nếu khách muốn trả ngay, ghi nhận khoản thu bên dưới.' : `Cần thu đủ ${money(folioDue(f))} trước khi phát thẻ.`}</p>
        <div className="kiosk-payment-controls">
          <select aria-label="Phương thức thu tại quầy" className="form-select" value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
            <option value="cash">Tiền mặt tại quầy</option><option value="transfer">Chuyển khoản</option><option value="card">Thẻ / POS</option>
          </select>
          {method !== 'cash' && <input aria-label="Mã giao dịch đã thu" className="form-control" placeholder="Mã giao dịch đã kiểm tra" value={reference} onChange={(e) => setReference(e.target.value)} />}
          <button className="btn-primary-custom" onClick={() => run(() => act.collect(k.id, method, reference), 'Đã xác nhận thanh toán. Kiosk chuyển sang kích hoạt thẻ.')}>{folioDue(f) > 0 ? `Xác nhận đã thu ${money(folioDue(f))}` : 'Xác nhận đã thanh toán & tiếp tục'}</button>
        </div>
      </>}
      {step.state === 'unknown' && (key === 'payment' || key === 'card') && <>
        <p className="text-muted small">{key === 'payment' ? 'Kiểm tra giao dịch trên SmartPOS / đơn vị thanh toán. Không thu lại khi chưa biết kết quả.' : 'Kiểm tra UID và kết quả đăng ký thẻ trên TTLock trước khi phát lại.'}</p>
        <input aria-label="Thông tin đối chiếu" className="form-control" placeholder={key === 'card' ? 'UID thẻ đã kiểm tra (hex)' : 'Mã giao dịch đã kiểm tra'} value={reference} onChange={(e) => setReference(e.target.value)} />
        <div className="booking-detail-actions">
          <button className="btn-primary-custom" onClick={() => run(() => act.reconcile(k.id, key, true, reference), 'Đã đối chiếu thành công. Kiosk chuyển bước tiếp theo.')}>Xác nhận đã thành công</button>
          <button className="btn btn-light" onClick={() => run(() => act.reconcile(k.id, key, false, reference), 'Đã xác nhận thất bại. Có thể thử lại.')}>Xác nhận thất bại</button>
        </div>
      </>}
      {(key === 'card' || key === 'release') && <p className="text-muted small">{key === 'card' ? 'K750 ghi thẻ, TTLock đăng ký hiệu lực rồi giữ thẻ tại đầu đọc. Chỉ chuyển bước khi có kết quả thành công.' : 'Thẻ đã kích hoạt. Khắc phục kẹt thẻ rồi gửi lại lệnh nhả; giữ nguyên khoản thu và UID, không phát thêm thẻ.'}</p>}
      {(step.state === 'failed' || step.state === 'todo') && <div className="booking-detail-actions">
        <button className="btn btn-outline-secondary" onClick={() => run(() => act.retry(k.id, key), 'Đã gửi yêu cầu thử lại. Chờ kết quả kiosk.')}>{key === 'release' ? 'Yêu cầu nhả lại thẻ' : key === 'card' ? 'Thử lại kích hoạt thẻ' : key === 'guests' ? 'Yêu cầu quét lại' : 'Yêu cầu kiosk thử lại'}</button>
      </div>}
      {step.state === 'running' && !(key === 'payment' && s.paymentMethod === 'cash') && <details className="kiosk-demo-results" open={key === 'payment'}>
        <summary>{key === 'payment' ? 'Demo kết quả thanh toán tự động' : 'Mô phỏng kết quả kiosk (demo)'}</summary>
        <div className="booking-detail-actions">
          <button className="btn btn-light btn-sm" onClick={() => run(() => act.demoResult(k.id, 'done'), key === 'release' ? 'Đã nhả thẻ và hoàn tất nhận phòng. Kiosk sẵn sàng.' : 'Kiosk báo thành công và chuyển bước tiếp theo.')}>{key === 'payment' ? 'Demo: thanh toán thành công → tiếp tục' : 'Máy báo thành công'}</button>
          <button className="btn btn-light btn-sm" onClick={() => run(() => act.demoResult(k.id, 'failed'), 'Đã tạo lỗi và yêu cầu hỗ trợ.')}>Máy báo lỗi</button>
          {(key === 'payment' || key === 'card') && <button className="btn btn-light btn-sm" onClick={() => run(() => act.demoResult(k.id, 'unknown'), 'Đã tạo kết quả chưa rõ, cần đối chiếu.')}>{key === 'payment' ? 'Demo: IPN / kết quả chưa về' : 'Chưa nhận kết quả'}</button>}
        </div>
      </details>}
    </div>
  );
}
