import type {
  BranchInfo,
  CashEntry,
  Kiosk,
  KioskStep,
  KioskStepKey,
  Rules,
  Staff,
  TimeSetting
} from '../types';
import { seedBranches } from './base';

export const seedTimeSetting = (): TimeSetting => ({
  dayCheckIn: '14:00',
  dayCheckOut: '12:00',
  nightCheckIn: '22:00',
  nightCheckOut: '10:00',
  dayUseCheckIn: '12:00',
  dayUseCheckOut: '21:00',
  hourForRoundingOneDay: 6,
  minuteForRoundingOneHour: 30,
  isExpandDayWhenOverCheckOutNight: false,
  hourForExpandDayWhenOverCheckOutNight: 12
});

export const seedRules = (): Rules => ({
  reservationHold: 10,
  cleaningBuffer: 30,
  overstayThreshold: 15,
  overstayNotifyInterval: 60,
  overstayStopAfter: 12,
  extendSuggestHours: 1,
  maxHourlyStay: 8,
  vnpayQrExpire: 15,
  geofenceRecheck: 5,
  checkinMode: 'flexible'
});

export const seedBranchInfo = (): Record<string, BranchInfo> =>
  Object.fromEntries(
    seedBranches().map((b, i) => [
      b.id,
      {
        hotline: ['0236 3888 001', '0236 3888 002', '0236 3888 003'][i],
        enableOnlineBooking: true,
        latitude: [16.0861, 16.0544, 16.0678][i],
        longitude: [108.2437, 108.2471, 108.2208][i],
        geofenceRadiusM: 150,
        hichatUrl: '',
        hichatToken: ''
      }
    ])
  );

export const randomToken = () =>
  `kt_${crypto.getRandomValues(new Uint32Array(3)).join('').slice(0, 18)}`;

const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();

const steps = (
  states: Partial<Record<KioskStepKey, KioskStep>>
): Record<KioskStepKey, KioskStep> => ({
  lookup: { state: 'todo' },
  guests: { state: 'todo' },
  payment: { state: 'todo' },
  card: { state: 'todo' },
  release: { state: 'todo' },
  ...states
});

const kiosk = (
  id: string,
  branchId: string,
  name: string,
  location: string,
  terminal: string,
  extra: Partial<Kiosk> = {}
): Kiosk => ({
  id,
  branchId,
  name,
  location,
  token: randomToken(),
  terminal,
  agentOnline: true,
  lastSeenAt: ago(0),
  paused: false,
  cardStock: 'ok',
  rejectBinFull: false,
  faults: [],
  lastSupply: null,
  session: null,
  ...extra
});

// Booking codes match seedFolios: NR-24084 (Sơn Trà 201), NR-24082 (Mỹ Khê 202), NR-24083 (Hải Châu 104).
export const seedKiosks = (): Kiosk[] => [
  kiosk('K-1', 'sontra', 'Kiosk Sơn Trà 01', 'Sảnh tầng 1', 'SPOS-1', {
    session: {
      bookingCode: 'NR-24084',
      paymentMethod: 'cash',
      startedAt: ago(6),
      updatedAt: ago(4),
      handedOver: false,
      support: null,
      steps: steps({
        lookup: { state: 'done' },
        guests: { state: 'done', note: '2/2 khách hợp lệ' },
        payment: { state: 'running', note: 'Khách chọn tiền mặt · chờ lễ tân thu' }
      })
    }
  }),
  kiosk('K-3', 'mykhe', 'Kiosk Mỹ Khê 01', 'Sảnh chính', 'SPOS-3', {
    faults: ['Bộ phát thẻ K750: kẹt thẻ ở khe ra'],
    session: {
      bookingCode: 'NR-24082',
      startedAt: ago(9),
      updatedAt: ago(3),
      handedOver: false,
      steps: steps({
        lookup: { state: 'done' },
        guests: { state: 'done', note: '1/1 khách hợp lệ' },
        payment: { state: 'done', note: 'VNPay SmartPOS · GD SP-240811' },
        card: { state: 'done', note: 'UID 04A1B2C3 · TTLock đã nhận thẻ' },
        release: { state: 'failed', note: 'K750 báo kẹt thẻ khi nhả (0x0020)' }
      }),
      support: { reason: 'Đã thu tiền, lỗi nhả thẻ', requestedAt: ago(3), status: 'waiting' }
    }
  }),
  kiosk('K-4', 'haichau', 'Kiosk Hải Châu 01', 'Sảnh tầng 1', 'SPOS-4', {
    agentOnline: false,
    lastSeenAt: ago(7),
    rejectBinFull: true,
    session: {
      bookingCode: 'NR-24083',
      startedAt: ago(12),
      updatedAt: ago(7),
      handedOver: false,
      steps: steps({
        lookup: { state: 'done' },
        guests: { state: 'done', note: '2/2 khách hợp lệ' },
        payment: { state: 'unknown', note: 'Đã gửi lệnh SmartPOS · GD SP-240812 · chưa có kết quả' }
      }),
      support: { reason: 'Thanh toán chưa rõ kết quả', requestedAt: ago(5), status: 'waiting' }
    }
  })
];

export const seedCashbook = (): CashEntry[] => [
  {
    id: 'PT-0001',
    type: 'in',
    branchId: 'sontra',
    at: new Date(Date.now() - 5 * 3600000).toISOString(),
    category: 'Tiền phòng',
    amount: 490000,
    method: 'cash',
    note: 'NR-24081',
    by: 'Lễ tân'
  },
  {
    id: 'PC-0001',
    type: 'out',
    branchId: 'sontra',
    at: new Date(Date.now() - 3 * 3600000).toISOString(),
    category: 'Mua hàng',
    amount: 350000,
    method: 'cash',
    note: 'Nhập nước suối',
    by: 'Quản lý'
  }
];

export const seedStaff = (): Staff[] => [
  {
    id: 'U-1',
    name: 'Nguyễn Anh',
    username: 'admin',
    role: 'superadmin',
    branchId: 'all',
    active: true
  },
  {
    id: 'U-2',
    name: 'Lê Minh',
    username: 'leminh',
    role: 'manager',
    branchId: 'sontra',
    active: true
  },
  {
    id: 'U-3',
    name: 'Trần Vy',
    username: 'tranvy',
    role: 'reception',
    branchId: 'sontra',
    active: true
  },
  {
    id: 'U-4',
    name: 'Mai Linh',
    username: 'mailinh',
    role: 'housekeeping',
    branchId: 'sontra',
    active: true
  },
  {
    id: 'U-5',
    name: 'Hoa Voucher',
    username: 'voucher',
    role: 'voucher_staff',
    branchId: 'all',
    active: true
  }
];
