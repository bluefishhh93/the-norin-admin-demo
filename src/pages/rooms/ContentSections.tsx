import type { AboutSection, AmenityItem, RoomContent, SensoryBullet } from './contentModel';
import { IconPicker } from './IconPicker';

type Props<T> = { value: T; onChange: (v: T) => void; hint?: RoomContent | null };

const setAt = <T,>(list: T[], i: number, patch: Partial<T>) => list.map((x, idx) => (idx === i ? { ...x, ...patch } : x));
const without = <T,>(list: T[], i: number) => list.filter((_, idx) => idx !== i);
const move = <T,>(list: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

function RowActions({ i, total, onMove, onRemove }: { i: number; total: number; onMove: (d: number) => void; onRemove: () => void }) {
  return (
    <div className="cs-row-actions">
      <button type="button" className="cs-icon-btn" aria-label="Lên" disabled={i === 0} onClick={() => onMove(-1)}><i className="bi bi-arrow-up" /></button>
      <button type="button" className="cs-icon-btn" aria-label="Xuống" disabled={i === total - 1} onClick={() => onMove(1)}><i className="bi bi-arrow-down" /></button>
      <button type="button" className="cs-icon-btn danger" aria-label="Xóa" onClick={onRemove}><i className="bi bi-trash3" /></button>
    </div>
  );
}

const AddButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button type="button" className="cs-add" onClick={onClick}><i className="bi bi-plus-lg" /> {label}</button>
);

const Empty = ({ text }: { text: string }) => <p className="cs-empty">{text}</p>;

export function DescriptionTab({ value, onChange, hint }: Props<string>) {
  return (
    <div className="cs-stack">
      <p className="cs-hint">Đoạn mô tả ngắn hiển thị ở đầu trang chi tiết phòng.</p>
      <label className="form-label d-block mb-0">
        <span className="d-flex justify-content-between"><span>Mô tả</span><small className="text-muted">{value.length}/1000</small></span>
        <textarea className="form-control mt-1" rows={5} maxLength={1000} value={value}
          placeholder={hint?.description || 'Không gian riêng tư, ấm cúng dành cho hai người...'}
          onChange={e => onChange(e.target.value)} />
      </label>
    </div>
  );
}

export function AmenitiesTab({ value, onChange, hint }: Props<AmenityItem[]>) {
  return (
    <div className="cs-stack">
      <p className="cs-hint">Chọn icon từ thư viện Lucide và nhập tên tiện nghi.</p>
      {!value.length && <Empty text="Chưa có tiện nghi nào." />}
      {value.map((item, i) => (
        <div key={i} className="cs-row">
          <IconPicker value={item.icon} onChange={icon => onChange(setAt(value, i, { icon }))} />
          <input className="form-control cs-grow" value={item.label} maxLength={80}
            placeholder={hint?.amenities[i]?.label || 'Nhãn (vd: Giường đôi Queen)'}
            onChange={e => onChange(setAt(value, i, { label: e.target.value }))} />
          <RowActions i={i} total={value.length} onMove={d => onChange(move(value, i, d))} onRemove={() => onChange(without(value, i))} />
        </div>
      ))}
      <AddButton label="Thêm tiện nghi" onClick={() => onChange([...value, { icon: '', label: '' }])} />
    </div>
  );
}

export function PrivilegesTab({ value, onChange, hint }: Props<string[]>) {
  return (
    <div className="cs-stack">
      {!value.length && <Empty text="Chưa có đặc quyền nào." />}
      {value.map((item, i) => (
        <div key={i} className="cs-row plain">
          <input className="form-control cs-grow" value={item} maxLength={160}
            placeholder={hint?.privileges[i] || 'Đặc quyền (vd: Check-in tự động)'}
            onChange={e => onChange(value.map((x, idx) => (idx === i ? e.target.value : x)))} />
          <RowActions i={i} total={value.length} onMove={d => onChange(move(value, i, d))} onRemove={() => onChange(without(value, i))} />
        </div>
      ))}
      <AddButton label="Thêm đặc quyền" onClick={() => onChange([...value, ''])} />
    </div>
  );
}

const LAYOUTS: [string, string][] = [
  ['image-left', '◀ Ảnh bên trái, text bên phải (image-left)'],
  ['image-right', '▶ Ảnh bên phải, text bên trái (image-right)'],
  ['fullwidth', '⬛ Full width — ảnh toàn chiều ngang (fullwidth)']
];

export function AboutTab({ value, onChange, hint }: Props<AboutSection[]>) {
  return (
    <div className="cs-stack lg">
      <p className="cs-hint">Chỉ nhập text. Ảnh lấy tự động từ gallery ảnh của phòng (thiếu thì lặp lại).</p>
      {!value.length && <Empty text="Chưa có section nào." />}
      {value.map((sec, i) => (
        <div key={i} className="cs-card">
          <div className="cs-card-head">
            <strong>Section {i + 1}{sec.title ? ` — ${sec.title}` : ''}</strong>
            <RowActions i={i} total={value.length} onMove={d => onChange(move(value, i, d))} onRemove={() => onChange(without(value, i))} />
          </div>
          <div className="cs-card-body">
            <label className="form-label d-block mb-0">Tiêu đề
              <input className="form-control mt-1" value={sec.title} maxLength={160}
                placeholder={hint?.aboutSections[i]?.title || 'Đặc điểm nổi bật của hạng phòng'}
                onChange={e => onChange(setAt(value, i, { title: e.target.value }))} />
            </label>
            <label className="form-label d-block mb-0">Mô tả
              <textarea className="form-control mt-1" rows={3} maxLength={1500} value={sec.description}
                placeholder={hint?.aboutSections[i]?.description || 'Không rập khuôn theo lối mòn...'}
                onChange={e => onChange(setAt(value, i, { description: e.target.value }))} />
            </label>
            <label className="form-label d-block mb-0">Layout
              <select className="form-select mt-1" value={sec.layout || 'image-left'} onChange={e => onChange(setAt(value, i, { layout: e.target.value }))}>
                {LAYOUTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
        </div>
      ))}
      <AddButton label="Thêm section" onClick={() => onChange([...value, { title: '', description: '', layout: 'image-left' }])} />
    </div>
  );
}

export function SensoryTab({ value, onChange, hint }: Props<RoomContent['sensoryExperience']>) {
  const bullets = value.bullets;
  const setBullets = (b: SensoryBullet[]) => onChange({ ...value, bullets: b });
  return (
    <div className="cs-stack lg">
      <p className="cs-hint">Ảnh bên phải lấy từ gallery phòng (ảnh thứ 3). Chỉ chỉnh text.</p>
      <label className="form-label d-block mb-0">Tiêu đề section
        <input className="form-control mt-1" value={value.title} maxLength={160}
          placeholder={hint?.sensoryExperience.title || 'Trải nghiệm đa giác quan'}
          onChange={e => onChange({ ...value, title: e.target.value })} />
      </label>
      <div className="cs-divider"><span>Danh sách giác quan</span></div>
      {!bullets.length && <Empty text="Chưa có giác quan nào." />}
      {bullets.map((b, i) => (
        <div key={i} className="cs-row top">
          <input className="form-control cs-sense" value={b.sense} maxLength={40}
            placeholder={hint?.sensoryExperience.bullets[i]?.sense || 'Giác quan (vd: Thị giác)'}
            onChange={e => setBullets(setAt(bullets, i, { sense: e.target.value }))} />
          <textarea className="form-control cs-grow" rows={2} maxLength={600} value={b.description}
            placeholder={hint?.sensoryExperience.bullets[i]?.description || 'Mô tả (vd: Hệ thống đèn ambient có thể tùy chỉnh màu sắc...)'}
            onChange={e => setBullets(setAt(bullets, i, { description: e.target.value }))} />
          <RowActions i={i} total={bullets.length} onMove={d => setBullets(move(bullets, i, d))} onRemove={() => setBullets(without(bullets, i))} />
        </div>
      ))}
      <AddButton label="Thêm giác quan" onClick={() => setBullets([...bullets, { sense: '', description: '' }])} />
    </div>
  );
}

export function WhyTab({ value, onChange, hint }: Props<RoomContent['whyChooseUs']>) {
  return (
    <div className="cs-stack lg">
      <p className="cs-hint">Chỉ nhập text. Collage 3 ảnh lấy từ gallery phòng (ảnh 4–6).</p>
      <label className="form-label d-block mb-0">Tiêu đề
        <input className="form-control mt-1" value={value.title} maxLength={160}
          placeholder={hint?.whyChooseUs.title || 'Tại sao hai bạn nên chọn hạng phòng này'}
          onChange={e => onChange({ ...value, title: e.target.value })} />
      </label>
      <label className="form-label d-block mb-0">Mô tả
        <textarea className="form-control mt-1" rows={4} maxLength={1500} value={value.description}
          placeholder={hint?.whyChooseUs.description || 'Nếu bạn đã quen thuộc với những không gian khách sạn truyền thống...'}
          onChange={e => onChange({ ...value, description: e.target.value })} />
      </label>
    </div>
  );
}
