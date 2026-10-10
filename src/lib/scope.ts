import type { DemoData } from '../types';

type Scoped = { branchId: string };

export const SUPER_ONLY_PAGES = ['branches', 'kiosks', 'notifications', 'settings', 'staff'];

export const isAllowedBranch = (d: Pick<DemoData, 'role'>, branchId: string) =>
  d.role === 'superadmin' || branchId === 'sontra';

export const scoped = <T extends Scoped>(d: Pick<DemoData, 'role' | 'branchId'>, items: T[]) =>
  items.filter(item => (d.role === 'superadmin' || item.branchId === 'sontra') && (d.branchId === 'all' || item.branchId === d.branchId));

export const scopedWithAll = <T extends Scoped>(d: Pick<DemoData, 'role' | 'branchId'>, items: T[]) =>
  items.filter(item =>
    (d.role === 'superadmin' || item.branchId === 'all' || item.branchId === 'sontra') &&
    (d.branchId === 'all' || item.branchId === 'all' || item.branchId === d.branchId));

export const defaultBranch = (d: Pick<DemoData, 'branchId'>) => d.branchId === 'all' ? 'sontra' : d.branchId;
