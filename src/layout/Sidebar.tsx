import { Fragment } from 'react';
import { navGroups, systemNavGroups } from '../nav';
import { useStore } from '../store';
import { scoped, isPageAllowed, isSystemScope } from '../lib/scope';
import { branchName } from '../lib/format';

export function Sidebar({
  page,
  open,
  onNavigate
}: {
  page: string;
  open: boolean;
  onNavigate: (page: string) => void;
}) {
  const { data, update, toast } = useStore();
  const occupied = scoped(data, data.rooms).filter((r) => r.status === 'occupied').length;
  const systemScope = isSystemScope(data);
  const groups = (systemScope ? systemNavGroups : navGroups)
    .map(group => ({ ...group, items: group.items.filter(item => isPageAllowed(data, item.page)) }))
    .filter(group => group.items.length);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Điều hướng chính">
      <a
        className="brand"
        href="#dashboard"
        aria-label="The Norin, trang tổng quan"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('dashboard');
        }}
      >
        <img className="brand-mark" src="/logo-mark.png" alt="" width={38} height={38} />
        <span className="brand-text">
          THE NORIN<span className="brand-subtitle">LOVE HOTEL</span>
        </span>
      </a>
      <div className="workspace-label">{systemScope ? 'QUẢN LÝ HỆ THỐNG' : branchName(data, data.branchId)}</div>
      <nav className="side-nav">
        {!systemScope && data.role === 'superadmin' && <a className="nav-item" href="#branches" onClick={e => { e.preventDefault(); update(d => { d.branchId = 'all'; }); onNavigate('branches'); }}><i className="bi bi-arrow-left" /><span>Về quản lý hệ thống</span></a>}
        {groups.map((group, gi) => (
          <Fragment key={gi}>
            {gi > 0 && <div className="nav-divider" />}
            {group.section && <span className="nav-section">{group.section}</span>}
            {group.items
              .map((item) => (
                <a
                  key={item.page}
                  href={`#${item.page}`}
                  className={`nav-item ${page === item.page ? 'active' : ''}`}
                  aria-current={page === item.page ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(item.page);
                  }}
                >
                  <i className={`bi ${item.icon}`} />
                  <span>{item.label}</span>
                  {item.count && <span className="nav-count">{occupied}</span>}
                </a>
              ))}
          </Fragment>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-box">
          <span className="help-icon">
            <i className="bi bi-stars" />
          </span>
          <strong>Quản lý nhẹ nhàng hơn</strong>
          <p>Mọi hoạt động khách sạn trong một không gian duy nhất.</p>
          <button
            type="button"
            onClick={() =>
              toast(
                'Mở một chi nhánh để quản lý vận hành. Chọn Quản lý hệ thống để quay về tổng quan và cấu hình chung.'
              )
            }
          >
            Xem hướng dẫn <i className="bi bi-arrow-up-right" />
          </button>
        </div>
        <div className="sidebar-footer">
          <span className="online-dot" /> Bản demo giao diện <span>v1.0</span>
        </div>
      </div>
    </aside>
  );
}
