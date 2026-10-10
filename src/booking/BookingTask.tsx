import { useRef, useState } from 'react';
import type { Folio, PayMethod, ProductSelection } from '../types';
import { useStore } from '../store';
import { fmtDateTime, localDateTime, money } from '../lib/format';
import { checkoutAt, folioDue, folioPaid, folioTotal } from '../lib/folio';
import { checkRoomInterval, className } from '../lib/rooms';
import { Modal } from '../components/Modal';
import { useBookingActions } from './actions';
import { checkinSchedule } from './checkin';
import { paymentTiming, refundable } from './model';
import { useFolioDialogs } from './payment';
import { ProductPicker } from './ProductPicker';
import { roomChangePrice } from './room-change';

export type BookingTaskKind =
  | 'checkin'
  | 'edit'
  | 'move'
  | 'extend'
  | 'checkout'
  | 'cancel'
  | 'no-show'
  | 'refund'
  | 'products';

export function BookingTask({
  task,
  b,
  onClose
}: {
  task: BookingTaskKind;
  b: Folio;
  onClose: () => void;
}) {
  const { data, toast } = useStore();
  const act = useBookingActions();
  const { collect } = useFolioDialogs();
  const [room, setRoom] = useState(b.room);
  const [start, setStart] = useState(localDateTime(new Date(b.effectiveCheckInTime)));
  const [end, setEnd] = useState(
    localDateTime(new Date(task === 'extend' ? Date.parse(checkoutAt(b)) + 3600000 : checkoutAt(b)))
  );
  const [reason, setReason] = useState('');
  const [products, setProducts] = useState<ProductSelection[]>([]);
  const [refundAmount, setRefundAmount] = useState('0');
  const [method, setMethod] = useState<PayMethod>('cash');
  const [error, setError] = useState('');
  const submitted = useRef(false);
  const [checkinAt] = useState(() => new Date());
  const title: Record<BookingTaskKind, string> = {
    checkin: 'Nhận phòng',
    edit: 'Sửa lịch',
    move: 'Đổi phòng',
    extend: 'Gia hạn',
    checkout: 'Trả phòng',
    cancel: 'Hủy booking',
    'no-show': 'Xác nhận không đến',
    refund: 'Hoàn tiền',
    products: 'Thêm sản phẩm'
  };
  const scheduling = ['edit', 'move', 'extend'].includes(task);
  const schedule = checkinSchedule(data, b, checkinAt);
  const nextStart = schedule.start,
    nextEnd = schedule.end;
  const check = checkRoomInterval(
    data,
    data.rooms.find((r) => r.branchId === b.branchId && r.number === b.room),
    nextStart,
    nextEnd,
    b.stayType,
    b.code,
    true,
    false
  );
  const proposedPrice = scheduling
    ? roomChangePrice(data, b, room, new Date(start), new Date(end))
    : null;
  const currentRoomPrice = b.orderDetails
    .filter((i) => i.productType === 6 && i.fulfillment !== 'cancelled')
    .reduce((s, i) => s + i.price * i.quantity, 0);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted.current) return;
    let result: string | null = null;
    if (task === 'checkin')
      result = act.checkin(b.code, nextStart.toISOString(), nextEnd.toISOString());
    else if (scheduling) {
      const from = new Date(start),
        to = new Date(end);
      if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from) {
        setError('Kiểm tra thời điểm nhận và trả phòng.');
        return;
      }
      result = act.reschedule(
        b.code,
        room,
        from.toISOString(),
        to.toISOString(),
        reason,
        task === 'extend'
      );
    } else if (task === 'checkout') result = act.checkout(b.code);
    else if (task === 'cancel' || task === 'no-show')
      result = act.cancel(b.code, reason, Number(refundAmount), task === 'no-show');
    else if (task === 'refund') result = act.refund(b.code, method, reason);
    else if (task === 'products') result = act.addProducts(b.code, products);
    if (result) {
      setError(result);
      return;
    }
    submitted.current = true;
    toast(`Đã xử lý: ${title[task].toLowerCase()}.`);
    onClose();
  };
  return (
    <Modal
      open
      title={`${title[task]} · ${b.code}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn btn-light" onClick={onClose}>
            Đóng
          </button>
          <button
            className={
              task === 'cancel' || task === 'no-show' ? 'btn btn-danger' : 'btn-primary-custom'
            }
            type="submit"
            form="bookingTask"
          >
            {task === 'checkin'
              ? 'Xác nhận nhận phòng'
              : task === 'checkout'
                ? 'Hoàn tất trả phòng'
                : title[task]}
          </button>
        </>
      }
    >
      <form id="bookingTask" onSubmit={submit}>
        {task === 'checkin' && (
          <>
            <p>
              Khách: <strong>{b.customer}</strong> · Phòng {b.room}
            </p>
            <p>
              Lịch hiệu lực: {fmtDateTime(nextStart.toISOString())} →{' '}
              {fmtDateTime(nextEnd.toISOString())}
            </p>
            <div className="alert alert-info">{schedule.message}</div>
            {check !== true && <div className="alert alert-warning mt-3">{check}</div>}
            <p className="small text-muted mt-3">
              {b.stayType === 'Theo giờ'
                ? 'Giữ lịch đã xác nhận hoặc dời cả khung giờ nếu không xung đột. Lịch ban đầu luôn được giữ trong lịch sử.'
                : 'Giữ giờ nhận/trả theo gói ngày/đêm. Quyền phòng chỉ có hiệu lực theo lịch.'}{' '}
              Kiểm tra hồ sơ khách trong tab Khách lưu trú trước khi xác nhận. Cấp quyền phòng là mô
              phỏng.
            </p>
            {paymentTiming(b) === 'prepaid' && folioDue(b) > 0 && (
              <div className="alert alert-warning">
                Cần thu đủ {money(folioDue(b))} trước khi nhận phòng.
              </div>
            )}
          </>
        )}
        {scheduling && (
          <>
            <p>
              Lịch hiện tại: phòng {b.room} · {fmtDateTime(b.effectiveCheckInTime)} →{' '}
              {fmtDateTime(checkoutAt(b))}
            </p>
            {task === 'move' && (
              <>
                <label className="form-label" htmlFor="newRoom">
                  Phòng mới
                </label>
                <select
                  id="newRoom"
                  className="form-select mb-3"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                >
                  {data.rooms
                    .filter((r) => r.branchId === b.branchId)
                    .map((r) => (
                      <option key={r.number} value={r.number}>
                        {r.number} · {className(data, r)}
                      </option>
                    ))}
                </select>
              </>
            )}
            <div className="row g-3">
              <div className="col-sm-6">
                <label className="form-label" htmlFor="newStart">
                  Nhận phòng
                </label>
                <input
                  id="newStart"
                  type="datetime-local"
                  className="form-control"
                  required
                  value={start}
                  readOnly={task !== 'edit'}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="col-sm-6">
                <label className="form-label" htmlFor="newEnd">
                  Trả phòng
                </label>
                <input
                  id="newEnd"
                  type="datetime-local"
                  className="form-control"
                  required
                  value={end}
                  readOnly={task === 'move'}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="alert alert-light mt-3">
              Tiền phòng mới:{' '}
              <strong>
                {proposedPrice == null ? 'Chưa có giá phù hợp' : money(proposedPrice)}
              </strong>
              {proposedPrice != null && (
                <> · Chênh lệch {money(proposedPrice - currentRoomPrice)}</>
              )}
              . Các khoản đã phát sinh được giữ nguyên.
            </div>
            <p className="small text-muted">
              Lịch mới phải chừa {data.rules.cleaningBuffer} phút dọn trước lượt tiếp theo. Gia hạn
              theo giờ giới hạn {data.rules.maxHourlyStay} tiếng theo cấu hình.
            </p>
          </>
        )}
        {task === 'checkout' && (
          <>
            <p>Giờ trả thực tế: {fmtDateTime(new Date().toISOString())}</p>
            <p>
              Tổng {money(folioTotal(b))} · Đã thu {money(folioPaid(b))} · Còn thu{' '}
              {money(folioDue(b))}
            </p>
            {folioDue(b) > 0 && (
              <button
                type="button"
                className="btn btn-outline-success mb-3"
                onClick={() => {
                  onClose();
                  collect(b);
                }}
              >
                Thu đủ tiền trước khi chốt
              </button>
            )}
            {refundable(b) > 0 && (
              <p className="text-warning">Cần hoàn {money(refundable(b))} trước khi chốt.</p>
            )}
            <p>
              Hoàn tất trả phòng sẽ đưa phòng sang Chờ dọn. Chưa bán phòng cho khách mới cho đến khi
              dọn xong.
            </p>
          </>
        )}
        {(task === 'cancel' || task === 'no-show') && (
          <>
            <div className="alert alert-warning">
              Giải phóng lịch và hủy sản phẩm chưa giao. Tiền đã thu {money(folioPaid(b))} được giữ
              trong lịch sử. Chọn số được hoàn theo chính sách hủy; hệ thống không tự mặc định hoàn
              toàn bộ.
            </div>
            {folioPaid(b) > 0 && (
              <>
                <label className="form-label" htmlFor="cancelRefund">
                  Số tiền được duyệt hoàn (₫)
                </label>
                <input
                  id="cancelRefund"
                  className="form-control mb-3"
                  type="number"
                  min={0}
                  max={folioPaid(b)}
                  step={1}
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
                <p>Giữ lại: {money(Math.max(0, folioPaid(b) - Number(refundAmount)))}</p>
              </>
            )}
          </>
        )}
        {task === 'refund' && (
          <>
            <p>
              Hoàn đủ số cần hoàn: <strong>{money(refundable(b))}</strong>
            </p>
            <label className="form-label" htmlFor="refundMethod">
              Phương thức đã hoàn
            </label>
            <select
              id="refundMethod"
              className="form-select mb-3"
              value={method}
              onChange={(e) => setMethod(e.target.value as PayMethod)}
            >
              <option value="cash">Tiền mặt</option>
              <option value="transfer">Chuyển khoản</option>
              <option value="card">Thẻ</option>
            </select>
            <p className="small text-muted">
              Chỉ ghi nhận sau khi đã hoàn tiền thực tế. Thao tác demo không gửi lệnh ra ngân hàng.
            </p>
          </>
        )}
        {task === 'products' && (
          <ProductPicker branchId={b.branchId} value={products} onChange={setProducts} />
        )}
        {task !== 'checkin' && task !== 'checkout' && task !== 'products' && (
          <>
            <label className="form-label" htmlFor="changeReason">
              Lý do *
            </label>
            <textarea
              id="changeReason"
              className="form-control"
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </>
        )}
        {error && (
          <div className="alert alert-danger mt-3" role="alert">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
