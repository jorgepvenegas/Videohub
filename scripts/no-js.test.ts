// VideoHub's own source is TypeScript only. This walks the source folders (no git needed, so it also works in an
// install without .git) and fails on any JavaScript file.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', 'dist', '.test-tmp', 'data', '.agents', '.claude', '.git', 'docs']);
const JS = /\.(js|mjs|cjs|jsx)$/;

test('no JavaScript source files remain', () => {
  const found: string[] = [];
  (function walk(dir: string, rel: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!rel && SKIP.has(e.name)) continue;
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), r);
      else if (JS.test(e.name)) found.push(r);
    }
  })(root, '');
  assert.deepEqual(found, [], 'VideoHub source is TypeScript only; convert or remove these JavaScript files: ' + found.join(', '));
});
