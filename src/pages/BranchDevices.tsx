import { useState } from 'react';
import type { Branch, BranchInfo, BranchIntegrations, IntegrationKey, Kiosk } from '../types';

type FieldDef = [name: string, label: string, secret?: boolean, placeholder?: string];
type Def = { key: IntegrationKey; icon: string; title: string; detail: string; fields: FieldDef[] };

export const INTEGRATIONS: Def[] = [
  { key: 'ttlock', icon: 'bi-key', title: 'TTLock', detail: 'Khóa cửa phòng, gateway và mã mở cửa cho khách.', fields: [
    ['clientId', 'Client ID'], ['clientSecret', 'Client Secret', true], ['username', 'Tài khoản TTLock', false, 'ttlock@norin.vn'], ['password', 'Mật khẩu TTLock', true]
  ] },
  { key: 'vnpay', icon: 'bi-credit-card', title: 'VNPay online', detail: 'Thanh toán đặt phòng trên web/kiosk qua cổng VNPay.', fields: [
    ['tmnCode', 'Mã website (TMN Code)'], ['hashSecret', 'Hash Secret', true]
  ] },
  { key: 'spos', icon: 'bi-phone', title: 'VNPay SmartPOS', detail: 'Máy POS quẹt thẻ tại quầy và kiosk của chi nhánh.', fields: [
    ['merchantCode', 'Merchant Code'], ['terminalId', 'Terminal ID', false, 'SPOS-1'], ['initSecret', 'Init Secret', true], ['ipnSecret', 'IPN Secret', true]
  ] }
];

export const integrationCount = (b: Branch, info?: BranchInfo) =>
  INTEGRATIONS.filter(d => b.integrations?.[d.key]?.enabled).length + (info?.hichatUrl ? 1 : 0);

export const readIntegrations = (v: Record<string, string>): BranchIntegrations => Object.fromEntries(INTEGRATIONS.map(d => [d.key, {
  enabled: v[`${d.key}.enabled`] === 'on',
  ...Object.fromEntries(d.fields.map(([n]) => [n, (v[`${d.key}.${n}`] ?? '').trim()]))
}]));

function Secret({ name, defaultValue, placeholder }: { name: string; defaultValue: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="branch-pass mt-1">
      <input className="form-control" name={name} type={show ? 'text' : 'password'} autoComplete="off" defaultValue={defaultValue} placeholder={placeholder} />
      <button type="button" className="branch-pass-btn" aria-label={show ? 'Ẩn' : 'Hiện'} onClick={() => setShow(s => !s)}><i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`} /></button>
    </div>
  );
}

function Block({ def, value }: { def: Def; value?: Record<string, string | boolean> }) {
  const [on, setOn] = useState(Boolean(value?.enabled));
  return (
    <section className={`dev-block${on ? ' on' : ''}`}>
      <label className="dev-head">
        <span className="dev-icon"><i className={`bi ${def.icon}`} /></span>
        <span className="dev-text"><strong>{def.title}</strong><small>{def.detail}</small></span>
        <span className="form-check form-switch m-0">
          <input className="form-check-input" type="checkbox" role="switch" name={`${def.key}.enabled`} checked={on} onChange={e => setOn(e.target.checked)} aria-label={`Bật ${def.title}`} />
        </span>
      </label>
      <div className="dev-body" hidden={!on}>
        <div className="row g-3">
          {def.fields.map(([n, label, secret, ph]) => (
            <div className="col-sm-6" key={n}>
              <label className="form-label d-block">{label}
                {secret
                  ? <Secret name={`${def.key}.${n}`} defaultValue={String(value?.[n] ?? '')} placeholder={ph} />
                  : <input className="form-control mt-1" name={`${def.key}.${n}`} defaultValue={String(value?.[n] ?? '')} placeholder={ph} autoComplete="off" required={on && n !== 'terminalId'} />}
              </label>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BranchDevices({ branch, info, kiosks, onKiosks }: { branch: Branch; info?: BranchInfo; kiosks: Kiosk[]; onKiosks: () => void }) {
  return (
    <div className="dev-list">
      {INTEGRATIONS.map(d => <Block key={d.key} def={d} value={branch.integrations?.[d.key]} />)}

      <section className="dev-block on">
        <div className="dev-head">
          <span className="dev-icon"><i className="bi bi-bell" /></span>
          <span className="dev-text"><strong>Thông báo vận hành (HiChat/Zalo)</strong><small>Gọi hỗ trợ, gọi thêm sản phẩm, camera nghi vấn, cảnh báo phòng.</small></span>
        </div>
        <div className="dev-body">
          <div className="row g-3">
            <div className="col-sm-6"><label className="form-label d-block">Webhook URL<input className="form-control mt-1" name="hichatUrl" type="url" placeholder="https://..." defaultValue={info?.hichatUrl ?? ''} /></label></div>
            <div className="col-sm-6"><label className="form-label d-block">Token<Secret name="hichatToken" defaultValue={info?.hichatToken ?? ''} /></label></div>
          </div>
        </div>
      </section>

      <section className="dev-block on">
        <div className="dev-head">
          <span className="dev-icon"><i className="bi bi-display" /></span>
          <span className="dev-text"><strong>Thiết bị kiosk</strong><small>{kiosks.length ? kiosks.map(k => `${k.name} · ${k.terminal}${k.agentOnline ? '' : ' (mất kết nối)'}`).join(', ') : 'Chưa có kiosk nào gắn với chi nhánh này.'}</small></span>
          <button type="button" className="text-link" onClick={onKiosks}>Quản lý <i className="bi bi-arrow-right" /></button>
        </div>
      </section>
    </div>
  );
}
