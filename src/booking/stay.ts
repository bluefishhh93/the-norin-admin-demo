import type { StayType } from '../types';

export const STAY_ICON: Record<StayType, string> = {
  'Theo giờ': 'bi-clock',
  'Qua đêm': 'bi-moon-stars',
  'Theo ngày': 'bi-sun'
};

export const fmtDay = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(
    new Date(value)
  );

export const stayLength = (type: StayType, from: string, to: string) => {
  const hours = (Date.parse(to) - Date.parse(from)) / 3600000;
  if (type === 'Theo giờ') return `${Math.round(hours * 10) / 10} giờ`;
  const units = Math.max(1, Math.round(hours / 24));
  return `${units} ${type === 'Qua đêm' ? 'đêm' : 'ngày'}`;
};
