import {
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from 'react';
import { groupComma } from '../lib/format';

type InputProps = { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>;
export const Field = ({ label, className, ...rest }: InputProps) => (
  <label className={`form-label d-block ${className ?? ''}`}>
    {label}
    <input className="form-control mt-1" {...rest} />
  </label>
);

type MoneyProps = {
  label: ReactNode;
  name: string;
  value?: string;
  defaultValue?: string | number;
  onChange?: (raw: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
};
export function MoneyField({
  label,
  name,
  value,
  defaultValue,
  onChange,
  placeholder,
  required,
  className
}: MoneyProps) {
  const [inner, setInner] = useState(defaultValue == null ? '' : String(defaultValue));
  const raw = value ?? inner;
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || caret.current == null || document.activeElement !== el) return;
    let left = caret.current,
      i = 0;
    while (i < el.value.length && left > 0) {
      if (/\d/.test(el.value[i])) left--;
      i++;
    }
    el.setSelectionRange(i, i);
    caret.current = null;
  });

  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    caret.current = el.value
      .slice(0, el.selectionStart ?? el.value.length)
      .replace(/\D/g, '').length;
    const digits = el.value
      .replace(/\D/g, '')
      .replace(/^0+(?=\d)/, '')
      .slice(0, 15);
    if (value === undefined) setInner(digits);
    onChange?.(digits);
  };

  return (
    <label className={`form-label d-block ${className ?? ''}`}>
      {label}
      <input
        ref={ref}
        className="form-control mt-1"
        inputMode="numeric"
        autoComplete="off"
        value={raw ? groupComma(raw) : ''}
        onChange={change}
        placeholder={placeholder}
        required={required}
      />
      <input type="hidden" name={name} value={raw} />
    </label>
  );
}

type SelectProps = {
  label: ReactNode;
  options: [string, string][];
} & SelectHTMLAttributes<HTMLSelectElement>;
export const Select = ({ label, options, className, ...rest }: SelectProps) => (
  <label className={`form-label d-block ${className ?? ''}`}>
    {label}
    <select className="form-select mt-1" {...rest}>
      {options.map(([v, t]) => (
        <option key={v} value={v}>
          {t}
        </option>
      ))}
    </select>
  </label>
);

type AreaProps = { label: ReactNode } & TextareaHTMLAttributes<HTMLTextAreaElement>;
export const Area = ({ label, ...rest }: AreaProps) => (
  <label className="form-label d-block">
    {label}
    <textarea className="form-control mt-1" rows={2} {...rest} />
  </label>
);

export const formValues = (form: HTMLFormElement) =>
  Object.fromEntries(new FormData(form)) as Record<string, string>;
