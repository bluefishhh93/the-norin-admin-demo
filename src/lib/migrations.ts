import type { DemoData } from '../types';
import { seedKiosks } from '../seed/pms';
import { seedLocks } from '../seed/operations';
import { newSteps } from '../kiosk/session';

export function migrateLocks(data: DemoData) {
  for (const seed of seedLocks) {
    const taken = data.locks.some(
      (l) =>
        l.id === seed.id ||
        l.lockId === seed.lockId ||
        (l.branchId === seed.branchId && l.room === seed.room)
    );
    const room = data.rooms.find((r) => r.branchId === seed.branchId && r.number === seed.room);
    if (!taken && room) data.locks.push({ ...seed, masterProductId: room.masterProductId });
  }
}

// Snapshots saved before class IDs linked prices and sale blocks by display name.
export function migrateClassReferences(data: DemoData) {
  for (const row of [...data.pricebooks, ...data.blocks]) {
    const saved = row as typeof row & { category?: string };
    if (!saved.classId && saved.category) {
      const cls = data.classes.find(
        (c) => c.branchId === saved.branchId && c.name === saved.category
      );
      if (cls) saved.classId = cls.id;
    }
    if (saved.classId) delete saved.category;
  }
}

// Snapshots saved before kiosk sessions tracked paper/card counts instead of agent state.
export function migrateKiosks(data: DemoData) {
  if (data.kiosks.some((k) => !('session' in k))) data.kiosks = seedKiosks();
  for (const k of data.kiosks) {
    const s = k.session;
    if (!s) continue;
    if (!s.paymentMethod)
      s.paymentMethod = s.steps.payment?.note?.includes('tiền mặt') ? 'cash' : 'card';
    if (!s.flow) {
      s.flow = 'checkin';
      s.steps = newSteps({ ...s.steps, payment: { state: 'todo' } });
      if (s.steps.lookup.state === 'done') s.steps.schedule = { state: 'done', note: 'Đã kiểm tra giờ nhận phòng' };
      if (s.steps.guests.state === 'done') {
        s.steps.face = { state: 'done', note: 'Đã ghi nhận ảnh khuôn mặt' };
        s.steps.policy = { state: 'done', note: 'Đã đồng ý chính sách' };
      }
      if (s.steps.card.state === 'todo' && s.steps.guests.state === 'done')
        s.steps.card = { state: 'running', note: 'Chờ kích hoạt thẻ' };
      if (s.support?.reason.toLowerCase().includes('thanh toán')) s.support = null;
    } else {
      s.steps = newSteps(s.steps);
      if (s.flow === 'checkin' && s.support?.status === 'handling' && !s.handedOver) {
        s.staffHandling = true;
        if (s.steps.card.state === 'done' && s.steps.release.state !== 'todo')
          s.steps.card = { state: 'todo', note: 'Đọc lại thẻ đã kích hoạt bằng E3 để giao khách' };
      }
    }
  }
  data.kiosks = data.kiosks.filter((k, i, all) => {
    const branchKiosks = all.filter((row) => row.branchId === k.branchId);
    const keep = branchKiosks.find((row) => row.session) ?? branchKiosks[0];
    return all.indexOf(keep) === i;
  });
}
