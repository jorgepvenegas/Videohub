import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createPlatform } from './platform.js';

const skip =
  process.env.VIDEOHUB_REAL_TRASH_TEST !== '1'
    ? 'moves a folder to the real Trash; set VIDEOHUB_REAL_TRASH_TEST=1 to run'
    : process.platform !== 'darwin'
      ? 'macOS only'
      : spawnSync('osascript', ['-e', '1']).status !== 0
        ? 'osascript unavailable'
        : false;

test('real Finder moves a throwaway folder to the Trash', { skip }, async () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.test-tmp'),
    dir = path.join(root, 'trash-' + process.pid + '-' + Date.now());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'x.txt'), 'x');
  const [r] = await createPlatform().trash([dir]);
  assert.equal(r.ok, true, r.error);
  assert.equal(fs.existsSync(dir), false);
});
