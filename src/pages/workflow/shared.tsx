import { useState } from 'react';
import type { DemoData, Folio } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { branchName, fmtDateTime, maskPhone, methodLabel, money } from '../../lib/format';
import { scoped } from '../../lib/scope';
import { cameraOf, folioDue, folioPaid, folioTotal } from '../../lib/folio';
import { ScopeNote, TextLink } from '../../components/ui';

export const useFolios = () => { const { data } = useStore(); return scoped(data, data.folios); };

export const recordEvent = (b: Folio, text: string) => { b.events.unshift({ at: new Date().toISOString(), text }); };
export const notifyEvent = (d: DemoData, b: Folio, text: string) => {
  d.notifications.unshift({ code: b.code, branchId: b.branchId, at: new Date().toISOString(), text });
  recordEvent(b, text);
};

export function FolioSummary({ b }: { b: Folio }) {
  return (
    <div className="workflow-folio">
      {b.orderDetails.map((item, i) => (
        <div key={i}>
          <span>{item.name} <small>{item.phase === 'stay' ? 'Gọi tại phòng' : 'Đặt kèm'} · {Number(item.quantity)} × {money(Number(item.price))}</small></span>
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
  const [amount, setAmount] = useState(String(due));
  const [tendered, setTendered] = useState(String(due));

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget.elements as unknown as Record<string, HTMLInputElement>;
    const value = Number(amount), given = Number(tendered), method = f.method.value as Folio['payments'][number]['method'], collector = f.collector.value.trim();
    if (!Number.isSafeInteger(value) || value < 1 || value > due || !collector || (method === 'cash' && (!Number.isSafeInteger(given) || given < value))) {
      toast('Kiểm tra số tiền, tiền khách đưa và người thu.'); return;
    }
    const remaining = due - value;
    update(d => {
      const target = d.folios.find(x => x.code === b.code);
      if (!target) return;
      target.payments.push({ id: `PM-${Date.now()}`, method, amount: value, createdAt: new Date().toISOString(), collector });
      recordEvent(target, `Lễ tân ${collector} ghi nhận ${money(value)} bằng ${method === 'cash' ? 'tiền mặt' : method} trong demo`);
      if (folioDue(target) === 0) d.requests.filter(r => r.code === b.code && r.status === 'pending').forEach(r => { r.status = 'collected'; });
    });
    onDone();
    toast(remaining === 0 ? 'Đã ghi nhận đủ tiền. Có thể hoàn tất checkout tại kiosk.' : `Đã thu một phần, còn ${money(remaining)}.`);
  };

  return (
    <>
      <FolioSummary b={b} />
      <form id="workflowPayment" onSubmit={submit}>
        <div className="row g-3">
          <div className="col-sm-6"><label className="form-label">Phương thức<select className="form-select" name="method"><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản tại quầy</option><option value="card">Thẻ tại quầy</option></select></label></div>
          <div className="col-sm-6"><label className="form-label">Số tiền ghi nhận (₫)<input className="form-control" type="number" name="amount" min={1} max={due} value={amount} onChange={e => setAmount(e.target.value)} required /></label></div>
          <div className="col-sm-6"><label className="form-label">Khách đưa (tiền mặt, ₫)<input className="form-control" type="number" name="tendered" min={0} value={tendered} onChange={e => setTendered(e.target.value)} /></label></div>
          <div className="col-sm-6"><label className="form-label">Người thu<input className="form-control" name="collector" maxLength={60} defaultValue="Lễ tân" required /></label></div>
        </div>
        <div className="workflow-change">Tiền thối: {money(Math.max(0, Number(tendered) - Number(amount)))}</div>
      </form>
    </>
  );
}

export function useFolioDialogs() {
  const { data } = useStore();
  const modal = useModal();

  const collect = (b: Folio) => modal.openInfo({
    title: `Thu tiền · ${b.code}`, size: 'lg',
    body: <CollectForm b={b} onDone={modal.close} />,
    footer: <button className="btn-primary-custom" type="submit" form="workflowPayment">Ghi nhận thanh toán demo</button>
  });

  const detail = (b: Folio) => {
    const cam = cameraOf(data, b);
    modal.openInfo({
      title: `Booking ${b.code} · phòng ${b.room}`, size: 'lg',
      body: <>
        <ScopeNote icon={null}>{b.source} · {branchName(b.branchId)} · {b.stayType} · {b.checkinDecision}</ScopeNote>
        <p><strong>Khách:</strong> {b.customer} · {maskPhone(b.phone)}</p>
        <p><strong>Giờ gốc:</strong> {fmtDateTime(b.originalCheckInTime)} → {fmtDateTime(b.originalCheckOutTime)}</p>
        <p><strong>Giờ hiệu lực:</strong> {fmtDateTime(b.effectiveCheckInTime)} → {fmtDateTime(b.effectiveCheckOutTime)}</p>
        <p><strong>Camera:</strong> {cam?.state || 'Chưa có lượt check-in'} · {cam?.lastOccupancy ?? 0} người</p>
        <FolioSummary b={b} />
        <h3 className="workflow-heading">Thanh toán</h3>
        {b.payments.length ? b.payments.map(p => <p key={p.id}>{fmtDateTime(p.createdAt)} · {methodLabel[p.method] || p.method} · {money(Number(p.amount))} · {p.collector}</p>) : <p>Chưa thanh toán.</p>}
        <h3 className="workflow-heading">Lịch sử</h3>
        {b.events.map((e, i) => <p key={i}>{fmtDateTime(e.at)} · {e.text}</p>)}
      </>,
      footer: folioDue(b) ? <button className="btn-primary-custom" type="button" onClick={() => collect(b)}>Thu tiền</button> : undefined
    });
  };

  return { detail, collect };
}

export const FlowLink = TextLink;
