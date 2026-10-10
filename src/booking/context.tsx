import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { StayType } from '../types';
import { BookingModal } from './BookingModal';

export interface BookingPreset { branchId?: string; room?: string; type?: StayType; start?: Date; end?: Date; locked?: boolean; receiveNow?: boolean }

interface Api { openBooking: (preset?: BookingPreset) => void; openDetail: (code: string) => void; detailCode: string | null; initialCheckin: boolean; clearInitialCheckin: () => void; closeDetail: () => void }
const Ctx = createContext<Api | null>(null);

export function BookingProvider({ children, onCreated }: { children: ReactNode; onCreated: () => void }) {
  const [preset, setPreset] = useState<BookingPreset | null>(null);
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);

  const openBooking = useCallback((p: BookingPreset = {}) => { setPreset(p); setVersion(v => v + 1); setOpen(true); }, []);
  const close = useCallback(() => setOpen(false), []);
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [initialCheckin, setInitialCheckin] = useState(false);
  const openDetail = useCallback((code: string) => { setDetailCode(code); setInitialCheckin(false); onCreated(); }, [onCreated]);
  const clearInitialCheckin = useCallback(() => setInitialCheckin(false), []);
  const closeDetail = useCallback(() => { setDetailCode(null); setInitialCheckin(false); }, []);
  const api = useMemo(() => ({ openBooking, openDetail, detailCode, initialCheckin, clearInitialCheckin, closeDetail }), [openBooking, openDetail, detailCode, initialCheckin, clearInitialCheckin, closeDetail]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <BookingModal key={version} open={open} preset={preset ?? {}} onClose={close} onCreated={(code, receiveNow) => { close(); setDetailCode(code); setInitialCheckin(receiveNow); onCreated(); }} />
    </Ctx.Provider>
  );
}

export const useBooking = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('BookingProvider missing');
  return ctx;
};
