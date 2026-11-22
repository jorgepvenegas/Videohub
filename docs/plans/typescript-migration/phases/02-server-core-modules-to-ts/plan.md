# Phase P2 — Server core modules to TS

- Plan ID: `typescript-migration`
- Phase: P2
- Plan version: 1
- Validated against master version: 17
- Status: in_progress
- Approved by: Jorge Venegas
- Approved at: 2026-11-21
- Commit: pending
- Implementation mode: subagent
- Implemented by: pending
- Implemented at: pending
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: P1
- Written: 2026-11-21
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Convert the core of the hub server to strict TypeScript: the 27 top-level `server/*.js` modules below the entry and tool layer, and the 19 tests that cover them. The entry and tool layer, `server/thumbstudio/` and the `.mjs` sound helpers wait for P3. Behavior does not change. The renamed modules run through Node type stripping (C1). Files that are still JavaScript keep working by importing the new `.ts` paths. Tests that evaluate source text read it through one shared type-stripping helper (C7) and slice between stable markers (L4). After P2, about 40% of the JavaScript is gone and every converted server file passes `strict` type checking.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Removes 46 tracked `.js` files from `server/` (27 modules + 19 tests), keeping their history | A1, A6 |
| D2 | Every converted file passes `strict` with no `@ts-nocheck` and only justified `any` | A2 |
| D3 | Converted files are lint-clean (0 errors) and oxfmt-formatted | A4 |
| D4 | The suite stays at 299 tests, ≥ 298 pass, 0 fail | A3 |
| D5 | A scratch hub still starts and serves its API and UI with JS importers pointing at `.ts` modules | A5 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L2 | `server/encoders.js` passes an `async` executor to `new Promise` (oxlint `no-async-promise-executor`) | Inspected at planning (`server/encoders.js:105`): the only throwing call inside, `spawn`, is already wrapped in `try/catch`, so the risk is low. S4 types it **as-is** with no behavior change. The worker records in §9 whether any path can still throw out of the executor. A fix needs a separate user-approved change and is out of scope here |
| L3 | 12 lint rules sit at `warn` (146 warnings) | No dead-code removal or warning cleanup in P2, and `noUnusedLocals` stays off. The worker records the warning count for P2 files before and after (S5) |
| L4 | oxfmt reflows statements, so source-reading tests must slice between stable markers | S1's helper returns whole stripped source. S3 and S4 convert the seven source-reading tests (`config`, `guard`, `jobs`, `peaks`, `ramhogs`, `scan-cache`, `util`) to marker slicing where they still pick single lines. Assertions stay unchanged |

## 3. Scope

In scope (P2 file set; `git mv` each `X.js` → `X.ts`, C8):
- Modules (27): `ciktilar-dir`, `ciktilar`, `config`, `edit2d`, `encoders`, `example`, `guard`, `janitor`, `jobs`, `layers`, `legacy`, `live`, `media`, `notes`, `open-file`, `outputs`, `pickfolder`, `platform`, `ramhogs`, `scan`, `scenes`, `sound`, `soundedit`, `source-revision`, `transcript`, `tweaks`, `util`.
- Tests (19): `config`, `encoders`, `guard`, `janitor`, `jobs`, `killtree-unix`, `legacy`, `notes`, `open-file`, `peaks`, `platform.darwin`, `platform.linux`, `ramhogs`, `scan-cache`, `soundedit`, `source-revision`, `trash-darwin`, `tweaks`, `util`. (`.test.js` → `.test.ts`.)
- A shared, type-only `server/types.ts` for shapes used by more than one module, such as a project record or a job. It holds only `export type`/`interface`, no runtime code.
- The shared test helper `scripts/test-source.ts` (C7).
- Import specifier updates (`./X.js` → `./X.ts`) in JavaScript files that stay for later phases. The change is specifiers only: no other edits to those files.

Out of scope:
- `server/hub.js`, `mcp.js`, `cli.js`, `tools.js`, `mcp-selftest.js`, `sfxlib.mjs`, `vhsound.mjs`, `hub-paths.test.js`, `tools.test.js`, `duck.test.js` (it imports `vhsound.mjs`) and all of `server/thumbstudio/` (P3).
- The `render.js` default in `jobs`/`live` and film `.ts` serving (P8). `encoders.test` keeps reading `render.js` until P8.
- `scripts/*` conversion and installer paths (P4). Only import specifiers change in this phase.
- Behavior changes, the L2 fix, lint warning cleanup and dead-code removal (L3).
- Turning on `noUnusedLocals`/`noUnusedParameters` or removing `allowJs` (P9).

## 4. Entry conditions

- [ ] P1 is `done` in the master and `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` is green on `plan/typescript-migration` — verify: `python3 .claude/skills/progressive-plan/scripts/progressive_plan.py status docs/plans/typescript-migration` and the four commands
- [ ] Working tree clean and pushed — verify: `git status -sb`
- [ ] Phase plan revalidated against current master version (17)
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

Commit after each step with subject `P2:` followed by the step title and push (draft PR open). Every commit must leave `pnpm test` green.

### S1 — Shared type-stripping source reader for tests

- Depends on: none
- Files:
  - `scripts/test-source.ts` (create) — `readSource(url)`, which returns the file's text, with types stripped for `.ts` files via `node:module` `stripTypeScriptTypes`
- Change: Write one small exported function that the source-reading tests across all later phases can share. Strip mode must keep line and column positions (whitespace replacement) so that regexes and stack traces stay meaningful. Verify that assumption (d) in the master holds and record the result in §9. It is not a test file, so `scripts/test.mjs` does not collect it.
- Acceptance:
  - [ ] For a `.ts` input with annotations, `readSource` returns code that `vm` can run; for a `.js` input it returns the text unchanged
- Verification: a one-off `node -e` check against a scratch `.ts` under `.test-tmp`, recorded in §9; then `pnpm typecheck && pnpm lint` — expected: exit 0
- Rollback: `git rm scripts/test-source.ts`

### S2 — Rename the P2 file set and repoint every importer (no type changes)

- Depends on: S1
- Files:
  - the 27 modules and 18 tests listed in §3 (rename via `git mv`; add a `// @ts-nocheck` first line as a temporary marker so the strict check passes mid-phase)
  - importers whose only change is specifiers: `server/hub.js`, `server/mcp.js`, `server/cli.js`, `server/tools.js`, `server/mcp-selftest.js`, `server/hub-paths.test.js` (its `new URL` target stays `hub.js`; edit only if it imports a renamed module), `server/tools.test.js`, `server/duck.test.js` (only if it imports a renamed module), `server/thumbstudio/store.js`, `server/thumbstudio/templates.js`, and any `server/thumbstudio/*.test.js` that imports a renamed server module; `scripts/install.mjs`, `scripts/init-config.mjs`, `scripts/agents.mjs`, and any `scripts/*.test.js` that imports a renamed server module
  - renamed tests: `new URL('./X.js', …)` source paths become `./X.ts`
- Change: A pure rename commit. Each file keeps its content apart from the temporary `@ts-nocheck` marker, the updated relative import specifiers, and source-reading paths that now point at `.ts`. `git log --follow` must track every renamed file. Find importers with `grep -rnE "from '(\./|\.\./)+(server/)?(util|config|platform|…the 27 module names)\.js'"` across `server`, `scripts` and `ui`; the UI should have none (CLAUDE.md rule).
- Acceptance:
  - [ ] `git show --stat HEAD -M` lists the 46 files as renames (`R`), with no rename below 90% similarity
  - [ ] `pnpm test` still reports 299 tests, ≥ 298 pass, 0 fail
- Verification: `git show -M --summary HEAD | grep -c rename` — expected: `46`; `pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S3 — Strict types for the foundation modules

- Depends on: S2
- Files:
  - `server/types.ts` (create) — shared type-only shapes
  - `server/legacy.ts`, `util.ts`, `pickfolder.ts`, `ciktilar-dir.ts`, `config.ts`, `platform.ts`, `encoders.ts`, `ramhogs.ts`, `guard.ts`, `open-file.ts`, `source-revision.ts` (modify)
  - their tests: `legacy.test.ts`, `util.test.ts`, `config.test.ts`, `platform.darwin.test.ts`, `platform.linux.test.ts`, `killtree-unix.test.ts`, `trash-darwin.test.ts`, `encoders.test.ts`, `ramhogs.test.ts`, `guard.test.ts`, `open-file.test.ts`, `source-revision.test.ts` (modify)
- Change: Remove the `@ts-nocheck` marker and add types to parameters, return values, injectable dependency objects (the `platform` injection shape) and exported constants until `strict` passes. Exported names and runtime values stay the same, and result shapes are described, not changed. Use `import type` for type-only imports, as `verbatimModuleSyntax` requires. Avoid `any`; use `unknown` plus narrowing for parsed JSON and `catch` values. Where `any` is truly needed, add a comment on the same line saying why. The source-reading tests (`config`, `guard`, `ramhogs`, `util`) switch to `readSource` from S1 and to marker slices where they pick single lines (L4). Their assertions stay the same. `encoders.test.ts` keeps reading the `render.js` files.
- Acceptance:
  - [ ] No `@ts-nocheck` in the S3 files; `pnpm typecheck` exit 0
  - [ ] Suite still at baseline
- Verification: `grep -l "@ts-nocheck" server/{legacy,util,pickfolder,ciktilar-dir,config,platform,encoders,ramhogs,guard,open-file,source-revision}*.ts` — expected: no output; `pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD` (S2's renames stay valid with `@ts-nocheck`)

### S4 — Strict types for the domain modules

- Depends on: S3
- Files:
  - `server/scan.ts`, `janitor.ts`, `notes.ts`, `media.ts`, `live.ts`, `jobs.ts`, `sound.ts`, `soundedit.ts`, `outputs.ts`, `ciktilar.ts`, `layers.ts`, `scenes.ts`, `edit2d.ts`, `tweaks.ts`, `transcript.ts`, `example.ts` (modify)
  - `server/types.ts` (modify)
  - their tests: `scan-cache.test.ts`, `janitor.test.ts`, `notes.test.ts`, `peaks.test.ts`, `jobs.test.ts`, `soundedit.test.ts`, `tweaks.test.ts` (modify)
- Change: Apply the S3 method to the domain modules. `encoders.ts` from S3 keeps its async executor exactly as it is (L2). Record in §9 whether anything can still throw out of it. The source-reading tests (`jobs`, `peaks`, `scan-cache`) switch to `readSource` plus marker slices, with assertions unchanged. If typing reveals a real bug, such as a property read on a value that can be undefined, add no runtime fix: type the current behavior, add a note to §9, and report it as a discovery.
- Acceptance:
  - [ ] No `@ts-nocheck` anywhere under `server/*.ts`
  - [ ] Every `any` in `server/*.ts` has a same-line justification comment
- Verification: `grep -rn "@ts-nocheck" server/*.ts` — expected: no output; `grep -nE "\bany\b" server/*.ts | grep -v "//"` — expected: no output; `pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S5 — Phase verification and scratch-hub smoke test

- Depends on: S4
- Files:
  - `docs/plans/typescript-migration/phases/02-server-core-modules-to-ts/plan.md` (modify) — §9 evidence, §10 closeout
- Change: Run every standards command. Record the lint warning count for P2 files before and after (L3). Start a scratch hub entirely under `.test-tmp/p2-hub` with `VIDEOHUB_PORT=7799 VIDEOHUB_DATA_DIR=… VIDEOHUB_BASE_DIR=… VIDEOHUB_GUARD=off VIDEOHUB_JOBS=off VIDEOHUB_NO_WINDOW=1 node server/hub.js`. Confirm that `GET /api/ping` returns `app: "videohub"`, that `GET /` returns the UI HTML, and that `VIDEOHUB_PORT=7799 node server/cli.js hub_workspace` prints the scratch workspace. Then stop the hub. Never contact port 7788 or touch real data, films or agent profiles.
- Acceptance:
  - [ ] All standards commands green and scratch-hub evidence recorded in §9
- Verification: `pnpm install --frozen-lockfile && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test 2>&1 | tail -8` — expected: exit 0, `fail 0`; the curl/CLI outputs in §9
- Rollback: n/a (verification only)

## 6. Phase acceptance criteria

- [ ] A1 — The P2 file set is fully `.ts`. Exactly these tracked JavaScript files remain directly in `server/`: `hub.js`, `mcp.js`, `cli.js`, `tools.js`, `mcp-selftest.js`, `hub-paths.test.js`, `tools.test.js`, `duck.test.js`, `sfxlib.mjs`, `vhsound.mjs` — verify: `git ls-files 'server/*.js' 'server/*.mjs' | grep -v thumbstudio`
- [ ] A2 — `pnpm typecheck` is strict-clean with no `@ts-nocheck` in `server/*.ts`, and every `any` is justified on its line — verify: the S4 greps and `pnpm typecheck`
- [ ] A3 — `pnpm test` reports 299 tests, ≥ 298 pass, 0 fail, and source-reading tests use `readSource` — verify: `pnpm test` and `grep -L readSource server/{config,guard,jobs,peaks,ramhogs,scan-cache,util}.test.ts` (no output)
- [ ] A4 — `pnpm lint` has 0 errors and `pnpm format:check` exits 0 — verify: both commands
- [ ] A5 — A scratch hub on 7799 starts, answers `/api/ping`, serves `/`, and the CLI reaches it — verify: S5 evidence in §9
- [ ] A6 — Renames keep history — verify: `git log --follow --oneline server/util.ts | wc -l` shows commits from before P2

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers are reused where they fit; `server/types.ts` holds only types shared by two or more modules
- [ ] Names and structure state intent; comments explain only non-obvious reasons (including every `any`)
- [ ] Every new test fails if the behavior it covers breaks; no test restates the implementation (no new tests expected; converted tests keep their assertions)
- [ ] Master standards commands pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Strict typing pressures the worker to "fix" code, changing behavior | Medium | High | Rule: describe existing behavior; report suspected bugs as discoveries; coordinator reviews the diff for runtime changes beyond specifiers and type syntax |
| Rename similarity drops below git's threshold once types are added, breaking `--follow` | Low | Medium | S2 is a pure rename commit, and types land in S3/S4 |
| `stripTypeScriptTypes` changes positions or warns as experimental | Low | Low | S1 checks positions; warnings go to stderr and tests ignore them |
| JS importers of `.ts` modules get no type checking (`checkJs` off) | Certain | Low | Accepted until P3/P4 convert them |
| `platform.ts` dependency-injection shape is large and loosely used by tests | Medium | Medium | Type the injectable dependencies as one exported interface; tests pass partial fakes via `Partial<…>` or a narrow cast with a comment |
| 46 files in one phase is a long session | Medium | Medium | Per-step commits keep the repo green; a session that runs out closes `partial` with the next step named |

## 9. Deviations and working notes

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

- 2026-11-21 S1: `scripts/test-source.ts` created (`readSource(url)`). Check under `.test-tmp` with a scratch `.ts` (annotations): stripped output has equal line count, equal length and equal `return` offset (assumption (d) holds: whitespace replacement); `vm.runInNewContext` runs it; a `.js` input returns text unchanged; Node prints an ExperimentalWarning for `stripTypeScriptTypes` on stderr (harmless). `pnpm typecheck` exit 0, `pnpm lint` 0 errors. Lint baseline before P2: 40 warnings in the top-level `server/*` files of the P2 set (counted from `pnpm lint` output, excluding hub/mcp/cli/tools/mcp-selftest and their tests; 146 repo-wide).
- 2026-11-21 S2: `git mv` of 27 modules + 19 tests (46 files; the plan's S2 text says 18 tests, §3 lists 19, 46 is right). Specifiers repointed by a script that resolves each relative `.js` string against the renamed set (importers: `scripts/{agents,init-config,install}.mjs`, `server/{hub,tools,mcp-selftest}.js`, `server/thumbstudio/{store,templates}.js` and 4 thumbstudio tests; `mcp.js`/`cli.js`/`duck.test.js`/`hub-paths.test.js`/`tools.test.js` needed no change; no UI file imports a renamed module). `git show -M --summary HEAD | grep -c rename` prints 47 (46 renames plus the commit subject line containing the word). Two tiny files fall below the 90% similarity bar because the added `// @ts-nocheck` line is a large share of 7-9 line files: `server/pickfolder.ts` 67%, `server/ciktilar-dir.ts` 83%; `git log --follow` still tracks both (pickfolder 3 commits, ciktilar-dir 2). `pnpm typecheck` exit 0; `pnpm test` 299 tests, 298 pass, 1 skipped, 0 fail.
- 2026-11-21 S3: `server/types.ts` created (`Json`, `RunResult`, `ProbeInfo`, `ProcessRow`, `TrashResult`, `RamHog`, `Root`, `Config`, `Project`). `Json` is the single justified `any` alias (JSON.parse results); the plan's `any` grep (`grep -nE "\bany\b" server/*.ts | grep -v "//"`) also matches a test title containing the word "any" in `server/platform.darwin.test.ts:274`, a false positive. Test fakes for `fs`/`os`/`spawn` are passed as `as never` with a comment (fakes implement only the calls the module makes). `typeof fileOpenPlan`'s option type gained an optional `how` because `open-file` already passes it (ignored at runtime). Source-reading tests `config`, `guard`, `ramhogs`, `util` now use `readSource`; they already sliced by `indexOf` markers or import/export regexes, so no assertion changed. `encoders.test.ts` still reads `render.js` via `readFileSync`. Verification: `grep -l "@ts-nocheck"` over the S3 files prints nothing; `pnpm typecheck` exit 0; `pnpm test` 299 tests, 298 pass, 0 fail; `pnpm format:check` and `pnpm lint` 0 errors.

- 2026-11-21 S4: removed the last `// @ts-nocheck` (`grep -rn "@ts-nocheck" server/*.ts` prints nothing); `pnpm typecheck` exit 0; `pnpm test` 299 tests, 298 pass, 1 skipped, 0 fail; `pnpm format:check` exit 0; `pnpm lint` exit 0 (40 warnings in the P2 top-level `server/*` files, unchanged from the baseline: no dead code was removed). The plan's `any` grep (`grep -nE "\bany\b" server/*.ts | grep -v "//"`) prints only the false positive in the test title at `server/platform.darwin.test.ts:274` (the word "any" in prose); the single `any` is the `Json` alias in `server/types.ts` with its same-line comment. `server/types.ts` also gained `Config`, `Root`, `Project`/`ProjectBase`/`SourceProject`, `OutputEntry`, `RenderInfo`, `Job`, `Recipe`, `Note`, `RouteFn`/`RouteHandler`/`ReadBody` (each used by two or more modules). `source-revision.ts` now takes `SourceProject` (the S3 `Project` alias was renamed), and `platform.recycleStream` became generic over its item type; both are type-only edits to S3 files that the S4 typing of `janitor.ts` needed. Runtime-equivalence check: for all 47 changed `server/*.ts` files, the type-stripped current source equals the S2 (rename-commit) source after removing comments, imports, whitespace, parentheses and trailing commas, except for the seven source-reading tests that now call `readSource`; so no runtime code changed, only type syntax and formatting. Source-reading tests `jobs`, `peaks` and `scan-cache` now use `readSource` (`peaks` and `scan-cache` already sliced by `indexOf`/regex markers, `jobs` evaluates the whole stripped file); assertions are unchanged.
- 2026-11-21 S4 note, L2 (`encoders.ts` async executor, kept as-is): the executor of `probeWith`'s `new Promise(async resolve => ...)` can only throw from three places: `encoderCandidates(name)` (an `ENCODER_ARGS` lookup, a spread and `os.arch()`; none throws for any string `name`, and an unknown name yields `[]`), the inner `new Promise(r => ...)` callback (its `spawn` is already in try/catch, `setTimeout` and `c.on` cannot throw, and `c.kill()` is in try/catch) and the `...args` spread of a table entry (always an array). No path can throw out of the executor, so a rejection that would be lost cannot occur today; the only residual risk is a future edit. No fix made.
- 2026-11-21 S4 discovery (note, behavior left as-is): `jobs.busyElsewhere()` reads `session?.title` from guard render records, but `guardState().renders` entries never carry a `session`, so the message always says "another session"; typed with a cast rather than changed. `guard.guardHistory()` returns a list that may contain `null` entries typed as such (`filter(Boolean)` does not narrow); `outputs.ts` casts it.

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
| D5 (master) | pending | |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|

**Master updates written:** none yet
**Next-phase updates written:** none yet
**Remaining work and handoff:** none yet