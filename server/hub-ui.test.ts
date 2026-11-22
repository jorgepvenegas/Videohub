import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { readSource } from '../scripts/test-source.ts';
import { isInside } from './util.ts';

const source = readSource(new URL('./hub.ts', import.meta.url));
const between = (from: string, to: string) => source.slice(source.indexOf(from), source.indexOf(to, source.indexOf(from)));
const SCRATCH = path.resolve('.test-tmp', 'hub-ui');

// runs the hub's GET fallthrough (live film pages, then the static UI) against a scratch program folder
function setup(name: string, built: boolean) {
  const HUB_DIR = path.join(SCRATCH, name);
  fs.rmSync(HUB_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(HUB_DIR, 'dist', 'ui', '_vh'), { recursive: true });
  if (built) {
    fs.writeFileSync(path.join(HUB_DIR, 'dist', 'ui', 'index.html'), '<!doctype html>built ui');
    fs.writeFileSync(path.join(HUB_DIR, 'dist', 'ui', '_vh', 'app-1.js'), 'export {}');
  }
  const film = path.join(HUB_DIR, 'film');
  fs.mkdirSync(path.join(film, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(film, 'assets', 'x.png'), 'png');
  const served: string[] = [];
  const ctx = vm.createContext({
    path,
    fs,
    HUB_DIR,
    isInside,
    decodeURIComponent,
    project: () => ({ id: 'a'.repeat(12), path: film }),
    live: { serve: (_req: unknown, _res: unknown, _lp: unknown, rel: string) => served.push(rel) },
    send: () => {}
  });
  const code = between('const UI =', '// ---------- UI version');
  const from = source.indexOf('// a film page for live preview');
  const body = source.slice(from, source.indexOf('  } catch (e', from));
  vm.runInContext(code + `\nglobalThis.handle = async (req, url, res) => {${body}};`, ctx);
  const get = async (pathname: string, headers: Record<string, string> = {}) => {
    const res = {
      status: 0,
      body: '',
      headersSent: false,
      writeHead(status: number) {
        this.status = status;
      },
      end(chunk: string) {
        this.body += chunk;
      },
      destroy() {},
      on() {
        return this;
      },
      write() {},
      once() {
        return this;
      },
      emit() {}
    };
    const streamed: string[] = [];
    const realCreate = fs.createReadStream;
    (fs as { createReadStream: unknown }).createReadStream = (f: string) => {
      streamed.push(f);
      return { on: () => ({ pipe: () => {} }) };
    };
    try {
      await ctx.handle({ headers }, new URL('http://x' + pathname), res);
    } finally {
      (fs as { createReadStream: unknown }).createReadStream = realCreate;
    }
    return { res, streamed };
  };
  return { HUB_DIR, served, get };
}

test('the hub serves the UI and its _vh assets from dist/ui', async () => {
  const { HUB_DIR, get } = setup('built', true);
  const root = await get('/');
  assert.equal(root.res.status, 200);
  assert.deepEqual(root.streamed, [path.join(HUB_DIR, 'dist', 'ui', 'index.html')]);
  const asset = await get('/_vh/app-1.js');
  assert.deepEqual(asset.streamed, [path.join(HUB_DIR, 'dist', 'ui', '_vh', 'app-1.js')]);
});

test('without a build the hub answers 503 with a page that names the fix', async () => {
  const { get } = setup('missing', false);
  const { res, streamed } = await get('/');
  assert.equal(res.status, 503);
  assert.match(res.body, /not built/);
  assert.match(res.body, /update\.sh/);
  assert.deepEqual(streamed, []);
});

test('a live film page keeps its own absolute /assets requests', async () => {
  const { get, served } = setup('film', true);
  const { streamed } = await get('/assets/x.png', { referer: 'http://x/live/' + 'a'.repeat(12) + '/index.html' });
  assert.deepEqual(served, ['assets/x.png']);
  assert.deepEqual(streamed, []);
});
