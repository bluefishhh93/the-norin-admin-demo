import type { ComponentType } from 'react';
import { Dashboard } from './Dashboard';
import { Customers } from './Customers';
import { Branches } from './branches/Branches';
import { WorkQueue } from './workflow/WorkQueue';
import { Cashier } from './workflow/Cashier';
import { BookingLookup } from '../booking/BookingLookup';
import { StayOrders } from './workflow/StayOrders';
import { Bookings } from './rooms/Bookings';
import { Notifications } from './workflow/Notifications';
import { Payments } from './business/Payments';
import { Reports } from './business/Reports';
import { Pricing } from './business/Pricing';
import { Vouchers } from './business/Vouchers';
import { Products } from './business/Products';
import { Inventory } from './business/Inventory';
import { RoomClasses } from './rooms/RoomClasses';
import { Availability } from './rooms/Availability';
import { Locks } from './rooms/Locks';
import { RoomMusic } from './rooms/RoomMusic';
import { Kiosks } from './system/Kiosks';
import { BranchSettings } from './system/BranchSettings';
import { Settings } from './system/Settings';
import { Staff } from './system/Staff';
export interface PageProps {
  navigate: (page: string) => void;
}

export const pages: Record<string, ComponentType<PageProps>> = {
  dashboard: Dashboard,
  'work-queue': WorkQueue,
  cashier: Cashier,
  'booking-lookup': BookingLookup,
  'stay-orders': StayOrders,
  bookings: Bookings,
  customers: Customers,
  payments: Payments,
  reports: Reports,
  pricing: Pricing,
  vouchers: Vouchers,
  products: Products,
  inventory: Inventory,
  'room-classes': RoomClasses,
  availability: Availability,
  locks: Locks,
  'room-music': RoomMusic,
  kiosks: Kiosks,
  branches: Branches,
  'branch-settings': BranchSettings,
  settings: Settings,
  staff: Staff,
  notifications: Notifications
};
