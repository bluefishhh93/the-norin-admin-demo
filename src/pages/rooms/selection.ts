import { SLOT_MS, type Cell, type Column, type TimelineView } from './timeline';

const HOUR_MS = 3600000;

export interface HourRange {
  roomKey: string;
  start: number;
  end: number;
}

export const slotColumns = (from: number, to: number): Column[] => {
  const cols: Column[] = [];
  for (let t = from; t < to; t += SLOT_MS)
    cols.push({ key: String(t), start: t, end: t + SLOT_MS, label: '', sub: '' });
  return cols;
};

export const nextHourRange = (
  current: HourRange | null,
  roomKey: string,
  at: number,
  check: (from: number, to: number) => string | undefined,
  maxHours: number
): HourRange | string => {
  const fresh = !current || current.roomKey !== roomKey || at < current.start;
  const start = fresh ? at : current.start;
  const hours = fresh
    ? 2
    : Math.min(maxHours, Math.max(2, Math.ceil((at + SLOT_MS - start) / HOUR_MS)));
  const end = start + hours * HOUR_MS;
  const blocked = check(start, end);
  if (blocked) return fresh ? `Không đủ 2 tiếng trống liên tục từ ô này. ${blocked}` : blocked;
  return { roomKey, start, end };
};

export interface Selection {
  roomKey: string;
  anchor: number;
  from: number;
  to: number;
}

export const blockedIn = (cells: Cell[], from: number, to: number) =>
  from < 0 || to >= cells.length
    ? 'Khoảng chọn vượt quá ngày đang xem.'
    : cells.slice(from, to + 1).find((c) => c.kind !== 'open')?.reason;

export const nextSelection = (
  view: TimelineView,
  current: Selection | null,
  roomKey: string,
  index: number,
  cells: Cell[],
  minSlots: number,
  maxSlots: number
): Selection | string => {
  const fresh =
    !current || current.roomKey !== roomKey || view === 'night' || index < current.anchor;
  const anchor = fresh ? index : current.anchor;
  let to = index;
  if (view === 'hour') {
    const slots = Math.min(maxSlots, Math.max(minSlots, Math.ceil((index - anchor + 1) / 2) * 2));
    to = anchor + slots - 1;
  }
  const blocked = blockedIn(cells, anchor, to);
  if (blocked)
    return view === 'hour' && fresh
      ? `Không đủ ${minSlots / 2} tiếng trống liên tục từ ô này. ${blocked}`
      : blocked;
  return { roomKey, anchor, from: anchor, to };
};
