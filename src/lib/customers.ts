import type { Booking } from '../types';

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  count: number;
  total: number;
  branchIds: Set<string>;
}

export function summarizeCustomers(bookings: Booking[]): CustomerSummary[] {
  const customers = new Map<string, CustomerSummary>();
  for (const booking of bookings) {
    const phone = booking.phone.replace(/\D/g, '');
    const id = phone ? `phone:${phone}` : `booking:${booking.id}`;
    const customer = customers.get(id) ?? {
      id,
      name: booking.customer,
      phone: booking.phone,
      count: 0,
      total: 0,
      branchIds: new Set<string>()
    };
    customer.count++;
    customer.total += booking.amount;
    customer.branchIds.add(booking.branchId);
    customers.set(id, customer);
  }
  return [...customers.values()];
}
