# Phase P2 — macOS platform fixes

- Plan ID: `macos-verified-support`
- Phase: P2
- Plan version: 1
- Validated against master version: 17
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
- Depends on: P7
- Written: 2026-11-14
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Fix the two macOS platform defects that real-hardware probes found and a Mac user would see (D2): the encoder note names no GPU because `gpuNames()` returns `[]` on macOS, and the Desktop `VideoHub.command` and LaunchAgent bake in Node's versioned `process.execPath`, which breaks after a Homebrew Node upgrade. After this phase the encoder result names the Apple GPU and launchers use a stable PATH Node when it is the same binary.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D2 | GPU name on macOS; stable launcher Node path for `.command` and LaunchAgent | A1, A2, A3, A4 |
| D1 | Suite stays green | A5 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L1 | pnpm for development and product | All test commands use `pnpm test` |
| L2 | `pnpm test` auto-install on pnpm 11 | Not applicable since P7: the lockfile exists; plain `pnpm test` is the standard command |
| L4 | `volumes()` has no macOS consumer; GPU name is user-visible (`ui/app.js:186`); stable Node rule: PATH `node` whose realpath equals `process.execPath` | Volume filtering removed from scope; S1 and S2 implement the GPU name and the stable Node rule |

## 3. Scope

In scope:
- macOS `gpuNames()` via `system_profiler SPDisplaysDataType -json`.
- A stable Node path for Unix `TOOLS.node` (used by the LaunchAgent) and for the macOS `VideoHub.command` written by setup/update.
- darwin and installer tests for both; a real-Mac probe.

Out of scope:
- `volumes()` filtering (L4), the Linux `.desktop` entry's `process.execPath`, Windows paths.
- Missing Windows-only exports on the Unix platform object (guarded by `IS_WIN`; note only).
- Any UI wording change.

## 4. Entry conditions

- [ ] P7 done, suite green — verify: `pnpm test 2>&1 | grep -E "^ℹ (pass|fail)"` → `fail 0`
- [ ] Real Mac available — verify: `uname -sm` → `Darwin arm64`
- [ ] Phase plan revalidated against current master version
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — Name the GPU on macOS

- Depends on: none
- Files:
  - `server/platform.js` (modify) — Unix `gpuNames()`
  - `server/platform.darwin.test.js` (modify) — GPU test
- Change: on macOS run `system_profiler SPDisplaysDataType -json` through the injected `run` and return the `_name` of each `SPDisplaysDataType` entry; return `[]` on a non-zero exit or unparsable output. Linux behavior unchanged. Return shape stays an array of strings.
- Acceptance:
  - [ ] darwin test: a fixture JSON with one GPU returns `["Apple M2 Max"]`; a failing command or bad JSON returns `[]`
- Verification: `node --test server/platform.darwin.test.js` — expected: `fail 0`
- Rollback: `git checkout HEAD -- server/platform.js server/platform.darwin.test.js`

### S2 — Use a stable Node path for macOS launchers

- Depends on: none
- Files:
  - `server/platform.js` (modify) — Unix `TOOLS.node`
  - `scripts/install.mjs` (modify) — the macOS `VideoHub.command` text uses `platform.TOOLS.node` instead of `process.execPath`
  - `server/platform.darwin.test.js` (modify) — stable-path tests
  - `scripts/install.test.js` (modify) — `.command` uses the platform's Node path
- Change: in the Unix platform, `TOOLS.node` is the first `node` found on the existing `toolDirs` whose `fs.realpathSync` equals `fs.realpathSync(nodePath)`; otherwise `nodePath`. A version-manager shim (realpath differs) is therefore never chosen. The LaunchAgent already uses `TOOLS.node`; the `.command` switches to it. Handle a missing `realpathSync` or errors by falling back to `nodePath`.
- Acceptance:
  - [ ] darwin test: PATH `node` symlinked to the running binary → that PATH path; a shim with a different realpath → `nodePath`; LaunchAgent `ProgramArguments` uses the chosen path
  - [ ] installer test: macOS `VideoHub.command` execs the platform's `TOOLS.node`
- Verification: `node --test server/platform.darwin.test.js scripts/install.test.js` — expected: `fail 0`
- Rollback: `git checkout HEAD -- server/platform.js scripts/install.mjs server/platform.darwin.test.js scripts/install.test.js`

### S3 — Probe on the real Mac

- Depends on: S1, S2
- Files:
  - none in the repository (probe script lives in `/private/tmp/claude-501/-Users-jorge-code-Videohub/cc9a790e-198c-4e91-851b-bc3b9a38df27/scratchpad/p2-probe.mjs`)
- Change: read-only probe importing `server/platform.js`: print `gpuNames()` and `TOOLS.node` (a) with the normal PATH (asdf: expect the versioned execPath, because the shim's realpath differs) and (b) with `PATH=/private/tmp/claude-501/-Users-jorge-code-Videohub/cc9a790e-198c-4e91-851b-bc3b9a38df27/scratchpad/p2bin:$PATH` where `/private/tmp/claude-501/-Users-jorge-code-Videohub/cc9a790e-198c-4e91-851b-bc3b9a38df27/scratchpad/p2bin/node` is a symlink to `process.execPath` (expect `/private/tmp/claude-501/-Users-jorge-code-Videohub/cc9a790e-198c-4e91-851b-bc3b9a38df27/scratchpad/p2bin/node`). Set `VIDEOHUB_DATA_DIR` to a scratchpad folder so nothing is written into the repo.
- Acceptance:
  - [ ] (a) GPU list contains `Apple M2 Max`; (b) `TOOLS.node` is the scratch symlink path
- Verification: `node /private/tmp/claude-501/-Users-jorge-code-Videohub/cc9a790e-198c-4e91-851b-bc3b9a38df27/scratchpad/p2-probe.mjs` output recorded in the closeout; `git status --short` shows no new repo files
- Rollback: delete the probe script

## 6. Phase acceptance criteria

- [ ] A1 — macOS `gpuNames()` returns the GPU names from `system_profiler`, `[]` on failure — verify: S1 darwin tests
- [ ] A2 — Unix `TOOLS.node` prefers a PATH Node with the same realpath, never a shim — verify: S2 darwin tests
- [ ] A3 — macOS `VideoHub.command` and LaunchAgent use that path — verify: S2 installer and darwin tests
- [ ] A4 — Real Mac shows `Apple M2 Max` and the stable-path rule — verify: S3 probe output
- [ ] A5 — Full suite and syntax pass — verify: `pnpm test` → `fail 0`; `node --check` on changed files

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [ ] Names and structure state intent; comments explain only non-obvious reasons
- [ ] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [ ] Master standards commands pass: format none, lint none, `node --check` on changed files, `pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| `system_profiler` is slow (about 1 s) | medium | low | Called only during encoder detection, which is cached |
| Injected test `fs` lacks `realpathSync` | high | low | Extend the darwin harness; production falls back to `nodePath` on error |
| Homebrew Node is not installed on this Mac, so (b) uses a symlink simulation | high | low | The rule depends only on realpath equality, which the simulation exercises with the real filesystem |
| `TOOLS.node` is also used by render jobs (`server/jobs.js:253,254,303`) and `server/soundedit.js:69` on Linux and macOS | medium | low | The chosen path has the same realpath, so the same binary runs; full suite and P4 render confirm |

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
