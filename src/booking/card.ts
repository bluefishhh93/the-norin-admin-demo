import type { DemoData } from '../types';
import { isActive } from '../lib/folio';

export type CardUidFormat = 'hex' | 'decimal';

export interface ParsedCardUid {
  raw: string;
  hex: string;
  format: CardUidFormat;
}

const HEX_UID = /^(?:[0-9A-F]{8}|[0-9A-F]{14}|[0-9A-F]{20})$/;
const DEC_UID = /^\d{10}$/;

export const parseCardUid = (input: string): ParsedCardUid | null => {
  const raw = input.replace(/[\s:-]/g, '').toUpperCase();
  if (DEC_UID.test(raw)) {
    const n = Number(raw);
    if (n > 0xffffffff) return null;
    return { raw, hex: n.toString(16).toUpperCase().padStart(8, '0'), format: 'decimal' };
  }
  if (HEX_UID.test(raw)) return { raw, hex: raw, format: 'hex' };
  return null;
};

export const formatUid = (hex: string) => hex.match(/.{1,2}/g)?.join(' ') ?? hex;

export const findCardHolder = (d: DemoData, hex: string) =>
  d.folios.find((f) => isActive(f) && f.roomCards?.some((c) => c.uid === hex));

export const cardConflict = (d: DemoData, code: string, hex: string) => {
  const holder = findCardHolder(d, hex);
  if (!holder) return null;
  return holder.code === code
    ? `Thẻ ${formatUid(hex)} đã được phát cho booking này.`
    : `Thẻ ${formatUid(hex)} đang dùng cho phòng ${holder.room} (${holder.code}). Thu hồi trước khi phát lại.`;
};

export const CARD_ISSUE_DELAY = 700;

export interface IssueCardRequest {
  bookingCode: string;
  cardUid: string;
  lockId: number | null;
}

export const requestIssueCard = (req: IssueCardRequest) =>
  new Promise<{ ok: true } | { ok: false; reason: string }>((resolve) => {
    window.setTimeout(() => {
      if (req.lockId == null)
        resolve({ ok: false, reason: 'Phòng chưa được cấu hình khóa TTLock.' });
      else resolve({ ok: true });
    }, CARD_ISSUE_DELAY);
  });
