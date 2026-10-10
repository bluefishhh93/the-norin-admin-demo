import { useState } from 'react';
import type { Folio } from '../types';
import { useStore } from '../store';
import { useBooking } from './context';
import { useBookingActions } from './actions';
import { paymentTiming, refundable, statusLabel } from './model';
import { branchName, fmtDateTime, money } from '../lib/format';
import { checkoutAt, folioDue, folioPaid, folioTotal, isActive } from '../lib/folio';
import { className } from '../lib/rooms';
import { Tabs } from '../components/ui';
import { useFolioDialogs } from './payment';
import { BookingProducts } from './BookingProducts';
import { BookingTask, type BookingTaskKind } from './BookingTask';
import { BookingCosts } from './BookingCosts';
import { BookingGuests } from './BookingGuests';

type DetailTab = 'Tổng quan' | 'Sản phẩm' | 'Chi phí & thanh toán' | 'Khách lưu trú' | 'Lịch sử';

export function BookingDetail({ b }: { b: Folio }) {
  const { data, toast } = useStore();
  const { closeDetail, initialCheckin, clearInitialCheckin } = useBooking();
  const act = useBookingActions();
  const { collect } = useFolioDialogs();
  const [tab, setTab] = useState<DetailTab>('Tổng quan');
  const [task, setTask] = useState<BookingTaskKind | null>(initialCheckin ? 'checkin' : null);
  const [note, setNote] = useState(b.note ?? '');
  const [showSecret, setShowSecret] = useState(false);
  const active = isActive(b);
  const pending = active && b.detailStatus === 1;
  const inHouse = active && b.detailStatus === 2;
  const due = folioDue(b),
    refund = refundable(b);
  const room = data.rooms.find((r) => r.branchId === b.branchId && r.number === b.room);
  const next = data.folios
    .filter(
      (f) =>
        f.code !== b.code &&
        f.branchId === b.branchId &&
        f.room === b.room &&
        isActive(f) &&
        Date.parse(f.effectiveCheckInTime) >= Date.parse(checkoutAt(b))
    )
    .sort((a, c) => Date.parse(a.effectiveCheckInTime) - Date.parse(c.effectiveCheckInTime))[0];
  const open = (value: BookingTaskKind) => {
    clearInitialCheckin();
    setTask(value);
  };
  const copy = async () => {
    const text = `${b.code} · ${branchName(data, b.branchId)} · Phòng ${b.room}\n${b.customer}\n${fmtDateTime(b.effectiveCheckInTime)} → ${fmtDateTime(checkoutAt(b))}\nTổng: ${money(folioTotal(b))} · ${paymentTiming(b) === 'prepaid' ? 'Trả trước' : 'Trả sau'}`;
    try {
      await navigator.clipboard.writeText(text);
      toast('Đã sao chép thông tin xác nhận.');
    } catch {
      toast('Trình duyệt không cho sao chép.');
    }
  };

  return (
    <section className="booking-detail-page">
      <button className="btn btn-light mb-3" onClick={closeDetail}>
        <i className="bi bi-arrow-left" /> Quay lại booking
      </button>
      <div className="booking-detail-header">
        <div>
          <div className="eyebrow">
            {b.source} · {branchName(data, b.branchId)}
          </div>
          <h2>
            {b.code} <span className="booking-state">{statusLabel(b)}</span>
          </h2>
          <p>
            Phòng {b.room} · {room && className(data, room)} · {b.stayType}
          </p>
        </div>
        <div className="booking-detail-actions">
          {b.status === 4 && (
            <button className="btn-primary-custom" onClick={() => act.confirm(b.code)}>
              Xác nhận booking
            </button>
          )}
          {pending && b.status === 1 && (
            <button className="btn-primary-custom" onClick={() => open('checkin')}>
              Nhận phòng
            </button>
          )}
          {inHouse && (
            <button className="btn-primary-custom" onClick={() => open('checkout')}>
              Trả phòng
            </button>
          )}
          {active && due > 0 && (
            <button className="btn btn-outline-success" onClick={() => collect(b)}>
              Thu tiền
            </button>
          )}
          {refund > 0 && (
            <button className="btn btn-outline-warning" onClick={() => open('refund')}>
              Hoàn tiền
            </button>
          )}
        </div>
      </div>
      {b.checkinAssistanceRequestedAt && !b.assistanceResolvedAt && (
        <div className="alert alert-warning">
          Khách yêu cầu hỗ trợ nhận phòng từ kiosk. Kiểm tra lịch và phòng trước khi tiếp nhận.
        </div>
      )}
      {b.checkoutRequestedAt && inHouse && (
        <div className="alert alert-info">
          Khách yêu cầu trả phòng lúc {fmtDateTime(b.checkoutRequestedAt)}. Booking vẫn đang ở cho
          đến khi hoàn tất trả phòng.
        </div>
      )}
      {inHouse && Date.parse(checkoutAt(b)) < Date.now() && (
        <div className="alert alert-warning">
          Đã quá giờ trả phòng.{' '}
          {next
            ? `Lượt tiếp theo ${next.code} nhận lúc ${fmtDateTime(next.effectiveCheckInTime)}.`
            : 'Chưa có lịch nhận phòng kế tiếp.'}
        </div>
      )}
      <div className="booking-money-strip">
        <div>
          <small>Tổng phải trả</small>
          <strong>{money(folioTotal(b))}</strong>
        </div>
        <div>
          <small>Đã thanh toán</small>
          <strong>{money(folioPaid(b))}</strong>
        </div>
        <div>
          <small>{refund > 0 ? 'Cần hoàn' : 'Còn phải thu'}</small>
          <strong>{money(refund || (b.status === 3 ? 0 : due))}</strong>
        </div>
        <div>
          <small>Hình thức</small>
          <strong>{paymentTiming(b) === 'prepaid' ? 'Trả trước' : 'Trả sau'}</strong>
        </div>
      </div>
      <Tabs<DetailTab>
        items={['Tổng quan', 'Sản phẩm', 'Chi phí & thanh toán', 'Khách lưu trú', 'Lịch sử']}
        value={tab}
        onChange={setTab}
      />
      <div className="panel p-4 mt-3">
        {tab === 'Tổng quan' && (
          <>
            <div className="booking-overview-grid">
              <div>
                <small>Khách liên hệ</small>
                <strong>{b.customer}</strong>
                <span>{b.phone || 'Chưa có số điện thoại'}</span>
              </div>
              <div>
                <small>Nhận → trả hiệu lực</small>
                <strong>{fmtDateTime(b.effectiveCheckInTime)}</strong>
                <span>→ {fmtDateTime(checkoutAt(b))}</span>
              </div>
              <div>
                <small>Nhận / trả thực tế</small>
                <span>
                  {b.actualCheckInAt
                    ? fmtDateTime(b.actualCheckInAt)
                    : inHouse
                      ? 'Đã nhận (dữ liệu cũ)'
                      : 'Chưa nhận'}
                </span>
                <span>{b.actualCheckOutAt ? fmtDateTime(b.actualCheckOutAt) : 'Chưa trả'}</span>
              </div>
              <div>
                <small>Truy cập phòng</small>
                <span>
                  {inHouse
                    ? `Hiệu lực đến ${fmtDateTime(checkoutAt(b))}`
                    : 'Chưa có quyền đang sử dụng'}
                </span>
                {b.securityCode && (
                  <button
                    className="btn btn-link p-0 text-start"
                    onClick={() => setShowSecret((v) => !v)}
                  >
                    Mã nhận phòng: {showSecret ? b.securityCode : '••••••'}
                  </button>
                )}
              </div>
            </div>
            {(b.originalCheckInTime !== b.effectiveCheckInTime ||
              b.originalCheckOutTime !== checkoutAt(b)) && (
              <p className="small text-muted mt-3">
                Lịch ban đầu: {fmtDateTime(b.originalCheckInTime)} →{' '}
                {fmtDateTime(b.originalCheckOutTime)}
              </p>
            )}
            {next && (
              <p className="mt-3">
                Lượt kế tiếp: <strong>{next.code}</strong> ·{' '}
                {fmtDateTime(next.effectiveCheckInTime)} · cần chừa {data.rules.cleaningBuffer} phút
                dọn.
              </p>
            )}
            <div className="booking-detail-actions mt-3">
              {pending && (
                <button className="btn btn-light" onClick={() => open('edit')}>
                  Sửa lịch
                </button>
              )}
              {active && (
                <button className="btn btn-light" onClick={() => open('move')}>
                  Đổi phòng
                </button>
              )}
              {inHouse && (
                <button className="btn btn-light" onClick={() => open('extend')}>
                  Gia hạn
                </button>
              )}
              {pending && (
                <>
                  <button className="btn btn-outline-danger" onClick={() => open('cancel')}>
                    Hủy booking
                  </button>
                  {Date.parse(b.effectiveCheckInTime) < Date.now() && (
                    <details className="booking-secondary-actions">
                      <summary>Thao tác khác</summary>
                      <button className="btn btn-light" onClick={() => open('no-show')}>
                        Khách không đến
                      </button>
                    </details>
                  )}
                </>
              )}
            </div>
            <label className="form-label mt-4" htmlFor="detailNote">
              Ghi chú
            </label>
            <textarea
              id="detailNote"
              className="form-control"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              className="btn btn-light mt-2"
              disabled={note === (b.note ?? '')}
              onClick={() => {
                act.saveNote(b.code, note);
                toast('Đã lưu ghi chú.');
              }}
            >
              Lưu ghi chú
            </button>
            <div className="booking-detail-actions mt-4">
              <button className="btn btn-light" onClick={copy}>
                <i className="bi bi-copy" /> Sao chép xác nhận
              </button>
            </div>
          </>
        )}
        {tab === 'Sản phẩm' && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="workflow-heading mb-0">Sản phẩm của booking</h3>
              {active && (
                <button className="btn-primary-custom" onClick={() => open('products')}>
                  Thêm sản phẩm
                </button>
              )}
            </div>
            <BookingProducts b={b} />
          </>
        )}
        {tab === 'Chi phí & thanh toán' && <BookingCosts booking={b} />}
        <div hidden={tab !== 'Khách lưu trú'}>
          <BookingGuests key={b.code} booking={b} />
        </div>
        {tab === 'Lịch sử' && (
          <ol className="booking-history">
            {[...b.events]
              .sort((a, c) => Date.parse(c.at) - Date.parse(a.at))
              .map((event, index) => (
                <li key={index}>
                  <small>{fmtDateTime(event.at)}</small>
                  <p>{event.text}</p>
                </li>
              ))}
          </ol>
        )}
      </div>
      {task && (
        <BookingTask
          key={`${b.code}-${task}`}
          task={task}
          b={b}
          onClose={() => {
            setTask(null);
            clearInitialCheckin();
          }}
        />
      )}
    </section>
  );
}
