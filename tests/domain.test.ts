import assert from 'node:assert/strict';
import test from 'node:test';
import { createSeed } from '../src/seed/index';
import { normalizeBookings, refundable, syncBookings } from '../src/booking/model';
import { summarizeCustomers } from '../src/lib/customers';
import { isActive, isOverstay, folioDue, folioTotal } from '../src/lib/folio';
import { branchName } from '../src/lib/format';
import { migrateClassReferences } from '../src/lib/migrations';
import { checkRoomInterval, getRoomPrice, roomBusy, roomRate } from '../src/lib/rooms';
import { blockReason } from '../src/pages/rooms/timeline';

const fixture = () => {
  const data = createSeed();
  normalizeBookings(data);
  return data;
};

test('class-name snapshots migrate to IDs and survive renaming', () => {
  const data = fixture();
  const cls = data.classes.find((c) => c.id === 'sontra-signature')!;
  const room = data.rooms.find((r) => r.classId === cls.id)!;
  const start = new Date('2030-10-12T08:00:00');
  const end = new Date('2030-10-12T10:00:00');
  const price = data.pricebooks.find((p) => p.classId === cls.id)!;
  Object.assign(price, { classId: undefined, category: cls.name });
  Object.assign(data.blocks[0], {
    classId: undefined,
    category: cls.name,
    from: start.toISOString(),
    to: end.toISOString()
  });
  migrateClassReferences(data);
  cls.name = 'Signature mới';
  assert.equal(price.classId, cls.id);
  assert.equal('category' in price, false);
  assert.equal(data.blocks[0].classId, cls.id);
  assert.equal(roomRate(data, room)?.hourly, 690000);
  assert.match(String(checkRoomInterval(data, room, start, end, 'Theo giờ')), /khóa bán/);
  assert.match(blockReason(data, room, +start, +end)!, /Khóa bán/);
});

test('customers without phones stay separate; formatted phones still group', () => {
  const booking = fixture().bookings[0];
  const list = summarizeCustomers([
    { ...booking, id: 'A', customer: 'Khách A', phone: '' },
    { ...booking, id: 'B', customer: 'Khách B', phone: '' },
    { ...booking, id: 'C', phone: '090 123 4567' },
    { ...booking, id: 'D', phone: '0901234567' }
  ]);
  assert.equal(list.length, 3);
  assert.equal(list.find((c) => c.id === 'booking:A')?.name, 'Khách A');
  assert.equal(list.find((c) => c.id === 'booking:B')?.count, 1);
  assert.equal(list.find((c) => c.id === 'phone:0901234567')?.count, 2);
});

test('overstay follows configured threshold and stop window', () => {
  const data = fixture();
  const folio = data.folios.find((f) => f.detailStatus === 2)!;
  folio.effectiveCheckOutTime = new Date(Date.now() - 20 * 60000).toISOString();
  folio.orderDetailCheckOutTime = folio.effectiveCheckOutTime;
  data.rules.overstayThreshold = 30;
  assert.equal(isOverstay(data, folio), false);
  data.rules.overstayThreshold = 10;
  assert.equal(isOverstay(data, folio), true);
  data.rules.overstayStopAfter = 0.25;
  assert.equal(isOverstay(data, folio), false);
});

test('folio changes project room, schedule, status and charges into Booking', () => {
  const data = fixture();
  const folio = data.folios[0];
  folio.room = '205';
  folio.effectiveCheckInTime = new Date('2030-10-12T08:00:00').toISOString();
  folio.orderDetailCheckOutTime = new Date('2030-10-12T12:00:00').toISOString();
  folio.orderDetails.push({
    name: 'Phụ thu',
    productType: 6,
    phase: 'stay',
    quantity: 1,
    price: 100000
  });
  syncBookings(data);
  const booking = data.bookings.find((b) => b.id === folio.code)!;
  assert.equal(booking.room, '205');
  assert.equal(booking.startsAt, folio.effectiveCheckInTime);
  assert.equal(booking.endsAt, folio.orderDetailCheckOutTime);
  assert.equal(booking.amount, folioTotal(folio));
  assert.equal(booking.status, 'checked-in');
  folio.status = 3;
  folio.outcome = 'no-show';
  folio.cancellationRefund = 100000;
  syncBookings(data);
  assert.equal(booking.status, 'no-show');
  assert.equal(booking.amount, folioTotal(folio));
  assert.equal(
    roomBusy(
      data,
      data.rooms.find((r) => r.branchId === folio.branchId && r.number === folio.room)!
    ).some((r) => r.booking.id === folio.code),
    false
  );
});

test('closed folios without a checkout timestamp do not become active stays', () => {
  const data = fixture();
  const folio = data.folios[0];
  folio.status = 2;
  folio.actualCheckOutAt = null;
  syncBookings(data);
  assert.equal(isActive(folio), false);
  assert.equal(data.bookings.find((b) => b.id === folio.code)?.status, 'checked-out');
});

test('hourly price applies weekday and holiday rates to base and extra hours', () => {
  const data = fixture();
  const room = data.rooms.find((r) => r.branchId === 'sontra' && r.number === '102')!;
  const start = new Date('2030-10-15T14:00:00');
  const end = new Date('2030-10-15T17:00:00');
  room.price = {
    hourly: 400000,
    extra: 100000,
    overnight: 800000,
    daily: 1200000,
    weekdayRates: { Giờ: { [start.getDay()]: 500000 } }
  };
  data.season = [
    {
      id: 'holiday',
      branchId: room.branchId,
      rooms: [room.number],
      name: 'Lễ',
      from: '2030-10-15',
      to: '2030-10-15',
      mode: 'percent',
      value: 20
    }
  ];
  assert.equal(getRoomPrice(data, room.branchId, room.number, 'Theo giờ', start, end), 720000);
});

test('cleaning buffer rejects an adjacent stay and allows the exact boundary', () => {
  const data = fixture();
  const room = data.rooms.find((r) => r.branchId === 'sontra' && r.number === '102')!;
  const booking = data.bookings.find(
    (b) => b.branchId === room.branchId && b.room === room.number
  )!;
  const folio = data.folios.find((f) => f.code === booking.id)!;
  folio.effectiveCheckInTime = new Date('2030-10-15T08:00:00').toISOString();
  folio.orderDetailCheckOutTime = new Date('2030-10-15T10:00:00').toISOString();
  data.bookings = [booking];
  data.folios = [folio];
  data.blocks = [];
  data.rules.cleaningBuffer = 30;
  syncBookings(data);
  assert.match(
    String(
      checkRoomInterval(
        data,
        room,
        new Date('2030-10-15T10:29:00'),
        new Date('2030-10-15T12:29:00'),
        'Theo giờ'
      )
    ),
    /30 phút/
  );
  assert.equal(
    checkRoomInterval(
      data,
      room,
      new Date('2030-10-15T10:30:00'),
      new Date('2030-10-15T12:30:00'),
      'Theo giờ'
    ),
    true
  );
});

test('cancellation keeps retained money and tracks refund separately', () => {
  const folio = fixture().folios[0];
  folio.payments = [
    {
      id: 'payment',
      amount: 500000,
      method: 'cash',
      collector: 'Lễ tân',
      createdAt: new Date().toISOString()
    }
  ];
  folio.status = 3;
  folio.cancellationRefund = 200000;
  assert.equal(folioTotal(folio), 300000);
  assert.equal(refundable(folio), 200000);
  folio.payments.push({ ...folio.payments[0], id: 'refund', amount: -200000 });
  folio.cancellationRefund = 0;
  assert.equal(folioTotal(folio), 300000);
  assert.equal(refundable(folio), 0);
  assert.equal(folioDue(folio), 0);
});

test('branch formatting reads current data and seed resets remain independent', () => {
  const data = fixture();
  data.branches[0].name = 'Chi nhánh mới';
  assert.equal(branchName(data, data.branches[0].id), 'Chi nhánh mới');
  assert.equal(createSeed().branches[0].name, 'The Norin Sơn Trà');
});
