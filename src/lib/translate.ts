export const LANGS = ['vi', 'en', 'ko', 'ja', 'zh'] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_NAME: Record<Lang, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  ko: '한국어',
  ja: '日本語',
  zh: '中文'
};
const TARGET: Record<Lang, string> = { vi: 'vi', en: 'en', ko: 'ko', ja: 'ja', zh: 'zh-CN' };
const DELIMITER = '\n§§\n';

async function gtx(text: string, to: Lang, signal?: AbortSignal) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=${TARGET[to]}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  const out = Array.isArray(json?.[0]) ? json[0].map((p: unknown[]) => p?.[0] ?? '').join('') : '';
  if (!out.trim()) throw new Error('empty');
  return out as string;
}

async function myMemory(text: string, to: Lang, signal?: AbortSignal) {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=vi|${TARGET[to]}`,
    { signal }
  );
  const json = await res.json();
  const out = json?.responseData?.translatedText;
  if (!out) throw new Error('empty');
  return out as string;
}

const translateOne = (text: string, to: Lang, signal?: AbortSignal) =>
  gtx(text, to, signal).catch(() => myMemory(text, to, signal));

export async function translateFields(
  source: Record<string, string>,
  to: Lang,
  signal?: AbortSignal
) {
  const keys = Object.keys(source).filter((k) => source[k]?.trim());
  if (!keys.length) return {};
  try {
    const joined = await gtx(keys.map((k) => source[k].trim()).join(DELIMITER), to, signal);
    const parts = joined.split(/\s*§§\s*/).map((s) => s.trim());
    if (parts.length === keys.length) return Object.fromEntries(keys.map((k, i) => [k, parts[i]]));
  } catch (e) {
    if (signal?.aborted) throw e;
  }
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = await translateOne(source[k].trim(), to, signal);
  return out;
}

const SKIP_KEYS = new Set([
  'icon',
  'image',
  'imageUrl',
  'image1Url',
  'image2Url',
  'image3Url',
  'layout'
]);
type Ref = { path: (string | number)[]; value: string };

function collect(obj: unknown, path: (string | number)[] = [], refs: Ref[] = []): Ref[] {
  if (typeof obj === 'string') {
    const t = obj.trim();
    if (t && !t.startsWith('/') && !t.startsWith('http')) refs.push({ path, value: obj });
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => collect(item, [...path, i], refs));
  } else if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj))
      if (!SKIP_KEYS.has(k)) collect((obj as Record<string, unknown>)[k], [...path, k], refs);
  }
  return refs;
}

function apply<T>(obj: T, refs: Ref[], parts: string[]): T {
  const cloned = structuredClone(obj) as Record<string | number, unknown>;
  refs.forEach((ref, i) => {
    let cur = cloned as Record<string | number, unknown>;
    for (let j = 0; j < ref.path.length - 1; j++)
      cur = cur[ref.path[j]] as Record<string | number, unknown>;
    cur[ref.path[ref.path.length - 1]] = parts[i] ?? ref.value;
  });
  return cloned as T;
}

export async function deepTranslate<T>(obj: T, to: Lang, signal?: AbortSignal): Promise<T> {
  const refs = collect(obj);
  if (!refs.length) return structuredClone(obj);
  try {
    const joined = await gtx(
      refs.map((r) => r.value.replace(/\r?\n/g, ' ')).join(' ||| '),
      to,
      signal
    );
    const parts = joined.split(/\s*\|\|\|\s*/).map((s) => s.trim());
    if (parts.length === refs.length) return apply(obj, refs, parts);
  } catch (e) {
    if (signal?.aborted) throw e;
  }
  const parts: string[] = [];
  for (const r of refs) parts.push(await translateOne(r.value.trim(), to, signal));
  return apply(obj, refs, parts);
}
