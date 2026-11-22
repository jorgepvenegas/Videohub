// Shared helpers: paths, JSON files, child processes, ffprobe with a cache.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { dirs, TOOLS, pathKey, casePath } from './platform.ts';
export { TOOLS } from './platform.ts';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import type { ExecFileOptions } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Json, ProbeInfo, RunResult } from './types.ts';

export const HUB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// VIDEOHUB_DATA_DIR: pnpm test keeps its config, caches and queue out of the install's own data folder
export const DATA_DIR = process.env.VIDEOHUB_DATA_DIR ? path.resolve(process.env.VIDEOHUB_DATA_DIR) : path.join(HUB_DIR, 'data');
export const HOME = dirs.home,
  DESKTOP = dirs.desktop,
  DOCUMENTS = dirs.documents,
  TEMP = dirs.temp;
fs.mkdirSync(DATA_DIR, { recursive: true });

export const idOf = (p: string) => crypto.createHash('sha1').update(pathKey(p)).digest('hex').slice(0, 12);
export const norm = pathKey;
// Resolve links for each check: a persistent cache would authorize paths after a junction is retargeted.
function realNorm(p: string, cache: Map<string, string | null>): string | null {
  let current = path.resolve(p);
  const original = norm(current),
    missing = [];
  for (;;) {
    const key = norm(current);
    let real!: string | null;
    if (cache.has(key)) real = cache.get(key) as string | null;
    else {
      let resolveError: NodeJS.ErrnoException | null = null;
      try {
        real = pathKey(fs.realpathSync.native(current));
      } catch (e) {
        resolveError = e as NodeJS.ErrnoException;
        // The native call fails with EISDIR/UNKNOWN/EPERM on some virtual drives (Google Drive for desktop, RAM disks);
        // Node's own resolver still follows every link there, so the check stays link-aware instead of failing.
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT' && (e as NodeJS.ErrnoException).code !== 'ENOTDIR')
          try {
            real = pathKey(fs.realpathSync(current));
            resolveError = null;
          } catch (e2) {
            resolveError = e2 as NodeJS.ErrnoException;
          }
      }
      if (!resolveError) cache.set(key, real);
      else {
        const e = resolveError;
        if (e.code !== 'ENOENT' && e.code !== 'ENOTDIR') {
          cache.set(key, null);
          return null;
        }
        // ENOENT also describes dangling links; a later write could create their target outside the root.
        try {
          if (fs.lstatSync(current).isSymbolicLink()) return null;
        } catch (statError) {
          if ((statError as NodeJS.ErrnoException).code !== 'ENOENT' && (statError as NodeJS.ErrnoException).code !== 'ENOTDIR') return null;
        }
        const parent = path.dirname(current);
        if (parent === current) return null;
        missing.unshift(path.basename(current));
        current = parent;
        continue;
      }
    }
    // New destinations still inherit the real location of their nearest existing ancestor.
    const resolved = real === null ? null : pathKey(path.join(real, ...missing));
    cache.set(original, resolved);
    return resolved;
  }
}
export const isInside = (child: string, parent: string) => {
  const cache = new Map<string, string | null>(),
    c = realNorm(child, cache),
    p = realNorm(parent, cache);
  return c !== null && p !== null && (c === p || c.startsWith(p.endsWith(path.sep) ? p : p + path.sep));
};
// does a command line or path refer to a path inside this install? Never by folder name: films live in Documents\VideoHub\films
// and the install folder can have any name (a GitHub ZIP unpacks as VideoHub-main). Case-insensitive, both slash styles.
const slashes = (s?: string) => casePath(s || '').replace(/[\\/]+/g, '/');
export const refersToHub = (s: string | undefined, hub = HUB_DIR) =>
  new RegExp(
    slashes(hub)
      .replace(/\/$/, '')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:/|["\'\\s]|$)'
  ).test(slashes(s));
export const shortPath = (p: string) =>
  (isInside(p, DESKTOP) ? path.relative(DESKTOP, p) : isInside(p, HOME) ? '~' + path.sep + path.relative(HOME, p) : p) || p;

export function readJson(file: string, fallback: Json = null): Json {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}
// write via a temp file so readers never see half a file
export function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
  fs.renameSync(tmp, file);
}

export function run(cmd: string, args: string[], opts: ExecFileOptions = {}): Promise<RunResult> {
  return new Promise<RunResult>(resolve => {
    execFile(cmd, args, { maxBuffer: 64 << 20, ...opts }, (err, stdout, stderr) =>
      resolve({ code: err ? (err.code ?? 1) : 0, stdout: String(stdout || ''), stderr: String(stderr || '') })
    );
  });
}

// Retained for older integrations; new OS operations belong in platform.js.

export async function pLimit<T, R>(items: T[], n: number, fn: (item: T, index: number) => R | Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    })
  );
  return out;
}

// ---------- tools on this PC
// ---------- ffprobe with a persistent cache (path + size + mtime)
const PROBE_CACHE = path.join(DATA_DIR, 'probe-cache.json');
let probeCache: Record<string, { sig: string; info: ProbeInfo }> = readJson(PROBE_CACHE, {});
let probeDirty = false;
export function flushProbeCache() {
  if (probeDirty) {
    writeJson(PROBE_CACHE, probeCache);
    probeDirty = false;
  }
}
export async function probe(file: string, st?: { size: number; mtimeMs: number }): Promise<ProbeInfo> {
  st = st || fs.statSync(file);
  const key = norm(file),
    sig = st.size + ':' + Math.round(st.mtimeMs);
  const hit = probeCache[key];
  if (hit && hit.sig === sig) return hit.info;
  const r = await run(TOOLS.ffprobe, [
    '-v',
    'error',
    '-show_entries',
    'format=duration,bit_rate:stream=codec_type,width,height,r_frame_rate',
    '-of',
    'json',
    file
  ]);
  let info: ProbeInfo = { ok: false };
  try {
    const j = JSON.parse(r.stdout),
      v = (j.streams || []).find((s: { codec_type?: string }) => s.codec_type === 'video');
    const [a, b] = String(v?.r_frame_rate || '0/1')
      .split('/')
      .map(Number);
    info = {
      ok: !!v,
      dur: +(+j.format?.duration || 0).toFixed(2),
      bitrate: +j.format?.bit_rate || 0,
      w: v?.width || 0,
      h: v?.height || 0,
      fps: b ? Math.round((a / b) * 100) / 100 : 0,
      audio: (j.streams || []).some((s: { codec_type?: string }) => s.codec_type === 'audio')
    };
  } catch {}
  probeCache[key] = { sig, info };
  probeDirty = true;
  return info;
}

// quick content fingerprint for duplicate detection: size + first and last 1 MB
export async function fingerprint(file: string, size: number) {
  const fd = await fsp.open(file, 'r');
  try {
    const n = Math.min(size, 1 << 20),
      a = Buffer.alloc(n),
      b = Buffer.alloc(n);
    await fd.read(a, 0, n, 0);
    await fd.read(b, 0, n, Math.max(0, size - n));
    return crypto.createHash('sha1').update(a).update(b).update(String(size)).digest('hex');
  } finally {
    await fd.close();
  }
}

export function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export const fmtGB = (b: number) => (b / 1073741824).toFixed(b >= 10 * 1073741824 ? 0 : 1) + ' GB';
export const now = () => new Date().toISOString();
