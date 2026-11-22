import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Writable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { renderInfo, filmKind, projectsIn } from './scan.ts';
import { pageOf, serve, liveCapable } from './live.ts';
import { readScript } from './util.ts';
import { sourceRevision, invalidateSource } from './source-revision.ts';
import type { Project } from './types.ts';

const ROOT = path.resolve('.test-tmp', 'film-ts');
// An annotated script, as a TypeScript film writes it: the constants that scan and live match carry a type.
const ANNOTATED = `const fs: typeof import('fs') = require('fs');
const FPS: number = +(process.env.FPS || 30);
const CH: number = 60, VW: number = 1280, VH: number = 720;
const PAGE: string = process.env.PAGE || 'main.html';
const chunks: string[] = [];
if (process.env.ONLY) chunks.push('x');
`;
const PLAIN = ANNOTATED.replace("const fs: typeof import('fs') = ", 'const fs = ').replace(/: (number|string(\[\])?)/g, '');
function film(name: string, files: Record<string, string>) {
  const dir = path.join(ROOT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const [f, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), text);
  }
  return dir;
}

test('renderInfo detects render.ts, render.js, and prefers render.ts when both exist', () => {
  assert.equal(renderInfo(film('only-ts', { 'render.ts': ANNOTATED })).script, 'render.ts');
  assert.equal(renderInfo(film('only-js', { 'render.js': PLAIN })).script, 'render.js');
  assert.equal(renderInfo(film('both', { 'render.js': PLAIN, 'render.ts': ANNOTATED })).script, 'render.ts');
});

test('renderInfo reads fps, chunk size, size and ONLY support from an annotated render.ts', () => {
  const ts = renderInfo(film('annotated', { 'render.ts': ANNOTATED }));
  const js = renderInfo(film('plain', { 'render.js': PLAIN }));
  assert.deepEqual([ts.fps, ts.chunkFrames, ts.w, ts.h, ts.supportsOnly, ts.family], [30, 60, 1280, 720, true, 'A']);
  assert.deepEqual([ts.fps, ts.chunkFrames, ts.w, ts.h, ts.supportsOnly, ts.family], [js.fps, js.chunkFrames, js.w, js.h, js.supportsOnly, js.family]);
});

test('pageOf finds PAGE in an annotated render.ts and in a legacy render.js', () => {
  const asProject = (dir: string) => ({ path: dir }) as Project;
  const ts = film('page-ts', { 'render.ts': ANNOTATED, 'main.html': '', 'index.html': '' });
  const js = film('page-js', { 'render.js': PLAIN, 'main.html': '', 'index.html': '' });
  assert.equal(pageOf(asProject(ts), { script: 'render.ts', env: {} }, {}), 'main.html');
  assert.equal(pageOf(asProject(js), { script: 'render.js', env: {} }, {}), 'main.html');
});

async function request(dir: string, rel: string) {
  const out = { status: 0, headers: {} as Record<string, string>, body: '' };
  const res = new Writable({
    write(chunk, _enc, done) {
      out.body += chunk;
      done();
    }
  }) as Writable & { writeHead: (status: number, headers: Record<string, string>) => void };
  res.writeHead = (status, headers) => {
    out.status = status;
    out.headers = headers;
  };
  const finished = new Promise(resolve => res.on('finish', resolve));
  serve({} as IncomingMessage, res as unknown as ServerResponse, { id: 'a'.repeat(12), path: dir } as Project, rel);
  await finished;
  return out;
}

test('live serve answers a .ts file with its types stripped as JavaScript, and a .js file unchanged', async () => {
  const dir = film('serve', { 'film.ts': 'const n: number = 1;\nwindow.READY = true;\n', 'film.js': 'const n = 1;\n' });
  const ts = await request(dir, 'film.ts');
  assert.equal(ts.status, 200);
  assert.match(ts.headers['Content-Type'], /^text\/javascript/);
  assert.ok(!ts.body.includes(': number'));
  assert.ok(ts.body.includes('const n') && ts.body.includes('window.READY = true;'));
  assert.equal(ts.body, readScript(path.join(dir, 'film.ts')));
  const js = await request(dir, 'film.js');
  assert.equal(js.status, 200);
  assert.equal(js.body, 'const n = 1;\n');
});

test('live serve reports a .ts file that cannot be stripped instead of crashing', async () => {
  const dir = film('serve-bad', { 'film.ts': 'enum E { A }\n' });
  assert.equal((await request(dir, 'film.ts')).status, 500);
});

test('a film is live-capable when its page loads the renderOut hook from a .ts or a .js script', () => {
  const page = (src: string) => `<!doctype html><canvas id="c"></canvas><script src="${src}"></script>`;
  const hook = 'window.renderOut = function (t: number) {};\nwindow.READY = true;\n';
  const dirs = {
    ts: film('hook-ts', { 'index.html': page('film.ts'), 'film.ts': hook, 'render.ts': ANNOTATED }),
    js: film('hook-js', { 'index.html': page('film.js'), 'film.js': hook.replace(': number', ''), 'render.js': PLAIN }),
    none: film('hook-none', { 'index.html': page('film.ts'), 'film.ts': 'const x: number = 1;\n', 'render.ts': ANNOTATED }),
    src: film('hook-src', { 'index.html': '<canvas id="c"></canvas>', 'src/main.ts': hook, 'render.ts': ANNOTATED })
  };
  const capable = (id: string, dir: string, script: string) => liveCapable({ id, name: id, path: dir, studio: null, render: { script } } as unknown as Project);
  assert.equal(capable('hook-ts', dirs.ts, 'render.ts'), true);
  assert.equal(capable('hook-js', dirs.js, 'render.js'), true);
  assert.equal(capable('hook-none', dirs.none, 'render.ts'), false);
  assert.equal(capable('hook-src', dirs.src, 'render.ts'), true);
});

test('render.ts alone marks a folder as a code film, also inside a skipped helper folder name', () => {
  assert.equal(filmKind(film('mark-ts', { 'render.ts': ANNOTATED })), 'code');
  assert.equal(filmKind(film('mark-js', { 'render.js': PLAIN })), 'code');
  assert.equal(filmKind(film('mark-none', { 'notes.txt': 'x' })), null);
  const root = path.join(ROOT, 'container');
  fs.rmSync(root, { recursive: true, force: true });
  for (const [dir, file] of [
    ['assets', 'render.ts'],
    ['fonts', 'render.js'],
    ['tools', 'notes.txt']
  ]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
    fs.writeFileSync(path.join(root, dir, file), 'x');
  }
  const names = projectsIn({ path: root, type: 'container', enabled: true } as never)
    .map(p => p.name)
    .sort();
  assert.deepEqual(names, ['assets', 'fonts']); // a skipped helper name stays a project only with its own render script
});

test('a change to a .ts file changes the live source revision; a legacy .js file behaves as before', () => {
  for (const ext of ['ts', 'js']) {
    const dir = film('rev-' + ext, { ['film.' + ext]: 'v1' });
    const p = { path: dir, id: 'rev-' + ext } as never;
    const first = sourceRevision(p).revision;
    fs.writeFileSync(path.join(dir, 'film.' + ext), 'version2');
    invalidateSource(p);
    assert.notEqual(sourceRevision(p).revision, first, ext);
  }
});
