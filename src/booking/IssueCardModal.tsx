import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomCard } from '../types';
import { useStore } from '../store';
import { Modal } from '../components/Modal';
import { fmtDateTime } from '../lib/format';
import {
  cardConflict,
  formatUid,
  parseCardUid,
  requestIssueCard,
  type ParsedCardUid
} from './card';
import { useCardReader } from './useCardReader';
import { ReaderVisual, type ReaderState } from './CardReaderParts';

export function IssueCardModal({
  bookingCode,
  room,
  lockId,
  lockAlias,
  validFrom,
  validTo,
  confirmLabel,
  allowExisting = false,
  onIssued,
  onClose
}: {
  bookingCode: string;
  room: string;
  lockId: number | null;
  lockAlias?: string;
  validFrom: string;
  validTo: string;
  confirmLabel: string;
  allowExisting?: boolean;
  onIssued: (card: RoomCard) => string | null;
  onClose: () => void;
}) {
  const { data } = useStore();
  const noLock = lockId == null;
  const [phase, setPhase] = useState<ReaderState>(noLock ? 'error' : 'waiting');
  const [uid, setUid] = useState<ParsedCardUid | null>(null);
  const [error, setError] = useState(noLock ? 'Phòng chưa liên kết khóa TTLock.' : '');
  const [confirmedExisting, setConfirmedExisting] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const accept = useCallback(
    (value: string) => {
      const parsed = parseCardUid(value);
      if (!parsed) {
        setError(`Không nhận dạng được mã thẻ "${value}". Đặt lại thẻ lên máy E3.`);
        setPhase('error');
        return;
      }
      const existing = data.folios.find((f) => f.code === bookingCode)?.roomCards?.some((card) => card.uid === parsed.hex);
      const conflict = allowExisting && existing ? null : cardConflict(data, bookingCode, parsed.hex);
      if (conflict) {
        setError(conflict);
        setPhase('error');
        return;
      }
      setUid(parsed);
      setError('');
      setPhase('read');
    },
    [data, bookingCode, allowExisting]
  );

  useCardReader(!noLock && (phase === 'waiting' || phase === 'error'), accept);

  const reset = () => {
    setUid(null);
    setConfirmedExisting(false);
    setError('');
    setPhase('waiting');
  };

  const issue = async () => {
    if (!uid || phase === 'issuing') return;
    setPhase('issuing');
    const alreadyIssued = allowExisting && data.folios.find((f) => f.code === bookingCode)?.roomCards?.some((card) => card.uid === uid.hex);
    const res = alreadyIssued ? { ok: true as const } : await requestIssueCard({ bookingCode, cardUid: uid.hex, lockId });
    if (!alive.current) return;
    if (!res.ok) {
      setError(res.reason);
      setPhase('error');
      return;
    }
    const failure = onIssued({
      uid: uid.hex,
      lockId,
      issuedAt: new Date().toISOString(),
      validFrom,
      validTo
    });
    if (failure) {
      setError(failure);
      setPhase('error');
      return;
    }
    setConfirmedExisting(Boolean(alreadyIssued));
    setPhase('done');
  };

  return (
    <Modal
      open
      eyebrow="THẺ PHÒNG"
      title={`Phát thẻ · Phòng ${room}`}
      onClose={phase === 'issuing' ? () => undefined : onClose}
      footer={
        phase === 'done' ? (
          <button className="btn-primary-custom" onClick={onClose}>
            Hoàn tất
          </button>
        ) : (
          <>
            <button className="btn btn-light" onClick={onClose} disabled={phase === 'issuing'}>
              Hủy
            </button>
            {(phase === 'read' || phase === 'issuing') && (
              <button className="btn btn-light" onClick={reset} disabled={phase === 'issuing'}>
                Đọc lại
              </button>
            )}
            <button
              className="btn-primary-custom"
              onClick={issue}
              disabled={phase !== 'read'}
              aria-busy={phase === 'issuing'}
            >
              {phase === 'issuing' ? (
                <>
                  <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Đang
                  kích hoạt…
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </>
        )
      }
    >
      <div className={`ic-stage ic-${phase}`} aria-live="polite">
        <ReaderVisual state={phase} />
        {phase === 'waiting' && (
          <>
            <strong>Đặt thẻ lên máy E3</strong>
            <p>Giữ thẻ trên đầu đọc đến khi hiện mã UID.</p>
          </>
        )}
        {(phase === 'read' || phase === 'issuing') && uid && (
          <>
            <small>UID thẻ</small>
            <strong className="ic-uid">{formatUid(uid.hex)}</strong>
            {uid.format === 'decimal' && <p>Đọc từ mã thập phân {uid.raw}</p>}
          </>
        )}
        {phase === 'done' && uid && (
          <>
            <strong>{confirmedExisting ? 'Đã xác nhận thẻ' : 'Thẻ đã kích hoạt'}</strong>
            <p>
              UID {formatUid(uid.hex)} mở được phòng {room}
            </p>
          </>
        )}
        {phase === 'error' && (
          <>
            <strong className="text-danger">Không phát được thẻ</strong>
            <p>{error}</p>
            {!noLock && (
              <button type="button" className="btn btn-light btn-sm" onClick={reset}>
                Thử lại
              </button>
            )}
          </>
        )}
      </div>

      <dl className="ic-meta">
        <div>
          <dt>Khóa</dt>
          <dd>
            {lockId == null ? (
              <span className="text-danger">Chưa liên kết</span>
            ) : (
              (lockAlias ?? lockId)
            )}
          </dd>
        </div>
        <div>
          <dt>Hiệu lực</dt>
          <dd>
            {fmtDateTime(validFrom)} → {fmtDateTime(validTo)}
          </dd>
        </div>
      </dl>
    </Modal>
  );
}
