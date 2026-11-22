# Phase P4 — Installer, scripts and upgrade path to TS

- Plan ID: `typescript-migration`
- Phase: P4
- Plan version: 1
- Validated against master version: 30
- Status: in_progress
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
- 2026-11-21 S1: gate added to the four scripts (bash `IFS=. read` on `node -p process.versions.node`; message "Node.js 22.18 or newer is required (found X)..."). Setup's missing-node messages now say 22.18.
- S1 evidence: `PATH=.test-tmp/stub:$PATH bash setup.sh --dry-run` (stub prints 22.17.0) and `bash update.sh` -> message, rc=1. Node 24.16 (`bash setup.sh --help`) and Node 22.18.0 (`PATH=.test-tmp/g:/usr/bin:/bin bash setup.sh --help`) -> usage, accepted.
- S1 Node 22.18.0 (official darwin-arm64 tarball in `.test-tmp/node-22.18`, `shasum -c` against SHASUMS256.txt: OK): `node c.ts` (TS syntax, imports `./a.ts` and a `.js`) runs; `node b.js` importing `./a.ts` runs; `node --test d.test.ts` passes 1/1; `import('./server/types.ts')` and `scripts/test-source.ts` load. stderr of all probes: 0 bytes, no ExperimentalWarning (answers the master unknown). Residual: the whole suite was not run on 22.18.
- INCIDENT S1: a probe `node -e "import('./server/hub.ts')"` (my mistake, no scratch env) started a hub on 7788 and created the default `data/` in the repo checkout plus empty `~/Documents/VideoHub/{films,thumbnail-templates}`. Killed within ~2 min (port free afterwards, no other process left). Removed `data/` and the empty dirs (rmdir only); no pre-existing content touched (all created 22:12:53, the probe time). No later probe imports an entry module.
- S1 `pnpm test`: 299 tests, 298 pass, 1 skipped, 0 fail.
- S2: `git mv` of 11 files, each with first-line `// @ts-nocheck`; relative specifiers only (`./x.mjs` -> `./x.ts`); `package.json` test -> `scripts/test.ts`; `server/platform.ts` Exec/launcher target (the plan said line 474; the text is `'scripts', 'install.mjs'`) -> `install.ts`. `CLAUDE.md:29` map line left for P9. `git diff -M --summary`: all 11 renames detected (95-99%).
- S2 verify: `grep -rnE "scripts/[a-z-]+\.mjs" setup.sh update.sh uninstall.sh open.sh package.json server scripts skill claude CLAUDE.md` -> only CLAUDE.md:29. `pnpm format:check` clean, `pnpm lint` 0 errors, `pnpm typecheck` ok, `pnpm test` 299/298 pass/1 skipped/0 fail. `node server/mcp-selftest.ts` in scratch env (port 7799) lists the 12 hub tools; `setup.sh --dry-run` in a fake env on a scratch copy of the tree (`.test-tmp/p4-dry/inst`, workspace outside the program folder) exit 0.
- Scratch env note: `.test-tmp/p4env.sh <name>` sets HOME/XDG/TMPDIR/data/base/port 7799 under `.test-tmp/p4-<name>` and `PATH=.test-tmp/p4-bin:/usr/bin:/bin`; p4-bin symlinks the real node and pnpm binaries (the asdf shims need asdf), git, ffmpeg, ffprobe. `command -v claude opencode` prints nothing.
- S3: `@ts-nocheck` removed from all 11 files; strict clean. Types: `Json`/`Root`/`ProcessRow`/`TrashResult` from `server/types.ts` (no change there); `Platform = typeof platformDefault` (the module namespace; P2's `createPlatform` interface is `PlatformDeps`, which is the injection input, not the product type); `InstallerDeps`, `InitOptions` interfaces. `scripts/install.ts`, `agents.ts`, `init-config.ts` import only `node:*` and relative modules (grep empty). `grep -rnE ':\s*any\b|\bas any\b' scripts` -> only an English word in a comment. Test edits are annotation-only (`as string`, `Json` fixture types, typed arrays); one variable renamed (`stoppedPids`) because `assert.deepEqual(stopped, [])` narrows the array to `never[]`.
- S3 equivalence: `node p4eq.mjs 1be5729 HEAD` (stripTypeScriptTypes, comments/imports/whitespace/parens/commas/semicolons ignored): same for all 7 non-test scripts. Casts (`as boolean`, `(e as Error).message`) were chosen over helpers so the stripped code is identical.
- S3 verify: `pnpm typecheck` ok, `pnpm format:check` ok, `pnpm lint` 0 errors, `pnpm test` 299/298/0 fail/1 skipped.
- DISCOVERY (found in S3): `scripts/install.ts` calls `platform.desktopEntry(false)` for the Linux app entry, but the real `server/platform.ts` does not export `desktopEntry` (only the install tests inject it). A real Linux setup therefore throws a TypeError. S3 types it with a call-site cast; S4(d) exports `desktopEntry` (the plan allows a small exported helper) because launcher refresh needs it too.
- S4: (a) `processMatches` tries `server/hub.ts` and `server/hub.js` (`HUB_ENTRIES`); (b) update-target check accepts either; (c) `staleCode()` finds `x.js`/`x.mjs` in the target whose same-path `x.ts` is in the new source (only inside the copied ITEMS folders; `node_modules`/`render`/`out` skipped; symlinks and non-files ignored), moved with `renameSync` into this update's backup folder after the copy; dry-run says `would move N obsolete JavaScript files ...`; (d) update rewrites `desktopFile` and (Linux) `entryFile` when `owned(f, target)` and re-applies login startup when `getAutostart()` is true (macOS: off then on, because `setAutostart(true)` is a no-op while the agent is loaded; Linux: on). The launcher text moved from setup into one `launcherText()` helper used by both (setup output unchanged).
- S4 deviation (allowed by the plan's "small exported helper"): `server/platform.ts` now also exports `desktopEntry` (return object + module export), which fixes the S3 discovery above. Update builds `createPlatform({ hubDir: target, env })` when the default platform is in use, because the default platform's `hubDir` is the update source folder (downloaded copy), so its autostart/launcher ownership and paths would name the wrong folder. Injected test platforms are used as given.
- S4 tests (4 added to `scripts/install.test.ts`, 303 total): stop recognizes own `hub.js` and ignores another install's; update accepts hub.js-only target and rejects a folder with neither; stale move incl. negatives (no `.ts` sibling, `hub.ts.js`, `data/`, outside ITEMS) and dry-run; launcher/autostart refresh on linux and darwin with another install's launcher, absent app entry and autostart off left alone. Revert checks (each against the changed code, each failed): (a) `['hub.ts']` only -> stop test fails; (b) check `hub.ts` only -> 3 tests fail; (c) no stale list -> moves test fails; `if (true)` sibling check -> 5 tests fail; (d) launcher refresh off -> launcher test fails; autostart refresh off -> launcher test fails; refresh without `owned` -> launcher test fails.
- S4 verify: `pnpm format:check`, `pnpm typecheck` ok, `pnpm lint` 0 errors, `pnpm test` 303 tests / 302 pass / 1 skipped / 0 fail.


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
