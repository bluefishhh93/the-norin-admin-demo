export type NotifyChannel = 'zalo' | 'email';

export const DEFAULT_BOOKING_PASSWORD = '123456';

export interface ContactInput {
  customer: string;
  phone: string;
  email: string;
  password: string;
  notify: NotifyChannel;
}

export type ContactField = 'customer' | 'phone' | 'email' | 'password';
export type ContactErrors = Partial<Record<ContactField, string>>;

export const CONTACT_FIELDS: ContactField[] = ['customer', 'phone', 'email', 'password'];

export const normalizePhone = (value: string) => {
  const digits = value.replace(/[\s.()-]/g, '');
  return digits.startsWith('+84') ? `0${digits.slice(3)}` : digits;
};

const PHONE = /^0(3|5|7|8|9)\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME = /^[\p{L}\s.'-]+$/u;

export const contactErrors = (v: ContactInput): ContactErrors => {
  const errors: ContactErrors = {};
  const name = v.customer.trim();
  if (!name) errors.customer = 'Nhập tên khách.';
  else if (name.length < 2) errors.customer = 'Tên khách tối thiểu 2 ký tự.';
  else if (!NAME.test(name)) errors.customer = 'Tên khách chỉ gồm chữ cái và khoảng trắng.';

  const phone = normalizePhone(v.phone.trim());
  if (!phone) errors.phone = 'Nhập số điện thoại.';
  else if (!PHONE.test(phone)) errors.phone = 'Số điện thoại gồm 10 số, bắt đầu 03, 05, 07, 08 hoặc 09.';

  const email = v.email.trim();
  if (!email && v.notify === 'email') errors.email = 'Nhập Gmail để gửi thông tin đặt phòng.';
  else if (email && !EMAIL.test(email)) errors.email = 'Gmail không đúng định dạng, ví dụ ten@gmail.com.';

  if (!v.password) errors.password = 'Nhập mật khẩu.';
  else if (!/^\d{6}$/.test(v.password)) errors.password = 'Mật khẩu gồm đúng 6 số.';

  return errors;
};
