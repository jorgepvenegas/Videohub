# VideoHub architecture

A local Node 22.18+ server (TypeScript run with Node's native type stripping, no server build, two pnpm-installed dependencies plus `puppeteer-core` for render scripts),
a vanilla-TypeScript UI built by Vite into `dist/ui`, built-in Node render protection and MCP tools for Claude Code or OpenCode. macOS on Apple Silicon is verified on real hardware; Linux and Intel macOS are new and await real-machine acceptance. There is no compiled helper program.
What film projects must look like is in [PROJECT-CONTRACT.md](PROJECT-CONTRACT.md).

## Processes and lifetime
- **Hub** — `server/hub.ts`, HTTP on `127.0.0.1:7788` (UI + JSON API + server-sent events). It runs only while used:
  with no VideoHub window (SSE client), no queued/running job, no cleanup, no note pictures or review copies being made
  and no tracked render for 2 minutes (`VIDEOHUB_IDLE_SEC`), it stops built-in protection and exits — unless
  "Start at login" is on (then it stays up). The `hub_*` tools start it again when needed.
- **Render protection** — `server/guard.ts`, inside the hub. The queue reports the process it starts (`guardTrack`); `server/platform.ts` applies priority and supported CPU limits to its tree. Linux uses niceness and `taskset` with the original allowed mask; macOS uses niceness and background QoS (`taskpolicy`), with no core-affinity limit. Every 3 seconds the guard reads available memory (macOS uses `vm_stat`), slows the newest render below `PauseMB` and every render below `CriticalMB`, then attempts to restore normal settings as RAM frees. Unix priority restoration can fail without privileges, so it is best effort and never requests elevation. The guard does not freeze processes, has no hotkeys and tracks only queue renders. Linux uses `$XDG_CONFIG_HOME/videohub` or `~/.config/videohub`; macOS uses `~/Library/Application Support/VideoHub`.
- **MCP server** — `server/mcp.ts` (stdio) exposes `server/tools.ts`; `server/cli.ts` runs the same tools from a shell;
  `server/mcp-selftest.ts` checks the MCP wiring. Tools talk to the hub over HTTP (`VIDEOHUB_PORT` overrides the port).

## Map
| File | Role |
|---|---|
| `server/platform.ts` | Injectable OS layer: paths, browser/tools, system UI, reversible Trash, volumes, notifications, process trees, protection, capabilities and login startup. |
| `server/config.ts` | `data/config.json`: the workspace (`baseDir`: `VIDEOHUB_BASE_DIR` → `config.baseDir` → `Documents\VideoHub`; the folder defaults derive from it), roots, folders (outputs, sounds, archive, thumbnails, studio), `skipFolders`, render settings (`render.encoder`). First run: the films folder + discovered suggestions (off). An existing config keeps every value it has. |
| `scripts/init-config.ts` | Setup's helper: what is decided already (`--state`), workspace checks, creating the workspace + README.txt and writing `config.json` (never overwriting a value), encoder detection (`--detect`), the example film (`--example`). The shared Node installer asks and passes answers (`data/setup-answers.json` remembers them). |
| `server/encoders.ts` | Render encoders: which ones this PC can use (one tiny test encode each, cached in `data/encoders.json`; `GET /api/encoders`), their ffmpeg arguments (the template's `render.ts` carries a copy, kept equal by a test), `VIDEOHUB_ENCODER` for jobs. See RENDER-SPEED.md. |
| `server/legacy.ts`, `ui/values.ts` | Stored values (note/project/thumbnail statuses, note kinds) and the one place old Turkish values are mapped to English. |
| `server/scan.ts` | Projects under the roots, video roles, duplicates, card thumbnails; root watchers so soft scans re-walk only changed projects. |
| `server/source-revision.ts` | A project's code revision (live covers; 409 on stale covers). |
| `server/live.ts` | Live preview: finds the page/fps/size/length/sound, serves `/live/<id>/…`, watches code → SSE `live-changed`. |
| `server/notes.ts` | Review notes (`.videohub/notes.json`), frame pictures cut by ffmpeg in one queue, the agent-directed copied note text. |
| `server/jobs.ts` | Render queue (`data/jobs.json`): one at a time, partial re-renders, concat, sound, versions, `register()`. |
| `server/media.ts` | Film strip, waveform/peaks, full frames, review copies (`data/proxy`). |
| `server/guard.ts`, `ramhogs.ts` | Built-in protection state/commands/settings/history; programs holding RAM next to a render (never closes anything). |
| `server/outputs.ts`, `ciktilar.ts`, `ciktilar-dir.ts` | "Recent renders" list; the global outputs folder (hard links, one folder per day). |
| `server/janitor.ts` | Cleanup candidates (safe/deep), reversible Trash, archive; one cleanup at a time. |
| `server/tools.ts` | The `hub_*` tools. |
| `server/transcript.ts`, `layers.ts`, `scenes.ts` | Narration text, sound stems + cues, scene lane. |
| `server/tweaks.ts`, `sound.ts`, `vhsound.ts`, `soundedit.ts`, `sfxlib.ts`, `edit2d.ts` | The film's `tweaks.json` (one writer), mix rebuilds, added sound clips, ready-made effects, 2D layers. |
| `server/example.ts` | First-run helper that copies `examples/hello-film` into the films folder. |
| `server/thumbstudio/` | Thumbnail Studio: store, schema, templates (`templates/thumbnail`), variants and notes (the selected agent makes the images). |
| `ui/app.ts` | Pages (Projects, project, Renders, Recent renders, Disk, Settings); `ui/review.ts` + `ui/review/*` the review editor; `ui/thumbstudio/*`. Vite builds `ui/` into `dist/ui`, which the hub serves. |
| `engine-hooks/` | Page-side hooks for the scene editor (`vhtweaks.ts`) and 2D layers (`vh2d.ts`) that engines can include. Usage is documented in the `.ts` sources; engines copy the built `dist/engine-hooks/vhtweaks.js` and `vh2d.js` after a build. |

## Things that matter when changing the code
- **Never block the hub.** Folder walks yield every 300 entries (`breather` in scan.ts), the cleanup scan is async;
  one big synchronous loop in a request path once froze every request for ~20 s on a 50k-file project.
- **The UI never imports from `server/`.** A browser cannot load server files or `node:` modules, and one broken module
  in `app.ts`'s import graph blanks the whole UI. Shared code lives in `ui/` as plain modules (`ui/values.ts`,
  `ui/thumbstudio/catalog.ts`, `prompt.ts`). Open the pages after a UI change.
- **Per-frame code** (review `tick()`, the live loop) must not read layout: reading `clientWidth` after a text change
  reflowed ~100 note cards every frame (10.6 ms → 0.4 ms after the fix).
- **Never hard-delete.** Trash or archive (copy, verify, then remove; never
  overwrite, `_2`). The user approves every cleanup in the UI.
- **`fs.watch` can report reads as changes** (last-access time): count an event only when the mtime is really newer
  (`reallyChanged` in live.ts, the same idea in scan.ts).
- **Note pictures are cut by ffmpeg** from the original video by frame number, never from the browser's `<video>`
  (comes back black) or the review copy. Live-preview notes send their frame from the page's canvases.
- **One render at a time.** The queue also also respects tracked render work. Do not start
  renders in parallel to test something.
- **Render script speed** (`templates/new-film/render.ts` = `examples/hello-film/render.ts`, keep them equal; it serves the film folder over 127.0.0.1 for every render): the raw
  canvas path is used only when it is pixel-identical to a screenshot; check with lossless renders (RENDER-SPEED.md)
  after changing it. Keep everything VideoHub reads from the script (PROJECT-CONTRACT.md §4).
- **TypeScript, no server build.** Server, scripts, tests and film scripts run as `.ts` through Node's native type
  stripping (Node 22.18+): erasable syntax only (no `enum`, `namespace` or parameter properties) and relative imports
  name the `.ts` file. Only browser code is built: `pnpm build` runs Vite for `ui/` (into `dist/ui`) and for
  `engine-hooks/` (into `dist/engine-hooks`); setup and update run it, and the hub says so when `dist/ui` is missing.
  A hub started before the first build does not watch `dist/ui`; restart it after the build to get reload broadcasts.
  Stripping types (a film's `film.ts` for the preview, source-reading tests) uses `stripTypeScriptTypes`, which prints an
  ExperimentalWarning on Node 24 (stderr only, harmless).
- **Setup never moves or overwrites** the user's folders or an existing `config.json` value; a re-run keeps every answer.
- **Security:** the server listens on 127.0.0.1 only and refuses requests whose Host is not loopback (DNS rebinding),
  that a browser marks cross-site (`Sec-Fetch-Site`), and writes with a foreign `Origin`. The job queue can run shell
  commands (`mode:"command"`), so the port must never be exposed.
- UI details that bit before: `Element.append(null)` prints "null"; a focused `<select>` eats arrow keys; drawing must
  not move focus into the note box; letter shortcuts normalise Turkish `ı`/`İ` to `i`.

## Data
- `data/` (per machine, never in git): `config.json`, `setup-answers.json`, `encoders.json`, `index.json` (scan), `jobs.json`, `probe-cache.json`, `thumbs/`,
  `media/`, `proxy/`, `ciktilar.json` (outputs index), `seen-outputs.json`, `perf.jsonl`, `sfx-lib/`.
- Per project: `.videohub/` (notes, versions, project.json, scenes, chats, autoscan, thumbnails) and `tweaks.json`,
  `vhaudio/`, `vh2d/` next to the film.

## Testing
- `pnpm test` runs `node:test` with fake home, temp, config, workspace and data inside `.test-tmp`. `pnpm format:check`, `pnpm lint`, `pnpm typecheck` and `pnpm build` are the other standards commands. OS-specific unit tests inject process, filesystem and command dependencies; no real dialogs, Trash or login startup changes are required.
- A scratch hub must use `VIDEOHUB_PORT=7799`, `VIDEOHUB_DATA_DIR=<scratch>`, `VIDEOHUB_BASE_DIR=<scratch>`, `VIDEOHUB_GUARD=off`, `VIDEOHUB_JOBS=off`, `VIDEOHUB_NO_WINDOW=1` and, when needed, `VIDEOHUB_IDLE_SEC=600`. Set the same port on every CLI call. Never contact the user's port 7788 in development tests.
- Shell syntax is checked with `bash -n` when Bash is available, otherwise reported as skipped. CI includes Linux and macOS with Node 22.18; real desktop acceptance remains separate. Browser uploads cannot carry `.github/` workflows.
- Installer tests use dry-run or a fake home and injected agent registration. Never change the real agent configurations while testing.
- Film preview/review is required before rendering; application-page smoke tests need no film playback or render. Real Linux/macOS installation, sound render, protection, Stop, Trash restore and lifecycle acceptance are listed in [PLATFORMS.md](PLATFORMS.md).

## Operating-system integration
`server/platform.ts` is the only module reading `process.platform`. Its injectable factory provides paths, tools/browser discovery, file opening/reveal, folder dialogs, reversible Trash, volumes, notifications, process enumeration/tree termination, render priority/CPU affinity, and login startup. The existing util exports and queue/guard/cleanup contracts remain.

Linux reads `/proc` directly, falling back to `ps`. Queue children have separate process groups so Stop can terminate descendants; priority applies per process and affinity uses the original allowed taskset mask. Missing optional tools are capability data for the UI. Trash uses existing desktop tools or an atomic same-filesystem freedesktop move and metadata; unsafe locations are refused. Unix niceness restoration is best effort because raising priority can require privileges. Agent registration, skills/rules and ownership checks are shared in `scripts/agents.ts`; the Unix shell lifecycle entry points call `scripts/install.ts` directly. The server remains loopback-only. Tests inject OS/filesystem/process dependencies and run with a fake home/temp/data under `.test-tmp`.

macOS discovers native browsers in `/Applications` and `~/Applications`, uses `open` / AppleScript for system UI, Finder for restorable Trash and a LaunchAgent plist for login startup. Finder Automation refusal leaves files untouched. The Desktop launcher is a `.command` file rather than an unsigned application bundle. Capabilities drive UI labels and hide unsupported CPU controls; browser modules do not inspect the host OS. VideoToolbox is tested by the same short encode probe as other hardware encoders, with Apple Silicon quality and Intel bitrate candidates.

## Distribution
The upload folder is built from committed source, excluding machine-local data and dependencies. Already distributed archives and installed copies remain unchanged until an explicit distribution/update. `scripts/distribution-safety.test.ts` rejects compiled executable helper files and application bundles in the source tree. Installed Node, browsers and ffmpeg remain external runtime requirements. These checks describe packaging and behavior; they do not identify an antivirus verdict or confer publisher reputation.
