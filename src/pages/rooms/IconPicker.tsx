import { useEffect, useId, useMemo, useRef, useState, type ComponentType } from 'react';
import * as Lucide from 'lucide-react';

type IconCmp = ComponentType<{ size?: number; strokeWidth?: number }>;
const REGISTRY = Lucide as unknown as Record<string, unknown>;
const EXCLUDE = new Set(['createLucideIcon', 'default', 'Icon', 'icons']);
const ICON_NAMES = Object.keys(REGISTRY).filter(
  (k) =>
    !EXCLUDE.has(k) &&
    /^[A-Z]/.test(k) &&
    REGISTRY[k] &&
    typeof REGISTRY[k] === 'object' &&
    'render' in (REGISTRY[k] as object)
);
const PRIMARY = ICON_NAMES.filter((n) => !n.startsWith('Lucide') && !n.endsWith('Icon'));
const ORDERED = [
  ...PRIMARY,
  ...ICON_NAMES.filter((n) => n.startsWith('Lucide') || n.endsWith('Icon'))
];
const LIMIT = 60;

export const getIcon = (name: string): IconCmp | null =>
  name && ICON_NAMES.includes(name) ? (REGISTRY[name] as IconCmp) : null;

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const Current = getIcon(value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PRIMARY.slice(0, LIMIT);
    const starts: string[] = [];
    const contains: string[] = [];
    for (const n of ORDERED) {
      const l = n.toLowerCase();
      if (l.startsWith(q)) starts.push(n);
      else if (l.includes(q)) contains.push(n);
    }
    return [...starts, ...contains].slice(0, LIMIT);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setQuery('');
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && results[active]) pick(results[active]);
      else setOpen(true);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className="icon-picker" ref={wrap}>
      <div className={`icon-picker-control${open ? ' open' : ''}`}>
        <span className="icon-picker-lead" aria-hidden>
          {Current ? <Current size={16} /> : <i className="bi bi-search" />}
        </span>
        <input
          className="icon-picker-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label="Chọn icon từ thư viện"
          placeholder={value || 'Chọn Icon từ thư viện'}
          value={open ? query : value}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKey}
        />
        {value && !open && (
          <button
            type="button"
            className="icon-picker-clear"
            aria-label="Bỏ chọn icon"
            onClick={() => onChange('')}
          >
            <i className="bi bi-x-circle-fill" />
          </button>
        )}
        <i className="bi bi-chevron-down icon-picker-caret" aria-hidden />
      </div>
      {open && (
        <ul className="icon-picker-menu" role="listbox" id={listId} ref={listRef}>
          {results.length ? (
            results.map((n, i) => {
              const Cmp = REGISTRY[n] as IconCmp;
              return (
                <li
                  key={n}
                  role="option"
                  aria-selected={n === value}
                  className={`${i === active ? 'active' : ''}${n === value ? ' selected' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(n);
                  }}
                >
                  <Cmp size={16} />
                  <span>{n}</span>
                </li>
              );
            })
          ) : (
            <li className="icon-picker-empty">Không tìm thấy icon</li>
          )}
        </ul>
      )}
      <span className="icon-picker-preview" aria-hidden>
        {Current ? <Current size={20} /> : null}
      </span>
    </div>
  );
}
