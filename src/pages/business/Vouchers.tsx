import type { Voucher } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field, Select } from '../../components/Form';
import { branchName, money } from '../../lib/format';
import { defaultBranch, scopedWithAll, isAllowedBranch } from '../../lib/scope';
import { DataTable, Panel, PrimaryButton, ScopeNote, TextLink, Toolbar } from '../../components/ui';

const WEEKDAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const CODE_STATUS: Record<string, string> = {
  available: 'Chưa dùng',
  reserved: 'Đang giữ',
  used: 'Đã dùng'
};

const MAX_CODES = 10000;

const generateCodes = (count: number, taken: Set<string>) => {
  const codes: string[] = [];
  const bytes = new Uint8Array(4);
  while (codes.length < count) {
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    if (taken.has(code)) continue;
    taken.add(code);
    codes.push(code);
  }
  return codes;
};

const voucherStatus = (v: Voucher) => {
  const today = new Date().toISOString().slice(0, 10);
  if (!v.active) return 'Tạm dừng';
  if (v.starts > today) return 'Sắp diễn ra';
  if (v.ends < today) return 'Hết hạn';
  if (v.used >= v.quota) return 'Hết lượt';
  return 'Đang áp dụng';
};

export function Vouchers() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const list = scopedWithAll(data, data.vouchers);

  const showCodes = (v: Voucher) =>
    modal.openInfo({
      title: `Mã voucher · ${v.name}`,
      body: (
        <>
        <ScopeNote icon={null}>
          {v.codes.filter((c) => c.status === 'available').length.toLocaleString('en-US')} còn lại ·{' '}
          {v.codes.filter((c) => c.status === 'reserved').length.toLocaleString('en-US')} đang giữ ·{' '}
          {v.codes.filter((c) => c.status === 'used').length.toLocaleString('en-US')} đã dùng ·{' '}
          {v.codes.length.toLocaleString('en-US')} tổng
          {v.codes.length > 200 ? ' · hiển thị 200 mã đầu' : ''}
        </ScopeNote>
        <DataTable headers={['MÃ', 'TRẠNG THÁI', 'BOOKING']}>
          {v.codes.slice(0, 200).map((c) => (
            <tr key={c.code}>
              <td>
                <strong>{c.code}</strong>
              </td>
              <td>{CODE_STATUS[c.status] || c.status}</td>
              <td>{c.bookingCode || '—'}</td>
            </tr>
          ))}
        </DataTable>
        </>
      )
    });

  const autoConflict = (exceptId?: string) =>
    data.vouchers.some((x) => x.id !== exceptId && x.mode === 'AUTO' && x.active);

  const toggleActive = (v: Voucher) => {
    if (!v.active && v.mode === 'AUTO' && autoConflict(v.id)) {
      toast('Đã có chương trình tự động đang hoạt động. Tắt chương trình đó trước.');
      return;
    }
    update((d) => {
      const target = d.vouchers.find((x) => x.id === v.id);
      if (target) target.active = !target.active;
    });
    toast(v.active ? `Đã tạm dừng ${v.name}.` : `Đã bật ${v.name}.`);
  };

  const remove = (v: Voucher) => {
    if (
      !isAllowedBranch(data, v.branchId) ||
      !confirm(
        `Xóa chương trình “${v.name}”?\nChương trình sẽ ngừng nhận lượt áp dụng mới. Lịch sử sử dụng ở các booking vẫn được giữ.`
      )
    )
      return;
    update((d) => {
      d.vouchers = d.vouchers.filter((x) => x.id !== v.id);
    });
    toast(`Đã xóa chương trình ${v.name}.`);
  };

  const openForm = (voucher?: Voucher) => {
    const selectedDays = voucher?.weekdays ?? [1, 2, 3, 4, 5, 6, 7];
    modal.openForm({
      title: voucher ? 'Sửa voucher' : 'Tạo voucher',
      body: (
        <>
          <input type="hidden" name="branchId" value={voucher?.branchId ?? defaultBranch(data)} />
          <Field
            label="Tên chương trình"
            name="name"
            defaultValue={voucher?.name ?? ''}
            maxLength={70}
            required
          />
          <Select
            label="Kiểu ưu đãi"
            name="type"
            options={[
              ['percent', 'Phần trăm'],
              ['fixed', 'Số tiền cố định']
            ]}
            defaultValue={voucher?.type ?? 'percent'}
          />
          <Field
            label="Giá trị"
            name="value"
            type="number"
            min={1}
            defaultValue={voucher?.value ?? 10}
            required
          />
          <Select
            label="Phạm vi giảm"
            name="scope"
            options={[
              ['ROOM_ONLY', 'Giá phòng'],
              ['ENTIRE_BILL', 'Toàn hóa đơn']
            ]}
            defaultValue={voucher?.scope ?? 'ROOM_ONLY'}
          />
          <Select
            label="Áp dụng lưu trú"
            name="stay"
            options={['Tất cả', 'Theo giờ', 'Qua đêm', 'Theo ngày'].map((s) => [s, s])}
            defaultValue={voucher?.stay ?? 'Tất cả'}
          />
          <Select
            label="Áp dụng mã"
            name="mode"
            options={[
              ['MANUAL', 'MANUAL'],
              ['AUTO', 'AUTO']
            ]}
            defaultValue={voucher?.mode ?? 'MANUAL'}
          />
          <Field
            label="Bắt đầu"
            name="starts"
            type="date"
            defaultValue={voucher?.starts ?? '2026-10-08'}
            required
          />
          <Field
            label="Kết thúc"
            name="ends"
            type="date"
            defaultValue={voucher?.ends ?? '2026-12-31'}
            required
          />
          {!voucher && (
            <Field
              label="Số lượng voucher"
              name="quota"
              type="number"
              min={1}
              max={MAX_CODES}
              step={1}
              defaultValue={1}
              required
            />
          )}
          <label className="voucher-active">
            <span className="form-check form-switch m-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                name="active"
                value="1"
                defaultChecked={voucher?.active ?? true}
              />
            </span>
            Đang hoạt động
          </label>
          <fieldset className="voucher-weekdays">
            <legend>Thứ áp dụng</legend>
            <div className="d-flex flex-wrap gap-2">
              {WEEKDAY_NAMES.map((day, i) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={i + 1}
                    defaultChecked={selectedDays.includes(i + 1)}
                  />{' '}
                  {day}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      ),
      onSubmit: (v, form) => {
        const weekdays = [
          ...form.querySelectorAll<HTMLInputElement>('input[name="weekdays"]:checked')
        ].map((i) => Number(i.value));
        const count = Number(v.quota);
        if (!isAllowedBranch(data, v.branchId)) return false;
        if (
          !weekdays.length ||
          v.ends < v.starts ||
          (!voucher && (!Number.isInteger(count) || count < 1 || count > MAX_CODES)) ||
          (v.type === 'percent' && +v.value > 100)
        ) {
          toast('Kiểm tra ngày, giá trị và số lượng voucher (1 – 10,000).');
          return false;
        }
        const active = v.active === '1';
        if (active && v.mode === 'AUTO' && autoConflict(voucher?.id)) {
          toast('Đã có chương trình tự động đang hoạt động. Tắt chương trình đó trước.');
          return false;
        }
        const fields = {
          branchId: v.branchId,
          name: v.name.trim(),
          type: v.type as Voucher['type'],
          value: +v.value,
          scope: v.scope as Voucher['scope'],
          stay: v.stay,
          mode: v.mode as Voucher['mode'],
          starts: v.starts,
          ends: v.ends,
          weekdays,
          active
        };
        update((d) => {
          const target = voucher && d.vouchers.find((x) => x.id === voucher.id);
          if (target) {
            Object.assign(target, fields);
            return;
          }
          const taken = new Set(d.vouchers.flatMap((x) => [x.code, ...x.codes.map((c) => c.code)]).map((c) => c.toUpperCase()));
          const codes = generateCodes(count, taken);
          d.vouchers.push({
            id: `VC-${Date.now()}`,
            ...fields,
            code: codes[0],
            quota: count,
            used: 0,
            codes: codes.map((code) => ({ code, status: 'available', bookingCode: '' }))
          });
        });
        toast(voucher ? 'Đã lưu thay đổi trong bản demo.' : `Đã tạo ${count.toLocaleString('en-US')} mã voucher.`);
      }
    });
  };

  return (
    <>
      <Toolbar>
        <span className="text-muted small">Ưu đãi phòng và toàn hóa đơn</span>
        <PrimaryButton icon="bi-plus-lg" onClick={() => openForm()}>
          Tạo voucher
        </PrimaryButton>
      </Toolbar>
      <Panel
        title="Chương trình voucher"
        subtitle="Mã thủ công hoặc tự động, thời hạn và số lượt sử dụng"
      >
        <DataTable
          headers={[
            'CHƯƠNG TRÌNH / MÃ',
            'CHI NHÁNH',
            'ƯU ĐÃI',
            'ÁP DỤNG',
            'THỜI HẠN',
            'LƯỢT DÙNG',
            'TRẠNG THÁI',
            'THAO TÁC'
          ]}
        >
          {list.map((v) => (
            <tr key={v.id}>
              <td>
                <strong>{v.name}</strong>
                <small>
                  {v.codes.length > 1 ? `${v.codes.length.toLocaleString('en-US')} mã` : v.code} · {v.mode}
                </small>
              </td>
              <td>{v.branchId === 'all' ? 'Toàn hệ thống' : branchName(data, v.branchId)}</td>
              <td>{v.type === 'percent' ? `${v.value}%` : money(v.value)}</td>
              <td>
                {v.scope === 'ROOM_ONLY' ? 'Giá phòng' : 'Toàn hóa đơn'}
                <small>
                  {v.stay} ·{' '}
                  {v.weekdays
                    .map((day) => WEEKDAY_NAMES[day - 1])
                    .filter(Boolean)
                    .join(', ')}
                </small>
              </td>
              <td>
                {v.starts} → {v.ends}
              </td>
              <td>
                {v.used}/{v.quota}
              </td>
              <td>
                {v.branchId === 'all' ? (
                  voucherStatus(v)
                ) : (
                  <label className="voucher-active">
                    <span className="form-check form-switch m-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        checked={v.active}
                        onChange={() => toggleActive(v)}
                        aria-label={`${v.active ? 'Tạm dừng' : 'Bật'} ${v.name}`}
                      />
                    </span>
                    {voucherStatus(v)}
                  </label>
                )}
              </td>
              <td>
                {v.branchId === 'all' ? (
                  'Chỉ xem'
                ) : (
                  <>
                    <TextLink icon="bi-list-ul" onClick={() => showCodes(v)}>
                      Mã
                    </TextLink>{' '}
                    <TextLink onClick={() => openForm(v)}>Sửa</TextLink>{' '}
                    <TextLink icon="bi-trash" onClick={() => remove(v)}>
                      Xóa
                    </TextLink>
                  </>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      <ScopeNote>
        Voucher được kiểm tra khi tạo booking theo chi nhánh, lịch lưu trú, thời hạn, thứ và số
        lượt. Ưu đãi chỉ áp dụng cho booking ban đầu, không cộng thêm cho sản phẩm hoặc gia hạn về
        sau.
      </ScopeNote>
    </>
  );
}
