# Phase P8 — Engine hooks to TS

- Plan ID: `typescript-migration`
- Phase: P8
- Plan version: 1
- Validated against master version: 58
- Status: in_progress
- Approved by: Jorge Venegas
- Approved at: 2026-11-22
- Commit: pending
- Implementation mode: subagent
- Implemented by: pending
- Implemented at: pending
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: P4,P5
- Written: 2026-11-22
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Convert the two page-side engine hooks, `engine-hooks/vh2d.js` (269 lines) and `vhtweaks.js` (556 lines), to strict TypeScript. Vite then builds them into readable, stable `dist/engine-hooks/vh2d.js` and `vhtweaks.js` that engines copy.

- **Pure conversion:** renames with history, then types. A type-stripped AST comparison proves there is no runtime change (L35).
- **`three` types:** a local `engine-hooks/three.d.ts` declares only the parts of `three` the hook uses (C13). No new dependency.
- **Hook build:** a second Vite config builds both hooks as ES modules: unminified, unhashed, with `three` left as an external import. `pnpm build` runs both builds, so setup and update produce the hooks too.
- **No consumer change:** the hub does not serve the hooks; engines copy them (see the header of `vh2d`). Docs naming the new path are P9.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Removes `engine-hooks/*.js` with history kept | A1 |
| D2 | Both hooks type-check strictly under the root config, with `three` typed by the local declaration | A2 |
| D3 | Lint 0 errors, format clean | A4 |
| D4 | Suite stays at the P7 count (312 pass, 0 fail) plus the new installer assertion | A3 |
| D5 | `pnpm build` exits 0 and also emits `dist/engine-hooks/vh2d.js` and `vhtweaks.js` | A5 |
| D6 | Setup and update ship the hooks build config, so the build they run emits the hooks | A6 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L3 | 12 lint rules at `warn` | No warning cleanup beyond provably dead code in the two hooks; counts recorded in S4 |
| L4 | Source-reading tests slice between stable markers | Not applicable: no test reads the hooks' source |
| L8 | `any` check in type positions only | `grep -nE ':\s*any\b\|\bas any\b\|\bany>' engine-hooks/*.ts`, each hit reviewed; the hooks may not import `Json` from the UI, so any unavoidable `any` carries a comment |
| L9 | Rename similarity bar only for files over 15 lines | Both hooks are over 15 lines; `git log --follow` is the criterion |
| L12 | `server/types.ts` types and inferred types | Not applicable: the hooks import nothing from `server/` or `ui/` and must not start to |
| L14 | Bulk specifier rewrites must match only relative specifiers | The `three` import stays a bare package specifier; only comment paths change |
| L20 | Incident: an unscoped probe started a real hub and cleanup hard-deleted a folder | Decision C12 rules are binding for every step (see §5) |
| L23 | `update.sh` from the repo is refused as nested | S4 builds a `git archive` export in a sibling scratch folder; no setup or update run and no hub |
| L27 | The asdf `node` shim fails under a fake HOME | S4's scratch build uses the real node binary if a fake HOME is set |
| L28 | Stripped annotations become whitespace | Not applicable: no source-reading test |
| L34 | A film card with no cover 404s | Not applicable: no browser check in this phase |
| L35 | AST comparison of stripped sources | S2 compares both hooks against the S1 commit |
| L38 | The coordinator's comparison loop wrote stray files into the repo root | Comparison scripts write only under `.test-tmp/p8-*`; check `git status --short` before every commit and stage explicit paths |
| L40 | Renaming to `.ts` enables TypeScript-only lint rules | Expect them on both hooks; fix with types, or with a commented disable only if the fix would change runtime code |
| L42 | Marker slices only where a test extracts a fragment | Not applicable: no source-reading test |

## 3. Scope

In scope:
- Rename via `git mv`: `engine-hooks/vh2d.js` → `vh2d.ts`, `engine-hooks/vhtweaks.js` → `vhtweaks.ts`
- Comment paths naming the hooks: `server/edit2d.ts:1`, `ui/review/edit2d.ts:2`, and the self-references in the hooks' header comments (for example "master copy in VideoHub/engine-hooks/vh2d.js"), which then name the built file `dist/engine-hooks/vh2d.js` copied from `engine-hooks/vh2d.ts`
- `engine-hooks/three.d.ts` (create): an ambient `declare module 'three'` covering only `Vector3`, `Quaternion`, `Euler`, `Box3`, `Plane`, `Raycaster`, `AdditiveBlending` and the object, camera and scene members the hook touches (C13)
- Strict types for both hooks
- `vite.hooks.config.ts` (create): library build, entries `engine-hooks/vh2d.ts` and `vhtweaks.ts`, ES format, file names `[name].js`, output `dist/engine-hooks` (emptied on build), `minify: false`, `three` external
- `package.json`: `build` becomes `vite build && vite build --config vite.hooks.config.ts`
- `scripts/install.ts`: add `vite.hooks.config.ts` to `ITEMS`; `scripts/install.test.ts`: the existing copy test also asserts it

Out of scope:
- Film starter, example and hub film serving (P10); docs, README and the skill (P9)
- Serving the hooks from the hub, or changing how engines include them
- Any behavior change in the hooks; renaming exports (`VH2D`, `loadTweaks`, `makeTweaks`, the default export)
- Adding `three` or `@types/three` (C13)

## 4. Entry conditions

- [ ] P7 `done`; standards green — verify: `progressive_plan.py status docs/plans/typescript-migration`, then `pnpm format:check && pnpm lint && pnpm typecheck && pnpm build && pnpm test`
- [ ] Working tree clean and pushed — verify: `git status -sb`
- [ ] Phase plan revalidated against current master version (58)
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

Commit after each step with subject `P8:` followed by the step title, and push. Every commit leaves `pnpm build`, `pnpm typecheck` and `pnpm test` green. Stage explicit paths and check `git status --short` before each commit (L38).

**Hard safety rules (C12), binding for every step:**
1. Never import or run an entry module (`server/hub.ts`, `mcp.ts`, `cli.ts`, `scripts/install.ts`) outside the scratch environment. P8 needs no hub, setup or update run; if one becomes necessary, stop and report.
2. Never delete anything outside `.test-tmp`. Report it to the coordinator instead.
3. Before any removal inside the repo, even in `.test-tmp`, if you did not create it in this session, show the coordinator `ls -laT` of the target and wait.

### S1 — Rename the engine hooks

- Depends on: none
- Files: `engine-hooks/vh2d.js` → `vh2d.ts`, `engine-hooks/vhtweaks.js` → `vhtweaks.ts` (temporary first-line `// @ts-nocheck`); `server/edit2d.ts`, `ui/review/edit2d.ts` (comment paths only)
- Change: Pure rename. Grep the whole repo (excluding `docs/`) for other mentions of the two file names and report any that are not comments.
- Acceptance:
  - [ ] `git log --follow` tracks both; `pnpm build`, `pnpm typecheck` and `pnpm test` pass with the same counts
- Verification: `git show -M --summary HEAD | grep -c '^ rename'` (2); `git ls-files engine-hooks` lists only `.ts`; `pnpm build && pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S2 — Strict types for the hooks

- Depends on: S1
- Files: `engine-hooks/vh2d.ts`, `vhtweaks.ts`, `three.d.ts` (create)
- Change: Remove `@ts-nocheck` and add strict types. The `three` declaration covers only what the hook uses, with signatures that match three's real API for those members (so engines that type-check against real three see no conflict). Update the header comments' self-references as described in §3. Run the AST comparison of both hooks against the S1 commit, using a script under `.test-tmp/p8-strip/` (`.test-tmp/p6-strip/cmp.mjs` is a working reference).
- Acceptance:
  - [ ] No `@ts-nocheck`; `pnpm typecheck` passes; the AST comparison shows 0 differences; the hooks import nothing but `three`
- Verification: `grep -l "@ts-nocheck" engine-hooks/*.ts` (no output); the L8 grep; `pnpm typecheck && pnpm test 2>&1 | tail -8`; AST result in §9
- Rollback: `git revert HEAD`

### S3 — Build the hooks with Vite and ship the config

- Depends on: S2
- Files: `vite.hooks.config.ts` (create), `package.json`, `scripts/install.ts`, `scripts/install.test.ts`
- Change: Add the hooks build described in §3 and chain it in `build`. Add the config to `ITEMS` and extend the existing installer copy test so that it fails without that entry.
- Acceptance:
  - [ ] `pnpm build` emits the UI as before and `dist/engine-hooks/vh2d.js` and `vhtweaks.js`, unminified, with `import … from 'three'` kept as an import
  - [ ] Importing `dist/engine-hooks/vh2d.js` in Node gives the same export names and the same `VH2D` keys as importing `engine-hooks/vh2d.ts`
  - [ ] `vhtweaks.js` exports `loadTweaks` and `makeTweaks` (checked by parsing the built file, since `three` is not installed)
  - [ ] The installer test fails when the `ITEMS` entry is removed (recorded in §9)
- Verification: `pnpm build && ls dist/ui dist/engine-hooks && grep -n "from 'three'" dist/engine-hooks/vhtweaks.js`; the export comparison script under `.test-tmp/p8-build/`; `node --test scripts/install.test.ts`
- Rollback: `git revert HEAD`

### S4 — Verify a clean export builds the hooks

- Depends on: S3
- Files: the P8 phase plan (modify) — §7, §9 and §10
- Change: Run the standards commands and `pnpm build`. Export `HEAD` with `git archive` into a sibling scratch folder under `.test-tmp/p8-export/` (L23). In it, run `pnpm install --frozen-lockfile` and `pnpm build`, and confirm that both `dist/ui/index.html` and `dist/engine-hooks/*.js` exist. No setup, update or hub run. Record the evidence and the L3 warning counts.
- Acceptance:
  - [ ] The export builds both outputs with exit 0; standards are green
- Verification: the recorded commands and their output
- Rollback: n/a (scratch only)

## 6. Phase acceptance criteria

- [ ] A1 — No tracked JS under `engine-hooks/`; renames keep history — verify: `git ls-files engine-hooks | grep -E '\.js$'` (empty); `git log --follow --oneline engine-hooks/vhtweaks.ts | wc -l` > 1
- [ ] A2 — `pnpm typecheck` is strict-clean; no `@ts-nocheck` in the hooks; any `any` is commented; S2 is runtime-identical — verify: `pnpm typecheck`, the greps and the §9 AST comparison
- [ ] A3 — `pnpm test` has 0 failures and ≥ 312 passing, with the extended installer test shown to fail without its change — verify: `pnpm test` and §9
- [ ] A4 — `pnpm lint` has 0 errors and `pnpm format:check` exits 0 — verify: both commands
- [ ] A5 — `pnpm build` exits 0 and emits readable `dist/engine-hooks/vh2d.js` and `vhtweaks.js` with the same exports as the sources and `three` external — verify: S3 evidence
- [ ] A6 — The installer ships `vite.hooks.config.ts`, and a clean `git archive` export builds both outputs — verify: the S3 test and S4 evidence

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] The `three` declaration covers only members the hook uses; no duplicated hook types
- [ ] Names and structure state intent; comments explain only non-obvious reasons (for example, why `three` is declared locally)
- [ ] Every new or changed test fails if the behavior it covers breaks (installer `ITEMS` revert check in §9)
- [ ] Master standards commands pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test`, plus `pnpm build`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| The local `three` declaration drifts from real three and misleads engines that copy the hook | Medium | Low | Declare real three signatures for the few members used; engines copy the built `.js`, which carries no types |
| Vite's library build rewrites the hooks (renamed bindings, merged chunks, lost default export) | Medium | Medium | `minify: false`, one entry per hook, export-name comparison in S3 |
| The chained `build` script hides a failure of the second build | Low | Medium | `&&` stops on failure; S4 checks both outputs in a clean export |
| Typing the hooks tempts runtime "null fixes" | Medium | High | AST comparison; the coordinator re-runs it from the S1 commit |
| Another unsafe probe or stray file (L20, L38) | Low | High | C12 rules; no hub or setup run; explicit staging |

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
| D5 (master) | pending | |
| D6 (master) | pending | |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|

**Master updates written:** none yet
**Next-phase updates written:** none yet
**Remaining work and handoff:** none yet
