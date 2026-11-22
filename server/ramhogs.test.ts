import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readSource } from '../scripts/test-source.ts';
import type { ramHogsNow, ramNote } from './ramhogs.ts';

const source = readSource(new URL('./ramhogs.ts', import.meta.url))
  .replace(/^import .+;\r?$/gm, '')
  .replace(/\bexport /g, '');
type Row = { pid: number; ppid: number; name: string; rssBytes: number; cmd: string };
function harness(rows: Row[] | null, OS = 'linux') {
  const ctx: { OS: string; processList: () => Promise<Row[] | null>; hogs?: { ramHogsNow: typeof ramHogsNow; ramNote: typeof ramNote } } = {
    OS,
    processList: async () => rows
  };
  vm.createContext(ctx);
  vm.runInContext(source + '\nglobalThis.hogs = {ramHogsNow,ramNote};', ctx);
  return ctx.hogs!;
}

test('RAM hogs group ordinary browser processes and omit render browser trees and system processes', async () => {
  const row = (pid: number, ppid: number, name: string, rssBytes = 2 ** 30, cmd = ''): Row => ({ pid, ppid, name, rssBytes, cmd });
  const h = harness([
    row(1, 0, 'chrome', 2 ** 30, '--headless'),
    row(2, 1, 'chrome'),
    row(3, 0, 'chrome'),
    row(4, 3, 'chrome'),
    row(5, 0, 'systemd'),
    row(6, 0, 'node')
  ]);
  const result = await h.ramHogsNow();
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Chrome (browser)');
  assert.equal(result[0].bytes, 2 * 2 ** 30);
  assert.equal(result[0].procs, 2);
  assert.match(h.ramNote(result, 1024) as string, /Chrome.*2\.0 GB/);
});

test('RAM hogs tolerate an unavailable process list', async () => {
  assert.equal((await harness(null).ramHogsNow()).length, 0);
});

test('Linux RAM hogs omit the desktop and services while preserving ordinary user programs', async () => {
  const rows: Row[] = ['systemd', 'gnome-shell', 'kwin_wayland', 'pipewire', 'node', 'opencode', 'chromium', 'blender'].map((name, i) => ({
    pid: i + 1,
    ppid: 0,
    name,
    rssBytes: 2 ** 30,
    cmd: ''
  }));
  rows.push({ pid: 20, ppid: 0, name: 'chromium', rssBytes: 2 ** 30, cmd: '--headless' });
  rows.push({ pid: 21, ppid: 20, name: 'chromium', rssBytes: 2 ** 30, cmd: '' });
  const result = await harness(rows, 'linux').ramHogsNow();
  assert.deepEqual(Array.from(result, (r: { name: string }) => r.name).sort(), ['Blender', 'Chromium (browser)']);
  assert.equal(result.find((r: { name: string }) => r.name === 'Chromium (browser)')!.bytes, 2 ** 30);
});

test('macOS RAM hogs group browser helpers with their app and omit helpers belonging to a headless render', async () => {
  const row = (pid: number, ppid: number, name: string, cmd = ''): Row => ({ pid, ppid, name, cmd, rssBytes: 2 ** 30 });
  const rows = [
    row(1, 0, 'Google Chrome', '--headless'),
    row(2, 1, 'Google Chrome Helper (Renderer)'),
    row(3, 2, 'Google Chrome Helper (GPU)'),
    row(4, 0, 'Google Chrome'),
    row(5, 4, 'Google Chrome Helper (Renderer)'),
    row(6, 0, 'WindowServer'),
    row(7, 0, 'launchd')
  ];
  const result = await harness(rows, 'darwin').ramHogsNow();
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Chrome (browser)');
  assert.equal(result[0].procs, 2);
  assert.equal(result[0].bytes, 2 * 2 ** 30);
});
