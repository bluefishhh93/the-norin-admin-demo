import { useState } from 'react';
import type { Branch, BranchInfo } from '../types';
import { Field } from '../components/Form';

type GeoState = { status: 'idle' | 'loading' | 'error' | 'done'; text?: string };

const GEO_ERRORS: Record<number, string> = {
  1: 'Trình duyệt chưa cho phép truy cập vị trí. Bật quyền vị trí rồi thử lại.',
  2: 'Không xác định được vị trí hiện tại.',
  3: 'Lấy vị trí quá thời gian chờ. Thử lại.'
};

export const randomPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const nums = crypto.getRandomValues(new Uint32Array(10));
  return `${Array.from(nums, n => chars[n % chars.length]).join('')}@${nums[0] % 90 + 10}`;
};

export function BranchForm({ branch, info }: { branch?: Branch; info?: BranchInfo }) {
  const [lat, setLat] = useState(info?.latitude != null ? String(info.latitude) : '');
  const [lng, setLng] = useState(info?.longitude != null ? String(info.longitude) : '');
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' });
  const [password, setPassword] = useState(branch?.account?.password ?? (branch ? '' : randomPassword()));
  const [showPass, setShowPass] = useState(!branch);

  const useCurrent = () => {
    if (!('geolocation' in navigator)) { setGeo({ status: 'error', text: 'Trình duyệt không hỗ trợ lấy vị trí.' }); return; }
    setGeo({ status: 'loading' });
    navigator.geolocation.getCurrentPosition(
      p => {
        setLat(p.coords.latitude.toFixed(6));
        setLng(p.coords.longitude.toFixed(6));
        setGeo({ status: 'done', text: `Đã lấy vị trí hiện tại · sai số khoảng ${Math.round(p.coords.accuracy)} m` });
      },
      e => setGeo({ status: 'error', text: GEO_ERRORS[e.code] ?? 'Không lấy được vị trí.' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  return (
    <div className="branch-form">
      <section className="branch-form-section">
        <h3>Thông tin chi nhánh</h3>
        <div className="row g-3">
          <div className="col-12"><Field label="Tên chi nhánh" name="name" defaultValue={branch?.name ?? ''} required maxLength={80} placeholder="The Norin Sơn Trà" /></div>
          <div className="col-12"><Field label="Địa chỉ" name="address" defaultValue={branch?.address ?? ''} required maxLength={200} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" /></div>
          <div className="col-sm-6"><Field label="Hotline" name="hotline" type="tel" defaultValue={info?.hotline ?? ''} required maxLength={20} placeholder="0236 3888 001" /></div>
          <div className="col-sm-6"><Field label="ID chi nhánh" name="kiotvietId" type="number" min={1} defaultValue={branch?.kiotvietId ?? ''} placeholder="9047" /></div>
        </div>
      </section>

      <section className="branch-form-section">
        <div className="branch-form-head">
          <div><h3>Tọa độ chi nhánh</h3><p>Dùng cho QR phòng và kiểm tra khách có đang ở chi nhánh (geofence).</p></div>
          <button type="button" className="btn btn-light btn-sm branch-geo-btn" onClick={useCurrent} disabled={geo.status === 'loading'}>
            {geo.status === 'loading' ? <span className="spinner-border spinner-border-sm" aria-hidden /> : <i className="bi bi-crosshair" />}
            {geo.status === 'loading' ? 'Đang lấy vị trí...' : 'Dùng vị trí hiện tại'}
          </button>
        </div>
        <div className="row g-3">
          <div className="col-sm-4"><Field label="Vĩ độ (latitude)" name="latitude" type="number" step="0.000001" min={-90} max={90} required value={lat} onChange={e => setLat(e.target.value)} placeholder="16.086100" /></div>
          <div className="col-sm-4"><Field label="Kinh độ (longitude)" name="longitude" type="number" step="0.000001" min={-180} max={180} required value={lng} onChange={e => setLng(e.target.value)} placeholder="108.243700" /></div>
          <div className="col-sm-4"><Field label="Bán kính (m)" name="geofenceRadiusM" type="number" min={20} max={2000} required defaultValue={info?.geofenceRadiusM ?? 150} /></div>
        </div>
        {geo.text && <p className={`branch-geo-msg ${geo.status}`} role="status"><i className={`bi ${geo.status === 'error' ? 'bi-exclamation-circle' : 'bi-check-circle'}`} /> {geo.text}</p>}
      </section>

      <section className="branch-form-section last">
        <h3>Tài khoản quản lý chi nhánh</h3>
        <p className="branch-form-sub">Tài khoản đăng nhập admin của chi nhánh. Có thể đổi tên đăng nhập và mật khẩu bất cứ lúc nào.</p>
        <div className="row g-3">
          <div className="col-sm-6"><Field label="Tên đăng nhập" name="username" defaultValue={branch?.account?.username ?? ''} required pattern="[a-z0-9_.]{3,30}" maxLength={30} autoComplete="off" placeholder="norin.sontra" title="3–30 ký tự: chữ thường, số, dấu chấm hoặc gạch dưới" /></div>
          <div className="col-sm-6">
            <label className="form-label d-block">Mật khẩu
              <div className="branch-pass mt-1">
                <input className="form-control" name="password" type={showPass ? 'text' : 'password'} required minLength={8} maxLength={64} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="branch-pass-btn" aria-label={showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPass(s => !s)}><i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`} /></button>
                <button type="button" className="branch-pass-btn" aria-label="Tạo mật khẩu ngẫu nhiên" title="Tạo mật khẩu ngẫu nhiên" onClick={() => { setPassword(randomPassword()); setShowPass(true); }}><i className="bi bi-arrow-repeat" /></button>
              </div>
              <small className="text-muted">Tối thiểu 8 ký tự.</small>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
