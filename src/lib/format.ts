import { branches } from '../seed/base';

export const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
export const moneyOrDash = (value: unknown) => Number.isFinite(Number(value)) ? money(Number(value)) : '—';
export const groupComma = (value: number | string) => new Intl.NumberFormat('en-US').format(Number(value) || 0);
export const moneyComma = (value: number) => `${groupComma(value)} ₫`;
export const moneyCommaOrDash = (value: unknown) => value != null && value !== '' && Number.isFinite(Number(value)) ? moneyComma(Number(value)) : '—';
export const branchName = (id: string) => branches.find(b => b.id === id)?.name || '';

export const fmtDateTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : '—';
export const fmtTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : '—';
export const localDateTime = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
export const maskPhone = (phone?: string) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `${digits.slice(0, 3)}***${digits.slice(-3)}` : '—';
};
export const includesVi = (haystack: string, needle: string) => haystack.toLocaleLowerCase('vi').includes(needle.toLocaleLowerCase('vi'));

export const statusText: Record<string, string> = {
  available: 'Phòng trống', occupied: 'Có khách', cleaning: 'Đang dọn', reserved: 'Đã đặt',
  confirmed: 'Đã xác nhận', 'checked-in': 'Đã nhận phòng', 'checked-out': 'Đã trả phòng', pending: 'Chờ xác nhận'
};

export const methodLabel: Record<string, string> = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ' };
