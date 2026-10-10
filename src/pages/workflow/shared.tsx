import { useRef, useState } from 'react';
import type { Folio } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { money } from '../../lib/format';
import { scoped } from '../../lib/scope';
import { folioDue, folioPaid, folioTotal } from '../../lib/folio';
import { TextLink } from '../../components/ui';
import { useBooking } from '../../booking/context';
import { recordPayment } from '../../booking/actions';

export const useFolios = () => { const { data } = useStore(); return scoped(data, data.folios); };

export const recordEvent = (b: Folio, text: string) => { b.events.unshift({ at: new Date().toISOString(), text }); };
export function FolioSummary({ b }: { b: Folio }) {
  return (
    <div className="workflow-folio">
      {b.orderDetails.filter(item => item.fulfillment !== 'cancelled').map((item, i) => (
        <div key={i}>
          <span>{item.name} <small>{item.productType === 6 ? 'Tiền phòng' : item.phase === 'stay' ? 'Gọi thêm' : 'Đặt kèm'} · {Number(item.quantity)} × {money(Number(item.price))}</small></span>
          <strong>{money(Number(item.quantity) * Number(item.price))}</strong>
        </div>
      ))}
      <div><span>Giảm giá voucher</span><strong>−{money(Number(b.voucherDiscount || 0))}</strong></div>
      <div><strong>Tổng đơn</strong><strong>{money(folioTotal(b))}</strong></div>
      <div><span>Đã thanh toán</span><strong>{money(folioPaid(b))}</strong></div>
      <div className="workflow-due"><strong>Còn phải thu</strong><strong>{money(folioDue(b))}</strong></div>
    </div>
  );
}

function CollectForm({ b, onDone }: { b: Folio; onDone: () => void }) {
  const { update, toast } = useStore();
  const due = folioDue(b);
  const amount = String(due);
  const [tendered, setTendered] = useState(String(due));
  const [method, setMethod] = useState<Folio['payments'][number]['method']>('cash');
  const submitted = useRef(false);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitted.current) return;
    const f = e.currentTarget.elements as unknown as Record<string, HTMLInputElement>;
    const value = Number(amount), given = Number(tendered), method = f.method.value as Folio['payments'][number]['method'], collector = 'Nguyễn Anh';
    if (!Number.isSafeInteger(value) || value < 1 || value > due || !collector || (method === 'cash' && (!Number.isSafeInteger(given) || given < value))) {
      toast('Kiểm tra số tiền, tiền khách đưa và người thu.'); return;
    }
    submitted.current = true;
    update(d => {
      const target = d.folios.find(x => x.code === b.code);
      if (!target || folioDue(target) !== value) return;
      recordPayment(d, target, value, method, `Quyết toán bởi ${collector}`);
    });
    onDone();
    toast('Đã ghi nhận đủ tiền. Booking vẫn giữ trạng thái lưu trú hiện tại.');
  };

  return (
    <>
      <FolioSummary b={b} />
      <form id="workflowPayment" onSubmit={submit}>
        <div className="row g-3">
          <div className="col-sm-6"><label className="form-label">Phương thức<select className="form-select" name="method" value={method} onChange={e => setMethod(e.target.value as Folio['payments'][number]['method'])}><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản tại quầy</option><option value="card">Thẻ tại quầy</option></select></label></div>
          <div className="col-sm-6"><label className="form-label">Số tiền ghi nhận (₫)<input className="form-control" type="number" name="amount" min={1} max={due} value={amount} readOnly required /></label></div>
          {method === 'cash' && <div className="col-sm-6"><label className="form-label">Khách đưa (tiền mặt, ₫)<input className="form-control" type="number" name="tendered" min={0} value={tendered} onChange={e => setTendered(e.target.value)} /></label></div>}
          <div className="col-sm-6"><label className="form-label">Người thu<input className="form-control" name="collector" value="Nguyễn Anh" readOnly /></label></div>
        </div>
        {method === 'cash' && <div className="workflow-change">Tiền trả lại: {money(Math.max(0, Number(tendered) - Number(amount)))}</div>}
      </form>
    </>
  );
}

export function useFolioDialogs() {
  const modal = useModal();
  const { openDetail } = useBooking();

  const collect = (b: Folio) => modal.openInfo({
    title: `Thu tiền · ${b.code}`, size: 'lg',
    body: <CollectForm b={b} onDone={modal.close} />,
    footer: <button className="btn-primary-custom" type="submit" form="workflowPayment">Ghi nhận thanh toán demo</button>
  });

  const detail = (b: Folio) => { modal.close(); openDetail(b.code); };

  return { detail, collect };
}

export const FlowLink = TextLink;
