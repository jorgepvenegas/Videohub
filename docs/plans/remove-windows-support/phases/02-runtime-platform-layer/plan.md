# Phase P2 — Runtime platform layer

- Plan ID: `remove-windows-support`
- Phase: P2
- Plan version: 1
- Validated against master version: 10
- Status: ready
- Approved by: Jorge Venegas
- Approved at: 2026-11-17
- Commit: pending
- Implementation mode: subagent
- Implemented by: pending
- Implemented at: pending
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: P1
- Written: 2026-11-17
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Make the runtime Unix-only. Remove the Windows body of `createPlatform` in `server/platform.js` and every export that only Windows used. Remove Windows branches, spawn options, error-code tables, process-name lists and Windows-named identifiers from `server/` and `ui/`. Delete `server/platform.win32.test.js` and turn the remaining Windows-flavored tests into Unix tests or delete them. After this phase, `server/`, `ui/` and `scripts/` pass the D2 grep, macOS/Linux behavior and the MCP/HTTP result shapes are unchanged, and only templates, docs and package metadata remain for P3.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Deletes `server/platform.win32.test.js` | A1 |
| D2 | Clears Windows branches and identifiers from `server/`, `ui/`, `scripts/test.mjs`, `scripts/agents.mjs` | A2 |
| D3 | Linux/darwin platform, installer and UI tests keep passing | A3 |
| D5 | `pnpm test` green and `node --check` clean on changed files | A4 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L1 | `platform.js:206-207` names legacy `.cmd/.ps1/.vbs` launchers; `IS_WIN`, `getShortcut`, `setShortcut`, `getAutostartState`, `cleanupLegacyAutostart` have no consumer in `scripts/` | S1 removes the whole Windows body (including those lines) and these exports; S2 removes the `cleanupLegacyAutostart` call in `guard.js`. `shellCommand` is kept: `server/jobs.js` uses it and the Unix version is `/bin/sh -c` |
| L2 | `scripts/agents.mjs` still does `hub.replace(/\\/g, '/')` for rule text | S5 removes it |
| L3 | Lifecycle dry-runs must run from a scratch copy | S6 re-runs the setup dry-run that way |
| L4 | Baseline is 325 tests, 324 pass, 1 skipped, 0 fail | A4 compares against it; the count drops only by the Windows-only tests listed in the closeout |
| L5 | `scope` reads only the first path of each Files: bullet | Every Files: bullet below names one file |

## 3. Scope

In scope:
- `server/platform.js`: Windows body and Windows-only exports.
- Windows-only code in the server modules and UI files listed in S2–S4.
- Windows-only tests and Windows-flavored test fixtures listed in S1 and S4.
- `scripts/test.mjs` Windows env isolation and the `scripts/agents.mjs` L2 line.

Rules for edge cases:
- Comments whose only reason is Windows: rewrite them to state the Unix reason, or delete them when no reason remains. If the code itself is unconditional and harmless on Unix (e.g. tmp-file + rename in `tweaks.js`, `process.exitCode` in `cli.js`, the CRLF tolerance in `peaks.test.js`, the read-event filter in `live.js`), keep the behavior and change only the comment.
- `RenderGuard` is the product name of the render protection and appears in stored output records (`source: 'RenderGuard'`). It stays.
- Rename Windows-named identifiers (decision C3), e.g. `notifyWindows` in `server/outputs.js`/`server/hub.js`. The name should state intent with no OS name (`notifyDesktop` suggested; the implementer chooses). These are internal names, not MCP/HTTP shapes.
- User-visible "Recycle Bin" text becomes "Trash". `capabilities().trashLabel` keeps its shape (macOS/Linux already supply their own labels).

Out of scope:
- `templates/`, `examples/`, README, CLAUDE.md, AGENTS.md, `docs/`, `skill/`, `package.json` (P3).
- Backslash or drive-letter path normalization not matched by the D2 grep (e.g. `janitor.js` `archiveOne` regexes, `outputs.js` `guardPath`). Changing it would alter Unix path semantics. Report any you find as a `note` discovery; do not edit it.
- Any change to Unix behavior, MCP tool output, HTTP response shapes or `legacy.js`.

## 4. Entry conditions

- [ ] P1 is `done` and the tree is clean on `plan/remove-windows-support` — verify: `git status --short && git branch --show-current`
- [ ] Baseline matches L4 — verify: `pnpm test` — 325 tests, 0 fail
- [ ] Phase plan revalidated against current master version
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — Reduce `server/platform.js` to the Unix implementation

- Depends on: none
- Files:
  - `server/platform.js` (modify) — `createPlatform` Windows body (lines 10–315), `runDefault` Windows options, module export list, `createUnixPlatform` return object
  - `server/platform.win32.test.js` (delete)
  - `server/platform.linux.test.js` (modify only if it references a removed export)
  - `server/platform.darwin.test.js` (modify only if it references a removed export)
- Change: `createPlatform` keeps its injectable signature and returns the Unix platform. Delete the Windows body, the `IS_WIN` field, and the Windows-only exports `getShortcut`, `setShortcut`, `getAutostartState`, `cleanupLegacyAutostart`, plus `desktopEntry` if no consumer remains (grep first). Remove `windowsHide` from `runDefault` and the Unix `renderSpawnOptions`. Keep every export that `server/`, `ui/` or `scripts/` still import (`casePath`, `pathKey`, `shellCommand`, `gpuNames`, `recycleStream`, ...). Their Unix result shapes must not change.
- Acceptance:
  - [ ] `grep -nE "win32|IS_WIN|[Pp]ower[Ss]hell|Get-CimInstance|taskkill|explorer|cmd\.exe|APPDATA|windowsHide|Recycle Bin|\.exe\b|\.lnk\b|\.vbs|\.ps1|\.cmd\b" server/platform.js` prints nothing
  - [ ] `server/platform.win32.test.js` is not tracked
- Verification: `node --check server/platform.js && pnpm test` — expected: 0 failures (other modules may still reference removed names until S2; if so, finish S2 before running the suite and record that)
- Rollback: `git checkout HEAD -- server/platform.js server/platform.win32.test.js server/platform.linux.test.js server/platform.darwin.test.js`

### S2 — Remove Windows code from server modules

- Depends on: S1
- Files:
  - `server/util.js` (modify) — `powershell()` (no consumer), `windowsHide` in `run`, `APPDATA` export (rename to a neutral name such as `CONFIG_DIR` only if it has consumers; otherwise drop it)
  - `server/guard.js` (modify) — `cleanupLegacyAutostart` import/call, legacy `.exe` and Windows affinity comments
  - `server/janitor.js` (modify) — Windows `SHFileOperation` codes in `why()`; keep a Trash-refusal message for the Unix `-3` code; "Recycle Bin" wording
  - `server/hub.js` (modify) — `notifyWindows` calls, "Start with Windows", PowerShell and Recycle Bin comments
  - `server/outputs.js` (modify) — `notifyWindows` export renamed
  - `server/encoders.js` (modify) — `win32` entry in `PROBE_ORDER`, Windows comment at `:58`, `windowsHide` in the probe spawn
  - `server/ramhogs.js` (modify) — `win32` skip list and `.exe` stripping
  - `server/jobs.js` (modify) — `windowsHide` in spawn; Windows rename comment at `:158`
  - `server/media.js` (modify) — `windowsHide`
  - `server/scan.js` (modify) — `windowsHide`, Recycle Bin comment
  - `server/sound.js` (modify) — `windowsHide`
  - `server/soundedit.js` (modify) — `windowsHide`
  - `server/vhsound.mjs` (modify) — `windowsHide`
  - `server/tools.js` (modify) — `windowsHide`
  - `server/open-file.js` (modify) — comment naming `.bat/.exe/.lnk`; the `OPENABLE` allowlist is unchanged
  - `server/ciktilar.js` (modify) — Recycle Bin comments
  - `server/thumbstudio/store.js` (modify) — Recycle Bin comments and error text
  - `server/live.js` (modify) — Windows-only comment reason
  - `server/cli.js` (modify) — Windows-only comment reason
  - `server/tweaks.js` (modify) — Windows-only comment reason
- Change: apply the scope rules above. Keep behavior identical on macOS/Linux.
- Acceptance:
  - [ ] D2 grep over `server` (excluding test files, handled in S4) prints nothing
  - [ ] `notifyWindows` has no occurrence; the renamed function is used by `hub.js`
- Verification: `node --check` on each changed file; the master D2 grep restricted to `server` with `--exclude=*.test.js` — expected: no output
- Rollback: `git checkout HEAD -- server`

### S3 — Remove Windows code from the UI

- Depends on: S1
- Files:
  - `ui/system.js` (modify) — `win32` path-key branch; `trashName` fallback becomes `'Trash'`
  - `ui/platform-ui.test.js` (modify) — Windows-named test and its Windows defaults wording
  - `ui/settings.test.js` (modify) — the `platform: 'win32'` duplicate-path case (keep the Unix case)
- Change: the UI keeps the Unix path-key behavior (case and backslashes preserved, trailing slash trimmed). A test that existed only to check Windows behavior is deleted. A test that also checks shared behavior keeps its Unix assertion.
- Acceptance:
  - [ ] `grep -rnE "win32|Windows|Recycle Bin" ui` prints nothing (UI "window" words for browser windows are fine)
- Verification: `pnpm test` — expected: UI tests pass
- Rollback: `git checkout HEAD -- ui`

### S4 — Convert Windows-flavored server tests to Unix

- Depends on: S2
- Files:
  - `server/jobs.test.js` (modify) — harness uses `cmd.exe`/`taskkill`/`windowsHide`; switch it to the Unix shell/killTree fakes and keep every queue assertion; delete the "hands cmd.exe the command quoted and verbatim" assertion and keep the Unix `/bin/sh -c` one
  - `server/ramhogs.test.js` (modify) — default `OS = 'win32'` harness and `.exe` rows become Linux/darwin rows with the same grouping assertions
  - `server/util.test.js` (modify) — drop the `win32` path flavor loop
  - `server/killtree-unix.test.js` (modify) — drop the `win32` skip condition
  - `server/open-file.test.js` (modify) — keep "non-media files are refused" with Unix-relevant names; drop the `cmd/powershell` command assertion if it only guards Windows
  - `server/guard.test.js` (modify) — remove the `cleanupLegacyAutostart` fake
  - `server/scan-cache.test.js` (modify) — the "Windows spelling variants" test: delete it if it covers only Windows case folding, otherwise keep its Unix assertion
  - `server/thumbstudio/store.test.js` (modify) — "Recycle Bin" comment
- Change: no assertion about Unix behavior is lost. List every removed test in the closeout.
- Acceptance:
  - [ ] `grep -rnE "win32|IS_WIN|[Pp]ower[Ss]hell|taskkill|cmd\.exe|windowsHide|windowsVerbatimArguments|Recycle Bin|\.exe\b|\.lnk\b" server` prints nothing
- Verification: `pnpm test` — expected: 0 failures
- Rollback: `git checkout HEAD -- server/*.test.js server/thumbstudio/store.test.js`

### S5 — Clean the test runner and the L2 line

- Depends on: none
- Files:
  - `scripts/test.mjs` (modify) — drop `USERPROFILE`, `APPDATA`, `LOCALAPPDATA` from the isolated env and fix the header comment's `Documents\VideoHub`
  - `scripts/agents.mjs` (modify) — the `hub.replace(/\\/g, '/')` in the rule text (L2)
- Change: isolation still covers `HOME`, `XDG_*`, `TMP*` and the VideoHub dirs.
- Acceptance:
  - [ ] `grep -nE "USERPROFILE|APPDATA|LOCALAPPDATA|\\\\" scripts/test.mjs` prints nothing
  - [ ] The agents marker test from P1 still passes
- Verification: `pnpm test` — expected: 0 failures
- Rollback: `git checkout HEAD -- scripts/test.mjs scripts/agents.mjs`

### S6 — Phase verification

- Depends on: S1, S2, S3, S4, S5
- Files: none (verification only)
- Change: run the master D2 grep restricted to `server ui scripts`. Run `pnpm install --frozen-lockfile && pnpm test` and `node --check` on every changed `.js`/`.mjs`. Repeat the P1 setup dry-run from a scratch copy under `.test-tmp` (L3).
- Acceptance:
  - [ ] D2 grep over `server ui scripts` prints nothing
- Verification: as described — expected: no grep output, 0 test failures, dry-run exit 0
- Rollback: none

## 6. Phase acceptance criteria

- [ ] A1 — `server/platform.win32.test.js` is gone — verify: `git ls-files server/platform.win32.test.js` prints nothing
- [ ] A2 — `server/`, `ui/`, `scripts/` contain no Windows branches or identifiers — verify: `grep -rnE "win32|IS_WIN|isWin|[Pp]ower[Ss]hell|winget|taskkill|Get-CimInstance|explorer\.exe|cmd\.exe|ComSpec|LOCALAPPDATA|USERPROFILE|APPDATA|windowsHide|windowsVerbatimArguments|notifyWindows|start-with-windows|Recycle Bin|\.exe\b|\.lnk\b" server ui scripts` prints nothing
- [ ] A3 — macOS/Linux behavior unchanged — verify: `server/platform.linux.test.js`, `server/platform.darwin.test.js`, `ui/platform-ui.test.js` and the installer tests pass with no Unix assertion removed (closeout lists every removed or converted test); setup dry-run from a scratch copy exits 0
- [ ] A4 — Suite green — verify: `pnpm install --frozen-lockfile && pnpm test` — 0 failures; `node --check` passes on each changed file

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [ ] Names and structure state intent; comments explain only non-obvious reasons
- [ ] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [ ] Master standards commands pass: format none, lint none, `node --check` on each changed file, `pnpm install --frozen-lockfile && pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| A helper defined in the Windows body is also used by the Unix path (R1) | medium | Unix runtime breaks | `createUnixPlatform` is self-contained at `:320`; grep each removed symbol; platform tests |
| Removing the `win32` harness in `jobs.test.js`/`ramhogs.test.js` silently drops queue or grouping coverage (R2) | medium | Lost regression coverage | Convert fixtures instead of deleting tests; closeout lists every assertion removed |
| Renaming `notifyWindows` misses a caller | low | Hub crash on render finish | grep plus `node --check`; hub.js imports checked |
| UI text change "Recycle Bin" → "Trash" alters a user-visible string | certain | Cosmetic | Intended by C3; macOS/Linux already show their own trash labels |

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
| D1 (master) | pending | |
| D2 (master) | pending | |
| D3 (master) | pending | |
| D5 (master) | pending | |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|

**Master updates written:** none yet
**Next-phase updates written:** none yet
**Remaining work and handoff:** none yet
