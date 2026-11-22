// The one place where stored files are read with their legacy (Turkish) values mapped to the English ones
// (ui/values.js has the maps). Everything that reads notes.json or project.json goes through here; what is written
// afterwards is in English, so old files move over by themselves the next time they are saved.
import { readJson } from './util.ts';
import { normalizeNotes, normalizeMeta } from '../ui/values.ts';

export const readNotes = (file: string) => {
  const a = readJson(file, []);
  return Array.isArray(a) ? normalizeNotes(a) : [];
};
export const readMeta = (file: string, fallback = {}) => {
  const m = readJson(file, null);
  return m && typeof m === 'object' ? normalizeMeta(m) : fallback;
};
export * from '../ui/values.ts';
