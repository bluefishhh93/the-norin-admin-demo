import { useState } from 'react';
import { useStore } from '../../store';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIDE = 1280;

const compress = (file: File) => new Promise<string>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    resolve(canvas.toDataURL('image/jpeg', 0.82));
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')); };
  img.src = url;
});

export function RoomGallery({ images, onChange }: { images: string[]; onChange: (next: string[]) => void }) {
  const { toast } = useStore();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const addUrl = () => {
    const value = url.trim();
    if (!/^https?:\/\//i.test(value)) { toast('Nhập URL ảnh bắt đầu bằng http(s)://'); return; }
    if (images.includes(value)) { toast('Ảnh này đã có.'); return; }
    onChange([...images, value]);
    setUrl('');
  };

  const addFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    const valid = list.filter(f => IMAGE_TYPES.includes(f.type) && f.size <= 10 * 1024 * 1024);
    if (valid.length < list.length) toast('Bỏ qua file không phải JPG/PNG/WEBP hoặc lớn hơn 10MB.');
    setLoading(true);
    try {
      const out = await Promise.all(valid.map(compress));
      onChange([...images, ...out]);
    } catch {
      toast('Không đọc được một số ảnh.');
    } finally {
      setLoading(false);
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="room-gallery">
      <div className="room-gallery-grid">
        {images.map((src, i) => (
          <figure key={`${i}:${src.slice(-24)}`} className="room-gallery-item">
            <img src={src} alt={`Ảnh ${i + 1}`} loading="lazy" />
            {i === 0 && <span className="room-gallery-cover">Ảnh bìa</span>}
            <div className="room-gallery-actions">
              {i > 0 && <button type="button" title="Đặt làm ảnh bìa" aria-label="Đặt làm ảnh bìa" onClick={() => move(i, 0)}><i className="bi bi-star" /></button>}
              <button type="button" title="Sang trái" aria-label="Sang trái" disabled={i === 0} onClick={() => move(i, i - 1)}><i className="bi bi-chevron-left" /></button>
              <button type="button" title="Sang phải" aria-label="Sang phải" disabled={i === images.length - 1} onClick={() => move(i, i + 1)}><i className="bi bi-chevron-right" /></button>
              <button type="button" title="Xóa ảnh" aria-label="Xóa ảnh" onClick={() => onChange(images.filter((_, j) => j !== i))}><i className="bi bi-trash" /></button>
            </div>
          </figure>
        ))}
        <label className={`room-gallery-add ${loading ? 'is-loading' : ''}`}>
          {loading ? <span className="spinner-border spinner-border-sm" aria-hidden /> : <i className="bi bi-cloud-arrow-up" />}
          <span>{loading ? 'Đang xử lý...' : 'Tải ảnh lên'}</span>
          <small>JPG, PNG, WEBP · chọn nhiều ảnh</small>
          <input type="file" accept={IMAGE_TYPES.join(',')} multiple hidden disabled={loading}
            onChange={e => { void addFiles(e.target.files); e.target.value = ''; }} />
        </label>
      </div>
      <div className="room-gallery-url">
        <input className="form-control" type="url" placeholder="Hoặc dán URL ảnh" value={url} maxLength={500}
          onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }} />
        <button type="button" className="btn btn-light" onClick={addUrl} disabled={!url.trim()}>Thêm</button>
      </div>
      <p className="room-gallery-hint">{images.length} ảnh · Ảnh đầu tiên là ảnh bìa hiển thị trên web, kiosk và tablet.</p>
    </div>
  );
}
