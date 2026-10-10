import { useState } from 'react';
import type { DemoData, PriceType, Room, RoomPrice, Season } from '../../types';
import { Field, MoneyField, Select } from '../../components/Form';
import { moneyComma as money } from '../../lib/format';
import { applySeason, roomRate } from '../../lib/rooms';

export const WEEKDAYS: [string, string][] = [['1', 'Thứ 2'], ['2', 'Thứ 3'], ['3', 'Thứ 4'], ['4', 'Thứ 5'], ['5', 'Thứ 6'], ['6', 'Thứ 7'], ['0', 'Chủ nhật']];

const num = (v: string) => Math.max(0, Number(v) || 0);

export function RateFields({ type, rate, seasons }: { type: PriceType; rate: RoomPrice; seasons: Season[] }) {
  const initial = type === 'Giờ' ? rate.hourly : type === 'Qua đêm' ? rate.overnight : rate.daily;
  const [base, setBase] = useState(String(initial));
  const [extra, setExtra] = useState(String(rate.extra));
  const b = num(base), e = num(extra);
  const hourly = type === 'Giờ';

  return (
    <>
      {hourly ? (
        <div className="price-inputs">
          <MoneyField label="Giá 2 tiếng đầu (₫)" name="base" value={base} onChange={setBase} required />
          <MoneyField label="Mỗi tiếng thêm (₫)" name="extra" value={extra} onChange={setExtra} required />
        </div>
      ) : (
        <MoneyField label={type === 'Qua đêm' ? 'Giá qua đêm (₫)' : 'Giá theo ngày (₫)'} name="base" value={base} onChange={setBase} required />
      )}
      {hourly && (
        <div className="price-preview">
          {[3, 4, 5, 6, 7, 8].map(h => (
            <div key={h} className="price-preview-card">
              <span>{h} tiếng</span>
              <strong>{money(b + (h - 2) * e)}</strong>
            </div>
          ))}
        </div>
      )}
      <fieldset className="rate-step">
        <legend>Giá theo thứ (để trống = giá chung)</legend>
        <div className="price-weekdays">
          {WEEKDAYS.map(([day, label]) => (
            <MoneyField key={day} label={label} name={`weekday${day}`} placeholder={money(b)} defaultValue={rate.weekdayRates?.[type]?.[day] ?? ''} />
          ))}
        </div>
      </fieldset>
      {seasons.length > 0 && (
        <fieldset className="rate-step">
          <legend>Ngày lễ áp dụng cho phòng này</legend>
          {seasons.map(s => (
            <div key={s.id} className="price-season-row">
              <span><strong>{s.name}</strong> · {s.from} → {s.to}</span>
              <strong>{money(applySeason(b, s))}{hourly ? ` · +${money(applySeason(e, s))}/tiếng` : ''}</strong>
            </div>
          ))}
        </fieldset>
      )}
    </>
  );
}

export function HolidayFields({ data, branchOpts, branchId: initialBranch, season }: { data: DemoData; branchOpts: [string, string][]; branchId: string; season?: Season }) {
  const [branchId, setBranchId] = useState(season?.branchId ?? initialBranch);
  const [mode, setMode] = useState<Season['mode']>(season?.mode ?? 'percent');
  const [value, setValue] = useState(String(season?.value ?? 20));
  const rooms: Room[] = data.rooms.filter(r => r.branchId === branchId).sort((a, b) => a.number.localeCompare(b.number));
  const [picked, setPicked] = useState<string[]>(season?.rooms ?? rooms.map(r => r.number));
  const allPicked = rooms.length > 0 && rooms.every(r => picked.includes(r.number));
  const toggle = (n: string) => setPicked(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n]);
  const v = Number(value) || 0;

  return (
    <>
      <Field label="Tên dịp" name="name" maxLength={60} placeholder="VD: Lễ 2/9, Tết Dương lịch" defaultValue={season?.name ?? ''} required />
      <div className="price-inputs">
        <Select label="Chi nhánh" name="branchId" options={branchOpts} value={branchId} onChange={e => { setBranchId(e.target.value); setPicked(data.rooms.filter(r => r.branchId === e.target.value).map(r => r.number)); }} required />
        <Select label="Cách tăng giá" name="mode" options={[['percent', 'Tăng theo %'], ['amount', 'Cộng thêm số tiền']]} value={mode} onChange={e => { const m = e.target.value as Season['mode']; setMode(m); setValue(m === 'percent' ? '20' : '100000'); }} />
      </div>
      <div className="price-inputs">
        <Field label="Từ ngày" name="from" type="date" defaultValue={season?.from} required />
        <Field label="Đến ngày" name="to" type="date" defaultValue={season?.to} required />
      </div>
      {mode === 'percent'
        ? <Field label="Tăng thêm (%)" name="value" type="number" min={-90} step={1} value={value} onChange={e => setValue(e.target.value)} required />
        : <MoneyField label="Cộng thêm mỗi lượt (₫)" name="value" value={value} onChange={setValue} required />}
      <fieldset className="rate-step">
        <legend>Phòng áp dụng ({picked.filter(n => rooms.some(r => r.number === n)).length}/{rooms.length})</legend>
        <label className="price-room-all"><input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? [] : rooms.map(r => r.number))} /> Chọn tất cả</label>
        <div className="price-room-picks">
          {rooms.map(r => {
            const rate = roomRate(data, r)?.hourly;
            return (
              <label key={r.number} className={picked.includes(r.number) ? 'active' : ''}>
                <input type="checkbox" name="rooms" value={r.number} checked={picked.includes(r.number)} onChange={() => toggle(r.number)} />
                <strong>Phòng {r.number}</strong>
                {rate != null && <small>{money(rate)} → {money(applySeason(rate, { mode, value: v } as Season))}</small>}
              </label>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}
