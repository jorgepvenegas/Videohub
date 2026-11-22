// Stored values (note statuses, note kinds, project statuses, thumbnail statuses …) and their legacy aliases.
// VideoHub writes the English values. Files written by older (Turkish) versions use the Turkish words; they are mapped
// to the English ones when a file is read (server/legacy.js) and the hub_* tools accept them as input aliases.
// A plain module: the UI (labels) and the server (normalising) both import it.

export const NOTE_STATUSES = ['open', 'claude', 'fixed', 'approved', 'reopened'];
export const NOTE_KINDS = ['visual', 'timing', 'sound', 'text', 'general'];
export const PROJECT_STATUSES = ['in-progress', 'review', 'revision', 'approved', 'published', 'archived', 'done'];
export const THUMB_STATUSES = ['draft', 'generating', 'chosen', 'final'];
export const THUMB_NOTE_STATUSES = ['open', 'claude', 'fixed'];

// old Turkish value → English value
const LEGACY_NOTE_STATUS: Record<string, string> = { açık: 'open', düzeltildi: 'fixed', onaylandı: 'approved', 'hâlâ var': 'reopened', 'hala var': 'reopened' };
const LEGACY_NOTE_KIND: Record<string, string> = { görsel: 'visual', zamanlama: 'timing', ses: 'sound', metin: 'text', genel: 'general' };
const LEGACY_PROJECT_STATUS: Record<string, string> = {
  yapım: 'in-progress',
  inceleme: 'review',
  revizyon: 'revision',
  onaylandı: 'approved',
  yayınlandı: 'published',
  arşiv: 'archived',
  tamamlandı: 'done'
};
const LEGACY_THUMB_STATUS: Record<string, string> = { taslak: 'draft', üretiliyor: 'generating', seçildi: 'chosen' };
const LEGACY_BY: Record<string, string> = { kullanıcı: 'user' };

// the old words, accepted as input aliases (hub_* tools, API bodies)
export const NOTE_STATUS_ALIASES = Object.keys(LEGACY_NOTE_STATUS);
export const PROJECT_STATUS_ALIASES = Object.keys(LEGACY_PROJECT_STATUS);

type Rec = Record<string, unknown>;
const pick =
  (map: Record<string, string>, list: string[]) =>
  <T>(v: T): T | string => {
    if (typeof v !== 'string') return v;
    if (list.includes(v)) return v;
    const k = v.trim().toLowerCase();
    return list.includes(k) ? k : (map[k] ?? map[v] ?? v);
  };
export const noteStatus = pick(LEGACY_NOTE_STATUS, NOTE_STATUSES);
export const noteKind = pick(LEGACY_NOTE_KIND, NOTE_KINDS);
export const projectStatus = pick(LEGACY_PROJECT_STATUS, PROJECT_STATUSES);
export const thumbStatus = pick(LEGACY_THUMB_STATUS, THUMB_STATUSES);
export const thumbNoteStatus = pick(LEGACY_NOTE_STATUS, THUMB_NOTE_STATUSES);
export const byWho = <T>(v: T): T | string => (typeof v === 'string' && LEGACY_BY[v.toLowerCase()]) || v;

// notes still waiting for Claude / the user
export const isOpenNote = (n: Rec | null | undefined) => n && (n.status === 'open' || n.status === 'reopened');

// one stored note → current values (in place; returns it)
export function normalizeNote<T>(note: T): T {
  if (!note || typeof note !== 'object') return note;
  const n = note as Rec;
  if (n.status !== undefined) n.status = noteStatus(n.status);
  if (n.kind !== undefined) n.kind = noteKind(n.kind);
  if (Array.isArray(n.history))
    for (const h of n.history as Rec[])
      if (h && typeof h === 'object') {
        if (h.status !== undefined) h.status = noteStatus(h.status);
        if (h.by !== undefined) h.by = byWho(h.by);
      }
  return note;
}
export const normalizeNotes = <T>(arr: T) => (Array.isArray(arr) ? arr.map(normalizeNote) : arr);
export function normalizeMeta<T>(meta: T): T {
  const m = meta as Rec | null;
  if (m && typeof m === 'object' && m.status !== undefined) m.status = projectStatus(m.status);
  return meta;
}

// labels the UI shows
export const NOTE_STATUS_LABEL: Record<string, string> = { open: 'open', claude: 'with agent', fixed: 'fixed', approved: 'approved', reopened: 'still there' };
export const NOTE_KIND_LABEL: Record<string, string> = { visual: 'visual', timing: 'timing', sound: 'sound', text: 'text', general: 'general' };
export const PROJECT_STATUS_LABEL: Record<string, string> = {
  'in-progress': 'in progress',
  review: 'in review',
  revision: 'revision',
  approved: 'approved',
  published: 'published',
  archived: 'archived',
  done: 'done'
};
export const THUMB_STATUS_LABEL: Record<string, string> = { draft: 'Draft', generating: 'Generating', chosen: 'Chosen', final: 'Final' };
