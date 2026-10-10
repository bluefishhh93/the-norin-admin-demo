import { useCallback, useEffect, useState } from 'react';
import { pageInfo, useHashPage } from './nav';
import { useStore } from './store';
import { Sidebar } from './layout/Sidebar';
import { Topbar } from './layout/Topbar';
import { BookingProvider } from './booking/context';
import { NewBookingButton } from './booking/NewBookingButton';
import { branches } from './seed/base';
import { branchName } from './lib/format';
import { SUPER_ONLY_PAGES } from './lib/scope';
import { pages } from './pages';

const BOOKING_PAGES = new Set(['dashboard', 'bookings', 'booking-lookup', 'customers']);

export default function App() {
  const { data, update, toast, toastText, closeToast } = useStore();
  const [rawPage, setPage] = useHashPage();
  const [menuOpen, setMenuOpen] = useState(false);
  const isSuper = data.role === 'superadmin';
  const page = !isSuper && SUPER_ONLY_PAGES.includes(rawPage) ? 'dashboard' : rawPage;

  useEffect(() => { if (page !== rawPage) setPage(page); }, [page, rawPage, setPage]);

  const navigate = useCallback((next: string) => { setMenuOpen(false); setPage(next); }, [setPage]);

  const switchRole = () => {
    const nextRole = isSuper ? 'branch_admin' : 'superadmin';
    update(d => { d.role = nextRole; d.branchId = nextRole === 'superadmin' ? 'all' : 'sontra'; });
    toast(nextRole === 'superadmin' ? 'Đang xem với vai trò Superadmin.' : 'Đang xem với vai trò Admin chi nhánh Sơn Trà.');
  };

  const [label, title, subtitle] = pageInfo[page];
  const Page = pages[page] ?? pages.dashboard;
  const branchOptions = isSuper ? [{ id: 'all', name: 'Tất cả chi nhánh' }, ...branches] : branches.filter(b => b.id === 'sontra');
  const scopeText = isSuper
    ? `Chế độ Superadmin · ${data.branchId === 'all' ? 'đang xem toàn bộ chi nhánh' : 'đang lọc ' + branchName(data.branchId)}. Chuyển vai trò tại thanh tài khoản để xem giao diện quản lý một chi nhánh.`
    : 'Chế độ Admin chi nhánh · chỉ xem dữ liệu The Norin Sơn Trà trong bản demo.';

  return (
    <BookingProvider onCreated={() => navigate('booking-lookup')}>
      <div className="app-shell">
        <Sidebar page={page} open={menuOpen} onNavigate={navigate} />
        <div className="main-wrap">
          <Topbar label={label} onMenu={() => setMenuOpen(o => !o)} onRoleChange={switchRole} />
          <main className="content">
            <div className="page-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" /> THE NORIN / OPERATIONS</div>
                <h1>{title}</h1>
                <p>{subtitle}</p>
              </div>
              <div className="heading-actions">
                <div className="select-wrap">
                  <i className="bi bi-buildings" />
                  <select aria-label="Lọc chi nhánh" value={data.branchId} onChange={e => { const v = e.target.value; update(d => { d.branchId = v; }); }}>
                    {branchOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <i className="bi bi-chevron-down select-chevron" />
                </div>
                {BOOKING_PAGES.has(page) && <NewBookingButton />}
              </div>
            </div>
            <div className="scope-note"><i className="bi bi-info-circle" /><span>{scopeText}</span></div>
            <div aria-live="polite"><Page navigate={navigate} /></div>
            <footer className="content-footer">
              <span>© 2026 The Norin. Admin demo</span>
              <span>Thiết kế cho vận hành nhiều chi nhánh <i className="bi bi-heart-fill" /></span>
            </footer>
          </main>
        </div>
      </div>
      <div className="toast-container position-fixed bottom-0 end-0 p-3">
        <div className={`toast fade ${toastText ? 'show' : 'hide'}`} role="status" aria-live="polite">
          <div className="toast-body d-flex align-items-center gap-2">
            <i className="bi bi-check-circle-fill text-success" /><span>{toastText}</span>
            <button type="button" className="btn-close ms-auto" aria-label="Đóng" onClick={closeToast} />
          </div>
        </div>
      </div>
    </BookingProvider>
  );
}
