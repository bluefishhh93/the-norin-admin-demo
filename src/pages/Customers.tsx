import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { branchName, includesVi, money } from '../lib/format';
import { scoped } from '../lib/scope';
import { summarizeCustomers } from '../lib/customers';
import { DataTable, Panel, Toolbar } from '../components/ui';

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="search-box">
      <i className="bi bi-search" />
      <input
        type="search"
        placeholder="Tìm tên hoặc số điện thoại..."
        value={value}
        aria-label="Tìm khách hàng"
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function Customers() {
  const { data } = useStore();
  const [search, setSearch] = useState('');
  const list = useMemo(
    () =>
      summarizeCustomers(scoped(data, data.bookings)).filter((customer) =>
        includesVi(`${customer.name} ${customer.phone}`, search)
      ),
    [data, search]
  );

  return (
    <>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} />
        <span className="text-muted small">{list.length} khách hàng</span>
      </Toolbar>
      <Panel title="Danh sách khách hàng" subtitle="Tổng hợp từ các đặt phòng trong bản demo">
        <DataTable
          headers={['KHÁCH HÀNG', 'SỐ ĐIỆN THOẠI', 'CHI NHÁNH', 'LƯỢT ĐẶT', 'TỔNG GIÁ TRỊ']}
        >
          {list.map((customer) => (
            <tr key={customer.id}>
              <td>
                <strong>{customer.name}</strong>
              </td>
              <td>{customer.phone || 'Chưa có SĐT'}</td>
              <td>{[...customer.branchIds].map((id) => branchName(data, id)).join(', ')}</td>
              <td>{customer.count}</td>
              <td>
                <strong>{money(customer.total)}</strong>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
