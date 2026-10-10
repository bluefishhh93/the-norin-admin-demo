import type { Booking, DemoData, Folio, Room, RoomClass } from '../types';
import { initialBookings, initialRooms, seedBranches } from './base';
import {
  seedBlocks,
  seedHousekeeping,
  seedLocks,
  seedPricebooks,
  seedProducts,
  seedVouchers
} from './operations';
import {
  seedBranchInfo,
  seedCashbook,
  seedKiosks,
  seedRules,
  seedStaff,
  seedTimeSetting
} from './pms';

export const seedClasses = (): RoomClass[] =>
  seedBranches().flatMap((branch, i) => [
    {
      id: `${branch.id}-deluxe`,
      branchId: branch.id,
      name: 'Deluxe',
      code: `DLX-${i + 1}`,
      description: 'Không gian riêng tư và thoải mái',
      amenities: 'Wifi, Smart TV, bồn tắm',
      privileges: '',
      music: '',
      active: true
    },
    {
      id: `${branch.id}-signature`,
      branchId: branch.id,
      name: 'Signature',
      code: `SIG-${i + 1}`,
      description: 'Trải nghiệm cao cấp',
      amenities: 'Wifi, Smart TV, bồn tắm',
      privileges: '',
      music: '',
      active: true
    }
  ]);

const seedRooms = (classes: RoomClass[]): Room[] =>
  initialRooms.map(([branchId, number, status], index) => {
    const classId = `${branchId}-${Number(number) % 2 === 0 ? 'signature' : 'deluxe'}`;
    const cls = classes.find((c) => c.id === classId);
    return {
      branchId,
      number,
      status,
      classId,
      masterProductId: 30000 + index + 1,
      name: `${cls?.name || 'Phòng'} ${number}`,
      description: cls?.description || '',
      amenities: cls?.amenities || '',
      music: cls?.music || '',
      images: []
    };
  });

const shifted = (minutes: number) => new Date(Date.now() + minutes * 60000).toISOString();

const seedFolios = (bookings: Booking[], rooms: Room[]): Folio[] => {
  const offsets = [
    [-85, 35],
    [40, 160],
    [90, 210],
    [180, 300],
    [-125, -5],
    [-140, -20]
  ];
  const folios = bookings.slice(0, 6).map((b, index): Folio => {
    const room = rooms.find((r) => r.branchId === b.branchId && r.number === b.room);
    const [start, end] = offsets[index];
    const total = Number(b.amount) || 0;
    return {
      code: b.id,
      branchId: b.branchId,
      room: b.room,
      masterProductId: room?.masterProductId || 30001 + index,
      customer: b.customer,
      phone: b.phone,
      stayType: b.type,
      status: 1,
      detailStatus: b.status === 'checked-in' ? 2 : 1,
      checkinDecision: index === 1 ? 'LATE_SHIFT' : index === 2 ? 'LATE_CONFLICT' : 'ON_TIME',
      originalCheckInTime: shifted(start),
      originalCheckOutTime: shifted(end),
      effectiveCheckInTime: shifted(start),
      effectiveCheckOutTime: shifted(end + (index === 1 ? 30 : 0)),
      checkinAdjustmentStatus: index === 1 ? 'PENDING_REVIEW' : null,
      checkinAssistanceRequestedAt: index === 2 ? shifted(-12) : null,
      checkoutRequestedAt: index === 0 ? shifted(-8) : null,
      actualCheckOutAt: null,
      orderDetails: [
        {
          name: `Phòng ${b.room} · ${b.type}`,
          productType: 6,
          phase: 'booking',
          quantity: 1,
          price: total
        }
      ],
      voucherDiscount: 0,
      payments:
        index === 0
          ? [
              {
                id: 'PM-SEED-01',
                method: 'transfer',
                amount: Math.max(0, total - 190000),
                createdAt: shifted(-65),
                collector: 'Kiosk'
              }
            ]
          : index === 4
            ? [
                {
                  id: 'PM-SEED-02',
                  method: 'card',
                  amount: total,
                  createdAt: shifted(-115),
                  collector: 'Kiosk'
                }
              ]
            : [],
      source: index % 2 ? 'Lễ tân' : 'Kiosk',
      events: [
        {
          at: shifted(start - 45),
          text: index % 2 ? 'Lễ tân tạo booking trên admin' : 'Khách đặt phòng tại kiosk'
        }
      ]
    };
  });
  folios[0].orderDetails.push({
    name: 'Nước suối · gọi từ tablet',
    productType: 2,
    phase: 'stay',
    quantity: 2,
    price: 25000,
    fulfillment: 'new'
  });
  return folios;
};

const at = (dayOffset: number, time: string) => {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const stayBookings = (): Booking[] =>
  (
    [
      {
        id: 'NR-24090',
        customer: 'Hoàng Thu Trang',
        phone: '090 555 1122',
        branchId: 'sontra',
        room: '102',
        type: 'Qua đêm',
        time: '',
        amount: 890000,
        status: 'confirmed',
        startsAt: at(1, '22:00'),
        endsAt: at(2, '10:00')
      },
      {
        id: 'NR-24091',
        customer: 'Bùi Đức Long',
        phone: '091 777 3344',
        branchId: 'sontra',
        room: '203',
        type: 'Theo ngày',
        time: '',
        amount: 2980000,
        status: 'confirmed',
        startsAt: at(2, '14:00'),
        endsAt: at(4, '12:00')
      },
      {
        id: 'NR-24092',
        customer: 'Ngô Bảo Châu',
        phone: '098 111 2233',
        branchId: 'sontra',
        room: '105',
        type: 'Theo giờ',
        time: '',
        amount: 590000,
        status: 'confirmed',
        startsAt: at(1, '15:00'),
        endsAt: at(1, '18:00')
      },
      {
        id: 'NR-24093',
        customer: 'Trịnh Mai Phương',
        phone: '093 444 5566',
        branchId: 'mykhe',
        room: '104',
        type: 'Qua đêm',
        time: '',
        amount: 890000,
        status: 'confirmed',
        startsAt: at(3, '22:00'),
        endsAt: at(4, '10:00')
      },
      {
        id: 'NR-24094',
        customer: 'Lý Thanh Tùng',
        phone: '097 888 9900',
        branchId: 'haichau',
        room: '202',
        type: 'Theo ngày',
        time: '',
        amount: 1490000,
        status: 'confirmed',
        startsAt: at(5, '14:00'),
        endsAt: at(6, '12:00')
      }
    ] as Booking[]
  ).map((b) => ({
    ...b,
    time: new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
      .format(new Date(b.startsAt!))
      .replace(', ', ' · ')
  }));

export const createSeed = (): DemoData => {
  const classes = seedClasses();
  const rooms = seedRooms(classes);
  const bookings = [...structuredClone(initialBookings), ...stayBookings()];
  const folios = seedFolios(bookings, rooms);
  const locks = structuredClone(seedLocks).map((lock) => {
    const room = rooms.find((r) => r.branchId === lock.branchId && r.number === lock.room);
    return room ? { ...lock, masterProductId: room.masterProductId } : lock;
  });
  return {
    role: 'superadmin',
    branchId: 'all',
    branches: seedBranches(),
    rooms,
    bookings,
    activities: [],
    nextId: 24087,
    locks,
    vouchers: structuredClone(seedVouchers),
    pricebooks: structuredClone(seedPricebooks),
    products: structuredClone(seedProducts),
    blocks: structuredClone(seedBlocks),
    housekeeping: structuredClone(seedHousekeeping),
    classes,
    season: [],
    qrDomain: '',
    folios,
    requests: [
      {
        id: 'CASH-01',
        code: folios[0].code,
        context: 'CHECKOUT',
        branchId: folios[0].branchId,
        requestedAt: shifted(-8),
        status: 'pending',
        kiosk: 'Kiosk Sơn Trà 01'
      },
      {
        id: 'CASH-02',
        code: folios[3].code,
        context: 'BOOKING',
        branchId: folios[3].branchId,
        requestedAt: shifted(-4),
        status: 'pending',
        kiosk: 'Kiosk Sơn Trà 01'
      }
    ],
    cameras: folios
      .filter((f) => f.detailStatus === 2)
      .map((f) => ({
        roomKey: `${f.branchId}:${f.room}`,
        bookingCode: f.code,
        state: 'GUEST_IN',
        lastOccupancy: 2,
        scheduledCheckOutAt: f.effectiveCheckOutTime,
        settledAt: null,
        notifiedAt: null,
        cleaningArmedAt: null
      })),
    notifications: [],
    shifts: [],
    timeSetting: seedTimeSetting(),
    rules: seedRules(),
    branchInfo: seedBranchInfo(),
    kiosks: seedKiosks(),
    cashbook: seedCashbook(),
    stockMoves: [],
    staff: seedStaff(),
    languages: ['vi', 'en', 'ko', 'ja', 'zh'],
    content: {}
  };
};
