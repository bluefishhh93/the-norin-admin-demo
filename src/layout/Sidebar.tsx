import { Fragment } from 'react';
import { navGroups } from '../nav';
import { useStore } from '../store';
import { scoped } from '../lib/scope';

export function Sidebar({ page, open, onNavigate }: { page: string; open: boolean; onNavigate: (page: string) => void }) {
  const { data, toast } = useStore();
  const occupied = scoped(data, data.rooms).filter(r => r.status === 'occupied').length;
  const isSuper = data.role === 'superadmin';

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Điều hướng chính">
      <a className="brand" href="#dashboard" aria-label="The Norin, trang tổng quan" onClick={e => { e.preventDefault(); onNavigate('dashboard'); }}>
        <img className="brand-mark" src="/logo-mark.png" alt="" width={38} height={38} />
        <span className="brand-text">THE NORIN<span className="brand-subtitle">LOVE HOTEL</span></span>
      </a>
      <div className="workspace-label">KHÔNG GIAN LÀM VIỆC</div>
      <nav className="side-nav">
        {navGroups.map((group, gi) => (
          <Fragment key={gi}>
            {gi > 0 && <div className="nav-divider" />}
            {group.section && <span className="nav-section">{group.section}</span>}
            {group.items.filter(item => isSuper || !item.superOnly).map(item => (
              <a key={item.page} href={`#${item.page}`} className={`nav-item ${page === item.page ? 'active' : ''}`} aria-current={page === item.page ? 'page' : undefined}
                onClick={e => { e.preventDefault(); onNavigate(item.page); }}>
                <i className={`bi ${item.icon}`} /><span>{item.label}</span>
                {item.count && <span className="nav-count">{occupied}</span>}
              </a>
            ))}
          </Fragment>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-box">
          <span className="help-icon"><i className="bi bi-stars" /></span>
          <strong>Quản lý nhẹ nhàng hơn</strong>
          <p>Mọi hoạt động khách sạn trong một không gian duy nhất.</p>
          <button type="button" onClick={() => toast('Dùng bộ chọn tài khoản để đổi vai trò, chọn chi nhánh để lọc dữ liệu và tạo đặt phòng mẫu.')}>
            Xem hướng dẫn <i className="bi bi-arrow-up-right" />
          </button>
        </div>
        <div className="sidebar-footer"><span className="online-dot" /> Bản demo giao diện <span>v1.0</span></div>
      </div>
    </aside>
  );
}
