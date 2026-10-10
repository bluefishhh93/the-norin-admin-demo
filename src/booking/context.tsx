import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { StayType } from '../types';
import { BookingModal } from './BookingModal';

export interface BookingPreset { branchId?: string; room?: string; type?: StayType; start?: Date; end?: Date; locked?: boolean }

interface Api { openBooking: (preset?: BookingPreset) => void }
const Ctx = createContext<Api | null>(null);

export function BookingProvider({ children, onCreated }: { children: ReactNode; onCreated: () => void }) {
  const [preset, setPreset] = useState<BookingPreset | null>(null);
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);

  const openBooking = useCallback((p: BookingPreset = {}) => { setPreset(p); setVersion(v => v + 1); setOpen(true); }, []);
  const close = useCallback(() => setOpen(false), []);
  const api = useMemo(() => ({ openBooking }), [openBooking]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <BookingModal key={version} open={open} preset={preset ?? {}} onClose={close} onCreated={() => { close(); onCreated(); }} />
    </Ctx.Provider>
  );
}

export const useBooking = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('BookingProvider missing');
  return ctx;
};
