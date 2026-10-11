import { useState } from 'react';
import { parseCardUid } from './card';

export type ReaderState = 'waiting' | 'read' | 'issuing' | 'done' | 'error';

export function ReaderVisual({ state }: { state: ReaderState }) {
  return (
    <div className="ic-reader" aria-hidden="true">
      <span className="ic-card">
        <i className={`bi ${state === 'done' ? 'bi-check-lg' : 'bi-credit-card-2-front'}`} />
      </span>
      <span className="ic-pad" />
    </div>
  );
}

export function ManualUidInput({
  id,
  disabled,
  onSubmit
}: {
  id: string;
  disabled?: boolean;
  onSubmit: (value: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  if (!open)
    return (
      <div className="ic-manual">
        <button
          type="button"
          className="text-link"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <i className="bi bi-keyboard" /> Nhập UID thủ công
        </button>
      </div>
    );

  return (
    <form
      className="ic-manual"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!parseCardUid(value)) {
          setError('UID gồm 8, 14 hoặc 20 ký tự hex, hoặc 10 chữ số.');
          return;
        }
        setError('');
        if (onSubmit(value)) {
          setValue('');
          setOpen(false);
        }
      }}
    >
      <label className="form-label" htmlFor={id}>
        UID thẻ
      </label>
      <div className="ic-manual-row">
        <input
          id={id}
          data-manual-uid=""
          className={`form-control${error ? ' is-invalid' : ''}`}
          autoComplete="off"
          spellCheck={false}
          placeholder="A1B2C3D4"
          maxLength={23}
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}Error` : undefined}
          autoFocus
        />
        <button type="submit" className="btn btn-light">
          Dùng mã này
        </button>
      </div>
      {error && (
        <div id={`${id}Error`} className="invalid-feedback d-block">
          {error}
        </div>
      )}
    </form>
  );
}
