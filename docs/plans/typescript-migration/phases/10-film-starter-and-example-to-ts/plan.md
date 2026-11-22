# Phase P10 — Film starter and example to TS

- Plan ID: `typescript-migration`
- Phase: P10
- Plan version: 1
- Validated against master version: 62
- Status: ready
- Approved by: Jorge Venegas (standing instruction 2026-11-22, C15)
- Approved at: 2026-11-22
- Commit: pending
- Implementation mode: subagent
- Implemented by: pending
- Implemented at: pending
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
  - [ ] New tests pass and each fails against the reverted change (recorded in §9); existing jobs and live tests pass unchanged
- Verification: `node --test` on the changed test files; `pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S2 — The starter's render script serves the film folder

- Depends on: S1
- Files: `templates/new-film/render.js`, `examples/hello-film/render.js` (kept byte-identical)
- Change: Extend `frameServer`'s request handler to serve the film folder (GET only, inside the folder only, MIME for html, js, ts, css, json, images, fonts, audio and wasm, `.ts` stripped), and open `http://127.0.0.1:PORT/` plus `PAGE`. WebSocket frame transport, chunking and encoding stay unchanged. Comments explain why (Chrome does not run `.ts` from `file://`; the same folder boundary as live preview).
- Acceptance:
  - [ ] The two files are identical; the identity test passes; a unit-level check (no browser) shows the handler serves an `index.html` and a stripped `.ts` from a scratch folder, refuses `../` and returns 404 for missing files
- Verification: `cmp templates/new-film/render.js examples/hello-film/render.js`; the check script under `.test-tmp/p10-server/` (it imports nothing from the film's render flow that launches a browser; if the handler cannot be exercised without starting a render, test it by extracting the handler source with `readSource` and marker slices instead, and record which in §9); `pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S3 — Rename the starter and example to TS

- Depends on: S2
- Files: the 6 renames in §3 (temporary first-line `// @ts-nocheck`); both `index.html` and `package.json`; `templates/new-film/README.md`; `server/encoders.test.ts` and the identity test; `server/live.ts` (comment paths); `tsconfig.json` (only if needed, see §3)
- Change: Pure rename plus file-name updates. Grep the repo (excluding `docs/`, `README.md`, `CLAUDE.md`, `AGENTS.md` and `skill/`, which are P9) for other mentions of the six files and report any that are not comments.
- Acceptance:
  - [ ] `git log --follow` tracks all 6; template and example `render.ts` are byte-identical; `pnpm build`, `pnpm typecheck` and `pnpm test` pass
- Verification: `git show -M --summary HEAD | grep -c '^ rename'` (6); `git ls-files templates examples | grep -E '\.js$'` (empty); `cmp templates/new-film/render.ts examples/hello-film/render.ts`; `pnpm build && pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S4 — Strict types for the film scripts

- Depends on: S3
- Files: `templates/new-film/render.ts`, `make-audio.ts`, `film.ts`; `examples/hello-film/render.ts`, `make-audio.ts`, `film.ts`; `tsconfig.json` (only if needed, see §3)
- Change: Remove `@ts-nocheck` and add strict types. The scripts stay CommonJS with typed requires. `film.ts` declares its `window` globals with `declare global` (type-only). The two `render.ts` stay byte-identical. Do not annotate the constants that `scan.ts` and `live.ts` read by pattern in a way that changes the stripped text they match (`FPS`, `CH`, `PAGE`, `VW`, `VH`); the S1 tests prove the stripped reads work.
- Acceptance:
  - [ ] No `@ts-nocheck`; `pnpm typecheck` passes; the AST comparison against the S3 commit shows 0 differences for all six; `node --check` is not used (C1); `node templates/new-film/make-audio.ts` runs in a scratch copy and writes `audio/mix.wav`
- Verification: `grep -l "@ts-nocheck" templates/new-film/*.ts examples/hello-film/*.ts` (no output); the L8 grep; `pnpm typecheck && pnpm test 2>&1 | tail -8`; the AST result and the scratch `make-audio` run in §9
- Rollback: `git revert HEAD`

### S5 — Preview check in a real browser

- Depends on: S4
- Files: the P10 phase plan (modify) — §7, §9 and §10
- Change:
  1. Run the standards commands, then `pnpm build`.
  2. Build a scratch base under `.test-tmp/p10-hub/` with three films: a copy of `examples/hello-film`; a new film copied from `templates/new-film` with `make-audio.ts` run in it and its project length set the way the starter README says; and a legacy copy of the example from the P8 closeout commit (`git archive 0e18934 examples/hello-film`), which still has `render.js` and `film.js`. Seed scratch covers (L34). Start a scratch hub (rule 1).
  3. A throwaway script under `.test-tmp/p10-browser/` drives the repo's `puppeteer-core` with the installed Chrome, headless and muted. It opens `#/` and each film's `#/review/PROJECT_ID/~live` page without `?play=1`, collects console errors and failed requests, and confirms that each live page reports `window.READY` and draws a frame. It clicks nothing and plays nothing.
  4. Check through the hub API that the TS films' detected script is `render.ts` and the legacy film's is `render.js`. Stop the hub and record the evidence and the L3 warning counts.
- Acceptance:
  - [ ] Zero console errors and zero failed requests on all four pages; all three films are live-capable; scripts detected as above; nothing played or rendered
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

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] One stripping helper in `server/util.ts` is reused by scan, live and serve; the render script's page server reuses the existing `frameServer`
- [ ] Names and structure state intent; comments explain only non-obvious reasons (why the page is served over http, why requires are typed)
- [ ] Every new test fails if the behavior it covers breaks (revert checks in §9)
- [ ] Master standards commands pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test`, plus `pnpm build`

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

## 10. Closeout

Fill at the end of every implementation session. Do not mark the phase done until this section is complete and the master is updated. Set `Implemented by` to the worker name or ID and `Implemented at` to the implementation date; `close` requires both.

- Date:
- Session:
- Verdict: pending
- Steps complete:
- Verification run:

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | pending | |
| A2 | pending | |
| A3 | pending | |
| A4 | pending | |
| A5 | pending | |
| A6 | pending | |
| D1 (master) | pending | |
| D2 (master) | pending | |
| D3 (master) | pending | |
| D4 (master) | pending | |
| D7 (master) | pending | |
| D8 (master) | pending | |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|

**Master updates written:** none yet
**Next-phase updates written:** none yet
**Remaining work and handoff:** none yet
