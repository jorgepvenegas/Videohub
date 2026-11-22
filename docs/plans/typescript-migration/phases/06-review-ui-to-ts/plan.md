# Phase P6 — Review UI to TS

- Plan ID: `typescript-migration`
- Phase: P6
- Plan version: 1
- Validated against master version: 43
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
- Depends on: P5
- Written: 2026-11-22
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Convert the review UI to strict TypeScript: `ui/review.js` and all of `ui/review/` (24 modules including `review.js`, 12 tests, about 13.9k lines). The review page keeps working exactly as before, built by Vite from P5's pipeline.

- **Pure conversion:** renames with history, then types. No runtime change; a type-stripped comparison proves it.
- **Typed in three batches:** leaf modules, then the large editors, then `review.ts` itself, so each commit stays reviewable and green.
- **Source-reading tests:** the five tests that read review source switch to the shared `readSource` helper with marker slices.
- **Review page check:** a scratch hub opens the review page of a scratch copy of the example film, without playing or rendering it.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Removes `ui/review.js` and every `ui/review/*.js` (24 modules + 12 tests) with history kept | A1 |
| D2 | The review code type-checks strictly under `ui/tsconfig.json` (DOM, no Node types); its tests check under the root config | A2 |
| D3 | Lint 0 errors, format clean | A4 |
| D4 | Suite stays at the P5 count (312 pass, 0 fail) | A3 |
| D5 | `pnpm build` exits 0; a scratch hub serves the review page with no console errors | A5 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L3 | 12 lint rules at `warn` | No warning cleanup beyond provably dead code in converted files; counts recorded in S5 |
| L4 | Source-reading tests slice between stable markers | `live`, `renderbtn`, `drafts`, `cover` and `soundenv` tests read through `readSource` with marker slices (S2–S4) |
| L8 | `any` check in type positions only | `grep -rnE ':\s*any\b\|\bas any\b\|<any>' ui/review.ts ui/review/*.ts`, each hit reviewed; the shared `Json` alias (L29) is the only allowed `any` |
| L9 | Rename similarity bar only for files over 15 lines | Same rule in S1; `git log --follow` is the real criterion |
| L14 | Bulk specifier rewrites must match only relative specifiers | S1 rewrites only `./`/`../` specifiers |
| L16 | The `soundEnv` identity test normalizes whitespace and arrow parentheses because `soundenv.js` had no types | S2 types `soundEnv` in `ui/review/soundenv.ts` with the same annotations as `server/vhsound.ts` and restores an exact text comparison of the two stripped functions |
| L20 | Incident: an unscoped probe started a real hub and cleanup hard-deleted a folder | Decision C12 rules are binding for every step (see §5) |
| L23 | `update.sh` from the repo is refused as nested; old configs use port 7788 | Not applicable: P6 runs no setup or update. The scratch hub's config is set to 7799 before start |
| L27 | The asdf `node` shim fails under a fake HOME | The S5 scratch hub runs with the real node binary (`.test-tmp/p4-bin/node` or `command -v node` resolved outside asdf) |
| L28 | Stripped annotations become whitespace, so marker slices must stop before `=` | Markers in the converted source-reading tests end before any annotation |
| L29 | `ui/app.ts` exports `type Json = any` for untyped hub JSON replies | Review modules use `import type { Json } from '../app.ts'` (or `'./app.ts'`) for hub replies instead of new `any`s |
| L31 | `ui/review.js` is a top-level file that P5's A1 could not remove | P6 removes it; A1 here uses `git ls-files 'ui/*.js' 'ui/review/*.js'` with the `review/` scope, and a top-level check that only `ui/thumbstudio/` JS remains under `ui/` |

## 3. Scope

In scope:
- Rename via `git mv`: `ui/review.js` → `ui/review.ts`; every `ui/review/*.js` → `.ts` (modules and `*.test.js` → `*.test.ts`)
- Relative importers, specifiers only: `ui/app.ts` (`./review.js`), and the imports inside the renamed files
- Path mentions in comments that name the renamed files: `server/scenes.ts`, `server/soundedit.ts`, `server/hub.ts`, `server/edit2d.ts` (comment text only)
- Strict types for the 24 modules and their 12 tests; types for hub replies reuse `Json` (L29); types local to the UI, never imported from `server/` (CLAUDE.md)
- Source-reading tests (`live`, `renderbtn`, `drafts`, `cover`, `soundenv`) switch to `readSource` from `scripts/test-source.ts` with marker slices (C7, L4, L28)
- Provably dead code in converted files may be removed only when a lint warning names it and nothing references it (L3)

Out of scope:
- `ui/thumbstudio/*` and the server tests importing it (P7); `engine-hooks/`, film starter and example (P8); docs (P9)
- Any behavior, CSS, HTML or layout change; renaming exported symbols
- Changes to the build, `vite.config.ts`, `ui/tsconfig.json` or the hub. If strict checking needs a config change, stop and report
- Playing, rendering or queueing any film; opening any non-scratch project

## 4. Entry conditions

- [ ] P5 `done`; standards green — verify: `progressive_plan.py status docs/plans/typescript-migration`, then `pnpm format:check && pnpm lint && pnpm typecheck && pnpm build && pnpm test`
- [ ] Working tree clean and pushed — verify: `git status -sb`
- [ ] Phase plan revalidated against current master version (43)
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

Commit after each step with subject `P6:` followed by the step title, and push. Every commit leaves `pnpm build`, `pnpm typecheck` and `pnpm test` green.

**Hard safety rules (C12), binding for every step:**
1. Never import or run an entry module (`server/hub.ts`, `mcp.ts`, `cli.ts`, `scripts/install.ts`) outside the scratch environment. Every hub or CLI run uses `VIDEOHUB_PORT=7799`, `VIDEOHUB_DATA_DIR`/`VIDEOHUB_BASE_DIR` under `.test-tmp/p6-*`, `VIDEOHUB_GUARD=off`, `VIDEOHUB_JOBS=off` and `VIDEOHUB_NO_WINDOW=1`, plus `HOME`/`XDG_*`/`TMPDIR` under `.test-tmp/p6-*` and a `PATH` with no `claude`/`opencode`.
2. Never delete anything outside `.test-tmp`. Report it to the coordinator instead.
3. Before any removal inside the repo, even in `.test-tmp`, if you did not create it in this session, show the coordinator `ls -laT` of the target and wait.

**Stripped-source comparison (S2–S4):** before S2, save type-stripped copies of every renamed module (`readSource` output of the S1 commit) under `.test-tmp/p6-strip/before/`. After each typing step, strip the same files again and diff with whitespace ignored. Allowed differences are comments, grouping parentheses and type-only constructs that leave no runtime code; any other difference must be listed in §9 with the reason, and must not change behavior. Also compare the hashed bundle name in `dist/ui/_vh/` before and after; record whether it changed and why.

### S1 — Rename the review UI and repoint importers

- Depends on: none
- Files: the 36 renames in §3 (temporary first-line `// @ts-nocheck` on modules and tests); `ui/app.ts` (specifier); `server/scenes.ts`, `server/soundedit.ts`, `server/hub.ts`, `server/edit2d.ts` (comment paths only)
- Change: Pure rename plus `./`/`../` specifier updates (L14), then rebuild. Before renaming, grep the whole repo for importers and path mentions of the renamed files (L26) and report any not listed here.
- Acceptance:
  - [ ] `git log --follow` tracks all 36; `pnpm build`, `pnpm typecheck` and `pnpm test` pass with the same counts as before
- Verification: `git show -M --summary HEAD | grep -c '^ rename'` (36); `git ls-files 'ui/review.js' 'ui/review/*.js'` (empty); `pnpm build && pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S2 — Strict types for the leaf modules

- Depends on: S1
- Files: `ui/review/shapes.ts`, `scenes.ts`, `history.ts`, `tips.ts`, `cover.ts`, `applyqueue.ts`, `soundenv.ts`, `tlview.ts`, `tracks.ts`, `sidepanel.ts`, `library.ts`, `dock.ts`, `renderbtn.ts`, `stems.ts`, `transport.ts`, and their tests (`dock`, `tlview`, `history`, `scenes`, `applyqueue`, `renderbtn`, `cover`, `tracks`, `soundenv`, `transport`)
- Change: Remove `@ts-nocheck` and add strict types with DOM types; explicit null handling must match existing behavior. `soundenv.ts` uses the same annotations as `server/vhsound.ts`, and the identity test goes back to an exact comparison of the two stripped functions (L16). `renderbtn` and `cover` tests read source with `readSource` and marker slices. If a module needs types from a later batch, type the boundary locally rather than reaching ahead.
- Acceptance:
  - [ ] No `@ts-nocheck` in these files; the stripped comparison shows no runtime difference; the soundEnv test compares exact stripped text and fails when one side changes (mutation recorded in §9)
- Verification: `grep -l "@ts-nocheck" <files>` (no output); `pnpm typecheck && pnpm build && pnpm test 2>&1 | tail -8`; stripped diff recorded in §9
- Rollback: `git revert HEAD`

### S3 — Strict types for the editors and live source

- Depends on: S2
- Files: `ui/review/timeline.ts`, `mixer.ts`, `sceneedit.ts`, `edit2d.ts`, `soundedit.ts`, `notes.ts`, `live.ts`, `autoscan.ts`; `ui/review/live.test.ts`
- Change: As in S2. `live.test.ts` reads source with `readSource` and marker slices. Commit each module separately if that keeps reviews readable; each commit stays green.
- Acceptance:
  - [ ] No `@ts-nocheck` in these files; the stripped comparison shows no runtime difference
- Verification: same as S2
- Rollback: `git revert` the S3 commits

### S4 — Strict types for the review page

- Depends on: S3
- Files: `ui/review.ts`; `ui/review/drafts.test.ts`
- Change: As in S2. `drafts.test.ts` reads `../review.ts` with `readSource` and marker slices.
- Acceptance:
  - [ ] No `@ts-nocheck` anywhere under `ui/review*`; the stripped comparison shows no runtime difference; `any` appears only through `Json` (L8, L29)
- Verification: `grep -rl "@ts-nocheck" ui/review.ts ui/review` (no output); the L8 grep; `pnpm typecheck && pnpm build && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S5 — Verify the review page in a real browser

- Depends on: S4
- Files: the P6 phase plan (modify) — §7, §9 and §10
- Change:
  1. Run the standards commands, then `pnpm build`.
  2. Copy `examples/hello-film` into `.test-tmp/p6-hub/base/films/` and start a scratch hub (rule 1, real node binary per L27) over that base.
  3. A throwaway script under `.test-tmp/p6-browser/` (not committed) drives the repo's `puppeteer-core` with the installed Chrome, headless and muted. It opens `#/` and the scratch film's review page `#/review/<id>/~live`, without `?play=1`. It collects console errors and failed requests, and does not click play, render, queue or any editor control.
  4. Stop the hub and record the evidence and the L3 warning counts.
- Acceptance:
  - [ ] Zero console errors and zero failed requests on both pages; the film did not play (no `play` event fired on the page's media elements)
- Verification: the recorded script output; `lsof -nP -iTCP:7799 -sTCP:LISTEN` empty at the end
- Rollback: n/a (scratch only)

## 6. Phase acceptance criteria

- [ ] A1 — No tracked JS under the review UI, renames keep history — verify: `git ls-files 'ui/review.js' 'ui/review/*.js'` (empty); `git ls-files ui | grep -E '\.js$'` lists only `ui/thumbstudio/` files; `git log --follow --oneline ui/review.ts | wc -l` > 1
- [ ] A2 — Both type-check configs are strict-clean; no `@ts-nocheck` under `ui/review*`; `any` only via `Json`; S2–S4 are runtime-identical — verify: `pnpm typecheck`, the greps and the §9 comparison
- [ ] A3 — `pnpm test` has 0 failures and ≥ 312 passing, with the converted source-reading tests passing and the soundEnv identity test exact — verify: `pnpm test` and §9
- [ ] A4 — `pnpm lint` has 0 errors and `pnpm format:check` exits 0 — verify: both commands
- [ ] A5 — `pnpm build` exits 0, and the scratch hub's library and review pages load from `dist/ui` with zero console errors and failed requests, without playing the film — verify: S5 evidence

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers and types are reused (`readSource`, `Json` from `ui/app.ts`); no parallel mechanisms or duplicated type declarations across review modules
- [ ] Names and structure state intent; comments explain only non-obvious reasons (for example, why an `any` or a non-null assertion is safe)
- [ ] Every changed test still fails if the behavior it covers breaks (the soundEnv mutation check in §9)
- [ ] Master standards commands pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test`, plus `pnpm build`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Typing `review.ts` (2.7k lines) and the editors tempts runtime "null fixes" or reshaping | Medium | High | Stripped-source comparison after every typing step; coordinator re-runs it |
| Source-reading tests break when types land (vm evaluation of stripped text) | Medium | Medium | `readSource` plus marker slices ending before annotations (L28) |
| Review modules need shared types that do not exist yet, leading to duplicated declarations | Medium | Low | Declare a shared type once in the module that owns the shape and import it with `import type` |
| The review page check plays the film or touches a real project | Low | Medium | Scratch example copy only, no `?play=1`, no clicks; the script asserts no `play` event |
| Another unsafe probe (L20) | Low | High | C12 rules; coordinator reviews §9 commands |

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
