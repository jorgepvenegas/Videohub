// OS integration lives here so queue, cleanup and UI retain the same contracts.
import fsDefault from 'node:fs';
import osDefault from 'node:os';
import pathDefault from 'node:path';
import { spawn as spawnDefault, execFile, execFileSync } from 'node:child_process';
import type { ExecFileOptions, ExecFileSyncOptions } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { ProcessRow, RunResult, TrashResult } from './types.ts';
const install = pathDefault.resolve(pathDefault.dirname(fileURLToPath(import.meta.url)), '..');
function runDefault(file: string, args: string[], opts: ExecFileOptions = {}): Promise<RunResult> {
  return new Promise<RunResult>(resolve =>
    execFile(file, args, { maxBuffer: 64 << 20, ...opts }, (e, stdout, stderr) =>
      resolve({ code: e?.code ?? 0, stdout: String(stdout || ''), stderr: String(stderr || '') })
    )
  );
}
// Dependencies are injectable: both OS contracts can be tested on any host.
export interface PlatformDeps {
  osName?: string;
  env?: NodeJS.ProcessEnv;
  home?: string;
  temp?: string;
  fs?: typeof fsDefault;
  os?: typeof osDefault;
  path?: typeof pathDefault;
  spawn?: typeof spawnDefault;
  run?: (file: string, args: string[], opts?: ExecFileOptions) => Promise<RunResult>;
  runSync?: (file: string, args: string[], opts?: ExecFileSyncOptions) => string | Buffer;
  hubDir?: string;
  kill?: (pid: number, signal?: string | number) => unknown;
  uid?: () => number | null;
  delay?: (ms: number) => Promise<unknown>;
  now?: () => number;
  desktopDir?: string | null;
  nodePath?: string;
}
interface Dirs {
  home: string;
  desktop: string;
  documents: string;
  config: string;
  temp: string;
  guard: string;
}
export function createPlatform({
  osName: OS = process.platform,
  env = process.env,
  home = osDefault.homedir(),
  temp = osDefault.tmpdir(),
  fs = fsDefault,
  os = osDefault,
  path = pathDefault,
  spawn = spawnDefault,
  run = runDefault,
  runSync = execFileSync,
  hubDir = install,
  kill = process.kill.bind(process),
  uid = () => process.getuid?.() ?? null,
  delay = ms => new Promise(r => setTimeout(r, ms)),
  now = Date.now,
  desktopDir = null,
  nodePath = process.execPath
}: PlatformDeps = {}) {
  const IS_MAC = OS === 'darwin',
    IS_LINUX = OS === 'linux';
  const exists = (f: string) => {
    try {
      return fs.existsSync(f);
    } catch {
      return false;
    }
  };
  // Login services omit shell setup; include Homebrew's standard locations for the documented macOS install.
  const toolDirs = [
    ...new Set(
      (env.PATH || '')
        .split(':')
        .filter(Boolean)
        .concat(IS_MAC ? ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'] : [])
    )
  ];
  function findTool(name: string): string | null {
    for (const d of toolDirs) {
      const f = path.resolve(d, name);
      try {
        if (!fs.statSync(f).isFile()) continue;
        fs.accessSync(f, fs.constants?.X_OK ?? 1);
        return f;
      } catch {}
    }
    return null;
  }
  function userDir(kind: string) {
    if (!IS_MAC)
      try {
        const tool = findTool('xdg-user-dir');
        if (tool) {
          const s = String(runSync(tool, [kind], { encoding: 'utf8', timeout: 3000 })).trim();
          if (path.isAbsolute(s)) return s;
        }
      } catch {}
    return path.join(home, kind === 'DESKTOP' ? 'Desktop' : 'Documents');
  }
  const dirs = {
    home,
    desktop: userDir('DESKTOP'),
    documents: userDir('DOCUMENTS'),
    config: IS_MAC ? path.join(home, 'Library', 'Application Support', 'VideoHub') : path.join(env.XDG_CONFIG_HOME || path.join(home, '.config'), 'videohub'),
    temp
  } as Dirs;
  dirs.guard = dirs.config;
  function nativeExecutable(file: string | null | undefined) {
    try {
      if (!file || !path.isAbsolute(file) || !fs.statSync(file).isFile()) return false;
      fs.accessSync(file, fs.constants?.X_OK ?? 1);
      const real = fs.realpathSync(file);
      if ([file, real].some(f => /\/(?:snap|flatpak)(?:\/|$)/.test(f))) return false;
      if (fs.statSync(real).size < 65536 && /\bsnap\s+(?:run|exec)\b|\/snap\/|\bflatpak\s+run\b/.test(String(fs.readFileSync(real, 'utf8')))) return false;
      return true;
    } catch {
      return false;
    }
  }
  // A PATH node is used only when it is the running binary, so version-manager shims (different realpath) are never baked into launchers.
  const stableNode = () => {
    try {
      const onPath = findTool('node');
      return onPath && fs.realpathSync(onPath) === fs.realpathSync(nodePath) ? onPath : nodePath;
    } catch {
      return nodePath;
    }
  };
  const nativeBrowser = (names: string[]) => names.map(findTool).find(nativeExecutable) || null;
  function findBrowser() {
    const app = (name: string) =>
      ['/Applications', path.join(home, 'Applications')].map(dir => path.join(dir, name + '.app', 'Contents', 'MacOS', name)).find(nativeExecutable) || null;
    const edge = IS_MAC ? app('Microsoft Edge') : nativeBrowser(['microsoft-edge', 'microsoft-edge-stable']),
      chrome = IS_MAC ? app('Google Chrome') : nativeBrowser(['google-chrome', 'google-chrome-stable']),
      chromium = IS_MAC ? app('Chromium') : nativeBrowser(['chromium', 'chromium-browser']);
    const override = env.VIDEOHUB_BROWSER;
    return { edge, chrome, chromium, path: nativeExecutable(override) ? override : edge || chrome || chromium };
  }
  const browser = findBrowser();
  const TOOLS = { ffmpeg: findTool('ffmpeg') || 'ffmpeg', ffprobe: findTool('ffprobe') || 'ffprobe', node: stableNode(), ...browser };
  function launch(file: string, args: string[]): Promise<void> {
    if (env.VIDEOHUB_NO_WINDOW) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      try {
        const c = spawn(file, args, { detached: true, stdio: 'ignore' });
        c.once('error', reject);
        c.once('spawn', () => {
          c.unref();
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  }
  function fileOpenPlan(target: string, { select = false }: { select?: boolean; how?: string } = {}) {
    return IS_MAC ? { command: 'open', args: [...(select ? ['-R'] : []), target] } : { command: 'xdg-open', args: [select ? path.dirname(target) : target] };
  }
  const openPath = (target: string) => launch(IS_MAC ? 'open' : 'xdg-open', [target]);
  async function reveal(target: string, { select = false }: { select?: boolean } = {}) {
    if (env.VIDEOHUB_NO_WINDOW) return;
    if (!IS_MAC && select && findTool('gdbus')) {
      const uri = 'file://' + target.split('/').map(encodeURIComponent).join('/');
      const r = await run('gdbus', [
        'call',
        '--session',
        '--dest',
        'org.freedesktop.FileManager1',
        '--object-path',
        '/org/freedesktop/FileManager1',
        '--method',
        'org.freedesktop.FileManager1.ShowItems',
        JSON.stringify([uri]),
        ''
      ]);
      if (r.code === 0) return;
    }
    const p = fileOpenPlan(target, { select });
    return launch(p.command, p.args);
  }
  const openUrlWindow = (url: string) => {
    const b = findBrowser().path;
    if (!b) return openPath(url);
    const appEnd = b.indexOf('.app/');
    return IS_MAC && appEnd >= 0 ? launch('open', ['-na', b.slice(0, appEnd + 4), '--args', '--app=' + url]) : launch(b, ['--app=' + url]);
  };
  async function pickFolder({ title = 'Choose folder', start = '' }: { title?: string; start?: string } = {}) {
    if (IS_MAC) {
      if (env.VIDEOHUB_NO_WINDOW) return null;
      let initial = home;
      try {
        if (start && fs.statSync(start).isDirectory()) initial = start;
      } catch {}
      const script = 'on run argv\nreturn POSIX path of (choose folder with prompt (item 1 of argv) default location (POSIX file (item 2 of argv)))\nend run';
      const r = await run('osascript', ['-e', script, '--', String(title), initial]);
      return r.code === 0 ? r.stdout.replace(/\r?\n$/, '') || null : null;
    }
    const zenity = findTool('zenity'),
      kdialog = findTool('kdialog');
    if (!zenity && !kdialog) return { unsupported: true };
    if (env.VIDEOHUB_NO_WINDOW) return null;
    const r = zenity
      ? await run(zenity, ['--file-selection', '--directory', '--title=' + title, ...(start ? ['--filename=' + start.replace(/\/$/, '') + '/'] : [])])
      : await run(kdialog as string, ['--getexistingdirectory', start || home, '--title', title]);
    return r.code === 0 ? r.stdout.replace(/\r?\n$/, '') || null : null;
  }
  async function volumes() {
    const r = await run('df', ['-kP']);
    if (r.code !== 0) return [];
    return r.stdout
      .split(/\r?\n/)
      .slice(1)
      .flatMap(line => {
        const m = line.match(/^\S+\s+(\d+)\s+\d+\s+(\d+)\s+\S+\s+(.+)$/);
        return m
          ? [{ mount: m[3].replace(/\\([0-7]{3})/g, (_, n) => String.fromCharCode(parseInt(n, 8))), freeBytes: +m[2] * 1024, totalBytes: +m[1] * 1024 }]
          : [];
      });
  }
  const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');
  async function trashOne(source: string) {
    const target = path.resolve(source);
    if (target === path.parse(target).root || target === home) throw new Error('Refusing to trash a filesystem root or home folder.');
    if (IS_MAC) {
      // Passing data as argv avoids AppleScript quoting and command-injection hazards for unusual filenames.
      const script = 'on run argv\nset f to POSIX file (item 1 of argv) as alias\ntell application "Finder" to delete f\nend run';
      const r = await run('osascript', ['-e', script, '--', target]);
      if (r.code !== 0) {
        const msg = (r.stderr || '').trim();
        throw new Error(
          /-1743|not authorized|not allowed/i.test(msg)
            ? 'Could not move to Trash. Allow Finder Automation permission and try again. ' + msg.slice(0, 200)
            : 'Could not move to Trash: ' + msg.slice(0, 200)
        );
      }
      return;
    }
    for (const [name, args] of [
      ['gio', ['trash', '--', target]],
      ['trash-put', ['--', target]]
    ] as [string, string[]][]) {
      const tool = findTool(name);
      if (!tool) continue;
      const r = await run(tool, args);
      if (r.code === 0) return;
      if (!exists(target)) return;
    }
    // A rename is reversible and atomic on one filesystem. Never copy/unlink across devices.
    const parent = fs.statSync(path.dirname(target)),
      homeStat = fs.statSync(home);
    let root: string,
      infoPath = target;
    if (parent.dev === homeStat.dev) root = path.join(env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'Trash');
    else {
      const mounts = (await volumes()).filter(v => target.startsWith(v.mount.replace(/\/$/, '') + '/')).sort((a, b) => b.mount.length - a.mount.length);
      if (!mounts.length || uid() == null) throw new Error('Trash is unavailable on this filesystem; the item was left untouched.');
      root = path.join(mounts[0].mount, '.Trash-' + uid());
      infoPath = path.relative(mounts[0].mount, target);
    }
    const files = path.join(root, 'files'),
      info = path.join(root, 'info');
    for (const dir of [root, files, info]) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      const st = fs.lstatSync(dir);
      if (!st.isDirectory() || st.isSymbolicLink() || (uid() != null && st.uid != null && st.uid !== uid()) || (st.mode != null && st.mode & 0o077))
        throw new Error('Trash folder is unsafe; the item was left untouched.');
    }
    if (fs.statSync(files).dev !== parent.dev) throw new Error('Trash is on another filesystem; the item was left untouched.');
    const date = new Date(),
      pad = (n: number) => String(n).padStart(2, '0'),
      deleted = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    const base = path.basename(target);
    for (let i = 0; i < 10000; i++) {
      const name = base + (i ? '.' + i : ''),
        dest = path.join(files, name),
        metadata = path.join(info, name + '.trashinfo');
      if (exists(dest)) continue;
      try {
        fs.writeFileSync(metadata, `[Trash Info]\nPath=${encodePath(infoPath)}\nDeletionDate=${deleted}\n`, { flag: 'wx', mode: 0o600 });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'EEXIST') continue;
        throw e;
      }
      try {
        fs.renameSync(target, dest);
        return;
      } catch (e) {
        try {
          fs.unlinkSync(metadata);
        } catch {}
        throw e;
      }
    }
    throw new Error('No free Trash entry; the item was left untouched.');
  }
  async function trash(paths: (string | { path: string })[]): Promise<TrashResult[]> {
    const out: TrashResult[] = [];
    for (const item of paths) {
      const target = typeof item === 'string' ? item : item.path;
      try {
        await trashOne(target);
        out.push({ path: target, ok: true, error: null });
      } catch (e) {
        out.push({ path: target, ok: false, error: (e as Error).message });
      }
    }
    return out;
  }
  async function recycleStream<T extends string | { path: string }>(items: T[], onItem: (item: T, code: number, error: string | null) => void) {
    for (const item of items) {
      const [r] = await trash([item]);
      onItem(item, r.ok ? 0 : -3, r.error);
    }
  }
  function notify(title: string, body: string) {
    if (env.VIDEOHUB_NO_WINDOW) return;
    const tool = IS_MAC ? 'osascript' : findTool('notify-send');
    if (!tool) return;
    const args = IS_MAC
      ? ['-e', 'on run argv\ndisplay notification (item 2 of argv) with title (item 1 of argv)\nend run', '--', String(title), String(body)]
      : [String(title), String(body)];
    try {
      Promise.resolve(run(tool, args)).catch(() => {});
    } catch {}
  }
  async function psList(): Promise<ProcessRow[] | null> {
    // Both fields may contain spaces. Query separately, with full width and a start identity to reject PID reuse.
    const flag = IS_MAC ? '-axo' : '-eo';
    const [table, commands] = await Promise.all([run('ps', ['-ww', flag, 'pid=,ppid=,rss=,lstart=,comm=']), run('ps', ['-ww', flag, 'pid=,args='])]);
    if (table.code !== 0) return null;
    const args = new Map(
      commands.code === 0
        ? commands.stdout.split(/\r?\n/).flatMap((line): [number, string][] => {
            const m = line.match(/^\s*(\d+)\s+(.*)$/);
            return m ? [[+m[1], m[2]]] : [];
          })
        : []
    );
    return table.stdout.split(/\r?\n/).flatMap((line): ProcessRow[] => {
      const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+\s+\S+\s+\d+\s+\S+\s+\d+)\s+(.+)$/);
      return m
        ? [{ pid: +m[1], ppid: +m[2], rssBytes: +m[3] * 1024, name: path.basename(m[5]), cmd: args.get(+m[1]) || '', start: m[4].replace(/\s+/g, ' ') }]
        : [];
    });
  }
  async function processList(): Promise<ProcessRow[] | null> {
    if (IS_MAC) return psList();
    try {
      const entries = fs.readdirSync('/proc').filter(n => /^\d+$/.test(n)),
        rows: ProcessRow[] = [];
      for (const pid of entries) {
        try {
          const stat = String(fs.readFileSync('/proc/' + pid + '/stat', 'utf8')),
            end = stat.lastIndexOf(')'),
            name = stat.slice(stat.indexOf('(') + 1, end),
            parts = stat
              .slice(end + 2)
              .trim()
              .split(/\s+/);
          const status = String(fs.readFileSync('/proc/' + pid + '/status', 'utf8')),
            cmd = String(fs.readFileSync('/proc/' + pid + '/cmdline', 'utf8'))
              .replace(/\0/g, ' ')
              .trim();
          rows.push({ pid: +pid, ppid: +parts[1], name, cmd, rssBytes: +(status.match(/^VmRSS:\s+(\d+)/m)?.[1] || 0) * 1024, start: parts[19] });
        } catch {}
      }
      return rows;
    } catch {
      return psList();
    }
  }
  function tree(rows: ProcessRow[] | null, root: number) {
    const ids = new Set([root]);
    let n;
    do {
      n = ids.size;
      for (const p of rows || []) if (ids.has(p.ppid)) ids.add(p.pid);
    } while (ids.size > n);
    return [...ids];
  }
  async function killTree(pid: number | string) {
    pid = +pid;
    if (!Number.isSafeInteger(pid) || pid <= 1 || pid === process.pid) return;
    // Freeze the root first: render.js ignores SIGTERM and relaunches Chrome (own process group) when a child dies.
    try {
      kill(pid, 'SIGSTOP');
    } catch {}
    const before = await processList(),
      ids = tree(before, pid).filter(id => id !== pid),
      starts = new Map((before || []).map((p): [number, string] => [p.pid, p.start]));
    try {
      kill(-pid, 'SIGTERM');
    } catch {}
    for (const id of ids.reverse())
      try {
        kill(id, 'SIGTERM');
      } catch {}
    await delay(3000);
    const after = await processList();
    const same = (id: number) => starts.get(id) != null && after?.some(p => p.pid === id && p.start === starts.get(id));
    const surviving = ids.filter(same),
      root = after?.find(p => p.pid === pid);
    if (surviving.length && (!root || same(pid)))
      try {
        kill(-pid, 'SIGKILL');
      } catch {}
    for (const id of surviving)
      try {
        kill(id, 'SIGKILL');
      } catch {}
    if (!after || same(pid))
      try {
        kill(pid, 'SIGKILL');
      } catch {}
  }
  const affinity = new Map<number | string, { start: string; mask: bigint }>();
  async function setTreePriority(rootPid: number | string, level: string, cores?: number | null) {
    const rows = await processList(),
      ids = tree(rows, +rootPid),
      taskset = IS_MAC ? null : findTool('taskset');
    const start = rows?.find(p => p.pid === +rootPid)?.start,
      cached = affinity.get(rootPid);
    let original: bigint | null = start != null && cached?.start === start ? cached.mask : null,
      failure: string | null = rows == null ? 'Could not read the render process tree.' : null;
    if (taskset && original == null) {
      const r = await run(taskset, ['-p', String(rootPid)]),
        h = r.stdout.match(/mask:\s*([0-9a-f,]+)/i)?.[1]?.replaceAll(',', '');
      if (r.code === 0 && h) {
        original = BigInt('0x' + h);
        if (start != null) affinity.set(rootPid, { start, mask: original });
      } else failure = r.stderr || 'Could not read render CPU affinity.';
    }
    let mask = original;
    if (mask != null && cores != null) {
      let selected = 0n,
        count = 0;
      for (let i = mask.toString(2).length - 1; i >= 0 && count < cores; i--)
        if (mask & (1n << BigInt(i))) {
          selected |= 1n << BigInt(i);
          count++;
        }
      mask = selected || original;
    }
    for (const pid of ids) {
      try {
        os.setPriority(pid, ({ normal: 0, low: 10, idle: 19 } as Record<string, number>)[level] ?? 0);
      } catch {}
      if (IS_MAC) {
        const r = await run('taskpolicy', [level === 'idle' ? '-b' : '-B', '-p', String(pid)]);
        if (r.code !== 0) failure ||= r.stderr || 'Could not apply render background QoS.';
      }
      if (taskset && mask != null) {
        const r = await run(taskset, ['-a', '-p', mask.toString(16), String(pid)]);
        if (r.code !== 0) failure ||= r.stderr || 'Could not apply render CPU affinity.';
      }
    }
    if (failure) throw new Error(failure);
    return { cpuAffinity: !!taskset, priority: true };
  }
  const startupFile = IS_MAC
    ? path.join(home, 'Library', 'LaunchAgents', 'com.videohub.hub.plist')
    : path.join(env.XDG_CONFIG_HOME || path.join(home, '.config'), 'autostart', 'videohub.desktop');
  const desktopQuote = (s: string) =>
    '"' +
    String(s)
      .replace(/[%]/g, '%%')
      .replace(/[\\"$`]/g, '\\$&') +
    '"';
  const desktopEntry = (server = false) =>
    `[Desktop Entry]\nType=Application\nName=VideoHub\nComment=Local video review studio\nExec=${desktopQuote(process.execPath)} ${desktopQuote(path.join(hubDir, 'scripts', 'install.mjs'))} open${server ? ' --server' : ''}\nIcon=${path.join(hubDir, 'ui', 'icon.svg')}\nTerminal=false\nCategories=AudioVideo;Video;\nX-VideoHub-Install=${hubDir}\n`;
  const xml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const launchAgent = () =>
    `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n<key>Label</key><string>com.videohub.hub</string>\n<key>ProgramArguments</key><array><string>${xml(TOOLS.node)}</string><string>${xml(path.join(hubDir, 'server', 'hub.js'))}</string></array>\n<key>WorkingDirectory</key><string>${xml(hubDir)}</string>\n<key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(toolDirs.join(':'))}</string></dict>\n<key>RunAtLoad</key><true/>\n<key>VideoHubInstall</key><string>${xml(hubDir)}</string>\n</dict></plist>\n`;
  const ownsStartup = () => {
    try {
      const data = String(fs.readFileSync(startupFile, 'utf8'));
      return IS_MAC ? data.includes('<key>VideoHubInstall</key><string>' + xml(hubDir) + '</string>') : data.includes('X-VideoHub-Install=' + hubDir + '\n');
    } catch {
      return false;
    }
  };
  const launchDomain = () => {
    const id = uid();
    if (id == null) throw new Error('The login user is unavailable; autostart was left unchanged.');
    return 'gui/' + id;
  };
  const getAutostart = async () => {
    if (!ownsStartup()) return false;
    if (!IS_MAC) return true;
    try {
      return (await run('launchctl', ['print', launchDomain() + '/com.videohub.hub'])).code === 0;
    } catch {
      return false;
    }
  };
  async function setAutostart(on: boolean) {
    if (exists(startupFile) && !ownsStartup()) throw new Error('Autostart belongs to another install; left unchanged.');
    if (IS_MAC) {
      const domain = launchDomain();
      if (on) {
        if (await getAutostart()) return;
        fs.mkdirSync(path.dirname(startupFile), { recursive: true });
        fs.writeFileSync(startupFile, launchAgent());
        const r = await run('launchctl', ['bootstrap', domain, startupFile]);
        if (r.code !== 0) throw new Error('Could not enable login startup: ' + (r.stderr || 'launchctl bootstrap failed'));
      } else if (ownsStartup()) {
        if (await getAutostart()) {
          const r = await run('launchctl', ['bootout', domain, startupFile]);
          if (r.code !== 0) throw new Error('Could not disable login startup: ' + (r.stderr || 'launchctl bootout failed'));
        }
        const [r] = await trash([startupFile]);
        if (!r.ok) throw new Error(r.error as string);
      }
      return;
    }
    if (on) {
      fs.mkdirSync(path.dirname(startupFile), { recursive: true });
      fs.writeFileSync(startupFile, desktopEntry(true));
    } else if (ownsStartup()) {
      const [r] = await trash([startupFile]);
      if (!r.ok) throw new Error(r.error as string);
    }
  }
  const shellCommand = (cmd: string) => ({ file: '/bin/sh', args: ['-c', cmd], opts: {} });
  const renderSpawnOptions = { detached: true };
  async function gpuNames() {
    if (IS_MAC) {
      const r = await run('system_profiler', ['SPDisplaysDataType', '-json']);
      if (r.code !== 0) return [];
      try {
        return (JSON.parse(r.stdout).SPDisplaysDataType || []).map((g: { _name?: string }) => g._name).filter(Boolean);
      } catch {
        return [];
      }
    }
    const tool = findTool('lspci');
    if (!tool) return [];
    const r = await run(tool, []);
    return r.code === 0 ? r.stdout.split(/\r?\n/).filter((s: string) => /VGA|3D controller|Display controller/i.test(s)) : [];
  }
  const capabilities = () => ({
    platform: OS,
    cpuAffinity: !IS_MAC && !!findTool('taskset'),
    cpuLimitReason: IS_MAC
      ? 'macOS does not provide a CPU-core affinity limit; priority and background QoS protect responsiveness.'
      : findTool('taskset')
        ? null
        : 'CPU limit not available on this system (taskset is missing).',
    trashLabel: 'Trash',
    fileManager: IS_MAC ? 'Finder' : 'file manager',
    browserWarning: IS_MAC ? null : 'Snap and Flatpak browsers are not supported for rendering; install a native Chrome or Chromium package.'
  });
  const casePath = (value: unknown) => String(value),
    pathKey = (value: string) => path.resolve(value);
  let memoryCache: { at: number; bytes: number } | null = null;
  function availableMemory() {
    if (IS_LINUX)
      try {
        const kb = String(fs.readFileSync('/proc/meminfo', 'utf8')).match(/^MemAvailable:\s+(\d+)\s+kB\b/m)?.[1];
        if (kb != null) return +kb * 1024;
      } catch {}
    if (!IS_MAC) return os.freemem();
    if (memoryCache && now() - memoryCache.at < 3000) return memoryCache.bytes;
    let bytes = os.freemem();
    try {
      const text = String(runSync('vm_stat', [], { encoding: 'utf8', timeout: 3000 })),
        pageSize = +(text.match(/page size of (\d+) bytes/)?.[1] || 0);
      const counts = ['free', 'inactive', 'speculative'].map(name => text.match(new RegExp('^Pages ' + name + ':\\s+(\\d+)', 'm'))?.[1]);
      if (pageSize > 0 && counts.every(n => n != null)) bytes = Math.min(os.totalmem(), pageSize * counts.reduce((a, b) => a + +b, 0));
    } catch {}
    memoryCache = { at: now(), bytes };
    return bytes;
  }
  return {
    OS,
    IS_MAC,
    IS_LINUX,
    dirs,
    TOOLS,
    findTool,
    findBrowser,
    openUrlWindow,
    fileOpenPlan,
    reveal,
    openPath,
    pickFolder,
    trash,
    recycleStream,
    volumes,
    notify,
    processList,
    killTree,
    setTreePriority,
    getAutostart,
    setAutostart,
    shellCommand,
    renderSpawnOptions,
    gpuNames,
    capabilities,
    casePath,
    pathKey,
    availableMemory
  };
}
export const {
  casePath,
  capabilities,
  pathKey,
  availableMemory,
  OS,
  IS_MAC,
  IS_LINUX,
  dirs,
  TOOLS,
  findTool,
  findBrowser,
  openUrlWindow,
  fileOpenPlan,
  reveal,
  openPath,
  pickFolder,
  trash,
  recycleStream,
  volumes,
  notify,
  processList,
  killTree,
  setTreePriority,
  getAutostart,
  setAutostart,
  shellCommand,
  renderSpawnOptions,
  gpuNames
} = createPlatform();
