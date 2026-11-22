# Phase P1 — Toolchain and format baseline

- Plan ID: `typescript-migration`
- Phase: P1
- Plan version: 2
- Validated against master version: 12
- Status: in_progress
- Approved by: Jorge Venegas
- Approved at: 2026-11-21
- Commit: pending
- Implementation mode: subagent
- Implemented by: p1-toolchain
- Implemented at: 2026-11-21
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: none
- Written: 2026-11-21
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Set up the toolchain every later phase relies on, without converting any product code. This phase pins TypeScript 7, oxlint and oxfmt, adds a strict `tsconfig.json` that already accepts the current JavaScript (C4), and wires up `pnpm typecheck`, `pnpm lint`, `pnpm format` and `pnpm format:check`. It also teaches `pnpm test` to run `.test.ts` files, declares Node ≥ 22.18 (C1), adds a `.gitignore`, and narrows the native-module rule in `CLAUDE.md` (C11). The repo then gets one format-only oxfmt pass (C6), so later conversion diffs carry no formatting noise. After P1, `pnpm typecheck`, `lint`, `format:check` and `test` all pass on the still-JavaScript codebase.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D2 | Adds a strict `tsconfig.json` and `pnpm typecheck`; mixed JS/TS works under `allowJs` | A1, A3 |
| D3 | Adds `pnpm lint` (oxlint) and `pnpm format:check` (oxfmt) at zero errors, and formats the repo once | A2, A5 |
| D4 | `pnpm test` collects `.test.ts` and `.test.js`; the suite stays at baseline after formatting | A3, A4 |
| D9 | `CLAUDE.md` states the narrowed native-module rule and the new standards commands | A6 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L1 | oxfmt reflow breaks the line-based source extraction in `server/hub-paths.test.js` tests 1–2 | S6 amended: those two extractions become marker-based slices (as test 3 already does) before the format commit; assertions unchanged |

## 3. Scope

In scope:
- `devDependencies` pinned exactly (C10): `typescript@7.0.2`, `oxlint@1.94.0`, `oxfmt@0.79.0`, and `@types/node` on the newest release line that matches `engines` (worker picks the exact version and records it), plus the updated `pnpm-lock.yaml`.
- `package.json`: `engines.node` `>=22.18`; new scripts `typecheck`, `lint`, `format` and `format:check`. `test` and `check` stay as they are.
- `tsconfig.json`, `oxlintrc.json` and `oxfmtrc.json` (non-dot names, C5), plus `.gitignore`.
- `scripts/test.mjs`: also collect `*.test.ts` from the same directories.
- `scripts/install.mjs:143`: the in-process Node check requires 22.18 (major.minor), with the same message style.
- A one-time `oxfmt` pass over tracked JS/MJS, landing as its own commit (C6).
- `CLAUDE.md`: the native-module rule wording (C11) and the "Before committing" command list.

Out of scope:
- Converting any `.js`/`.mjs` file to `.ts` (P2 onward). The probe in S3 lives under `.test-tmp` and is not committed.
- Vite, `vite.config.ts` and any build script (P5).
- Shell-script Node version gates, and adding new config files to the installer `ITEMS` (P4).
- Fixing lint findings by changing behavior. Rules with existing findings are set to `warn` and recorded, not "fixed".
- Formatting Markdown, JSON, CSS or HTML. oxfmt runs only on JS/TS in this plan.
- Other docs (`README.md`, `docs/*`, `skill/`) and the "compact ES module style" rule (P9).

## 4. Entry conditions

- [ ] On branch `plan/typescript-migration`, working tree clean apart from plan files — verify: `git branch --show-current && git status --short`
- [ ] Baseline suite green — verify: `pnpm install --frozen-lockfile && pnpm test` — 299 tests, 298 pass, 1 skipped, 0 fail
- [ ] Phase plan revalidated against current master version (11)
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — Pin the tools and declare the Node floor

- Depends on: none
- Files:
  - `package.json` (modify) — `devDependencies`, `engines.node`, `scripts.typecheck|lint|format|format:check`
  - `pnpm-lock.yaml` (modify) — lock entries for the new dev tools
- Change: Add the exact-pinned dev tools (no `^`). Set `engines.node` to `>=22.18`. Add the scripts: `typecheck` runs `tsc --noEmit -p tsconfig.json`, `lint` runs `oxlint -c oxlintrc.json`, `format` runs `oxfmt --config oxfmtrc.json` over the JS/TS globs, and `format:check` runs the same with `--check`. Update the lockfile with `pnpm install`. If pnpm 11 asks to approve build scripts for any of these packages, stop and report instead of approving blindly.
- Acceptance:
  - [ ] `node -p "require('./package.json').devDependencies"` shows the four packages with exact versions
  - [ ] `pnpm install --frozen-lockfile` succeeds on the committed lockfile
- Verification: `pnpm install --frozen-lockfile && pnpm exec tsc --version && pnpm exec oxlint --version && pnpm exec oxfmt --version` — expected: exits 0, prints 7.0.2 / 1.94.0 / 0.79.0
- Rollback: `git checkout -- package.json pnpm-lock.yaml && pnpm install --frozen-lockfile`

### S2 — Strict tsconfig that accepts today's JavaScript

- Depends on: S1
- Files:
  - `tsconfig.json` (create) — compiler options for the Node-side and test code
- Change: Set `strict: true`, `allowJs: true`, `checkJs: false`, `noEmit: true`, `allowImportingTsExtensions: true`, `erasableSyntaxOnly: true` and `verbatimModuleSyntax: true`. Use `module`/`moduleResolution` `nodenext` and a `target` supported by Node 22.18, with `types: ["node"]`. Include `server`, `scripts`, `ui`, `engine-hooks`, `templates` and `examples`; exclude `node_modules`, `.test-tmp`, `data`, `docs` and `.agents`. Include `dom` in `lib` so that `ui/` JavaScript resolves under `allowJs`. P5 separates browser and Node configs, so record that as a working note in §9 rather than a code comment. If TypeScript 7 rejects or ignores any of these options, stop and report (risk R3).
- Acceptance:
  - [ ] `pnpm typecheck` exits 0 on the unconverted repo
- Verification: `pnpm typecheck; echo $?` — expected: `0`, no diagnostics
- Rollback: `git rm -f tsconfig.json` and revert the `typecheck` script

### S3 — Prove mixed JS/TS works, then let the test runner collect `.test.ts`

- Depends on: S2
- Files:
  - `scripts/test.mjs` (modify) — file filter at line 10 also matches `.test.ts`
- Change: Extend the collector so it accepts both `.test.js` and `.test.ts` in the existing directory list; nothing else changes. Then run a throwaway probe entirely under `.test-tmp/ts-probe/` (not committed). The probe needs a `.ts` module that uses a type annotation and imports a real repo `.js` module (for example `../../server/util.js`), a `.js` file that imports the `.ts` module by its `.ts` specifier, and a `.test.ts` that runs under `node --test`. Also run `tsc --noEmit` on the probe with the repo config (assumption (a)/(b) in the master). Record the exact commands and results in §9. Delete the probe afterwards.
- Acceptance:
  - [ ] The probe passes under `node --test` and under `tsc` with no flags beyond the repo config
  - [ ] `pnpm test` still reports 299 tests, 298 pass, 1 skipped, 0 fail
- Verification: `pnpm test 2>&1 | tail -8` — expected: `tests 299`, `pass 298`, `fail 0`
- Rollback: `git checkout -- scripts/test.mjs`

### S4 — oxlint at zero errors without behavior changes

- Depends on: S1
- Files:
  - `oxlintrc.json` (create) — categories, environments, ignore patterns
- Change: Enable oxlint's `correctness` category as errors, with node and browser environments and ES2024+ globals. Ignore `node_modules`, `.test-tmp`, `data`, `.agents`, `.claude` and `docs`. Run `pnpm lint`. Any rule that reports findings on today's code goes to `warn` in the config, and its rule name and finding count go into §9 so a later phase or the user can decide on it. Do not edit source to silence lint in this phase. If a finding looks like a real bug, report it as a discovery instead of fixing it.
- Acceptance:
  - [ ] `pnpm lint` exits 0 with 0 errors
  - [ ] Every rule downgraded to `warn` is listed in §9 with its count
- Verification: `pnpm lint; echo $?` — expected: summary shows `0 errors`, exit `0`
- Rollback: `git rm -f oxlintrc.json`

### S5 — Tune oxfmt, preview, and stop for the user before formatting

- Depends on: S1
- Files:
  - `oxfmtrc.json` (create) — formatter options
- Change: Configure oxfmt toward the current compact style (C6): a wide line width (start at 160), single quotes, semicolons, and no trailing-comma churn where configurable. Scope `format`/`format:check` to tracked `*.js`, `*.mjs` and `*.ts` under `server`, `scripts`, `ui`, `engine-hooks`, `templates` and `examples`, plus root config `.ts` files. **Do not write formatted files yet.** Produce a preview instead: how many files `format:check` would change, the total lines touched (format a scratch `git worktree` or copy under `.test-tmp` and run `git diff --stat` there), and the full before/after diff for three representative files (`server/util.js`, `ui/review/transport.js`, `templates/new-film/render.js`). Record the preview in §9, then **stop and report to the coordinator**. The coordinator shows the user, who either approves the formatting as configured or asks for config changes (risk R1).
- Acceptance:
  - [ ] Preview recorded in §9; coordinator relayed the user's go-ahead, recorded in §9 with date
- Verification: `pnpm format:check; echo $?` — expected before S6: non-zero, listing files to format
- Rollback: `git rm -f oxfmtrc.json`

### S6 — Commit the toolchain, then apply the format-only pass

- Depends on: S2, S3, S4, S5 (with user go-ahead)
- Files:
  - `.gitignore` (create) — `node_modules/`, `.test-tmp/`, `/data/`, `__pycache__/`
  - `scripts/install.mjs` (modify) — line 143: version check becomes ≥ 22.18 using major and minor
  - `server/hub-paths.test.js` (modify) — tests 1–2 source extraction only (plan v2, ledger L1)
  - `CLAUDE.md` (modify) — the "No native modules…" rule becomes runtime-only, per C11; the "Before committing" rule lists `pnpm format:check`, `pnpm lint`, `pnpm typecheck` and `pnpm test`, keeping `node --check` for files still in JS
  - all tracked `*.js` / `*.mjs` in the formatted directories (modify) — formatting only
- Change: First commit the toolchain and config changes (S1–S5 plus this step's `.gitignore`, `install.mjs` and `CLAUDE.md` edits) as `P1: toolchain, configs and Node 22.18 floor`. Then run `pnpm format` and commit only that result as `P1: oxfmt baseline (format only)`. Before that second commit, confirm the formatted tree contains no non-format change: `pnpm test`, `pnpm lint` and `pnpm typecheck` stay green, and `templates/new-film/render.js` is still byte-identical to `examples/hello-film/render.js` (a test asserts this). Plan v2 (ledger L1): in `server/hub-paths.test.js`, tests 1–2 currently pick single source lines. Change only those two extraction expressions so each takes the whole statement from `server/hub.js` by slicing between stable markers (the pattern test 3 already uses), so the tests pass both before and after formatting. Keep every assertion, vm context and test name unchanged. Commit this as `P1: make hub-paths source extraction format-proof` before the format-only commit, and confirm the test passes on both the unformatted and the formatted tree. Any other source-reading test that formatting breaks: stop and report; do not edit it.
- Acceptance:
  - [ ] Two commits on the branch, the second containing only formatter output
  - [ ] `pnpm format:check` exits 0 after the second commit
  - [ ] `git check-ignore node_modules .test-tmp data` reports all three via `.gitignore`
- Verification: `pnpm install --frozen-lockfile && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test 2>&1 | tail -8` — expected: all exit 0; `pass 298`, `fail 0`
- Rollback: `git revert` the format commit (it is self-contained); the toolchain commit reverts independently

## 6. Phase acceptance criteria

- [ ] A1 — `pnpm typecheck` runs TypeScript 7.0.2 with `strict`, `allowJs` and `erasableSyntaxOnly`, and exits 0 — verify: `pnpm exec tsc --version && pnpm typecheck`
- [ ] A2 — `pnpm lint` exits 0 with 0 errors; downgraded rules are recorded — verify: `pnpm lint`
- [ ] A3 — mixed `.js` ↔ `.ts` imports and `.test.ts` files run under Node and type-check (probe evidence in §9) — verify: probe commands recorded in §9
- [ ] A4 — `pnpm test` collects `.test.ts` and still reports 299 tests, ≥ 298 pass, 0 fail after formatting — verify: `pnpm test`
- [ ] A5 — `pnpm format:check` exits 0, and the format pass is its own commit with no non-format changes — verify: `pnpm format:check && git show --stat HEAD`
- [ ] A6 — `CLAUDE.md` states the runtime-only native rule and the new pre-commit commands; `engines.node` is `>=22.18`; `install.mjs` rejects Node < 22.18 — verify: `git diff main -- CLAUDE.md package.json scripts/install.mjs`

## 7. Code standards check

- [x] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency beyond the four pinned tools
- [x] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [x] Names and structure state intent; comments explain only non-obvious reasons
- [x] Every new test fails if the behavior it covers breaks; no test restates the implementation (this phase adds no tests; the probe is not committed)
- [x] Master standards commands pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| oxfmt cannot keep the compact style; the format pass rewrites most lines (R1) | High | Medium — big one-time diff, harder `git blame` | S5 preview plus user go-ahead before writing. A format-only commit can be added to a `.git-blame-ignore-revs` file in P9 if the user wants |
| TypeScript 7 handles `allowJs` inference or an option differently (R3) | Medium | High — blocks C4 | S2 and S3 probe. Stop and report; the fallback (pin TS 5.x/6.x) is a master-amend for the user to decide |
| Formatting changes text that a source-reading test matches | Medium | Medium | S6 runs the suite before committing. Stop and report; never edit tests in P1 |
| pnpm 11 blocks build scripts for native tool packages | Low | Low | S1 reports rather than auto-approving |
| oxlint correctness rules flag many findings | Medium | Low | Downgrade to `warn`, record counts, decide later |

## 9. Deviations and working notes

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

- 2026-11-21 S1: `pnpm add -D -E typescript@7.0.2 oxlint@1.94.0 oxfmt@0.79.0 @types/node@22` then pinned `@types/node` to exactly `22.20.5` (newest 22.x; matches the 22.18 floor). Verified: `pnpm install --frozen-lockfile && pnpm exec tsc --version` etc. print 7.0.2 / 1.94.0 / 0.79.0. No pnpm build-script approval prompts.
- 2026-11-21 S2: `tsconfig.json` created with the planned options plus `target: es2024` and `lib: [es2024, dom, dom.iterable]`; no `skipLibCheck` needed. Verified: `pnpm typecheck` exit 0 (155 JS files in program). TS 7 accepted every option (R3 clear). Working note for P5: split browser (`dom`) and Node configs.
- 2026-11-21 S3: `scripts/test.mjs` filter is now `/\.test\.[jt]s$/`. Probe under `.test-tmp/ts-probe/` (deleted): `mod.ts` (typed, imports `../../server/util.js`), `use.js` importing `./mod.ts`, `mod.test.ts`. `node --test .test-tmp/ts-probe/mod.test.ts` -> pass 1, no warning on Node 24.16; `tsc --noEmit -p` on the probe (extends repo config) -> exit 0, and a deliberate `const bad: number = 'x'` was rejected (TS2322). A temporary `scripts/zz-probe.test.ts` was collected by `pnpm test` (tests 300), then removed; `pnpm test` -> tests 299, pass 298, skipped 1, fail 0. Not verified on Node 22.18.
- 2026-11-21 S4: `oxlintrc.json` created; `correctness` is error. `pnpm lint` exits 0, 0 errors, 146 warnings. Rules set to `warn` (count): eslint/no-unused-vars 56, eslint/no-unused-expressions 30, unicorn/no-useless-fallback-in-spread 23, eslint/no-useless-escape 17, unicorn/prefer-string-starts-ends-with 7, unicorn/no-useless-spread 3, eslint/no-control-regex 3, eslint/no-unsafe-finally 2 (janitor.test.js:44, source-revision.test.js:28), eslint/no-self-assign 2 (ui/review/sceneedit.js:50, edit2d.js:32; intentional video currentTime refresh), unicorn/no-new-array 1, unicorn/no-single-promise-in-promise-methods 1, eslint/no-async-promise-executor 1 (server/encoders.js:45).
- 2026-11-21 S5: `oxfmtrc.json`: printWidth 160, singleQuote, semi, trailingComma none, arrowParens avoid. `format`/`format:check` scripts scope to `{server,scripts,ui,engine-hooks,templates,examples}/**/*.{js,mjs,ts}` and root `*.ts` with `--no-error-on-unmatched-pattern`. `pnpm format:check` -> exit 1, 150 of 155 files would change. Preview on a scratch copy: +26550/-6950 lines, tracked JS goes from 40441 to 60041 lines (+48%). The oxfmt style splits comma declarators, one statement per line, braced one-line blocks and long call chains, which the compact style avoids; not configurable. Preview scratch deleted. User go-ahead recorded 2026-11-21 (relayed by coordinator): Jorge Venegas approved the oxfmt preview as configured, "Format all now".

## 10. Closeout

- Date: 2026-11-21
- Session: p1-toolchain (subagent, resumed twice: S5 user checkpoint, then plan v2 amendment)
- Verdict: addressed
- Steps complete: S1, S2, S3, S4, S5, S6 (S6 with plan v2 / L1: marker-based extraction in `server/hub-paths.test.js` tests 1-2 committed before the format pass)
- Verification run: `pnpm install --frozen-lockfile`; `pnpm format:check` exit 0; `pnpm lint` 0 errors, 146 warnings; `pnpm typecheck` exit 0; `pnpm test` 299 tests, 298 pass, 1 skipped, 0 fail; `cmp templates/new-film/render.js examples/hello-film/render.js` identical; `git check-ignore node_modules .test-tmp data` lists all three.

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | pass | `tsc` 7.0.2; `pnpm typecheck` exit 0; tsconfig has `strict`, `allowJs`, `erasableSyntaxOnly` |
| A2 | pass | `pnpm lint` 0 errors; 12 downgraded rules and counts listed in §9 |
| A3 | pass | Probe in §9: `.ts`<->`.js` mixed imports, `.test.ts` under `node --test` and `tsc`; `pnpm test` collected a temporary `.test.ts` (300 tests). Not run on Node 22.18 |
| A4 | pass | `pnpm test` 299 tests, 298 pass, 0 fail after formatting |
| A5 | pass | `pnpm format:check` exit 0; format commit f1d0719 is formatter output only (150 files) |
| A6 | pass | CLAUDE.md runtime-only native rule and new commands; `engines.node` `>=22.18`; `install.mjs` rejects Node < 22.18 (commit 9324086) |
| D2 (master) | advanced | strict tsconfig and `pnpm typecheck` exist and pass (no `allowJs` removal until P9) |
| D3 (master) | advanced | lint 0 errors and format clean on the JS codebase |
| D4 (master) | advanced | suite at baseline (298 pass, 0 fail) after formatting |
| D9 (master) | advanced | CLAUDE.md pre-commit commands updated; other docs remain for P9 |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|
| L1 | oxfmt reflow broke the line-based source extraction in `server/hub-paths.test.js` tests 1-2 | phase-amend | P1 | Already applied (plan v2); fixed in 04b8dd8 |
| P1-n1 | `server/encoders.js:45` passes an `async` executor to `new Promise` (possible real bug: a throw there would not reject) | note | P2 | Check when `encoders.js` is converted |
| P1-n2 | `no-unsafe-finally` in `janitor.test.js:44` and `source-revision.test.js:28`; unused `guardExe`, `meta`, `soundOps` in `server/hub.js`; unused `drawSubjectBlock` in `ui/thumbstudio/scene.js` | note | P2, P3, P7 | Decide on each lint warning when the file converts |
| P1-n3 | Formatting grew tracked JS from 40,441 to 60,041 lines (+48%); a `.git-blame-ignore-revs` entry for f1d0719 would keep blame useful | note | P9 | Offer to user in P9 |
| P1-n4 | Node 22.18 type-stripping warning and `.test.ts` runs were not verified on 22.18 (local Node is 24.16) | note | P4 | Existing master unknown; check in P4 |

**Master updates written:** none (master is coordinator-owned)
**Next-phase updates written:** none
**Remaining work and handoff:** P1 is complete. P2 starts the server core conversion; every later phase keeps files oxfmt-formatted (`pnpm format:check`) and must keep source-reading tests format-proof. Lint warnings are recorded for later decisions.
