import { useRef, useState } from 'react';
import type { Folio, PayMethod } from '../types';
import { useStore } from '../store';
import { useModal } from '../components/ModalHost';
import { money } from '../lib/format';
import { scoped } from '../lib/scope';
import { folioDue } from '../lib/folio';
import { useBooking } from './context';
import { recordPayment } from './actions';
import { FolioSummary } from './BookingCosts';

export const useFolios = () => {
  const { data } = useStore();
  return scoped(data, data.folios);
};

function CollectForm({ code, onDone }: { code: string; onDone: () => void }) {
  const { data, update, toast } = useStore();
  const booking = data.folios.find((folio) => folio.code === code)!;
  const due = folioDue(booking);
  const [tendered, setTendered] = useState(String(due));
  const [method, setMethod] = useState<PayMethod>('cash');
  const submitted = useRef(false);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitted.current) return;
    const given = Number(tendered);
    if (
      !Number.isSafeInteger(due) ||
      due < 1 ||
      (method === 'cash' && (!Number.isSafeInteger(given) || given < due))
    ) {
      toast('Kiểm tra số tiền và tiền khách đưa.');
      return;
    }
    submitted.current = true;
    update((d) => {
      const target = d.folios.find((folio) => folio.code === code)!;
      recordPayment(d, target, folioDue(target), method, 'Quyết toán bởi Nguyễn Anh');
    });
    onDone();
    toast('Đã ghi nhận đủ tiền. Booking vẫn giữ trạng thái lưu trú hiện tại.');
  };

  return (
    <>
      <FolioSummary b={booking} />
      <form id="workflowPayment" onSubmit={submit}>
        <div className="row g-3">
          <div className="col-sm-6">
            <label className="form-label">
              Phương thức
              <select
                className="form-select"
                name="method"
                value={method}
                onChange={(e) => setMethod(e.target.value as PayMethod)}
              >
                <option value="cash">Tiền mặt</option>
                <option value="transfer">Chuyển khoản tại quầy</option>
                <option value="card">Thẻ tại quầy</option>
              </select>
            </label>
          </div>
          <div className="col-sm-6">
            <label className="form-label">
              Số tiền ghi nhận (₫)
              <input
                className="form-control"
                type="number"
                name="amount"
                min={1}
                max={due}
                value={due}
                readOnly
                required
              />
            </label>
          </div>
          {method === 'cash' && (
            <div className="col-sm-6">
              <label className="form-label">
                Khách đưa (tiền mặt, ₫)
                <input
                  className="form-control"
                  type="number"
                  name="tendered"
                  min={0}
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                />
              </label>
            </div>
          )}
          <div className="col-sm-6">
            <label className="form-label">
              Người thu
              <input className="form-control" name="collector" value="Nguyễn Anh" readOnly />
            </label>
          </div>
        </div>
        {method === 'cash' && (
          <div className="workflow-change">
            Tiền trả lại: {money(Math.max(0, Number(tendered) - due))}
          </div>
        )}
      </form>
    </>
  );
}

export function useFolioDialogs() {
  const modal = useModal();
  const { openDetail } = useBooking();
  const collect = (booking: Folio) =>
    modal.openInfo({
      title: `Thu tiền · ${booking.code}`,
      size: 'lg',
      body: <CollectForm code={booking.code} onDone={modal.close} />,
      footer: (
        <button className="btn-primary-custom" type="submit" form="workflowPayment">
          Ghi nhận thanh toán demo
        </button>
      )
    });
  const detail = (booking: Folio) => {
    modal.close();
    openDetail(booking.code);
  };
  return { detail, collect };
}
