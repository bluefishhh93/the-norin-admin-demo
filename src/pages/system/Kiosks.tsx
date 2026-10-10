import type { Kiosk } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field, Select } from '../../components/Form';
import { branchName } from '../../lib/format';
import { defaultBranch, scopedWithAll } from '../../lib/scope';
import {
  DataTable,
  Panel,
  Pill,
  PrimaryButton,
  ScopeNote,
  TextLink,
  Toolbar
} from '../../components/ui';

const newToken = () => `kt_${crypto.getRandomValues(new Uint32Array(3)).join('').slice(0, 18)}`;

const Level = ({ value, low }: { value: number; low: number }) => (
  <Pill
    status={value <= low ? 'cleaning' : 'available'}
    label={`${value}${value <= low ? ' · sắp hết' : ''}`}
  />
);

export function Kiosks() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const allowed = (id: string) => data.role === 'superadmin' || id === 'sontra' || id === 'all';
  const list = scopedWithAll(data, data.kiosks);
  const warn = list.filter(
    (k) => !k.agentOnline || k.paper <= 20 || k.cards <= 10 || k.returnBin >= 15
  );
  const branchOptions: [string, string][] = (
    data.role === 'superadmin' ? data.branches : data.branches.filter((b) => b.id === 'sontra')
  ).map((b) => [b.id, b.name]);

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
          <Select
            label="Chi nhánh"
            name="branchId"
            options={branchOptions}
            defaultValue={k?.branchId ?? defaultBranch(data)}
          />
          <Field
            label="Tên kiosk"
            name="name"
            defaultValue={k?.name ?? ''}
            required
            maxLength={60}
          />
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
        const fields = { branchId: v.branchId, name: v.name, terminal: v.terminal };
        if (k) {
          update((d) => {
            const t = d.kiosks.find((x) => x.id === k.id);
            if (t) Object.assign(t, fields);
          });
          return;
        }
        const token = newToken();
        update((d) => {
          d.kiosks.push({
            id: `K-${Date.now()}`,
            ...fields,
            token,
            agentOnline: false,
            paper: 100,
            cards: 50,
            returnBin: 0
          });
        });
        setTimeout(
          () =>
            showToken(
              'Sao chép token này vào kiosk và kiosk-agent. Token sẽ không hiển thị lại.',
              token
            ),
          400
        );
      }
    });

  const refill = (k: Kiosk) => {
    if (!allowed(k.branchId)) return;
    update((d) => {
      const t = d.kiosks.find((x) => x.id === k.id);
      if (t) Object.assign(t, { paper: 100, cards: 50, returnBin: 0 });
    });
    toast(`${k.name}: đã nạp giấy, thẻ và lấy thẻ đã thu.`);
  };

  const rotate = (k: Kiosk) => {
    if (
      !allowed(k.branchId) ||
      !confirm(`Cấp token mới cho ${k.name}? Token cũ sẽ ngừng hoạt động ngay.`)
    )
      return;
    const token = newToken();
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
          {list.length} kiosk · {warn.length} cần kiểm tra
        </span>
        <PrimaryButton icon="bi-plus-lg" onClick={() => openForm()}>
          Thêm kiosk
        </PrimaryButton>
      </Toolbar>
      <Panel
        title="Thiết bị kiosk"
        subtitle="Token đăng nhập, máy thẻ VNPay SmartPOS và tình trạng vật tư"
      >
        <DataTable
          headers={[
            'KIOSK',
            'CHI NHÁNH',
            'MÁY POS',
            'AGENT',
            'GIẤY IN (%)',
            'THẺ TRỐNG',
            'THẺ ĐÃ THU',
            'THAO TÁC'
          ]}
        >
          {list.map((k) => (
            <tr key={k.id}>
              <td>
                <strong>{k.name}</strong>
                <small>Token {k.token.slice(0, 6)}••••</small>
              </td>
              <td>{branchName(data, k.branchId)}</td>
              <td>{k.terminal}</td>
              <td>
                {k.agentOnline ? (
                  <Pill status="available" label="Đang kết nối" />
                ) : (
                  <Pill status="cleaning" label="Mất kết nối" />
                )}
              </td>
              <td>
                <Level value={k.paper} low={20} />
              </td>
              <td>
                <Level value={k.cards} low={10} />
              </td>
              <td>
                <Pill
                  status={k.returnBin >= 15 ? 'cleaning' : 'available'}
                  label={`${k.returnBin}${k.returnBin >= 15 ? ' · cần lấy' : ''}`}
                />
              </td>
              <td>
                <TextLink onClick={() => openForm(k)}>Sửa</TextLink>{' '}
                <TextLink icon="bi-box-seam" onClick={() => refill(k)}>
                  Đã nạp vật tư
                </TextLink>{' '}
                <TextLink icon="bi-key" onClick={() => rotate(k)}>
                  Cấp token mới
                </TextLink>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      <ScopeNote>
        Token chỉ hiện đầy đủ một lần khi tạo hoặc cấp mới. Nhập token đó vào kiosk và kiosk-agent
        của máy.
      </ScopeNote>
    </>
  );
}
