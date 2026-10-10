import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { branchName, includesVi, money } from '../lib/format';
import { scoped } from '../lib/scope';
import { DataTable, Panel, Toolbar } from '../components/ui';

export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <label className="search-box">
      <i className="bi bi-search" />
      <input type="search" placeholder={placeholder} value={value} aria-label={label} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

export function Customers() {
  const { data } = useStore();
  const [search, setSearch] = useState('');
  const list = useMemo(() => {
    const unique = new Map<string, { name: string; phone: string; count: number; total: number; branches: Set<string> }>();
    scoped(data, data.bookings).forEach(b => {
      const key = b.phone.replace(/\D/g, '');
      const c = unique.get(key) || { name: b.customer, phone: b.phone, count: 0, total: 0, branches: new Set<string>() };
      c.count++; c.total += b.amount; c.branches.add(branchName(b.branchId));
      unique.set(key, c);
    });
    return [...unique.values()].filter(c => includesVi(`${c.name} ${c.phone}`, search));
  }, [data, search]);

  return (
    <>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên hoặc số điện thoại..." label="Tìm khách hàng" />
        <span className="text-muted small">{list.length} khách hàng</span>
      </Toolbar>
      <Panel title="Danh sách khách hàng" subtitle="Tổng hợp từ các đặt phòng trong bản demo">
        <DataTable headers={['KHÁCH HÀNG', 'SỐ ĐIỆN THOẠI', 'CHI NHÁNH', 'LƯỢT ĐẶT', 'TỔNG GIÁ TRỊ']}>
          {list.map(c => (
            <tr key={c.phone}>
              <td><strong>{c.name}</strong></td><td>{c.phone}</td><td>{[...c.branches].join(', ')}</td><td>{c.count}</td><td><strong>{money(c.total)}</strong></td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
