# Phase P1 — Green baseline

- Plan ID: `macos-verified-support`
- Phase: P1
- Plan version: 2
- Validated against master version: 14
- Status: done
- Approved by: Jorge Venegas
- Approved at: 2026-11-14
- Commit: 23de366
- Implementation mode: subagent
- Implemented by: sonnet-worker-p1
- Implemented at: 2026-11-14
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: none
- Written: 2026-11-14
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Make `pnpm test` pass with zero failures on this Mac before any macOS work, so every later phase has a clean baseline. The three current failures are repository housekeeping, not macOS defects: the retired Windows launchers `open.vbs` and `open.ps1` are still tracked even though `scripts/windows-safety.test.js` requires them to be gone, and the committed local agent-skill folders `.agents/` and `.claude/` (dot names, symlinks) are walked by two distribution tests that are meant to inspect only shipped files.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Removes the three baseline failures so the suite is green on this Mac | A1, A2, A3, A4 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L2 | `pnpm test` auto-installs on pnpm 11 and creates `pnpm-lock.yaml`/`node_modules/` | Entry, A1 and the standards check use `pnpm --config.verify-deps-before-run=false test`; A4 checks no lockfile or `node_modules/` is left |
| L1 | User requires pnpm for development and the product (scope-change, C4) | All P1 verification uses `pnpm test`; the npm → pnpm product migration (lockfile, installer, docs) is out of scope here and belongs to P7 |

## 3. Scope

In scope:
- Delete the tracked retired launchers `open.vbs` and `open.ps1` from the repository.
- Treat the local agent-skill folders `.agents` and `.claude` as local, non-shipped folders in the two distribution tests.

Out of scope:
- Changing `LEGACY_LAUNCHERS`, `retireLegacyAgent`, `scripts/windows-security.mjs` or the platform legacy-launcher recognizers; installed copies are still migrated by update.
- Adding a `.gitignore`, changing `scripts/make-upload.mjs` or `upload-rules.mjs`, or moving the skill folders.
- Any macOS platform change (P2 onward).
- The pnpm product migration: `package-lock.json`, `pnpm-lock.yaml`, `packageManager`, installer `npm ci`, docs (P7). P1 runs tests with `pnpm --config.verify-deps-before-run=false test`, which executes the existing `node scripts/test.mjs` without installing; plain `pnpm test` auto-installs on pnpm 11 and would create `pnpm-lock.yaml` and `node_modules/` (L2). P1 must leave neither behind.

## 4. Entry conditions

- [x] On branch `plan/macos-verified-support` with only plan files changed — verify: `git branch --show-current && git status --short`
- [x] pnpm is available — verify: `pnpm --version` (11.x on this Mac)
- [x] Baseline reproduces 3 failures — verify: `pnpm --config.verify-deps-before-run=false test 2>&1 | grep -E "^ℹ (pass|fail)"` → `pass 338`, `fail 3`
- [x] A real Node binary is first on PATH (C3) — verify: `node -e "console.log(process.execPath)"` prints a non-shim path
- [x] Phase plan revalidated against current master version (v14)
- [x] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — Remove the retired Windows launchers from source

- Depends on: none
- Files:
  - `open.vbs` (delete) — retired VBScript launcher; uses `-ExecutionPolicy Bypass`
  - `open.ps1` (delete) — retired PowerShell launcher
- Change: `git rm open.vbs open.ps1`. They are already absent from the install `ITEMS` list (`scripts/install.mjs:48`); `LEGACY_LAUNCHERS` keeps retiring them from existing installs, so nothing else changes.
- Acceptance:
  - [x] `scripts/windows-safety.test.js` "Windows clickable lifecycle entry points…" passes
  - [x] No source file outside tests, `LEGACY_LAUNCHERS`, `windows-security.mjs` and the platform legacy recognizers references them
- Verification: `node --test scripts/windows-safety.test.js` — expected: `fail 0`
- Rollback: `git checkout HEAD -- open.vbs open.ps1`

### S2 — Exclude local agent-skill folders from distribution walks

- Depends on: none
- Files:
  - `scripts/upload-rules.test.js` (modify) — `LOCAL` set
  - `scripts/distribution-safety.test.js` (modify) — `LOCAL` set
- Change: add `.agents` and `.claude` to each top-level `LOCAL` set, with a short comment that they hold local agent skills and are not part of VideoHub's distribution. Do not weaken any other rule (dot names, symlinks, `.app` directories, executable extensions still fail anywhere else).
- Acceptance:
  - [x] Both tests pass with the skill folders present
  - [x] A dot-named file or symlink placed anywhere else (e.g. a temporary `server/.probe` or `ui/link` symlink) still fails the respective test; remove the temporary file afterwards
- Verification: `node --test scripts/upload-rules.test.js scripts/distribution-safety.test.js` — expected: `fail 0`
- Rollback: `git checkout HEAD -- scripts/upload-rules.test.js scripts/distribution-safety.test.js`

## 6. Phase acceptance criteria

- [x] A1 — The full suite is green — verify: `pnpm --config.verify-deps-before-run=false test 2>&1 | grep -E "^ℹ (pass|fail)"` → `fail 0`
- [x] A2 — The distribution tests still reject dot files and symlinks outside the local folders — verify: temporary negative check from S2 fails as expected, then is removed (`git status --short` shows no leftover)
- [x] A4 — P1 leaves no pnpm install artifacts — verify: `git status --short` shows neither `pnpm-lock.yaml` nor `node_modules/`
- [x] A3 — Changed sources parse — verify: `node --check scripts/upload-rules.test.js && node --check scripts/distribution-safety.test.js`

## 7. Code standards check

- [x] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [x] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [x] Names and structure state intent; comments explain only non-obvious reasons
- [x] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [x] Master standards commands pass: format none, lint none, `node --check` on changed files, `pnpm --config.verify-deps-before-run=false test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Excluding `.claude` hides a future shipped file placed there | low | low | VideoHub ships its agent files from `claude/` and `skill/` (no dot); `ITEMS` in `scripts/install.mjs:48` decides what is installed |
| `__pycache__` from the planning scripts appears under `.agents/` | high | low | Excluded by the same `LOCAL` entry; coordinator keeps it out of commits via `.git/info/exclude` |
| A test relies on `open.vbs`/`open.ps1` existing in the source tree | low | medium | Full `pnpm test` run in A1 |
| `pnpm test` output format differs from `npm test` (pnpm prefixes its own lines) | low | low | Check the Node test-runner summary lines (`ℹ pass`, `ℹ fail`), not pnpm's own output |

## 9. Deviations and working notes

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

**Refinement round 1 — 2026-11-14**
- User request: "we must use pnpm"; scope confirmed as dev + product migration
- Level: master
- Sections changed: header versions, objective, prior discoveries (L1, L2), scope, entry conditions, acceptance A1 and new A4, traceability, code standards check, risks
- Versions: plan v1 -> v2; master v7 -> v12
- Product code: none
- Outcome: re-presented for approval

## 10. Closeout

Fill at the end of every implementation session. Do not mark the phase done until this section is complete and the master is updated. Set `Implemented by` to the worker name or ID and `Implemented at` to the implementation date; `close` requires both.

- Date: 2026-11-14
- Session: sonnet-worker-p1
- Verdict: addressed
- Steps complete: S1, S2
- Verification run: S1 `node --test scripts/windows-safety.test.js` fail 0 (pass 7); S2 `node --test scripts/upload-rules.test.js scripts/distribution-safety.test.js` fail 0 (pass 4); `node --check` on both changed files ok; full suite pass 341 / fail 0; negative probe (`server/.probe`, `ui/probe-link` symlink) made both distribution tests fail (fail 2), then removed.

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | met | `pnpm --config.verify-deps-before-run=false test` — pass 341, fail 0 |
| A2 | met | probe dot file and symlink outside LOCAL failed both tests (fail 2); removed, `git status --short` clean of leftovers |
| A3 | met | `node --check scripts/upload-rules.test.js && node --check scripts/distribution-safety.test.js` — ok |
| A4 | met | `git status --short` — no `pnpm-lock.yaml` or `node_modules/` |
| D1 (master) | met | full suite fail 0 on this Mac |

**Discovery sweep (five questions):** product code unchanged; no new constraint, no failed assumption, no cross-phase impact; one note below.

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|
| none | Remaining `open.vbs`/`open.ps1` references are README retirement note, `LEGACY_LAUNCHERS`, platform recognizers and tests, as scoped. Baseline was 341 tests (338 pass + 3 fail), not 342 | note | none | none |

**Master updates written:** none
**Next-phase updates written:** none
**Remaining work and handoff:** Coordinator records commit and closes P1; next phase P7.
