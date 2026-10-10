import type { ReactNode } from 'react';
import { useStore } from '../../store';
import { branchName, fmtDateTime, fmtTime, money } from '../../lib/format';
import { scoped } from '../../lib/scope';
import { checkoutAt, folioDue, isActive, isOverstay, overstayType } from '../../lib/folio';
import { DataTable, Panel, TextLink } from '../../components/ui';
import { useFlowActions } from './actions';
import { useFolioDialogs } from '../../booking/payment';

interface Item {
  key: string;
  code: string;
  room: string;
  branchId: string;
  kind: string;
  detail: string;
  action: ReactNode;
}

export function WorkQueue() {
  const { data } = useStore();
  const act = useFlowActions();
  const { detail, collect } = useFolioDialogs();
  const list = scoped(data, data.folios).filter(isActive);
  const requests = scoped(data, data.requests);

  const items: Item[] = [
    ...list
      .filter((b) => b.checkinAdjustmentStatus === 'PENDING_REVIEW')
      .map((b) => ({
        key: `adj-${b.code}`,
        code: b.code,
        room: b.room,
        branchId: b.branchId,
        kind: 'Duyệt điều chỉnh giờ',
        detail: `${b.checkinDecision} · ${fmtDateTime(b.originalCheckInTime)} → ${fmtDateTime(b.effectiveCheckInTime)} · trả ${fmtTime(b.effectiveCheckOutTime)}`,
        action: (
          <TextLink icon="bi-check2-circle" onClick={() => act.applyHour(b.code)}>
            Duyệt & cập nhật folio
          </TextLink>
        )
      })),
    ...list
      .filter((b) => b.checkinAssistanceRequestedAt && !b.assistanceResolvedAt)
      .map((b) => ({
        key: `assist-${b.code}`,
        code: b.code,
        room: b.room,
        branchId: b.branchId,
        kind: 'Hỗ trợ check-in',
        detail: `Khách cần lễ tân hỗ trợ · ${fmtDateTime(b.checkinAssistanceRequestedAt)}`,
        action: (
          <TextLink icon="bi-arrow-right" onClick={() => act.resolveAssistance(b.code)}>
            Đã hỗ trợ
          </TextLink>
        )
      })),
    ...list
      .filter((b) => isOverstay(data, b))
      .map((b) => {
        const blocked = overstayType(data, b) === 'BLOCKED';
        return {
          key: `over-${b.code}`,
          code: b.code,
          room: b.room,
          branchId: b.branchId,
          kind: blocked ? 'Quá giờ · có khách sau' : 'Quá giờ · có thể cộng 1 tiếng',
          detail: `Quá ${Math.floor((Date.now() - Date.parse(checkoutAt(b))) / 60000)} phút · camera còn khách`,
          action: blocked ? (
            <TextLink icon="bi-arrow-right" onClick={() => act.resolveOverstay(b.code)}>
              Đã lên phòng xử lý
            </TextLink>
          ) : (
            <TextLink icon="bi-plus-circle" onClick={() => detail(b)}>
              Kiểm tra & gia hạn
            </TextLink>
          )
        };
      }),
    ...list
      .filter((b) => b.checkoutRequestedAt && !b.checkoutHandledAt)
      .map((b) => ({
        key: `co-${b.code}`,
        code: b.code,
        room: b.room,
        branchId: b.branchId,
        kind: 'Yêu cầu trả phòng',
        detail: `Tablet yêu cầu · ${fmtDateTime(b.checkoutRequestedAt)} · ${folioDue(b) ? `còn nợ ${money(folioDue(b))}` : 'đã trả đủ'}`,
        action: (
          <TextLink
            icon="bi-arrow-right"
            onClick={() => (folioDue(b) > 0 ? collect(b) : detail(b))}
          >
            Kiểm tra thanh toán
          </TextLink>
        )
      })),
    ...list
      .filter(
        (b) =>
          b.detailStatus === 2 &&
          folioDue(b) === 0 &&
          !b.actualCheckOutAt &&
          requests.some(
            (r) => r.code === b.code && r.context === 'CHECKOUT' && r.status === 'collected'
          )
      )
      .map((b) => ({
        key: `done-${b.code}`,
        code: b.code,
        room: b.room,
        branchId: b.branchId,
        kind: 'Đã thu đủ · chờ kiosk trả phòng',
        detail: 'Đối chiếu thẻ và xác nhận kiosk đã hoàn tất trước khi chốt sổ',
        action: (
          <TextLink icon="bi-arrow-right" onClick={() => detail(b)}>
            Kiểm tra & trả phòng
          </TextLink>
        )
      })),
    ...scoped(data, data.rooms)
      .filter((r) => r.status === 'cleaning')
      .map((r) => ({
        key: `clean-${r.branchId}:${r.number}`,
        code: `Phòng ${r.number}`,
        room: r.number,
        branchId: r.branchId,
        kind: 'Chờ dọn',
        detail: 'Xác nhận phòng đã sạch trước khi mở bán',
        action: (
          <TextLink
            icon="bi-arrow-right"
            onClick={() => act.finishClean(`${r.branchId}:${r.number}`)}
          >
            Xác nhận đã dọn
          </TextLink>
        )
      }))
  ];

  return (
    <Panel
      title="Hàng việc vận hành"
      subtitle="Duyệt điều chỉnh giờ, hỗ trợ kiosk, camera quá giờ và dọn phòng"
    >
      <DataTable headers={['LOẠI VIỆC', 'BOOKING / PHÒNG', 'CHI NHÁNH', 'CHI TIẾT', 'THAO TÁC']}>
        {items.map((i) => (
          <tr key={i.key}>
            <td>
              <strong>{i.kind}</strong>
            </td>
            <td>
              {i.code} · {i.room}
            </td>
            <td>{branchName(data, i.branchId)}</td>
            <td>{i.detail}</td>
            <td>{i.action}</td>
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}
