import { useState } from 'react';
import type { PriceType, Room, Season } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { branchName, moneyComma as money, moneyCommaOrDash as moneyOrDash } from '../../lib/format';
import { defaultBranch, isAllowedBranch, scoped } from '../../lib/scope';
import {
  activeSeasons,
  applySeason,
  baseRate,
  className,
  roomRate,
  seasonFor,
  dayKeyOf
} from '../../lib/rooms';
import { DataTable, Panel, PrimaryButton, ScopeNote, Tabs, TextLink } from '../../components/ui';
import { HolidayFields, RateFields, WEEKDAYS } from './PriceForms';

const PRICE_TYPES: PriceType[] = ['Giờ', 'Qua đêm', 'Ngày đêm'];
const TYPE_LABELS: Partial<Record<PriceType, string>> = {
  Giờ: 'Theo giờ',
  'Qua đêm': 'Qua đêm',
  'Ngày đêm': 'Theo ngày'
};
const roomId = (r: Pick<Room, 'branchId' | 'number'>) => `${r.branchId}:${r.number}`;

export function Pricing() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const [tab, setTab] = useState<PriceType>('Giờ');
  const rooms = scoped(data, data.rooms).sort(
    (a, b) => a.branchId.localeCompare(b.branchId) || a.number.localeCompare(b.number)
  );
  const seasons = scoped(data, activeSeasons(data)).sort((a, b) => a.from.localeCompare(b.from));
  const today = dayKeyOf(new Date());
  const editRate = (room: Room) => {
    const rate = roomRate(data, room);
    if (!rate || !isAllowedBranch(data, room.branchId)) return;
    const type = tab;
    const roomSeasons = seasons.filter(
      (s) => s.branchId === room.branchId && s.rooms.includes(room.number) && s.to >= today
    );
    modal.openForm({
      title: `Phòng ${room.number} · ${TYPE_LABELS[type]} · ${branchName(data, room.branchId)}`,
      size: 'lg',
      body: <RateFields type={type} rate={rate} seasons={roomSeasons} />,
      onSubmit: (v) => {
        update((d) => {
          const target = d.rooms.find((r) => roomId(r) === roomId(room));
          if (!target) return;
          const next = { ...rate, ...target.price };
          if (type === 'Giờ') {
            next.hourly = +v.base;
            next.extra = +v.extra;
          } else if (type === 'Qua đêm') next.overnight = +v.base;
          else next.daily = +v.base;
          next.weekdayRates = {
            ...next.weekdayRates,
            [type]: Object.fromEntries(
              WEEKDAYS.map(([day]) => [day, v[`weekday${day}`]])
                .filter(([, p]) => p !== '')
                .map(([day, p]) => [day, +p])
            )
          };
          target.price = next;
        });
        toast(`Đã lưu giá phòng ${room.number}.`);
      }
    });
  };

  const editHoliday = (season?: Season) => {
    modal.openForm({
      title: season ? `Sửa ngày lễ · ${season.name}` : 'Thêm giá ngày lễ',
      size: 'lg',
      body: (
        <HolidayFields
          data={data}
          branchId={defaultBranch(data)}
          season={season}
        />
      ),
      onSubmit: (v, form) => {
        const picked = new FormData(form).getAll('rooms').map(String);
        if (
          !isAllowedBranch(data, v.branchId) ||
          !v.from ||
          !v.to ||
          v.from > v.to ||
          !picked.length ||
          !Number.isFinite(+v.value)
        ) {
          toast('Kiểm tra khoảng ngày, mức tăng và chọn ít nhất 1 phòng.');
          return false;
        }
        const next: Season = {
          id: season?.id ?? `HD-${Date.now()}`,
          branchId: v.branchId,
          rooms: picked,
          name: v.name.trim(),
          from: v.from,
          to: v.to,
          mode: v.mode as Season['mode'],
          value: +v.value
        };
        update((d) => {
          d.season = activeSeasons(d).filter((s) => s.id !== next.id);
          d.season.push(next);
        });
        toast(season ? 'Đã cập nhật ngày lễ.' : 'Đã thêm giá ngày lễ.');
      }
    });
  };

  const removeHoliday = (s: Season) => {
    update((d) => {
      d.season = activeSeasons(d).filter((x) => x.id !== s.id);
    });
    toast(`Đã xóa ${s.name}.`);
  };

  const custom = (room: Room) =>
    room.price?.weekdayRates?.[tab] && Object.keys(room.price.weekdayRates[tab]!).length;

  return (
    <>
      <div className="reception-toolbar">
        <Tabs items={PRICE_TYPES} value={tab} onChange={setTab} labels={TYPE_LABELS} />
        <PrimaryButton icon="bi-calendar-event" onClick={() => editHoliday()}>
          Thêm ngày lễ
        </PrimaryButton>
      </div>
      <ScopeNote>
        Giá đặt riêng cho từng phòng. Phòng chưa đặt giá sẽ lấy giá mặc định của hạng phòng. Ngày lễ
        tăng giá cho các phòng được chọn trong khoảng ngày đó.
      </ScopeNote>
      <Panel>
        <DataTable
          headers={[
            'CHI NHÁNH',
            'PHÒNG',
            'HẠNG',
            tab === 'Giờ' ? '2 TIẾNG ĐẦU' : 'GIÁ',
            tab === 'Giờ' ? 'MỖI TIẾNG THÊM' : 'THEO THỨ',
            'HÔM NAY',
            'THAO TÁC'
          ]}
        >
          {rooms.map((room) => {
            const rate = roomRate(data, room);
            const season = seasonFor(data, room, today);
            const base = rate ? baseRate(rate, tab) : null;
            const now = rate ? applySeason(baseRate(rate, tab, new Date().getDay()), season) : null;
            return (
              <tr key={roomId(room)}>
                <td>{branchName(data, room.branchId)}</td>
                <td>
                  <strong>Phòng {room.number}</strong>
                  {!room.price && <small>Giá mặc định của hạng</small>}
                </td>
                <td>{className(data, room)}</td>
                <td>
                  <strong>{moneyOrDash(base)}</strong>
                </td>
                <td>
                  {tab === 'Giờ'
                    ? moneyOrDash(rate?.extra)
                    : custom(room)
                      ? 'Đã tùy chỉnh'
                      : 'Theo giá chung'}
                </td>
                <td>
                  {moneyOrDash(now)}
                  {season && <small>{season.name}</small>}
                </td>
                <td>
                  <TextLink onClick={() => editRate(room)}>Đặt giá</TextLink>
                </td>
              </tr>
            );
          })}
        </DataTable>
      </Panel>
      <Panel title="Giá ngày lễ" subtitle="Tăng giá các phòng đã chọn trong khoảng ngày">
        <DataTable headers={['DỊP', 'CHI NHÁNH', 'TỪ', 'ĐẾN', 'MỨC TĂNG', 'PHÒNG', 'THAO TÁC']}>
          {seasons.map((s) => (
            <tr key={s.id}>
              <td>
                <strong>{s.name}</strong>
                {s.to < today && <small>Đã qua</small>}
              </td>
              <td>{branchName(data, s.branchId)}</td>
              <td>{s.from}</td>
              <td>{s.to}</td>
              <td>
                <strong>
                  {s.mode === 'percent'
                    ? `${s.value > 0 ? '+' : ''}${s.value}%`
                    : `+${money(s.value)}`}
                </strong>
              </td>
              <td>{s.rooms.length > 4 ? `${s.rooms.length} phòng` : s.rooms.join(', ')}</td>
              <td>
                <TextLink onClick={() => editHoliday(s)}>Sửa</TextLink>{' '}
                <TextLink icon="bi-trash" onClick={() => removeHoliday(s)}>
                  Xóa
                </TextLink>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
