import { useState } from 'react';
import type { Kiosk } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field } from '../../components/Form';
import { branchName } from '../../lib/format';
import { defaultBranch, scoped, isAllowedBranch } from '../../lib/scope';
import { randomToken } from '../../seed/pms';
import { DataTable, Panel, Pill, PrimaryButton, ScopeNote, TextLink, Toolbar } from '../../components/ui';
import { KioskDetailModal } from '../../kiosk/KioskDetailModal';
import { useKioskActions } from '../../kiosk/actions';
import { SCENARIOS, type Scenario } from '../../kiosk/demo';
import {
  KIOSK_STATUS,
  STEP_STATE,
  currentStep,
  kioskStatus,
  kioskWarnings,
  minutesSince,
  openSupport
} from '../../kiosk/session';

export function Kiosks() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const act = useKioskActions();
  const [viewing, setViewing] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scenario>('scan');
  const branchId = defaultBranch(data);
  const branchKiosk = data.kiosks.find((k) => k.branchId === branchId);
  const allowed = (id: string) => isAllowedBranch(data, id);
  const list = [...scoped(data, data.kiosks)].sort(
    (a, b) => KIOSK_STATUS[kioskStatus(a)].rank - KIOSK_STATUS[kioskStatus(b)].rank
  );
  const attention = list.filter((k) => ['support', 'offline'].includes(kioskStatus(k))).length;

  const showToken = (text: string, token: string) =>
    modal.openInfo({
      title: 'Token kiosk mới',
      size: 'lg',
      body: (
        <>
          <p>{text}</p>
          <code className="pms-token">{token}</code>
        </>
      )
    });

  const openForm = (k?: Kiosk) =>
    modal.openForm({
      title: k ? `Sửa ${k.name}` : 'Thêm kiosk',
      size: 'lg',
      submitLabel: 'Lưu',
      body: (
        <>
          <input type="hidden" name="branchId" value={k?.branchId ?? defaultBranch(data)} />
          <Field label="Tên kiosk" name="name" defaultValue={k?.name ?? ''} required maxLength={60} />
          <Field label="Vị trí" name="location" defaultValue={k?.location ?? ''} required maxLength={60} />
          <Field
            label="Mã máy VNPay SmartPOS"
            name="terminal"
            defaultValue={k?.terminal ?? ''}
            required
            maxLength={40}
          />
        </>
      ),
      onSubmit: (v) => {
        if (!allowed(v.branchId)) return false;
        if (!k && data.kiosks.some((row) => row.branchId === v.branchId)) {
          toast('Mỗi chi nhánh chỉ có một kiosk. Sửa cấu hình kiosk hiện tại.');
          return false;
        }
        const fields = { branchId: v.branchId, name: v.name, location: v.location, terminal: v.terminal };
        if (k) {
          update((d) => {
            const t = d.kiosks.find((x) => x.id === k.id);
            if (t) Object.assign(t, fields);
          });
          return;
        }
        const token = randomToken();
        update((d) => {
          d.kiosks.push({
            id: `K-${Date.now()}`,
            ...fields,
            token,
            agentOnline: false,
            lastSeenAt: new Date().toISOString(),
            paused: false,
            cardStock: 'ok',
            rejectBinFull: false,
            faults: [],
            lastSupply: null,
            session: null
          });
        });
        setTimeout(
          () =>
            showToken('Sao chép token này vào kiosk và kiosk-agent. Token sẽ không hiển thị lại.', token),
          400
        );
      }
    });

  // K750 only reports stock levels, so staff record what they physically did.
  const supply = (k: Kiosk) =>
    modal.openForm({
      title: `Cập nhật vật tư · ${k.name}`,
      submitLabel: 'Ghi nhận',
      body: (
        <>
          <Field label="Số thẻ nạp thêm vào khay" name="cards" type="number" min={0} max={500} defaultValue="0" />
          <label className="form-check mt-2">
            <input className="form-check-input" type="checkbox" name="bin" defaultChecked={k.rejectBinFull} />{' '}
            Đã lấy thẻ khỏi hộp thu hồi
          </label>
        </>
      ),
      onSubmit: (v) => {
        const cards = Number(v.cards);
        if (!Number.isInteger(cards) || cards < 0) return false;
        act.supply(k.id, cards, v.bin === 'on');
      }
    });

  const rotate = (k: Kiosk) => {
    if (!allowed(k.branchId)) return;
    if (k.session) {
      modal.openInfo({
        title: 'Chưa thể cấp token',
        body: <p>{k.name} đang có phiên chưa xong. Xử lý xong hoặc chuyển sang quầy trước.</p>
      });
      return;
    }
    if (!confirm(`Cấp token mới cho ${k.name}? Token cũ sẽ ngừng hoạt động ngay.`)) return;
    const token = randomToken();
    update((d) => {
      const t = d.kiosks.find((x) => x.id === k.id);
      if (t) Object.assign(t, { token, agentOnline: false });
    });
    showToken(`Nhập token này vào kiosk và kiosk-agent của ${k.name}.`, token);
  };

  return (
    <>
      <Toolbar>
        <span className="text-muted small">
          {list.length} kiosk · {attention} cần chú ý
        </span>
        {!branchKiosk && <PrimaryButton icon="bi-plus-lg" onClick={() => openForm()}>
          Thiết lập kiosk
        </PrimaryButton>}
      </Toolbar>
      {branchKiosk && <Panel title="Demo tình huống kiosk" subtitle="Chọn tình huống để thử cách lễ tân xử lý và cho kiosk tiếp tục" table={false}>
        <p className="text-muted small">Tạo booking DEMO riêng cho kiosk này và thay phiên đang hiển thị. Các booking thật trong demo vẫn giữ dữ liệu; lần tạo tiếp theo sẽ làm lại booking DEMO.</p>
        <div className="kiosk-demo-bar">
          <select aria-label="Tình huống demo kiosk" className="form-select" value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)}>
            {SCENARIOS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <PrimaryButton icon="bi-play-circle" onClick={() => {
            const error = act.scenario(branchKiosk.id, scenario);
            if (error) toast(error);
            else setViewing(branchKiosk.id);
          }}>Tạo demo & xem</PrimaryButton>
        </div>
      </Panel>}
      <Panel title="Thiết bị kiosk" subtitle="Máy nào đang phục vụ ai, mắc ở bước nào và cần làm gì tiếp">
        <DataTable headers={['KIOSK', 'TRẠNG THÁI', 'PHIÊN HIỆN TẠI', 'VẬT TƯ', 'THAO TÁC']}>
          {list.map((k) => {
            const status = KIOSK_STATUS[kioskStatus(k)];
            const s = k.session;
            const step = s && currentStep(s);
            const support = openSupport(s);
            return (
              <tr key={k.id}>
                <td>
                  <strong>{k.name}</strong>
                  <small>
                    {k.location} · {branchName(data, k.branchId)}
                  </small>
                </td>
                <td>
                  <Pill status={status.pill} label={status.label} />
                  <small>
                    {support
                      ? `${support.reason} · ${support.assignee ?? 'chưa ai nhận'}`
                      : !k.agentOnline
                        ? `Cập nhật cuối ${minutesSince(k.lastSeenAt)} phút trước`
                        : k.paused
                          ? 'Không nhận phiên mới'
                          : ''}
                  </small>
                </td>
                <td>
                  {s && step ? (
                    <>
                      <strong>{s.bookingCode ?? 'Chưa tìm thấy booking'}</strong>
                      <small>
                        {step.label} · {STEP_STATE[s.steps[step.key].state]} · {minutesSince(s.startedAt)} phút
                        {s.handedOver ? ' · đã chuyển quầy' : ''}
                      </small>
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  {kioskWarnings(k).length ? (
                    kioskWarnings(k).map((w) => <small key={w}>{w}</small>)
                  ) : (
                    <span className="text-muted">Đủ</span>
                  )}
                </td>
                <td>
                  <TextLink icon="bi-eye" onClick={() => setViewing(k.id)}>
                    Xem
                  </TextLink>
                  <details className="booking-secondary-actions">
                    <summary>Khác</summary>
                    <TextLink icon="bi-box-seam" onClick={() => supply(k)}>
                      Cập nhật vật tư
                    </TextLink>
                    <TextLink
                      icon={k.paused ? 'bi-play-circle' : 'bi-pause-circle'}
                      onClick={() => act.setPaused(k.id, !k.paused)}
                    >
                      {k.paused ? 'Mở lại' : 'Tạm ngừng'}
                    </TextLink>
                    <TextLink onClick={() => openForm(k)}>Sửa</TextLink>
                    <TextLink icon="bi-key" onClick={() => rotate(k)}>
                      Cấp token mới
                    </TextLink>
                  </details>
                </td>
              </tr>
            );
          })}
        </DataTable>
      </Panel>
      <ScopeNote>
        Trạng thái lấy từ kiosk-agent (máy quét, K750, SmartPOS). Mất kết nối giữ nguyên phiên và kết
        quả cuối, không tự coi là thất bại. Tạm ngừng chỉ chặn phiên mới.
      </ScopeNote>
      {viewing && <KioskDetailModal id={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
