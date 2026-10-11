import { useCallback, useState } from 'react';
import type { Kiosk, PayMethod } from '../types';
import { useStore } from '../store';
import { money } from '../lib/format';
import { folioDue } from '../lib/folio';
import { useKioskActions } from './actions';
import { currentStep, sessionFolio } from './session';
import { IssueCardModal } from '../booking/IssueCardModal';
import { ReaderVisual } from '../booking/CardReaderParts';
import { useCardReader } from '../booking/useCardReader';
import { parseCardUid } from '../booking/card';
import { KioskGuestEditor } from './KioskGuestEditor';

export function KioskStepControls({ k }: { k: Kiosk }) {
  const { data, toast } = useStore();
  const act = useKioskActions();
  const [editingGuests, setEditingGuests] = useState(false);
  const [method, setMethod] = useState<PayMethod>('cash');
  const [reference, setReference] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [scanError, setScanError] = useState('');
  const s = k.session;
  const f = s ? sessionFolio(data, s) : undefined;
  const current = s ? currentStep(s) : null;
  const key = current?.key;
  const label = current?.label;
  const step = key ? s?.steps[key] : undefined;
  const scanCard = useCallback((uid: string) => {
    if (!parseCardUid(uid)) {
      setScanError('Không nhận dạng được UID. Đặt lại thẻ lên E3.');
      return;
    }
    const error = act.lookupAtDesk(k.id, uid);
    setScanError(error ?? '');
    toast(error ?? 'Đã tìm thấy booking từ thẻ. Tiếp tục kiểm tra chi phí trả phòng.');
  }, [act, k.id, toast]);
  useCardReader(s?.staffHandling === true && s.checkoutCardEjected === true && s.flow === 'checkout' && key === 'lookup' && !issuing, scanCard, true);
  const run = (fn: () => string | null, message: string) => {
    const error = fn();
    toast(error ?? message);
    return !error;
  };
  if (!s || s.handedOver || !key || !step) return null;
  const hardwareStep = (key === 'card' || (key === 'release' && s.flow === 'checkin')) && !s.staffHandling;
  if (!k.agentOnline && hardwareStep) return (
    <div className="kiosk-step-controls">
      <p className="text-muted small">Agent mất kết nối. Chưa thể kích hoạt hoặc nhả thẻ; giữ nguyên hồ sơ và tiến độ phiên.</p>
      <button className="btn btn-light" onClick={() => act.reconnect(k.id)}>Demo: kết nối lại agent</button>
    </div>
  );
  const lock = f && data.locks.find((l) => l.branchId === f.branchId && l.room === f.room);
  return (
    <div className="kiosk-step-controls">
      {issuing && f && <IssueCardModal
        bookingCode={f.code} room={f.room} lockId={lock?.lockId ?? null} lockAlias={lock?.alias}
        validFrom={f.effectiveCheckInTime} validTo={f.effectiveCheckOutTime}
        confirmLabel={f.roomCards?.length ? 'Xác nhận thẻ & nhận phòng' : 'Kích hoạt & nhận phòng'}
        allowExisting
        onIssued={(card) => {
          const error = act.issueAtDesk(k.id, card);
          if (error) toast(error);
          return error;
        }}
        onClose={() => setIssuing(false)}
      />}
      <strong>Xử lý bước hiện tại: {label}</strong>
      {key === 'lookup' && s.flow === 'checkout' && s.staffHandling && s.checkoutCardEjected ? (
        <div className={`ic-stage ${scanError ? 'ic-error' : 'ic-waiting'}`} aria-live="polite">
          <ReaderVisual state={scanError ? 'error' : 'waiting'} />
          <strong>Đặt thẻ khách mang tới lên máy E3</strong>
          <p>{scanError || 'Đọc UID để tìm booking đang ở trước khi trả phòng.'}</p>
        </div>
      ) : key === 'lookup' && <p className="text-muted small">{s.flow === 'checkout' ? 'Nhả thẻ về khe trước, sau đó mời khách mang thẻ tới quầy để đọc bằng E3.' : 'Đối chiếu booking, lịch và phòng trước khi tiếp tục.'}</p>}
      {key === 'face' && <p className="text-muted small">Kiểm tra ảnh khuôn mặt đã được chụp và lưu. Không xác nhận khi chưa có ảnh hợp lệ.</p>}
      {key === 'policy' && <p className="text-muted small">Chỉ xác nhận sau khi khách đã đồng ý chính sách nhận phòng.</p>}
      {key === 'schedule' && <p className="text-muted small">{s.flow === 'checkout' ? 'Kiểm tra các khoản phòng, dịch vụ và số tiền còn phải thu.' : 'Kiểm tra giờ nhận phòng và xác nhận điều chỉnh với khách nếu cần.'}</p>}
      {key === 'receipt' && <p className="text-muted small">Xác nhận hóa đơn đã in hoặc khách không yêu cầu in hóa đơn.</p>}
      {key === 'guests' && s.flow === 'checkin' && f && <>
        {!editingGuests ? <div className="booking-detail-actions">
          <button className="btn-primary-custom" onClick={() => setEditingGuests(true)}>Nhập / sửa hồ sơ thủ công</button>
        </div> : <KioskGuestEditor folio={f} onCancel={() => setEditingGuests(false)} onConfirm={(guests) => {
          if (run(() => act.saveGuests(k.id, guests), 'Đã lưu hồ sơ. Chuyển thẳng sang phát thẻ bằng E3.')) setEditingGuests(false);
        }} />}
      </>}
      {key === 'payment' && step.state === 'running' && s.paymentMethod !== 'cash' && !s.staffHandling && <p className="text-muted small">Khách đang thanh toán trên kiosk. Chỉ chuyển bước khi nhận kết quả giao dịch thành công.</p>}
      {key === 'payment' && step.state !== 'unknown' && (s.paymentMethod === 'cash' || s.staffHandling) && f && <>
        <p className="text-muted small">{`Cần thu đủ ${money(folioDue(f))} để ${s.flow === 'checkout' ? 'hoàn tất trả phòng' : 'hoàn tất đặt phòng'}.`}</p>
        <div className="kiosk-payment-controls">
          <select aria-label="Phương thức thu tại quầy" className="form-select" value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
            <option value="cash">Tiền mặt tại quầy</option><option value="transfer">Chuyển khoản</option><option value="card">Thẻ / POS</option>
          </select>
          {method !== 'cash' && <input aria-label="Mã giao dịch đã thu" className="form-control" placeholder="Mã giao dịch đã kiểm tra" value={reference} onChange={(e) => setReference(e.target.value)} />}
          <button className="btn-primary-custom" onClick={() => run(() => act.collect(k.id, method, reference), 'Đã xác nhận thanh toán. Kiosk chuyển bước tiếp theo.')}>{folioDue(f) > 0 ? `Xác nhận đã thu ${money(folioDue(f))}` : 'Xác nhận đã thanh toán & tiếp tục'}</button>
        </div>
      </>}
      {step.state === 'unknown' && (key === 'payment' || (key === 'card' && !s.staffHandling)) && <>
        <p className="text-muted small">{key === 'payment' ? 'Kiểm tra giao dịch trên SmartPOS / đơn vị thanh toán. Không thu lại khi chưa biết kết quả.' : 'Kiểm tra UID và kết quả đăng ký thẻ trên TTLock trước khi phát lại.'}</p>
        <input aria-label="Thông tin đối chiếu" className="form-control" placeholder={key === 'card' ? 'UID thẻ đã kiểm tra (hex)' : 'Mã giao dịch đã kiểm tra'} value={reference} onChange={(e) => setReference(e.target.value)} />
        <div className="booking-detail-actions">
          <button className="btn-primary-custom" onClick={() => run(() => act.reconcile(k.id, key, true, reference), 'Đã đối chiếu thành công. Kiosk chuyển bước tiếp theo.')}>Xác nhận đã thành công</button>
          <button className="btn btn-light" onClick={() => run(() => act.reconcile(k.id, key, false, reference), 'Đã xác nhận thất bại. Có thể thử lại.')}>Xác nhận thất bại</button>
        </div>
      </>}
      {key === 'card' && s.staffHandling && (
        <button className="btn-primary-custom" onClick={() => setIssuing(true)}>{f?.roomCards?.length ? 'Đọc lại thẻ bằng E3 · nhận phòng' : 'Đọc thẻ bằng E3 · kích hoạt & nhận phòng'}</button>
      )}
      {(key === 'card' || key === 'release') && !s.staffHandling && <p className="text-muted small">{key === 'card' ? 'K750 ghi thẻ, TTLock đăng ký hiệu lực rồi giữ thẻ tại đầu đọc. Chỉ chuyển bước khi có kết quả thành công.' : s.flow === 'checkout' ? 'Đối chiếu đã thu thẻ từ kiosk, quyết toán đủ và xác nhận trả phòng.' : 'Thẻ đã kích hoạt. Khắc phục kẹt thẻ rồi gửi lại lệnh nhả; giữ nguyên UID, không phát thêm thẻ.'}</p>}
      {(step.state === 'running' || (s.staffHandling && step.state === 'failed' && key === 'schedule')) && (['lookup', 'schedule', 'face', 'policy', 'receipt'].includes(key) || (key === 'release' && s.flow === 'checkout')) && !(key === 'lookup' && s.flow === 'checkout' && s.staffHandling) && (
        <button className="btn-primary-custom" onClick={() => run(() => act.complete(k.id, key), key === 'release' && s.flow === 'checkout' ? 'Đã trả phòng, thu hồi thẻ và cập nhật trạng thái phòng.' : 'Đã xác nhận và tiếp tục phiên.')}>{key === 'release' && s.flow === 'checkout' ? 'Xác nhận thu thẻ & trả phòng' : 'Xác nhận & tiếp tục'}</button>
      )}
      {(step.state === 'failed' || step.state === 'todo') && !s.staffHandling && !(s.flow === 'checkout' && key === 'lookup') && <div className="booking-detail-actions">
        <button className="btn btn-outline-secondary" onClick={() => run(() => act.retry(k.id, key), 'Đã gửi yêu cầu thử lại. Chờ kết quả kiosk.')}>{key === 'release' ? s.flow === 'checkout' ? 'Thử lại hoàn tất trả phòng' : 'Yêu cầu nhả lại thẻ' : key === 'card' ? 'Thử lại kích hoạt thẻ' : key === 'guests' ? 'Yêu cầu quét lại' : 'Yêu cầu kiosk thử lại'}</button>
      </div>}
      {step.state === 'running' && !s.staffHandling && (hardwareStep || (key === 'payment' && s.paymentMethod !== 'cash')) && <details className="kiosk-demo-results" open={key === 'payment'}>
        <summary>{key === 'payment' ? 'Demo kết quả thanh toán tự động' : 'Mô phỏng kết quả kiosk (demo)'}</summary>
        <div className="booking-detail-actions">
          <button className="btn btn-light btn-sm" onClick={() => run(() => act.demoResult(k.id, 'done'), key === 'release' && s.flow === 'checkin' ? 'Đã nhả thẻ và hoàn tất nhận phòng. Kiosk sẵn sàng.' : 'Kiosk báo thành công và chuyển bước tiếp theo.')}>{key === 'payment' ? 'Demo: thanh toán thành công → tiếp tục' : 'Máy báo thành công'}</button>
          <button className="btn btn-light btn-sm" onClick={() => run(() => act.demoResult(k.id, 'failed'), 'Đã tạo lỗi và yêu cầu hỗ trợ.')}>Máy báo lỗi</button>
          {(key === 'payment' || key === 'card') && <button className="btn btn-light btn-sm" onClick={() => run(() => act.demoResult(k.id, 'unknown'), 'Đã tạo kết quả chưa rõ, cần đối chiếu.')}>{key === 'payment' ? 'Demo: IPN / kết quả chưa về' : 'Chưa nhận kết quả'}</button>}
        </div>
      </details>}
    </div>
  );
}
