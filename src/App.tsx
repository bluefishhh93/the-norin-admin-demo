import { useCallback, useEffect, useState } from 'react';
import { pageInfo, useHashPage } from './nav';
import { useStore } from './store';
import { Sidebar } from './layout/Sidebar';
import { Topbar } from './layout/Topbar';
import { BookingProvider } from './booking/context';
import { NewBookingButton } from './booking/NewBookingButton';
import { branchName } from './lib/format';
import { isPageAllowed, isSystemScope } from './lib/scope';
import { pages } from './pages';
import { useModal } from './components/ModalHost';

const BOOKING_PAGES = new Set(['dashboard', 'bookings', 'booking-lookup', 'customers']);

export default function App() {
  const { data, update, toast, toastText, closeToast } = useStore();
  const [rawPage, setPage] = useHashPage();
  const { close: closeModal } = useModal();
  useEffect(() => { closeModal(); }, [data.role, data.branchId, closeModal]);
  const [menuOpen, setMenuOpen] = useState(false);
  const isSuper = data.role === 'superadmin';
  const systemScope = isSystemScope(data);
  const page = isPageAllowed(data, rawPage) ? rawPage : 'dashboard';

  useEffect(() => {
    if (page !== rawPage) setPage(page);
  }, [page, rawPage, setPage]);

  const navigate = useCallback(
    (next: string) => {
      setMenuOpen(false);
      setPage(next);
    },
    [setPage]
  );

  const switchRole = () => {
    const nextRole = isSuper ? 'branch_admin' : 'superadmin';
    update((d) => {
      d.role = nextRole;
      d.branchId = nextRole === 'superadmin' ? 'all' : data.branchId === 'all' ? 'sontra' : data.branchId;
    });
    toast(
      nextRole === 'superadmin'
        ? 'Đang xem với vai trò Superadmin.'
        : `Đang xem với vai trò Admin ${branchName(data, data.branchId === 'all' ? 'sontra' : data.branchId)}.`
    );
  };

  const [label, title, subtitle] = systemScope && page === 'dashboard'
    ? ['Tổng quan hệ thống', 'Tổng quan hệ thống', 'Theo dõi các chi nhánh và mở nơi cần quản lý.']
    : systemScope && page === 'staff'
      ? ['Tài khoản hệ thống', 'Tài khoản hệ thống', 'Quản lý tài khoản dùng cho toàn hệ thống. Nhân sự riêng được quản lý trong từng chi nhánh.']
      : pageInfo[page];
  const Page = pages[page] ?? pages.dashboard;
  const branchOptions = isSuper
    ? [{ id: 'all', name: 'Quản lý hệ thống' }, ...data.branches]
    : data.branches.filter((b) => b.id === data.branchId);
  const scopeText = systemScope
    ? 'Quản lý toàn hệ thống. Mở một chi nhánh để quản lý vận hành, kinh doanh và thiết bị tại đó.'
    : `Đang quản lý ${branchName(data, data.branchId)}. Dữ liệu và thao tác áp dụng cho chi nhánh này.`;

  return (
    <BookingProvider key={`${data.role}:${data.branchId}`} onCreated={() => navigate('booking-lookup')}>
      <div className="app-shell">
        <Sidebar page={page} open={menuOpen} onNavigate={navigate} />
        <div className="main-wrap">
          <Topbar label={label} onMenu={() => setMenuOpen((o) => !o)} onRoleChange={switchRole} onNavigate={navigate} />
          <main className="content">
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-line" /> {systemScope ? 'THE NORIN / HỆ THỐNG' : branchName(data, data.branchId)}
                </div>
                <h1>{title}</h1>
                <p>{subtitle}</p>
              </div>
              <div className="heading-actions">
                <div className="select-wrap">
                  <i className="bi bi-buildings" />
                  <select
                    aria-label="Không gian quản lý"
                    value={data.branchId}
                    onChange={(e) => {
                      const v = e.target.value;
                      update((d) => {
                        d.branchId = v;
                      });
                    }}
                  >
                    {branchOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <i className="bi bi-chevron-down select-chevron" />
                </div>
                {!systemScope && BOOKING_PAGES.has(page) && <NewBookingButton />}
              </div>
            </div>
            <div className="scope-note">
              <i className="bi bi-info-circle" />
              <span>{scopeText}</span>
            </div>
            <div aria-live="polite">
              <Page key={`${data.role}:${data.branchId}`} navigate={navigate} />
            </div>
            <footer className="content-footer">
              <span>© 2026 The Norin. Admin demo</span>
              <span>
                Thiết kế cho vận hành nhiều chi nhánh <i className="bi bi-heart-fill" />
              </span>
            </footer>
          </main>
        </div>
      </div>
      <div className="toast-container position-fixed bottom-0 end-0 p-3">
        <div
          className={`toast fade ${toastText ? 'show' : 'hide'}`}
          role="status"
          aria-live="polite"
        >
          <div className="toast-body d-flex align-items-center gap-2">
            <i className="bi bi-check-circle-fill text-success" />
            <span>{toastText}</span>
            <button
              type="button"
              className="btn-close ms-auto"
              aria-label="Đóng"
              onClick={closeToast}
            />
          </div>
        </div>
      </div>
    </BookingProvider>
  );
}
