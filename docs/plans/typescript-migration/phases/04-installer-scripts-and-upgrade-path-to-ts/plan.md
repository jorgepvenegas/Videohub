# Phase P4 — Installer, scripts and upgrade path to TS

- Plan ID: `typescript-migration`
- Phase: P4
- Plan version: 1
- Validated against master version: 30
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
- Depends on: P3
- Written: 2026-11-21
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Convert `scripts/` to strict TypeScript and make the lifecycle safe for real users.

- **Node version gate:** each shell entry point checks for Node ≥ 22.18 before it runs any `.ts`, and tells older-Node users plainly what to do.
- **Fresh setup:** registers, launches and autostarts only `.ts` entries.
- **Upgrade:** `update.sh` brings a JavaScript-era install (any build up to `main` @ 70cf504) fully onto the TypeScript build:
  - it recognizes and stops that install's running `server/hub.js`
  - it moves now-obsolete `.js`/`.mjs` code files into the update backup instead of leaving them beside the new `.ts`
  - it re-points the install's own agent MCP registrations from `server/mcp.js` to `server/mcp.ts`
  - it regenerates the install's own launchers (Desktop shortcut, Linux app entry, autostart or LaunchAgent) so they name `scripts/install.ts` / `server/hub.ts`
- **Uninstall:** still removes only owned integrations, including old-path ones.

The upgrade logic is the only intended behavior change in this plan (C9).

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Removes all `.js`/`.mjs` from `scripts/` with history kept | A1 |
| D2 | `scripts/*.ts` strict-clean | A2 |
| D3 | Lint 0 errors, format clean | A4 |
| D4 | Suite at or above baseline, plus new upgrade tests | A3 |
| D6 | Fresh setup and update from a JS-era install, proven by unit tests and one end-to-end run in a fake home | A5, A6, A7 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L3 | 12 lint rules at `warn` | No warning cleanup in converted files; S7 records counts before and after |
| L4 | Source-reading tests must slice between stable markers | Any `scripts/*.test.ts` that reads source uses `readSource` with marker slices |
| L6 | Type stripping verified only on Node 24.16 | S1 runs the minimum, Node 22.18.0, from an official tarball under `.test-tmp`: `.ts` entry, mixed imports, stderr warnings |
| L8 | `any` grep must target type positions only | Checks use `grep -rnE ':\s*any\b\|\bas any\b' scripts` and review each hit |
| L9 | Rename similarity bar applies only to files over 15 lines | Same rule in S2 |
| L14 | A bulk specifier rewrite hit a package import | S2 rewrites only relative specifiers (`./`, `../`) and runs the MCP self-test and `scripts/agents` tests afterwards |
| L19 | Old-install recognition and Node gate were left for P4; `CLAUDE.md:27` map line for P9 | S1 (gate) and S4–S5 (old installs) deliver them; the map line stays for P9 |

## 3. Scope

In scope:
- Rename via `git mv`: `scripts/agents.mjs`, `init-config.mjs`, `install.mjs`, `make-upload.mjs`, `test.mjs`, `upload-rules.mjs` → `.ts`; `scripts/agents.test.js`, `distribution-safety.test.js`, `init-config.test.js`, `install.test.js`, `upload-rules.test.js` → `.test.ts`
- `setup.sh`, `update.sh`, `uninstall.sh`, `open.sh`: Node ≥ 22.18 gate, then `exec node scripts/install.ts …`
- `package.json` `test` script; `server/platform.ts:474` (Linux `.desktop` Exec target); the `scripts/install` launcher template (`VideoHub.command`/`.desktop` text) naming `install.ts`
- Comments naming `scripts/*.mjs` in `server/*.ts` (`config.ts:1`, `hub.ts:714`, `encoders.ts:2`) and `server/platform.linux.test.ts:436`
- `CLAUDE.md` install-procedure lines 9–11 and the make-upload mention in line 43: command paths only
- Upgrade logic in `scripts/install.ts`: old-hub process match, install-present check, stale code to backup, owned launcher regeneration. Plus `server/platform.ts` only if launcher regeneration needs a small exported helper
- Legacy ownership in `scripts/agents.ts`: an MCP entry naming *this* install's `server/mcp.js` counts as owned
- New tests for all upgrade behavior in `scripts/install.test.ts` and `scripts/agents.test.ts`

Out of scope:
- Vite, the UI build and adding build steps to setup/update (P5)
- `CLAUDE.md` map lines, `README.md`, `docs/*` and `docs/MIGRATING.md` (P9)
- Changing what launchers do, or their names and locations; only the embedded script path changes
- Migrating installs older than the JS layout at `main` @ 70cf504
- Real agent CLIs, real HOME, real launchd/systemd state, port 7788

## 4. Entry conditions

- [ ] P3 `done`; standards commands green — verify: `progressive_plan.py status docs/plans/typescript-migration`, then `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
- [ ] Working tree clean and pushed — verify: `git status -sb`
- [ ] Phase plan revalidated against current master version (30)
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

Commit after each step with subject `P4:` followed by the step title, and push. Every commit leaves `pnpm test` green.

**Safety for every step:**
- Any command that sets up, updates, uninstalls, opens or registers runs with `HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `TMPDIR`, `VIDEOHUB_DATA_DIR` and `VIDEOHUB_BASE_DIR` under `.test-tmp/p4-*`, `VIDEOHUB_PORT=7799` and `VIDEOHUB_NO_WINDOW=1`.
- It also uses a `PATH` limited to a `.test-tmp/p4-bin` folder that symlinks only `node`, `pnpm`, `git`, `ffmpeg` and `ffprobe`, so no `claude`/`opencode` CLI can be reached.
- Never pass `--startup yes` outside injected-platform unit tests: macOS autostart talks to the real `launchctl` user domain.
- Abort the step if any of these is not true.

### S1 — Node 22.18 gate in the shell entry points, verified on Node 22.18

- Depends on: none
- Files: `setup.sh`, `update.sh`, `uninstall.sh`, `open.sh` (modify)
- Change: Before `exec node …`, each script reads `node -p process.versions.node` and refuses below 22.18 with the existing message style ("Node.js 22.18 or newer is required…", with the macOS/Linux variants `setup.sh` already has). The four scripts still call `scripts/install.mjs` in this commit. Then verify L6: download the official Node v22.18.0 darwin tarball for this machine's architecture into `.test-tmp/node-22.18`, verify its SHASUMS256 entry, and check three things. It must run `node scripts/test-source.ts`-style `.ts` code. A `.js` → `.ts` import must work. Any stderr warning must be recorded. Also confirm `setup.sh --dry-run` with a fake Node 22.17 (a stub script in a temp PATH that prints 22.17.0) refuses with the message.
- Acceptance:
  - [ ] Gate refuses 22.17 and accepts 22.18 and 24.x; Node 22.18 evidence in §9
- Verification: run `PATH="$STUB_DIR:$PATH" bash setup.sh --dry-run`, then `.test-tmp/node-22.18/bin/node -e "…"` probes — both recorded in §9
- Rollback: `git checkout HEAD~1 -- setup.sh update.sh uninstall.sh open.sh`

### S2 — Rename `scripts/` and repoint every reference

- Depends on: S1
- Files: the 11 files above (rename, with a temporary first-line `// @ts-nocheck`); `setup.sh`, `update.sh`, `uninstall.sh`, `open.sh`, `package.json`, `server/platform.ts:474`, `server/platform.linux.test.ts:436`, comment paths in `server/config.ts`, `hub.ts` and `encoders.ts`, and the `CLAUDE.md` command paths named in §3; relative importers in `server/**` and `ui/**` tests (specifiers only, L14)
- Change: Do a pure rename and reference update. The launcher template text in `install.ts` names `install.ts`. `scripts/test.ts` keeps collecting both `.test.js` and `.test.ts`. No logic changes.
- Acceptance:
  - [ ] `grep -rnE "scripts/[a-z-]+\.mjs" setup.sh update.sh uninstall.sh open.sh package.json server scripts skill claude CLAUDE.md` prints nothing except `CLAUDE.md` map lines left for P9
  - [ ] `git log --follow` tracks all 11 renames; `pnpm test` at baseline; `bash setup.sh --dry-run` (fake env) exits 0
- Verification: the grep; `pnpm typecheck && pnpm test 2>&1 | tail -8`; the dry run recorded in §9
- Rollback: `git revert HEAD`

### S3 — Strict types for `scripts/`

- Depends on: S2
- Files: the 11 renamed `scripts/*.ts` files (modify); `server/types.ts` (modify only if a shape is shared with server code)
- Change: Remove `@ts-nocheck` and add strict types with no runtime change. Type the injected `platform` with the interface P2 exported from `server/platform.ts`. Keep `install.ts` free of npm package imports: it must still run before `pnpm install` (C1).
- Acceptance:
  - [ ] No `@ts-nocheck` under `scripts/`; strict typecheck clean; `install.ts`, `agents.ts`, `init-config.ts` import only `node:*` and relative modules
- Verification: `grep -rln "@ts-nocheck" scripts` (no output); `grep -nE "^import .* from '[^.n]" scripts/{install,agents,init-config}.ts` (no output); `pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S4 — Upgrade a JS-era install: stop, replace, clean, relaunch

- Depends on: S3
- Files: `scripts/install.ts`, `scripts/install.test.ts` (modify); `server/platform.ts` (modify only if needed for launcher regeneration)
- Change: Four behaviors, each with its own test that fails without it:
  - **(a) Old process match:** the running-hub match accepts this install's `server/hub.ts` or `server/hub.js`.
  - **(b) Install-present check:** the update-target check accepts `server/hub.ts` or `server/hub.js`.
  - **(c) Stale code to backup:** after the new code is copied, any target `.js`/`.mjs` file whose same-path `.ts` exists in the new source moves into this update's `data/update-backup/ (this update's timestamped folder)`. Nothing else is moved or deleted (no hard deletes, CLAUDE.md), and dry-run reports it.
  - **(d) Launcher refresh:** if this install's owned launchers exist (Desktop shortcut and Linux app entry, both detected by the existing `# VideoHub install:` / `X-VideoHub-Install=` ownership markers), update rewrites them with the current template. If autostart is enabled for this install, it is re-applied, so the LaunchAgent/autostart entry names `.ts`. Launchers that are absent or belong to another install are left alone.
- Acceptance:
  - [ ] New tests cover (a)–(d), each including a negative case (another install's process or launcher untouched; a stale file without a `.ts` sibling stays)
- Verification: `node --test scripts/install.test.ts`; `pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S5 — Agent integrations recognize the install's old MCP path

- Depends on: S3
- Files: `scripts/agents.ts`, `scripts/agents.test.ts` (modify)
- Change: Ownership of an MCP entry, in both the config-file and CLI paths, accepts this install's `server/mcp.ts` **or** `server/mcp.js`. `setup`/`refresh` replace an owned old entry with `mcp.ts`, and `uninstall` removes either. Entries naming another install's paths stay untouched. Rule blocks are already owned by install path (`ownedText`); add a test proving that a block containing `…/server/cli.js` is refreshed to `cli.ts`.
- Acceptance:
  - [ ] Tests for both agents: an own `mcp.js` entry is refreshed to `mcp.ts`; another install's `mcp.js` is unchanged; uninstall removes an own `mcp.js` entry; an own rule block naming `cli.js` is refreshed
- Verification: `node --test scripts/agents.test.ts`; `pnpm test 2>&1 | tail -8`
- Rollback: `git revert HEAD`

### S6 — End-to-end: JS-era install → update → open, in a fake home

- Depends on: S4, S5
- Files: `docs/plans/typescript-migration/phases/04-installer-scripts-and-upgrade-path-to-ts/plan.md` (modify) — §9 evidence only
- Change: Under the safety rules above:
  1. Export commit `70cf504` with `git archive` into `.test-tmp/p4-e2e/old`. Run its `setup.sh` with `--yes --agents opencode --shortcut yes --startup no --example no --global-rule yes --watch-found no --gpu-encoder no --workspace .test-tmp/p4-e2e/workspace`.
  2. Before going further, confirm that its config port is 7799 (set `VIDEOHUB_PORT` or edit the scratch config). Start the old hub with `bash open.sh --server` and confirm `/api/ping` on 7799.
  3. From the branch, run `bash update.sh --target .test-tmp/p4-e2e/old`.
  4. Expect all of the following:
     - the old hub process is stopped
     - `server/hub.ts` exists and `server/hub.js` sits in `data/update-backup/*`
     - the workspace and `data/` are preserved
     - the fake-home OpenCode config names `server/mcp.ts`
     - the fake-Desktop shortcut names `scripts/install.ts`
     - `bash open.sh --server` from the target serves `/api/ping` on 7799
  5. Then run `bash uninstall.sh --dry-run` from the target and confirm it lists only owned items.
  6. Stop everything.
  7. Record each command and result in §9.
- If any safety precondition cannot be met, for example the old setup insists on a real agent CLI, stop and report instead of loosening the safety rules.
- Acceptance:
  - [ ] Every expectation in the change list above has recorded evidence
- Verification: the recorded commands; final `lsof -i :7799` shows nothing listening
- Rollback: `rm -rf .test-tmp/p4-e2e .test-tmp/p4-*` (scratch only)

### S7 — Phase verification and closeout

- Depends on: S6
- Files: the P4 phase plan (modify) — §7, §9 and §10
- Change: Run all standards commands, the runtime-equivalence comparison for S3 (types stripped, S2 vs S3 commits), and the warning counts. Fill in the closeout.
- Acceptance:
  - [ ] Standards green; equivalence result recorded
- Verification: `pnpm install --frozen-lockfile && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test 2>&1 | tail -8`
- Rollback: n/a

## 6. Phase acceptance criteria

- [ ] A1 — `git ls-files 'scripts/*.js' 'scripts/*.mjs'` prints nothing; renames keep history — verify: the command and `git log --follow --oneline scripts/install.ts | wc -l`
- [ ] A2 — Strict typecheck clean with no `@ts-nocheck` in `scripts/`; S3 is runtime-identical to S2 — verify: `pnpm typecheck`, the S3 grep, and the S7 comparison
- [ ] A3 — `pnpm test` has 0 failures, and passing tests are ≥ 298 plus the new upgrade tests — verify: `pnpm test`
- [ ] A4 — `pnpm lint` has 0 errors and `pnpm format:check` exits 0 — verify: both commands
- [ ] A5 — The shell gate refuses Node < 22.18 with a clear message, and Node 22.18.0 runs the `.ts` entry points — verify: S1 evidence
- [ ] A6 — Unit tests prove the upgrade behaviors (old hub match, install check, stale code to backup, owned launcher refresh, legacy MCP ownership, rule refresh) with negative cases — verify: `node --test scripts/install.test.ts scripts/agents.test.ts`
- [ ] A7 — End-to-end: a JS-era install is stopped, updated, re-pointed and reopened on 7799 in a fake home, with data preserved — verify: S6 evidence

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Upgrade logic reuses the existing ownership markers, backup folder and launcher templates; no parallel mechanism
- [ ] Names and structure state intent; comments explain only non-obvious reasons
- [ ] Every new test fails if the behavior it covers breaks (each upgrade test checked against a reverted implementation, recorded in §9)
- [ ] Master standards commands pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm install --frozen-lockfile && pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| A test or e2e step touches the real profile, launchd, or the real hub on 7788 | Low | High | Safety rules above; restricted PATH; `--startup no`; abort on any unmet precondition |
| Moving stale files misses one or moves user content | Low | High | Rule limited to `.js`/`.mjs` with a same-path `.ts` in the new source; moved into the backup, never deleted; negative tests |
| Node 22.18 cannot be downloaded (network) | Low | Medium | Record as residual risk (R2), keep the gate; ask the coordinator |
| The old (70cf504) setup needs network for `pnpm install` | Medium | Low | Network is available in this environment; on failure, record and run S6 against a copy that reuses this repo's `node_modules` via `pnpm install --offline` |
| Regenerating the macOS LaunchAgent during update touches real launchd | Medium | High | e2e uses `--startup no`; autostart re-apply only in injected-platform unit tests |
| `install.ts` needs a package (breaks pre-install run) | Low | High | S3 import check |

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
| D6 (master) | pending | |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|

**Master updates written:** none yet
**Next-phase updates written:** none yet
**Remaining work and handoff:** none yet
