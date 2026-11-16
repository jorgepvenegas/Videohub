# Phase P6 — Docs verified status

- Plan ID: `macos-verified-support`
- Phase: P6
- Plan version: 1
- Validated against master version: 32
- Status: in_progress
- Approved by: Jorge Venegas (standing instruction C6)
- Approved at: 2026-11-15
- Commit: pending
- Implementation mode: subagent
- Implemented by: sonnet-worker-p6
- Implemented at: 2026-11-15
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: P5
- Written: 2026-11-15
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Make the documentation tell the truth established by P1–P5 (D7): macOS on Apple Silicon is verified on real hardware (macOS 26.6, M2 Max) for install, live preview and notes, rendering with VideoToolbox, render protection, Stop, Finder Trash, login startup, update, uninstall and Claude Code integration; Intel macOS and Linux remain pending; pnpm is the package manager and its Windows install path is verified only by tests. Replace claims the real Mac disproved (Gatekeeper prompt for the generated launcher, Trash failing only on Automation permission) and add the caveats the Mac revealed.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D7 | Verified status, pending platforms, pnpm requirement, new macOS limits in PLATFORMS/README/CLAUDE (and the setup message) | A1, A2, A3, A4 |
| D1 | Suite green after the setup-message change | A5 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L1 | pnpm for development and product | Requirement rows already say pnpm (P7); A3 re-checks |
| L5 | Windows pnpm install covered only by injected tests | PLATFORMS states Windows pnpm install is test-verified, real Windows check pending |
| L7 | Setup ignores `--workspace` with a pre-existing config; writes port 7788 | Not applicable to docs beyond the existing README "Port 7788 is taken → set port in config" line, which already matches; no change |
| L9 | No Gatekeeper prompt for the setup-generated `VideoHub.command` | S1–S3 reword: generated locally, normally opens without a prompt; Open Anyway only if macOS does block it; S4 adjusts the setup message |
| L11 | Stop orphaned relaunched Chrome; fixed by stopping the root first | PLATFORMS "Render tree stop" macOS/Linux cells describe the new sequence |
| L12 | Two Chrome helpers can keep normal niceness in slow mode; niceness not restored without privileges | PLATFORMS macOS limits mention both |
| L14 | Finder Trash always failed; fixed; error now reports Finder's message | PLATFORMS/README Trash text: fixed behavior; Automation prompt only on -1743 |
| L15 | Update does not restart a LaunchAgent-started hub | PLATFORMS/README: after updating on macOS, open VideoHub or log in again |

## 3. Scope

In scope:
- `docs/PLATFORMS.md`, `README.md`, `CLAUDE.md` wording and status; `docs/RENDER-SPEED.md` gets one measured macOS line; the macOS setup log line in `scripts/install.mjs` (and any test asserting it).

Out of scope:
- Linux verification, Intel macOS, Windows real-machine checks; behavior changes; translating or restructuring docs; `docs/plans/**`.

## 4. Entry conditions

- [x] P5 done; suite green — verify: `pnpm test` → `fail 0`
- [x] Phase plan revalidated against current master version
- [x] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — PLATFORMS.md: verified macOS column and new limits

- Depends on: none
- Files:
  - `docs/PLATFORMS.md` (modify) — intro, table macOS cells, macOS permissions section, real-machine acceptance section
- Change: intro says macOS is verified on Apple Silicon (macOS 26.6, 2026-11-15) and Linux plus Intel macOS remain unverified on real machines. macOS table cells that were "verification pending" become verified; Trash cell describes the alias-based Finder script; Render tree stop (Linux and macOS) describes freezing the render root before terminating its tree; Autostart notes update does not restart the hub; Install row notes pnpm, with Windows pnpm install verified by tests only. Permissions section: launcher normally opens without a Gatekeeper prompt because setup creates it locally; Open Anyway only if macOS does block it; Automation prompt may appear on first Trash use; slow mode caveats (L12). Acceptance section: macOS Apple Silicon list marked done with the date; Linux and Intel items remain.
- Acceptance:
  - [x] No "verification pending" remains in a macOS cell; Linux cells unchanged except the shared Stop description
- Verification: `grep -n -i "pending\|unverified\|not yet tested" docs/PLATFORMS.md`
- Result: done. grep leaves lines 3 (intro), 9 (Linux cell) and 70 (acceptance section), none a macOS cell.
- Rollback: `git checkout HEAD -- docs/PLATFORMS.md`

### S2 — README.md: status line and macOS troubleshooting

- Depends on: S1
- Files:
  - `README.md` (modify) — banner line 6, hardware encoders line 43, requirements macOS row 54, launcher paragraph 73, troubleshooting lines 141–142
- Change: banner says macOS (Apple Silicon) verified, Linux and Intel macOS new and not yet tested on real machines; encoder line notes VideoToolbox measured on Apple Silicon; requirements row drops "Apple Silicon and Intel code paths need hardware verification" in favor of "verified on Apple Silicon; Intel unverified"; launcher and troubleshooting text match L9/L14/L15.
- Acceptance:
  - [x] README and PLATFORMS make the same claims
- Verification: `grep -n -i "macOS" README.md`
- Result: done. Banner, encoder line, requirements row, launcher paragraph and troubleshooting updated; added an update-restart troubleshooting bullet.
- Rollback: `git checkout HEAD -- README.md`

### S3 — CLAUDE.md: agent instructions

- Depends on: S1
- Files:
  - `CLAUDE.md` (modify) — line 3 status sentence, line 15 macOS paragraph, "Linux/macOS desktop and rendering acceptance still requires real hardware" sentence
- Change: status: macOS verified on Apple Silicon; Linux and Intel macOS not yet tested on real machines. macOS paragraph: launcher normally opens without a prompt; Open Anyway only if blocked; Finder may ask for Automation permission; after an update with login startup, open VideoHub to restart the hub. Acceptance sentence: Linux and Intel macOS still require real hardware.
- Acceptance:
  - [x] CLAUDE.md consistent with PLATFORMS and README
- Verification: `grep -n -i "macOS\|real hardware" CLAUDE.md`
- Result: done. Status sentence, macOS paragraph and acceptance sentence updated.
- Rollback: `git checkout HEAD -- CLAUDE.md`

### S4 — Setup message and render-speed note

- Depends on: S1
- Files:
  - `scripts/install.mjs` (modify) — the macOS `VideoHub.command` log line
  - `scripts/install.test.js` (modify only if a test asserts that text)
  - `docs/RENDER-SPEED.md` (modify) — one measured macOS line
- Change: setup line becomes: the Desktop `VideoHub.command` opens Terminal briefly; if macOS ever blocks it, use Open Anyway in Privacy & Security. RENDER-SPEED adds: Apple Silicon M2 Max, `h264_videotoolbox`, example film 300 frames encoded in 3.9 s (job total 5 s), 2026-11-15; other macOS hardware unmeasured.
- Acceptance:
  - [x] Setup output wording updated; tests pass
- Verification: `node --check scripts/install.mjs`; `pnpm test`
- Result: done. `node --check` ok; install.test.js asserts only `/VideoHub\.command/`, so no test change; `pnpm test` fail 0 (after moving a stray ignored root `.DS_Store`, see discoveries).
- Rollback: `git checkout HEAD -- scripts/install.mjs scripts/install.test.js docs/RENDER-SPEED.md`

## 6. Phase acceptance criteria

- [x] A1 — PLATFORMS.md reports macOS Apple Silicon verified, Linux/Intel pending, and the L9/L11/L12/L14/L15 behaviors — verify: S1 grep and review
- [x] A2 — README.md matches PLATFORMS.md — verify: S2 grep
- [x] A3 — CLAUDE.md matches and still lists pnpm in requirements — verify: `grep -n "pnpm" CLAUDE.md README.md`
- [x] A4 — No doc claims the generated launcher is normally blocked or that Trash failures are always Automation permission — verify: `grep -rn -i "blocks its first\|blocked first launch\|Allow Finder Automation permission and try again" README.md CLAUDE.md docs scripts/install.mjs --exclude-dir=plans`
- [x] A5 — Suite green — verify: `pnpm test` → `fail 0`; `node --check scripts/install.mjs`

## 7. Code standards check

- [x] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [x] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [x] Names and structure state intent; comments explain only non-obvious reasons
- [x] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [x] Master standards commands pass: format none, lint none, `node --check` on changed files, `pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Overclaiming: one Mac and one macOS version verified | medium | medium | Docs name the machine class, macOS version and date; Intel and other versions stay unverified |
| Docs drift between PLATFORMS, README and CLAUDE | medium | low | A2/A3 cross-check |
| A downloaded archive could still be quarantined and block a double-clicked script | low | low | Keep the Open Anyway fallback sentence |

## 9. Deviations and working notes

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

## 10. Closeout

Fill at the end of every implementation session. Do not mark the phase done until this section is complete and the master is updated. Set `Implemented by` to the worker name or ID and `Implemented at` to the implementation date; `close` requires both.

- Date: 2026-11-15
- Session: sonnet-worker-p6
- Verdict: addressed
- Steps complete: S1, S2, S3, S4
- Verification run: PLATFORMS pending grep; `grep -n "pnpm" CLAUDE.md README.md`; A4 grep; `node --check scripts/install.mjs`; `pnpm test` → 350 tests, 348 pass, 0 fail, 2 skipped; staged diff scan for private paths

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | met | PLATFORMS: intro, macOS live-preview/Trash/Stop/Autostart/Install/launcher/encoder cells and permissions text updated; L9, L11, L12, L14, L15 present; pending grep leaves only Linux cell, intro and acceptance text |
| A2 | met | README banner, encoder line, requirements row, launcher paragraph and troubleshooting carry the same claims |
| A3 | met | `grep -n "pnpm" CLAUDE.md README.md` → 8 lines including CLAUDE.md requirements |
| A4 | met | A4 grep over README, CLAUDE, docs (excl. plans), install.mjs → no output |
| A5 | met | `pnpm test` fail 0 (348 pass, 2 skipped); `node --check scripts/install.mjs` ok |
| D7 (master) | met | A1, A2, A3, A4 |
| D1 (master) | met | A5 |

**Discovery sweep:** (1) Wrong assumption: none. (2) New constraint: none beyond L1-L15. (3) Unplanned work: none; README gained one troubleshooting bullet for L15. (4) Next phase: none. (5) Suspect evidence: a Finder-created ignored `.DS_Store` in the repo root failed `upload-rules.test.js`; moved out of the repo.

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|
| L16 | Finder creates an ignored `.DS_Store` in the repo root; `upload-rules.test.js` walks the root and fails on it, so `pnpm test` is red on a Mac after browsing the folder | note | later sessions on macOS | Moved the file out of the repo to get green; test left unchanged (out of scope) |

**Master updates written:** none (coordinator to add L16 and record the commit)
**Next-phase updates written:** none
**Remaining work and handoff:** Coordinator records the commit and closes P6. Linux, Intel macOS, other macOS versions, a real OpenCode session and real Windows pnpm install remain unverified and are stated as such in the docs.
