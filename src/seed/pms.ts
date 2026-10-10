import type { BranchInfo, CashEntry, Kiosk, Rules, Staff, TimeSetting } from '../types';
import { branches } from './base';

export const seedTimeSetting = (): TimeSetting => ({
  dayCheckIn: '14:00', dayCheckOut: '12:00', nightCheckIn: '22:00', nightCheckOut: '10:00', dayUseCheckIn: '12:00', dayUseCheckOut: '21:00',
  hourForRoundingOneDay: 6, minuteForRoundingOneHour: 30, isExpandDayWhenOverCheckOutNight: false, hourForExpandDayWhenOverCheckOutNight: 12
});

export const seedRules = (): Rules => ({
  reservationHold: 10, cleaningBuffer: 30, overstayThreshold: 15, overstayNotifyInterval: 60, overstayStopAfter: 12,
  extendSuggestHours: 1, maxHourlyStay: 8, vnpayQrExpire: 15, geofenceRecheck: 5, checkinMode: 'flexible'
});

export const seedBranchInfo = (): Record<string, BranchInfo> => Object.fromEntries(branches.map((b, i) => [b.id, {
  hotline: ['0236 3888 001', '0236 3888 002', '0236 3888 003'][i],
  enableOnlineBooking: true,
  latitude: [16.0861, 16.0544, 16.0678][i],
  longitude: [108.2437, 108.2471, 108.2208][i],
  geofenceRadiusM: 150, hichatUrl: '', hichatToken: ''
}]));

export const randomToken = () => `kt_${crypto.getRandomValues(new Uint32Array(3)).join('').slice(0, 18)}`;

export const seedKiosks = (): Kiosk[] => branches.map((b, i) => ({
  id: `K-${i + 1}`, branchId: b.id, name: `Kiosk ${b.short} 01`, token: randomToken(), terminal: `SPOS-${i + 1}`,
  agentOnline: i !== 1, paper: [80, 15, 60][i], cards: [42, 8, 30][i], returnBin: [5, 18, 2][i]
}));

export const seedCashbook = (): CashEntry[] => [
  { id: 'PT-0001', type: 'in', branchId: 'sontra', at: new Date(Date.now() - 5 * 3600000).toISOString(), category: 'Tiền phòng', amount: 490000, method: 'cash', note: 'NR-24081', by: 'Lễ tân' },
  { id: 'PC-0001', type: 'out', branchId: 'sontra', at: new Date(Date.now() - 3 * 3600000).toISOString(), category: 'Mua hàng', amount: 350000, method: 'cash', note: 'Nhập nước suối', by: 'Quản lý' }
];

export const seedStaff = (): Staff[] => [
  { id: 'U-1', name: 'Nguyễn Anh', username: 'admin', role: 'superadmin', branchId: 'all', active: true },
  { id: 'U-2', name: 'Lê Minh', username: 'leminh', role: 'manager', branchId: 'sontra', active: true },
  { id: 'U-3', name: 'Trần Vy', username: 'tranvy', role: 'reception', branchId: 'sontra', active: true },
  { id: 'U-4', name: 'Mai Linh', username: 'mailinh', role: 'housekeeping', branchId: 'sontra', active: true },
  { id: 'U-5', name: 'Hoa Voucher', username: 'voucher', role: 'voucher_staff', branchId: 'all', active: true }
];
