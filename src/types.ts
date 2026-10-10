export type Role = 'superadmin' | 'branch_admin';
export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'reserved';
export type BookingStatus =
  'confirmed' | 'checked-in' | 'checked-out' | 'pending' | 'cancelled' | 'no-show';
export type PaymentTiming = 'prepaid' | 'postpaid';
export interface BookingGuest {
  name: string;
  document: string;
}
export type StayType = 'Theo giờ' | 'Qua đêm' | 'Theo ngày';
export type PriceType = 'Ngày đêm' | 'Qua đêm' | 'Giờ';
export type PayMethod = 'cash' | 'transfer' | 'card';

export interface BranchAccount {
  username: string;
  password: string;
}
export type IntegrationKey = 'ttlock' | 'vnpay' | 'spos';
export type BranchIntegrations = Partial<
  Record<IntegrationKey, { enabled: boolean } & Record<string, string | boolean>>
>;
export interface Branch {
  id: string;
  name: string;
  address: string;
  short: string;
  kiotvietId?: number | null;
  active?: boolean;
  account?: BranchAccount;
  createdAt?: string;
  integrations?: BranchIntegrations;
}

export interface RoomPrice {
  hourly: number;
  extra: number;
  overnight: number;
  daily: number;
  weekdayRates?: Partial<Record<PriceType, Record<string, number>>>;
}

export interface Room {
  branchId: string;
  number: string;
  price?: RoomPrice;
  status: RoomStatus;
  classId: string;
  masterProductId: number;
  name: string;
  description: string;
  amenities: string;
  music: string;
  musicFile?: string;
  images: string[];
  cleaningReadyAt?: string | null;
}

export interface Booking {
  id: string;
  customer: string;
  phone: string;
  branchId: string;
  room: string;
  type: StayType;
  time: string;
  amount: number;
  status: BookingStatus;
  email?: string;
  securityCode?: string;
  contactMethod?: string;
  zaloPhone?: string;
  note?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface Activity {
  text: string;
  detail: string;
  time: string;
  branchId: string;
}

export interface Lock {
  id: string;
  branchId: string;
  room: string;
  masterProductId: number;
  lockId: number;
  alias: string;
  mac?: string;
  gateway?: boolean;
}

export interface VoucherCode {
  code: string;
  status: string;
  bookingCode: string;
}
export interface Voucher {
  id: string;
  name: string;
  code: string;
  branchId: string;
  type: 'percent' | 'fixed';
  value: number;
  scope: 'ROOM_ONLY' | 'ENTIRE_BILL';
  stay: string;
  starts: string;
  ends: string;
  quota: number;
  used: number;
  mode: 'MANUAL' | 'AUTO';
  active: boolean;
  weekdays: number[];
  codes: VoucherCode[];
}

export interface HourlyStep {
  fromThHour: number;
  toHour: number;
  price: number;
  type: 'block' | 'hourly';
}
export interface Pricebook {
  branchId: string;
  classId: string;
  hourly: number;
  overnight: number;
  daily: number;
  hourlySteps: HourlyStep[];
  weekdays?: number[];
  weekdayRates?: Partial<Record<PriceType, Record<string, number>>>;
}

export interface Product {
  id: string;
  branchId: string;
  name: string;
  group: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  productImages: { id: number; image: string }[];
  productType: number;
}

export interface AvailabilityBlock {
  id: string;
  branchId: string;
  classId: string;
  from: string;
  to: string;
  reason: string;
  enabled: boolean;
}
export interface HousekeepingTask {
  key: string;
  branchId?: string;
  assignee: string;
  priority: string;
  note: string;
}

export interface RoomClass {
  id: string;
  branchId: string;
  name: string;
  code: string;
  description: string;
  amenities: string;
  privileges: string;
  music: string;
  active: boolean;
  image?: string;
  aboutSections?: string;
  sensoryExperience?: string;
  whyChooseUs?: string;
  translationEn?: string;
}

export interface Season {
  id: string;
  branchId: string;
  rooms: string[];
  name: string;
  from: string;
  to: string;
  mode: 'percent' | 'amount';
  value: number;
}

export interface OrderLine {
  name: string;
  productId?: string;
  productType: number;
  phase: 'booking' | 'stay';
  quantity: number;
  price: number;
  source?: string;
  orderedAt?: string;
  stockReserved?: boolean;
  fulfillment?: 'new' | 'preparing' | 'delivered' | 'cancelled';
}
export interface ProductSelection {
  productId: string;
  quantity: number;
}
export interface AppliedVoucher {
  id: string;
  code: string;
  name: string;
  scope: 'ROOM_ONLY' | 'ENTIRE_BILL';
  type: 'percent' | 'fixed';
  value: number;
  base: number;
}
export interface Payment {
  id: string;
  method: PayMethod;
  amount: number;
  createdAt: string;
  collector: string;
}
export interface FlowEvent {
  at: string;
  text: string;
}

export interface Folio {
  code: string;
  branchId: string;
  room: string;
  masterProductId: number | null;
  customer: string;
  phone: string;
  stayType: StayType;
  status: number;
  detailStatus: number;
  checkinDecision: string;
  originalCheckInTime: string;
  originalCheckOutTime: string;
  effectiveCheckInTime: string;
  effectiveCheckOutTime: string;
  orderDetailCheckOutTime?: string;
  checkinAdjustmentStatus: string | null;
  checkinAssistanceRequestedAt: string | null;
  checkoutRequestedAt: string | null;
  actualCheckOutAt: string | null;
  assistanceResolvedAt?: string;
  overstayHandledAt?: string;
  checkoutHandledAt?: string;
  orderDetails: OrderLine[];
  voucherDiscount: number;
  payments: Payment[];
  source: string;
  events: FlowEvent[];
  paymentTiming?: PaymentTiming;
  outcome?: 'cancelled' | 'no-show';
  note?: string;
  guests?: BookingGuest[];
  actualCheckInAt?: string;
  securityCode?: string;
  voucher?: AppliedVoucher;
  cancellationRefund?: number;
  roomRate?: { room: string; start: string; end: string; amount: number };
}

export interface CashRequest {
  id: string;
  code: string;
  context: 'CHECKOUT' | 'BOOKING';
  branchId: string;
  requestedAt: string;
  status: 'pending' | 'collected';
  kiosk: string;
}
export interface Camera {
  roomKey: string;
  bookingCode: string;
  state: string;
  lastOccupancy: number;
  scheduledCheckOutAt: string;
  settledAt: string | null;
  notifiedAt: string | null;
  cleaningArmedAt: string | null;
}
export interface FlowNotification {
  code: string;
  branchId: string;
  at: string;
  text: string;
}
export interface Shift {
  at: string;
  counted: number;
  expected: number;
  note: string;
  branchId: string;
}

export interface TimeSetting {
  dayCheckIn: string;
  dayCheckOut: string;
  nightCheckIn: string;
  nightCheckOut: string;
  dayUseCheckIn: string;
  dayUseCheckOut: string;
  hourForRoundingOneDay: number;
  minuteForRoundingOneHour: number;
  isExpandDayWhenOverCheckOutNight: boolean;
  hourForExpandDayWhenOverCheckOutNight: number;
}
export interface Rules {
  reservationHold: number;
  cleaningBuffer: number;
  overstayThreshold: number;
  overstayNotifyInterval: number;
  overstayStopAfter: number;
  extendSuggestHours: number;
  maxHourlyStay: number;
  vnpayQrExpire: number;
  geofenceRecheck: number;
  checkinMode: 'flexible' | 'fixed';
}
export interface BranchInfo {
  hotline: string;
  enableOnlineBooking: boolean;
  latitude: number;
  longitude: number;
  geofenceRadiusM: number;
  hichatUrl: string;
  hichatToken: string;
}
export interface Kiosk {
  id: string;
  branchId: string;
  name: string;
  token: string;
  terminal: string;
  agentOnline: boolean;
  paper: number;
  cards: number;
  returnBin: number;
}
export interface CashEntry {
  id: string;
  type: 'in' | 'out';
  branchId: string;
  at: string;
  category: string;
  amount: number;
  method: PayMethod;
  note: string;
  by: string;
}
export interface StockMove {
  at: string;
  branchId: string;
  name: string;
  type: 'in' | 'out';
  qty: number;
  note: string;
}
export interface Staff {
  id: string;
  name: string;
  username: string;
  role: string;
  branchId: string;
  active: boolean;
}

export interface DemoData {
  role: Role;
  branchId: string;
  branches: Branch[];
  rooms: Room[];
  bookings: Booking[];
  activities: Activity[];
  nextId: number;
  locks: Lock[];
  vouchers: Voucher[];
  pricebooks: Pricebook[];
  products: Product[];
  blocks: AvailabilityBlock[];
  housekeeping: HousekeepingTask[];
  classes: RoomClass[];
  season: Season[];
  qrDomain: string;
  folios: Folio[];
  requests: CashRequest[];
  cameras: Camera[];
  notifications: FlowNotification[];
  shifts: Shift[];
  timeSetting: TimeSetting;
  rules: Rules;
  branchInfo: Record<string, BranchInfo>;
  kiosks: Kiosk[];
  cashbook: CashEntry[];
  stockMoves: StockMove[];
  staff: Staff[];
  languages: string[];
  content: Record<string, Record<string, unknown>>;
}
