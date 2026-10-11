import { useStore } from '../store';
import { branchName } from '../lib/format';
import { NotificationBell } from './NotificationBell';

export function Topbar({
  label,
  onMenu,
  onRoleChange,
  onNavigate
}: {
  label: string;
  onMenu: () => void;
  onRoleChange: () => void;
  onNavigate: (page: string) => void;
}) {
  const { data } = useStore();
  const isSuper = data.role === 'superadmin';
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-button menu-toggle" aria-label="Mở menu" onClick={onMenu}>
          <i className="bi bi-list" />
        </button>
        <span className="breadcrumb-root">Không gian làm việc</span>
        <i className="bi bi-chevron-right breadcrumb-chevron" />
        <span className="breadcrumb-current">{label}</span>
      </div>
      <div className="topbar-right">
        <span className="demo-chip">
          <span className="online-dot" /> Dữ liệu mẫu
        </span>
        <NotificationBell onNavigate={onNavigate} />
        <span className="topbar-separator" />
        <div className="avatar">{isSuper ? 'NA' : 'LM'}</div>
        <div className="profile-text">
          <strong>{isSuper ? 'Nguyễn Anh' : 'Lê Minh'}</strong>
          <span>{isSuper ? 'Superadmin' : `Admin · ${branchName(data, data.branchId)}`}</span>
        </div>
        <i className="bi bi-chevron-down profile-chevron" />
        <button
          type="button"
          className="role-switch"
          aria-label="Đổi giữa Superadmin và Admin chi nhánh"
          onClick={onRoleChange}
        >
          <i className="bi bi-arrow-left-right" /> Đổi vai trò
        </button>
      </div>
    </header>
  );
}
