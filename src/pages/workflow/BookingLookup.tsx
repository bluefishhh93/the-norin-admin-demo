import { useState } from 'react';
import { branchName, fmtDateTime, includesVi, maskPhone, money } from '../../lib/format';
import { folioDue, isActive } from '../../lib/folio';
import { DataTable, Panel, TextLink, Toolbar } from '../../components/ui';
import { SearchBox } from '../Customers';
import { useFlowActions } from './actions';
import { useFolioDialogs, useFolios } from './shared';

export function BookingLookup() {
  const folios = useFolios();
  const act = useFlowActions();
  const { detail, collect } = useFolioDialogs();
  const [search, setSearch] = useState('');
  const list = folios.filter(b => includesVi(`${b.code} ${b.phone} ${b.room} ${b.customer}`, search));

  return (
    <>
      <Toolbar><SearchBox value={search} onChange={setSearch} placeholder="Mã, số điện thoại, số phòng..." label="Tìm booking" /></Toolbar>
      <Panel title="Booking" subtitle="Theo mã, số phòng hoặc số điện thoại">
        <DataTable headers={['MÃ', 'PHÒNG', 'KHÁCH', 'LƯU TRÚ', 'GIỜ HIỆU LỰC', 'CÒN NỢ', 'THAO TÁC']}>
          {list.map(b => {
            const due = folioDue(b);
            return (
              <tr key={b.code}>
                <td><strong>{b.code}</strong></td>
                <td>{branchName(b.branchId)} · {b.room}</td>
                <td>{b.customer}<small>{maskPhone(b.phone)}</small></td>
                <td>{b.stayType}</td>
                <td>{fmtDateTime(b.effectiveCheckInTime)} → {fmtDateTime(b.effectiveCheckOutTime)}</td>
                <td><strong>{money(due)}</strong></td>
                <td>
                  <TextLink icon="bi-eye" onClick={() => detail(b)}>Chi tiết</TextLink>{' '}
                  {due > 0 && <TextLink icon="bi-cash-stack" onClick={() => collect(b)}>Thu tiền</TextLink>}{' '}
                  {b.detailStatus === 1 && isActive(b) && <TextLink icon="bi-door-open" onClick={() => act.checkinDesk(b.code)}>Nhận phòng tại quầy</TextLink>}{' '}
                  {b.detailStatus === 2 && isActive(b) && due === 0 && <TextLink icon="bi-box-arrow-right" onClick={() => act.completeCheckout(b.code)}>Trả phòng</TextLink>}
                </td>
              </tr>
            );
          })}
        </DataTable>
      </Panel>
    </>
  );
}
