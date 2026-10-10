import type { Folio } from '../types';
import { fmtDateTime, methodLabel, money } from '../lib/format';
import { folioDue, folioPaid, folioTotal } from '../lib/folio';
import { refundable } from './model';
import { isProduct } from './products';

export function BookingCosts({ booking: b }: { booking: Folio }) {
  return (
    <>
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Nội dung</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {b.orderDetails
              .filter((item) => item.fulfillment !== 'cancelled')
              .map((item, index) => (
                <tr key={index}>
                  <td>
                    {item.name}
                    <small className="d-block text-muted">
                      {isProduct(item)
                        ? 'Sản phẩm'
                        : item.phase === 'stay'
                          ? 'Điều chỉnh tiền phòng'
                          : 'Tiền phòng'}
                    </small>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{money(item.price)}</td>
                  <td>{money(item.price * item.quantity)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {b.voucherDiscount > 0 && (
        <p>
          Voucher:{' '}
          {b.voucher
            ? `${b.voucher.name} (${b.voucher.code}) · ${b.voucher.scope === 'ROOM_ONLY' ? 'Tiền phòng' : 'Booking ban đầu'}`
            : 'Ưu đãi đã ghi nhận'}{' '}
          · −{money(b.voucherDiscount)}
        </p>
      )}
      {b.status === 3 && (
        <p>
          Booking đã hủy. Khoản giữ lại: {money(folioTotal(b))} · Cần hoàn: {money(refundable(b))}.
        </p>
      )}
      <h3 className="workflow-heading mt-4">Giao dịch thu / hoàn</h3>
      {b.payments.length ? (
        b.payments.map((payment) => (
          <div className="booking-payment-row" key={payment.id}>
            <span>
              {fmtDateTime(payment.createdAt)}
              <small className="d-block">
                {methodLabel[payment.method]} · {payment.collector}
              </small>
            </span>
            <strong className={payment.amount < 0 ? 'text-warning' : ''}>
              {payment.amount < 0 ? 'Hoàn ' : 'Thu '}
              {money(Math.abs(payment.amount))}
            </strong>
          </div>
        ))
      ) : (
        <p className="text-muted">Chưa có giao dịch. Booking trả sau sẽ thu khi quyết toán.</p>
      )}
    </>
  );
}

export function FolioSummary({ b }: { b: Folio }) {
  return (
    <div className="workflow-folio">
      {b.orderDetails
        .filter((item) => item.fulfillment !== 'cancelled')
        .map((item, index) => (
          <div key={index}>
            <span>
              {item.name}{' '}
              <small>
                {item.productType === 6
                  ? 'Tiền phòng'
                  : item.phase === 'stay'
                    ? 'Gọi thêm'
                    : 'Đặt kèm'}{' '}
                · {item.quantity} × {money(item.price)}
              </small>
            </span>
            <strong>{money(item.quantity * item.price)}</strong>
          </div>
        ))}
      <div>
        <span>Giảm giá voucher</span>
        <strong>−{money(b.voucherDiscount)}</strong>
      </div>
      <div>
        <strong>Tổng đơn</strong>
        <strong>{money(folioTotal(b))}</strong>
      </div>
      <div>
        <span>Đã thanh toán</span>
        <strong>{money(folioPaid(b))}</strong>
      </div>
      <div className="workflow-due">
        <strong>Còn phải thu</strong>
        <strong>{money(folioDue(b))}</strong>
      </div>
    </div>
  );
}
