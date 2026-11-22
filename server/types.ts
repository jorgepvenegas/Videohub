// Types shared by two or more server modules. Type-only: no runtime code.
import type { IncomingMessage, ServerResponse } from 'node:http';

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
  hiddenProjects?: { key: string; [key: string]: unknown }[];
  [key: string]: unknown;
}

// A program group holding RAM next to a render (ramhogs scan result).
export interface RamHog {
  name: string;
  bytes: number;
  procs: number;
}

// What source-revision needs from a catalog entry.
export interface SourceProject {
  id?: string;
  path: string;
  studio?: string | null;
  group?: unknown;
  rootType?: string;
}

// A catalog entry as scan.mk() creates it, before it is described.
export interface ProjectBase {
  id: string;
  name: string;
  path: string;
  root: string;
  rootType: string;
  studio?: string;
  outDir?: string;
  family?: string;
  group?: string;
  groupFiles?: string[];
}

// How a film renders, read from its render script and manifest by scan.renderInfo().
export interface RenderInfo {
  family: string | null | undefined;
  fps?: number | null;
  chunkFrames?: number | null;
  chunkSec?: number | null;
  supportsOnly?: boolean;
  script?: string | null;
  w?: number | null;
  h?: number | null;
  manifest?: boolean;
}

// One finished video of a project (probe fields are present when ffprobe could read it).
export interface OutputEntry extends Omit<ProbeInfo, 'ok'> {
  path: string;
  rel: string;
  name: string;
  size: number;
  mtime: number;
  role: string;
  coveredBy: string | null;
  ok?: boolean;
  dupOf?: string;
}

// A described film or loose-video group: the catalog entry the scan serves and the other modules read.
export interface Project extends ProjectBase {
  title: string;
  render: RenderInfo;
  status: string;
  statusAuto?: boolean;
  meta: Json;
  sizes: Record<string, number>;
  outputs: OutputEntry[];
  latest: string | null | undefined;
  filmDur?: number | null;
  finalSize: number;
  notesOpen: number;
  notesTotal: number;
  versions: number;
  counts: Record<string, number>;
  updated: number;
  emptyNote?: string;
}

// The route registration the hub hands to each module's routes(route, readBody, ...).
export type RouteHandler = (req: IncomingMessage, url: URL, params: Record<string, string>, res: ServerResponse) => unknown;
export type RouteFn = (method: string, pattern: string, fn: RouteHandler) => unknown;
export type ReadBody = (req: IncomingMessage) => Promise<Json>;

// A render-queue entry (data/jobs.json). The named fields are always set by create(); the rest are added as the job runs.
export interface Job {
  id: string;
  project: string;
  projectName: string;
  path: string;
  mode: string;
  state: string;
  createdAt: string;
  session: Json;
  notes: string[];
  env: Record<string, string>;
  workers: number;
  progress: number;
  position?: number | null;
  [key: string]: Json; // jobs carry many optional fields (phase, log, pid, output, versions ...)
}

// What recipe() works out about how a film renders.
export interface Recipe {
  workers: number;
  env: Record<string, string>;
  script: string | null;
  fps: number;
  chunkFrames: number | null;
  chunkSec: number | null;
  chunks: number | null;
  studio?: boolean;
  durInferred?: boolean;
  [key: string]: Json; // render settings from project.json (mux, ...)
}

// A review note as notes.json stores it (see notes.add()).
export interface Note {
  id: number;
  t: number;
  t2: number | null;
  at: number | null;
  kind: string;
  layer: string | null;
  text: string;
  region: Json;
  drawing: Json;
  file: string | null;
  fileMtime: number | null;
  fps: number | null;
  frame: number | null;
  frames: [number, number] | null;
  chunks: number[] | null;
  say: string | null;
  images: Record<string, string>;
  status: string;
  reply: string | null;
  fixedIn: string | null;
  history: { at: string; status: string; by: string; note?: string }[];
  createdAt: string;
  pending?: boolean;
  imgV?: number;
  [key: string]: Json; // fields the page or an older version added
}
