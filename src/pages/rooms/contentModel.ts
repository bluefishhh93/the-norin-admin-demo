import { LANGS, type Lang } from '../../lib/translate';

export type AmenityItem = { icon: string; label: string };
export type SensoryBullet = { sense: string; description: string };
export type AboutSection = { title: string; description: string; layout?: string };
export type RoomContent = {
  description: string;
  amenities: AmenityItem[];
  privileges: string[];
  aboutSections: AboutSection[];
  sensoryExperience: { title: string; bullets: SensoryBullet[] };
  whyChooseUs: { title: string; description: string };
};
export type ContentByLang = Record<Lang, RoomContent>;
export type StoredContent = Partial<Record<Lang, unknown>> & { _meta?: { source?: string } };

export const SENSORY_TITLE = 'Trải nghiệm đa giác quan';

export const defaultContent = (): RoomContent => ({
  description: '',
  amenities: [],
  privileges: [],
  aboutSections: [],
  sensoryExperience: { title: SENSORY_TITLE, bullets: [] },
  whyChooseUs: { title: '', description: '' }
});

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const lines = (v: string) => v.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
const arr = <T>(v: unknown, map: (x: unknown) => T): T[] => (Array.isArray(v) ? v.map(map) : []);
const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

export function normalizeContent(raw: unknown): RoomContent {
  const r = obj(raw);
  const sensory = obj(r.sensoryExperience);
  const why = obj(r.whyChooseUs);
  return {
    description: str(r.description),
    amenities: typeof r.amenities === 'string'
      ? lines(r.amenities).map(label => ({ icon: '', label }))
      : arr(r.amenities, x => ({ icon: str(obj(x).icon), label: str(obj(x).label) })),
    privileges: typeof r.privileges === 'string' ? lines(r.privileges) : arr(r.privileges, str),
    aboutSections: typeof r.aboutSections === 'string'
      ? (r.aboutSections.trim() ? [{ title: '', description: r.aboutSections.trim(), layout: 'image-left' }] : [])
      : arr(r.aboutSections, x => ({ title: str(obj(x).title), description: str(obj(x).description), layout: str(obj(x).layout) || 'image-left' })),
    sensoryExperience: typeof r.sensoryExperience === 'string'
      ? { title: SENSORY_TITLE, bullets: r.sensoryExperience.trim() ? [{ sense: '', description: r.sensoryExperience.trim() }] : [] }
      : { title: 'title' in sensory ? str(sensory.title) : SENSORY_TITLE, bullets: arr(sensory.bullets, x => ({ sense: str(obj(x).sense), description: str(obj(x).description) })) },
    whyChooseUs: typeof r.whyChooseUs === 'string'
      ? { title: '', description: r.whyChooseUs }
      : { title: str(why.title), description: str(why.description) }
  };
}

export function cleanContent(c: RoomContent): RoomContent {
  return {
    description: c.description.trim(),
    amenities: c.amenities.map(a => ({ icon: a.icon, label: a.label.trim() })).filter(a => a.icon || a.label),
    privileges: c.privileges.map(p => p.trim()).filter(Boolean),
    aboutSections: c.aboutSections.map(s => ({ title: s.title.trim(), description: s.description.trim(), layout: s.layout || 'image-left' })).filter(s => s.title || s.description),
    sensoryExperience: {
      title: c.sensoryExperience.title.trim(),
      bullets: c.sensoryExperience.bullets.map(b => ({ sense: b.sense.trim(), description: b.description.trim() })).filter(b => b.sense || b.description)
    },
    whyChooseUs: { title: c.whyChooseUs.title.trim(), description: c.whyChooseUs.description.trim() }
  };
}

export const hasContent = (c: RoomContent) => {
  const x = cleanContent(c);
  return !!(x.description || x.amenities.length || x.privileges.length || x.aboutSections.length || x.sensoryExperience.bullets.length || x.whyChooseUs.title || x.whyChooseUs.description);
};

export const sourceKey = (vi: RoomContent) => JSON.stringify(cleanContent(vi));

export function loadContent(stored: StoredContent | undefined, defaults?: Partial<RoomContent>): ContentByLang {
  return Object.fromEntries(LANGS.map(l => {
    const raw = stored?.[l];
    const c = normalizeContent(raw);
    return [l, l === 'vi' && !raw && defaults ? { ...c, ...defaults } : c];
  })) as ContentByLang;
}

export function contentStatus(stored: StoredContent | undefined) {
  const all = loadContent(stored);
  const hasVi = hasContent(all.vi);
  const stale = hasVi && stored?._meta?.source !== sourceKey(all.vi);
  const langs = LANGS.map(l => ({ lang: l, done: hasVi && hasContent(all[l]) }));
  return { hasVi, stale, langs, translated: langs.filter(x => x.lang !== 'vi' && x.done).length };
}
