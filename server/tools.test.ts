import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

// tools.js talks to the hub over HTTP; a fake hub answers /api/ping and /api/config so no real hub is touched
const films = path.resolve('.test-tmp', 'tools-fixture', 'films');
const cfg = {
  workspace: path.dirname(films),
  roots: [{ path: films, type: 'container', enabled: true }],
  outputsDir: path.resolve('.test-tmp', 'tools-fixture', 'outputs'),
  soundLibDir: 's',
  thumbstudio: { globalDir: 't' },
  archiveDir: 'a'
};
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(req.url === '/api/config' ? cfg : { ok: true }));
});
await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
process.env.VIDEOHUB_PORT = String((server.address() as AddressInfo).port);
process.env.VIDEOHUB_DATA_DIR ||= path.resolve('.test-tmp', 'tools-data');
const { TOOLS } = await import('./tools.ts');
test.after(() => server.close());

test('hub_workspace guidance uses the platform path separator', async () => {
  const line = (await TOOLS.hub_workspace.run({})).split('\n').find(l => l.startsWith('New films go in:'));
  assert.equal(
    line,
    `New films go in: ${path.join(films, '<film-name>')}  (one folder per film; copy ${path.join('templates', 'new-film')} from the VideoHub folder)`
  );
  if (path.sep === '/') assert.ok(!line.includes('\\'), 'no backslashes on POSIX: ' + line);
  else assert.ok(line.includes('\\<film-name>') && line.includes('templates\\new-film'));
});
