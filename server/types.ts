// Types shared by two or more server modules. Type-only: no runtime code.

// Parsed JSON whose shape the reading module owns (stored files, ffprobe and tool output).
export type Json = any; // any: JSON.parse results are untyped and each reader narrows its own fields

// What util.run() and the platform layer's run() resolve to; `code` is 0, a numeric exit code or an errno string.
export interface RunResult {
  code: number | string;
  stdout: string;
  stderr: string;
}

// One row of the platform process list (`start` is an identity that rejects PID reuse).
export interface ProcessRow {
  pid: number;
  ppid: number;
  rssBytes: number;
  name: string;
  cmd: string;
  start: string;
  headless?: boolean;
}

// One result of the platform's reversible Trash.
export interface TrashResult {
  path: string;
  ok: boolean;
  error: string | null;
}

// ffprobe summary cached by util.probe(); `{ ok: false }` when the file has no video stream or ffprobe failed.
export interface ProbeInfo {
  ok: boolean;
  dur?: number;
  bitrate?: number;
  w?: number;
  h?: number;
  fps?: number;
  audio?: boolean;
}

// One entry of config.roots: a folder the scan reads (container: every sub-folder is a film; project: the folder is one film; media: loose videos).
export interface Root {
  path: string;
  type: 'container' | 'project' | 'media';
  enabled: boolean;
}

// data/config.json after normalise(); keys that setup or the user add beyond the known ones stay readable as `unknown`.
export interface Config {
  port: number;
  agentName: string;
  outputsDir: string;
  soundLibDir: string;
  archiveDir: string;
  studioDir: string | null;
  skipFolders: string[];
  maxParallelRenders: number;
  secondRenderMinFreeMB: number;
  snapsMaxAgeDays: number;
  tempMaxAgeDays: number;
  bloatWarnRatio: number;
  thumbstudio: { globalDir: string; templatesDir: string; styleRefsDir: string };
  render: { encoder: string; [key: string]: unknown };
  roots: Root[];
  baseDir?: string;
  [key: string]: unknown;
}

// A program group holding RAM next to a render (ramhogs scan result).
export interface RamHog {
  name: string;
  bytes: number;
  procs: number;
}

// A film or loose-video entry of the catalog (scan.js builds it; the other modules read the fields they need).
export interface Project {
  id?: string;
  path: string;
  studio?: string | null;
  group?: unknown;
  rootType?: string;
  [key: string]: unknown;
}
