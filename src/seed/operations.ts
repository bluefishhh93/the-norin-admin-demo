import type {
  AvailabilityBlock,
  HousekeepingTask,
  Lock,
  Pricebook,
  Product,
  Voucher
} from '../types';

const steps = (hourly: number) => [
  { fromThHour: 1, toHour: 2, price: hourly, type: 'block' as const },
  { fromThHour: 3, toHour: 8, price: 120000, type: 'hourly' as const }
];

export const seedLocks: Lock[] = [
  { id: 'LK-06', branchId: 'sontra', room: '201', masterProductId: 3006, lockId: 782201, alias: 'Norin ST 201', gateway: true },
  { id: 'LK-07', branchId: 'mykhe', room: '201', masterProductId: 4006, lockId: 783201, alias: 'Norin MK 201', gateway: true },
  { id: 'LK-08', branchId: 'haichau', room: '102', masterProductId: 5002, lockId: 784102, alias: 'Norin HC 102', gateway: true },
  {
    id: 'LK-01',
    branchId: 'sontra',
    room: '101',
    masterProductId: 3001,
    lockId: 782101,
    alias: 'Norin ST 101',
    mac: 'D4:12:AB:20:01:01',
    gateway: true
  },
  {
    id: 'LK-02',
    branchId: 'sontra',
    room: '102',
    masterProductId: 3002,
    lockId: 782102,
    alias: 'Norin ST 102',
    mac: 'D4:12:AB:20:01:02',
    gateway: true
  },
  {
    id: 'LK-03',
    branchId: 'mykhe',
    room: '102',
    masterProductId: 4002,
    lockId: 783102,
    alias: 'Norin MK 102',
    mac: 'D4:12:AB:20:02:02',
    gateway: false
  },
  {
    id: 'LK-05',
    branchId: 'mykhe',
    room: '202',
    masterProductId: 4007,
    lockId: 783202,
    alias: 'Norin MK 202',
    mac: 'D4:12:AB:20:02:07',
    gateway: true
  },
  {
    id: 'LK-04',
    branchId: 'haichau',
    room: '105',
    masterProductId: 5001,
    lockId: 784105,
    alias: 'Norin HC 105',
    mac: 'D4:12:AB:20:03:05',
    gateway: true
  }
];

export const ttlockCatalog = [
  ...seedLocks.map((l) => ({ lockId: l.lockId, alias: l.alias })),
  { lockId: 785101, alias: 'Norin Spare 01' },
  { lockId: 785102, alias: 'Norin Spare 02' }
];

const all = [1, 2, 3, 4, 5, 6, 7];
export const seedVouchers: Voucher[] = [
  {
    id: 'VC-01',
    name: 'Ưu đãi khách mới',
    code: 'WELCOME10',
    branchId: 'all',
    type: 'percent',
    value: 10,
    scope: 'ROOM_ONLY',
    stay: 'Tất cả',
    starts: '2026-10-01',
    ends: '2026-12-31',
    quota: 100,
    used: 24,
    mode: 'MANUAL',
    active: true,
    weekdays: all,
    codes: [{ code: 'WELCOME10', status: 'available', bookingCode: '' }]
  },
  {
    id: 'VC-02',
    name: 'Đêm cuối tuần',
    code: 'WEEKEND150',
    branchId: 'sontra',
    type: 'fixed',
    value: 150000,
    scope: 'ENTIRE_BILL',
    stay: 'Qua đêm',
    starts: '2026-10-01',
    ends: '2026-11-30',
    quota: 50,
    used: 8,
    mode: 'MANUAL',
    active: true,
    weekdays: all,
    codes: [{ code: 'WEEKEND150', status: 'available', bookingCode: '' }]
  },
  {
    id: 'VC-03',
    name: 'Ưu đãi Mỹ Khê',
    code: 'MYKHE15',
    branchId: 'mykhe',
    type: 'percent',
    value: 15,
    scope: 'ROOM_ONLY',
    stay: 'Theo giờ',
    starts: '2026-10-01',
    ends: '2026-11-15',
    quota: 60,
    used: 11,
    mode: 'AUTO',
    active: true,
    weekdays: all,
    codes: [{ code: 'MYKHE15', status: 'available', bookingCode: '' }]
  }
];

const pb = (
  branchId: string,
  category: string,
  hourly: number,
  overnight: number,
  daily: number
): Pricebook => ({
  branchId,
  classId: `${branchId}-${category.toLowerCase()}`,
  hourly,
  overnight,
  daily,
  hourlySteps: steps(hourly),
  weekdays: [0, 1, 2, 3, 4, 5, 6]
});

export const seedPricebooks: Pricebook[] = [
  pb('sontra', 'Deluxe', 490000, 890000, 1490000),
  pb('sontra', 'Signature', 690000, 1190000, 1990000),
  pb('mykhe', 'Deluxe', 450000, 850000, 1390000),
  pb('mykhe', 'Signature', 790000, 1390000, 2290000),
  pb('haichau', 'Deluxe', 390000, 790000, 1290000),
  pb('haichau', 'Signature', 590000, 1090000, 1790000)
];

const prod = (
  id: string,
  branchId: string,
  name: string,
  group: string,
  category: string,
  price: number,
  stock: number
): Product => ({
  id,
  branchId,
  name,
  group,
  category,
  price,
  stock,
  image: '',
  productImages: [],
  productType: group === 'Phụ kiện yêu' ? 3 : 2
});

export const seedProducts: Product[] = [
  prod('SP-01', 'sontra', 'Nước suối', 'Đồ ăn', 'Đồ uống', 25000, 48),
  prod('SP-02', 'sontra', 'Nước ngọt', 'Đồ ăn', 'Đồ uống', 35000, 24),
  prod('SP-03', 'mykhe', 'Snack', 'Đồ ăn', 'Đồ ăn nhẹ', 45000, 18),
  prod('SP-04', 'haichau', 'Bộ phụ kiện', 'Phụ kiện yêu', 'Phụ kiện', 350000, 10)
];

export const seedBlocks: AvailabilityBlock[] = [
  {
    id: 'BL-01',
    branchId: 'sontra',
    classId: 'sontra-signature',
    from: '2026-10-12T08:00',
    to: '2026-10-13T08:00',
    reason: 'Bảo trì thiết bị',
    enabled: true
  }
];

export const seedHousekeeping: HousekeepingTask[] = [
  { key: 'sontra:104', assignee: 'Mai Linh', priority: 'Ưu tiên', note: 'Trả phòng lúc 13:30' },
  { key: 'mykhe:105', assignee: 'Thanh Hà', priority: 'Thường', note: 'Kiểm tra minibar' },
  { key: 'haichau:201', assignee: 'Hồng Ngọc', priority: 'Thường', note: 'Vệ sinh định kỳ' }
];
