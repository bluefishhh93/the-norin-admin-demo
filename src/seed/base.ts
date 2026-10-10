import type { Booking, Branch, RoomStatus } from '../types';

export const seedBranches = (): Branch[] => [
  {
    id: 'sontra',
    name: 'The Norin Sơn Trà',
    address: 'Sơn Trà, Đà Nẵng',
    short: 'Sơn Trà',
    kiotvietId: 9047,
    active: true,
    account: { username: 'norin.sontra', password: 'Sontra@2026' }
  },
  {
    id: 'mykhe',
    name: 'The Norin Mỹ Khê',
    address: 'Ngũ Hành Sơn, Đà Nẵng',
    short: 'Mỹ Khê',
    kiotvietId: 9048,
    active: true,
    account: { username: 'norin.mykhe', password: 'Mykhe@2026' }
  },
  {
    id: 'haichau',
    name: 'The Norin Hải Châu',
    address: 'Hải Châu, Đà Nẵng',
    short: 'Hải Châu',
    kiotvietId: 9049,
    active: true,
    account: { username: 'norin.haichau', password: 'Haichau@2026' }
  }
];

export const initialRooms: [string, string, RoomStatus][] = [
  ['sontra', '101', 'occupied'],
  ['sontra', '102', 'available'],
  ['sontra', '103', 'occupied'],
  ['sontra', '104', 'cleaning'],
  ['sontra', '105', 'available'],
  ['sontra', '201', 'reserved'],
  ['sontra', '202', 'occupied'],
  ['sontra', '203', 'available'],
  ['sontra', '204', 'available'],
  ['sontra', '205', 'occupied'],
  ['mykhe', '101', 'available'],
  ['mykhe', '102', 'occupied'],
  ['mykhe', '103', 'occupied'],
  ['mykhe', '104', 'available'],
  ['mykhe', '105', 'cleaning'],
  ['mykhe', '201', 'available'],
  ['mykhe', '202', 'reserved'],
  ['mykhe', '203', 'occupied'],
  ['mykhe', '204', 'available'],
  ['mykhe', '205', 'available'],
  ['haichau', '101', 'occupied'],
  ['haichau', '102', 'available'],
  ['haichau', '103', 'available'],
  ['haichau', '104', 'reserved'],
  ['haichau', '105', 'occupied'],
  ['haichau', '201', 'cleaning'],
  ['haichau', '202', 'available'],
  ['haichau', '203', 'occupied'],
  ['haichau', '204', 'available'],
  ['haichau', '205', 'available']
];

export const initialBookings: Booking[] = [
  {
    id: 'NR-24081',
    customer: 'Nguyễn Minh Anh',
    phone: '090 123 4567',
    branchId: 'sontra',
    room: '101',
    type: 'Theo giờ',
    time: '08/10 · 14:00',
    amount: 490000,
    status: 'checked-in'
  },
  {
    id: 'NR-24082',
    customer: 'Trần Hoàng Phúc',
    phone: '091 456 7890',
    branchId: 'mykhe',
    room: '202',
    type: 'Qua đêm',
    time: '08/10 · 19:00',
    amount: 890000,
    status: 'confirmed'
  },
  {
    id: 'NR-24083',
    customer: 'Lê Thảo Vy',
    phone: '098 765 4321',
    branchId: 'haichau',
    room: '104',
    type: 'Theo giờ',
    time: '08/10 · 20:30',
    amount: 390000,
    status: 'pending'
  },
  {
    id: 'NR-24084',
    customer: 'Phạm Quốc Bảo',
    phone: '093 234 5678',
    branchId: 'sontra',
    room: '201',
    type: 'Qua đêm',
    time: '09/10 · 21:00',
    amount: 990000,
    status: 'confirmed'
  },
  {
    id: 'NR-24085',
    customer: 'Đỗ Ngọc Hà',
    phone: '097 345 6789',
    branchId: 'mykhe',
    room: '102',
    type: 'Theo ngày',
    time: '08/10 · 12:00',
    amount: 1490000,
    status: 'checked-in'
  },
  {
    id: 'NR-24086',
    customer: 'Võ Gia Huy',
    phone: '096 222 3456',
    branchId: 'haichau',
    room: '105',
    type: 'Theo giờ',
    time: '08/10 · 16:00',
    amount: 450000,
    status: 'checked-in'
  }
];
