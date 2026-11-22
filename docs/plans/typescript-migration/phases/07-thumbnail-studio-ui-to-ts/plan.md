# Phase P7 — Thumbnail studio UI to TS

- Plan ID: `typescript-migration`
- Phase: P7
- Plan version: 2
- Validated against master version: 50
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
- Depends on: P5
- Written: 2026-11-22
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Convert the thumbnail studio UI to strict TypeScript: the 18 modules in `ui/thumbstudio/` (about 7k lines) and the 7 `server/thumbstudio/*.test.js` files that import or read them. After P7, no JavaScript remains under `ui/` or `server/`.

- **Pure conversion:** renames with history, then types. No runtime change; a type-stripped AST comparison proves it (L35).
- **Shared modules first:** `catalog`, `prompt`, `figures`, `history`, `layers`, `light`, `camera` and `shapes` are imported by server code or server tests, so they check under both type-check configs and stay free of DOM and Node usage. `server/thumbstudio/schema.ts` and `store.ts` then pick up real catalog types (L18).
- **Page modules second:** the editor, inspector, scene, generation and template pages, typed in two batches.
- **Thumbnail studio check:** a scratch hub opens the studio list, the pose catalog and the editor for a scratch thumbnail, without generating anything.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Removes the 18 `ui/thumbstudio/*.js` modules and the 7 `server/thumbstudio/*.test.js` with history kept; no JS left under `ui/` or `server/` | A1 |
| D2 | The studio code type-checks strictly under `ui/tsconfig.json`; the shared modules and server tests also under the root config | A2 |
| D3 | Lint 0 errors, format clean | A4 |
| D4 | Suite stays at the P6 count (312 pass, 0 fail) | A3 |
| D5 | `pnpm build` exits 0; a scratch hub serves the thumbnail studio pages with no console errors | A5 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L3 | 12 lint rules at `warn` | No warning cleanup beyond provably dead code in converted files (for example `drawSubjectBlock` in `scene`, only if nothing references it); counts recorded in S5 |
| L4 | Source-reading tests slice between stable markers | `depth-panel`, `template-ui` and `editor-interactions` tests read through `readSource` with marker slices |
| L8 | `any` check in type positions only | `grep -rnE ':\s*any\b\|\bas any\b\|\bany>' ui/thumbstudio/*.ts`, each hit reviewed; `Json` (L29) is the only allowed `any` |
| L9 | Rename similarity bar only for files over 15 lines | Same rule in S1; `git log --follow` is the real criterion |
| L14 | Bulk specifier rewrites must match only relative specifiers | S1 rewrites only `./`/`../` specifiers |
| L18 | `server/thumbstudio/schema.ts` and `store.ts` rely on types inferred from the UI catalog | S2 types `catalog.ts`, then makes type-only edits in `schema.ts`/`store.ts` where the inferred types now flow; no runtime change |
| L20 | Incident: an unscoped probe started a real hub and cleanup hard-deleted a folder | Decision C12 rules are binding for every step (see §5) |
| L23 | `update.sh` from the repo is refused as nested; old configs use port 7788 | Not applicable: P7 runs no setup or update. The scratch hub's config is set to 7799 before start |
| L27 | The asdf `node` shim fails under a fake HOME | The S5 scratch hub runs with the real node binary |
| L28 | Stripped annotations become whitespace, so marker slices must stop before `=` | Markers in the converted source-reading tests end before any annotation |
| L29 | `ui/app.ts` exports `type Json = any` | Page modules use `import type { Json } from '../app.ts'` for hub replies; shared modules (which must not import `app.ts`, since it touches the DOM) declare their own data shapes instead |
| L32 | `pnpm typecheck` stops at the first failing config; the root config sees Node's `setTimeout` type | While iterating, run `tsc --noEmit -p tsconfig.json` and `tsc --noEmit -p ui/tsconfig.json` separately; shared modules type timers with the return type of `setTimeout` |
| L33 | Unannotated destructured parameters with defaults infer `never[]` or `null` | Destructured option parameters get explicit types |
| L34 | A film card with no cached cover 404s on `/api/thumb` | The S5 scratch film gets a scratch cover in the scratch data dir before the browser check |
| L35 | Identity is proven by parsing stripped sources and comparing ASTs without positions | S2–S4 use the AST comparison against the S1 commit |
| L38 | The coordinator's P6 re-check left 23 empty `ui__review__*.ts` files in the repo root and lint failed | Removed by the coordinator before S1; entry conditions re-verified green |

## 3. Scope

In scope:
- Rename via `git mv`: every `ui/thumbstudio/*.js` → `.ts` (18); `server/thumbstudio/{camera-and-depth,depth-panel,editor-core,editor-interactions,figures-and-refs,template-ui,templates}.test.js` → `.test.ts` (7)
- Relative importers, specifiers only: `ui/app.ts` (`./thumbstudio/page.js`), `server/thumbstudio/schema.ts` and `prompt.ts`, the dynamic `import()` calls in `page`, and the imports inside the renamed files
- Path mentions in comments that name the renamed files: `server/thumbstudio/schema.ts:1`, `server/thumbstudio/prompt.ts:1` (comment text only)
- Strict types for the 18 modules and the 7 tests; types local to the UI, never imported from `server/` (CLAUDE.md)
- Type-only edits in `server/thumbstudio/schema.ts` and `store.ts` that the typed catalog requires (L18)
- Provably dead code in converted files may be removed only when a lint warning names it and nothing references it (L3)

Out of scope:
- `engine-hooks/`, film starter and example (P8); docs, including `docs/ARCHITECTURE.md:46` (P9)
- Any behavior, CSS, HTML or layout change; renaming exported symbols
- Changes to the build, `vite.config.ts`, either tsconfig or the hub. If strict checking needs a config change, stop and report
- Generating, regenerating or exporting any thumbnail image; touching any non-scratch project

## 4. Entry conditions

- [ ] P6 `done`; standards green — verify: `progressive_plan.py status docs/plans/typescript-migration`, then `pnpm format:check && pnpm lint && pnpm typecheck && pnpm build && pnpm test`
- [ ] Working tree clean and pushed — verify: `git status -sb`
- [ ] Phase plan revalidated against current master version (49)
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

Commit after each step with subject `P7:` followed by the step title, and push. Every commit leaves `pnpm build`, `pnpm typecheck` and `pnpm test` green.

**Hard safety rules (C12), binding for every step:**
1. Never import or run an entry module (`server/hub.ts`, `mcp.ts`, `cli.ts`, `scripts/install.ts`) outside the scratch environment. Every hub or CLI run uses `VIDEOHUB_PORT=7799`, `VIDEOHUB_DATA_DIR`/`VIDEOHUB_BASE_DIR` under `.test-tmp/p7-*`, `VIDEOHUB_GUARD=off`, `VIDEOHUB_JOBS=off` and `VIDEOHUB_NO_WINDOW=1`, plus `HOME`/`XDG_*`/`TMPDIR` under `.test-tmp/p7-*` and a `PATH` with no `claude`/`opencode`.
2. Never delete anything outside `.test-tmp`. Report it to the coordinator instead.
3. Before any removal inside the repo, even in `.test-tmp`, if you did not create it in this session, show the coordinator `ls -laT` of the target and wait.

**AST comparison (S2–S4, L35):** strip every renamed module from the S1 commit and from the working tree, parse both with Rolldown's `parseSync`, and compare the ASTs without positions (`.test-tmp/p6-strip/cmp.mjs` is a working reference; copy it to `.test-tmp/p7-strip/`). Any module that differs must be listed in §9 with the reason, and must not change behavior. Also record whether the hashed bundle names in `dist/ui/_vh/` changed.

### S1 — Rename the thumbnail studio and repoint importers

- Depends on: none
- Files: the 25 renames in §3 (temporary first-line `// @ts-nocheck`); `ui/app.ts`; `server/thumbstudio/schema.ts`, `prompt.ts` (specifiers and comment paths)
- Change: Pure rename plus `./`/`../` specifier updates (L14), including the dynamic `import()` calls in `page`, then rebuild. Before renaming, grep the whole repo for importers and path mentions of the renamed files (L26). Pure specifier or comment-path mentions outside this list may be changed and recorded in §9; anything else is reported.
- Acceptance:
  - [ ] `git log --follow` tracks all 25; `pnpm build`, `pnpm typecheck` and `pnpm test` pass with the same counts as before; the build still emits separate chunks for the dynamically imported `editor` and `figures-catalog`
- Verification: `git show -M --summary HEAD | grep -c '^ rename'` (25); `git ls-files ui server | grep -E '\.js$'` (empty); `pnpm build && ls dist/ui/_vh && pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S2 — Strict types for the shared modules

- Depends on: S1
- Files: `ui/thumbstudio/catalog.ts`, `prompt.ts`, `figures.ts`, `history.ts`, `layers.ts`, `light.ts`, `camera.ts`, `shapes.ts`; `server/thumbstudio/camera-and-depth.test.ts`, `editor-core.test.ts`, `figures-and-refs.test.ts`, `templates.test.ts`; `server/thumbstudio/schema.ts`, `store.ts` (type-only, L18)
- Change: Remove `@ts-nocheck` and add strict types. These modules must not use DOM or Node APIs or import `ui/app.ts`, because both configs check them. Export their data shapes (catalog entries, layers, history) so the page modules and `server/thumbstudio/schema.ts` can `import type` them. Type-only edits in `schema.ts`/`store.ts` where inferred types change.
- Acceptance:
  - [ ] No `@ts-nocheck` in these files; both configs pass when run separately; the AST comparison shows no runtime difference; `schema.ts`/`store.ts` changes are type-only (their stripped ASTs are unchanged too)
- Verification: `grep -l "@ts-nocheck"` over the step's files (no output); `tsc --noEmit -p tsconfig.json && tsc --noEmit -p ui/tsconfig.json`; `pnpm build && pnpm test 2>&1 | tail -8`; AST result in §9
- Rollback: `git revert HEAD`

### S3 — Strict types for the panels and pages

- Depends on: S2
- Files: `ui/thumbstudio/depth.ts`, `refs.ts`, `compose.ts`, `gen.ts`, `templates.ts`, `figures-catalog.ts`, `page.ts`, `scene.ts`; `server/thumbstudio/depth-panel.test.ts`, `template-ui.test.ts`
- Change: As in S2, with DOM types and `Json` for hub replies (L29). `depth-panel` and `template-ui` tests read source with `readSource` and marker slices (L4, L28).
- Acceptance:
  - [ ] No `@ts-nocheck` in these files; the AST comparison shows no runtime difference
- Verification: same as S2
- Rollback: `git revert HEAD`

### S4 — Strict types for the inspector and editor

- Depends on: S3
- Files: `ui/thumbstudio/inspector.ts`, `editor.ts`; `server/thumbstudio/editor-interactions.test.ts`
- Change: As in S3. `editor-interactions` reads `editor.ts` with `readSource` and marker slices.
- Acceptance:
  - [ ] No `@ts-nocheck` anywhere under `ui/` or `server/`; the AST comparison shows no runtime difference for all 18 modules; `any` appears only through `Json` (L8, L29)
- Verification: `grep -rl "@ts-nocheck" ui server` (no output); the L8 grep; `pnpm typecheck && pnpm build && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S5 — Verify the thumbnail studio in a real browser

- Depends on: S4
- Files: the P7 phase plan (modify) — §7, §9 and §10
- Change:
  1. Run the standards commands, then `pnpm build`.
  2. Copy `examples/hello-film` into a scratch base under `.test-tmp/p7-hub/`, seed a scratch cover (L34), and start a scratch hub (rule 1, real node binary per L27). Create one scratch thumbnail for that film with `POST /api/thumbstudio/new` on port 7799.
  3. A throwaway script under `.test-tmp/p7-browser/` (not committed) drives the repo's `puppeteer-core` with the installed Chrome, headless. It opens `#/thumbstudio`, `#/thumbstudio/_/catalog` and the editor `#/thumbstudio/PROJECT_ID/THUMB_ID` for the scratch thumbnail, collecting console errors and failed requests. It does not click generate, export or any editor control.
  4. Stop the hub and record the evidence and the L3 warning counts.
- Acceptance:
  - [ ] Zero console errors and zero failed requests on the three pages; nothing was generated (no new variant in the scratch thumbnail folder)
- Verification: the recorded script output; `lsof -nP -iTCP:7799 -sTCP:LISTEN` empty at the end
- Rollback: n/a (scratch only)

## 6. Phase acceptance criteria

- [ ] A1 — No tracked JS under `ui/` or `server/`; renames keep history — verify: `git ls-files ui server | grep -E '\.js$'` (empty); `git log --follow --oneline ui/thumbstudio/editor.ts | wc -l` > 1
- [ ] A2 — Both type-check configs are strict-clean; no `@ts-nocheck` under `ui/` or `server/`; `any` only via `Json`; S2–S4 are runtime-identical, including `schema.ts`/`store.ts` — verify: `pnpm typecheck`, the greps and the §9 AST comparison
- [ ] A3 — `pnpm test` has 0 failures and ≥ 312 passing, with the converted source-reading tests passing — verify: `pnpm test` and §9
- [ ] A4 — `pnpm lint` has 0 errors and `pnpm format:check` exits 0 — verify: both commands
- [ ] A5 — `pnpm build` exits 0, and the scratch hub's thumbnail studio list, catalog and editor pages load from `dist/ui` with zero console errors and failed requests, without generating anything — verify: S5 evidence

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers and types are reused (`readSource`, `Json`, the shapes exported by the shared modules); no duplicated type declarations between UI and `server/thumbstudio`
- [ ] Names and structure state intent; comments explain only non-obvious reasons
- [ ] Every changed test still fails if the behavior it covers breaks (one mutation per converted source-reading test, recorded in §9)
- [ ] Master standards commands pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test`, plus `pnpm build`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Shared modules pick up DOM or Node assumptions and fail under one config | Medium | Medium | Run both configs separately (L32); shared modules never import `app.ts` |
| Typing the catalog changes inferred types in `schema.ts`/`store.ts` and tempts runtime edits there | Medium | High | Type-only edits; AST comparison includes both server files |
| Vite stops splitting the dynamically imported editor and catalog after the rename | Low | Low | S1 checks the chunks in `dist/ui/_vh/`; S5 opens both pages |
| Typing `editor.ts` (1.3k lines) and `inspector.ts` tempts runtime "null fixes" | Medium | High | AST comparison per step; coordinator re-runs it from the S1 commit |
| The browser check triggers image generation or touches a real project | Low | Medium | Scratch film and thumbnail only, no clicks; S5 checks no variant was created |
| Another unsafe probe (L20) | Low | High | C12 rules; coordinator reviews §9 commands |

## 9. Deviations and working notes

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

- 2026-11-22, S1: repo-wide grep found one comment path outside the list: `ui/thumbstudio/catalog.ts:2` named `schema.js`; changed to `schema.ts` (comment only, under the S1 exception). `server/thumbstudio/depth-panel.test.ts:52` gained a lint-disable comment (`typescript/no-this-alias`): renaming to `.ts` turned on that TypeScript-only rule for `observer = this` in a test fake; comment only, no code change. S1 results: 25 renames, no tracked `.js` under `ui` or `server`, build emits `editor` and `figures-catalog` chunks, 312 pass / 0 fail, lint exit 0.
- 2026-11-22, S2: types live in `ui/thumbstudio/layers.ts` (`Layer`, `Brief`, `FullBrief`, `BriefRef`, `Camera`, `Light`, `Style`, `SketchStroke`, `Command` in `history.ts`, catalog shapes in `catalog.ts`). `Brief` defaults to `Partial<Layer>`/`Partial<BriefRef>` entries because existing tests (`prompt.test.ts`, which is outside the file list) pass partial hand-made briefs; pages will use `FullBrief`. `schema.ts` and `store.ts` needed no edits (the typed catalog flows through unchanged). `figures-and-refs.test.ts` uses `res.ref!` (4 places, one comment) because `saveReference` returns a union; `templates.test.ts` annotates two callbacks with `Json`. `history.ts` uses `declare` fields so no class field is emitted. Casts in `prompt.ts` (`as string` index keys, `as Layer[]`, `as number`) each carry a comment.
- 2026-11-22, S2 AST comparison against the S1 commit (`.test-tmp/p7-strip/cmp.mjs`, both sides stripped): 14 files (8 shared modules, 4 tests, `schema.ts`, `store.ts`), 0 different. Bundle names in `dist/ui/_vh/` unchanged (`index-CxjZ9iWf.js`, `editor-C2mmOttu.js`, `figures-catalog-D_4_dwNK.js`). Shared modules reference `CanvasRenderingContext2D` as a type only; no DOM or Node runtime use and no import of `ui/app.ts`.
- 2026-11-22, S3: page modules use `import type { Json }` for hub replies and loose helper values; canvas contexts, layers and numbers are typed (`SceneOpts` is exported from `scene.ts`; `drawFigure` now takes `Partial<Layer>`, a type-only widening in `figures.ts`). `depth-panel.test.ts` and `template-ui.test.ts` read their module through `readSource` (the existing whole-file `import` and `export` replacements already survive formatting, so no marker slice was needed); the sandbox fakes are typed with `Json`, and `ResizeObserver` fields use `declare`. Casts and `!` assertions each carry a comment (fresh canvas always has a 2d context, drop and file events carry their data, the `draft` note popup, `align`).
- 2026-11-22, S3 discovery (note, behavior kept): `compose.ts` `drawActions` appends `cond ? button : null` through `actions.append(...)`; `append(null)` adds the text node "null" to the row when no output copy exists. Typed with a commented cast, not fixed.
- 2026-11-22, S3 AST comparison against the S1 commit: 8 modules, 0 different (`gen.ts` first differed because of `String(overlay)`; replaced by a `Json` cast and re-compared); `figures.ts` re-compared, 0 different. The two tests differ only by the `readSource` conversion and type annotations. Bundle names unchanged. Mutations: `depth.ts` drag-change guard replaced by `if (false)` made `depth-panel.test.ts` fail (2 fail); `templates.ts` focus-layer remap replaced by `null` made `template-ui.test.ts` fail (3 fail); both reverted (7 pass).
- 2026-11-22, S4: `inspector.ts` and `editor.ts` take `Json` for hub data and typed DOM elements where cheap (`InspectorHandlers` in `inspector.ts`); `gen.ts` `fileUrl` took an optional fourth parameter (type-only edit, outside the S4 list but required by `editor.ts` calling it with three arguments). `editor-interactions.test.ts` reads `editor.ts` with `readSource` (the existing multi-line import regex survives; no marker slice needed); its fake `Element` has an index signature and `declare` fields. Casts and `!` carry comments.
- 2026-11-22, S4 AST comparison against the S1 commit: `inspector.ts`, `editor.ts`, `gen.ts` 0 different; `editor-interactions.test.ts` differs from the S1 file only in its import lines and the `source` constant (`readSource`), checked by a variant of the comparison that skips those two statements (0 other differences); same check for `depth-panel` and `template-ui` tests. Mutation: replacing the pen-stroke `activeStroke.pts.push(...)` in `editor.ts` with `void 0` made `editor-interactions.test.ts` fail (1 fail); reverted (8 pass). No `@ts-nocheck` remains under `ui` or `server`; the L8 grep finds no `any` in type positions (only `Json`).

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
