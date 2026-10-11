import { useCallback, useState } from 'react';
import type { Folio } from '../types';
import { useStore } from '../store';
import { Modal } from '../components/Modal';
import { fmtTime, money } from '../lib/format';
import { checkoutAt, folioDue } from '../lib/folio';
import { className } from '../lib/rooms';
import { findCardHolder, formatUid, parseCardUid } from './card';
import { floorOf } from './guest';
import { useCardReader } from './useCardReader';
import { ManualUidInput, ReaderVisual } from './CardReaderParts';
import { GuestDocsModal } from './GuestDocsModal';
import { STAY_ICON, fmtDay } from './stay';

type Lookup = { uid: string; folio: Folio } | { uid: string; error: string } | null;

const lateMinutes = (b: Folio) => Math.floor((Date.now() - Date.parse(checkoutAt(b))) / 60000);

export function CardLookupModal({
  onOpenDetail,
  onClose
}: {
  onOpenDetail: (code: string) => void;
  onClose: () => void;
}) {
  const { data } = useStore();
  const [result, setResult] = useState<Lookup>(null);
  const [docs, setDocs] = useState(false);

  const lookup = useCallback(
    (value: string) => {
      const parsed = parseCardUid(value);
      if (!parsed) {
        setResult({ uid: value, error: 'Không nhận dạng được mã thẻ. Đặt lại thẻ lên máy E3.' });
        return false;
      }
      const folio = findCardHolder(data, parsed.hex);
      if (!folio)
        setResult({
          uid: parsed.hex,
          error: 'Thẻ chưa được phát cho booking nào đang ở, hoặc đã bị thu hồi.'
        });
      else if (folio.branchId !== data.branchId)
        setResult({ uid: parsed.hex, error: 'Thẻ thuộc chi nhánh khác.' });
      else setResult({ uid: parsed.hex, folio });
      return true;
    },
    [data]
  );

  useCardReader(!result || 'error' in result, lookup);

  const b = result && 'folio' in result ? result.folio : null;
  const room = b && data.rooms.find((r) => r.branchId === b.branchId && r.number === b.room);
  const due = b ? folioDue(b) : 0;
  const late = b ? lateMinutes(b) : 0;
  const guests = b?.guests ?? [];

  if (b && docs) return <GuestDocsModal b={b} onClose={() => setDocs(false)} />;

  return (
    <Modal
      open
      eyebrow="TRẢ PHÒNG"
      title={b ? `Phòng ${b.room} · ${b.code}` : 'Quét thẻ phòng'}
      onClose={onClose}
      footer={
        b ? (
          <>
            <button className="btn btn-light me-auto" onClick={() => setResult(null)}>
              <i className="bi bi-arrow-repeat" /> Quét thẻ khác
            </button>
            <button className="btn-primary-custom" onClick={() => onOpenDetail(b.code)}>
              Mở chi tiết booking <i className="bi bi-arrow-right" />
            </button>
          </>
        ) : (
          <button className="btn btn-light" onClick={onClose}>
            Đóng
          </button>
        )
      }
    >
      {!b ? (
        <>
          <div className={`ic-stage ${result ? 'ic-error' : 'ic-waiting'}`} aria-live="polite">
            <ReaderVisual state={result ? 'error' : 'waiting'} />
            {result && 'error' in result ? (
              <>
                <strong className="text-danger">Không tìm thấy lượt ở</strong>
                <p>{result.error}</p>
                {parseCardUid(result.uid) && (
                  <p className="bsp-uid">UID {formatUid(result.uid)}</p>
                )}
              </>
            ) : (
              <>
                <strong>Đặt thẻ phòng lên máy E3</strong>
                <p>Hệ thống sẽ tìm booking đang dùng thẻ này.</p>
              </>
            )}
          </div>
          <ManualUidInput id="lookupManualUid" onSubmit={lookup} />
        </>
      ) : (
        <div className="cl" aria-live="polite">
          <div className="ci-room">
            <div className="ci-room-no">
              <small>Phòng</small>
              <strong>{b.room}</strong>
            </div>
            <dl className="ci-room-facts cl-facts">
              <div>
                <dt>Tầng</dt>
                <dd>{floorOf(b.room)}</dd>
              </div>
              <div>
                <dt>Hạng phòng</dt>
                <dd>{room ? className(data, room) : '—'}</dd>
              </div>
              <div>
                <dt>Thẻ</dt>
                <dd className="bsp-uid">{formatUid(result!.uid)}</dd>
              </div>
            </dl>
          </div>

          <div className="cl-row">
            <div className="bd-guest">
              <span className="bd-avatar" aria-hidden="true">
                {b.customer.trim().charAt(0).toUpperCase() || '?'}
              </span>
              <div className="bd-guest-info">
                <strong>{b.customer}</strong>
                <span>{b.phone || '—'}</span>
              </div>
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={() => setDocs(true)}
                disabled={!guests.length}
                title={guests.length ? undefined : 'Chưa nhập thông tin khách'}
              >
                <i className="bi bi-person-vcard" /> Xem giấy tờ
                {guests.length > 0 && ` (${guests.length})`}
              </button>
            </div>
            <div className="cl-stay">
              <span className="bd-stay-type">
                <i className={`bi ${STAY_ICON[b.stayType]}`} aria-hidden="true" /> {b.stayType}
              </span>
              <span>
                {fmtTime(b.effectiveCheckInTime)} {fmtDay(b.effectiveCheckInTime)} →{' '}
                <strong>{fmtTime(checkoutAt(b))}</strong> {fmtDay(checkoutAt(b))}
              </span>
              {late > 0 && <em className="cl-late">Quá giờ {late} phút</em>}
            </div>
          </div>

          <div className={`cl-due${due > 0 ? ' owe' : ''}`}>
            <span>{due > 0 ? 'Còn phải thu' : 'Đã thanh toán đủ'}</span>
            <strong>{money(due)}</strong>
          </div>
        </div>
      )}
    </Modal>
  );
}
