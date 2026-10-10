import { useState } from 'react';
import type { Room, RoomClass } from '../../types';
import { useStore } from '../../store';
import { branchName } from '../../lib/format';
import { LANGS } from '../../lib/translate';
import { Pill } from '../../components/ui';
import { ContentEditor, contentStatus } from './ContentEditor';
import { RoomInfoForm } from './RoomInfoForm';
import { LockTab, MusicTab, QrTab } from './RoomSettingTabs';

type Tab = 'info' | 'content' | 'music' | 'lock' | 'qr';
const TABS: [Tab, string, string][] = [
  ['info', 'Thông tin', 'bi-info-circle'],
  ['content', 'Nội dung 5 ngôn ngữ', 'bi-translate'],
  ['music', 'Nhạc tablet', 'bi-music-note-beamed'],
  ['lock', 'Khóa TTLock', 'bi-key'],
  ['qr', 'QR phòng', 'bi-qr-code']
];

export const roomContentKey = (r: Pick<Room, 'masterProductId'>) => `room:${r.masterProductId}`;

export function useRoomChecklist(room: Room) {
  const { data } = useStore();
  const content = contentStatus(data.content[roomContentKey(room)]);
  const hasLock = data.locks.some((l) => l.branchId === room.branchId && l.room === room.number);
  return [
    {
      tab: 'info' as Tab,
      label: 'Thông tin cơ bản',
      done: !!(room.name && room.masterProductId > 0)
    },
    {
      tab: 'info' as Tab,
      label: `Ảnh phòng (${room.images?.length ?? 0})`,
      done: !!room.images?.length
    },
    { tab: 'content' as Tab, label: 'Nội dung tiếng Việt', done: content.hasVi },
    {
      tab: 'content' as Tab,
      label: `Bản dịch ${content.translated}/${LANGS.length - 1}`,
      done: content.translated === LANGS.length - 1 && !content.stale
    },
    { tab: 'music' as Tab, label: 'Nhạc tablet', done: !!room.musicFile },
    { tab: 'lock' as Tab, label: 'Khóa TTLock', done: hasLock },
    { tab: 'qr' as Tab, label: 'QR phòng', done: !!data.qrDomain }
  ];
}

export function RoomDetail({
  room,
  cls,
  onBack,
  onSaved,
  navigate
}: {
  room: Room;
  cls: RoomClass;
  onBack: () => void;
  onSaved: (key: string) => void;
  navigate: (p: string) => void;
}) {
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>('info');
  const checklist = useRoomChecklist(room);
  const done = checklist.filter((c) => c.done).length;
  const pct = Math.round((done / checklist.length) * 100);

  return (
    <>
      <nav className="room-crumbs">
        <button type="button" className="text-link" onClick={onBack}>
          <i className="bi bi-arrow-left" /> {cls.name}
        </button>
        <span>/</span>
        <strong>Phòng {room.number}</strong>
      </nav>
      <div className="room-detail">
        <aside className="room-detail-side">
          <div className="panel room-summary">
            <div className="room-summary-media">
              {room.images?.[0] ? (
                <img src={room.images[0]} alt={room.name} />
              ) : (
                <i className="bi bi-door-closed" />
              )}
            </div>
            <div className="room-summary-body">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <span className="eyebrow">
                    {branchName(data, room.branchId)} · {cls.code}
                  </span>
                  <h2>{room.name}</h2>
                </div>
                <Pill status={room.status} />
              </div>
              <dl className="room-facts">
                <div>
                  <dt>Số phòng</dt>
                  <dd>{room.number}</dd>
                </div>
                <div>
                  <dt>Room ID</dt>
                  <dd>{room.masterProductId}</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="panel room-checklist">
            <div className="d-flex justify-content-between align-items-center">
              <h3>Cài đặt phòng</h3>
              <span>
                {done}/{checklist.length}
              </span>
            </div>
            <div className="room-progress">
              <i style={{ width: `${pct}%` }} />
            </div>
            <ul>
              {checklist.map((c) => (
                <li key={c.label}>
                  <button
                    type="button"
                    className={c.done ? 'done' : ''}
                    onClick={() => setTab(c.tab)}
                  >
                    <i className={`bi ${c.done ? 'bi-check-circle-fill' : 'bi-circle'}`} />
                    <span>{c.label}</span>
                    <i className="bi bi-chevron-right ms-auto" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <section className="panel room-detail-main">
          <div className="reception-tabs mb-3" role="tablist">
            {TABS.map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? 'active' : ''}
                onClick={() => setTab(id)}
              >
                <i className={`bi ${icon} me-1`} />
                {label}
              </button>
            ))}
          </div>
          {tab === 'info' && <RoomInfoForm room={room} classId={cls.id} onSaved={onSaved} />}
          {tab === 'content' && (
            <ContentEditor
              contentKey={roomContentKey(room)}
              defaults={{
                description: room.description || '',
                amenities: (room.amenities || '')
                  .split(/[\n,]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((label) => ({ icon: '', label }))
              }}
            />
          )}
          {tab === 'music' && <MusicTab room={room} />}
          {tab === 'lock' && <LockTab room={room} />}
          {tab === 'qr' && <QrTab room={room} navigate={navigate} />}
        </section>
      </div>
    </>
  );
}
