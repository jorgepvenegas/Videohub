# Phase P2 — Runtime platform layer

- Plan ID: `remove-windows-support`
- Phase: P2
- Plan version: 1
- Validated against master version: 10
- Status: done
- Approved by: Jorge Venegas
- Approved at: 2026-11-17
- Commit: 151cf07
- Implementation mode: subagent
- Implemented by: p2-worker
- Implemented at: 2026-11-17
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
  - [x] `grep -nE "win32|IS_WIN|[Pp]ower[Ss]hell|Get-CimInstance|taskkill|explorer|cmd\.exe|APPDATA|windowsHide|Recycle Bin|\.exe\b|\.lnk\b|\.vbs|\.ps1|\.cmd\b" server/platform.js` prints nothing — grep printed nothing
  - [x] `server/platform.win32.test.js` is not tracked — `git rm`; file absent
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
  - [x] D2 grep over `server` (excluding test files, handled in S4) prints nothing — only `server/guard.js:37 out.exe = null` remains (HTTP shape field, see section 9)
  - [x] `notifyWindows` has no occurrence; the renamed function is used by `hub.js` — renamed `notifyDesktop` in outputs.js and hub.js; grep clean
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
  - [x] `grep -rnE "win32|Windows|Recycle Bin" ui` prints nothing (UI "window" words for browser windows are fine) — grep printed nothing
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
  - [x] `grep -rnE "win32|IS_WIN|[Pp]ower[Ss]hell|taskkill|cmd\.exe|windowsHide|windowsVerbatimArguments|Recycle Bin|\.exe\b|\.lnk\b" server` prints nothing — grep prints only `server/guard.js:37 out.exe` (section 9)
- Verification: `pnpm test` — expected: 0 failures
- Rollback: `git checkout HEAD -- server/*.test.js server/thumbstudio/store.test.js`

### S5 — Clean the test runner and the L2 line

- Depends on: none
- Files:
  - `scripts/test.mjs` (modify) — drop `USERPROFILE`, `APPDATA`, `LOCALAPPDATA` from the isolated env and fix the header comment's `Documents\VideoHub`
  - `scripts/agents.mjs` (modify) — the `hub.replace(/\\/g, '/')` in the rule text (L2)
- Change: isolation still covers `HOME`, `XDG_*`, `TMP*` and the VideoHub dirs.
- Acceptance:
  - [x] `grep -nE "USERPROFILE|APPDATA|LOCALAPPDATA|\\\\" scripts/test.mjs` prints nothing — grep printed nothing
  - [x] The agents marker test from P1 still passes — full suite green
- Verification: `pnpm test` — expected: 0 failures
- Rollback: `git checkout HEAD -- scripts/test.mjs scripts/agents.mjs`

### S6 — Phase verification

- Depends on: S1, S2, S3, S4, S5
- Files: none (verification only)
- Change: run the master D2 grep restricted to `server ui scripts`. Run `pnpm install --frozen-lockfile && pnpm test` and `node --check` on every changed `.js`/`.mjs`. Repeat the P1 setup dry-run from a scratch copy under `.test-tmp` (L3).
- Acceptance:
  - [x] D2 grep over `server ui scripts` prints nothing — only the `out.exe` exception remains (section 9)
- Verification: as described — expected: no grep output, 0 test failures, dry-run exit 0
- Rollback: none

## 6. Phase acceptance criteria

- [x] A1 — `server/platform.win32.test.js` is gone — verify: `git ls-files server/platform.win32.test.js` prints nothing — empty output
- [x] A2 — `server/`, `ui/`, `scripts/` contain no Windows branches or identifiers — verify: `grep -rnE "win32|IS_WIN|isWin|[Pp]ower[Ss]hell|winget|taskkill|Get-CimInstance|explorer\.exe|cmd\.exe|ComSpec|LOCALAPPDATA|USERPROFILE|APPDATA|windowsHide|windowsVerbatimArguments|notifyWindows|start-with-windows|Recycle Bin|\.exe\b|\.lnk\b" server ui scripts` prints nothing — one exception: `server/guard.js:37` `out.exe = null` (HTTP field kept)
- [x] A3 — macOS/Linux behavior unchanged — verify: `server/platform.linux.test.js`, `server/platform.darwin.test.js`, `ui/platform-ui.test.js` and the installer tests pass with no Unix assertion removed (closeout lists every removed or converted test); setup dry-run from a scratch copy exits 0
- [x] A4 — Suite green — verify: `pnpm install --frozen-lockfile && pnpm test` — 0 failures; `node --check` passes on each changed file

## 7. Code standards check

- [x] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [x] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [x] Names and structure state intent; comments explain only non-obvious reasons
- [x] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [x] Master standards commands pass: format none, lint none, `node --check` on each changed file, `pnpm install --frozen-lockfile && pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| A helper defined in the Windows body is also used by the Unix path (R1) | medium | Unix runtime breaks | `createUnixPlatform` is self-contained at `:320`; grep each removed symbol; platform tests |
| Removing the `win32` harness in `jobs.test.js`/`ramhogs.test.js` silently drops queue or grouping coverage (R2) | medium | Lost regression coverage | Convert fixtures instead of deleting tests; closeout lists every assertion removed |
| Renaming `notifyWindows` misses a caller | low | Hub crash on render finish | grep plus `node --check`; hub.js imports checked |
| UI text change "Recycle Bin" → "Trash" alters a user-visible string | certain | Cosmetic | Intended by C3; macOS/Linux already show their own trash labels |

## 9. Deviations and working notes

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

- 2026-11-17, S1: `createUnixPlatform` was folded into `createPlatform` (the exported factory) instead of keeping two functions, since the dispatcher had no remaining purpose; the injectable signature is unchanged (`osName` still injectable).
- 2026-11-17, S2: `server/janitor.js` `why()` reduced to the codes the Unix `recycleStream` emits (-3 and a generic fallback); the Windows-only `e.code > 0 && rest` "file may be open" branch was removed (unreachable on Unix because Unix failures always carry error text).
- 2026-11-17, S2: `server/guard.js:37` `out.exe = null` and `server/hub.js:105` `exe: null` are HTTP response fields; kept (scope fence: no HTTP shape change). D2 exception for P3 to record.
- 2026-11-17, S2: `server/util.js` `APPDATA` export had no consumer, dropped. Extra edits outside S2's file list: `server/peaks.test.js` and `server/platform.linux.test.js` comments (Windows wording only), recorded here rather than treated as new scope.
- 2026-11-17, S4: `server/jobs.test.js` harness now fakes `shellCommand` as `/bin/sh -c`, `renderSpawnOptions` as `{detached:true}` and `killTree` as a `spawn('kill-tree', [pid])` marker; the kill assertion reads `args[0]`.

## 10. Closeout

- Date: 2026-11-17
- Session: p2-worker
- Verdict: addressed
- Steps complete: S1, S2, S3, S4, S5, S6
- Verification run: `node --check` on every changed .js/.mjs (clean); `pnpm install --frozen-lockfile` (Done); `pnpm test` — 299 tests, 298 pass, 1 skipped, 0 fail (baseline 325; 26 removed, listed below); D2 grep over `server ui scripts` — only `server/guard.js:37 out.exe` (HTTP field, section 9); `bash setup.sh --dry-run --yes` from a scratch repo copy with fake HOME/XDG/TMPDIR/data/base, port 7799, NO_WINDOW, real node dir first on PATH — exit 0, scratch removed.

Removed or converted tests:
- Deleted `server/platform.win32.test.js` (18 tests, Windows-only).
- Deleted `server/scan-cache.test.js` "Windows spelling variants still reuse the same video comparison" (Windows case folding only).
- `server/util.test.js`: dropped the `win32` flavor of the path loop (7 tests); posix flavor unchanged.
- Converted `server/jobs.test.js` harness to Unix fakes; "command mode hands cmd.exe the command quoted and verbatim" renamed "command mode waits for approval" (cmd.exe assertions dropped; the Unix `/bin/sh -c` test is unchanged); `windowsVerbatimArguments` clause removed from the Unix command test; `taskkill` marker became `kill-tree`; `missing.exe` became `missing`.
- Converted `server/ramhogs.test.js` default OS to `linux` (`chrome.exe`/`svchost.exe`/`node.exe` rows became `chrome`/`systemd`/`node`; same grouping assertions).
- Converted `server/guard.test.js`: removed the `cleanupLegacyAutostart` fake; test renamed "guard delegates autostart when settings are saved" and its assertions on the legacy call removed.
- Converted `server/open-file.test.js`: shell-name regex now only rejects `sh`; non-media names became `run.sh`, `tool.bin`, `link.desktop`, `script.command`, `page.html`.
- Removed `skip: process.platform === 'win32'` in `server/killtree-unix.test.js`.
- Converted `ui/settings.test.js` duplicate-path test from win32 case folding to a Unix trailing-slash duplicate; renamed `ui/platform-ui.test.js` test title.

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | met | `git rm server/platform.win32.test.js`; `git ls-files` empty |
| A2 | met | D2 grep over `server ui scripts` prints only `server/guard.js:37` `out.exe = null` (HTTP field kept per scope fence; recorded in section 9) |
| A3 | met | Linux/darwin platform, UI and installer tests pass; no Unix assertion removed; setup dry-run exit 0 |
| A4 | met | `pnpm test` 299 tests, 0 fail; `node --check` clean |
| D1 (master) | met | Covers the P2 slice (platform.win32.test.js removed); P3 owns the rest |
| D2 (master) | met | Covers the P2 slice (`server`, `ui`, `scripts`); P3 owns templates, docs, skill, package.json; `out.exe` field is a noted exception |
| D3 (master) | met | Linux/darwin cases in platform, install, agents, init-config tests pass; setup dry-run from scratch copy exits 0 |
| D5 (master) | met | Covers the P2 slice: suite green, `node --check` clean; P3 owns `package.json` `os` |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|
| P2-1 | Plan assumed `createUnixPlatform` stays; it is now folded into `createPlatform` | note | none | Recorded in section 9 |
| P2-2 | `guard.js:37` and `hub.js:105` expose an `exe: null` HTTP field that the D2 `\.exe\b` grep matches (`out.exe`) | phase-amend | P3 | P3 D2 sweep should list `server/guard.js:37` as a recorded exception (or master amends the grep) |
| P2-3 | Windows-flavored non-grep names remain: `ramhogs.js` NAMES `vmmem`/`vmmemwsl` ("WSL / virtual machine") and `msedge`/`msedgewebview2` style keys; `janitor.js` `archiveOne` backslash/drive-letter regexes; `outputs.js` `guardPath`; `ui` and `server` `\\` handling | note | none | Left untouched per scope fence |
| P2-4 | Nothing built that no plan asked for; the `util.test.js` one-element `['posix']` loop is a minimal-diff leftover that could be flattened | note | none | none |
| P2-5 | P3 hazards: `README.md`, `docs/PLATFORMS.md`, `docs/ARCHITECTURE.md`, `docs/RENDER-SPEED.md` and `skill/` may still describe "Recycle Bin", "Start with Windows" (now "Start at login" in code comments only; UI label was not found in `ui/`) and `RenderGuard.exe`; `templates/`/`examples/` render.js keep `.exe` paths; `package.json` still lists win32 | next-phase-amend | P3 | P3 must run D2/D4/D6 greps in full |
| P2-6 | Earlier evidence suspect: the P1 closeout D2 grep covered `scripts` but earlier plan text said "`scripts` pass the D2 grep" — it only does now that `scripts/test.mjs` was cleaned | note | none | none |

**Master updates written:** none (coordinator owns master.md)
**Next-phase updates written:** none; see P2-2 and P2-5 for the coordinator to apply
**Remaining work and handoff:** P3 only: templates/examples render.js, README/CLAUDE.md/AGENTS.md/docs/skill, package.json `os`, final D1-D6 sweep including the `out.exe` exception.
