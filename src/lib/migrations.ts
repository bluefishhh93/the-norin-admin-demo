import type { DemoData } from '../types';
import { seedKiosks } from '../seed/pms';

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
    if (k.session && !k.session.paymentMethod)
      k.session.paymentMethod = k.session.steps.payment.note?.includes('tiền mặt') ? 'cash' : 'card';
  }
  data.kiosks = data.kiosks.filter((k, i, all) => {
    const branchKiosks = all.filter((row) => row.branchId === k.branchId);
    const keep = branchKiosks.find((row) => row.session) ?? branchKiosks[0];
    return all.indexOf(keep) === i;
  });
}
