# Phase P6 — Review UI to TS

- Plan ID: `typescript-migration`
- Phase: P6
- Plan version: 2
- Validated against master version: 49
- Status: done
- Approved by: Jorge Venegas
- Approved at: 2026-11-22
- Commit: 8241300
- Implementation mode: subagent
- Implemented by: p6-worker
- Implemented at: 2026-11-22
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
| L8 | `any` check in type positions only | `grep -rnE ':\s*any\b\|\bas any\b\|\bany>' ui/review.ts ui/review/*.ts`, each hit reviewed; the shared `Json` alias (L29) is the only allowed `any` |
| L9 | Rename similarity bar only for files over 15 lines | Same rule in S1; `git log --follow` is the real criterion |
| L14 | Bulk specifier rewrites must match only relative specifiers | S1 rewrites only `./`/`../` specifiers |
| L16 | The `soundEnv` identity test normalizes whitespace and arrow parentheses because `soundenv.js` had no types | S2 types `soundEnv` in `ui/review/soundenv.ts` with the same annotations as `server/vhsound.ts` and restores an exact text comparison of the two stripped functions |
| L20 | Incident: an unscoped probe started a real hub and cleanup hard-deleted a folder | Decision C12 rules are binding for every step (see §5) |
| L23 | `update.sh` from the repo is refused as nested; old configs use port 7788 | Not applicable: P6 runs no setup or update. The scratch hub's config is set to 7799 before start |
| L27 | The asdf `node` shim fails under a fake HOME | The S5 scratch hub runs with the real node binary (`.test-tmp/p4-bin/node` or `command -v node` resolved outside asdf) |
| L28 | Stripped annotations become whitespace, so marker slices must stop before `=` | Markers in the converted source-reading tests end before any annotation |
| L29 | `ui/app.ts` exports `type Json = any` for untyped hub JSON replies | Review modules use `import type { Json } from '../app.ts'` (or `'./app.ts'`) for hub replies instead of new `any`s |
| L31 | `ui/review.js` is a top-level file that P5's A1 could not remove | P6 removes it; A1 here uses `git ls-files 'ui/*.js' 'ui/review/*.js'` with the `review/` scope, and a top-level check that only `ui/thumbstudio/` JS remains under `ui/` |
| L37 | S1 also touched `ui/review.css` comment paths and a `soundenv.test.ts` specifier; S3 changed `drafts.test.ts` to read `notes.ts` via `readSource` | Accepted by the coordinator at closeout; specifier, comment and test-read changes only (§9) |

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
  - [x] `git log --follow` tracks all 36; `pnpm build`, `pnpm typecheck` and `pnpm test` pass with the same counts as before
- Verification: `git show -M --summary HEAD | grep -c '^ rename'` (36); `git ls-files 'ui/review.js' 'ui/review/*.js'` (empty); `pnpm build && pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S2 — Strict types for the leaf modules

- Depends on: S1
- Files: `ui/review/shapes.ts`, `scenes.ts`, `history.ts`, `tips.ts`, `cover.ts`, `applyqueue.ts`, `soundenv.ts`, `tlview.ts`, `tracks.ts`, `sidepanel.ts`, `library.ts`, `dock.ts`, `renderbtn.ts`, `stems.ts`, `transport.ts`, and their tests (`dock`, `tlview`, `history`, `scenes`, `applyqueue`, `renderbtn`, `cover`, `tracks`, `soundenv`, `transport`)
- Change: Remove `@ts-nocheck` and add strict types with DOM types; explicit null handling must match existing behavior. `soundenv.ts` uses the same annotations as `server/vhsound.ts`, and the identity test goes back to an exact comparison of the two stripped functions (L16). `renderbtn` and `cover` tests read source with `readSource` and marker slices. If a module needs types from a later batch, type the boundary locally rather than reaching ahead.
- Acceptance:
  - [x] No `@ts-nocheck` in these files; the stripped comparison shows no runtime difference; the soundEnv test compares exact stripped text and fails when one side changes (mutation recorded in §9)
- Verification: `grep -l "@ts-nocheck"` over the step's files (no output); `pnpm typecheck && pnpm build && pnpm test 2>&1 | tail -8`; stripped diff recorded in §9
- Rollback: `git revert HEAD`

### S3 — Strict types for the editors and live source

- Depends on: S2
- Files: `ui/review/timeline.ts`, `mixer.ts`, `sceneedit.ts`, `edit2d.ts`, `soundedit.ts`, `notes.ts`, `live.ts`, `autoscan.ts`; `ui/review/live.test.ts`
- Change: As in S2. `live.test.ts` reads source with `readSource` and marker slices. Commit each module separately if that keeps reviews readable; each commit stays green.
- Acceptance:
  - [x] No `@ts-nocheck` in these files; the stripped comparison shows no runtime difference
- Verification: same as S2
- Rollback: `git revert` the S3 commits

### S4 — Strict types for the review page

- Depends on: S3
- Files: `ui/review.ts`; `ui/review/drafts.test.ts`
- Change: As in S2. `drafts.test.ts` reads `../review.ts` with `readSource` and marker slices.
- Acceptance:
  - [x] No `@ts-nocheck` anywhere under `ui/review*`; the stripped comparison shows no runtime difference; `any` appears only through `Json` (L8, L29)
- Verification: `grep -rl "@ts-nocheck" ui/review.ts ui/review` (no output); the L8 grep; `pnpm typecheck && pnpm build && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S5 — Verify the review page in a real browser

- Depends on: S4
- Files: the P6 phase plan (modify) — §7, §9 and §10
- Change:
  1. Run the standards commands, then `pnpm build`.
  2. Copy `examples/hello-film` into `.test-tmp/p6-hub/base/films/` and start a scratch hub (rule 1, real node binary per L27) over that base.
  3. A throwaway script under `.test-tmp/p6-browser/` (not committed) drives the repo's `puppeteer-core` with the installed Chrome, headless and muted. It opens `#/` and the scratch film's review page `#/review/PROJECT_ID/~live` (the scratch film's id), without `?play=1`. It collects console errors and failed requests, and does not click play, render, queue or any editor control.
  4. Stop the hub and record the evidence and the L3 warning counts.
- Acceptance:
  - [x] Zero console errors and zero failed requests on both pages; the film did not play (no `play` event fired on the page's media elements)
- Verification: the recorded script output; `lsof -nP -iTCP:7799 -sTCP:LISTEN` empty at the end
- Rollback: n/a (scratch only)

## 6. Phase acceptance criteria

- [x] A1 — No tracked JS under the review UI, renames keep history — verify: `git ls-files 'ui/review.js' 'ui/review/*.js'` (empty); `git ls-files ui | grep -E '\.js$'` lists only `ui/thumbstudio/` files; `git log --follow --oneline ui/review.ts | wc -l` > 1
- [x] A2 — Both type-check configs are strict-clean; no `@ts-nocheck` under `ui/review*`; `any` only via `Json`; S2–S4 are runtime-identical — verify: `pnpm typecheck`, the greps and the §9 comparison
- [x] A3 — `pnpm test` has 0 failures and ≥ 312 passing, with the converted source-reading tests passing and the soundEnv identity test exact — verify: `pnpm test` and §9
- [x] A4 — `pnpm lint` has 0 errors and `pnpm format:check` exits 0 — verify: both commands
- [x] A5 — `pnpm build` exits 0, and the scratch hub's library and review pages load from `dist/ui` with zero console errors and failed requests, without playing the film — verify: S5 evidence

## 7. Code standards check

- [x] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [x] Existing helpers and types are reused (`readSource`, `Json` from `ui/app.ts`); no parallel mechanisms or duplicated type declarations across review modules
- [x] Names and structure state intent; comments explain only non-obvious reasons (for example, why an `any` or a non-null assertion is safe)
- [x] Every changed test still fails if the behavior it covers breaks (the soundEnv mutation check in §9)
- [x] Master standards commands pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test`, plus `pnpm build`

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

- 2026-11-22 S2: method: before S2, stripped copies of all 36 files from the S1 commit were saved in `.test-tmp/p6-strip/before/`; `.test-tmp/p6-strip/cmp.mjs` strips the current file the same way, parses both with rolldown's `parseSync` (preserveParens off) and compares the ASTs with positions dropped, so comments, grouping parentheses and whitespace cannot hide or fake a difference (a one-character mutation of `tips.ts` was reported as DIFF). Result: the 15 modules are AST-identical to S1; the 10 tests are identical except `renderbtn.test.ts` and `cover.test.ts` (now read source through `readSource` and slice from `const FIXED` / `export function createLiveCover`) and `soundenv.test.ts` (exact stripped-text comparison). Built bundle names unchanged (`dist/ui/_vh/index-CxjZ9iWf.js`, `editor-C2mmOttu.js`). `tsc` stops after the root config fails, so UI-config errors in `stems.ts` showed up only once the root config was clean. Typing choices: loose objects use the shared `Json` alias (L29); a few local shapes use `Record<string, ...>`; `SoundEntry` is declared once in `soundenv.ts` (a UI copy of the server alias, not imported from `server/`); `catch (e: Json)` where `e.message` is read; test mocks of `localStorage` use `(globalThis as Json)`; `soundenv.test.ts` marks results used straight away with `!` (one comment). `soundEnv` in `soundenv.ts` is now a copy of the one in `server/vhsound.ts` with the same annotations, and the test compares the two stripped functions exactly. Mutation check: one extra space inside the annotation of `soundenv.ts`, and a logic change (`+ 0`) in `server/vhsound.ts`, each made the identity test fail (4 pass, 1 fail); both reverted (5 pass). `pnpm format:check`, `pnpm typecheck`, `pnpm build` pass; `pnpm lint` 0 errors; `pnpm test` 313 tests, 312 pass, 1 skipped, 0 fail. The `Json` type import sits at the top of files that have no other imports.

- 2026-11-22 S3: same AST comparison against the S1 sources: `timeline`, `mixer`, `sceneedit`, `edit2d`, `soundedit`, `notes`, `live` and `autoscan` are AST-identical (types, `as` casts, `!`, optional markers and one overload signature leave no runtime code); `live.test.ts` differs only in how it reads source (`readSource`, slice from `export function createLiveSource`). Bundle names unchanged (`index-CxjZ9iWf.js`, `editor-C2mmOttu.js`). Type-only devices used, none changes behavior: `getContext('2d')!` (a fresh canvas always has a 2d context; one comment per file), `catch (e: Json)`, `ReturnType<typeof setTimeout> | 0` for timer variables (the root config has Node types, so a plain `number` fails), `Record<string, ...>` for lookup tables, optional parameters (`close(silent?)`, `back(quiet?)`, `b(..., cls?)`) and one overload signature in `edit2d.ts` (`changed(_unused?: boolean): void;`) because callers pass `true` to a zero-parameter function, `(x as Json)` where a DOM property is nullable or foreign (`contentWindow`, `firstChild`, `files`). Deviation outside the S3 file list: `ui/review/drafts.test.ts` (an S4 file) reads `notes.ts` as source text and broke when `notes.ts` got types, so its `notes.ts` read now uses `readSource` with a slice from `const put` (the first statement after the imports); the `review.ts` read there stays raw until S4. `pnpm format:check`, `pnpm typecheck`, `pnpm build` pass; `pnpm lint` 0 errors; `pnpm test` 313 tests, 312 pass, 1 skipped, 0 fail.

- 2026-11-22 S4: `ui/review.ts` is AST-identical to its S1 source (the comparison covers every `ui/review*` module: 24 modules plus `review.ts`, all identical). `drafts.test.ts` differs only in how it reads source (`readSource` for `review.ts` and `notes.ts`; the `notes.ts` slice starts at `const put`, the first statement after the imports; the `quickEmpty` line regex still matches because the annotation is on the parameter) plus type-only changes (`(this as Json).text`, `: Json` on the harness objects); the harness test still fails when `quickEmpty` is mutated (9 pass, 1 fail, reverted) and `cover.test.ts` fails when `snapDisplayed(480)` becomes 481 (1 pass, 3 fail, reverted). Type-only fixes in `review.ts`: `const S: Json`, optional parameters (`zoomAt`, `tick`, `ensureDraft`, `verdict`, `toggleHelp`, `peek`), `Record<string, ...>` lookup tables, `getContext('2d')!` with a comment, `as Json[][]` on the corner-host list, `new Promise<HTMLImageElement>`. Deviation outside the S4 file list: `ui/review/sidepanel.ts` (S2 file) destructured `{ tabs = [], foot = null, key = ... }` with no annotation, so TypeScript inferred `tabs: never[]` and rejected `review.ts`'s call; the parameter now ends in `: Json` (type only; the stripped source is unchanged). Bundle names unchanged. `grep -rl "@ts-nocheck" ui/review.ts ui/review` prints nothing; the L8 grep finds one hit, the English word `any` as a variable name in `ui/review/transport.ts:392`, not a type. `pnpm format:check`, `pnpm typecheck`, `pnpm build` pass; `pnpm lint` 0 errors; `pnpm test` 313 tests, 312 pass, 1 skipped, 0 fail.

- 2026-11-22 S5: scratch hub under `.test-tmp/p6-hub` (HOME, XDG_*, TMPDIR, `data`, `base` all inside it; `env -i` with `PATH=.test-tmp/p4-bin:/usr/bin:/bin`, so no `claude` or `opencode`; real node binary `/Users/jorge/.asdf/installs/nodejs/24.16.0/bin/node`, per L27; `VIDEOHUB_PORT=7799`, guard and jobs off, no window; `config.json` pins port 7799 and one root, `base/films`). The scratch film is a copy of `examples/hello-film`; the hub listed it as `hello-film` (id `801215bf350a`). Script `.test-tmp/p6-browser/check.mjs` (not committed; puppeteer-core with the installed Chrome, headless, `--mute-audio`) opened `#/` and `#/review/801215bf350a/~live` without `?play=1`, clicked nothing, listened for `play`/`playing` events in the capture phase, and counted console errors and warnings, page errors, failed requests and HTTP >= 400. Result: both pages `ok`, `total problems ... 0`; the review page showed the real UI ("hello-film", "Live preview (from code, no render)", Scan, Help, Render), loaded one film iframe, and its one `VIDEO` stayed `paused=true`; `/api/jobs` was `[]` afterwards. First run: the library page showed one 404 for `/api/thumb/801215bf350a?source=live` (a film with no cached cover answers 404 by design, and the card shows "Open live preview"); a cover is only made by opening the film in the review page and letting it play, which this check must not do, so a scratch cover was generated with ffmpeg into the scratch `data/thumbs/live-801215bf350a.jpg` and the second run had zero problems. Hub stopped (`kill` of the pid I started); `lsof -nP -iTCP:7799 -sTCP:LISTEN` empty. Final standards: `pnpm install --frozen-lockfile` up to date; `pnpm format:check` clean; `pnpm lint` exit 0 with 146 warnings (unchanged from P5; no dead code removed; 19 of them in `ui/review*`); `pnpm typecheck` and `pnpm build` exit 0; `pnpm test` 313 tests, 312 pass, 1 skipped, 0 fail.

## 10. Closeout

Fill at the end of every implementation session. Do not mark the phase done until this section is complete and the master is updated. Set `Implemented by` to the worker name or ID and `Implemented at` to the implementation date; `close` requires both.

- Date: 2026-11-22
- Session: p6-worker (subagent), branch `plan/typescript-migration`
- Verdict: addressed
- Steps complete: S1 (89d7af1), S2 (53acb74), S3 (3205e95), S4 (247cea2), S5 (browser check, recorded in this closeout commit)
- Verification run: `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint` (0 errors, 146 warnings), `pnpm typecheck`, `pnpm build`, `pnpm test` (313 tests, 312 pass, 1 skipped, 0 fail); AST comparison of all 24 modules and `review.ts` against the S1 sources; headless Chrome check of the library and review pages on a scratch hub

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | met | `git ls-files 'ui/review.js' 'ui/review/*.js'` prints nothing; `git ls-files ui \| grep -E '\.js$'` lists only `ui/thumbstudio/` files; `git show -M --summary 89d7af1` shows 36 renames; `git log --follow --oneline ui/review.ts` 6 commits |
| A2 | met | `pnpm typecheck` exit 0 (root and `ui/tsconfig.json`); `grep -rl "@ts-nocheck" ui/review.ts ui/review` prints nothing; the L8 grep has one hit, the word `any` used as a variable name in `ui/review/transport.ts:392`, and no type-position `any` outside the shared `Json`; §9 S2-S4: every module is AST-identical to its S1 source (tests differ only where their source reading changed) |
| A3 | met | `pnpm test` 312 pass, 0 fail (same as the P5 count); `renderbtn`, `cover`, `live`, `drafts` and `soundenv` tests read source through `readSource` with marker slices; the soundEnv test compares the two stripped functions exactly and fails on a whitespace or logic mutation (§9 S2); `cover` and `drafts` tests fail on a mutation of their source (§9 S2, S4) |
| A4 | met | `pnpm lint` exit 0, 0 errors (146 warnings, unchanged); `pnpm format:check` exit 0 |
| A5 | met | `pnpm build` exit 0 (bundle names unchanged); scratch hub: `#/` and the review page `#/review/801215bf350a/~live` each had 0 console errors, 0 failed requests, no `play` event, the video stayed paused, no job was queued (§9 S5) |
| D1 (master) | met | This phase's share: `ui/review.ts` and all `ui/review/*` are `.ts` (36 files); only `ui/thumbstudio/` JS remains under `ui/`. D stays open until P9 |
| D2 (master) | met | This phase's share: the review UI checks strictly under `ui/tsconfig.json` (DOM, no Node types) and its tests under the root config. D stays open until P9 |
| D3 (master) | met | This phase's share: lint 0 errors, format clean. D stays open until P9 |
| D4 (master) | met | This phase's share: 312 pass, 0 fail. D stays open until P9 |
| D5 (master) | met | This phase's share: `pnpm build` exits 0; a scratch hub serves the library and the review page with no console errors and no failed requests. The thumbnail studio is P7's. D stays open until P9 |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|
| P6-1 | `tsc --noEmit -p tsconfig.json && tsc --noEmit -p ui/tsconfig.json` stops at the first failing config, so UI-config errors stay hidden while a test file fails under the root config; also the root config checks any module a test imports (with Node types), so `setTimeout` is `Timeout` there and `number` under the UI config | note | P7 | Type timers as `ReturnType<typeof setTimeout> \| 0`; run `tsc -p ui/tsconfig.json` on its own while converting |
| P6-2 | An unannotated destructured parameter with defaults (`{ tabs = [], foot = null }`) raises no implicit-any error, but TypeScript infers `never[]`/`null` from the defaults and rejects callers; found only when `review.ts` called `createSidePanel` | note | P7 | Annotate destructured parameters that have defaults with `: Json` even when tsc is silent |
| P6-3 | Functions called with more arguments than they declare (`changed(true)`) cannot be typed without changing the stripped runtime unless an overload signature is added; one overload was used in `edit2d.ts` | note | P7 | Use an overload signature or an optional parameter, never an added runtime parameter |
| P6-4 | A library card for a film with no cached cover makes one 404 on `/api/thumb/:id` by design (the card shows "Open live preview"), so a "zero failed requests" browser check needs a scratch cover or a film that has one | note | P7, P9 | P7/P9 browser checks use a scratch cover file or accept this one expected 404 |
| P6-5 | AST-level comparison (`rolldown` `parseSync` on stripped sources, positions dropped) proves runtime identity more strongly than the whitespace diff of P5; a one-character mutation was caught | note | P7, P8 | Script `.test-tmp/p6-strip/cmp.mjs` (uncommitted) can be copied by later phases |

**Master updates written:** none (coordinator owns master.md)
**Next-phase updates written:** none; see P6-1 to P6-5 for P7
**Remaining work and handoff:** `record-commit` and `close` are left to the coordinator. No removals were held back. Out of this phase: `ui/thumbstudio*` (P7), engine hooks, film starter and example (P8), docs naming the old paths (`docs/ARCHITECTURE.md:38`, `docs/PROJECT-CONTRACT.md:4`; P9). Stale prose comments inside the converted files still say `mixer.js`, `timeline.js` and similar; they are comments, not specifiers, and were left (P9 can sweep them). Not run: Node 22.18 full suite, real-hardware Linux and Intel macOS acceptance.
