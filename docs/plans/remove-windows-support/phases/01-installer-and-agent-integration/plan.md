# Phase P1 — Installer and agent integration

- Plan ID: `remove-windows-support`
- Phase: P1
- Plan version: 1
- Validated against master version: 4
- Status: in_progress
- Approved by: Jorge Venegas
- Approved at: 2026-11-17
- Commit: pending
- Implementation mode: subagent
- Implemented by: pending
- Implemented at: pending
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: none
- Written: 2026-11-17
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Make the lifecycle tooling Unix-only. `scripts/install.mjs`, `scripts/agents.mjs` and `scripts/init-config.mjs` lose every `IS_WIN` branch, the legacy Windows launcher/guard retirement and the PowerShell option spellings. The `.cmd`/`.ps1` entry points, `make-icon.ps1`, the Windows security diagnostic and the Windows-only installer tests are deleted. After this phase nothing in `scripts/` or the repo root imports or needs a Windows platform export, so P2 can remove the Windows half of `server/platform.js`. macOS and Linux setup/update/uninstall/open behave exactly as before.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Deletes the root `.cmd`/`.ps1` entry points, `scripts/make-icon.ps1`, `scripts/windows-*` files | A1 |
| D2 | Removes Windows branches and identifiers from `scripts/` and the Unix shell scripts | A2 |
| D3 | Keeps the Linux/darwin installer, agent and init-config tests passing and `setup.sh --dry-run` working | A3 |
| D5 | Keeps `pnpm test` green with the Windows-only suites removed | A4 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| None | The discovery ledger is empty at master version 4 | No change |

## 3. Scope

In scope:
- Remove Windows code from `scripts/install.mjs`, `scripts/agents.mjs`, `scripts/init-config.mjs`.
- Delete Windows entry points, wrappers and Windows-only scripts/tests listed in S1.
- Remove Windows-only cases from `scripts/install.test.js`, `scripts/agents.test.js`, `scripts/init-config.test.js`.
- Update stale comments in these files that name `setup.ps1`/`uninstall.ps1`.

Out of scope:
- `server/platform.js` and every other `server/` or `ui/` file, including `server/platform.win32.test.js` and `scripts/test.mjs` env isolation (P2).
- Templates, README, CLAUDE.md, AGENTS.md, `docs/`, `skill/`, `package.json` (P3).
- Any change to Unix lifecycle behavior, option names documented in `--help`, or `make-upload.mjs`/`upload-rules.mjs`.

## 4. Entry conditions

- [ ] On branch `plan/remove-windows-support` with a clean tree apart from plan files — verify: `git branch --show-current && git status --short`
- [ ] Baseline green — verify: `pnpm test` — 0 failures
- [ ] Phase plan revalidated against current master version
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — Delete Windows-only lifecycle files

- Depends on: none
- Files:
  - `SETUP.cmd`, `UPDATE.cmd`, `UNINSTALL.cmd`, `open.cmd` (delete)
  - `setup.ps1`, `update.ps1`, `uninstall.ps1` (delete)
  - `scripts/make-icon.ps1` (delete)
  - `scripts/windows-security.mjs`, `scripts/windows-security.test.js` (delete)
  - `scripts/windows-installer.test.js`, `scripts/windows-safety.test.js` (delete)
- Change: `git rm` the files. Before deleting, confirm with grep that nothing outside these files, `docs/`, README, CLAUDE.md, AGENTS.md and `install.mjs` `ITEMS` references them. Any other reference is a discovery to report.
- Acceptance:
  - [ ] None of the listed files is tracked
- Verification: `git ls-files '*.cmd' '*.ps1' 'scripts/windows-*'` — expected: no output
- Rollback: `git checkout HEAD -- SETUP.cmd UPDATE.cmd UNINSTALL.cmd open.cmd setup.ps1 update.ps1 uninstall.ps1 scripts/make-icon.ps1 scripts/windows-security.mjs scripts/windows-security.test.js scripts/windows-installer.test.js scripts/windows-safety.test.js`

### S2 — Make `scripts/install.mjs` Unix-only

- Depends on: S1
- Files:
  - `scripts/install.mjs` (modify) — `parseOptions`, `ITEMS`, `casePath`, `processMatches`, legacy retirement block (`LEGACY_LAUNCHERS`, `legacyFiles`, `validateLegacyPaths`, `retireLegacyAgent`), `runInstaller` (marker file, `startupDetails`, `warnRetainedLaunchers`, `packageInstall`, `open`, setup/update/uninstall branches)
- Change:
  - `parseOptions`: drop the `retire-legacy` action, the PowerShell alias table (`dryrun`, `watchfound`, `startwithwindows`, `serveronly` and the rest), and the flags that only existed for the PowerShell wrappers (`start-with-windows`, `test`, `launchers`, `no-agent`, `no-guard`, `no-shortcut`). Keep every option shown in `--help` plus `no-skill` (used by update).
  - Remove `.cmd`/`.ps1` names from `ITEMS`.
  - Remove the whole legacy Windows retirement code and its exports. Remove `platformForInstall` and any other installer parameter used only by Windows branches.
  - Remove every `platform.IS_WIN` branch and keep the Unix path unchanged: marker file path, pnpm lookup/install, spawn options, ffmpeg/browser hints, Desktop shortcut/launcher, startup handling, update target discovery, uninstall shortcut/startup cleanup. `casePath` uses `platform.casePath` when present, else identity. `processMatches` keeps Unix node-process matching (drop the `.exe` form).
  - Keep `getAutostart`/`setAutostart` and every other platform call the Unix path already uses.
- Acceptance:
  - [ ] `grep -nE "IS_WIN|win32|\.cmd|\.ps1|\.exe|winget|Windows|SETUP|legacy|LEGACY|windowsHide|getShortcut|setShortcut|getAutostartState|shellCommand" scripts/install.mjs` prints nothing (a remaining hit must be reported as a discovery)
  - [ ] `--help` output is unchanged
- Verification: `node --check scripts/install.mjs && node scripts/install.mjs --help` — expected: the same usage text as before the change
- Rollback: `git checkout HEAD -- scripts/install.mjs`

### S3 — Make `scripts/agents.mjs` and `scripts/init-config.mjs` Unix-only

- Depends on: none
- Files:
  - `scripts/agents.mjs` (modify) — `IS_WIN` import, `normal`, executable search, `executeAgent` batch-shim branch, rule `begin` marker text
  - `scripts/init-config.mjs` (modify) — `IS_WIN` import, `low`, example path, comments naming `setup.ps1`
- Change: drop the `IS_WIN` import and branches, keeping the Unix behavior (no lower-casing, no `.exe/.cmd/.bat` probing, plain `spawnSync` without Windows options). Change the rule begin marker to `remove with uninstall.sh` (decision C5); leave the `blocks` regex unchanged so existing blocks are still found. Update comments that name `setup.ps1`/`uninstall.ps1` to the Unix scripts. Keep the backslash-to-slash normalization in `normal` only if a Unix test depends on it; otherwise remove it as Windows-only.
- Acceptance:
  - [ ] `grep -nE "IS_WIN|win32|\.cmd|\.bat|\.exe|\.ps1|ComSpec|windowsHide|windowsVerbatimArguments|Windows" scripts/agents.mjs scripts/init-config.mjs` prints nothing
  - [ ] An existing rule block written with the old marker is still recognized and replaced on refresh (covered by an existing or added test in `scripts/agents.test.js`)
- Verification: `node --check scripts/agents.mjs scripts/init-config.mjs && node --test scripts/agents.test.js scripts/init-config.test.js` (run through `pnpm test` for isolation) — expected: pass
- Rollback: `git checkout HEAD -- scripts/agents.mjs scripts/init-config.mjs`

### S4 — Remove Windows cases from the remaining installer tests

- Depends on: S2, S3
- Files:
  - `scripts/install.test.js` (modify) — the `IS_WIN` import, `IS_WIN` fields in the fake platform, the two "Windows lifecycle/stop ownership" tests, the `IS_WIN: true` no-contact fixture, Windows-only conditionals and comments, `windowsHide` spawn options
  - `scripts/agents.test.js` (modify) — `IS_WIN` import and the Windows batch-shim test; add the old-marker refresh test if none exists
  - `scripts/init-config.test.js` (modify) — only if it has a Windows-only case
- Change: delete Windows-only tests and fixtures. Where a test checks behavior shared with Unix (e.g. case-distinct paths stay distinct, dry-run makes no API contact), keep the Unix assertion. Add only the marker-compatibility test required by S3.
- Acceptance:
  - [ ] `grep -nE "IS_WIN|win32|Windows|windowsHide|\.cmd|\.exe" scripts/*.test.js` prints nothing
  - [ ] No Unix assertion was dropped: every removed test was Windows-only (listed in the closeout)
- Verification: `pnpm test` — expected: 0 failures
- Rollback: `git checkout HEAD -- scripts/*.test.js`

### S5 — Verify the Unix lifecycle end to end in isolation

- Depends on: S4
- Files: none (verification only)
- Change: run `bash setup.sh --dry-run --yes` with `HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `TMPDIR` under `.test-tmp/p1-home` and `VIDEOHUB_DATA_DIR`/`VIDEOHUB_BASE_DIR` under `.test-tmp/p1-data`, `VIDEOHUB_PORT=7799`, `VIDEOHUB_NO_WINDOW=1`. Also run `bash update.sh --dry-run --target .test-tmp/p1-target (a scratch copy of the repo)` and `bash uninstall.sh --dry-run` in the same isolation if they can run without touching the real install; otherwise record why not.
- Acceptance:
  - [ ] setup dry-run exits 0 and prints only Unix actions
- Verification: the commands above — expected: exit 0, no write outside `.test-tmp`
- Rollback: `rm -rf .test-tmp/p1-*`

## 6. Phase acceptance criteria

- [ ] A1 — No `.cmd`/`.ps1` entry points, `make-icon.ps1` or `scripts/windows-*` files are tracked — verify: `git ls-files '*.cmd' '*.ps1' 'scripts/windows-*'` prints nothing
- [ ] A2 — `scripts/` has no Windows branches or identifiers — verify: `grep -rnE "win32|IS_WIN|[Pp]ower[Ss]hell|winget|ComSpec|LOCALAPPDATA|APPDATA|windowsHide|windowsVerbatimArguments|start-with-windows|\.exe\b|\.cmd\b|\.ps1\b" scripts --exclude=test.mjs` prints nothing (`scripts/test.mjs` env isolation belongs to P2)
- [ ] A3 — Unix lifecycle unchanged — verify: Linux/darwin tests in `scripts/install.test.js` pass; S5 setup dry-run exits 0; `node scripts/install.mjs --help` output unchanged
- [ ] A4 — Suite green — verify: `pnpm install --frozen-lockfile && pnpm test` — 0 failures; `node --check` on each changed `.mjs`/`.js`

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [ ] Names and structure state intent; comments explain only non-obvious reasons
- [ ] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [ ] Master standards commands pass: `none` (format), `none` (lint), `node --check` on each changed file, `pnpm install --frozen-lockfile && pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Removing a Windows branch also removes a Unix-shared line (e.g. `referencesClear`, `startupDetails`) | medium | Unix update/uninstall regress | Keep helpers still called by the Unix path; Linux/darwin tests + S5 dry-run |
| Dropping option aliases breaks a documented Unix flag | low | User command fails | Unix scripts pass `"$@"` through; only options outside `--help` (and not `no-skill`) are removed; diff `--help` output |
| Old agent rule blocks not refreshed after marker text change | low | Duplicate rule blocks | Regex unchanged; marker-compatibility test |
| `server/platform.js` still exports Windows names after this phase | certain | none (P2 removes them) | Out of scope by design (C4) |

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
| D1 (master) | partial expected (P2/P3 files remain) | |
| D2 (master) | partial expected | |
| D3 (master) | pending | |
| D5 (master) | partial expected | |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|

**Master updates written:** none yet
**Next-phase updates written:** none yet
**Remaining work and handoff:** none yet
