# Phase P1 — Green baseline

- Plan ID: `macos-verified-support`
- Phase: P1
- Plan version: 1
- Validated against master version: 7
- Status: draft
- Approved by: pending
- Approved at: pending
- Commit: pending
- Implementation mode: subagent
- Implemented by: pending
- Implemented at: pending
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: none
- Written: 2026-11-14
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Make `npm test` pass with zero failures on this Mac before any macOS work, so every later phase has a clean baseline. The three current failures are repository housekeeping, not macOS defects: the retired Windows launchers `open.vbs` and `open.ps1` are still tracked even though `scripts/windows-safety.test.js` requires them to be gone, and the committed local agent-skill folders `.agents/` and `.claude/` (dot names, symlinks) are walked by two distribution tests that are meant to inspect only shipped files.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Removes the three baseline failures so the suite is green on this Mac | A1, A2, A3 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| None | The discovery ledger has no rows yet (`discoveries` returns none) | No change |

## 3. Scope

In scope:
- Delete the tracked retired launchers `open.vbs` and `open.ps1` from the repository.
- Treat the local agent-skill folders `.agents` and `.claude` as local, non-shipped folders in the two distribution tests.

Out of scope:
- Changing `LEGACY_LAUNCHERS`, `retireLegacyAgent`, `scripts/windows-security.mjs` or the platform legacy-launcher recognizers; installed copies are still migrated by update.
- Adding a `.gitignore`, changing `scripts/make-upload.mjs` or `upload-rules.mjs`, or moving the skill folders.
- Any macOS platform change (P2 onward).

## 4. Entry conditions

- [ ] On branch `plan/macos-verified-support` with only plan files changed — verify: `git branch --show-current && git status --short`
- [ ] Baseline reproduces 3 failures — verify: `npm test 2>&1 | grep -E "^ℹ (pass|fail)"` → `pass 338`, `fail 3`
- [ ] A real Node binary is first on PATH (C3) — verify: `node -e "console.log(process.execPath)"` prints a non-shim path
- [ ] Phase plan revalidated against current master version
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — Remove the retired Windows launchers from source

- Depends on: none
- Files:
  - `open.vbs` (delete) — retired VBScript launcher; uses `-ExecutionPolicy Bypass`
  - `open.ps1` (delete) — retired PowerShell launcher
- Change: `git rm open.vbs open.ps1`. They are already absent from the install `ITEMS` list (`scripts/install.mjs:48`); `LEGACY_LAUNCHERS` keeps retiring them from existing installs, so nothing else changes.
- Acceptance:
  - [ ] `scripts/windows-safety.test.js` "Windows clickable lifecycle entry points…" passes
  - [ ] No source file outside tests, `LEGACY_LAUNCHERS`, `windows-security.mjs` and the platform legacy recognizers references them
- Verification: `node --test scripts/windows-safety.test.js` — expected: `fail 0`
- Rollback: `git checkout HEAD -- open.vbs open.ps1`

### S2 — Exclude local agent-skill folders from distribution walks

- Depends on: none
- Files:
  - `scripts/upload-rules.test.js` (modify) — `LOCAL` set
  - `scripts/distribution-safety.test.js` (modify) — `LOCAL` set
- Change: add `.agents` and `.claude` to each top-level `LOCAL` set, with a short comment that they hold local agent skills and are not part of VideoHub's distribution. Do not weaken any other rule (dot names, symlinks, `.app` directories, executable extensions still fail anywhere else).
- Acceptance:
  - [ ] Both tests pass with the skill folders present
  - [ ] A dot-named file or symlink placed anywhere else (e.g. a temporary `server/.probe` or `ui/link` symlink) still fails the respective test; remove the temporary file afterwards
- Verification: `node --test scripts/upload-rules.test.js scripts/distribution-safety.test.js` — expected: `fail 0`
- Rollback: `git checkout HEAD -- scripts/upload-rules.test.js scripts/distribution-safety.test.js`

## 6. Phase acceptance criteria

- [ ] A1 — The full suite is green — verify: `npm test 2>&1 | grep -E "^ℹ (pass|fail)"` → `fail 0`
- [ ] A2 — The distribution tests still reject dot files and symlinks outside the local folders — verify: temporary negative check from S2 fails as expected, then is removed (`git status --short` shows no leftover)
- [ ] A3 — Changed sources parse — verify: `node --check scripts/upload-rules.test.js && node --check scripts/distribution-safety.test.js`

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [ ] Names and structure state intent; comments explain only non-obvious reasons
- [ ] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [ ] Master standards commands pass: format none, lint none, `node --check` on changed files, `npm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Excluding `.claude` hides a future shipped file placed there | low | low | VideoHub ships its agent files from `claude/` and `skill/` (no dot); `ITEMS` in `scripts/install.mjs:48` decides what is installed |
| `__pycache__` from the planning scripts appears under `.agents/` | high | low | Excluded by the same `LOCAL` entry; coordinator keeps it out of commits via `.git/info/exclude` |
| A test relies on `open.vbs`/`open.ps1` existing in the source tree | low | medium | Full `npm test` run in A1 |

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
| A1 | met / partial / not met / deferred | `<command>` — <result> |
| D1 (master) | met / partial / not met / deferred | `<command>` — <result> |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|

**Master updates written:** <version bump, ledger rows, phase map changes, or none>
**Next-phase updates written:** <phase ID, plan version, sections changed, or none>
**Remaining work and handoff:** <what the next session must do first>
