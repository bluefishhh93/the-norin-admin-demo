import type { ComponentType } from 'react';
import { Dashboard } from './Dashboard';
import { Customers } from './Customers';
import { Branches } from './branches/Branches';
import { BookingLookup } from '../booking/BookingLookup';
import { StayOrders } from './workflow/StayOrders';
import { Bookings } from './rooms/Bookings';
import { Notifications } from './workflow/Notifications';
import { Payments } from './business/Payments';
import { Reports } from './business/Reports';
import { Pricing } from './business/Pricing';
import { Vouchers } from './business/Vouchers';
import { Products } from './business/Products';
import { RoomClasses } from './rooms/RoomClasses';
import { Availability } from './rooms/Availability';
import { RoomMusic } from './rooms/RoomMusic';
import { Kiosks } from './system/Kiosks';
import { BranchSettings } from './system/BranchSettings';
import { Staff } from './system/Staff';
export interface PageProps {
  navigate: (page: string) => void;
}

export const pages: Record<string, ComponentType<PageProps>> = {
  dashboard: Dashboard,
  'booking-lookup': BookingLookup,
  'stay-orders': StayOrders,
  bookings: Bookings,
  customers: Customers,
  payments: Payments,
  reports: Reports,
  pricing: Pricing,
  vouchers: Vouchers,
  products: Products,
  'room-classes': RoomClasses,
  availability: Availability,
  'room-music': RoomMusic,
  kiosks: Kiosks,
  branches: Branches,
  'branch-settings': BranchSettings,
  staff: Staff,
  notifications: Notifications
};
