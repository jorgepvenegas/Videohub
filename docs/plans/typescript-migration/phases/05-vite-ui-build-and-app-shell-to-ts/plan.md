# Phase P5 — Vite UI build and app shell to TS

- Plan ID: `typescript-migration`
- Phase: P5
- Plan version: 1
- Validated against master version: 37
- Status: in_progress
- Approved by: Jorge Venegas
- Approved at: 2026-11-22
- Commit: pending
- Implementation mode: subagent
- Implemented by: p5-worker
- Implemented at: 2026-11-22
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: P4
- Written: 2026-11-21
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Make the browser UI a Vite build. Then convert the top-level UI modules (`app`, `agent`, `values`, `system`, `outputs-panel`, `render-status`) and their tests to strict TypeScript.

- **Build output:** Vite builds `ui/` into a git-ignored `dist/ui/`, and the hub serves that folder.
- **Missing build:** when it is absent, the hub answers with a clear "UI not built" page instead of a broken app.
- **Setup and update:** both run the build right after `pnpm install`, so users never run Vite themselves.
- **Contributor loop:** `pnpm build --watch` combined with the hub's existing reload-on-change watcher.
- **Mixed code:** `ui/review*` and `ui/thumbstudio*` stay JavaScript for P6 and P7. Vite bundles mixed JS/TS, so the app keeps working throughout.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Removes the top-level `ui/*.js` files (6 modules + 4 tests) with history kept | A1 |
| D2 | Browser code type-checks with DOM types and no Node types; shared `values.ts` checks under both | A2 |
| D3 | Lint 0 errors, format clean | A4 |
| D4 | Suite at baseline (≥ 307 pass) plus new hub/installer tests | A3 |
| D5 | `pnpm build` exits 0; a scratch hub serves the built UI with no console errors on the app pages | A5 |
| D6 | Fresh setup and update build the UI automatically | A6 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L3 | 12 lint rules at `warn` | No warning cleanup; counts recorded in S6 |
| L4 | Source-reading tests slice between stable markers | `platform-ui`, `project-thumbnails` and `settings` tests read through `readSource` with marker slices |
| L8 | `any` check in type positions only | `grep -rnE ':\s*any\b\|\bas any\b' ui/*.ts` and review each hit |
| L9 | Rename similarity bar only for files over 15 lines | Same rule in S4 |
| L12 | `legacy.ts` re-exports types inferred from `ui/values.js` | Once `values.ts` is typed (S5), `server/legacy.ts` re-exports real types; `typecheck` must stay clean for `server/` |
| L13 | `server/legacy.test.ts` carries a cast until `ui/values` is typed | S5 removes the cast |
| L14 | Bulk specifier rewrites must match only relative specifiers | S4 rewrites only `./`/`../` specifiers and runs the server tests that import `ui/values` |
| L18 | `server/thumbstudio/schema.ts` and `store.ts` rely on types inferred from `ui/values.js` | S5 lets them pick up the typed `values.ts`; any narrowing they need is type-only. Catalog-based typing waits for P7 |
| L20 | Incident: an unscoped probe started a real hub and cleanup hard-deleted a folder | Decision C12 rules are binding for every step (see §5) |
| L23 | `update.sh` from the repo is refused as nested; old configs use port 7788 | The S6 setup check exports the branch with `git archive` to a sibling scratch folder and sets the scratch config to 7799 before starting anything |
| L25 | `install.ts` must keep importing only node builtins and relative modules | S3 runs the build by spawning `pnpm build` from `install.ts`; no package import |

## 3. Scope

In scope:
- `package.json`: `vite` pinned exactly to `8.3.8` (C10); a `build` script (`vite build`); `typecheck` covers both the root and UI configs
- `vite.config.ts` (create): root `ui`, output `dist/ui` (emptied on build), and `index.html` as the single entry. Emitted assets go under a VideoHub-specific folder (`_vh/`, not the default `assets/`), so hashed UI files cannot collide with a live film page's own absolute `/assets/...` requests (see the Referer fallback in `server/hub.ts`)
- `ui/tsconfig.json` (create): DOM libs, no Node types, `allowJs` for the still-JS review and thumbstudio code, excludes `*.test.*`. The root `tsconfig.json` stops checking UI non-test sources, except `ui/values.ts`, which the server imports
- `.gitignore`: `/dist/`
- `ui/index.html`: script entry `/app.ts`. CSS links stay as they are, and Vite bundles them; CSS is not converted
- `server/hub.ts`:
  - `UI` points at `dist/ui` for static serving, the UI-version watcher and the live Referer existence check
  - a missing `dist/ui/index.html` yields a 503 HTML page saying the UI is not built, with the fix ("run update.sh", or `pnpm build` in a checkout)
  - `ui/icon.svg`, used by Linux launchers, still comes from the source tree
- `scripts/install.ts`: after the package install in setup and update, spawn `pnpm build` in the install folder and fail with a clear message if it fails. Add `vite.config.ts` and `tsconfig.json` to `ITEMS`. Dry-run lists the build step
- Rename via `git mv`: `ui/agent.js`, `app.js`, `outputs-panel.js`, `render-status.js`, `system.js`, `values.js` → `.ts`; `ui/platform-ui.test.js`, `project-thumbnails.test.js`, `render-status.test.js`, `settings.test.js` → `.test.ts`
- Relative importers of those modules, specifiers only: `ui/review.js`, `ui/review/*.js`, `ui/thumbstudio/*.js`, `server/legacy.ts`, `server/thumbstudio/schema.ts`, `server/thumbstudio/*.test.js`
- `server/legacy.test.ts` (remove the L13 cast); tests for the new hub and installer behavior in `server/hub-paths.test.ts` or a new `server/hub-ui.test.ts`, and in `scripts/install.test.ts`

Out of scope:
- `ui/review.js`, `ui/review/*`, `ui/thumbstudio/*` (P6, P7), `engine-hooks/` and their build (P8)
- Converting or restructuring CSS/HTML beyond the one script `src`
- A Vite dev server or HMR; `vite build --watch` is the only dev loop
- Docs (P9)
- Opening the review page for a film or playing anything (CLAUDE.md)

## 4. Entry conditions

- [ ] P4 `done`; standards green — verify: `progressive_plan.py status docs/plans/typescript-migration`, then `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
- [ ] Working tree clean and pushed — verify: `git status -sb`
- [ ] Phase plan revalidated against current master version (37)
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

Commit after each step with subject `P5:` followed by the step title, and push. Every commit leaves `pnpm test` green.

**Hard safety rules (C12), binding for every step:**
1. Never import or run an entry module (`server/hub.ts`, `mcp.ts`, `cli.ts`, `scripts/install.ts`) outside the scratch environment. Every hub, CLI, setup or update run uses `VIDEOHUB_PORT=7799`, `VIDEOHUB_DATA_DIR`/`VIDEOHUB_BASE_DIR` under `.test-tmp/p5-*`, `VIDEOHUB_GUARD=off`, `VIDEOHUB_JOBS=off` and `VIDEOHUB_NO_WINDOW=1`. Setup and update runs also set `HOME`/`XDG_*`/`TMPDIR` under `.test-tmp/p5-*`, use a `PATH` with no `claude`/`opencode`, and pass `--startup no`.
2. Never delete anything outside `.test-tmp`. Report it to the coordinator instead.
3. Before any removal inside the repo, even in `.test-tmp`, if you did not create it in this session, show the coordinator `ls -laT` of the target and wait.

### S1 — Add Vite and build today's UI unchanged

- Depends on: none
- Files: `package.json`, `pnpm-lock.yaml`, `vite.config.ts` (create), `ui/tsconfig.json` (create), `tsconfig.json`, `.gitignore` (modify)
- Change: Pin Vite and add the `build` script and config described in §3. Split type checking so that browser sources get DOM types without Node types. `pnpm typecheck` runs both configs, for example `tsc --noEmit -p tsconfig.json && tsc --noEmit -p ui/tsconfig.json`. Build the still-JavaScript UI. If pnpm asks to approve build scripts (Rolldown), stop and report.
- Acceptance:
  - [x] `pnpm build` exits 0, writing `dist/ui/index.html` plus bundled JS and CSS under `dist/ui/_vh/`
  - [x] `git check-ignore dist` passes; `pnpm typecheck` exits 0
- Verification: `pnpm install --frozen-lockfile && pnpm build && ls dist/ui dist/ui/_vh && pnpm typecheck`
- Rollback: `git revert HEAD`; `rm -rf dist` (created in this step)

### S2 — Hub serves the built UI, with a clear page when it is missing

- Depends on: S1
- Files: `server/hub.ts` (modify); `server/hub-ui.test.ts` (create) or `server/hub-paths.test.ts` (modify)
- Change: Make the `UI` and missing-build changes described in §3. Keep the `/live/...` routing and the Referer/cookie fallback unchanged apart from checking `dist/ui`. Tests must fail without the change:
  - with a built folder, `/` and an `_vh/` asset are served from `dist/ui`
  - without it, `/` returns 503 and the "not built" message
  - a live film's `/assets/x.png` request still falls through to the film
  - test hubs use scratch dirs only (C12)
- Acceptance:
  - [x] New tests pass and each fails against the reverted change (recorded in §9)
- Verification: `node --test server/hub-ui.test.ts` (or the hub-paths file); `pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S3 — Setup and update build the UI

- Depends on: S1
- Files: `scripts/install.ts`, `scripts/install.test.ts` (modify)
- Change: After the package install in setup and update, spawn `pnpm build` in the install folder using the existing `run` helper (L25). On failure, throw a clear message that names `pnpm build`. Add `vite.config.ts` and `tsconfig.json` to `ITEMS`. Dry-run prints the build step. Tests with an injected runner prove that the build runs after install for both setup and update, and that a failure is reported.
- Acceptance:
  - [x] New tests fail against the reverted change; `install.ts` still imports only `node:*` and relative modules
- Verification: `node --test scripts/install.test.ts`; `grep -nE "^import .* from '[^.n]" scripts/install.ts` (no output)
- Rollback: `git revert HEAD`

### S4 — Rename the top-level UI modules and repoint importers

- Depends on: S1
- Files: the 10 renames in §3 (temporary first-line `// @ts-nocheck`); `ui/index.html`; the relative importers listed in §3 (specifiers only, L14)
- Change: Do a pure rename, plus updated specifiers and the script `src`. `server/legacy.ts` and `server/thumbstudio/schema.ts` now import `../ui/values.ts` / `../../ui/values.ts`. Rebuild.
- Acceptance:
  - [x] `git log --follow` tracks all 10; `pnpm build`, `pnpm typecheck` and `pnpm test` pass
- Verification: `git show -M --summary HEAD | grep -c '^ rename'`; `pnpm build && pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S5 — Strict types for the app shell

- Depends on: S4
- Files: `ui/agent.ts`, `app.ts`, `outputs-panel.ts`, `render-status.ts`, `system.ts`, `values.ts`; the 4 UI tests; `server/legacy.test.ts` (remove the L13 cast); `server/thumbstudio/schema.ts` and `store.ts` (type-only, only if the typed `values.ts` requires it, L18)
- Change: Remove `@ts-nocheck` and add strict types with DOM types: typed `querySelector` results with explicit null handling, which must match existing behavior, and typed API response shapes local to the UI. The UI never imports `server/` (CLAUDE.md). `values.ts` stays free of DOM and Node usage because both sides import it. The source-reading UI tests switch to `readSource` with marker slices. No runtime change.
- Acceptance:
  - [x] No `@ts-nocheck` in these files; both type-check configs pass; the type-stripped S4 vs S5 comparison is identical for the 6 modules
- Verification: `grep -l "@ts-nocheck" ui/*.ts` (no output); `pnpm typecheck && pnpm build && pnpm test 2>&1 | tail -8`; the comparison recorded in §9
- Rollback: `git revert HEAD`

### S6 — Verify in a real browser and through a fresh setup

- Depends on: S2, S3, S5
- Files: the P5 phase plan (modify) — §7, §9 and §10
- Change: Three checks:
  1. Standards commands, then `pnpm build`.
  2. A scratch hub (rule 1) serving the built UI. A short throwaway script under `.test-tmp/p5-browser/` (not committed) uses the repo's `puppeteer-core` with the installed Chrome in headless mode. It opens `#/`, `#/renders`, `#/outputs`, `#/disk`, `#/settings` and `#/thumbstudio`, collecting console errors and failed requests. Do not open any film's review page and do not play anything.
  3. A fresh setup of a `git archive HEAD` export in a sibling scratch folder (L23) with a fake home (rule 1), checking that `dist/ui/index.html` was built and `/` is served on 7799.
  Then stop everything and record the evidence and the L3 warning counts.
- Acceptance:
  - [x] Zero console errors and zero failed requests on the six pages; setup builds and serves the UI
- Verification: the recorded browser-script output and setup log; `lsof -nP -iTCP:7799 -sTCP:LISTEN` empty at the end
- Rollback: n/a (scratch only)

## 6. Phase acceptance criteria

- [x] A1 — No tracked `ui/*.js` directly in `ui/`; renames keep history — verify: `git ls-files 'ui/*.js'` (empty) and `git log --follow --oneline ui/app.ts | wc -l`
- [x] A2 — Both type-check configs are strict-clean; no `@ts-nocheck` in `ui/*.ts`; S5 is runtime-identical — verify: `pnpm typecheck`, the grep and the §9 comparison
- [x] A3 — `pnpm test` has 0 failures and ≥ 307 passing, plus the new tests, each shown to fail without its change — verify: `pnpm test` and §9
- [x] A4 — `pnpm lint` has 0 errors and `pnpm format:check` exits 0 — verify: both commands
- [x] A5 — `pnpm build` exits 0 and the scratch hub's six app pages load from `dist/ui` with zero console errors and failed requests; a missing build shows the 503 page — verify: S6 evidence and the S2 tests
- [x] A6 — Setup and update run the UI build (tests), and a fresh scratch setup serves the built UI — verify: S3 tests and S6 evidence

## 7. Code standards check

- [x] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency beyond the pinned Vite
- [x] Existing helpers are reused (the installer `run` helper, the hub's static-serving path); no parallel mechanisms
- [x] Names and structure state intent; comments explain only non-obvious reasons (for example, why assets go under `_vh/`)
- [x] Every new test fails if the behavior it covers breaks (revert checks in §9)
- [x] Master standards commands pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test`, plus `pnpm build`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Vite rewrites or splits modules in a way the app relies on, such as module identity or the dynamic imports in `ui/thumbstudio/page.js` (R6) | Medium | High | Browser check on six pages; the thumbstudio page exercises the dynamic imports |
| Hashed asset names collide with a live film's absolute `/assets/` requests | Low | Medium | Assets under `_vh/`; S2 test for film fall-through |
| Rolldown native binary missing on a user machine, so the setup build fails | Low | High | Clear failure message names `pnpm build`; C11 accepted the native build tool |
| Typing `app.ts` tempts runtime "null fixes" | Medium | Medium | Stripped-source comparison in S5; coordinator re-runs it |
| The browser check accidentally plays or renders a film | Low | Medium | Only app pages, empty scratch workspace, no review page |
| Another unsafe probe (L20) | Low | High | C12 rules; coordinator reviews §9 commands |

## 9. Deviations and working notes

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

- 2026-11-22 S1: `pnpm install --frozen-lockfile && pnpm build && ls dist/ui dist/ui/_vh && pnpm typecheck` all exit 0; pnpm raised no build-script approval prompt; build emits index.html plus `_vh/index-*.js/.css`, `editor-*.js`, `figures-catalog-*.js`; `git check-ignore dist` prints `dist`; suite 307 pass. Root tsconfig `include` now lists `ui/values.*` and `ui/**/*.test.*` instead of all of `ui` (UI sources are checked by `ui/tsconfig.json`).
- 2026-11-22 S2: `node --test server/hub-ui.test.ts` 3 pass; `pnpm test` 310 pass, 0 fail. Revert checks: with `server/hub.ts` restored to HEAD~ the 'serves dist/ui' and '503' tests fail; the film fall-through test is unchanged behavior, so it was checked by mutating the Referer branch to `if (false)` and it failed. Test slices the hub's real source (`const UI =` block and the GET fall-through body) into a vm with a scratch program folder under `.test-tmp/hub-ui`; no hub is started.
- 2026-11-22 S3: `node --test scripts/install.test.ts` 30 pass; `grep -nE "^import .* from '[^.n]" scripts/install.ts` prints nothing; `pnpm test` 312 pass, 0 fail. Revert check (install.ts at HEAD, tests kept): 4 fail (the two updated command-list tests, the build-failure test, the config-copy test). `buildUi` runs after `packageInstall` in setup and update, including when packages are kept. The fixture's guard `run` now allows only `pnpm build` (it still throws on anything else), and the two exact-command tests expect install then build.
- 2026-11-22 S4: 10 `git mv` renames (6 modules, 4 tests) each with a first-line `// @ts-nocheck`; specifiers rewritten only when relative; `pnpm build`, `pnpm typecheck`, `pnpm test` (312 pass, 0 fail) green. Deviation: `server/tools.ts:19` also imports `../ui/values.js` and is not in the §3 list; its specifier was changed to `.ts` (specifier only) because the import would break otherwise. Discovery for the coordinator: §3 file list missed `server/tools.ts`.
- 2026-11-22 S5: `grep -l "@ts-nocheck" ui/*.ts` prints nothing; `pnpm typecheck` (root and `ui/tsconfig.json`), `pnpm build`, `pnpm lint` (0 errors), `pnpm format:check` pass; `pnpm test` 312 pass, 0 fail. Runtime identity: types stripped from the S4 and S5 sources (`stripTypeScriptTypes`, whitespace collapsed, arrow-parameter parentheses ignored) compare identical for `agent`, `outputs-panel`, `render-status` and `system`. `app.ts` differs only by added comments and three pairs of grouping parentheses left where `(x as T)` casts were stripped. `values.ts` differs only by alias bindings (`const n = note`, `const m = meta`) that avoid `any` in the shared module (same object, same writes). The built bundle `dist/ui/_vh/index-CxjZ9iWf.js` has the same content hash before S4 and after S5. Script: `.test-tmp/p5-strip/` (not committed).
- 2026-11-22 S5 deviations: (1) `ui/app.ts` exports `type Json = any` (comment says why) and declares `Window.__vhNewCount`; `outputs-panel.ts` and `render-status.ts` import the type from it. (2) `h` has a tag-keyed overload so `h('input')` is an `HTMLInputElement`; `$` is typed as returning `HTMLElement` (the old code already assumed non-null). (3) `ui/values.ts` label maps and `ui/system.ts` state are typed; `server/` typecheck needed no change, and the `server/legacy.test.ts` cast is removed (it was needed only because `normalizeBrief` was inferred from untyped JS; now clean). `server/thumbstudio/schema.ts` and `store.ts` needed no edit. (4) The `platform-ui` test marker `const PRESETS =` became `const PRESETS` because the type annotation on the declaration is replaced by whitespace in stripped source; assertions unchanged. The three source-reading UI tests now read through `readSource`.
- 2026-11-22 S6: environment `.test-tmp/p4env.sh e2e5` (HOME/XDG/TMPDIR/data/base under `.test-tmp/p4-e2e5`, port 7799, guard and jobs off, no window, `PATH=.test-tmp/p4-bin:/usr/bin:/bin`, `--startup no`); the asdf `node` shim fails under a fake HOME, so the scratch hub was started with the real node binary path. Browser check: scratch hub from the repo (data/base `.test-tmp/p5-hub`), script `.test-tmp/p5-browser/check.mjs` (puppeteer-core, installed Chrome, headless): `#/`, `#/renders`, `#/outputs`, `#/disk`, `#/settings`, `#/thumbstudio` each printed `ok` with page text from the app, `total problems 0` (console errors and warnings, page errors, failed requests and HTTP >= 400 all counted). No film review page opened, nothing played. Setup check: `git archive HEAD` into `.test-tmp/p5-e2e/src`, `bash setup.sh --yes --agents opencode --shortcut no --startup no --example no --global-rule no --watch-found no --gpu-encoder no --workspace .test-tmp/p4-e2e5/base`: `pnpm install` ran, then `build the browser interface with pnpm build` produced `dist/ui/index.html` and `dist/ui/_vh/{index-CxjZ9iWf.js,index-D9xtDTKq.css,editor-C2mmOttu.js,figures-catalog-D_4_dwNK.js}`; setup started the hub itself: `/` 200 with `<script type="module" crossorigin src="/_vh/index-CxjZ9iWf.js">`, `/_vh/index-CxjZ9iWf.js` 200, `/api/ping` ok from `.test-tmp/p5-e2e/src/server/hub.ts`. Both hubs stopped; `lsof -nP -iTCP:7799 -sTCP:LISTEN` empty; nothing listened on 7788. Final standards: `pnpm install --frozen-lockfile` up to date; `pnpm format:check` clean; `pnpm lint` exit 0 with 146 warnings (L3, unchanged); `pnpm typecheck` exit 0; `pnpm build` exit 0; `pnpm test` 313 tests, 312 pass, 1 skipped, 0 fail. Scratch folders under `.test-tmp/p5-*` and `.test-tmp/p4-e2e5` were kept (git-ignored), nothing deleted.

## 10. Closeout

- Date: 2026-11-22
- Session: p5-worker (subagent), branch `plan/typescript-migration`
- Verdict: addressed
- Steps complete: S1 (2a8d41d), S2 (225a9d8), S3 (461bb62), S4 (df35b43), S5 (0ce44d9), S6 (this closeout)
- Verification run: `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint` (0 errors, 146 warnings), `pnpm typecheck`, `pnpm build`, `pnpm test` (313 tests, 312 pass, 1 skipped, 0 fail); six-page headless Chrome check on a scratch hub; fresh `setup.sh` from a `git archive HEAD` export in a fake HOME

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | met | `git ls-files ui | grep -E '^ui/[^/]+\.js$'` prints only `ui/review.js` (out of scope, P6); the six modules and four tests listed in the plan are gone (the plan's `git ls-files 'ui/*.js'` also lists the `review/` and `thumbstudio/` JS that P6 and P7 convert); `git show -M --summary df35b43` shows 10 renames; `git log --follow --oneline ui/app.ts` 6 commits |
| A2 | met | `pnpm typecheck` exit 0 (root and `ui/tsconfig.json`); `grep -l "@ts-nocheck" ui/*.ts` empty; stripped-source comparison in §9 S5 (identical bar comments, grouping parentheses and alias bindings); built bundle hash unchanged |
| A3 | met | `pnpm test` 312 pass, 0 fail (baseline 307); new tests `server/hub-ui.test.ts` (3) and `scripts/install.test.ts` (+2, 2 updated); revert checks in §9 S2 and S3 |
| A4 | met | `pnpm lint` exit 0 with 0 errors; `pnpm format:check` exit 0 |
| A5 | met | `pnpm build` exit 0; browser check `total problems 0` on the six pages (§9 S6); 503 page covered by `hub-ui.test.ts` "without a build the hub answers 503" |
| A6 | met | `scripts/install.test.ts` tests "macOS and Linux setup runs pnpm install ..." (install then build), "updating an npm-era install ..." (install then build), "setup and update fail with a clear message when the UI build fails ..."; fresh scratch setup built and served `dist/ui` (§9 S6) |
| D1 (master) | advanced | 10 top-level `ui` files are `.ts`; `review/` and `thumbstudio/` remain for P6 and P7 |
| D2 (master) | advanced | UI sources check strictly under `ui/tsconfig.json` (DOM, no Node types); `ui/values.ts` checks under both configs |
| D3 (master) | advanced | lint 0 errors, format clean |
| D4 (master) | advanced | 312 pass, 0 fail |
| D5 (master) | partly met | `pnpm build` exits 0; scratch hub serves library, renders, outputs, disk, settings and thumbnail studio with no console errors; the review page was not opened by rule |
| D6 (master) | partly met | fresh setup builds the UI automatically (tests and e2e); update runs the same build (tests); the update-from-JS-era e2e is P4's |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|
| P5-1 | `server/tools.ts:19` imports `../ui/values.js` and was missing from the plan's file list; its specifier changed to `.ts` | note | P5 | Recorded in §9 S4 |
| P5-2 | The installer test fixture's `run` throws on any command; it now allows only `pnpm build`, and the exact-command tests expect install then build | note | P5 | Recorded in §9 S3 |
| P5-3 | The asdf `node` shim fails under a fake HOME; scratch hubs and setup runs need the real node binary (`.test-tmp/p4-bin/node`) | note | P6-P9 | Later e2e steps use `PATH=.test-tmp/p4-bin:/usr/bin:/bin` and the real binary path |
| P5-4 | Source-reading tests lose a type annotation's text in stripped source, so markers like `const PRESETS =` must stop before the `=` | note | P6, P7 | Marker rule: end markers before any `=` or `(` that a type annotation could precede |
| P5-5 | The hub cannot watch `dist/ui` when it starts before the first build (watch is skipped); the version-reload broadcast resumes after a restart | note | P8 | Setup and update build before the hub starts; none needed now |
| P5-6 | `ui/app.ts` now exports `type Json = any`; P6 and P7 reuse it by `import type` for the untyped review and thumbstudio code | note | P6, P7 | Recorded in §9 S5 |
| P5-7 | Plan's `git ls-files 'ui/*.js'` pathspec also matches subfolders | plan-defect | P5 | A1 evidence uses a top-level-only grep |

**Master updates written:** none (coordinator owns master.md)
**Next-phase updates written:** none; see P5-3 to P5-6 above for P6 and P7
**Remaining work and handoff:** `record-commit` and `close` are left to the coordinator. No removals were held back. Out of this phase: `ui/review*` and `ui/thumbstudio*` (P6, P7), engine-hook build (P8), docs (P9). Not run: Node 22.18 full suite, real-hardware Linux and Intel macOS acceptance.
