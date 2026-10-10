import { useState } from 'react';
import type { PageProps } from '../index';
import type { Branch } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Pill, PrimaryButton, Toolbar } from '../../components/ui';
import { BranchForm } from './BranchForm';
import { BranchDevices, integrationCount, readIntegrations } from './BranchDevices';
import { BranchQr } from '../rooms/RoomQr';

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24) || 'branch';

function AccountRow({ branch }: { branch: Branch }) {
  const { toast } = useStore();
  const [show, setShow] = useState(false);
  const acc = branch.account;
  if (!acc)
    return (
      <div className="branch-account empty">
        <i className="bi bi-person-x" /> Chưa có tài khoản
      </div>
    );
  const copy = (text: string, label: string) =>
    navigator.clipboard?.writeText(text).then(
      () => toast(`Đã sao chép ${label}.`),
      () => toast('Không sao chép được.')
    );
  return (
    <div className="branch-account">
      <div>
        <span>Tài khoản</span>
        <strong>{acc.username}</strong>
        <button
          type="button"
          aria-label="Sao chép tên đăng nhập"
          onClick={() => copy(acc.username, 'tên đăng nhập')}
        >
          <i className="bi bi-copy" />
        </button>
      </div>
      <div>
        <span>Mật khẩu</span>
        <strong className="mono">
          {show ? acc.password : '•'.repeat(Math.min(acc.password.length, 10))}
        </strong>
        <button
          type="button"
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          onClick={() => setShow((s) => !s)}
        >
          <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`} />
        </button>
        <button
          type="button"
          aria-label="Sao chép mật khẩu"
          onClick={() => copy(acc.password, 'mật khẩu')}
        >
          <i className="bi bi-copy" />
        </button>
      </div>
    </div>
  );
}

export function Branches({ navigate }: PageProps) {
  const { data, update, toast } = useStore();
  const modal = useModal();

  const open = (b?: Branch) =>
    modal.openForm({
      title: b ? `Sửa · ${b.name}` : 'Tạo chi nhánh',
      size: 'lg',
      submitLabel: b ? 'Lưu thay đổi' : 'Tạo chi nhánh',
      body: <BranchForm branch={b} info={b ? data.branchInfo[b.id] : undefined} />,
      onSubmit: (v) => {
        const name = v.name.trim();
        const username = v.username.trim().toLowerCase();
        const kiotvietId = v.kiotvietId ? Number(v.kiotvietId) : null;
        const others = data.branches.filter((x) => x.id !== b?.id);
        if (others.some((x) => x.name.trim().toLowerCase() === name.toLowerCase())) {
          toast('Tên chi nhánh đã tồn tại.');
          return false;
        }
        if (
          others.some((x) => x.account?.username === username) ||
          data.staff.some((s) => s.username === username)
        ) {
          toast('Tên đăng nhập đã được dùng.');
          return false;
        }
        if (kiotvietId && others.some((x) => x.kiotvietId === kiotvietId)) {
          toast('ID chi nhánh đã gắn với chi nhánh khác.');
          return false;
        }
        const lat = Number(v.latitude),
          lng = Number(v.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          toast('Tọa độ không hợp lệ.');
          return false;
        }

        update((d) => {
          const short = name.replace(/^the\s+norin\s+/i, '').trim() || name;
          const fields = {
            name,
            short,
            address: v.address.trim(),
            kiotvietId,
            account: { username, password: v.password }
          };
          const info = {
            hotline: v.hotline.trim(),
            latitude: lat,
            longitude: lng,
            geofenceRadiusM: Number(v.geofenceRadiusM)
          };
          if (b) {
            const t = d.branches.find((x) => x.id === b.id);
            if (t) Object.assign(t, fields);
            d.branchInfo[b.id] = { ...d.branchInfo[b.id], ...info };
          } else {
            let id = slug(short);
            while (d.branches.some((x) => x.id === id))
              id = `${id}${Math.floor(Math.random() * 90 + 10)}`;
            d.branches.push({ id, ...fields, active: true, createdAt: new Date().toISOString() });
            d.branchInfo[id] = {
              hichatUrl: '',
              hichatToken: '',
              enableOnlineBooking: true,
              ...info
            };
          }
        });
        toast(b ? 'Đã lưu chi nhánh.' : 'Đã tạo chi nhánh mới.');
      }
    });

  const devices = (b: Branch) =>
    modal.openForm({
      title: `Thiết bị & kết nối · ${b.name}`,
      size: 'lg',
      submitLabel: 'Lưu cài đặt',
      body: (
        <BranchDevices
          branch={b}
          info={data.branchInfo[b.id]}
          kiosks={data.kiosks.filter((k) => k.branchId === b.id)}
          onKiosks={() => {
            modal.close();
            update((d) => {
              d.branchId = b.id;
            });
            navigate('kiosks');
          }}
        />
      ),
      onSubmit: (v) => {
        update((d) => {
          const t = d.branches.find((x) => x.id === b.id);
          if (t) t.integrations = readIntegrations(v);
          if (d.branchInfo[b.id])
            Object.assign(d.branchInfo[b.id], {
              hichatUrl: v.hichatUrl.trim(),
              hichatToken: v.hichatToken.trim()
            });
        });
        toast(`Đã lưu thiết bị & kết nối cho ${b.name}.`);
      }
    });

  const qr = (b: Branch) =>
    modal.openInfo({
      title: `QR phòng · ${b.name}`,
      size: 'lg',
      body: <BranchQr branchId={b.id} />
    });

  const setActive = (b: Branch, value: boolean) => {
    update((d) => {
      const t = d.branches.find((x) => x.id === b.id);
      if (t) t.active = value;
    });
    toast(value ? `${b.name} đã hoạt động lại.` : `Đã dừng hoạt động ${b.name}.`);
  };

  const toggleActive = (b: Branch) => {
    if (b.active === false) {
      setActive(b, true);
      return;
    }
    modal.openForm({
      title: `Dừng hoạt động · ${b.name}`,
      submitLabel: 'Dừng hoạt động',
      body: (
        <p className="mb-0">
          Chi nhánh sẽ chuyển sang trạng thái <strong>Dừng hoạt động</strong>. Bạn có thể bật lại
          bất cứ lúc nào.
        </p>
      ),
      onSubmit: () => setActive(b, false)
    });
  };

  return (
    <>
      <Toolbar>
        <span className="text-muted small">
          {data.branches.length} chi nhánh · tạo, sửa tọa độ và tài khoản quản lý
        </span>
        <PrimaryButton icon="bi-plus-lg" onClick={() => open()}>
          Tạo chi nhánh
        </PrimaryButton>
      </Toolbar>
      <div className="page-grid">
        {data.branches.map((b) => {
          const info = data.branchInfo[b.id];
          const connected = integrationCount(b, info);
          const kioskCount = data.kiosks.filter((k) => k.branchId === b.id).length;
          const qrCount = new Set(
            data.rooms
              .filter((r) => r.branchId === b.id && Number(r.masterProductId) > 0)
              .map((r) => r.masterProductId)
          ).size;
          const active = b.active ?? true;
          return (
            <article className={`card branch-card${active ? '' : ' inactive'}`} key={b.id}>
              <div className="branch-card-top">
                <span className="branch-symbol">
                  <i className="bi bi-building" />
                </span>
                <div className="d-flex align-items-center gap-2">
                  {active ? (
                    <Pill status="available" label="Hoạt động" />
                  ) : (
                    <Pill status="cleaning" label="Dừng hoạt động" />
                  )}
                  <button
                    type="button"
                    className="branch-icon-btn"
                    aria-label={`Sửa ${b.name}`}
                    onClick={() => open(b)}
                  >
                    <i className="bi bi-pencil" />
                  </button>
                </div>
              </div>
              <h3>{b.name}</h3>
              <p>
                <i className="bi bi-geo-alt" /> {b.address}
              </p>
              <dl className="branch-meta">
                <div>
                  <dt>Hotline</dt>
                  <dd>{info?.hotline || '—'}</dd>
                </div>
                <div>
                  <dt>ID chi nhánh</dt>
                  <dd>{b.kiotvietId ?? '—'}</dd>
                </div>
                <div className="wide">
                  <dt>Tọa độ</dt>
                  <dd>
                    {info ? (
                      <a
                        href={`https://www.google.com/maps?q=${info.latitude},${info.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {info.latitude}, {info.longitude}
                      </a>
                    ) : (
                      '—'
                    )}
                    {info && <small> · {info.geofenceRadiusM} m</small>}
                  </dd>
                </div>
              </dl>
              <AccountRow branch={b} />
              <div className="branch-links">
                <button type="button" className="branch-devices" onClick={() => devices(b)}>
                  <i className="bi bi-plug" />
                  <span>
                    <strong>Thiết bị & kết nối</strong>
                    <small>
                      {connected ? `${connected} kết nối đang bật` : 'Chưa cấu hình'} · {kioskCount}{' '}
                      kiosk
                    </small>
                  </span>
                  <i className="bi bi-chevron-right" />
                </button>
                <button type="button" className="branch-devices" onClick={() => qr(b)}>
                  <i className="bi bi-qr-code" />
                  <span>
                    <strong>QR phòng</strong>
                    <small>{qrCount} phòng có Room ID</small>
                  </span>
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
              <div className="branch-card-actions">
                <button
                  className="text-link"
                  type="button"
                  onClick={() => {
                    update((d) => {
                      d.branchId = b.id;
                    });
                    navigate('dashboard');
                  }}
                >
                  Xem chi nhánh <i className="bi bi-arrow-right" />
                </button>
                <button
                  className={`text-link ${active ? 'danger' : ''}`}
                  type="button"
                  onClick={() => toggleActive(b)}
                >
                  <i className={`bi ${active ? 'bi-stop-circle' : 'bi-play-circle'}`} />{' '}
                  {active ? 'Dừng hoạt động' : 'Hoạt động lại'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
