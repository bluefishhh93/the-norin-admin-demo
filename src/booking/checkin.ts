import type { DemoData, Folio } from '../types';
import { checkRoomInterval } from '../lib/rooms';
import { checkoutAt } from '../lib/folio';

export function checkinSchedule(d: DemoData, f: Folio, now = new Date()) {
  const start = new Date(f.effectiveCheckInTime), end = new Date(checkoutAt(f));
  const at = new Date(now); at.setSeconds(0, 0);
  if (at > end) return { start, end, message: 'Lịch lưu trú đã hết hạn. Cần sửa lịch hoặc xác nhận khách không đến.' };
  if (f.stayType !== 'Theo giờ') return { start, end, message: at < start ? 'Khách đến sớm: quyền phòng có hiệu lực từ giờ đã đặt, giờ trả giữ nguyên.' : 'Giữ giờ trả theo gói ngày/đêm, không bù thời lượng khi tới muộn.' };
  const minutes = Math.trunc((+at - +start) / 60000);
  if (minutes >= 0 && minutes < 30) return { start, end, message: 'Đến đúng giờ hoặc muộn dưới 30 phút: giữ lịch đã đặt.' };
  if (minutes < 0 && minutes >= -5) return { start: at, end, message: 'Đến sớm tối đa 5 phút: vào ngay, giữ giờ trả.' };
  if (minutes < -5 && minutes > -30) {
    const deducted = Math.floor(-minutes / 5) * 5;
    return { start: at, end: new Date(+end - deducted * 60000), message: `Đến sớm dưới 30 phút: vào ngay, giờ trả sớm hơn ${deducted} phút theo quy tắc nhận phòng.` };
  }
  const shiftedEnd = new Date(+at + +end - +start);
  const room = d.rooms.find(r => r.branchId === f.branchId && r.number === f.room);
  const fits = checkRoomInterval(d, room, at, shiftedEnd, f.stayType, f.code, true, false);
  return fits === true
    ? { start: at, end: shiftedEnd, message: `Đến ${minutes < 0 ? 'sớm' : 'muộn'} từ 30 phút: dời cả khung giờ, giữ thời lượng đã đặt.` }
    : { start, end, message: `Không thể dời khung giờ: ${fits} Giữ lịch đã đặt hoặc đổi phòng trong chi tiết booking.` };
}
