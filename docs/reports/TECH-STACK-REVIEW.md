# Tech stack review: types and backend language

High-level review, 2026-11-16. Goal: decide the direction (typed frontend, the right backend language) before planning a migration in depth. Every number below was measured in a Linux cloud container (4 cores, Node 22.23.4, Go 1.x, ffmpeg) unless it is quoted from `docs/RENDER-SPEED.md`. The container is not the user's real hardware. Treat the numbers as ratios and orders of magnitude, not exact figures.

## TL;DR

| Question | Recommendation | Why, in one line |
|---|---|---|
| Typed frontend? | **Yes: TypeScript**, added step by step with `tsc --noEmit` before any `.ts` files | `tsc` already finds 79 contract mismatches in the UI without a single annotation. |
| Replace JavaScript on the backend (Go, Rust, …)? | **No. Keep Node, and move the backend to TypeScript too** | Render time is bound by Chromium and ffmpeg, not Node. A compiled binary breaks the project's Windows-trust rules, and the render scripts need Node anyway. |
| Build step? | **None needed.** Node 22.18+ runs `.ts` natively, and the hub can strip types from UI files when it serves them | This keeps the "no build step, no native modules" principle. |
| Framework change (React, etc.)? | Not for performance. Revisit separately if wanted for maintainability | The documented UI slowdowns were DOM discipline problems, such as reading layout every frame, not framework problems. |

## 1. What the codebase is today

| Area | Source lines | Test lines | Notes |
|---|---|---|---|
| `ui/` | 11,558 | 1,175 | Vanilla ES modules, no bundler. Biggest files: `review.js` (1,093), `thumbstudio/editor.js` (1,053) |
| `server/` | 6,458 | 3,240 | Loopback HTTP/SSE hub, scan, queue, guard, MCP tools |
| `scripts/` | 757 | 644 | Installer and agent integration |
| `engine-hooks/` | 486 | 0 | Code that runs inside the film pages |

- Runtime dependencies: `@modelcontextprotocol/sdk`, `puppeteer-core`, `zod`.
- The suite has 350 tests, of which 348 pass and 2 are skipped (2.4 s).
- There are no type annotations anywhere: 0 JSDoc `@param`/`@typedef` tags and no `@ts-check`.

**Where the work actually happens:**

- **Rendering:** Chromium draws frames, the pixels are read back, the render script moves them through a WebSocket, and ffmpeg encodes them.
- **Server:** mostly orchestration. It walks folders, reads and writes JSON files, spawns processes, and handles a few HTTP requests per second from a single local user. The UI polls `/renders` every 2 s.

## 2. Backend: should it leave JavaScript?

### Evidence A: rendering, the only heavy workload, is not bound by Node

- **Real hardware** (`docs/RENDER-SPEED.md`): full renders run at **44–46 fps** at 1080p60 (raw canvas path, 2 workers). On Apple Silicon, 300 frames encode in 3.9 s.
- **Node's piping capacity** (this review): Node pushed 300 frames of 1920×1080 RGBA (8 MB each) into ffmpeg.

| ffmpeg output | Throughput | Node CPU used |
|---|---|---|
| null encoder (pure pipe cost) | **245 fps** (~2 GB/s) | 87% of one core, including a deliberate extra 8 MB copy per frame |
| libx264 veryfast crf 16 | 72 fps | **24% of one core**. The rest of the time is ffmpeg encoding. |

Node can carry about 5× more frames than a real render produces. Rewriting the server in Go or Rust would not change render time, because Chromium readback and the encoder set the pace.

The project's own history points the same way. The one time Node was the bottleneck (the `ws` package, ~15 ms per frame), the fix was a better algorithm written in JavaScript: the script's own WebSocket reader and Blob transfer. A language change was not needed.

### Evidence B: folder scanning, the most CPU-heavy server path

The test was a synthetic project of 50,000 files, the size that once froze the hub. Results are the median of 5 runs.

| Implementation | Time | Note |
|---|---|---|
| Go `filepath.WalkDir` + stat | **102 ms** | |
| **Node: the current `scan.js` algorithm** (sync readdir/stat with a breather every 300 entries) | **244 ms** | The event loop was never blocked longer than **4.6 ms** |
| Node with a naive `fs.promises` + `Promise.all` "async" rewrite | 1,407 ms | 5.8× slower than the current code |

- Go is about 2.4× faster here. That saves roughly 140 ms on a background scan that is cached and soft-rescanned per project.
- The third row is the real lesson: a rewrite done carelessly makes things slower. The current code is already well tuned.

### Evidence C: the HTTP hub

The test used a scratch hub on port 7799 with protection and jobs off, and 5 copies of the example film.

| Measure | Result |
|---|---|
| Cold start until the first response | 128 ms |
| Memory (RSS) at idle | 66 MB. A Go server would typically use 10–20 MB; that figure is an estimate, not measured here |
| `GET /api/ping` | p50 0.28 ms, p99 1.69 ms (~2,700 req/s sequential) |
| `GET /api/projects` | p50 0.76 ms, p99 2.23 ms (~1,150 req/s sequential) |

That is over 1,000× more headroom than a single-user app that polls every 2 s needs. Memory is the only place Go would clearly win, and 50 MB does not matter next to a headless Chromium.

### Constraints that weigh against Go or Rust, beyond speed

1. **Windows trust.** `CLAUDE.md` and `docs/WINDOWS-SECURITY.md` forbid compiled helper binaries and native modules. `scripts/distribution-safety.test.js` enforces this. An unsigned Go or Rust `.exe` is exactly what SmartScreen and antivirus tools flag. It would also need builds for 3 operating systems × 2 architectures, plus code signing.
2. **Node stays regardless.** Film render scripts (`render.js`) are Node + `puppeteer-core` programs, and agents write films in JavaScript. A Go hub would ship two runtimes instead of one.
3. **The ecosystem fit is already right.** The official MCP SDK, Puppeteer and zod are all TypeScript-first.
4. **Cost.** About 6.5k server lines and 3.2k test lines would need rewriting, including the subtle OS code in `platform.js` (Windows Recycle Bin, macOS Finder, Linux freedesktop Trash) that has already been verified on real hardware.

**Verdict:** keep Node. If a single CPU-bound hotspot ever appears that ffmpeg does not already handle, the first escape hatches are `worker_threads`, then a **WASM** module. WASM runs inside Node, so it is not a native binary. Both come before a language change.

## 3. Frontend and backend: TypeScript

### Evidence D: what `tsc` finds today with no annotations

I ran `tsc --checkJs --noEmit` over the existing `.js` files, using a scratch config so the repo was untouched.

| Scope | Loose mode | `strict: true` |
|---|---|---|
| `ui/` (excluding tests) | **79 errors** | 3,202 errors |
| `server/` (excluding tests, with `@types/node`) | **61 errors** | not run |

Most of these are untyped contracts rather than crashes, which is what types are for. Examples:

- **Arguments that are silently ignored:** `changed(true)` is called 13 times in `ui/review/edit2d.js`, but `changed()` (line 191) takes no parameters. If `true` was meant to mean "save now", that intent is lost.
- **Missing option fields:** `dropAdd({ files, t, kind })` in `ui/review/soundedit.js:203` omits `item` and `lane`, which the destructuring at line 84 expects. The same happens at `thumbstudio/page.js:45,103,107`.
- **Objects used as property bags:** 25+ cases use `EventTarget` or `Element` this way (`.displayedTime`, `.capture`, `.reload`, …). These are untyped component interfaces. Declaring them gives editor completion and safe renames across the 41 review and thumbstudio modules.
- **Mixed-type state:** `scan.js:323` stores `false | 'full' | 'soft'` in one variable. In `jobs.js:91`, a variable starts as a `Set` and is reassigned to an array.
- **API payload shapes** are duplicated between `server/*` and `ui/*` and are checked only by tests. Shared type definitions turn a drift between the two into a compile error.

### Evidence E: TypeScript without a build step works on the current runtime

- **Backend:** Node 22.23.4 ran a `.ts` file directly, with no flag and no warning. Type stripping is on by default from Node 22.18. Line and column numbers are preserved, so stack traces still match the source.
- **Frontend:** browsers cannot run `.ts`, but `node:module`'s `stripTypeScriptTypes()` strips the 1,093-line `review.js` in **6.2 ms**. The hub can strip each UI `.ts` file when serving it and cache the result by modification time. That needs no bundler and no `esbuild` (which ships a native binary that `CLAUDE.md` forbids). The API is still marked *experimental*, so the alternative is to emit with `tsc` at install time; `tsc` is plain JavaScript.
- Use the `erasableSyntaxOnly` option so the code only uses syntax that can be stripped. That rules out `enum`, `namespace` and parameter properties.

### Proposed path (high level; details go in the later migration plan)

1. **Phase 0, gate only.** Add `typescript` and `@types/node` as dev dependencies, plus `tsconfig.json` (`checkJs`, `noEmit`, loose mode). Make `tsc --noEmit` part of `pnpm test` and CI with a fixed baseline of allowed errors. Nothing changes at runtime.
2. **Phase 1, shared contracts.** Add a type-only folder (for example `types/`) with the API payloads (projects, jobs, notes, renders, config) and the review component interfaces. Type-only imports are erased, so the rule that the UI never imports `server/` still holds.
3. **Phase 2, backend `.ts`.** Convert one file at a time, starting with `util.js`, `legacy.js`, `jobs.js` and `notes.js`. Bump `engines` to `>=22.18`. `node:test` runs `.ts` tests as they are.
4. **Phase 3, UI `.ts`.** Have the hub serve UI `.ts` files with stripped types and cache the result. Convert the leaf modules first, then `review.js` and `editor.js`.
5. **Phase 4.** Enable `strict` per folder once the error count reaches zero.

**Risks to plan for:**

- Upload and distribution scripts (`make-upload.mjs`, upload rules) must accept `.ts` files.
- The templates and example film should stay plain `.js` so agents and users can run `node render.js` with no tooling.
- `stripTypeScriptTypes` might change before it becomes stable.

## 4. If raw performance is the real goal

None of the gains below require a language change. Measure each one before committing to it.

- **Render pipeline** (the dominant cost): evaluate WebCodecs or GPU-side encoding inside the page to skip the RGBA readback, check NVENC and QSV on real hardware, and test films that use heavy 2D effects (still unverified).
- **Scan:** keep the synchronous walk with a breather. If very large trees become common, move the walk into a `worker_threads` worker rather than switching languages.
- **UI:** keep per-frame code free of layout reads (`docs/ARCHITECTURE.md`). The documented 10.6 ms → 0.4 ms fix is the kind of improvement that matters here.

## Appendix: how the numbers were produced

- Type errors: `tsc` 6.0.2 with `allowJs`, `checkJs`, `noEmit` and `skipLibCheck`, targeting `ui/**/*.js` (DOM libraries) and `server/**/*.js` (`@types/node@22`). Test files were excluded.
- Folder walk: 50 directories × 20 subdirectories × 50 files. The Node code is the current `walk()` from `scan.js` with the config filters removed. The Go code is `filepath.WalkDir` + `d.Info()`. Each figure is the median of 5 runs, and a 1 ms interval timer recorded the longest event-loop gap.
- Pipe: `spawn('ffmpeg', ['-f','rawvideo','-pix_fmt','rgba','-s','1920x1080','-i','pipe:0', …])`, writing 300 frames with backpressure (`drain`). Node's CPU time comes from `process.cpuUsage()`.
- Hub: the isolated scratch-hub variables from `CLAUDE.md` (port 7799, scratch data and base folders, guard and jobs off), and 2,000 sequential `fetch` calls per route.
- Real-hardware render figures come from `docs/RENDER-SPEED.md` and were not re-measured. No film was rendered for this review.
