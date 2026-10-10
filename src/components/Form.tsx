import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type InputProps = { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>;
export const Field = ({ label, className, ...rest }: InputProps) => (
  <label className={`form-label d-block ${className ?? ''}`}>{label}<input className="form-control mt-1" {...rest} /></label>
);

type SelectProps = { label: ReactNode; options: [string, string][] } & SelectHTMLAttributes<HTMLSelectElement>;
export const Select = ({ label, options, className, ...rest }: SelectProps) => (
  <label className={`form-label d-block ${className ?? ''}`}>{label}
    <select className="form-select mt-1" {...rest}>{options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
  </label>
);

type AreaProps = { label: ReactNode } & TextareaHTMLAttributes<HTMLTextAreaElement>;
export const Area = ({ label, ...rest }: AreaProps) => (
  <label className="form-label d-block">{label}<textarea className="form-control mt-1" rows={2} {...rest} /></label>
);

export const formValues = (form: HTMLFormElement) => Object.fromEntries(new FormData(form)) as Record<string, string>;
