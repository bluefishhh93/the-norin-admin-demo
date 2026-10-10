import { useCallback, useEffect, useState } from 'react';

export const pageInfo: Record<string, [string, string, string]> = {
  dashboard: ['Tổng quan', 'Tổng quan hoạt động', 'Theo dõi toàn bộ hoạt động kinh doanh trong một góc nhìn.'],
  'work-queue': ['Cần xử lý', 'Việc cần xử lý', 'Các tín hiệu từ kiosk, tablet và camera.'],
  cashier: ['Thu ngân', 'Thu ngân & tiền mặt', 'Theo dõi yêu cầu thu tại kiosk và đối soát cuối ca.'],
  'booking-lookup': ['Tra cứu', 'Tra cứu booking', 'Giờ hiệu lực, thanh toán và lịch sử theo lượt lưu trú.'],
  'stay-orders': ['Đơn gọi thêm', 'Đơn gọi thêm từ tablet', 'Theo dõi món khách gọi trong thời gian lưu trú.'],
  bookings: ['Đặt phòng', 'Đặt phòng & sơ đồ phòng', 'Chọn phòng và thời gian để tạo đặt phòng.'],
  calendar: ['Lịch phòng', 'Lịch đặt phòng', 'Xem lịch lưu trú và phòng khả dụng theo ngày.'],
  customers: ['Khách hàng', 'Khách hàng', 'Thông tin khách hàng từ các lượt đặt phòng.'],
  payments: ['Hóa đơn', 'Hóa đơn & folio', 'Tổng tiền, đã thu và còn nợ của từng lượt lưu trú.'],
  reports: ['Báo cáo', 'Báo cáo thu tiền', 'Số tiền đã nhận theo từng ngày và phương thức thanh toán.'],
  pricing: ['Bảng giá', 'Bảng giá phòng', 'Giá theo giờ, qua đêm và theo ngày cho từng chi nhánh.'],
  vouchers: ['Voucher', 'Chương trình voucher', 'Tạo mã ưu đãi và theo dõi lượt sử dụng.'],
  products: ['Sản phẩm', 'Sản phẩm & dịch vụ', 'Danh mục hàng hóa và dịch vụ bán kèm.'],
  inventory: ['Tồn kho', 'Tồn kho sản phẩm', 'Nhập hàng, xuất hủy và cảnh báo sắp hết.'],
  'room-classes': ['Hạng phòng & phòng', 'Quản lý hạng phòng & phòng', 'Chọn hạng phòng, chọn phòng và cài đặt thông tin, nội dung 5 ngôn ngữ, nhạc, khóa, QR.'],
  availability: ['Khóa bán phòng', 'Khóa bán phòng', 'Thiết lập khoảng thời gian ngừng bán hạng phòng.'],
  locks: ['TTLock mapping', 'Mapping khóa TTLock', 'Chọn phòng và khóa TTLock từ danh sách mẫu.'],
  'room-music': ['Nhạc tablet', 'Nhạc tablet theo phòng', 'Gán file MP3 cho từng Room ID.'],
  kiosks: ['Thiết bị kiosk', 'Thiết bị kiosk', 'Token, máy POS, kết nối agent và vật tư in/thẻ.'],
  branches: ['Chi nhánh', 'Quản lý chi nhánh', 'Thông tin, tọa độ, tài khoản và thiết bị & kết nối của từng chi nhánh.'],
  'branch-settings': ['Thông tin chi nhánh', 'Thông tin chi nhánh', 'Hotline, đặt online, vị trí QR phòng và kênh thông báo.'],
  settings: ['Giờ & quy tắc', 'Giờ lưu trú & quy tắc vận hành', 'Thay cho cài đặt giờ của KiotViet; web, kiosk, tablet cùng dùng.'],
  staff: ['Nhân sự & quyền', 'Nhân sự & phân quyền', 'Tài khoản, vai trò và chi nhánh của từng nhân sự.'],
  notifications: ['Thông báo', 'Nhật ký thông báo', 'Các sự kiện cần chuyển đến nhóm vận hành.']
};

export interface NavItem { page: string; icon: string; label: string; superOnly?: boolean; count?: boolean }
export interface NavGroup { section?: string; items: NavItem[] }

export const navGroups: NavGroup[] = [
  { items: [
    { page: 'dashboard', icon: 'bi-grid-1x2', label: 'Tổng quan' },
    { page: 'work-queue', icon: 'bi-inboxes', label: 'Cần xử lý' },
    { page: 'cashier', icon: 'bi-cash-stack', label: 'Thu ngân & tiền mặt' },
    { page: 'booking-lookup', icon: 'bi-search', label: 'Tra cứu booking' },
    { page: 'stay-orders', icon: 'bi-bag-check', label: 'Đơn gọi thêm' },
    { page: 'bookings', icon: 'bi-calendar3', label: 'Bảng phòng', count: true },
    { page: 'calendar', icon: 'bi-calendar-range', label: 'Lịch phòng' },
    { page: 'customers', icon: 'bi-people', label: 'Khách hàng' }
  ] },
  { section: 'KINH DOANH', items: [
    { page: 'payments', icon: 'bi-receipt', label: 'Hóa đơn' },
    { page: 'reports', icon: 'bi-bar-chart-line', label: 'Báo cáo' },
    { page: 'pricing', icon: 'bi-tags', label: 'Bảng giá' },
    { page: 'vouchers', icon: 'bi-ticket-perforated', label: 'Voucher' },
    { page: 'products', icon: 'bi-bag', label: 'Sản phẩm' },
    { page: 'inventory', icon: 'bi-box-seam', label: 'Tồn kho' }
  ] },
  { section: 'PHÒNG & THIẾT BỊ', items: [
    { page: 'room-classes', icon: 'bi-door-closed', label: 'Hạng phòng & phòng' },
    { page: 'availability', icon: 'bi-slash-circle', label: 'Khóa bán phòng' },
    { page: 'locks', icon: 'bi-key', label: 'TTLock mapping' },
    { page: 'room-music', icon: 'bi-music-note-beamed', label: 'Nhạc tablet' },
    { page: 'kiosks', icon: 'bi-display', label: 'Thiết bị kiosk', superOnly: true }
  ] },
  { section: 'HỆ THỐNG', items: [
    { page: 'branches', icon: 'bi-buildings', label: 'Chi nhánh', superOnly: true },
    { page: 'branch-settings', icon: 'bi-geo-alt', label: 'Thông tin chi nhánh' },
    { page: 'settings', icon: 'bi-clock-history', label: 'Giờ & quy tắc', superOnly: true },
    { page: 'staff', icon: 'bi-person-badge', label: 'Nhân sự & quyền', superOnly: true },
    { page: 'notifications', icon: 'bi-bell', label: 'Nhật ký thông báo', superOnly: true }
  ] }
];

const ALIASES: Record<string, string> = { rooms: 'bookings', housekeeping: 'bookings', 'room-content': 'room-classes', integrations: 'branches', 'room-qr': 'branches' };
const readHash = () => {
  const raw = location.hash.slice(1);
  const page = ALIASES[raw] ?? raw;
  return pageInfo[page] ? page : 'dashboard';
};

export function useHashPage() {
  const [page, setPage] = useState(readHash);
  useEffect(() => {
    const onHash = () => setPage(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = useCallback((next: string) => {
    const target = pageInfo[ALIASES[next] ?? next] ? (ALIASES[next] ?? next) : 'dashboard';
    history.replaceState(null, '', `#${target}`);
    setPage(target);
  }, []);
  return [page, navigate] as const;
}
