import { useStore } from '../../store';
import { branchName, fmtDateTime } from '../../lib/format';
import { scoped } from '../../lib/scope';
import { DataTable, Panel } from '../../components/ui';

export function Notifications() {
  const { data } = useStore();
  return (
    <Panel title="Nhật ký thông báo HiChat / Zalo" subtitle="Sự kiện được tạo trong bản demo, chưa gửi tin thật">
      <DataTable headers={['THỜI GIAN', 'CHI NHÁNH', 'BOOKING', 'NỘI DUNG']}>
        {scoped(data, data.notifications).map((n, i) => (
          <tr key={i}><td>{fmtDateTime(n.at)}</td><td>{branchName(n.branchId)}</td><td>{n.code}</td><td>{n.text}</td></tr>
        ))}
      </DataTable>
    </Panel>
  );
}
