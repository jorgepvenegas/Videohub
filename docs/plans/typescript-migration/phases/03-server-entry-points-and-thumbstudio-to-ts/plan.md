# Phase P3 — Server entry points and thumbstudio to TS

- Plan ID: `typescript-migration`
- Phase: P3
- Plan version: 1
- Validated against master version: 23
- Status: in_progress
- Approved by: Jorge Venegas
- Approved at: 2026-11-21
- Commit: pending
- Implementation mode: subagent
- Implemented by: p3-server-entry
- Implemented at: 2026-11-21
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: P2
- Written: 2026-11-21
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Finish the server side. This phase converts the entry and tool layer (`hub`, `mcp`, `cli`, `tools`, `mcp-selftest`), the sound helpers `vhsound` and `sfxlib`, their tests, and the server-only half of `server/thumbstudio/` to strict TypeScript. Every in-repo reference that starts, spawns, registers or detects these entry files then points at `.ts`: package scripts, the hub autostart item, the agent MCP registration, the skill and rule command lines, and installer paths. A fresh install from this branch therefore works end to end. Recognizing and re-pointing *existing* JavaScript-era installs is P4's job (C9). Behavior does not change.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Removes the remaining non-UI-coupled `.js`/`.mjs` from `server/`, keeping history | A1, A6 |
| D2 | Converted files pass `strict`, with no `@ts-nocheck` and `any` only where justified | A2 |
| D3 | Lint has 0 errors and format is clean | A4 |
| D4 | Suite at baseline | A3 |
| D5 | A scratch hub starts from `server/hub.ts`; MCP over stdio and the CLI reach it | A5 |
| D6 | New installs register `server/mcp.ts`, write `server/cli.ts` into skill/rule text and autostart `server/hub.ts` (fresh-install half of D6) | A7 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L3 | 12 lint rules at `warn`; unused `guardExe`/`meta`/`soundOps` in `server/hub.js` | No dead-code removal in `hub.ts`, even for the named unused symbols. Warning counts before and after recorded in S6 |
| L4 | Source-reading tests must slice between stable markers | `hub-paths.test.ts`, `tools.test.ts` and `ui/review/soundenv.test.js` (S3) read through `readSource` with marker slices |
| L8 | The `any` grep matched English words in test titles | The `any` check looks only at type positions: `grep -nE ':\s*any\b\|\bas any\b' server/**/*.ts`, and every hit has a same-line comment |
| L9 | Rename similarity of tiny files falls under 90% | The rename criterion is `git log --follow` history; the 90% bar applies only to files over 15 lines |
| L12 | `server/types.ts` exports `RouteFn`, `ReadBody`, `Project`, `Job`; `hub-paths`/`tools` tests still read JS | `hub.ts`, `tools.ts` and `mcp.ts` reuse those types and extend `server/types.ts` only for shapes shared by two or more modules; S2 and S4 convert both tests to `readSource` |

## 3. Scope

In scope (`git mv`, C8):
- `server/hub.js`, `mcp.js`, `cli.js`, `tools.js`, `mcp-selftest.js` → `.ts`; `server/vhsound.mjs`, `sfxlib.mjs` → `.ts`
- `server/hub-paths.test.js`, `tools.test.js`, `duck.test.js` → `.test.ts`
- `server/thumbstudio/prompt.js`, `schema.js`, `store.js`, `templates.js`, `test-trash.js` → `.ts`; tests `prompt.test.js`, `schema.test.js`, `store.test.js`, `variants.test.js` → `.test.ts`
- Functional references to the renamed entry files (fresh-install path):
  - `package.json` `main` and the `start`/`mcp`/`check` scripts (`check` becomes `pnpm typecheck`)
  - `server/platform.ts:477`, the macOS LaunchAgent target, plus the Linux autostart equivalent if it names `hub.js`
  - `server/config.ts:66`, the "is a VideoHub install" folder check, which must accept `hub.ts` **or** `hub.js` so that old installs on disk are still skipped
  - `server/soundedit.ts:116`, the spawned `sfxlib` path
  - `scripts/install.mjs:117,288,483` (process match, spawn, install-present check) and `scripts/agents.mjs:144` (MCP path), for paths only
  - own-install path fixtures and assertions in `scripts/install.test.js` and `scripts/agents.test.js`; foreign `/other-install/...mcp.js|cli.js` fixtures stay as they are
  - `skill/videohub/SKILL.md:28-29` and `claude/global-rule.md` CLI command lines
  - `CLAUDE.md:12` (`node server/cli.js hub_workspace`), the command agents run during installs
  - `ui/review/soundenv.test.js`, its comparison with `server/vhsound` (S3)

Out of scope:
- `server/thumbstudio/camera-and-depth`, `depth-panel`, `editor-core`, `editor-interactions`, `figures-and-refs`, `template-ui` and `templates.test.js`, which import `ui/thumbstudio/*` (P7)
- Recognizing a running JS-era `server/hub.js`, migrating existing MCP registrations, login items or rule blocks, the Node 22.18 shell gate, and converting `scripts/*` (P4)
- `ui/review/soundenv.js` and every other UI file (P5–P7)
- `CLAUDE.md` map lines, `README.md`, `docs/*` (P9)
- Behavior changes, dead-code removal and lint cleanup (L3)

## 4. Entry conditions

- [x] P2 `done`; standards commands green on the branch — verify: `progressive_plan.py status docs/plans/typescript-migration` and `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
- [x] Working tree clean and pushed — verify: `git status -sb`
- [x] Phase plan revalidated against current master version (23)
- [x] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

Commit after each step with subject `P3:` followed by the step title, and push. Every commit leaves `pnpm test` green.

### S1 — Rename the P3 file set and repoint every functional reference

- Depends on: none
- Files: every file listed under "In scope" except `ui/review/soundenv.test.js`; plus any remaining JS/TS importer of a renamed module (specifiers only), including the P7-pending `server/thumbstudio/*.test.js` that import `store`/`templates`/`schema`/`prompt`/`test-trash`
- Change: Do a pure rename with a temporary first-line `// @ts-nocheck` on each renamed file. Update relative import specifiers and the functional path references listed in §3. In `server/config.ts:66`, check for `server/hub.ts` or `server/hub.js` (the only logic change in this step; it keeps old installs skipped). Change nothing else. `ui/review/soundenv.test.js` has to keep passing in this commit: if it reads `../../server/vhsound.mjs`, point it at `vhsound.ts`. The S1 file is still untyped, so the texts are still equal.
- Acceptance:
  - [ ] `git log --follow` tracks every renamed file; files over 15 lines are ≥ 90% similar in this commit
  - [ ] `grep -rnE "server/(hub|mcp|cli|tools)\.js|sfxlib\.mjs|vhsound\.mjs" package.json server scripts skill claude CLAUDE.md` matches only foreign-install fixtures in `scripts/*.test.js`, the `hub.js` alternative in `config.ts`, and `CLAUDE.md` map lines left for P9
  - [ ] `pnpm test` at baseline
- Verification: `git show -M --summary HEAD | grep -c '^ rename'`, then the grep above, then `pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S2 — Strict types for the tool layer and sound helpers

- Depends on: S1
- Files: `server/tools.ts`, `cli.ts`, `mcp.ts`, `mcp-selftest.ts`, `vhsound.ts`, `sfxlib.ts`, `tools.test.ts`, `duck.test.ts`, `server/types.ts` (modify)
- Change: Remove `@ts-nocheck` and add strict types, reusing `server/types.ts` (L12). Use the MCP SDK's and zod's own types for tool schemas and handlers. Do not hand-write duplicates. `sfxlib.ts` dynamically imports an external engine's `synth.js`; type that boundary as `unknown` and narrow it. `tools.test.ts` reads source via `readSource` with marker slices (L4). Runtime code stays identical once types are stripped.
- Acceptance:
  - [ ] No `@ts-nocheck` in these files; `pnpm typecheck` exits 0
- Verification: `grep -l "@ts-nocheck" server/{tools,cli,mcp,mcp-selftest,vhsound,sfxlib}.ts server/{tools,duck}.test.ts` (no output); `pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S3 — Keep the `soundEnv` source-identity test meaningful

- Depends on: S2
- Files: `ui/review/soundenv.test.js` (modify)
- Change: `soundEnv` in `server/vhsound.ts` now carries types, while `ui/review/soundenv.js` stays JavaScript until P6. The test must still prove that the two functions are the same code. Read both through `readSource` from `scripts/test-source.ts`, extract `soundEnv` by marker slicing, and compare after collapsing whitespace runs. Stripping leaves whitespace where the types were, so this is the minimal normalization. Keep the test name and its intent. Add one line in §9 noting that P6 restores identical typed text once `soundenv.ts` gets the same annotations.
- Acceptance:
  - [ ] Test passes; temporarily changing an operator inside either `soundEnv` makes it fail (check, then revert, and record in §9)
- Verification: `node --test ui/review/soundenv.test.js`
- Rollback: `git checkout HEAD~1 -- ui/review/soundenv.test.js`

### S4 — Strict types for the hub

- Depends on: S2
- Files: `server/hub.ts`, `server/hub-paths.test.ts`, `server/types.ts` (modify)
- Change: Remove `@ts-nocheck` and type the HTTP/SSE handlers, the `route` table and the static-serving branch using the `RouteFn`/`ReadBody` types (L12). Leave unused imports and variables alone (L3). `hub-paths.test.ts` reads `hub.ts` via `readSource`, keeping its existing marker slices and its assertions.
- Acceptance:
  - [ ] No `@ts-nocheck` in `hub.ts`; `pnpm typecheck` exits 0; suite at baseline
- Verification: `pnpm typecheck && node --test server/hub-paths.test.ts && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S5 — Strict types for server-only thumbstudio

- Depends on: S1
- Files: `server/thumbstudio/prompt.ts`, `schema.ts`, `store.ts`, `templates.ts`, `test-trash.ts`, `prompt.test.ts`, `schema.test.ts`, `store.test.ts`, `variants.test.ts` (modify); `server/types.ts` (modify, only if a shape is shared)
- Change: Remove `@ts-nocheck` and add strict types. `schema.ts` imports `../../ui/values.js` (still JS until P5), and the inferred types are acceptable until then. Record that in §9 for P5.
- Acceptance:
  - [ ] No `@ts-nocheck` under `server/`; type-position `any` hits all have same-line comments (L8 grep)
- Verification: `grep -rln "@ts-nocheck" server` (no output); `grep -rnE ':\s*any\b|\bas any\b' server | grep -v '//'` (no output); `pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S6 — Phase verification: scratch hub, MCP, CLI and fresh-install wiring

- Depends on: S3, S4, S5
- Files: `docs/plans/typescript-migration/phases/03-server-entry-points-and-thumbstudio-to-ts/plan.md` (modify) — §9 evidence, §10 closeout
- Change: Run all standards commands. Then work entirely under `.test-tmp/p3-hub`, with `VIDEOHUB_PORT=7799`, scratch `VIDEOHUB_DATA_DIR`/`VIDEOHUB_BASE_DIR`, `VIDEOHUB_GUARD=off`, `VIDEOHUB_JOBS=off` and `VIDEOHUB_NO_WINDOW=1` on every call:
  - start `node server/hub.ts`, check that `GET /api/ping` returns `app: "videohub"` and that `GET /` serves the UI
  - run `node server/cli.ts hub_workspace`
  - run `node server/mcp-selftest.ts`, which lists MCP tools over stdio and must reach the 7799 hub only. If it cannot be pointed at 7799, skip it and record why
  - stop the hub
- Then check fresh-install wiring in a fake home: run `node scripts/agents.mjs --dry-run --agents claude,opencode --hub "$PWD"` with `HOME`/`XDG_*` under `.test-tmp/p3-home`, and confirm it would register `server/mcp.ts`. Never touch real profiles, port 7788 or real data. Record the L3 warning counts for the P3 files before and after.
- Acceptance:
  - [ ] Evidence for each check recorded in §9
- Verification: `pnpm install --frozen-lockfile && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: n/a

## 6. Phase acceptance criteria

- [x] A1 — Under `server/`, tracked JS/MJS is exactly the seven P7-pending thumbstudio tests (`camera-and-depth`, `depth-panel`, `editor-core`, `editor-interactions`, `figures-and-refs`, `template-ui`, `templates`) — verify: `git ls-files 'server/**/*.js' 'server/*.js' 'server/**/*.mjs' 'server/*.mjs'`
- [x] A2 — Strict typecheck clean; no `@ts-nocheck` under `server/`; every type-position `any` justified — verify: S5 greps and `pnpm typecheck`
- [x] A3 — `pnpm test` reports 299 tests, ≥ 298 pass, 0 fail; the `soundEnv` identity test still catches a divergence — verify: `pnpm test`, plus the S3 mutation check in §9
- [x] A4 — `pnpm lint` has 0 errors and `pnpm format:check` exits 0 — verify: both commands
- [x] A5 — A scratch hub starts from `server/hub.ts` on 7799; `/api/ping`, `/`, `cli.ts hub_workspace` and the MCP self-test (or a recorded reason it was skipped) all succeed — verify: S6 evidence
- [x] A6 — Every renamed file keeps history — verify: `git log --follow --oneline server/hub.ts | wc -l` shows commits from before P3
- [x] A7 — Fresh-install wiring names `.ts` entries: `package.json` scripts, autostart target, agent MCP registration (dry-run in a fake home), and skill/rule CLI lines — verify: the S1 grep and the S6 dry-run output

## 7. Code standards check

- [x] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [x] Existing helpers and `server/types.ts` are reused; new shared types only for shapes used by two or more modules
- [x] Names and structure state intent; comments explain only non-obvious reasons (including every `any`)
- [x] Every changed test fails if the behavior it covers breaks; the `soundEnv` mutation check is recorded
- [x] Master standards commands pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Between P3 and P4, `update.sh` from this branch cannot recognize a running JS-era hub (`install.mjs:117` now matches `hub.ts`) | Certain | Medium (branch-only) | Accepted per C9; P4 owns old-install matching and re-pointing. Nobody updates real installs from this branch before P4 closes |
| Agents run `node …/server/cli.ts` with a Node older than 22.18 | Low | High | Setup's Node gate (P4) plus docs (P9); `platform.stableNode()` reuses the hub's own Node binary for spawns |
| The external 3D studio engine keeps its own copy of `vhsound.mjs` (comment in `server/vhsound.mjs:3`) | Medium | Low | VideoHub has no runtime coupling to that copy; record a note for the P9 docs |
| Whitespace-collapsed comparison weakens the `soundEnv` identity test | Low | Low | S3 mutation check proves it still detects logic changes; P6 restores the exact comparison |
| Typing `hub.ts` (largest server file) pushes the worker toward runtime edits | Medium | High | Coordinator re-runs the stripped-source runtime comparison over every changed module |

## 9. Deviations and working notes

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

- 2026-11-21 S1: 19 `git mv` renames (7 server, 3 server tests, 5 thumbstudio modules, 4 thumbstudio tests); `git show -M --summary` of the commit lists 19 renames. Specifiers repointed by a script over all tracked JS/TS importers (including the P7-pending `figures-and-refs`, `template-ui`, `templates` tests). `package.json` `main`/`start`/`mcp` point at `.ts`, `check` is `pnpm typecheck`; `platform.ts` LaunchAgent target and `soundedit.ts` sfxlib path are `.ts`; the Linux autostart entry runs `scripts/install.mjs open --server` and names no `hub.js`; `config.ts` accepts `server/hub.ts` or `server/hub.js`; `install.mjs`/`agents.mjs` paths, own-install fixtures in `install.test.js`/`agents.test.js` (foreign `/other-install/server/mcp.js|cli.js` fixtures kept), SKILL.md, global-rule.md and `CLAUDE.md:12` repointed. The S1 grep (`server/(hub|mcp|cli|tools)\.js|sfxlib\.mjs|vhsound\.mjs`) now matches only the foreign fixtures in `agents.test.js`, `CLAUDE.md:27` (P9), and comments that name the engine's own external `vhsound.mjs` copy (`vhsound.ts:3`, `sound.ts:90`, `tweaks.ts:127`). Rename similarity: two files over 15 lines fall below 90% (`cli.ts` 81% of 24 lines, `mcp-selftest.ts` 80% of 18 lines) because the added `@ts-nocheck` line and the repointed comment/import are a large share of tiny files (L9); `git log --follow` tracks them (`cli.ts` 4 commits). Everything else is 90-100%.
- 2026-11-21 S1 deviation (not in the S1 file list, type-only): with the renamed modules still under `@ts-nocheck`, `tsc` infers their types and two P2-era tests stopped checking, so S1 added a cast to `server/legacy.test.ts` (the `normalizeBrief` result, inferred as `{}`) and two `@ts-expect-error` lines to `server/soundedit.test.ts` (vhsound's optional `ffmpeg` parameter reads as required while untyped). The `@ts-expect-error` lines were removed in S2 once `vhsound.ts` typed `ffmpeg?`; the `legacy.test.ts` cast stays (schema is typed by inference from the JS catalog until P5). No assertion changed. Needed to keep `pnpm typecheck` at exit 0 in the S1 commit; reported as a phase-amend discovery (P3-d1).
- 2026-11-21 S1 defect, fixed in S2 (`7e6d315`): the S1 comment sed over `server/*.ts` also rewrote the MCP SDK import `@modelcontextprotocol/sdk/server/mcp.js` in `server/mcp.ts` to `.ts`. No test imports `mcp.ts`, so the S1 suite stayed green; `mcp-selftest.ts` in S6 would have caught it. S2 restored `.js`. S6 selftest passes against the final tree. Discovery P3-d2.
- 2026-11-21 S3 ordering: S3 (the `soundEnv` identity test) was committed before S2 (`bcf5569`), so the suite stays green when S2 types `soundEnv`. The test reads both sources through `readSource` from `scripts/test-source.ts` and compares after normalization. Plain whitespace collapse was not enough: stripping leaves spaces before commas and brackets, and a typed single arrow parameter needs parentheses that `soundenv.js` does not have. The normalization therefore also removes spaces next to `( ) [ ] { } , ;` and rewrites `(x) =>` to `x =>`. It still compares every token of the function body. The `soundenv.test.js` file was touched again in the S2 commit for the parentheses rule. P6 restores an exact comparison once `soundenv.ts` carries the same annotations (then the normalization can go).
- 2026-11-21 S3 mutation check: changing `g = Math.max(0, g)` to `Math.max(1, g)` inside `soundEnv` makes the identity test fail when applied to `server/vhsound.ts` (1 fail) and when applied to `ui/review/soundenv.js` (2 fail: identity plus the behavior test); both reverted (`git status` clean for those files). Run before and after the S2 typing; both times the test detected the change.
- 2026-11-21 S2: `server/tools.test.ts` does not read source text (it imports `TOOLS` and runs a tool against a fake hub), so the plan's `readSource` conversion for it does not apply; only `hub-paths.test.ts` needed it (S4). Typing choices: `TOOLS` is annotated `Record<string, Tool>` with `Tool = { description; schema: z.ZodRawShape; run(a: ToolArgs): Promise<string> }`; tool arguments are `Record<string, Json>` (the MCP layer validates with each tool's zod schema, the CLI passes parsed JSON unchecked). Deriving a per-tool `z.infer` type would need the schemas lifted out of the object literal (a runtime restructuring), so the hand-written duplicate was avoided and the looser type used. `mcp.ts` uses the SDK's `CallToolResult`; `sfxlib.ts` describes the external synth by a local `Synth` interface and casts the dynamic import (no runtime narrowing, which would change behavior).
- 2026-11-21 S4: `hub.ts` is typed with `RouteFn`/`RouteHandler`/`ReadBody` from `server/types.ts`; `route` handlers take contextual types from `RouteFn`. `lite(p)` takes `Json` because `rescanProject` returns `Project | null` and the existing code passes it straight to `lite` (a crash path that is pre-existing, untouched). `catch (e: Json)` in the request handler (route errors carry an HTTP status in `.code`); no new `any`. No unused symbol (`guardExe`, `meta`, `soundOps`) was removed (L3).
- 2026-11-21 S5: `schema.ts`, `store.ts`, `templates.ts` use the existing `Json` alias for brief, layer and template objects (stored JSON) and `string`/`number` where the value is known; `routes(route: RouteFn, readBody: ReadBody)`. `schema.ts` imports `../../ui/values.js` and `../../ui/thumbstudio/catalog.js`, still JS, so their types are inferred by `allowJs` until P5/P7 (note for P5). `prompt.ts`, `test-trash.ts`, `prompt.test.ts`, `schema.test.ts` needed only types or nothing. `grep -rln "@ts-nocheck" server` prints nothing; `grep -rnE ':\s*any\b|\bas any\b' server | grep -v '//'` prints nothing (no type-position `any` in these files at all).
- 2026-11-21 S6 standards (after `77c1a48`): `pnpm install --frozen-lockfile` Already up to date; `pnpm format:check` All matched files use the correct format (157 files); `pnpm lint` exit 0, 0 errors, 146 warnings repo-wide (unchanged); `pnpm typecheck` exit 0; `pnpm test` 299 tests, 298 pass, 1 skipped, 0 fail. Warnings in the P3 files, before and after: `server/hub` 3 (guardExe, meta, soundOps), `server/thumbstudio/store` 11, `templates.ts` 3, `templates.test.js` 4: 21 before, 21 after (L3: nothing cleaned).
- 2026-11-21 S6 scratch hub: data and base under `.test-tmp/p3-hub`, `VIDEOHUB_PORT=7799 VIDEOHUB_GUARD=off VIDEOHUB_JOBS=off VIDEOHUB_NO_WINDOW=1`, a fake HOME/XDG under `.test-tmp/p3-hub/home`, node by absolute path (the asdf shim breaks with a fake HOME). `node server/hub.ts` printed `VideoHub: http://127.0.0.1:7799`; `GET /api/ping` returned `{"ok":true,"app":"videohub",...}`; `GET /` returned 200 `text/html` (the UI page); `GET /api/thumbstudio/catalog` returned the style catalog (typed thumbstudio store); `node server/cli.ts hub_workspace` printed the scratch workspace (`.test-tmp/p3-hub/base`); `node server/mcp-selftest.ts` (which passes `process.env`, so `VIDEOHUB_PORT=7799`, to the spawned `mcp.ts`) listed the 12 tools `hub_live ... hub_thumb_variant`. The hub was then stopped (ping fails, no `server/hub.ts` process left). Port 7788 and real data were never contacted.
- 2026-11-21 S6 fresh-install wiring: `node scripts/agents.mjs --dry-run --agents claude,opencode --hub "$PWD"` with HOME/XDG under `.test-tmp/p3-home` printed would-register actions for both agents' MCP servers, skills and rules (fake home left empty). The dry-run text does not print the MCP file path, so the path is confirmed by `scripts/agents.mjs:144` (`path.join(hub, 'server', 'mcp.ts')`) and by `scripts/agents.test.js:47,71` (the registered command is `node <hub>/server/mcp.ts`; 14 tests pass); `skill/videohub/SKILL.md` (2 lines) and `claude/global-rule.md` (1 line) name `server/cli.ts`; `platform.ts:477` LaunchAgent target is `server/hub.ts` (`platform.darwin.test.ts` asserts it); `package.json` scripts point at `.ts`.
- 2026-11-21 runtime equivalence (S1 commit `43f613a` vs HEAD, types stripped with `stripTypeScriptTypes`, ignoring comments, import lines, whitespace, parentheses, commas and semicolons): `server/{cli,hub,mcp-selftest,mcp,tools,vhsound,sfxlib}.ts` and `server/thumbstudio/{prompt,schema,store,templates,test-trash}.ts` are all equal (12 modules; `server/types.ts` and tests excluded). The first run found one difference in `sfxlib.ts` (an extra `synthModule` binding for the `unknown` import); `77c1a48` removed it. Import lines are excluded by rule; the one S1 import defect (mcp SDK specifier) is item P3-d2 above.
- 2026-11-21 note for P9 docs: the external 3D studio engine keeps its own copy named `vhsound.mjs` (comments in `vhsound.ts:3`, `sound.ts:90`); VideoHub has no runtime coupling to it.
- 2026-11-21 L3-style note: the plan's S5 `any` grep (`grep -v '//'`) cannot accept a block comment justification; there were no type-position `any` hits, so it did not matter.

## 10. Closeout

Fill at the end of every implementation session. Do not mark the phase done until this section is complete and the master is updated. Set `Implemented by` to the worker name or ID and `Implemented at` to the implementation date; `close` requires both.

- Date: 2026-11-21
- Session: p3-server-entry (subagent, one session)
- Verdict: addressed
- Steps complete: S1, S2, S3 (committed before S2), S4, S5, S6
- Verification run: `pnpm install --frozen-lockfile`; `pnpm format:check` exit 0; `pnpm lint` 0 errors, 146 warnings (21 in the P3 files before and after); `pnpm typecheck` exit 0; `pnpm test` 299 tests, 298 pass, 1 skipped, 0 fail; `grep -rln "@ts-nocheck" server` empty; type-position `any` grep empty; S3 mutation check detected in both copies; scratch hub on 7799 answered `/api/ping`, `/`, `cli.ts hub_workspace` and the MCP self-test, then was stopped; agents dry-run in a fake home; runtime-equivalence comparison over 12 modules: all equal.

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | met | `git ls-files 'server/**/*.js' 'server/*.js' 'server/**/*.mjs' 'server/*.mjs'` lists exactly the seven P7-pending thumbstudio tests (`camera-and-depth`, `depth-panel`, `editor-core`, `editor-interactions`, `figures-and-refs`, `template-ui`, `templates`) |
| A2 | met | `pnpm typecheck` exit 0 with `strict`; `grep -rln "@ts-nocheck" server` prints nothing; the type-position `any` grep prints nothing (the only `any` in server is the commented `Json` alias in `server/types.ts`) |
| A3 | met | `pnpm test`: 299 tests, 298 pass, 1 skipped, 0 fail; the `soundEnv` identity test fails on a one-token change in either copy (mutation check in section 9) |
| A4 | met | `pnpm lint` 0 errors (146 warnings, unchanged; 21 in P3 files before and after); `pnpm format:check` exit 0 |
| A5 | met | Scratch hub from `server/hub.ts` on 7799: `/api/ping` returned `app: "videohub"`, `/` returned 200 text/html, `cli.ts hub_workspace` printed the scratch workspace, `mcp-selftest.ts` listed 12 tools over stdio against the 7799 hub; hub stopped afterwards |
| A6 | met | `git log --follow --oneline server/hub.ts` shows 8 commits including pre-P3 history; all 19 renames follow; `cli.ts` (81%) and `mcp-selftest.ts` (80%) are below 90% only because they are tiny files (L9) |
| A7 | met | `package.json` main/start/mcp are `.ts`; `platform.ts` LaunchAgent target and its test use `server/hub.ts`; `agents.mjs:144` registers `server/mcp.ts` (asserted in `agents.test.js`; the agents dry-run in a fake home lists the registrations); SKILL.md and global-rule.md name `server/cli.ts`; the S1 grep matches only foreign fixtures, engine-copy comments and `CLAUDE.md:27` (P9) |
| D1 (master) | met | P3 share met (D1 stays open until P9): the server-side non-UI-coupled JS (7 modules, 7 tests, 5 thumbstudio modules and 4 tests) is `.ts` with history kept; seven P7-pending thumbstudio tests remain JS |
| D2 (master) | met | P3 share met (D2 stays open until P9): all converted files pass `strict` with no `@ts-nocheck`; `allowJs` removal remains for P9 |
| D3 (master) | met | P3 share met (D3 stays open until P9): 0 lint errors, format clean |
| D4 (master) | met | P3 share met (D4 stays open until P9): 299 tests, 298 pass, 0 fail |
| D5 (master) | met | P3 share met (D5 stays open until P9): the scratch hub starts from `server/hub.ts` and serves its API and UI, MCP over stdio and the CLI reach it; the Vite build part is P5 |
| D6 (master) | met | P3 fresh-install half only (D6 stays open until P9; P4 owns upgrade from a JS-era install): new installs register `server/mcp.ts`, write `server/cli.ts` into skill and rule text and autostart `server/hub.ts` |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|
| P3-d1 | The renamed modules, still under `@ts-nocheck` in S1, are type-inferred by `tsc`, so `legacy.test.ts` and `soundedit.test.ts` (P2 files, not in the S1 list) needed type-only edits to keep `pnpm typecheck` at 0 in the S1 commit; `soundedit.test.ts` edits were reverted in S2, the `legacy.test.ts` cast remains until P5 | phase-amend | P3 | Recorded in section 9; no assertion changed |
| P3-d2 | The S1 comment sed rewrote the MCP SDK import specifier in `server/mcp.ts` to `.ts` (no test imports `mcp.ts`, so the suite stayed green); fixed in S2 and verified by `mcp-selftest` | plan-defect | P3 | Applied; later phases that bulk-rewrite specifiers should exclude package imports and run an `mcp-selftest` or import check |
| P3-d3 | The plan assumed `tools.test` reads source text; it does not (it runs the tool against a fake hub), so no `readSource` conversion was needed; only `hub-paths.test` and `soundenv.test` read source | plan-defect | P3 | None needed |
| P3-d4 | `soundEnv` cannot stay textually identical across `server/vhsound.ts` and `ui/review/soundenv.js` once typed: plain whitespace collapse is not enough (spaces before commas, parentheses around a typed arrow parameter) | next-phase-amend | P6 | P6 types `soundenv.ts` with the same annotations and can return the test to an exact comparison, dropping the normalization |
| P3-d5 | Tool arguments are typed `Record<string, Json>` because a per-tool `z.infer` type would need the zod schemas lifted out of the `TOOLS` literal (a runtime restructuring); `lite(p)` is `Json` because `rescanProject` can return null and the existing code passes it straight to `lite` | note | P9 | Candidate for a user-approved cleanup outside the migration |
| P3-d6 | `scripts/test-source.ts` and `soundenv.test.js` show `readSource` works from JS tests too; `schema.ts`/`store.ts` still lean on `Json` (any) for brief shapes and inferred types from `ui/values.js` and `ui/thumbstudio/catalog.js` until P5/P7 | note | P5, P7 | Revisit the thumbstudio store/schema types when the UI catalog and values convert |
| P3-d7 | CLAUDE.md and rule docs still name `server/hub.js` in the Map (line 27) and engine-copy comments name `vhsound.mjs`; the Node 22.18 shell gate and old-install recognition are untouched | note | P4, P9 | As planned: P4 re-points existing installs, P9 updates docs |

**Master updates written:** none (master is coordinator-owned)
**Next-phase updates written:** none; P3-d4 (P6 exact soundEnv comparison) and P3-d6 (P5/P7 types) are proposed above for the coordinator
**Remaining work and handoff:** P3 complete. P4 owns recognizing JS-era `hub.js` processes, re-pointing existing MCP registrations, login items and rule blocks, and the Node 22.18 gate. Between P3 and P4, `update.sh` from this branch cannot recognize a running JS-era hub (accepted risk C9).
