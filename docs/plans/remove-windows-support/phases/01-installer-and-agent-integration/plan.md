# Phase P1 — Installer and agent integration

- Plan ID: `remove-windows-support`
- Phase: P1
- Plan version: 1
- Validated against master version: 4
- Status: done
- Approved by: Jorge Venegas
- Approved at: 2026-11-17
- Commit: 7a35e26
- Implementation mode: subagent
- Implemented by: p1-worker
- Implemented at: 2026-11-17
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
| L3 | Lifecycle dry-runs must run from a scratch copy | Applied during S5 (recorded in section 9) |
| L4 | Test baseline after P1 is 325/324/1/0 | Recorded by this phase's verification |
| L5 | `scope` reads only the first path of a grouped Files: bullet | Explains S1's false out-of-scope report; no code change |

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
  - [x] None of the listed files is tracked — evidence: `git ls-files '*.cmd' '*.ps1' 'scripts/windows-*'` printed nothing. Reference grep found only docs/README/CLAUDE.md/ui/app.js/server comments and the install.mjs `ITEMS` (handled in S2); no other consumer.
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
  - [x] `grep -nE "IS_WIN|win32|\.cmd|\.ps1|..." scripts/install.mjs` — evidence: only two regex-dot false positives remain (line 57 `p.cmd`, line 123 `process.execPath`); no Windows identifier remains
  - [x] `--help` output is unchanged — evidence: `node scripts/install.mjs setup --help` diff against pre-change capture is empty
- Verification: `node --check scripts/install.mjs && node scripts/install.mjs --help` — expected: the same usage text as before the change
- Rollback: `git checkout HEAD -- scripts/install.mjs`

### S3 — Make `scripts/agents.mjs` and `scripts/init-config.mjs` Unix-only

- Depends on: none
- Files:
  - `scripts/agents.mjs` (modify) — `IS_WIN` import, `normal`, executable search, `executeAgent` batch-shim branch, rule `begin` marker text
  - `scripts/init-config.mjs` (modify) — `IS_WIN` import, `low`, example path, comments naming `setup.ps1`
- Change: drop the `IS_WIN` import and branches, keeping the Unix behavior (no lower-casing, no `.exe/.cmd/.bat` probing, plain `spawnSync` without Windows options). Change the rule begin marker to `remove with uninstall.sh` (decision C5); leave the `blocks` regex unchanged so existing blocks are still found. Update comments that name `setup.ps1`/`uninstall.ps1` to the Unix scripts. Keep the backslash-to-slash normalization in `normal` only if a Unix test depends on it; otherwise remove it as Windows-only.
- Acceptance:
  - [x] grep over agents.mjs and init-config.mjs prints nothing
  - [x] Old-marker block replaced on refresh — evidence: added test 'a rule block written with the old marker text is replaced on refresh' passes
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
  - [x] grep over `scripts/*.test.js` — evidence: only false positives (`cmd` variable names); no Windows identifier remains
  - [x] No Unix assertion was dropped — evidence: the two Windows stop tests were converted (Unix assertions kept), see closeout
- Verification: `pnpm test` — expected: 0 failures
- Rollback: `git checkout HEAD -- scripts/*.test.js`

### S5 — Verify the Unix lifecycle end to end in isolation

- Depends on: S4
- Files: none (verification only)
- Change: run `bash setup.sh --dry-run --yes` with `HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `TMPDIR` under `.test-tmp/p1-home` and `VIDEOHUB_DATA_DIR`/`VIDEOHUB_BASE_DIR` under `.test-tmp/p1-data`, `VIDEOHUB_PORT=7799`, `VIDEOHUB_NO_WINDOW=1`. Also run `bash update.sh --dry-run --target .test-tmp/p1-target (a scratch copy of the repo)` and `bash uninstall.sh --dry-run` in the same isolation if they can run without touching the real install; otherwise record why not.
- Acceptance:
  - [x] setup dry-run exits 0 and prints only Unix actions — evidence: ran in scratch copy `.test-tmp/p1-target`, exit 0; uninstall dry-run exit 0; update dry-run exit 0 (same-target); no file written under fake HOME/data (see deviations)
- Verification: the commands above — expected: exit 0, no write outside `.test-tmp`
- Rollback: `rm -rf .test-tmp/p1-*`

## 6. Phase acceptance criteria

- [x] A1 — No `.cmd`/`.ps1` entry points, `make-icon.ps1` or `scripts/windows-*` files are tracked — verify: `git ls-files '*.cmd' '*.ps1' 'scripts/windows-*'` prints nothing
- [x] A2 — `scripts/` has no Windows branches or identifiers — verify: `grep -rnE "win32|IS_WIN|[Pp]ower[Ss]hell|winget|ComSpec|LOCALAPPDATA|APPDATA|windowsHide|windowsVerbatimArguments|start-with-windows|\.exe\b|\.cmd\b|\.ps1\b" scripts --exclude=test.mjs` prints nothing (`scripts/test.mjs` env isolation belongs to P2)
- [x] A3 — Unix lifecycle unchanged — verify: Linux/darwin tests in `scripts/install.test.js` pass; S5 setup dry-run exits 0; `node scripts/install.mjs --help` output unchanged
- [x] A4 — Suite green — verify: `pnpm install --frozen-lockfile && pnpm test` — 0 failures; `node --check` on each changed `.mjs`/`.js`

## 7. Code standards check

- [x] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [x] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [x] Names and structure state intent; comments explain only non-obvious reasons
- [x] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [x] Master standards commands pass: `none` (format), `none` (lint), `node --check` on each changed file, `pnpm install --frozen-lockfile && pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Removing a Windows branch also removes a Unix-shared line (e.g. `referencesClear`, `startupDetails`) | medium | Unix update/uninstall regress | Keep helpers still called by the Unix path; Linux/darwin tests + S5 dry-run |
| Dropping option aliases breaks a documented Unix flag | low | User command fails | Unix scripts pass `"$@"` through; only options outside `--help` (and not `no-skill`) are removed; diff `--help` output |
| Old agent rule blocks not refreshed after marker text change | low | Duplicate rule blocks | Regex unchanged; marker-compatibility test |
| `server/platform.js` still exports Windows names after this phase | certain | none (P2 removes them) | Out of scope by design (C4) |

## 9. Deviations and working notes

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

- 2026-11-17, S5: ran the dry-runs from a scratch copy (`.test-tmp/p1-target`) instead of the repo root. Reason: `.test-tmp` lives inside the repo, and setup rejects a workspace inside the program folder ("Pick a folder outside the VideoHub program folder"), so the plan's literal command (HOME under repo `.test-tmp`) exits 1 from the repo root. Isolation unchanged. Also prepended the real node directory to PATH because the asdf node shim fails with a fake HOME (exit 126).
- 2026-11-17, S4: `scripts/init-config.test.js` had `USERPROFILE/APPDATA/LOCALAPPDATA` in a spawned-process env; removed (Windows-only isolation, needed for A2 grep).
- 2026-11-17, S3: `low` helper in init-config.mjs became plain `path.resolve` calls (helper was identity on Unix); `normal` in agents.mjs keeps only the trailing-slash trim.

## 10. Closeout

Fill at the end of every implementation session. Do not mark the phase done until this section is complete and the master is updated. Set `Implemented by` to the worker name or ID and `Implemented at` to the implementation date; `close` requires both.

- Date: 2026-11-17
- Session: p1-worker (subagent)
- Verdict: addressed
- Steps complete: S1, S2, S3, S4, S5
- Verification run: `git ls-files '*.cmd' '*.ps1' 'scripts/windows-*'` (empty); A2 grep over `scripts` (only `.cmd` process-row property false positives plus Windows-isolation env removed from init-config.test.js); `node --check` on all six changed files (ok); `node scripts/install.mjs setup --help` diff vs before (empty); `pnpm install --frozen-lockfile && pnpm test` = 325 tests, 324 pass, 1 skipped, 0 fail (baseline 350/348/2/0); S5 setup, update and uninstall dry-runs in a scratch copy with fake HOME/XDG/TMPDIR/data, exit 0.

Removed tests (all Windows-only): `windows-installer.test.js`, `windows-safety.test.js`, `windows-security.test.js` (whole files) and 'Windows agent batch shims preserve special path characters...' in `agents.test.js`. Converted, not removed: 'Windows lifecycle uses the same queue...' became 'stop uses the queue and ownership checks...' and 'Windows stop ownership folds path casing...' became 'stop ownership is case-sensitive and different install prefixes remain distinct' (the Windows case-folding positive case dropped). Added: old-marker refresh test.

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | met | `git ls-files` for `.cmd`/`.ps1`/`scripts/windows-*` prints nothing |
| A2 | met | grep over `scripts` (excluding test.mjs) leaves only `p.cmd`/`row.cmd` property names (regex dot matches), no Windows identifiers |
| A3 | met | all darwin/linux installer tests pass; setup dry-run exit 0 in isolation; `--help` unchanged |
| A4 | met | 325 tests, 0 fail; `node --check` ok |
| D1 (master) | met | P1 slice only; P2/P3 own the rest, full D1 re-verified in P3.  root `.cmd`/`.ps1`, `make-icon.ps1`, `scripts/windows-*` gone; `server/platform.win32.test.js` and `docs/WINDOWS-SECURITY.md` remain (P2/P3) |
| D2 (master) | met | P1 slice only; full D2 re-verified in P3.  `scripts/` clean except `scripts/test.mjs`; `server`, `ui`, `templates`, `examples`, `skill`, `package.json` untouched |
| D3 (master) | met | darwin/linux install, agents, init-config tests pass; setup dry-run exit 0 |
| D5 (master) | met | P1 slice only; full D5 re-verified in P3.  suite green; `package.json` `os` and remaining changed-file checks belong to P3 |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|
| P1-1 | S5 literal command fails from the repo root: `.test-tmp` is inside the program folder and setup rejects a workspace inside it; also asdf node shim needs the real HOME | note | none | Ran from a scratch copy; recorded in section 9 |
| P1-2 | `scripts/agents.mjs` still has `hub.replace(/\\/g, '/')` (rule text) and `ownedText`/`normal` slash handling; Unix-harmless, not matched by D2 grep | note | P2 | None; optional cleanup |
| P1-3 | Test count fell 350 to 325 (whole Windows files plus one removed test; 25 fewer in total); skipped fell 2 to 1 | note | P2, P3 | Baseline for later phases is 325/324/1/0 |
| P1-4 | `ui/app.js` and `server/*` still reference `.cmd`/`.ps1` names (`open.cmd`, `open.ps1` legacy launchers in `server/platform.js:206-207`) | next-phase-amend | P2 | P2 must remove these with the Windows platform branch |
| P1-5 | Nothing in this phase was unnecessary; `resolveInstall` and `platformForInstall` injection params were removed as Windows-only | note | none | None |

Coupling that appeared: `scripts/install.test.js` fixture still passes `IS_MAC`/`IS_LINUX` but not `IS_WIN`; `server/platform.js` still exports `IS_WIN`, `getShortcut`, `setShortcut`, `cleanupLegacyAutostart`, `shellCommand` which now have no scripts/ consumer. `scripts/agents.mjs` still imports `trash` from `server/platform.js` (Unix-safe). Earlier evidence suspect: none beyond the S5 command note.

**Master updates written:** none (coordinator owns master.md)
**Next-phase updates written:** none (P1-4 reported to coordinator)
**Remaining work and handoff:** P2 removes the Windows half of `server/platform.js`, the unused Windows exports above, `server/platform.win32.test.js`, and Windows env isolation in `scripts/test.mjs`; P3 handles docs, templates, package.json.
