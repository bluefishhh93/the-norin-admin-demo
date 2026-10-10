import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DemoData } from './types';
import { createSeed } from './seed';
import { syncBranches } from './seed/base';
import { normalizeBookings } from './booking/model';

const STORAGE_KEY = 'norin_admin_demo_react_v1';

const load = (): DemoData => {
  const base = createSeed();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object' && Array.isArray(saved.rooms)) {
      const restored = Object.fromEntries(Object.keys(base).map(k => [k, saved[k] ?? base[k as keyof DemoData]])) as unknown as DemoData;
      normalizeBookings(restored);
      return restored;
    }
  } catch {}
  normalizeBookings(base);
  return base;
};

type Mutator = (draft: DemoData) => void;

interface StoreValue {
  data: DemoData;
  update: (fn: Mutator) => void;
  reset: () => void;
  toast: (text: string) => void;
  toastText: string | null;
  closeToast: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoData>(load);
  const [toastText, setToastText] = useState<string | null>(null);
  const timer = useRef<number>();
  syncBranches(data.branches);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { setToastText('Bộ nhớ trình duyệt đã đầy. Thay đổi chưa được lưu.'); }
    }, 150);
    return () => window.clearTimeout(id);
  }, [data]);

  const update = useCallback((fn: Mutator) => {
    setData(prev => { const draft = structuredClone(prev); fn(draft); return draft; });
  }, []);

  const toast = useCallback((text: string) => {
    setToastText(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToastText(null), 4000);
  }, []);

  const closeToast = useCallback(() => setToastText(null), []);
  const reset = useCallback(() => { localStorage.removeItem(STORAGE_KEY); const seed = createSeed(); normalizeBookings(seed); setData(seed); }, []);

  const value = useMemo(() => ({ data, update, reset, toast, toastText, closeToast }), [data, update, reset, toast, toastText, closeToast]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('StoreProvider missing');
  return ctx;
};
