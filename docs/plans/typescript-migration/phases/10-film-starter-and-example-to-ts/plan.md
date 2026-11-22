# Phase P10 — Film starter and example to TS

- Plan ID: `typescript-migration`
- Phase: P10
- Plan version: 2
- Validated against master version: 65
- Status: in_progress
- Approved by: Jorge Venegas (standing instruction 2026-11-22, C15)
- Approved at: 2026-11-22
- Commit: pending
- Implementation mode: subagent
- Implemented by: p10-worker
- Implemented at: 2026-11-22
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: P8
- Written: 2026-11-22
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

Review mode: per C15, the user's standing instruction of 2026-11-22 replaces the per-phase approval stop for this phase. The preview-before-render gate in S6 still stops for the user.

## 1. Phase objective

New films start from TypeScript: `templates/new-film` and `examples/hello-film` ship `render.ts`, `make-audio.ts` and `film.ts`. The hub previews, scans and queues them, and every existing `render.js`/`film.js` film keeps working unchanged (C3).

- **Hub support first:** the hub prefers `render.ts`, then `render.js`. It reads a `.ts` render script with types stripped wherever it pattern-matches the source, and live preview serves any `.ts` file in a film folder as JavaScript with types stripped.
- **Render page server:** `render.js` opens the page as `file://`, and Chrome will not run a `.ts` script loaded that way. Before the rename, the starter's render script serves the film folder from its existing loopback server (types stripped for `.ts`) and opens the page over `http://127.0.0.1`. Live preview already serves only the film folder, so a film that previews also renders.
- **Pure conversion:** renames with history, then strict types; a type-stripped AST comparison proves no runtime change (L35).
- **User gate:** a scratch hub shows the example and a new film made from the starter. The user watches the preview, and one queued render runs only when the user explicitly asks.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Removes the last tracked JS: the starter's and example's `render`, `make-audio` and `film` | A1 |
| D2 | Both film folders type-check strictly under the root config | A2 |
| D3 | Lint 0 errors, format clean | A4 |
| D4 | Suite ≥ 312 pass plus new hub tests for `.ts` and legacy films | A3 |
| D7 | A new film from the TS starter and the example open in live preview with no console errors; after the user's review and explicit request, one queued render of the example copy completes; template and example `render.ts` stay byte-identical | A5, A6 |
| D8 | `render.js`/`film.js` films still preview and queue: tests for both kinds, plus a legacy film in the browser check | A3, A5 |

## Prior discoveries applied

`progressive_plan.py discoveries` returns no rows for P10, because P10 was added after the earlier ranges were written (for example `P5-P9`). These rows still apply and are carried over deliberately:

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L3 | 12 lint rules at `warn` | No warning cleanup; counts recorded in S5 |
| L4, L28, L42 | Source-reading tests: marker slices only where a fragment is extracted; markers stop before annotations | `server/encoders.test.ts` reads the template's render script through `readSource`; marker slices only if it extracts a fragment |
| L8 | `any` check in type positions only | The L8 grep over `templates/new-film/*.ts` and `examples/hello-film/*.ts`, each hit reviewed and commented |
| L14 | Specifier rewrites only for relative specifiers | Film scripts use `require` of builtins and `puppeteer-core`; none of these change |
| L20 | Unsafe-probe incident (hard safety rules in decision C12) | Binding for every step (see §5) |
| L27 | The asdf `node` shim fails under a fake HOME | Scratch hubs and film scripts run with the real node binary |
| L34 | A film card with no cover 404s | S5 and S6 seed scratch covers |
| L35 | AST comparison of stripped sources | S4 compares all six film scripts against the S3 commit |
| L38 | Stray files from a comparison loop | Scratch output only under `.test-tmp/p10-*`; explicit staging; `git status --short` before each commit |
| L40 | Renaming to `.ts` enables TypeScript-only lint rules | Fix with types; a commented disable only where a fix would change runtime code |
| L47 | More hub code recognizes only `.js` film code (source revision, live watcher, scan markers, render toast) | Plan v2 adds S4b; S5 re-runs with a reload check |

Decisions applied: C3 (`film.ts` served stripped by hub live preview and by the render script's own page server; `render.js` films keep working; the default prefers `render.ts`) shapes S1 and S2. C12 is binding for every step. C15 removes the per-phase approval stop, but S6 still stops for the user.

## 3. Scope

In scope:
- `server/util.ts`: one exported helper that returns a file's source with types stripped when it is `.ts` (`node:module` `stripTypeScriptTypes`, as in `scripts/test-source.ts`), reused below
- `server/scan.ts`: render-script detection order `render.ts`, `render.js`, `render.mjs`, `render.py`; `renderInfo` reads the script through the helper
- `server/live.ts`: `pageOf` and the two other script reads (`rc.script || 'render.js'`) use the project's detected script and the helper; `serve` answers a `.ts` file with its stripped source as `text/javascript`
- `server/jobs.ts`: the `'render.js'` fallback becomes the detected script; it stays `render.js` when no script is detected, as before
- Comment paths naming the starter's files: `server/encoders.ts:3`, `server/live.ts:3,58` (comment text only)
- `templates/new-film/render.js` and `examples/hello-film/render.js` (identical): serve the film folder from the existing `frameServer` (GET only, files inside the folder only, `.ts` stripped, no directory listing) and open `http://127.0.0.1:PORT/` plus `PAGE` instead of a `file://` URL
- Rename via `git mv`, in both folders: `render.js` → `render.ts`, `make-audio.js` → `make-audio.ts`, `film.js` → `film.ts` (6 renames)
- In both folders: `index.html` (the film script tag's `src` becomes `film.ts`), `package.json` (`node render.ts`, `node make-audio.ts`; `"type": "commonjs"` stays); `templates/new-film/README.md` (file names in the starter's own README)
- Strict types for the six scripts. The scripts stay CommonJS: typed requires (for example `const fs: typeof import('fs') = require('fs')`) and no ESM syntax, so Node runs them unchanged
- `tsconfig.json`: `"moduleDetection": "force"` only if the CommonJS scripts and the two identical copies otherwise collide as global scripts (record the evidence in §9)
- `server/encoders.test.ts` and the template/example identity test: read `render.ts`
- Tests: `.ts` and legacy `.js` film fixtures for script detection, `renderInfo`, `pageOf`, the `.ts` live-serve path and the queued command

Out of scope:
- Docs, the skill, the root README and `CLAUDE.md` (P9), including `docs/PROJECT-CONTRACT.md`
- Converting users' films, or changing how `render.js` films are detected, previewed or rendered
- ESM film scripts, a film build step, or any new dependency
- Changes to render speed, encoders, chunking or the frame transport beyond the page URL
- Rendering anything before S6's explicit user request

## 4. Entry conditions

- [ ] P8 `done`; standards green — verify: `progressive_plan.py status docs/plans/typescript-migration`, then `pnpm format:check && pnpm lint && pnpm typecheck && pnpm build && pnpm test`
- [ ] Working tree clean and pushed — verify: `git status -sb`
- [ ] Phase plan revalidated against current master version (62)
- [ ] Approval recorded per C15 — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

Commit after each step with subject `P10:` followed by the step title, and push. Every commit leaves `pnpm build`, `pnpm typecheck` and `pnpm test` green. Stage explicit paths and check `git status --short` before each commit (L38).

**Hard safety rules (C12), binding for every step:**
1. Never import or run an entry module (`server/hub.ts`, `mcp.ts`, `cli.ts`, `scripts/install.ts`) outside the scratch environment. Every hub or CLI run uses `VIDEOHUB_PORT=7799`, `VIDEOHUB_DATA_DIR`/`VIDEOHUB_BASE_DIR` under `.test-tmp/p10-*`, `VIDEOHUB_GUARD=off`, `VIDEOHUB_JOBS=off` and `VIDEOHUB_NO_WINDOW=1`, plus `HOME`/`XDG_*`/`TMPDIR` under `.test-tmp/p10-*`, a `PATH` with no `claude`/`opencode`, and the real node binary.
2. Never delete anything outside `.test-tmp`. Report it to the coordinator instead.
3. Before any removal inside the repo, even in `.test-tmp`, if you did not create it in this session, show the coordinator `ls -laT` of the target and wait.
4. Never run a film's render script, and never queue a render, before the user's explicit request in S6. Running `make-audio` on a scratch copy is allowed (it only writes `audio/mix.wav`).

### S1 — The hub supports `.ts` film scripts

- Depends on: none
- Files: `server/util.ts`, `server/scan.ts`, `server/live.ts`, `server/jobs.ts`, `server/encoders.ts` (comment); the existing test files covering scan, live serving and jobs (for example `server/jobs.test.ts`, `server/hub-paths.test.ts`), or a new `server/film-ts.test.ts`
- Change: As described in §3. Tests with scratch fixture folders must fail without the change:
  - a folder with `render.ts` is detected as `render.ts`; with only `render.js`, as `render.js`; with both, `render.ts` wins
  - `renderInfo` reads fps and chunk size from an annotated `render.ts`
  - `pageOf` finds `PAGE` in an annotated `render.ts`
  - live serve returns a `.ts` file stripped, as `text/javascript`; a `.js` file is served unchanged
  - the queued command runs `render.ts` for a `.ts` film and `render.js` for a legacy film
- Acceptance:
  - [x] New tests pass and each fails against the reverted change (recorded in §9); existing jobs and live tests pass unchanged
- Verification: `node --test` on the changed test files; `pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S2 — The starter's render script serves the film folder

- Depends on: S1
- Files: `templates/new-film/render.js`, `examples/hello-film/render.js` (kept byte-identical)
- Change: Extend `frameServer`'s request handler to serve the film folder (GET only, inside the folder only, MIME for html, js, ts, css, json, images, fonts, audio and wasm, `.ts` stripped), and open `http://127.0.0.1:PORT/` plus `PAGE`. WebSocket frame transport, chunking and encoding stay unchanged. Comments explain why (Chrome does not run `.ts` from `file://`; the same folder boundary as live preview).
- Acceptance:
  - [x] The two files are identical; the identity test passes; a unit-level check (no browser) shows the handler serves an `index.html` and a stripped `.ts` from a scratch folder, refuses `../` and returns 404 for missing files
- Verification: `cmp templates/new-film/render.js examples/hello-film/render.js`; the check script under `.test-tmp/p10-server/` (it imports nothing from the film's render flow that launches a browser; if the handler cannot be exercised without starting a render, test it by extracting the handler source with `readSource` and marker slices instead, and record which in §9); `pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S3 — Rename the starter and example to TS

- Depends on: S2
- Files: the 6 renames in §3 (temporary first-line `// @ts-nocheck`); both `index.html` and `package.json`; `templates/new-film/README.md`; `server/encoders.test.ts` and the identity test; `server/live.ts` (comment paths); `tsconfig.json` (only if needed, see §3)
- Change: Pure rename plus file-name updates. Grep the repo (excluding `docs/`, `README.md`, `CLAUDE.md`, `AGENTS.md` and `skill/`, which are P9) for other mentions of the six files and report any that are not comments.
- Acceptance:
  - [x] `git log --follow` tracks all 6; template and example `render.ts` are byte-identical; `pnpm build`, `pnpm typecheck` and `pnpm test` pass
- Verification: `git show -M --summary HEAD | grep -c '^ rename'` (6); `git ls-files templates examples | grep -E '\.js$'` (empty); `cmp templates/new-film/render.ts examples/hello-film/render.ts`; `pnpm build && pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S4 — Strict types for the film scripts

- Depends on: S3
- Files: `templates/new-film/render.ts`, `make-audio.ts`, `film.ts`; `examples/hello-film/render.ts`, `make-audio.ts`, `film.ts`; `tsconfig.json` (only if needed, see §3)
- Change: Remove `@ts-nocheck` and add strict types. The scripts stay CommonJS with typed requires. `film.ts` declares its `window` globals with `declare global` (type-only). The two `render.ts` stay byte-identical. Do not annotate the constants that `scan.ts` and `live.ts` read by pattern in a way that changes the stripped text they match (`FPS`, `CH`, `PAGE`, `VW`, `VH`); the S1 tests prove the stripped reads work.
- Acceptance:
  - [x] No `@ts-nocheck`; `pnpm typecheck` passes; the AST comparison against the S3 commit shows 0 differences for all six; `node --check` is not used (C1); `node templates/new-film/make-audio.ts` runs in a scratch copy and writes `audio/mix.wav`
- Verification: `grep -l "@ts-nocheck" templates/new-film/*.ts examples/hello-film/*.ts` (no output); the L8 grep; `pnpm typecheck && pnpm test 2>&1 | tail -8`; the AST result and the scratch `make-audio` run in §9
- Rollback: `git revert HEAD`

### S4b — Recognize `.ts` film code everywhere the hub looks

- Depends on: S4
- Files: `server/source-revision.ts`, `server/live.ts` (watcher filter), `server/scan.ts` (film markers), `ui/review/renderbtn.ts` (toast text only); tests in `server/film-ts.test.ts`, `server/source-revision.test.ts` or `server/scan-cache.test.ts`
- Change: Added at plan v2 (phase-amend from the S5 review). Count `.ts` files as film code in the source revision and the live watcher, and `render.ts` as a film marker in `scan.ts`, next to the existing `.js`/`.mjs` patterns. The toast names "render.ts or render.js". Legacy `.js` films behave exactly as before. Tests fail without the change: a `.ts` change bumps the source revision; `render.ts` alone marks a folder as a code film, including the container check.
- Acceptance:
  - [ ] New tests pass and each fails against the reverted change (recorded in §9); existing tests unchanged
- Verification: `node --test` on the changed test files; `pnpm typecheck && pnpm build && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S5 — Preview check in a real browser

- Depends on: S4b
- Files: the P10 phase plan (modify) — §7, §9 and §10
- Change:
  1. Run the standards commands, then `pnpm build`.
  2. Build a scratch base under `.test-tmp/p10-hub/` with three films: a copy of `examples/hello-film`; a new film copied from `templates/new-film` with `make-audio.ts` run in it and its project length set the way the starter README says; and a legacy copy of the example from the P8 closeout commit (`git archive 0e18934 examples/hello-film`), which still has `render.js` and `film.js`. Seed scratch covers (L34). Start a scratch hub (rule 1).
  3. A throwaway script under `.test-tmp/p10-browser/` drives the repo's `puppeteer-core` with the installed Chrome, headless and muted. It opens `#/` and each film's `#/review/PROJECT_ID/~live` page without `?play=1`, collects console errors and failed requests, and confirms that each live page reports `window.READY` and draws a frame. It clicks nothing and plays nothing.
  4. In the new starter film, change one drawn value in `film.ts` (scratch copy only) and confirm the open live page reloads and the project's source revision changes; put the value back.
  5. Check through the hub API that the TS films' detected script is `render.ts` and the legacy film's is `render.js`. Stop the hub and record the evidence and the L3 warning counts.
- Acceptance:
  - [x] Zero console errors and zero failed requests on all four pages; all three films are live-capable; scripts detected as above; nothing played or rendered
- Verification: the recorded script output; `lsof -nP -iTCP:7799 -sTCP:LISTEN` empty at the end
- Rollback: n/a (scratch only)

### S6 — User preview review, then one render on request

- Depends on: S5
- Files: the P10 phase plan (modify) — §9 and §10
- Change: The coordinator, not the worker, runs this step, because it waits for the user. Start the S5 scratch hub with `VIDEOHUB_JOBS=on` (all other rule-1 settings unchanged) and ask the user to open `http://127.0.0.1:7799`, watch the example copy and the new starter film in live preview, and leave notes. Stop there. Only when the user explicitly asks, queue exactly one full render of the example copy through the scratch hub's queue on port 7799. Then check the output with `ffprobe` (duration about 10 s, video and audio streams), stop the hub and record the evidence. If the user reports a problem in the preview, fix it in code through a worker before any render.
- Acceptance:
  - [ ] The user reviewed the preview; one queued render completed after the user's explicit request; the output has the expected duration and streams
- Verification: the job record from the scratch hub, the `ffprobe` output and the user's request, quoted in §9
- Rollback: n/a (scratch only)

## 6. Phase acceptance criteria

- [ ] A1 — No tracked JS under `templates/` or `examples/`; renames keep history; template and example `render.ts` are byte-identical — verify: `git ls-files templates examples | grep -E '\.js$'` (empty); `cmp` of the two `render.ts`; `git log --follow --oneline templates/new-film/render.ts | wc -l` > 1
- [ ] A2 — `pnpm typecheck` is strict-clean; no `@ts-nocheck` in the film scripts; S4 is runtime-identical — verify: `pnpm typecheck`, the greps and the §9 AST comparison
- [ ] A3 — `pnpm test` has 0 failures and ≥ 312 passing, including the new `.ts`/legacy tests, each shown to fail without its change — verify: `pnpm test` and §9
- [ ] A4 — `pnpm lint` has 0 errors and `pnpm format:check` exits 0 — verify: both commands
- [ ] A5 — The scratch hub's library and the live review pages of the example copy, a new starter film and a legacy `render.js` film load with zero console errors and failed requests — verify: S5 evidence
- [ ] A6 — After the user's review and explicit request, one queued render of the example copy completes with the expected duration and streams — verify: S6 evidence

## 7. Code standards check

- [x] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency (two small follow-up fixes found by the checks: the snap mode and the live hook detection, both recorded in section 9)
- [x] One stripping helper in `server/util.ts` (`readScript`) is reused by scan, live (its `read`, hence pageOf, sizeOf, hasHook, and `serve`) and jobs; the render script's page server reuses the existing `frameServer`
- [x] Names and structure state intent; comments explain only non-obvious reasons (why the page is served over http, why requires are typed, why `headless: 'new'` is cast, why one `any`)
- [x] Every new test fails if the behavior it covers breaks (revert checks in section 9; the S2 page-server check is a scratch script, not a committed test, see the discovery in section 10)
- [x] Master standards commands pass: `pnpm format:check`, `pnpm lint` (0 errors, 148 warnings, unchanged), `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test` (321 tests, 320 pass, 0 fail, 1 skipped), plus `pnpm build`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Serving the page over http changes rendering (origin, canvas readback, frame transport) | Medium | High | Same folder boundary as live preview; transport unchanged; S6 render with `ffprobe` check |
| A film that loads assets from outside its folder renders under `file://` but not over http | Low | Medium | Only new films use `render.ts`; existing `render.js` films keep `file://`; live preview already has this boundary |
| Typing the render script changes the source that `scan.ts`/`live.ts` match by pattern | Medium | Medium | Stripped reads (S1 helper) plus S1 tests on annotated fixtures; S5 checks the detected script |
| CommonJS `.ts` scripts collide as global scripts in one type-check program | Medium | Low | `moduleDetection: "force"` if needed, recorded in §9 |
| `stripTypeScriptTypes` warns or behaves differently on Node 22.18 | Low | Medium | L24: no warnings seen on 22.18; the helper is the single place to change |
| The render runs before the user has reviewed the preview | Low | High | Rule 4; S6 is run by the coordinator and waits for the explicit request |
| Another unsafe probe or stray file (L20, L38) | Low | High | C12 rules; explicit staging |

## 9. Deviations and working notes

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

Entry check (2026-11-22): `pnpm format:check`, `lint` (0 errors, warnings only), `typecheck`, `build` clean; `pnpm test` 313 tests, 312 pass, 0 fail, 1 skipped (baseline). Working tree clean and pushed.

S1 (2026-11-22):
- Helper `readScript` in `server/util.ts`; used by `scan.ts` (renderInfo), `live.ts` (its `read`, which covers pageOf, sizeOf, liveInfo and hasHook; and `serve`) and `jobs.ts` (renderOptions0). `renderInfo` and `pageOf` are now exported so the tests can call them (new exports only).
- `jobs.ts` `recipe` needed no change: `r.script` already falls back to `p.render.script`, which scan fills from the detected script, and stays `render.js` when nothing is detected. The queued-command test therefore passes before and after; it pins the behavior. The jobs.ts change that matters is `renderOptions0` reading the script through `readScript` (test fails without it).
- `serve` answers a `.ts` file as `text/javascript` with types stripped; a file that cannot be stripped (for example an `enum`) gets a 500 with a plain-text message instead of an unhandled throw.
- Comment paths (`server/encoders.ts:3`, `server/live.ts:3,58`) are changed in S3, when the files actually are named `render.ts`.
- New tests: `server/film-ts.test.ts` (5 tests) and 2 in `server/jobs.test.ts`. Revert checks (each run alone): detection list without `render.ts` fails 2 tests (detection, annotated read); `readScript` without stripping fails 4 (annotated read, pageOf, both serve tests); serve without the `.ts` branch fails 2 serve tests; `renderOptions0` with the raw read fails the render-options test. Tests ran in the scratch env `.test-tmp/p10-env`.
- Result: `pnpm format:check`, `lint` (0 errors), `typecheck`, `build` clean; `pnpm test` 320 tests, 319 pass, 0 fail, 1 skipped.

S2 (2026-11-22):
- `serveFolder` added to the starter's `render.js` and wired as the `frameServer` request handler (GET only; the working directory is the root; the real path must stay inside it, which also refuses a symlink pointing out; directories and missing files 404; `.ts` stripped through `require('module').stripTypeScriptTypes`, a file that cannot be stripped answers 500 and logs). The page opens at `http://127.0.0.1:PORT/` plus PAGE relative to the folder.
- The server now always starts (it used to start only for the raw transport and fall back to PNG screenshots when it could not listen). `VIDEOHUB_TRANSPORT=png` still uses PNG screenshots: `openPage` keeps its env check; only the page is served. Because of that, `sockets` is renamed `server`. Failing to listen on 127.0.0.1 is now fatal for a render (the page cannot be served), where before it only fell back to PNG.
- No top-level `process.cwd()`: `server/encoders.test.ts` evaluates fragments of this file in a vm with a fake `process`, and the root is read inside the handler instead.
- Unit-level check, no browser and no render: `.test-tmp/p10-server/check.mjs` extracts `MIME` and `serveFolder` from `templates/new-film/render.js` by markers, runs them on a real loopback server over a scratch folder with the real node binary (scratch HOME and TMPDIR). It asserts: `index.html` served as HTML; `.ts` served as JavaScript without types; `/../`, `%2e%2e` and nested `..` refused; a symlink to a file outside refused (403); missing file, directory, `/` and `%00` return 404; POST returns 405; an enum `.ts` returns 500. Revert check: removing the inside-the-folder test fails the symlink assertion. Output: `serveFolder ok`.
- `cmp templates/new-film/render.js examples/hello-film/render.js` identical; `pnpm format:check`, `lint` (0 errors), `typecheck`, `build` clean; `pnpm test` 319 pass, 0 fail.
- Observation: on Node 24.16 `stripTypeScriptTypes` prints an ExperimentalWarning to stderr once per process (here in the render script and in the hub). L24 saw none on 22.18.

S3 (2026-11-22):
- Six `git mv` renames (each file gets a first-line `// @ts-nocheck`); both `index.html` script tags, both `package.json` scripts and the starter README file names updated with minimal text edits (running oxfmt over a folder had also reformatted HTML, JSON and Markdown; those were restored and redone by hand, so the diff holds only the name changes). `server/encoders.test.ts` reads the render scripts through `readSource` (stripped) and keeps a raw byte comparison for the identity test; comments in `server/encoders.ts` and `server/live.ts` name `render.ts`.
- Grep outside docs, README, CLAUDE.md, AGENTS.md and skill for the six old names: remaining non-comment mentions are `ui/review/renderbtn.ts:63` (toast text: "no render script (render.js)") and the fallback strings `'render.js'` in `server/jobs.ts` and `server/live.ts` that are intended (legacy default). `ui/review/renderbtn.test.ts`, `server/jobs.test.ts` and the platform tests use `render.js` as sample legacy data. Comments only: `server/janitor.ts:382`, `server/jobs.ts:867`, `server/outputs.ts:157`, `server/platform.ts:388`, `server/scenes.ts:4`.
- Verification: `git diff --cached -M --summary | grep -c rename` = 6; `git ls-files templates examples | grep -E '\.js$'` empty; `cmp` of the two `render.ts` identical; format, lint (0 errors), typecheck, build clean; `pnpm test` 319 pass, 0 fail. `moduleDetection` not needed yet (the files are `@ts-nocheck`); evidence for S4 follows below.

S2 follow-up (2026-11-22, found while typing in S4): the S2 change left `node render.ts snap ...` broken, because it passed no server to `openPage` and the page URL now needs one (a null server would throw on `server.port`). Fixed in its own commit before the S4 typing, on the still untyped scripts: snap starts `frameServer()`, passes it to `openPage` with a new `frames = false` argument (no raw frame socket for stills, as before) and closes it. This is a runtime change to S3's text, so the S4 AST comparison uses this commit as its baseline instead of the S3 commit (the difference S3 to baseline is exactly these hunks). A snap run was not executed (it launches a browser; rule 4 applies to every render script).

S4 (2026-11-22):
- `@ts-nocheck` removed from all six; strict types added. The scripts stay CommonJS with typed requires (`const fs: typeof import('fs') = require('fs')`). `film.ts` declares `renderOut`, `READY` and `VH_SCENES` with `declare global`; `render.ts` declares `renderOut` and `__vhRaw` the same way (identical property types, so they merge). The two `render.ts` are byte-identical (`cmp`). No `FPS`, `CH`, `VW`, `VH`, `PAGE` or `ENCODER_ARGS` annotation: `renderInfo`, `pageOf` and the encoders test still read the stripped text (checked: both real scripts give family A, fps 30, chunk 60, 1920x1080, script `render.ts`, page `index.html`).
- `moduleDetection: "force"` was NOT needed and `tsconfig.json` is unchanged. Evidence: with the files un-annotated and `@ts-nocheck` removed, `tsc` reported no redeclaration errors (TS2451, TS2300, TS2393: zero) between the two identical copies, and `declare global` in `film.ts` raised no TS2669; under `module: nodenext` and `"type": "commonjs"` each file is already treated as a module.
- Typed with real types where available (`puppeteer-core` types for `Browser` and `Page`, `node:http`, `node:net`). Casts that strip to the same AST: `as string[]`, `as Buffer`, `as Error`, `!`, and `headless: 'new' as unknown as boolean` (puppeteer-core 25's types list only `true` and `'shell'`; its launcher passes `--headless=new` for any other truthy value, checked in `lib/puppeteer/node/ChromeLauncher.js`). One `catch (e: any)` in the chunk retry loop, with a comment (L8 grep over both folders: that line is the only `any`, in each copy).
- AST comparison (`.test-tmp/p10-ast/cmp.mjs`, copied from `.test-tmp/p6-strip/cmp.mjs`: parse both sides with rolldown's parser, drop positions, compare JSON) of all six scripts after stripping, against commit b9b398a (the S2 snap fix, see the S2 follow-up; the S3 commit differs from it only by the snap hunks). Result: `same` for `templates/new-film/{render,make-audio,film}.ts` and `examples/hello-film/{render,make-audio,film}.ts`, `different: 0`. Negative control: changing `DUR = 10` to `DUR = 11` in a baseline copy of `film.ts` gives `DIFF`, `different: 1`.
- `node make-audio.ts` in scratch copies of both folders (`.test-tmp/p10-audio/`, real node binary, scratch HOME and TMPDIR) wrote `audio/mix.wav` (882044 bytes each) and printed `audio/mix.wav: 10 s placeholder` / `10 s, 0.8 MB`.
- `grep -l "@ts-nocheck"` over both folders: no output. `pnpm format:check`, `lint` (0 errors, 148 warnings, same as before the step), `typecheck`, `build` clean; `pnpm test` 320 tests, 319 pass, 0 fail, 1 skipped. The S2 unit check still passes against `render.ts` (markers `const MIME` and the stripped text).

S1 follow-up (2026-11-22, found in S5): the scratch hub listed `hello-film` and `new-film` as not live-capable (`live: false` in `/api/projects`), while the legacy film was capable. Cause: `hasHook` in `server/live.ts` followed only `.js`/`.mjs` script tags and `src/` files, so a page loading `film.ts` never showed its `window.renderOut`. The S1 tests covered script detection, `pageOf` and serving, but not the hook. Fixed in `server/live.ts` (both patterns also accept `.ts`; comment updated) with a new test in `server/film-ts.test.ts` (a page loading `film.ts`, one loading `film.js`, one whose `.ts` has no hook, and a hook in `src/main.ts`); with the live.ts change reverted the test fails on its first assertion. Standards: format, lint (0 errors, 148 warnings), typecheck, build clean; `pnpm test` 321 tests, 320 pass, 0 fail.

S5 (2026-11-22):
- Scratch base `.test-tmp/p10-hub/` (kept in place for S6, hub stopped): `base/films/hello-film` (copy of `examples/hello-film`, id `b722b528f0c5`, `.videohub/project.json` from the example's `videohub-project.json` as the installer does), `base/films/new-film` (copy of `templates/new-film`, id `96cfaa70e095`; `make-audio.ts` run in it, then the length set with `node server/cli.ts hub_project` with `set.render.workers 2` and `env.DUR 10`, the way its README says), `base/films/hello-legacy` (`git archive 0e18934 examples/hello-film`, id `0f42bd1cce93`, still `render.js`, `film.js`, `make-audio.js`). Scratch covers: `data/thumbs/live-ID.jpg` for the three ids, made with ffmpeg (L34). `data/config.json` pins port 7799 and the one root `base/films`.
- Start command (rule 1; also saved as `.test-tmp/p10-hub/start-hub.sh`, which runs from the repo folder): `env -i HOME=.test-tmp/p10-hub/home XDG_CONFIG_HOME=.test-tmp/p10-hub/home/.config XDG_DATA_HOME=.test-tmp/p10-hub/home/.local/share TMPDIR=TMP=TEMP=.test-tmp/p10-hub/tmp PATH=.test-tmp/p4-bin:/usr/bin:/bin VIDEOHUB_PORT=7799 VIDEOHUB_DATA_DIR=.test-tmp/p10-hub/data VIDEOHUB_BASE_DIR=.test-tmp/p10-hub/base VIDEOHUB_GUARD=off VIDEOHUB_JOBS=off VIDEOHUB_NO_WINDOW=1 /Users/jorge/.asdf/installs/nodejs/24.16.0/bin/node server/hub.ts` (all paths absolute in the script; `p4-bin` holds symlinks to node, ffmpeg, ffprobe, git, pnpm and no `claude` or `opencode`). The script reads `VIDEOHUB_JOBS` from its caller with default `off`, so S6 starts it with `VIDEOHUB_JOBS=on .test-tmp/p10-hub/start-hub.sh`. Log: `.test-tmp/p10-hub/hub.log`; the pid file `.test-tmp/p10-hub/pid` is the one process started.
- First run exposed the hook detection gap (S1 follow-up above): `/api/projects` showed `live` false for both `.ts` films. After the fix and a hub restart: `hello-film render.ts live=True`, `new-film render.ts live=True`, `hello-legacy render.js live=True`.
- Browser check `.test-tmp/p10-browser/check.mjs` (puppeteer-core 25 with the installed Google Chrome, headless, `--mute-audio`, scratch profile; run with the real node binary under `env -i`, scratch HOME and TMPDIR): opened `#/` and `#/review/ID/~live` for the three films without `?play=1`; clicked nothing; counted console errors and warnings, page errors, failed requests, HTTP 400 and above, and `play`/`playing` events. Output: all four pages `ok`; in every film frame `READY: true`, canvas `1920x1080`, `drawn: true`, `hasRenderOut: true`; each review page showed one `VIDEO paused=true`; `plays: []` on all pages; `total problems ... 0`. `/api/jobs` was `[]`, and no `render` folder exists in any scratch film.
- Hub stopped with `kill` of the pid I started; `lsof -nP -iTCP:7799 -sTCP:LISTEN` empty. L3: `pnpm lint` 0 errors, 148 warnings (the count was 148 before S4 and after; none new in the film scripts beyond the catch-parameter and no-unused-expressions rules those files already had as JavaScript).
- The hub prints one `ExperimentalWarning: stripTypeScriptTypes` to its stderr on Node 24.16 the first time a `.ts` film script is read; nothing reaches the browser console.

## 10. Closeout

Fill at the end of every implementation session. Do not mark the phase done until this section is complete and the master is updated. Set `Implemented by` to the worker name or ID and `Implemented at` to the implementation date; `close` requires both.

- Date: 2026-11-22
- Session: p10-worker (steps S1 to S5; S6 belongs to the coordinator and the user)
- Verdict: partial (S6 pending)
- Steps complete: S1, S2, S3, S4, S5 (commits e762929, 4152faf, 713ddba, b9b398a snap fix, f493078, d6e13d2 hook fix)
- Verification run: `pnpm install --frozen-lockfile` (up to date), `pnpm format:check` (clean), `pnpm lint` (0 errors, 148 warnings), `pnpm typecheck`, `pnpm build`, `pnpm test` (321 tests, 320 pass, 0 fail, 1 skipped); `cmp` of the two `render.ts`; AST comparison of the six scripts (0 differences); scratch `make-audio.ts` runs; S2 page-server unit check; S5 browser check with the scratch hub (0 problems on four pages); `lsof` on 7799 empty.

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | met | `git ls-files templates examples` has no `.js`; `cmp templates/new-film/render.ts examples/hello-film/render.ts` identical; `git show -M --summary 713ddba` shows 6 renames; `git log --follow --oneline templates/new-film/render.ts` 10 commits |
| A2 | met | `pnpm typecheck` clean with no `moduleDetection` change; `grep -l "@ts-nocheck"` over both folders prints nothing; AST comparison of all six scripts against b9b398a gives `different: 0`, with a negative control that does produce a DIFF (section 9, S4) |
| A3 | met | `pnpm test` 321 tests, 320 pass, 0 fail (baseline 312 pass); new tests in `server/film-ts.test.ts` and `server/jobs.test.ts` each fail with their change reverted (section 9, S1 and the hook follow-up); the queued-command test is a pin that passes before and after because `recipe` already used the detected script |
| A4 | met | `pnpm lint` 0 errors (148 warnings, unchanged); `pnpm format:check` exits 0 |
| A5 | met | S5: library and live review pages of `hello-film`, `new-film` and `hello-legacy` load with zero console errors, page errors, failed requests and play events; each film frame reports `READY`, a 1920x1080 canvas and a drawn frame; scripts detected as `render.ts`, `render.ts`, `render.js`; no job, no render folder |
| A6 | pending | S6, user gate |
| D1 (master) | met | This phase's share: no `.js` is tracked under `templates/` or `examples/`, and `git ls-files '*.js' '*.mjs' '*.cjs' '*.jsx'` prints nothing now. D stays open until P9 |
| D2 (master) | met | This phase's share: both film folders type-check strictly under the root config (no `@ts-nocheck`). D stays open until P9 |
| D3 (master) | met | This phase's share: lint 0 errors and format clean with the six scripts as TypeScript. D stays open until P9 |
| D4 (master) | met | This phase's share: 320 passing tests, above the 312 floor, with the new `.ts` and legacy tests. D stays open until P9 |
| D7 (master) | pending | S6, user gate (the example and starter previews are verified; the user review and the one queued render are not) |
| D8 (master) | met | This phase's share: `render.js`/`film.js` films still preview (the `hello-legacy` copy in the S5 browser check, live-capable, `render.js` detected) and queue (the queued-command test for a legacy film). D stays open until P9 |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|
| P10-1 | The S2 change broke `node render.ts snap ...` (the page URL needs the server, snap passed none). Found while typing; fixed in b9b398a; snap itself was not run (it launches a browser) | note | P10 | Fixed; AST baseline moved to b9b398a (section 9) |
| P10-2 | `hasHook` in `server/live.ts` followed only `.js`/`.mjs`, so `.ts` films were not live-capable. Found by the S5 check; fixed in d6e13d2 with a test | note | P10 | Fixed (section 9) |
| P10-3 | More `.js`-only patterns remain that matter for `.ts` films: `server/source-revision.ts:15` (the code-file pattern behind the live revision, so editing `film.ts` may not change the revision or trigger the reload), `server/live.ts:334` (the watcher's extension filter), `server/scan.ts:320,331,387` (`render\.(m?js|py)` as film markers for discovery; a film with `render.ts` but no `index.html` is not recognized). `source-revision.ts` is outside this plan's file list, so none of these was changed | phase-amend | P10 (or a new phase) | Coordinator decision: amend P10 with these files and tests, then re-run S5 and check reload after editing `film.ts` in the scratch hub |
| P10-4 | The starter's page server (`serveFolder`) has no committed test; the plan allowed a scratch script (`.test-tmp/p10-server/check.mjs`). A committed test would extract it from `render.ts` by markers like `encoders.test.ts` does | phase-amend | P10 | Coordinator decision: add a test file entry to S2 |
| P10-5 | `stripTypeScriptTypes` prints an ExperimentalWarning to stderr on Node 24.16, once per process (hub, render script). On 22.18 L24 saw none | note | P9 or later | None written; harmless to the browser console, but visible in render job logs |
| P10-6 | `ui/review/renderbtn.ts:63` toast text says "no render script (render.js)"; with `render.ts` as the default it should name both | note | P9 or later | None written (user-visible text, outside P10 files) |
| P10-7 | The page server is now required for every render: if listening on 127.0.0.1 fails, the render fails (before, it fell back to PNG screenshots with the page on `file://`) | note | P10 | Recorded in section 9 (S2); no action |

**Master updates written:** none (master.md is owned by the coordinator)
**Next-phase updates written:** none
**Remaining work and handoff:** S6, run by the coordinator after the user's review. Scratch hub: `VIDEOHUB_JOBS=on /Users/jorge/code/Videohub/.test-tmp/p10-hub/start-hub.sh` (section 9, S5; port 7799, hub stopped now). Project ids: example copy `b722b528f0c5` (`hello-film`), starter film `96cfaa70e095` (`new-film`), legacy copy `0f42bd1cce93` (`hello-legacy`). Ask the user to open http://127.0.0.1:7799, watch the example copy and the new film in live preview, and leave notes; queue exactly one render of `hello-film` only on the user's explicit request, then run ffprobe on the output (about 10 s, video and audio streams). Open decisions for the coordinator before S6: P10-3 and P10-4 above.
