# Phase P6 — Docs verified status

- Plan ID: `macos-verified-support`
- Phase: P6
- Plan version: 1
- Validated against master version: 32
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

- [ ] P5 done; suite green — verify: `pnpm test` → `fail 0`
- [ ] Phase plan revalidated against current master version
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — PLATFORMS.md: verified macOS column and new limits

- Depends on: none
- Files:
  - `docs/PLATFORMS.md` (modify) — intro, table macOS cells, macOS permissions section, real-machine acceptance section
- Change: intro says macOS is verified on Apple Silicon (macOS 26.6, 2026-11-15) and Linux plus Intel macOS remain unverified on real machines. macOS table cells that were "verification pending" become verified; Trash cell describes the alias-based Finder script; Render tree stop (Linux and macOS) describes freezing the render root before terminating its tree; Autostart notes update does not restart the hub; Install row notes pnpm, with Windows pnpm install verified by tests only. Permissions section: launcher normally opens without a Gatekeeper prompt because setup creates it locally; Open Anyway only if macOS does block it; Automation prompt may appear on first Trash use; slow mode caveats (L12). Acceptance section: macOS Apple Silicon list marked done with the date; Linux and Intel items remain.
- Acceptance:
  - [ ] No "verification pending" remains in a macOS cell; Linux cells unchanged except the shared Stop description
- Verification: `grep -n -i "pending\|unverified\|not yet tested" docs/PLATFORMS.md`
- Rollback: `git checkout HEAD -- docs/PLATFORMS.md`

### S2 — README.md: status line and macOS troubleshooting

- Depends on: S1
- Files:
  - `README.md` (modify) — banner line 6, hardware encoders line 43, requirements macOS row 54, launcher paragraph 73, troubleshooting lines 141–142
- Change: banner says macOS (Apple Silicon) verified, Linux and Intel macOS new and not yet tested on real machines; encoder line notes VideoToolbox measured on Apple Silicon; requirements row drops "Apple Silicon and Intel code paths need hardware verification" in favor of "verified on Apple Silicon; Intel unverified"; launcher and troubleshooting text match L9/L14/L15.
- Acceptance:
  - [ ] README and PLATFORMS make the same claims
- Verification: `grep -n -i "macOS" README.md`
- Rollback: `git checkout HEAD -- README.md`

### S3 — CLAUDE.md: agent instructions

- Depends on: S1
- Files:
  - `CLAUDE.md` (modify) — line 3 status sentence, line 15 macOS paragraph, "Linux/macOS desktop and rendering acceptance still requires real hardware" sentence
- Change: status: macOS verified on Apple Silicon; Linux and Intel macOS not yet tested on real machines. macOS paragraph: launcher normally opens without a prompt; Open Anyway only if blocked; Finder may ask for Automation permission; after an update with login startup, open VideoHub to restart the hub. Acceptance sentence: Linux and Intel macOS still require real hardware.
- Acceptance:
  - [ ] CLAUDE.md consistent with PLATFORMS and README
- Verification: `grep -n -i "macOS\|real hardware" CLAUDE.md`
- Rollback: `git checkout HEAD -- CLAUDE.md`

### S4 — Setup message and render-speed note

- Depends on: S1
- Files:
  - `scripts/install.mjs` (modify) — the macOS `VideoHub.command` log line
  - `scripts/install.test.js` (modify only if a test asserts that text)
  - `docs/RENDER-SPEED.md` (modify) — one measured macOS line
- Change: setup line becomes: the Desktop `VideoHub.command` opens Terminal briefly; if macOS ever blocks it, use Open Anyway in Privacy & Security. RENDER-SPEED adds: Apple Silicon M2 Max, `h264_videotoolbox`, example film 300 frames encoded in 3.9 s (job total 5 s), 2026-11-15; other macOS hardware unmeasured.
- Acceptance:
  - [ ] Setup output wording updated; tests pass
- Verification: `node --check scripts/install.mjs`; `pnpm test`
- Rollback: `git checkout HEAD -- scripts/install.mjs scripts/install.test.js docs/RENDER-SPEED.md`

## 6. Phase acceptance criteria

- [ ] A1 — PLATFORMS.md reports macOS Apple Silicon verified, Linux/Intel pending, and the L9/L11/L12/L14/L15 behaviors — verify: S1 grep and review
- [ ] A2 — README.md matches PLATFORMS.md — verify: S2 grep
- [ ] A3 — CLAUDE.md matches and still lists pnpm in requirements — verify: `grep -n "pnpm" CLAUDE.md README.md`
- [ ] A4 — No doc claims the generated launcher is normally blocked or that Trash failures are always Automation permission — verify: `grep -rn -i "blocks its first\|blocked first launch\|Allow Finder Automation permission and try again" README.md CLAUDE.md docs scripts/install.mjs --exclude-dir=plans`
- [ ] A5 — Suite green — verify: `pnpm test` → `fail 0`; `node --check scripts/install.mjs`

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [ ] Names and structure state intent; comments explain only non-obvious reasons
- [ ] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [ ] Master standards commands pass: format none, lint none, `node --check` on changed files, `pnpm test`

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
