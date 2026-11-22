// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createPlatform } from './platform.ts';

const alive = pid => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const wait = async (cond, ms = 5000) => {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise(r => setTimeout(r, 25))) if (await cond()) return true;
  return false;
};
// Simulated puppeteer render: ignores SIGTERM and relaunches a detached child (own process group) whenever its child exits.
const ROOT = `const{spawn}=require('node:child_process'),fs=require('node:fs'),log=process.argv[1];process.on('SIGTERM',()=>{});
const go=(d)=>{const c=spawn(process.execPath,['-e','setInterval(()=>{},1e3)'],{detached:d,stdio:'ignore'});fs.appendFileSync(log,c.pid+'\\n');c.on('exit',()=>go(true));};go(false);setInterval(()=>{},1e3);`;

test('Unix Stop leaves neither the root nor relaunched detached children', async () => {
  const base = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.test-tmp');
  fs.mkdirSync(base, { recursive: true });
  const dir = fs.mkdtempSync(path.join(base, 'killtree-')),
    log = path.join(dir, 'pids.txt');
  fs.writeFileSync(log, '');
  const pids = () => fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map(Number);
  const root = spawn(process.execPath, ['-e', ROOT, log], { detached: true, stdio: 'ignore' });
  try {
    assert.ok(await wait(() => pids().length >= 1), 'first child started');
    const { killTree } = createPlatform({ delay: () => new Promise(r => setTimeout(r, 300)) });
    await killTree(root.pid);
    await new Promise(r => setTimeout(r, 500));
    const all = [root.pid, ...pids()];
    assert.ok(await wait(() => all.every(p => !alive(p)), 1500), 'alive after Stop: ' + all.filter(alive).join(','));
  } finally {
    for (const p of [root.pid, ...pids()])
      try {
        process.kill(p, 'SIGKILL');
      } catch {}
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
