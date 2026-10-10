import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { branchName, fmtDateTime, methodLabel, money } from '../../lib/format';
import { scoped } from '../../lib/scope';
import { folioDue, isActive } from '../../lib/folio';
import { DataTable, MetricCard, Panel, PrimaryButton, ScopeNote, TextLink, Toolbar } from '../../components/ui';
import { useFolioDialogs } from './shared';

export function Cashier() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const { detail, collect } = useFolioDialogs();
  const folios = scoped(data, data.folios);
  const pending = scoped(data, data.requests).filter(r => r.status === 'pending');
  const transactions = folios.flatMap(b => b.payments.map(p => ({ b, p }))).sort((a, c) => Date.parse(c.p.createdAt) - Date.parse(a.p.createdAt));
  const cash = transactions.filter(({ p }) => p.method === 'cash').reduce((s, { p }) => s + Number(p.amount), 0);
  const outstanding = folios.filter(isActive).reduce((s, b) => s + folioDue(b), 0);

  const openShift = () => modal.openForm({
    title: 'Kết ca · đối soát tiền mặt', submitLabel: 'Lưu kết ca demo', size: 'lg',
    body: <>
      <p>Tiền mặt đã ghi nhận: <strong>{money(cash)}</strong></p>
      <label className="form-label d-block">Tiền kiểm đếm thực tế (₫)<input className="form-control" name="counted" type="number" min={0} defaultValue={cash} required /></label>
      <label className="form-label d-block mt-3">Ghi chú chênh lệch hoặc booking đổi phòng<textarea className="form-control" name="note" rows={2} /></label>
      <ScopeNote icon={null} className="mt-3">Đối chiếu tiền mặt trong két với sổ giao dịch của admin; chênh lệch được lưu cùng ca.</ScopeNote>
      {data.shifts.length > 0 && (
        <DataTable headers={['THỜI GIAN', 'SỔ', 'KIỂM ĐẾM', 'CHÊNH LỆCH']}>
          {data.shifts.slice(0, 5).map((s, i) => <tr key={i}><td>{fmtDateTime(s.at)}</td><td>{money(s.expected)}</td><td>{money(s.counted)}</td><td>{money(s.counted - s.expected)}</td></tr>)}
        </DataTable>
      )}
    </>,
    onSubmit: v => {
      const counted = Number(v.counted);
      if (!Number.isSafeInteger(counted) || counted < 0) { toast('Nhập số tiền kiểm đếm hợp lệ.'); return false; }
      update(d => { d.shifts.unshift({ at: new Date().toISOString(), counted, expected: cash, note: v.note.trim(), branchId: d.branchId }); });
      toast(`Đã kết ca demo · chênh lệch ${money(counted - cash)}.`);
    }
  });

  return (
    <>
      <div className="metric-grid">
        <MetricCard label="Chờ thu tại kiosk" value={pending.length} />
        <MetricCard label="Còn nợ trong phạm vi xem" value={money(outstanding)} />
        <MetricCard label="Tiền mặt đã ghi nhận" value={money(cash)} />
      </div>
      <ScopeNote icon={null}>Admin là sổ thu chính: kiosk chỉ cho hoàn tất trả phòng khi folio tại đây còn nợ 0 ₫. Dữ liệu demo lưu trên trình duyệt.</ScopeNote>
      <Panel title="Yêu cầu thu tiền mặt" subtitle="Kiosk đặt phòng hoặc gọi nhân viên lúc trả phòng">
        <DataTable headers={['YÊU CẦU', 'BOOKING / PHÒNG', 'KIOSK', 'THỜI GIAN', 'CÒN THU', 'THAO TÁC']}>
          {pending.map(r => {
            const b = folios.find(f => f.code === r.code);
            if (!b) return null;
            const waiting = Math.max(0, Math.floor((Date.now() - Date.parse(r.requestedAt)) / 60000));
            return (
              <tr key={r.id}>
                <td><strong>{r.context === 'CHECKOUT' ? 'Trả phòng' : 'Đặt phòng'}</strong></td>
                <td><TextLink icon="bi-receipt" onClick={() => detail(b)}>{b.code}</TextLink><small>Phòng {b.room} · {branchName(b.branchId)}</small></td>
                <td>{r.kiosk}</td>
                <td className={waiting >= 5 ? 'workflow-alert' : ''}>{waiting} phút</td>
                <td><strong>{money(folioDue(b))}</strong></td>
                <td><TextLink icon="bi-cash-stack" onClick={() => collect(b)}>Thu tiền</TextLink></td>
              </tr>
            );
          })}
        </DataTable>
      </Panel>
      <Toolbar>
        <h2 className="workflow-heading">Giao dịch đã ghi nhận</h2>
        <PrimaryButton onClick={openShift}>Kết ca</PrimaryButton>
      </Toolbar>
      <Panel title="Sổ giao dịch" subtitle="Thanh toán mô phỏng theo từng booking">
        <DataTable headers={['THỜI GIAN', 'BOOKING', 'PHƯƠNG THỨC', 'SỐ TIỀN', 'NGƯỜI THU']}>
          {transactions.map(({ b, p }) => (
            <tr key={p.id}><td>{fmtDateTime(p.createdAt)}</td><td>{b.code} · {b.room}</td><td>{methodLabel[p.method] || p.method}</td><td><strong>{money(Number(p.amount))}</strong></td><td>{p.collector}</td></tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
