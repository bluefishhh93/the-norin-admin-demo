import { useState } from 'react';
import type { Pricebook, PriceType } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field, Select } from '../../components/Form';
import { branches } from '../../seed/base';
import { branchName, money, moneyOrDash } from '../../lib/format';
import { defaultBranch, isAllowedBranch } from '../../lib/scope';
import { priceValue } from '../../lib/rooms';
import { DataTable, Panel, PrimaryButton, ScopeNote, Tabs, TextLink } from '../../components/ui';

const PRICE_TYPES: PriceType[] = ['Ngày đêm', 'Qua đêm', 'Giờ'];
const WEEKDAYS: [string, string][] = [['0', 'Chủ nhật'], ['1', 'Thứ 2'], ['2', 'Thứ 3'], ['3', 'Thứ 4'], ['4', 'Thứ 5'], ['5', 'Thứ 6'], ['6', 'Thứ 7']];

export function Pricing() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const [tab, setTab] = useState<PriceType>('Giờ');
  const inScope = (branchId: string) => data.role === 'superadmin' ? data.branchId === 'all' || data.branchId === branchId : branchId === 'sontra';
  const prices = data.pricebooks.filter(p => inScope(p.branchId));
  const seasons = data.season.filter(s => inScope(s.branchId));

  const editRate = (p: Pricebook) => {
    if (!isAllowedBranch(data, p.branchId)) return;
    const type = tab;
    const base = p.hourlySteps[0]?.price ?? p.hourly;
    const extra = p.hourlySteps[1]?.price ?? 0;
    modal.openForm({
      title: `${type} · ${p.category} · ${branchName(p.branchId)}`, size: 'lg',
      body: <>
        {type === 'Giờ' ? <>
          <ScopeNote icon={null}>Tối thiểu 2 tiếng, tối đa 8 tiếng. Giá 2 tiếng đầu + một mức cố định cho mỗi tiếng thêm (tối đa 6 tiếng).</ScopeNote>
          <Field label="Giá 2 tiếng đầu (₫)" name="baseHourly" type="number" min={0} defaultValue={base} required />
          <Field label="Mỗi tiếng thêm (₫)" name="extraHourly" type="number" min={0} defaultValue={extra} required />
          <ScopeNote icon={null}>Xem trước: {Array.from({ length: 7 }, (_, i) => `${i + 2} giờ: ${money(base + i * extra)}`).join(' · ')}</ScopeNote>
        </> : <Field label="Giá chung (₫)" name="basePrice" type="number" min={0} defaultValue={priceValue(p, type)} required />}
        <fieldset className="rate-step">
          <legend>Giá theo thứ trong tuần (để trống = giá chung)</legend>
          {WEEKDAYS.map(([day, label]) => <Field key={day} label={label} name={`weekday${day}`} type="number" min={0} placeholder="Theo giá chung" defaultValue={p.weekdayRates?.[type]?.[day] ?? ''} />)}
        </fieldset>
      </>,
      onSubmit: v => {
        update(d => {
          const t = d.pricebooks.find(x => x.branchId === p.branchId && x.category === p.category);
          if (!t) return;
          if (type === 'Giờ') {
            t.hourly = +v.baseHourly;
            t.hourlySteps = [{ fromThHour: 1, toHour: 2, price: +v.baseHourly, type: 'block' }, { fromThHour: 3, toHour: 8, price: +v.extraHourly, type: 'hourly' }];
          } else if (type === 'Qua đêm') t.overnight = +v.basePrice;
          else t.daily = +v.basePrice;
          t.weekdayRates ||= {};
          t.weekdayRates[type] = Object.fromEntries(WEEKDAYS.map(([day]) => [day, v[`weekday${day}`]]).filter(([, price]) => price !== '').map(([day, price]) => [day, +price]));
        });
        toast('Đã lưu thay đổi trong bản demo.');
      }
    });
  };

  const addSeason = () => {
    const categories = [...new Set(prices.map(p => p.category))];
    const branchOpts = (data.role === 'superadmin' ? branches : branches.filter(b => b.id === 'sontra')).map(b => [b.id, b.name] as [string, string]);
    modal.openForm({
      title: 'Giá mùa, dịp lễ',
      body: <>
        <Select label="Chi nhánh" name="branchId" options={branchOpts} defaultValue={defaultBranch(data)} required />
        <Select label="Hạng phòng" name="category" options={categories.map(c => [c, c])} required />
        <Select label="Loại giá" name="type" options={PRICE_TYPES.map(t => [t, t])} defaultValue={tab} required />
        <Field label="Từ ngày" name="from" type="date" required />
        <Field label="Đến ngày" name="to" type="date" required />
        <Field label="Giá (₫)" name="price" type="number" min={0} required />
      </>,
      onSubmit: v => {
        if (!isAllowedBranch(data, v.branchId) || v.from > v.to || !data.pricebooks.some(p => p.branchId === v.branchId && p.category === v.category)) {
          toast('Kiểm tra chi nhánh, hạng và khoảng ngày.'); return false;
        }
        update(d => { d.season.push({ branchId: v.branchId, category: v.category, type: v.type as PriceType, from: v.from, to: v.to, price: +v.price }); });
        toast('Đã lưu thay đổi trong bản demo.');
      }
    });
  };

  return (
    <>
      <div className="reception-toolbar">
        <Tabs items={PRICE_TYPES} value={tab} onChange={setTab} />
        <PrimaryButton icon="bi-calendar-event" onClick={addSeason}>Mùa, dịp lễ</PrimaryButton>
      </div>
      <ScopeNote>Theo giờ: 2 tiếng đầu + cùng một giá cho mỗi tiếng thêm, tối đa 8 tiếng. Giá theo thứ và mùa được áp dụng tại màn tạo đặt phòng trong demo.</ScopeNote>
      <Panel>
        <DataTable headers={['CHI NHÁNH', 'HẠNG PHÒNG', 'TẤT CẢ CÁC NGÀY', 'T2 – CN', 'THAO TÁC']}>
          {prices.map(p => (
            <tr key={`${p.branchId}:${p.category}`}>
              <td>{branchName(p.branchId)}</td>
              <td><strong>{p.category}</strong></td>
              <td><strong>{moneyOrDash(priceValue(p, tab))}</strong>
                {tab === 'Giờ' && <small>{p.hourlySteps.map(s => `Từ giờ ${s.fromThHour}: ${moneyOrDash(s.price)} / ${s.type === 'block' ? 'block' : 'giờ'}`).join(' · ')}</small>}
              </td>
              <td>{p.weekdayRates?.[tab] && Object.keys(p.weekdayRates[tab]!).length ? 'Đã tùy chỉnh theo thứ' : 'Theo giá chung'}</td>
              <td><TextLink onClick={() => editRate(p)}>Thiết lập giá</TextLink></td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      <Panel title="Mùa và dịp lễ" subtitle="Giá ưu tiên theo khoảng ngày">
        <DataTable headers={['CHI NHÁNH', 'HẠNG', 'LOẠI GIÁ', 'TỪ', 'ĐẾN', 'GIÁ']}>
          {seasons.map((s, i) => <tr key={i}><td>{branchName(s.branchId)}</td><td>{s.category}</td><td>{s.type}</td><td>{s.from}</td><td>{s.to}</td><td>{moneyOrDash(s.price)}</td></tr>)}
        </DataTable>
      </Panel>
    </>
  );
}
