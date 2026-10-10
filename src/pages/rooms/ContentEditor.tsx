import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { LANGS, LANG_NAME, deepTranslate, type Lang } from '../../lib/translate';
import { cleanContent, contentStatus, hasContent, loadContent, sourceKey, type ContentByLang, type RoomContent, type StoredContent } from './contentModel';
import { AboutTab, AmenitiesTab, DescriptionTab, PrivilegesTab, SensoryTab, WhyTab } from './ContentSections';

export { contentStatus };

type Section = 'description' | 'amenities' | 'privileges' | 'about' | 'sensory' | 'why';
const SECTIONS: [Section, string, string][] = [
  ['description', 'Mô tả', 'bi-text-paragraph'],
  ['amenities', 'Tiện nghi', 'bi-stars'],
  ['privileges', 'Đặc quyền', 'bi-award'],
  ['about', 'Về hạng phòng', 'bi-image'],
  ['sensory', 'Trải nghiệm giác quan', 'bi-magic'],
  ['why', 'Tại sao chọn chúng tôi', 'bi-lightbulb']
];

const count = (c: RoomContent, s: Section) => {
  if (s === 'description') return c.description.trim() ? 1 : 0;
  if (s === 'amenities') return c.amenities.length;
  if (s === 'privileges') return c.privileges.length;
  if (s === 'about') return c.aboutSections.length;
  if (s === 'sensory') return c.sensoryExperience.bullets.length;
  return c.whyChooseUs.title.trim() || c.whyChooseUs.description.trim() ? 1 : 0;
};

export function ContentEditor({ contentKey, defaults }: { contentKey: string; defaults?: Partial<RoomContent> }) {
  const { data, update, toast } = useStore();
  const stored = data.content[contentKey] as StoredContent | undefined;
  const initial = useMemo<ContentByLang>(() => loadContent(stored, defaults), [contentKey]);
  const [values, setValues] = useState<ContentByLang>(initial);
  const [baseline, setBaseline] = useState<ContentByLang>(initial);
  const [lang, setLang] = useState<Lang>('vi');
  const [section, setSection] = useState<Section>('description');
  const [busy, setBusy] = useState<Lang[]>([]);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => { setValues(initial); setBaseline(initial); setLang('vi'); setSection('description'); }, [initial]);
  useEffect(() => () => abort.current?.abort(), []);

  const content = values[lang];
  const hint = lang === 'vi' ? null : values.vi;
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  const viFilled = hasContent(values.vi);
  const stale = viFilled && stored?._meta?.source !== sourceKey(values.vi);
  const translating = busy.length > 0;

  const patch = (p: Partial<RoomContent>) => setValues(s => ({ ...s, [lang]: { ...s[lang], ...p } }));

  const persist = (next: ContentByLang, translatedFrom?: string) => {
    setBaseline(next);
    update(d => {
      const prevMeta = (d.content[contentKey] as StoredContent | undefined)?._meta;
      const out: Record<string, unknown> = {};
      for (const l of LANGS) out[l] = cleanContent(next[l]);
      out._meta = translatedFrom ? { source: translatedFrom } : prevMeta ?? {};
      d.content[contentKey] = out;
    });
  };

  const save = () => { persist(values); toast('Đã lưu nội dung.'); };

  const translate = async () => {
    if (!viFilled) { toast('Vui lòng nhập nội dung tiếng Việt trước!'); return; }
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    const targets = LANGS.filter(l => l !== 'vi');
    const source = cleanContent(values.vi);
    setBusy(targets);
    const next: ContentByLang = { ...values, vi: source };
    let failed = 0;
    await Promise.all(targets.map(async l => {
      try {
        next[l] = await deepTranslate(source, l, ctrl.signal);
      } catch {
        if (!ctrl.signal.aborted) failed++;
      } finally {
        if (!ctrl.signal.aborted) setBusy(b => b.filter(x => x !== l));
      }
    }));
    if (ctrl.signal.aborted) return;
    setValues(next);
    persist(next, failed ? undefined : sourceKey(source));
    if (failed) toast(`Đã dịch ${targets.length - failed}/${targets.length} ngôn ngữ. Kiểm tra kết nối rồi thử lại.`);
    else { setLang('en'); toast('Đã dịch tự động sang 4 ngôn ngữ thành công! Đã chuyển sang tab Tiếng Anh.'); }
  };

  return (
    <div className="content-editor">
      <div className="content-editor-head">
        <div>
          <h3>Chỉnh sửa nội dung</h3>
          <p>Nhập tiếng Việt, sau đó dịch tự động ra 4 ngôn ngữ còn lại.</p>
        </div>
        <button type="button" className="btn-primary-custom" disabled={!dirty || translating} onClick={save}>
          <i className="bi bi-floppy" /> Lưu content
        </button>
      </div>

      <div className="content-editor-bar">
        <div className="content-lang-tabs" role="tablist" aria-label="Ngôn ngữ">
          {LANGS.map(l => {
            const done = l !== 'vi' && hasContent(values[l]);
            return (
              <button key={l} type="button" role="tab" aria-selected={lang === l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)}>
                {LANG_NAME[l]}
                <small>{l.toUpperCase()}</small>
                {busy.includes(l) ? <span className="spinner-border spinner-border-sm" aria-hidden /> : done && <i className="bi bi-check2" aria-label="Đã có bản dịch" />}
              </button>
            );
          })}
        </div>
        <button type="button" className="btn-primary-custom" disabled={translating} onClick={translate}>
          {translating ? <span className="spinner-border spinner-border-sm" aria-hidden /> : <i className="bi bi-magic" />}
          {translating ? `Đang dịch ${busy.length} ngôn ngữ...` : 'Dịch tự động ra 4 ngôn ngữ'}
        </button>
      </div>

      {(lang !== 'vi' || stale) && (
        <div className="content-editor-notes">
          {lang !== 'vi' && <span>Bản dịch tự động từ tiếng Việt, vẫn sửa tay được trước khi lưu. Gợi ý mờ là nội dung tiếng Việt.</span>}
          {stale && <span className="status-pill pending">Bản dịch cũ hơn tiếng Việt</span>}
        </div>
      )}

      <div className="content-section-tabs" role="tablist" aria-label="Phần nội dung">
        {SECTIONS.map(([id, label, icon]) => {
          const n = count(content, id);
          return (
            <button key={id} type="button" role="tab" aria-selected={section === id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}>
              <i className={`bi ${icon}`} />{label}{n > 0 && <em>{n}</em>}
            </button>
          );
        })}
      </div>

      <div className="content-section-body" role="tabpanel">
        {section === 'description' && <DescriptionTab value={content.description} onChange={description => patch({ description })} hint={hint} />}
        {section === 'amenities' && <AmenitiesTab value={content.amenities} onChange={amenities => patch({ amenities })} hint={hint} />}
        {section === 'privileges' && <PrivilegesTab value={content.privileges} onChange={privileges => patch({ privileges })} hint={hint} />}
        {section === 'about' && <AboutTab value={content.aboutSections} onChange={aboutSections => patch({ aboutSections })} hint={hint} />}
        {section === 'sensory' && <SensoryTab value={content.sensoryExperience} onChange={sensoryExperience => patch({ sensoryExperience })} hint={hint} />}
        {section === 'why' && <WhyTab value={content.whyChooseUs} onChange={whyChooseUs => patch({ whyChooseUs })} hint={hint} />}
      </div>

      {dirty && (
        <div className="content-editor-dirty">
          <span><i className="bi bi-exclamation-circle" /> Có thay đổi chưa lưu</span>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-light btn-sm" disabled={translating} onClick={() => setValues(baseline)}>Hoàn tác</button>
            <button type="button" className="btn-primary-custom" disabled={translating} onClick={save}>Lưu content</button>
          </div>
        </div>
      )}
    </div>
  );
}
