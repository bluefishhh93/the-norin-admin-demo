import type { Staff as StaffUser } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field, Select } from '../../components/Form';
import { branchName } from '../../lib/format';
import { defaultBranch, scoped, isSystemScope, isAllowedBranch } from '../../lib/scope';
import { DataTable, Panel, Pill, PrimaryButton, TextLink, Toolbar } from '../../components/ui';

const ROLES: Record<string, [string, string]> = {
  superadmin: ['Superadmin', 'Quản lý hệ thống, chi nhánh, tài khoản hệ thống; mở từng chi nhánh để quản lý vận hành'],
  manager: [
    'Quản lý chi nhánh',
    'Booking, giá, phòng, sản phẩm, tồn kho, voucher, báo cáo, thiết bị và nhân sự của chi nhánh'
  ],
  reception: ['Lễ tân', 'Đặt phòng, nhận/trả phòng, thu tiền, xử lý hàng việc, đơn gọi thêm'],
  housekeeping: ['Buồng phòng', 'Xem phòng chờ dọn, xác nhận đã dọn'],
  voucher_staff: ['Nhân viên voucher', 'Chỉ quản lý voucher và khóa bán phòng']
};

export function Staff() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const systemScope = isSystemScope(data);
  const allowed = (id: string) => systemScope ? id === 'all' : isAllowedBranch(data, id);
  const list = systemScope ? data.staff.filter(u => u.branchId === 'all') : scoped(data, data.staff).filter(u => u.role !== 'superadmin');
  const roles = Object.entries(ROLES).filter(([k]) => systemScope ? k === 'superadmin' || k === 'voucher_staff' : k !== 'superadmin');
  const roleOptions: [string, string][] = roles.map(([k, [n]]) => [k, n]);
  const openForm = (u?: StaffUser) =>
    modal.openForm({
      title: u ? `Sửa ${u.name}` : 'Thêm nhân sự',
      size: 'lg',
      submitLabel: 'Lưu',
      body: (
        <div className="row g-3">
          <div className="col-sm-6">
            <Field
              label="Họ tên"
              name="name"
              defaultValue={u?.name ?? ''}
              required
              maxLength={60}
            />
          </div>
          <div className="col-sm-6">
            <Field
              label="Tên đăng nhập"
              name="username"
              defaultValue={u?.username ?? ''}
              required
              pattern="[a-z0-9_.]{3,30}"
              maxLength={30}
            />
          </div>
          <div className="col-sm-6">
            <Select
              label="Vai trò"
              name="role"
              options={roleOptions}
              defaultValue={u?.role ?? (systemScope ? 'superadmin' : 'reception')}
            />
          </div>
          <input
            type="hidden"
            name="branchId"
            value={u?.branchId ?? (systemScope ? 'all' : defaultBranch(data))}
          />
          {!u && (
            <div className="col-12">
              <Field
                label="Mật khẩu tạm"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          )}
        </div>
      ),
      onSubmit: (v) => {
        const invalid =
          !allowed(v.branchId) || !roleOptions.some(([role]) => role === v.role) ||
          (v.role !== 'superadmin' && v.role !== 'voucher_staff' && v.branchId === 'all') ||
          data.staff.some((x) => x.id !== u?.id && x.username === v.username);
        if (invalid) {
          toast('Tên đăng nhập trùng, hoặc vai trò chi nhánh phải chọn một chi nhánh cụ thể.');
          return false;
        }
        const fields = { name: v.name, username: v.username, role: v.role, branchId: v.branchId };
        update((d) => {
          const target = u && d.staff.find((x) => x.id === u.id);
          if (target) Object.assign(target, fields);
          else d.staff.push({ id: `U-${Date.now()}`, ...fields, active: true });
        });
        toast('Đã lưu nhân sự.');
      }
    });

  const toggle = (u: StaffUser) => {
    if (u.role === 'superadmin' || !allowed(u.branchId)) return;
    update((d) => {
      const t = d.staff.find((x) => x.id === u.id);
      if (t) t.active = !t.active;
    });
    toast(u.active ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
  };

  return (
    <>
      <Toolbar>
        <span className="text-muted small">Một tài khoản gắn một vai trò và một chi nhánh</span>
        <PrimaryButton icon="bi-person-plus" onClick={() => openForm()}>
          Thêm nhân sự
        </PrimaryButton>
      </Toolbar>
      <Panel
        title="Tài khoản nhân sự"
        subtitle="Thay cho đăng nhập bằng biến môi trường của trang internal cũ"
      >
        <DataTable
          headers={['NHÂN SỰ', 'TÊN ĐĂNG NHẬP', 'VAI TRÒ', 'CHI NHÁNH', 'TRẠNG THÁI', 'THAO TÁC']}
        >
          {list.map((u) => (
            <tr key={u.id}>
              <td>
                <strong>{u.name}</strong>
              </td>
              <td>{u.username}</td>
              <td>{ROLES[u.role]?.[0] ?? u.role}</td>
              <td>{u.branchId === 'all' ? 'Toàn hệ thống' : branchName(data, u.branchId)}</td>
              <td>
                {u.active ? (
                  <Pill status="available" label="Hoạt động" />
                ) : (
                  <Pill status="cleaning" label="Đã khóa" />
                )}
              </td>
              <td>
                <TextLink onClick={() => openForm(u)}>Sửa</TextLink>{' '}
                {u.role !== 'superadmin' && (
                  <TextLink icon={u.active ? 'bi-lock' : 'bi-unlock'} onClick={() => toggle(u)}>
                    {u.active ? 'Khóa' : 'Mở khóa'}
                  </TextLink>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      <Panel title="Vai trò" subtitle="Quyền mặc định của từng vai trò">
        <DataTable headers={['VAI TRÒ', 'ĐƯỢC LÀM']}>
          {roles.map(([k, [n, d]]) => (
            <tr key={k}>
              <td>
                <strong>{n}</strong>
              </td>
              <td className="pms-wrap">{d}</td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
