import type { DemoData } from '../types';

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
