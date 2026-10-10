import type { ReactNode } from 'react';
import type { Rules } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field, Select } from '../../components/Form';
import { DataTable, Panel, PrimaryButton, Toolbar } from '../../components/ui';

const RULE_ROWS: [Exclude<keyof Rules, 'checkinMode'>, string, string][] = [
  ['reservationHold', 'Giữ chỗ chờ thanh toán', 'phút'],
  ['cleaningBuffer', 'Đệm dọn phòng trước/sau mỗi lượt', 'phút'],
  ['overstayThreshold', 'Bắt đầu tính quá giờ sau', 'phút'],
  ['overstayNotifyInterval', 'Nhắc quá giờ lặp lại mỗi', 'phút'],
  ['overstayStopAfter', 'Ngừng nhắc quá giờ sau', 'giờ'],
  ['extendSuggestHours', 'Gợi ý cộng thêm khi quá giờ', 'giờ'],
  ['maxHourlyStay', 'Tối đa cho lượt theo giờ', 'giờ'],
  ['vnpayQrExpire', 'QR VNPay hết hạn sau', 'phút'],
  ['geofenceRecheck', 'Kiểm tra lại vị trí khách (QR phòng) mỗi', 'phút']
];

const Card = ({ icon, title, children }: { icon: string; title: string; children: ReactNode }) => (
  <article className="pms-card">
    <div className="pms-card-head">
      <i className={`bi ${icon}`} />
      <strong>{title}</strong>
    </div>
    {children}
  </article>
);
const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="pms-row">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);
const Col = ({ children, full }: { children: ReactNode; full?: boolean }) => (
  <div className={full ? 'col-12' : 'col-sm-6'}>{children}</div>
);

export function Settings() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const s = data.timeSetting,
    r = data.rules;

  const editTime = () =>
    modal.openForm({
      title: 'Giờ lưu trú',
      size: 'lg',
      submitLabel: 'Lưu',
      body: (
        <div className="row g-3">
          <Col>
            <Field
              label="Nhận phòng theo ngày"
              name="dayCheckIn"
              type="time"
              defaultValue={s.dayCheckIn}
              required
            />
          </Col>
          <Col>
            <Field
              label="Trả phòng theo ngày"
              name="dayCheckOut"
              type="time"
              defaultValue={s.dayCheckOut}
              required
            />
          </Col>
          <Col>
            <Field
              label="Nhận qua đêm từ"
              name="nightCheckIn"
              type="time"
              defaultValue={s.nightCheckIn}
              required
            />
          </Col>
          <Col>
            <Field
              label="Trả qua đêm trước"
              name="nightCheckOut"
              type="time"
              defaultValue={s.nightCheckOut}
              required
            />
          </Col>
          <Col>
            <Field
              label="Day-use bắt đầu"
              name="dayUseCheckIn"
              type="time"
              defaultValue={s.dayUseCheckIn}
              required
            />
          </Col>
          <Col>
            <Field
              label="Day-use kết thúc"
              name="dayUseCheckOut"
              type="time"
              defaultValue={s.dayUseCheckOut}
              required
            />
          </Col>
          <Col>
            <Field
              label="Quá bao nhiêu giờ tính thêm 1 ngày"
              name="hourForRoundingOneDay"
              type="number"
              min={0}
              max={23}
              defaultValue={s.hourForRoundingOneDay}
              required
            />
          </Col>
          <Col>
            <Field
              label="Làm tròn lên 1 giờ khi lẻ quá (phút)"
              name="minuteForRoundingOneHour"
              type="number"
              min={0}
              max={59}
              defaultValue={s.minuteForRoundingOneHour}
              required
            />
          </Col>
          <Col>
            <Select
              label="Trả trễ qua đêm chuyển sang ngày"
              name="isExpandDayWhenOverCheckOutNight"
              options={[
                ['false', 'Không'],
                ['true', 'Có']
              ]}
              defaultValue={String(s.isExpandDayWhenOverCheckOutNight)}
            />
          </Col>
          <Col>
            <Field
              label="Mốc chuyển sang ngày (giờ)"
              name="hourForExpandDayWhenOverCheckOutNight"
              type="number"
              min={0}
              max={23}
              defaultValue={s.hourForExpandDayWhenOverCheckOutNight}
              required
            />
          </Col>
        </div>
      ),
      onSubmit: (v) => {
        update((d) => {
          Object.assign(d.timeSetting, {
            dayCheckIn: v.dayCheckIn,
            dayCheckOut: v.dayCheckOut,
            nightCheckIn: v.nightCheckIn,
            nightCheckOut: v.nightCheckOut,
            dayUseCheckIn: v.dayUseCheckIn,
            dayUseCheckOut: v.dayUseCheckOut,
            hourForRoundingOneDay: +v.hourForRoundingOneDay,
            minuteForRoundingOneHour: +v.minuteForRoundingOneHour,
            hourForExpandDayWhenOverCheckOutNight: +v.hourForExpandDayWhenOverCheckOutNight,
            isExpandDayWhenOverCheckOutNight: v.isExpandDayWhenOverCheckOutNight === 'true'
          });
        });
        toast('Đã lưu giờ lưu trú.');
      }
    });

  const editRules = () =>
    modal.openForm({
      title: 'Quy tắc vận hành',
      size: 'lg',
      submitLabel: 'Lưu',
      body: (
        <div className="row g-3">
          {RULE_ROWS.map(([k, label, unit]) => (
            <Col key={k}>
              <Field
                label={`${label} (${unit})`}
                name={k}
                type="number"
                min={1}
                defaultValue={r[k]}
                required
              />
            </Col>
          ))}
          <Col full>
            <Select
              label="Chế độ nhận phòng sớm/trễ"
              name="checkinMode"
              options={[
                ['flexible', 'Linh hoạt (dời giờ khi không vướng khách sau)'],
                ['fixed', 'Cố định (sớm thì chờ, giữ giờ trả)']
              ]}
              defaultValue={r.checkinMode}
            />
          </Col>
        </div>
      ),
      onSubmit: (v) => {
        const next: Partial<Rules> = {};
        for (const [k] of RULE_ROWS) {
          const n = Number(v[k]);
          if (!Number.isInteger(n) || n < 1) {
            toast('Các giá trị phải là số nguyên dương.');
            return false;
          }
          next[k] = n;
        }
        update((d) => {
          Object.assign(d.rules, next, { checkinMode: v.checkinMode as Rules['checkinMode'] });
        });
        toast('Đã lưu quy tắc vận hành.');
      }
    });

  return (
    <>
      <Toolbar>
        <span className="text-muted small">Áp dụng cho web, kiosk và tablet ở mọi chi nhánh</span>
        <div className="d-flex gap-2">
          <PrimaryButton icon="bi-clock" onClick={editTime}>
            Sửa giờ lưu trú
          </PrimaryButton>
          <PrimaryButton icon="bi-sliders" onClick={editRules}>
            Sửa quy tắc
          </PrimaryButton>
        </div>
      </Toolbar>
      <div className="pms-cards">
        <Card icon="bi-sun" title="Theo ngày">
          <Row label="Nhận phòng" value={s.dayCheckIn} />
          <Row label="Trả phòng" value={s.dayCheckOut} />
          <Row
            label="Quá bao nhiêu giờ thì tính thêm 1 ngày"
            value={`${s.hourForRoundingOneDay} giờ`}
          />
        </Card>
        <Card icon="bi-moon-stars" title="Qua đêm">
          <Row label="Nhận phòng từ" value={s.nightCheckIn} />
          <Row label="Trả phòng trước" value={s.nightCheckOut} />
          <Row
            label="Trả trễ quá giờ đêm thì chuyển sang ngày"
            value={
              s.isExpandDayWhenOverCheckOutNight
                ? `Có, sau ${s.hourForExpandDayWhenOverCheckOutNight}:00`
                : 'Không'
            }
          />
        </Card>
        <Card icon="bi-hourglass-split" title="Theo giờ">
          <Row label="Làm tròn lên 1 giờ khi lẻ quá" value={`${s.minuteForRoundingOneHour} phút`} />
          <Row label="Tối đa" value={`${r.maxHourlyStay} giờ`} />
          <Row label="Trong ngày (day-use)" value={`${s.dayUseCheckIn} → ${s.dayUseCheckOut}`} />
        </Card>
        <Card icon="bi-door-open" title="Nhận phòng sớm / trễ">
          <Row
            label="Chế độ"
            value={
              r.checkinMode === 'fixed'
                ? 'Cố định: sớm thì chờ, đúng/trễ giữ nguyên'
                : 'Linh hoạt: dời giờ nếu không vướng khách sau'
            }
          />
          <Row label="Đệm dọn phòng" value={`${r.cleaningBuffer} phút`} />
        </Card>
      </div>
      <Panel
        title="Quy tắc vận hành"
        subtitle="Các mốc thời gian backend đang dùng; trước đây cố định trong code"
      >
        <DataTable headers={['QUY TẮC', 'GIÁ TRỊ']}>
          {RULE_ROWS.map(([k, label, unit]) => (
            <tr key={k}>
              <td>
                <strong>{label}</strong>
              </td>
              <td>
                {r[k]} {unit}
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
