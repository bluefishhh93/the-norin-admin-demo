import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field, Select } from '../../components/Form';
import { branchName } from '../../lib/format';
import { isAllowedBranch } from '../../lib/scope';
import { BranchDevices, readIntegrations } from '../branches/BranchDevices';
import { BranchQr } from '../rooms/RoomQr';
import type { PageProps } from '../index';
import { DataTable, Panel, Pill, TextLink } from '../../components/ui';

export function BranchSettings({ navigate }: PageProps) {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const allowed = (id: string) => isAllowedBranch(data, id);
  const list = data.branches.filter(
    (b) => allowed(b.id) && (data.branchId === 'all' || b.id === data.branchId)
  );

  const edit = (id: string) => {
    const i = data.branchInfo[id];
    if (!i || !allowed(id)) return;
    modal.openForm({
      title: `Thông tin · ${branchName(data, id)}`,
      size: 'lg',
      submitLabel: 'Lưu',
      body: (
        <div className="row g-3">
          <div className="col-sm-6">
            <Field
              label="Hotline"
              name="hotline"
              type="tel"
              defaultValue={i.hotline}
              required
              maxLength={20}
            />
          </div>
          <div className="col-sm-6">
            <Select
              label="Nhận đặt phòng online"
              name="enableOnlineBooking"
              options={[
                ['true', 'Mở'],
                ['false', 'Tạm tắt']
              ]}
              defaultValue={String(i.enableOnlineBooking)}
            />
          </div>
          <div className="col-sm-4">
            <Field
              label="Vĩ độ"
              name="latitude"
              type="number"
              step="0.000001"
              min={-90}
              max={90}
              defaultValue={i.latitude}
              required
            />
          </div>
          <div className="col-sm-4">
            <Field
              label="Kinh độ"
              name="longitude"
              type="number"
              step="0.000001"
              min={-180}
              max={180}
              defaultValue={i.longitude}
              required
            />
          </div>
          <div className="col-sm-4">
            <Field
              label="Bán kính (m)"
              name="geofenceRadiusM"
              type="number"
              min={20}
              max={2000}
              defaultValue={i.geofenceRadiusM}
              required
            />
          </div>
          <div className="col-12">
            <Field
              label="HiChat/Zalo webhook URL"
              name="hichatUrl"
              type="url"
              placeholder="https://..."
              defaultValue={i.hichatUrl}
            />
          </div>
          <div className="col-12">
            <Field
              label="HiChat token"
              name="hichatToken"
              type="password"
              autoComplete="off"
              defaultValue={i.hichatToken}
            />
          </div>
        </div>
      ),
      onSubmit: (v) => {
        update((d) => {
          Object.assign(d.branchInfo[id], {
            hotline: v.hotline,
            hichatUrl: v.hichatUrl,
            hichatToken: v.hichatToken,
            enableOnlineBooking: v.enableOnlineBooking === 'true',
            latitude: +v.latitude,
            longitude: +v.longitude,
            geofenceRadiusM: +v.geofenceRadiusM
          });
        });
        toast('Đã lưu thông tin chi nhánh.');
      }
    });
  };

  const devices = (id: string) => {
    const branch = data.branches.find(b => b.id === id)!;
    modal.openForm({
      title: `Thiết bị & kết nối · ${branch.name}`, size: 'lg', submitLabel: 'Lưu cài đặt',
      body: <BranchDevices branch={branch} info={data.branchInfo[id]} kiosks={data.kiosks.filter(k => k.branchId === id)} onKiosks={() => { modal.close(); navigate('kiosks'); }} />,
      onSubmit: v => {
        update(d => {
          d.branches.find(b => b.id === id)!.integrations = readIntegrations(v);
          Object.assign(d.branchInfo[id], { hichatUrl: v.hichatUrl.trim(), hichatToken: v.hichatToken.trim() });
        });
        toast('Đã lưu kết nối của chi nhánh.');
      }
    });
  };

  return (
    <Panel
      title="Thông tin chi nhánh"
      subtitle="Hotline, đặt online, vị trí cho QR phòng và kênh nhận thông báo"
    >
      <DataTable
        headers={[
          'CHI NHÁNH',
          'HOTLINE',
          'ĐẶT ONLINE',
          'VỊ TRÍ / BÁN KÍNH',
          'KÊNH THÔNG BÁO',
          'THAO TÁC'
        ]}
      >
        {list.map((b) => {
          const i = data.branchInfo[b.id];
          if (!i) return null;
          return (
            <tr key={b.id}>
              <td>
                <strong>{b.name}</strong>
                <small>{b.address}</small>
              </td>
              <td>{i.hotline}</td>
              <td>
                {i.enableOnlineBooking ? (
                  <Pill status="available" label="Đang mở" />
                ) : (
                  <Pill status="cleaning" label="Tạm tắt" />
                )}
              </td>
              <td>
                {i.latitude}, {i.longitude}
                <small>Bán kính {i.geofenceRadiusM} m</small>
              </td>
              <td>
                {i.hichatUrl ? (
                  <Pill status="available" label="Đã cấu hình" />
                ) : (
                  <>
                    <Pill status="cleaning" label="Chưa cấu hình" />
                    <small>Kiosk/tablet sẽ báo lỗi khi gửi yêu cầu</small>
                  </>
                )}
              </td>
              <td>
                <div className="d-flex gap-2 flex-wrap"><TextLink onClick={() => edit(b.id)}>Sửa thông tin</TextLink><TextLink onClick={() => devices(b.id)}>Thiết bị & kết nối</TextLink><TextLink onClick={() => modal.openInfo({ title: `QR phòng · ${b.name}`, size: 'lg', body: <BranchQr branchId={b.id} /> })}>QR phòng</TextLink></div>
              </td>
            </tr>
          );
        })}
      </DataTable>
    </Panel>
  );
}
