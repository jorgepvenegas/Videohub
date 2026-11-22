# Phase P9 — Strict repo-wide, no JS left, docs

- Plan ID: `typescript-migration`
- Phase: P9
- Plan version: 2
- Validated against master version: 67
- Status: in_progress
- Approved by: Jorge Venegas (standing instruction 2026-11-22, C15)
- Approved at: 2026-11-22
- Commit: pending
- Implementation mode: subagent
- Implemented by: p9-worker
- Implemented at: 2026-11-22
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: P6,P7,P10
- Written: 2026-11-22
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

Review mode: per C15, the user's standing instruction of 2026-11-22 replaces the per-phase approval stop for this phase. Any question whose answer changes user-visible behavior still stops for the user.

## 1. Phase objective

Finish the migration and prove it. The repo type-checks strictly without `allowJs`, a test fails if any JavaScript source is tracked again, and the docs, agent rules and skill describe the TypeScript codebase. Then every master definition-of-done item D1–D9 is verified on the final commit.

- **Strict everywhere:** remove `allowJs`/`checkJs` from both type-check configs.
- **Guard against regressions:** a test walks VideoHub's source folders and fails on any `.js`, `.mjs`, `.cjs` or `.jsx` file.
- **Stale comments:** comments in code that name VideoHub's own renamed files get their `.ts` names. Mentions of users' films (`render.js`, `make.mjs`), JS-era installs (`server/hub.js`, `mcp.js`) and test fixtures stay.
- **Docs and rules:** `CLAUDE.md`, `README.md`, `docs/*.md`, `skill/videohub/SKILL.md` and `claude/global-rule.md` name the `.ts` entry points, Node ≥ 22.18, the standards commands including `pnpm build`, oxfmt as the style, the TypeScript film starter with `render.js` films still supported, and the built engine hooks.
- **Final verification:** standards on Node 24 and the full suite on Node 22.18; a scratch hub browser check of the library, review and thumbnail studio pages; a fresh setup and an update from a JS-era install, both in a fake home.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Final proof that no JS source is tracked, plus a test that keeps it that way | A1 |
| D2 | `allowJs` removed; both configs strict-clean | A2 |
| D3 | Lint 0 errors, format clean on the final commit | A3 |
| D4 | Full suite passes on Node 24 and Node 22.18 | A4 |
| D5 | `pnpm build` and the scratch hub browser check of library, review and thumbnail studio pages | A5 |
| D6 | Fresh setup and update from the 70cf504 install, end to end in a fake home | A6 |
| D7 | P10's evidence (preview, user review, scratch render, identical `render.ts`) re-checked on the final commit without a new render | A7 |
| D8 | Legacy `render.js` tests and preview evidence on the final commit | A7 |
| D9 | Docs and rules updated; the D9 grep prints nothing | A8 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L3 | 12 oxlint rules at `warn` (146 warnings) | Default recorded as decision in §9: the rules stay at `warn`. Re-escalating would mean cleaning about 146 warnings across the codebase, which is code change beyond the migration; listed in the final report |
| L4 | Source-reading tests slice between stable markers | Unchanged; the new no-JS test reads no source |
| L5 | The format-only commit grew line counts; `.git-blame-ignore-revs` suggested | Not added: browser uploads drop dot-prefixed files (CLAUDE.md), and the user did not ask for it. Listed in the final report |
| L8 | `any` check in type positions only | S1 runs the L8 grep repo-wide and lists the remaining commented `any` uses in §9 |
| L10 | `jobs.busyElsewhere()` always says "another session" | Out of scope (behavior); listed in the final report as a follow-up |
| L14 | Specifier rewrites only for relative specifiers | S2 changes comments only; no specifier changes |
| L17 | MCP tool arguments typed as a record of `Json` | Out of scope; listed in the final report |
| L19 | `CLAUDE.md` map line names `server/hub.js` | S3 updates it |
| L20 | Unsafe-probe incident | Decision C12 rules are binding for every step (see §5) |
| L21 | `desktopEntry` export added in P4 for Linux setup | Listed in the final report for the pending real-Linux acceptance |
| L23 | `update.sh` from the repo is refused as nested; old configs use port 7788 | S4's update run uses a sibling `git archive` export as the source and sets the old install's config to port 7799 first |
| L24 | Node 22.18 runs `.ts` entries without warnings; full suite not yet run on it | S4 runs the full suite with `.test-tmp/node-22.18/bin/node` |
| L27 | The asdf `node` shim fails under a fake HOME | Scratch hubs, setup and update use the real node binary |
| L29 | `ui/app.ts` exports `type Json = any` | Kept (decision recorded in §9): response types would be a UI redesign; listed in the final report |
| L30 | A hub started before the first build does not watch `dist/ui` | S3 mentions it in the contributor notes of `docs/ARCHITECTURE.md` |
| L32 | `pnpm typecheck` stops at the first failing config | Kept: both must pass anyway; S1 runs both configs separately once to show both are clean |
| L34 | A film card with no cover 404s | S4 seeds scratch covers |
| L36 | Prose comments and docs name old `.js` files | S2 (code comments) and S3 (docs) |
| L38 | Stray files from a comparison loop | Scratch output only under `.test-tmp/p9-*`; explicit staging; `git status --short` before each commit |
| L39 | `compose.ts` appends the text "null" when no outputs copy exists | Out of scope (behavior); listed in the final report as a follow-up bug |
| L40 | Renamed tests enable TypeScript-only lint rules, silenced with disable comments | S1 lists each disable comment in §9; kept |
| L41 | `drawSubjectBlock` in `scene.ts` is unused | Kept with the L3 decision; listed in the final report |
| L44 | The built hooks lose their header comments (usage docs) | Default: the docs point engine authors to `engine-hooks/*.ts` for usage and to `dist/engine-hooks/*.js` for the file to copy; no build change |
| L45 | Docs naming `engine-hooks/*.js` | S3 updates them as in L44 |
| L48 | The starter's render script needs its loopback page server for every render | S3 states it in `docs/RENDER-SPEED.md` and `docs/PROJECT-CONTRACT.md` |
| L49 | `stripTypeScriptTypes` prints an ExperimentalWarning on Node 24 | S3 mentions it in `docs/ARCHITECTURE.md` (harmless, stderr only) |
| L51 | A stray command created an empty `/tmp/x` | Removed by the coordinator at closeout (0 bytes, created during the run) |

## 3. Scope

In scope:
- `tsconfig.json`, `ui/tsconfig.json`: remove `allowJs` and `checkJs`
- `scripts/no-js.test.ts` (create): walks `server`, `scripts`, `ui`, `engine-hooks`, `templates`, `examples`, `claude`, `skill` and the root files (not `node_modules`, `dist`, `.test-tmp`, `data`, `.agents`, `.claude`, `docs`) and fails on any `.js`, `.mjs`, `.cjs` or `.jsx` file. It must work in an install without `.git`
- Comment-only edits in `.ts` files that name VideoHub's own renamed files (L36)
- `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/PLATFORMS.md`, `docs/PROJECT-CONTRACT.md`, `docs/RENDER-SPEED.md`, `skill/videohub/SKILL.md`, `claude/global-rule.md` (only if it names old paths); `AGENTS.md` only if it names old paths
- Verification under `.test-tmp/p9-*`, and the P9 plan's §9 and §10

Out of scope:
- Any runtime behavior change, including the follow-up bugs L10 and L39
- Re-escalating lint rules, removing warned dead code, replacing `Json` with response types (L3, L29, L41)
- `docs/MIGRATING.md` (about the old Turkish builds; it names no JS paths), `docs/plans/`
- Publishing, uploading or marking the PR ready
- A new render (D7's render was done in P10 after the user's review)

## 4. Entry conditions

- [x] P6, P7 and P10 `done`; standards green — verify: `progressive_plan.py status docs/plans/typescript-migration`, then `pnpm format:check && pnpm lint && pnpm typecheck && pnpm build && pnpm test`
- [x] Working tree clean and pushed — verify: `git status -sb`
- [x] Phase plan revalidated against current master version (66)
- [x] Approval recorded per C15 — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

Commit after each step with subject `P9:` followed by the step title, and push. Every commit leaves `pnpm build`, `pnpm typecheck` and `pnpm test` green. Stage explicit paths and check `git status --short` before each commit (L38).

**Hard safety rules (C12), binding for every step:**
1. Never import or run an entry module (`server/hub.ts`, `mcp.ts`, `cli.ts`, `scripts/install.ts`) outside the scratch environment. Every hub, CLI, setup or update run uses `VIDEOHUB_PORT=7799`, `VIDEOHUB_DATA_DIR`/`VIDEOHUB_BASE_DIR` under `.test-tmp/p9-*`, `VIDEOHUB_GUARD=off`, `VIDEOHUB_JOBS=off` and `VIDEOHUB_NO_WINDOW=1`, plus `HOME`/`XDG_*`/`TMPDIR` under `.test-tmp/p9-*`, a `PATH` with no `claude`/`opencode` (`.test-tmp/p4-bin:/usr/bin:/bin`), the real node binary, and `--startup no` for setup.
2. Never delete anything outside `.test-tmp`. Report it to the coordinator instead.
3. Before any removal inside the repo, even in `.test-tmp`, if you did not create it in this session, show the coordinator `ls -laT` of the target and wait. A shell-variable path in a removal is written `"${VAR:?}"`.
4. Never run a film's render script and never queue a render.

### S1 — Strict without allowJs, and a test that forbids JS

- Depends on: none
- Files: `tsconfig.json`, `ui/tsconfig.json`, `scripts/no-js.test.ts` (create)
- Change: As in §3. Run both configs separately once (L32). Run the L8 `any` grep repo-wide and list in §9 every remaining `any` with its comment, plus every lint-disable comment (L40).
- Acceptance:
  - [x] Neither config has `allowJs` or `checkJs`; both configs pass; the new test passes, and fails when a scratch `.js` file is placed in `ui/` (then removed; recorded in §9)
- Verification: `grep -nE "allowJs|checkJs" tsconfig.json ui/tsconfig.json` (no output); `npx tsc --noEmit -p tsconfig.json && npx tsc --noEmit -p ui/tsconfig.json`; `node --test scripts/no-js.test.ts`; `pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S2 — Code comments name the `.ts` files

- Depends on: S1
- Files: the `.ts` files whose comments name VideoHub's own renamed files (list them in §9)
- Change: Comment text only (L36). Keep mentions of users' film scripts, JS-era install paths, fixtures and string literals. Prove comments-only with the AST comparison (L35) of every changed file against the S1 commit.
- Acceptance:
  - [x] The AST comparison shows 0 differences for every changed file; a repo grep for VideoHub's own old file names in comments returns only intentional mentions, each listed in §9 with its reason
- Verification: the AST result and the grep in §9; `pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S3 — Docs, agent rules and skill describe the TypeScript codebase

- Depends on: S2
- Files: `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/PLATFORMS.md`, `docs/PROJECT-CONTRACT.md`, `docs/RENDER-SPEED.md`, `skill/videohub/SKILL.md`; `claude/global-rule.md` and `AGENTS.md` only if they name old paths
- Change: Update every mention of VideoHub's own JS files and the JS-era workflow:
  - **Entry points:** `server/*.ts` and `scripts/*.ts` paths; `CLAUDE.md`'s map (L19).
  - **Runtime:** Node ≥ 22.18 with native type stripping; no server build; Vite builds the UI and the engine hooks into `dist/`, and setup and update run it.
  - **Standards:** the commands become `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`. "Compact ES module style" becomes "oxfmt output" (C6). Remove the `node --check` rule.
  - **Films:** new films start from `render.ts`, `make-audio.ts` and `film.ts`, and `render.js`/`film.js` films keep working. Hub live preview and `render.ts` serve `film.ts` with types stripped. `render.ts` serves the film folder over 127.0.0.1 (L48). Keep `templates/new-film/render.ts` equal to the example's.
  - **Engine hooks:** usage is documented in `engine-hooks/*.ts`; engines copy `dist/engine-hooks/*.js` after a build (L44, L45).
  - **Contributor notes in `ARCHITECTURE.md`:** the `dist/ui` watcher (L30) and the ExperimentalWarning on Node 24 (L49).
  Keep each doc's voice and structure; change only what is wrong now. Keep the old-install recognition (`server/hub.js`, `mcp.js`) where the docs explain upgrades.
- Acceptance:
  - [x] The D9 grep prints nothing; every remaining `.js`/`.mjs` mention in these files refers to users' films, JS-era installs or third-party files, listed in §9
- Verification: `grep -rnE "server/(hub|mcp|cli)\.js|scripts/[a-z-]+\.mjs|node --check" CLAUDE.md AGENTS.md README.md docs skill --exclude-dir=plans` (no output); `grep -rnE "\.m?js\b" CLAUDE.md AGENTS.md README.md docs skill claude --exclude-dir=plans` reviewed in §9
- Rollback: `git revert HEAD`

### S4 — Final verification of D1–D9

- Depends on: S3
- Files: the P9 phase plan (modify) — §7, §9 and §10
- Change: Run each item under the rules above and record the commands and results:
  1. **D1:** `git ls-files '*.js' '*.mjs' '*.cjs' '*.jsx'` prints nothing.
  2. **D2–D4:** `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` and `pnpm test` on Node 24. Then the full suite on Node 22.18 (L24): run `scripts/test.ts` with `.test-tmp/node-22.18/bin/node` first on `PATH`.
  3. **D5:** start a scratch hub with copies of `examples/hello-film`, seed scratch covers (L34) and create one scratch thumbnail. Check with headless Chrome (repo `puppeteer-core`) that `#/`, the film's `#/review/PROJECT_ID/~live` (no `?play=1`), `#/thumbstudio` and the scratch thumbnail's editor load with zero console errors and failed requests. Click nothing and play nothing.
  4. **D6:** `git archive HEAD` into `.test-tmp/p9-e2e/new`. Run its `setup.sh --yes --agents opencode --shortcut yes --startup no --example yes --global-rule yes --watch-found no --gpu-encoder no --workspace` (scratch workspace) in a fake home, and confirm `dist/ui` and `dist/engine-hooks` exist, the fake OpenCode config names `server/mcp.ts`, and `/api/ping` answers on 7799. Then follow P4's S6 procedure with `70cf504` as the old install and the new export as the update source, recording the same expectations.
  5. **D7 and D8:** confirm on the final commit that `cmp templates/new-film/render.ts examples/hello-film/render.ts` is identical and that the `.ts`/legacy tests pass. Cite P10's preview, user review and render evidence; no new render.
  6. **D9:** the S3 grep prints nothing.
  Stop every scratch process and confirm `lsof -nP -iTCP:7799 -sTCP:LISTEN` is empty.
- Acceptance:
  - [x] Every D item has recorded evidence; nothing listens on 7799 at the end
- Verification: the recorded commands and their output in §9 and §10
- Rollback: n/a (scratch only)

## 6. Phase acceptance criteria

- [x] A1 — No JS source is tracked, and `scripts/no-js.test.ts` fails if one appears — verify: `git ls-files '*.js' '*.mjs' '*.cjs' '*.jsx'` (empty); S1 revert check
- [x] A2 — Both configs are strict with no `allowJs`/`checkJs`, and both pass — verify: the S1 grep and `pnpm typecheck`
- [x] A3 — `pnpm lint` has 0 errors and `pnpm format:check` exits 0 — verify: both commands
- [x] A4 — `pnpm test` has 0 failures and ≥ 323 passing on Node 24, and the full suite passes on Node 22.18 — verify: S4 evidence
- [x] A5 — `pnpm build` exits 0, and the scratch hub's library, review, thumbnail studio list and editor pages load with zero console errors and failed requests — verify: S4 evidence
- [x] A6 — A fresh setup builds and serves the UI and registers `server/mcp.ts`, and an update from a 70cf504 install meets P4's expectations — verify: S4 evidence
- [x] A7 — Template and example `render.ts` are identical, the `.ts`/legacy tests pass on the final commit, and P10's preview, review and render evidence is cited — verify: S4 evidence
- [x] A8 — The D9 grep prints nothing, and the remaining JS mentions in docs are intentional — verify: S3 evidence

## 7. Code standards check

- [x] The diff is the smallest change that meets the acceptance criteria; no runtime change outside the new test
- [x] The no-JS test reuses Node's file APIs and the repo's test runner; no new dependency
- [x] Docs keep their existing voice and structure; only wrong statements change
- [x] Every new test fails if the behavior it covers breaks (S1 revert check)
- [x] Master standards commands pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test`, plus `pnpm build`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Removing `allowJs` surfaces type errors in files that relied on JS inference (for example `.d.ts`-less imports) | Low | Medium | No JS remains; S1 runs both configs; fix with types only, or stop and report |
| The no-JS test flags legitimate files (vendored or generated) | Low | Low | Excludes `node_modules`, `dist`, `.test-tmp`, `data`, `.agents`, `.claude`, `docs`; any other hit is reported, not exempted silently |
| Doc edits drift into rewriting or change the user-facing contract | Medium | Medium | Change only wrong statements; the contract changes were decided in C1–C3 and P10 |
| The full suite fails on Node 22.18 | Low | High | Record the failure, stop and report; do not raise `engines.node` without the user |
| The update or setup e2e reaches the real profile or hub | Low | High | C12 rules, a fake home, port 7799, a PATH without agent CLIs, `--startup no` |
| Another unsafe probe or stray file (L20, L38) | Low | High | C12 rules; explicit staging |

## 9. Deviations and working notes

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

- 2026-11-22, coordinator, plan defaults under C15: L3 lint rules stay at `warn`; L5 `.git-blame-ignore-revs` not added; L29 `Json` alias kept; L41 dead code kept; L44 hooks build unchanged, docs point to the `.ts` sources. None of these changes user-visible behavior; each is listed in the final report.
- 2026-11-22, S1 (p9-worker): `grep -nE "allowJs|checkJs" tsconfig.json ui/tsconfig.json` printed nothing. `npx tsc --noEmit -p tsconfig.json` and `-p ui/tsconfig.json` run separately: both exit 0. `node --test scripts/no-js.test.ts`: 1 pass. Revert check: a scratch `ui/zz-scratch.js` made the test fail (`ui/zz-scratch.js` named in the message, 0 pass 1 fail); file removed (created in this session), test passes again.
- 2026-11-22, S1, L8 repo-wide `any` in type positions (each with its comment): `engine-hooks/vhtweaks.ts:101` `VH_EDIT?: any` (editor methods call each other through it); `examples/hello-film/render.ts:720` and `templates/new-film/render.ts:720` `catch (e: any)` (thrown value of unknown shape); `server/types.ts:5` and `ui/app.ts:11` `type Json = any` (untyped JSON replies). Other grep hits are English prose (`scripts/upload-rules.ts:1`) or a variable named `any` (`ui/review/transport.ts:392`).
- 2026-11-22, S1, L40 lint-disable comments (only one in the repo, kept): `server/thumbstudio/depth-panel.test.ts:50` `oxlint-disable-next-line typescript/no-this-alias`. No `@ts-ignore`, `@ts-expect-error` or `@ts-nocheck` remains.
- 2026-11-22, S2 (p9-worker): comment text only in 38 `.ts` files: `examples/hello-film/render.ts`, `templates/new-film/render.ts`, `scripts/{init-config,upload-rules}.ts`, `server/{ciktilar-dir,ciktilar,config.test,config,encoders,hub,jobs,legacy.test,legacy,notes,peaks.test,sfxlib,soundedit,tools.test,tools,tweaks,util,vhsound}.ts`, `server/thumbstudio/{editor-interactions,template-ui}.test.ts`, `ui/review.ts`, `ui/values.ts`, `ui/review/{applyqueue,dock,history,library,mixer,scenes,soundedit,soundenv,stems,timeline,tracks,transport}.ts`. Proof: both sides type-stripped and AST-compared against the S1 commit (`node .test-tmp/p9-cmp.mjs`, a copy of the P6 script that also strips the before side): `different: 0` over 38 files. `pnpm format:check`, `pnpm typecheck` and `pnpm test` (324 tests, 323 pass, 1 skipped, 0 fail) green.
- 2026-11-22, S2, intentional `.js`/`.mjs` mentions left in code (grep over `git ls-files '*.ts'`): users' films and scripts (`render.js`, `render.mjs`, `film.js`, `make.mjs`, `scene.js`, `data.js`, `words.js`) and their tests/fixtures (`server/film-ts.test.ts`, `server/jobs.test.ts`, `server/platform.*.test.ts`, `ui/review/renderbtn.test.ts`, `server/jobs.ts` default `render.js` fallback, `server/live.ts`, `server/scan.ts`, `server/transcript.ts`); the 3D studio and external engines (`engine/*.js`, `runtime.js`, `synth.js`, `vhsound.mjs` copy, `qa.mjs`, `film2d.js`, `transitions2d.js`, `tweaks.js`, `spotlight render.js cues`, and `engine-hooks/vh2d.ts:3` which names the installed `vh2d.js`); the Vite output `dist/ui/_vh/app-1.js` in `server/hub-ui.test.ts`; JS-era install recognition and its tests (`server/hub.js`, `mcp.js`, `cli.js`, `install.mjs`, `hub.js` in `scripts/agents.ts`, `scripts/agents.test.ts`, `scripts/install.ts`, `scripts/install.test.ts`, `server/config.ts:66`); and false positives (`.message` in `scripts/install.ts:379`).
- 2026-11-22, S3 (p9-worker): docs changed: `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/PLATFORMS.md`, `docs/PROJECT-CONTRACT.md`, `docs/RENDER-SPEED.md`, `skill/videohub/SKILL.md`. `AGENTS.md` and `claude/global-rule.md` name no old paths (unchanged). Changes: `.ts` entry points and module names; Node 22.18+ with native type stripping and no server build; Vite builds `dist/ui` and `dist/engine-hooks`, run by setup and update; standards commands include `pnpm build`, `node --check` rule removed, "compact ES module style" became "oxfmt-formatted"; starter files `render.ts`, `make-audio.ts`, `film.ts` with `render.js` films still supported, `film.ts` served with types stripped, loopback page server for every render (L48); engine hooks point to the `.ts` sources and the built `dist/engine-hooks/*.js` (L44, L45); ARCHITECTURE contributor bullet on the `dist/ui` watcher (L30) and the Node 24 ExperimentalWarning (L49). The D9 grep prints nothing.
- 2026-11-22, S3, remaining `.js`/`.mjs` mentions in docs (grep reviewed, all intentional): users' films and legacy support (`render.js`/`render.mjs` in README, CLAUDE.md and PROJECT-CONTRACT §1, §4); 3D studio and external engines (`make.mjs`, `scene.js`, `engine/audio/synth.js`, `data.js`, `words.js`); built output names (`dist/engine-hooks/*.js`). `docs/MIGRATING.md` and `templates/new-film/README.md` were out of scope and name no stale VideoHub paths.
- 2026-11-22, S4 (p9-worker), verified on the S3 commit 9a91124 (only plan text changes after it):
  1. D1: `git ls-files '*.js' '*.mjs' '*.cjs' '*.jsx' | wc -l` prints 0.
  2. D2-D4 on Node 24.16.0: `pnpm install --frozen-lockfile` up to date; `pnpm format:check` exit 0; `pnpm lint` exit 0 (0 errors, 148 warnings: the L3 rules at `warn`, count unchanged from P10); `pnpm typecheck` exit 0 (both configs); `pnpm build` exit 0; `pnpm test` 325 tests, 324 pass, 1 skipped, 0 fail. Node 22.18.0 (`.test-tmp/node-22.18/bin/node scripts/test.ts` first on PATH): exit 0, 325 tests, 324 pass, 1 skipped, 0 fail; the only stderr noise is the stripTypeScriptTypes ExperimentalWarning (L49).
  3. D5: scratch hub `.test-tmp/p9-hub` (start script `.test-tmp/p9-hub/start-hub.sh`: `env -i`, scratch HOME/XDG/TMPDIR, `PATH=.test-tmp/p4-bin:/usr/bin:/bin`, real node binary, port 7799, guard and jobs off, no window, `VIDEOHUB_IDLE_SEC=600`) over a copy of `examples/hello-film` (id `d3621f3fc969`), a scratch cover `data/thumbs/live-d3621f3fc969.jpg` made with ffmpeg (L34) and one thumbnail created with `POST /api/thumbstudio/new` (`20261122-retw`). `.test-tmp/p9-browser/check.mjs` (puppeteer-core, installed Chrome, headless, no clicks, no `?play=1`): `#/` ok, `#/review/d3621f3fc969/~live` ok (4 canvases, 1 iframe), `#/thumbstudio` ok (27 canvases), `#/thumbstudio/d3621f3fc969/20261122-retw` ok (editor shell, 2 canvases); `plays: []` on all; `total problems 0` (console errors and warnings, page errors, failed requests, HTTP >= 400). Hub stopped by killing its pid; the 7799 listener list was empty.
  4. D6 fresh: `git archive HEAD` into `.test-tmp/p9-e2e/new`; env `.test-tmp/p9env.sh fresh` (fake HOME/XDG/TMPDIR/data/base under `.test-tmp/p9-e2e/env-fresh`, port 7799, guard and jobs off, no window, `PATH=.test-tmp/p4-bin:/usr/bin:/bin`; `command -v claude opencode` printed nothing); `bash setup.sh --yes --agents opencode --shortcut yes --startup no --example yes --global-rule yes --watch-found no --gpu-encoder no --workspace .test-tmp/p9-e2e/env-fresh/base` rc 0: `new/dist/ui` (with `_vh`) and `new/dist/engine-hooks/{vh2d,vhtweaks}.js` exist; the fake OpenCode config names `server/mcp.ts`; the Desktop launcher names `install.ts`; the example film was copied; `/api/ping` answered on 7799 from `new/server/hub.ts` and `/` returned 200. Stopped with `node scripts/install.ts stop --target` (first attempt used a wrong target path and refused, harmless).
  5. D6 update: `git archive 70cf504` into `.test-tmp/p9-e2e/old`, set up in env `upd` with the same answers (no example): old hub ran `old/server/hub.js` on 7799, OpenCode config named `server/mcp.js`, Desktop launcher named `scripts/install.mjs`. L23: scratch config port set to 7799; markers `env-upd/data/e2e-marker.txt` (hello) and `env-upd/base/films/e2e-film.txt` (hi). Source `.test-tmp/p9-e2e/src` (a sibling `git archive HEAD`, no node_modules): `update.sh --target old --dry-run` listed 155 obsolete JavaScript files to move; the real update rc 0: stopped the old hub, moved the JS files to `old/data/update-backup/2026-11-22T20-38-02-892Z` (it holds `server/hub.js` and `scripts/install.mjs`), `pnpm install --frozen-lockfile`, `pnpm build` (`old/dist/ui` and `old/dist/engine-hooks`), refreshed the launcher and registered OpenCode. After: no listener; `old/server/hub.ts` exists and `old/scripts` holds only `.ts`; both markers intact; OpenCode config names `server/mcp.ts`; the launcher names `old/scripts/install.ts`; `bash open.sh --server` printed `VideoHub is available at http://127.0.0.1:7799` and `/api/ping` answered from `old/server/hub.ts`; `uninstall.sh --dry-run` listed only the fake-home OpenCode entries, launcher and install record. Stopped with `install.ts stop`; no LaunchAgent entry named videohub exists.
  6. D7 and D8: `cmp templates/new-film/render.ts examples/hello-film/render.ts` identical; `node --test server/film-ts.test.ts server/jobs.test.ts server/live.test.ts` run (33 pass, 0 fail; `live.test.ts` does not exist, node ran the two existing files) and the legacy `render.js` and `.ts` cases sit in the full suite above. P10 evidence cited: P10 S5 (library and the three live pages with 0 problems, `plays: []`, `READY` true, reload check after editing `film.ts`), S6 (user answered "Looks good, render it"; one queued render of the scratch example copy, job `jmwsagp7s-4d17eff9`, state done, `ffprobe`: 10.0 s, h264 1920x1080, aac). No new render in P9.
  7. D9: the S3 grep prints nothing. Final: `lsof -nP -iTCP:7799 -sTCP:LISTEN` empty; nothing listens on 7788 either.
- 2026-11-22, S4, note: the `cat >> /tmp/x` slip in this session created an empty file `/tmp/x` outside `.test-tmp`; it was not deleted (rule 2) and is reported to the coordinator.

## 10. Closeout

Fill at the end of every implementation session. Do not mark the phase done until this section is complete and the master is updated. Set `Implemented by` to the worker name or ID and `Implemented at` to the implementation date; `close` requires both.

- Date: 2026-11-22
- Session: p9-worker (subagent, branch `plan/typescript-migration`)
- Verdict: addressed
- Steps complete: S1, S2, S3, S4
- Verification run: Node 24.16.0: `pnpm install --frozen-lockfile` (up to date), `pnpm format:check` exit 0, `pnpm lint` exit 0 (0 errors, 148 warnings), `pnpm typecheck` exit 0, `pnpm build` exit 0, `pnpm test` 325 tests, 324 pass, 1 skipped, 0 fail; Node 22.18.0 `scripts/test.ts` 325 tests, 324 pass, 1 skipped, 0 fail; `git ls-files '*.js' '*.mjs' '*.cjs' '*.jsx'` empty; D9 grep empty; scratch hub browser check 0 problems; fresh setup and the 70cf504 update in fake homes (section 9, S4). Commits: S1 1a81cce, S2 a14f969, S3 9a91124.

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | met | `git ls-files '*.js' '*.mjs' '*.cjs' '*.jsx'` prints nothing; `scripts/no-js.test.ts` passes, and failed with a scratch `ui/zz-scratch.js` naming that file (S1 revert check) |
| A2 | met | `grep -nE "allowJs|checkJs" tsconfig.json ui/tsconfig.json` prints nothing; `tsc --noEmit -p tsconfig.json` and `-p ui/tsconfig.json` both exit 0, also via `pnpm typecheck` |
| A3 | met | `pnpm lint` exit 0 with 0 errors (148 warnings, L3 kept at `warn`); `pnpm format:check` exit 0 |
| A4 | met | Node 24: 325 tests, 324 pass (>= 323), 0 fail, 1 skipped; Node 22.18.0 full suite: same counts, exit 0 |
| A5 | met | `pnpm build` exit 0; scratch hub on 7799: library, review `~live`, `#/thumbstudio` and the thumbnail editor loaded with 0 console errors, page errors and failed requests, no clicks, no play events |
| A6 | met | Fresh setup in a fake home built `dist/ui` and `dist/engine-hooks`, registered `server/mcp.ts` and answered `/api/ping` on 7799; update from the 70cf504 install stopped the old hub, moved 155 JS files to the backup, rebuilt, re-pointed OpenCode to `mcp.ts` and the launcher to `install.ts`, kept data and films, and `open.sh --server` served from `hub.ts` |
| A7 | met | `cmp` of the two `render.ts` files identical; film-ts and jobs tests pass on the final code (`.ts` and legacy `render.js` cases); P10's preview, user review and render evidence cited in section 9 (S4, item 6) |
| A8 | met | The D9 grep prints nothing; the remaining `.js`/`.mjs` mentions in docs are listed in section 9 (S3) |
| D1 (master) | met | `git ls-files '*.js' '*.mjs' '*.cjs' '*.jsx'` empty on the S3 commit; `scripts/no-js.test.ts` keeps it so |
| D2 (master) | met | `tsconfig.json` has `"strict": true` and no `allowJs`; `pnpm typecheck` exit 0 (both configs) |
| D3 (master) | met | `pnpm lint` 0 errors; `pnpm format:check` exit 0 |
| D4 (master) | met | `pnpm test` 324 pass, 0 fail on Node 24 and on Node 22.18.0 (baseline was 298) |
| D5 (master) | met | `pnpm build` exit 0; scratch hub served library, review, thumbnail studio and editor with no console errors (section 9, S4 item 3) |
| D6 (master) | met | Fresh setup and 70cf504 update end to end in fake homes (section 9, S4 items 4 and 5); `scripts/install.test.ts` and `scripts/agents.test.ts` pass in the suite. Real launchd re-apply is not exercised |
| D7 (master) | met | P10's evidence (scratch preview, user's "Looks good, render it", one queued render, ffprobe 10.0 s h264 1920x1080 aac) plus final-commit checks: `cmp` of the two `render.ts` identical, the encoder test that keeps them equal passes, scratch hub loaded the example's live page with 0 problems; no new render |
| D8 (master) | met | The legacy `render.js` and `film.js` tests in `server/jobs.test.ts` and `server/film-ts.test.ts` pass on Node 24 and 22.18; P10's legacy film preview check cited |
| D9 (master) | met | `grep -rnE "server/(hub|mcp|cli)\.js|scripts/[a-z-]+\.mjs|node --check" CLAUDE.md AGENTS.md README.md docs skill --exclude-dir=plans` prints nothing |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|
| P9-1 | `templates/new-film/README.md` and `docs/MIGRATING.md` were not in S3's file list; the grep found no stale VideoHub paths in either | note | P9 | None |
| P9-2 | `lsof` is not on the scratch `PATH` (`.test-tmp/p4-bin:/usr/bin:/bin`); listener checks use `/usr/sbin/lsof` | note | none | None |
| P9-3 | `scripts/test.ts` output under Node 22.18 is TAP (`# pass N`), not the `ℹ` summary Node 24 prints; both exit 0 | note | none | None |
| P9-4 | An update source (`update.sh`) that is a plain `git archive` export has no `node_modules`; the update ran `pnpm install --frozen-lockfile` in the target itself, as in P4 | note | none | None |

**Master updates written:** none (the coordinator owns master.md)
**Next-phase updates written:** none (last phase)
**Remaining work and handoff:** Real hardware: Linux and Intel macOS desktop, install and render acceptance (including `desktopEntry`, L21); a real macOS launchd re-apply on an update with login startup (L24). Candidate follow-ups, not done here: L10 (`busyElsewhere` always says another session), L39 (`actions.append(null)` writes the text "null" when no outputs copy exists), L17 (MCP arguments typed as a record of `Json`), L29 (`Json` alias in the UI), L3 and L41 (148 oxlint warnings kept at `warn`, unused `drawSubjectBlock`), L5 (`.git-blame-ignore-revs` not added), L44 (built hooks lose their header comments; docs point to the `.ts` sources), L32 (`pnpm typecheck` chains the two configs). Only held back item: `/tmp/x`, an empty file this session created by mistake outside `.test-tmp`; deletion is for the coordinator.
