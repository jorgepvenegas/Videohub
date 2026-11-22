# Phase P9 — Strict repo-wide, no JS left, docs

- Plan ID: `typescript-migration`
- Phase: P9
- Plan version: 1
- Validated against master version: 66
- Status: draft
- Approved by: pending
- Approved at: pending
- Commit: pending
- Implementation mode: subagent
- Implemented by: pending
- Implemented at: pending
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

- [ ] P6, P7 and P10 `done`; standards green — verify: `progressive_plan.py status docs/plans/typescript-migration`, then `pnpm format:check && pnpm lint && pnpm typecheck && pnpm build && pnpm test`
- [ ] Working tree clean and pushed — verify: `git status -sb`
- [ ] Phase plan revalidated against current master version (66)
- [ ] Approval recorded per C15 — verify: `Approved by` is set and status is `ready`

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
  - [ ] Neither config has `allowJs` or `checkJs`; both configs pass; the new test passes, and fails when a scratch `.js` file is placed in `ui/` (then removed; recorded in §9)
- Verification: `grep -nE "allowJs|checkJs" tsconfig.json ui/tsconfig.json` (no output); `npx tsc --noEmit -p tsconfig.json && npx tsc --noEmit -p ui/tsconfig.json`; `node --test scripts/no-js.test.ts`; `pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S2 — Code comments name the `.ts` files

- Depends on: S1
- Files: the `.ts` files whose comments name VideoHub's own renamed files (list them in §9)
- Change: Comment text only (L36). Keep mentions of users' film scripts, JS-era install paths, fixtures and string literals. Prove comments-only with the AST comparison (L35) of every changed file against the S1 commit.
- Acceptance:
  - [ ] The AST comparison shows 0 differences for every changed file; a repo grep for VideoHub's own old file names in comments returns only intentional mentions, each listed in §9 with its reason
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
  - [ ] The D9 grep prints nothing; every remaining `.js`/`.mjs` mention in these files refers to users' films, JS-era installs or third-party files, listed in §9
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
  - [ ] Every D item has recorded evidence; nothing listens on 7799 at the end
- Verification: the recorded commands and their output in §9 and §10
- Rollback: n/a (scratch only)

## 6. Phase acceptance criteria

- [ ] A1 — No JS source is tracked, and `scripts/no-js.test.ts` fails if one appears — verify: `git ls-files '*.js' '*.mjs' '*.cjs' '*.jsx'` (empty); S1 revert check
- [ ] A2 — Both configs are strict with no `allowJs`/`checkJs`, and both pass — verify: the S1 grep and `pnpm typecheck`
- [ ] A3 — `pnpm lint` has 0 errors and `pnpm format:check` exits 0 — verify: both commands
- [ ] A4 — `pnpm test` has 0 failures and ≥ 323 passing on Node 24, and the full suite passes on Node 22.18 — verify: S4 evidence
- [ ] A5 — `pnpm build` exits 0, and the scratch hub's library, review, thumbnail studio list and editor pages load with zero console errors and failed requests — verify: S4 evidence
- [ ] A6 — A fresh setup builds and serves the UI and registers `server/mcp.ts`, and an update from a 70cf504 install meets P4's expectations — verify: S4 evidence
- [ ] A7 — Template and example `render.ts` are identical, the `.ts`/legacy tests pass on the final commit, and P10's preview, review and render evidence is cited — verify: S4 evidence
- [ ] A8 — The D9 grep prints nothing, and the remaining JS mentions in docs are intentional — verify: S3 evidence

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no runtime change outside the new test
- [ ] The no-JS test reuses Node's file APIs and the repo's test runner; no new dependency
- [ ] Docs keep their existing voice and structure; only wrong statements change
- [ ] Every new test fails if the behavior it covers breaks (S1 revert check)
- [ ] Master standards commands pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test`, plus `pnpm build`

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
| A7 | pending | |
| A8 | pending | |
| D1 (master) | pending | |
| D2 (master) | pending | |
| D3 (master) | pending | |
| D4 (master) | pending | |
| D5 (master) | pending | |
| D6 (master) | pending | |
| D7 (master) | pending | |
| D8 (master) | pending | |
| D9 (master) | pending | |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|

**Master updates written:** none yet
**Next-phase updates written:** none yet
**Remaining work and handoff:** none yet
