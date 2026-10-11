import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { useBooking } from '../booking/context';
import { branchName } from '../lib/format';
import { isSystemScope } from '../lib/scope';
import { buildAlerts, timeAgo, type Alert, type AlertKind } from './alerts';

const SEEN_KEY = 'norin_admin_seen_alerts';

const loadSeen = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const TABS: { id: 'all' | AlertKind; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'booking', label: 'Booking' },
  { id: 'ops', label: 'Vận hành' }
];

export function NotificationBell({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { data, update } = useStore();
  const { openDetail } = useBooking();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | AlertKind>('all');
  const [seen, setSeen] = useState<string[]>(loadSeen);
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const system = isSystemScope(data);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60000);
    return () => window.clearInterval(id);
  }, []);

  const alerts = useMemo(() => buildAlerts(data), [data, tick]);
  const seenSet = useMemo(() => new Set(seen), [seen]);
  const unread = alerts.filter((a) => !seenSet.has(a.id));
  const shown = tab === 'all' ? alerts : alerts.filter((a) => a.kind === tab);
  const countOf = (k: 'all' | AlertKind) =>
    (k === 'all' ? unread : unread.filter((a) => a.kind === k)).length;

  useEffect(() => {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-300)));
  }, [seen]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markRead = (ids: string[]) =>
    setSeen((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return [...next];
    });

  const openAlert = (a: Alert) => {
    markRead([a.id]);
    setOpen(false);
    if (system) {
      update((d) => {
        d.branchId = a.branchId;
      });
      onNavigate(a.page);
      return;
    }
    if (a.kind === 'booking' && a.code) {
      openDetail(a.code);
      return;
    }
    onNavigate(a.page);
  };

  const total = countOf('all');

  return (
    <div className="noti" ref={ref}>
      <button
        type="button"
        className={`noti-trigger${open ? ' is-open' : ''}`}
        aria-label={total ? `Thông báo, ${total} chưa đọc` : 'Thông báo'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <i className={`bi ${total ? 'bi-bell-fill' : 'bi-bell'}`} />
        {total > 0 && <span className="noti-badge">{total > 99 ? '99+' : total}</span>}
      </button>
      {open && (
        <div className="noti-panel" role="dialog" aria-label="Thông báo">
          <div className="noti-head">
            <strong>Thông báo</strong>
            <button
              type="button"
              className="noti-read-all"
              disabled={!total}
              onClick={() => markRead(alerts.map((a) => a.id))}
            >
              <i className="bi bi-check2-all" /> Đánh dấu đã đọc
            </button>
          </div>
          <div className="noti-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`noti-tab${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {countOf(t.id) > 0 && <span className="noti-tab-count">{countOf(t.id)}</span>}
              </button>
            ))}
          </div>
          <div className="noti-list">
            {shown.length === 0 ? (
              <div className="noti-empty">
                <i className="bi bi-bell-slash" />
                <span>Chưa có thông báo nào</span>
              </div>
            ) : (
              shown.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`noti-item${seenSet.has(a.id) ? '' : ' unread'}`}
                  onClick={() => openAlert(a)}
                >
                  <span className={`noti-icon tone-${a.tone}`}>
                    <i className={`bi ${a.icon}`} />
                  </span>
                  <span className="noti-body">
                    <strong>{a.title}</strong>
                    <span className="noti-detail">{a.detail}</span>
                    <span className="noti-meta">
                      {timeAgo(a.at)}
                      {system && ` · ${branchName(data, a.branchId)}`}
                    </span>
                  </span>
                  {!seenSet.has(a.id) && <span className="noti-dot" />}
                </button>
              ))
            )}
          </div>
          {!system && (
            <button
              type="button"
              className="noti-foot"
              onClick={() => {
                setOpen(false);
                onNavigate('work-queue');
              }}
            >
              Xem việc cần xử lý <i className="bi bi-arrow-right" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
