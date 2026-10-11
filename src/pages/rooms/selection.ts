import type { Cell, TimelineView } from './timeline';

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
