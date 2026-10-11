import { useState } from 'react';
import type { Folio } from '../types';
import { useStore } from '../store';
import { useBooking } from './context';
import { useBookingActions } from './actions';
import { paymentTiming, refundable, statusLabel } from './model';
import { branchName, fmtDateTime, fmtTime, money } from '../lib/format';
import { checkoutAt, folioDue, folioPaid, folioTotal, isActive } from '../lib/folio';
import { className } from '../lib/rooms';
import { Tabs } from '../components/ui';
import { useFolioDialogs } from './payment';
import { BookingProducts } from './BookingProducts';
import { BookingTask, type BookingTaskKind } from './BookingTask';
import { BookingCosts } from './BookingCosts';
import { BookingGuests } from './BookingGuests';
import { CheckinModal } from './CheckinModal';
import { GuestModal } from './GuestModal';
import { IssueCardModal } from './IssueCardModal';
import { BookingStayPanel } from './BookingStayPanel';
import { STAY_ICON, fmtDay, stayLength } from './stay';
import { currentStep, kioskOfBooking } from '../kiosk/session';

type DetailTab = 'Tổng quan' | 'Sản phẩm' | 'Chi phí & thanh toán' | 'Khách lưu trú' | 'Lịch sử';
type DetailModal = 'checkin' | 'card' | 'guests';

export function BookingDetail({ b }: { b: Folio }) {
  const { data, toast } = useStore();
  const { closeDetail, initialCheckin, clearInitialCheckin } = useBooking();
  const act = useBookingActions();
  const { collect } = useFolioDialogs();
  const [tab, setTab] = useState<DetailTab>('Tổng quan');
  const [task, setTask] = useState<BookingTaskKind | null>(null);
  const [modal, setModal] = useState<DetailModal | null>(initialCheckin ? 'checkin' : null);
  const [note, setNote] = useState(b.note ?? '');
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
  const closeModal = () => {
    setModal(null);
    clearInitialCheckin();
  };
  const lock = data.locks.find((l) => l.branchId === b.branchId && l.room === b.room);
  const kiosk = kioskOfBooking(data, b.code);
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
            <button className="btn-primary-custom" onClick={() => setModal('checkin')}>
              Nhận phòng
            </button>
          )}
          {inHouse && (
            <button className="btn btn-light" onClick={() => setModal('guests')}>
              <i className="bi bi-person-vcard" />{' '}
              {b.guests?.length ? 'Thông tin khách' : 'Nhập thông tin khách'}
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
      {kiosk?.session && (
        <div className={`alert ${kiosk.session.handedOver ? 'alert-info' : 'alert-warning'}`}>
          {kiosk.session.handedOver
            ? `Chuyển từ ${kiosk.name}: hồ sơ, thanh toán và thẻ đã có được giữ nguyên. Chỉ bổ sung phần còn thiếu rồi nhận phòng.`
            : `Đang xử lý tại ${kiosk.name} · ${currentStep(kiosk.session).label}. Chuyển sang quầy trong Thiết bị kiosk để nhận phòng tại đây.`}
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
        <div className={!refund && active && due > 0 ? 'owe' : undefined}>
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
            <div className="bd-overview">
              <div className="bd-guest">
                <span className="bd-avatar" aria-hidden="true">
                  {b.customer.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <div className="bd-guest-info">
                  <strong>{b.customer}</strong>
                  {b.phone ? <a href={`tel:${b.phone.replace(/\s/g, '')}`}>{b.phone}</a> : <span>—</span>}
                </div>
                {b.securityCode && (
                  <div className="bd-pin">
                    <small>Mật khẩu</small>
                    <strong>{b.securityCode}</strong>
                  </div>
                )}
              </div>
              <div className="bd-stay">
                <div className="bd-stay-point">
                  <small>Nhận phòng</small>
                  <strong>{fmtTime(b.effectiveCheckInTime)}</strong>
                  <span>{fmtDay(b.effectiveCheckInTime)}</span>
                  {(b.actualCheckInAt || inHouse) && (
                    <em>
                      <i className="bi bi-check2" aria-hidden="true" /> Đã nhận
                      {b.actualCheckInAt ? ` ${fmtTime(b.actualCheckInAt)}` : ''}
                    </em>
                  )}
                </div>
                <div className="bd-stay-line">
                  <span className="bd-stay-type">
                    <i className={`bi ${STAY_ICON[b.stayType]}`} aria-hidden="true" /> {b.stayType}
                  </span>
                  <small>{stayLength(b.stayType, b.effectiveCheckInTime, checkoutAt(b))}</small>
                </div>
                <div className="bd-stay-point end">
                  <small>Trả phòng</small>
                  <strong>{fmtTime(checkoutAt(b))}</strong>
                  <span>{fmtDay(checkoutAt(b))}</span>
                  {b.actualCheckOutAt && (
                    <em>
                      <i className="bi bi-check2" aria-hidden="true" /> Đã trả{' '}
                      {fmtTime(b.actualCheckOutAt)}
                    </em>
                  )}
                </div>
              </div>
            </div>
            {(b.originalCheckInTime !== b.effectiveCheckInTime ||
              b.originalCheckOutTime !== checkoutAt(b) ||
              next) && (
              <div className="bd-meta">
                {(b.originalCheckInTime !== b.effectiveCheckInTime ||
                  b.originalCheckOutTime !== checkoutAt(b)) && (
                  <span>
                    Lịch cũ {fmtDateTime(b.originalCheckInTime)} →{' '}
                    {fmtDateTime(b.originalCheckOutTime)}
                  </span>
                )}
                {next && (
                  <span>
                    Lượt sau <strong>{next.code}</strong> · {fmtDateTime(next.effectiveCheckInTime)}
                  </span>
                )}
              </div>
            )}
            {(inHouse || !!b.roomCards?.length) && (
              <BookingStayPanel
                b={b}
                roomClass={room ? className(data, room) : '—'}
                lockAlias={lock?.alias}
                editable={inHouse}
                onIssue={() => setModal('card')}
                onRevoke={(uid) => {
                  act.revokeCard(b.code, uid);
                  toast('Đã thu hồi thẻ phòng.');
                }}
                onGuests={() => setModal('guests')}
              />
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
        {tab === 'Khách lưu trú' && (
          <BookingGuests
            booking={b}
            onEdit={inHouse || pending ? () => setModal('guests') : undefined}
          />
        )}
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
      {modal === 'checkin' && <CheckinModal key={b.code} b={b} onClose={closeModal} />}
      {modal === 'card' && (
        <IssueCardModal
          key={b.code}
          bookingCode={b.code}
          room={b.room}
          lockId={lock?.lockId ?? null}
          lockAlias={lock?.alias}
          validFrom={new Date().toISOString()}
          validTo={checkoutAt(b)}
          confirmLabel="Kích hoạt thẻ"
          onIssued={(card) => {
            act.issueCard(b.code, card);
            return null;
          }}
          onClose={closeModal}
        />
      )}
      {modal === 'guests' && <GuestModal key={b.code} b={b} onClose={closeModal} />}
    </section>
  );
}
