import type { DemoData } from '../types';

type Scoped = { branchId: string };
type Scope = Pick<DemoData, 'role' | 'branchId'>;

export const SUPER_ONLY_PAGES = ['branches', 'settings'];
export const SYSTEM_PAGES = ['dashboard', 'branches', 'reports', 'staff'];
export const isSystemScope = (d: Scope) => d.role === 'superadmin' && d.branchId === 'all';

export const isPageAllowed = (d: Scope, page: string) =>
  isSystemScope(d) ? SYSTEM_PAGES.includes(page) : !SUPER_ONLY_PAGES.includes(page);

export const isAllowedBranch = (d: Scope, branchId: string) =>
  branchId !== 'all' && (isSystemScope(d) || branchId === d.branchId);

export const scoped = <T extends Scoped>(d: Scope, items: T[]) =>
  items.filter((item) => isAllowedBranch(d, item.branchId));

export const scopedWithAll = <T extends Scoped>(d: Scope, items: T[]) =>
  items.filter((item) => item.branchId === 'all' || isAllowedBranch(d, item.branchId));

export const defaultBranch = (d: Pick<DemoData, 'branchId'>) =>
  d.branchId === 'all' ? 'sontra' : d.branchId;
