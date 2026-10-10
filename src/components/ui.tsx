import type { ReactNode } from 'react';
import { statusText } from '../lib/format';

export const Pill = ({ status, label }: { status: string; label?: ReactNode }) => (
  <span className={`status-pill ${status}`}>{label ?? statusText[status] ?? status}</span>
);

export const Icon = ({ name }: { name: string }) => <i className={`bi ${name}`} />;

export function PanelHead({
  title,
  subtitle,
  action,
  className
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel-head ${className ?? ''}`}>
      <div>
        <h2>{title}</h2>
        {subtitle != null && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  table = true,
  className = ''
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  table?: boolean;
  className?: string;
}) {
  return (
    <section className={`panel ${table ? 'table-panel' : ''} ${className}`}>
      {title != null && <PanelHead title={title} subtitle={subtitle} action={action} />}
      {children}
    </section>
  );
}

export function DataTable({
  headers,
  children,
  className = ''
}: {
  headers: string[];
  children?: ReactNode;
  className?: string;
}) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children;
  const empty = Array.isArray(rows) ? rows.length === 0 : !rows;
  return (
    <div className="table-wrap">
      <table className={`data-table ${className}`}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td className="empty-state" colSpan={headers.length}>
                Không có dữ liệu phù hợp.
              </td>
            </tr>
          ) : (
            rows
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TextLink({
  icon = 'bi-pencil',
  children,
  onClick,
  iconAfter
}: {
  icon?: string;
  children: ReactNode;
  onClick?: () => void;
  iconAfter?: boolean;
}) {
  return (
    <button type="button" className="text-link" onClick={onClick}>
      {iconAfter ? (
        <>
          {children} <i className={`bi ${icon}`} />
        </>
      ) : (
        <>
          <i className={`bi ${icon}`} /> {children}
        </>
      )}
    </button>
  );
}

export function PrimaryButton({
  icon,
  children,
  onClick,
  type = 'button',
  form,
  disabled
}: {
  icon?: string;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  form?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      form={form}
      className="btn-primary-custom"
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <i className={`bi ${icon}`} />} {children}
    </button>
  );
}

export const ScopeNote = ({
  icon = 'bi-info-circle',
  children,
  className = ''
}: {
  icon?: string | null;
  children: ReactNode;
  className?: string;
}) => (
  <div className={`scope-note ${className}`}>
    {icon && <i className={`bi ${icon}`} />}
    <span>{children}</span>
  </div>
);

export const Toolbar = ({ children }: { children: ReactNode }) => (
  <div className="toolbar">{children}</div>
);
export const Muted = ({ children }: { children: ReactNode }) => (
  <span className="text-muted small">{children}</span>
);

export function MetricCard({
  label,
  value,
  foot,
  icon,
  color
}: {
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  icon?: string;
  color?: string;
}) {
  return (
    <div className="card metric-card">
      {icon ? (
        <div className="metric-top">
          <span className="metric-label">{label}</span>
          <span className={`metric-icon ${color}`}>
            <i className={`bi ${icon}`} />
          </span>
        </div>
      ) : (
        <span className="metric-label">{label}</span>
      )}
      <div className="metric-value">{value}</div>
      {foot != null && <div className="metric-bottom">{foot}</div>}
    </div>
  );
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  labels
}: {
  items: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="reception-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={value === item}
          className={value === item ? 'active' : ''}
          onClick={() => onChange(item)}
        >
          {labels?.[item] ?? item}
        </button>
      ))}
    </div>
  );
}
