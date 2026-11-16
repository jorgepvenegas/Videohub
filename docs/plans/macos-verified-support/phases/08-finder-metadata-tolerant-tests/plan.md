# Phase P8 — Finder metadata tolerant tests

- Plan ID: `macos-verified-support`
- Phase: P8
- Plan version: 1
- Validated against master version: 34
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
- Depends on: P6
- Written: 2026-11-15
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Keep the suite green on a Mac where the repository folder has been opened in Finder (D1). Finder writes `.DS_Store` files; `scripts/upload-rules.test.js` walks the working tree and fails on any dot name. Those files are never shipped: `scripts/make-upload.mjs` builds the upload from `git archive` (tracked files only) and still refuses a committed dot file. The test should ignore Finder metadata and keep rejecting every other dot name.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Suite passes with Finder metadata present | A1, A2 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L1 | pnpm for development and product | Tests run with `pnpm test` |
| L17 | Finder `.DS_Store` fails the upload-rules test | Defines S1 |

## 3. Scope

In scope:
- Skip `.DS_Store` entries in the working-tree walk of `scripts/upload-rules.test.js`.

Out of scope:
- Adding a `.gitignore`, changing `upload-rules.mjs` or `make-upload.mjs`, other Finder files (`._*` AppleDouble files only appear on non-APFS volumes; report if seen).

## 4. Entry conditions

- [ ] P6 done; suite green without `.DS_Store` — verify: `pnpm test` → `fail 0`
- [ ] Phase plan revalidated against current master version
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — Ignore Finder metadata in the dot-name walk

- Depends on: none
- Files:
  - `scripts/upload-rules.test.js` (modify) — the walk in "no file VideoHub needs starts with a dot"
- Change: skip entries named `.DS_Store` at any depth, with a short comment that Finder creates them, they are untracked, and `make-upload` ships tracked files only.
- Acceptance:
  - [ ] With a `.DS_Store` at the repo root and in `docs/`, the test passes; with `server/.probe`, it still fails; temporary files removed afterwards
- Verification: `node --test scripts/upload-rules.test.js` in each case; `git status --short` clean of probes
- Rollback: `git checkout HEAD -- scripts/upload-rules.test.js`

## 6. Phase acceptance criteria

- [ ] A1 — `.DS_Store` files no longer fail the suite — verify: S1 positive case and `pnpm test` → `fail 0` with a root `.DS_Store` present
- [ ] A2 — Other dot names still fail the test — verify: S1 negative case

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [ ] Names and structure state intent; comments explain only non-obvious reasons
- [ ] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [ ] Master standards commands pass: format none, lint none, `node --check` on changed files, `pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| A committed `.DS_Store` slips past the test | low | low | `make-upload.mjs` still rejects tracked dot files; `git status` shows them before commit |

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
