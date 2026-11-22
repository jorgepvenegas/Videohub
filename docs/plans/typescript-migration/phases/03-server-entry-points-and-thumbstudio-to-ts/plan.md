# Phase P3 — Server entry points and thumbstudio to TS

- Plan ID: `typescript-migration`
- Phase: P3
- Plan version: 1
- Validated against master version: 23
- Status: ready
- Approved by: Jorge Venegas
- Approved at: 2026-11-21
- Commit: pending
- Implementation mode: subagent
- Implemented by: pending
- Implemented at: pending
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

- [ ] P2 `done`; standards commands green on the branch — verify: `progressive_plan.py status docs/plans/typescript-migration` and `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
- [ ] Working tree clean and pushed — verify: `git status -sb`
- [ ] Phase plan revalidated against current master version (23)
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

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

- [ ] A1 — Under `server/`, tracked JS/MJS is exactly the seven P7-pending thumbstudio tests (`camera-and-depth`, `depth-panel`, `editor-core`, `editor-interactions`, `figures-and-refs`, `template-ui`, `templates`) — verify: `git ls-files 'server/**/*.js' 'server/*.js' 'server/**/*.mjs' 'server/*.mjs'`
- [ ] A2 — Strict typecheck clean; no `@ts-nocheck` under `server/`; every type-position `any` justified — verify: S5 greps and `pnpm typecheck`
- [ ] A3 — `pnpm test` reports 299 tests, ≥ 298 pass, 0 fail; the `soundEnv` identity test still catches a divergence — verify: `pnpm test`, plus the S3 mutation check in §9
- [ ] A4 — `pnpm lint` has 0 errors and `pnpm format:check` exits 0 — verify: both commands
- [ ] A5 — A scratch hub starts from `server/hub.ts` on 7799; `/api/ping`, `/`, `cli.ts hub_workspace` and the MCP self-test (or a recorded reason it was skipped) all succeed — verify: S6 evidence
- [ ] A6 — Every renamed file keeps history — verify: `git log --follow --oneline server/hub.ts | wc -l` shows commits from before P3
- [ ] A7 — Fresh-install wiring names `.ts` entries: `package.json` scripts, autostart target, agent MCP registration (dry-run in a fake home), and skill/rule CLI lines — verify: the S1 grep and the S6 dry-run output

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers and `server/types.ts` are reused; new shared types only for shapes used by two or more modules
- [ ] Names and structure state intent; comments explain only non-obvious reasons (including every `any`)
- [ ] Every changed test fails if the behavior it covers breaks; the `soundEnv` mutation check is recorded
- [ ] Master standards commands pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test`

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
