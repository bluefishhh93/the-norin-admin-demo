import type { BookingGuest, GuestIdType } from '../types';

export const MAX_GUESTS = 2;
export const ADULT_AGE = 18;

export type GuestField =
  | 'fullName'
  | 'dateOfBirth'
  | 'idNumber'
  | 'nationality'
  | 'issueDate'
  | 'expiryDate';
export type GuestErrors = Partial<Record<GuestField, string>>;

export const GUEST_FIELDS: GuestField[] = [
  'fullName',
  'dateOfBirth',
  'idNumber',
  'nationality',
  'issueDate',
  'expiryDate'
];

export const ID_TYPE_LABEL: Record<GuestIdType, string> = {
  id_card: 'CCCD',
  passport: 'Passport'
};

export const emptyGuest = (fullName = ''): BookingGuest => ({
  fullName,
  dateOfBirth: '',
  gender: '',
  idType: 'id_card',
  idNumber: '',
  nationality: '',
  address: '',
  issueDate: '',
  expiryDate: '',
  idCardPhoto: '',
  idCardAvatar: ''
});

const NAME = /^[\p{L}\s.'-]+$/u;
const CCCD = /^\d{12}$/;
const PASSPORT = /^[A-Z0-9]{6,9}$/;

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const ageOf = (dob: string, at = new Date()) => {
  const birth = new Date(dob);
  let age = at.getFullYear() - birth.getFullYear();
  const m = at.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < birth.getDate())) age--;
  return age;
};

export const guestErrors = (g: BookingGuest): GuestErrors => {
  const errors: GuestErrors = {};
  const name = g.fullName.trim();
  if (!name) errors.fullName = 'Nhập họ tên theo giấy tờ.';
  else if (!NAME.test(name)) errors.fullName = 'Họ tên chỉ gồm chữ cái và khoảng trắng.';

  if (!g.dateOfBirth) errors.dateOfBirth = 'Nhập ngày sinh.';
  else if (new Date(g.dateOfBirth) >= today()) errors.dateOfBirth = 'Ngày sinh không hợp lệ.';
  else if (ageOf(g.dateOfBirth) < ADULT_AGE)
    errors.dateOfBirth = `Khách chưa đủ ${ADULT_AGE} tuổi (${ageOf(g.dateOfBirth)} tuổi).`;

  const id = g.idNumber.trim();
  if (!id) errors.idNumber = g.idType === 'passport' ? 'Nhập số passport.' : 'Nhập số CCCD.';
  else if (g.idType === 'id_card' && !CCCD.test(id)) errors.idNumber = 'Số CCCD gồm đúng 12 số.';
  else if (g.idType === 'passport' && !PASSPORT.test(id))
    errors.idNumber = 'Số passport gồm 6–9 ký tự chữ in hoa hoặc số.';

  if (g.idType === 'passport' && !g.nationality?.trim()) errors.nationality = 'Nhập quốc tịch.';

  if (g.issueDate && new Date(g.issueDate) > today())
    errors.issueDate = 'Ngày cấp không được sau hôm nay.';
  if (g.expiryDate && new Date(g.expiryDate) < today())
    errors.expiryDate = 'Giấy tờ đã hết hạn.';
  else if (g.issueDate && g.expiryDate && g.expiryDate <= g.issueDate)
    errors.expiryDate = 'Ngày hết hạn phải sau ngày cấp.';

  return errors;
};

export const hasGuestProfile = (guests?: BookingGuest[]) =>
  !!guests?.length && guests.every((g) => !Object.keys(guestErrors(g)).length);

export const floorOf = (room: string) => room.trim().charAt(0) || '—';

type LegacyGuest = { name?: string; document?: string };

export const migrateGuests = (guests: unknown): BookingGuest[] | undefined => {
  if (!Array.isArray(guests)) return undefined;
  return guests.map((row) => {
    const g = row as Partial<BookingGuest> & LegacyGuest;
    if (typeof g.fullName === 'string') return { ...emptyGuest(), ...g } as BookingGuest;
    return { ...emptyGuest(g.name ?? ''), idNumber: g.document ?? '' };
  });
};
