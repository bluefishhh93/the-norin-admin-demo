import { useState } from 'react';
import { useStore } from '../store';
import { Modal } from '../components/Modal';
import { fmtDateTime } from '../lib/format';
import { Pill } from '../components/ui';
import { KioskSessionView } from './KioskSessionView';
import { useKioskActions } from './actions';
import { KIOSK_STATUS, kioskStatus, kioskWarnings } from './session';

export function KioskDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, toast } = useStore();
  const [cards, setCards] = useState(0);
  const [binCleared, setBinCleared] = useState(false);
  const act = useKioskActions();
  const k = data.kiosks.find((x) => x.id === id);
  if (!k) return null;
  const status = KIOSK_STATUS[kioskStatus(k)];
  const warnings = kioskWarnings(k);

  return (
    <Modal
      open
      size="lg"
      eyebrow={k.location}
      title={
        <>
          {k.name} <Pill status={status.pill} label={status.label} />
        </>
      }
      onClose={onClose}
    >
      <h3 className="workflow-heading">Phiên hiện tại</h3>
      <KioskSessionView k={k} onOpenBooking={onClose} />

      <h3 className="workflow-heading mt-4">Thiết bị & vật tư</h3>
      {warnings.length ? (
        <ul className="kiosk-faults">
          {k.faults.map((fault) => (
            <li key={fault}>
              <i className="bi bi-exclamation-triangle" /> {fault}
              <button className="text-link" onClick={() => act.clearFault(k.id, fault)}>
                Đã khắc phục
              </button>
            </li>
          ))}
          {warnings
            .filter((w) => !k.faults.includes(w))
            .map((w) => (
              <li key={w}>
                <i className="bi bi-box-seam" /> {w}
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-muted">Máy quét, bộ phát thẻ K750, SmartPOS và máy in hoạt động bình thường.</p>
      )}
      {(k.cardStock !== 'ok' || k.rejectBinFull) && <div className="kiosk-payment-controls mb-3">
        <label>Số thẻ đã nạp thêm
          <input aria-label="Số thẻ đã nạp thêm" className="form-control" type="number" min={0} max={500} value={cards} onChange={(e) => setCards(Number(e.target.value))} />
        </label>
        {k.rejectBinFull && <label><input type="checkbox" checked={binCleared} onChange={(e) => setBinCleared(e.target.checked)} /> Đã dọn hộp thu hồi</label>}
        <button className="btn btn-light" onClick={() => {
          if (!Number.isInteger(cards) || cards < 0 || cards > 500 || (!cards && !binCleared)) {
            toast('Nhập số thẻ đã nạp hoặc xác nhận đã dọn hộp thu hồi.');
            return;
          }
          act.supply(k.id, cards, binCleared);
          setCards(0);
          setBinCleared(false);
        }}>Ghi nhận vật tư</button>
      </div>}
      <p className="text-muted small">
        {k.agentOnline ? 'Agent đang kết nối' : `Agent mất kết nối từ ${fmtDateTime(k.lastSeenAt)}`}
        {k.lastSupply &&
          ` · Bổ sung gần nhất ${fmtDateTime(k.lastSupply.at)}: +${k.lastSupply.cardsAdded} thẻ${k.lastSupply.binCleared ? ', đã dọn hộp thu hồi' : ''}`}
      </p>

      <h3 className="workflow-heading mt-4">Cấu hình</h3>
      <p className="text-muted small">
        SmartPOS {k.terminal} · Token {k.token.slice(0, 6)}••••
      </p>
    </Modal>
  );
}
