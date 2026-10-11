import { useState } from 'react';

const MAX_SIDE = 960;

const compress = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('load'));
    };
    img.src = url;
  });

export function GuestPhoto({
  id,
  label,
  icon,
  value,
  onChange
}: {
  id: string;
  label: string;
  icon: string;
  value?: string;
  onChange: (next: string) => void;
}) {
  const [error, setError] = useState('');
  return (
    <div className="gp">
      <span className="form-label d-block">{label}</span>
      {value ? (
        <div className="gp-preview">
          <img src={value} alt={label} />
          <button
            type="button"
            className="gp-remove"
            aria-label={`Xóa ${label.toLowerCase()}`}
            onClick={() => onChange('')}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      ) : (
        <label className="gp-drop" htmlFor={id}>
          <i className={`bi ${icon}`} aria-hidden="true" />
          <span>Tải ảnh lên</span>
        </label>
      )}
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="visually-hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            onChange(await compress(file));
            setError('');
          } catch {
            setError('Không đọc được ảnh.');
          }
        }}
      />
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}
