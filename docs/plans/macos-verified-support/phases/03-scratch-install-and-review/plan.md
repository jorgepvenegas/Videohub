# Phase P3 — Scratch install and review

- Plan ID: `macos-verified-support`
- Phase: P3
- Plan version: 1
- Validated against master version: 18
- Status: draft
- Approved by: pending
- Approved at: pending
- Commit: pending
- Implementation mode: subagent (S1–S3 and any fix steps); S4 is a user walkthrough run by the coordinator, no product code
- Implemented by: pending
- Implemented at: pending
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: P2
- Written: 2026-11-15
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Prove on the real Mac that a user can install VideoHub with `bash setup.sh`, open it from the Desktop `VideoHub.command`, see the example film in live preview, leave a note, pick a folder with the macOS dialog and reveal a file in Finder (D3). The scratch install follows C2/C8: program at `/Users/jorge/VideoHubScratch/install`, workspace at `/Users/jorge/VideoHubScratch/workspace`, port 7799, Claude Code registration only, no global rule. Defects found here are fixed inside this phase when the fix is targeted; larger ones become new phases. No render happens in P3.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D3 | Real-account setup, launcher, live preview, notes, folder picker, Finder reveal | A1, A2, A3, A4 |
| D2 | Confirms the generated `VideoHub.command` uses the stable Node rule on real disk | A2 |
| D8 | First real pnpm-based setup on macOS | A1 |
| D1 | Suite green after any fix | A5 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L1 | pnpm for development and product | S2 needs pnpm on PATH; setup runs `pnpm install --frozen-lockfile` |

C8 (decision, not a ledger row) sets the agent, launcher and port choices used in S1–S2.

## 3. Scope

In scope:
- Creating, configuring and exercising the scratch install and workspace listed above.
- A user walkthrough of the visible checks (S4).
- Targeted fixes for macOS defects that block A1–A4, each added to this plan as a `phase-amend` step before it is implemented.

Out of scope:
- Rendering, render protection and the queue (P4); Trash, LaunchAgent, update, uninstall, agent session check (P5); docs status (P6).
- Any change to the user's real workspace, films, `~/.claude/CLAUDE.md`, or OpenCode configuration.
- Removing the scratch install (P5 does it).

## 4. Entry conditions

- [ ] P2 done; suite green — verify: `pnpm test 2>&1 | grep -E "^ℹ (pass|fail)"` → `fail 0`
- [ ] No other VideoHub on the account — verify: `lsof -nP -iTCP:7788 -iTCP:7799 -sTCP:LISTEN` empty; no `~/Desktop/VideoHub.command`; `claude mcp list` has no `videohub`
- [ ] `/Users/jorge/VideoHubScratch` does not exist yet — verify: `test ! -e /Users/jorge/VideoHubScratch`
- [ ] Phase plan revalidated against current master version
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — Create the scratch install from the committed tree

- Depends on: none
- Files:
  - none in the repository (creates `/Users/jorge/VideoHubScratch/install` and `/Users/jorge/VideoHubScratch/install/data/config.json`)
- Change: `mkdir -p /Users/jorge/VideoHubScratch/install && git archive HEAD | tar -x -C /Users/jorge/VideoHubScratch/install`, then write `{"port": 7799}` to `/Users/jorge/VideoHubScratch/install/data/config.json` so every launcher and CLI of this install uses 7799.
- Acceptance:
  - [ ] The install contains `setup.sh`, `pnpm-lock.yaml`, `server/hub.js`; `data/config.json` has port 7799
- Verification: `ls /Users/jorge/VideoHubScratch/install && cat /Users/jorge/VideoHubScratch/install/data/config.json`
- Rollback: `rm -rf /Users/jorge/VideoHubScratch` (only this folder; P5 normally removes it through uninstall)

### S2 — Run setup with the recorded answers

- Depends on: S1
- Files:
  - none in the repository
- Change: from `/Users/jorge/VideoHubScratch/install` run `bash setup.sh --dry-run` with the answers below, read it, then run it for real: `bash setup.sh --workspace "/Users/jorge/VideoHubScratch/workspace" --agents claude --watch-found no --gpu-encoder yes --global-rule no --shortcut yes --startup no --example yes`. Record the full output.
- Acceptance:
  - [ ] Exit 0; `pnpm install --frozen-lockfile` ran; `data/config.json` still has port 7799 plus the workspace
  - [ ] `~/Desktop/VideoHub.command` exists, is executable, names this install and execs the stable Node path (asdf here: the versioned path) — content recorded
  - [ ] `claude mcp list` shows the videohub server pointing at this install; `~/.claude/CLAUDE.md` unchanged (checksum before/after)
  - [ ] Workspace has films/outputs/sounds/thumbnails/archive and the example film
- Verification: setup output; `cat ~/Desktop/VideoHub.command`; `xattr ~/Desktop/VideoHub.command`; `claude mcp list`; `shasum ~/.claude/CLAUDE.md` before/after; `ls /Users/jorge/VideoHubScratch/workspace /Users/jorge/VideoHubScratch/workspace/films`
- Rollback: `bash /Users/jorge/VideoHubScratch/install/uninstall.sh` (dry-run first), then `rm -rf /Users/jorge/VideoHubScratch`

### S3 — Automated hub checks on port 7799

- Depends on: S2
- Files:
  - none in the repository
- Change: from the install, start the server only (`bash open.sh --server`), then with `VIDEOHUB_PORT=7799` run `node server/cli.js hub_workspace` and `hub_project` for the example, fetch `http://127.0.0.1:7799/` and the capabilities/settings endpoints, and check the encoder result names `Apple M2 Max` (D2 on real install). Record outputs. Leave the server running for S4.
- Acceptance:
  - [ ] `hub_workspace` prints the scratch workspace; `hub_project` finds the example; the UI root returns 200
- Verification: command outputs recorded in the closeout
- Rollback: stop the server (`node scripts/install.mjs stop` from the install)

### S4 — User walkthrough (coordinator with the user)

- Depends on: S3
- Files:
  - none in the repository
- Change: the coordinator asks the user to: (1) double-click `~/Desktop/VideoHub.command` and report whether Terminal opens, whether macOS shows any Gatekeeper prompt, and whether the hub opens in a Chrome app window; (2) open the example card and play it in live preview (`hub_live`), then leave a note on a frame; (3) Settings → pick a folder with the macOS folder dialog, and cancel once; (4) reveal a file in Finder from the UI. The coordinator verifies the note with `hub_notes` on port 7799 and records each answer verbatim.
- Acceptance:
  - [ ] Each of (1)–(4) reported working, or reported as a defect with exact symptoms
- Verification: user reports + `VIDEOHUB_PORT=7799 node server/cli.js hub_notes <example>` shows the note
- Rollback: none needed (read-only for the repo)

## 6. Phase acceptance criteria

- [ ] A1 — `bash setup.sh` installs the scratch copy with pnpm, Claude Code integration only, and the recorded answers — verify: S2 evidence
- [ ] A2 — The Desktop `VideoHub.command` opens the hub; its Node path follows the stable rule; Gatekeeper behavior is recorded — verify: S2 content + S4 (1)
- [ ] A3 — The example plays in live preview and a note is saved — verify: S4 (2) + `hub_notes`
- [ ] A4 — macOS folder dialog and Finder reveal work from the UI — verify: S4 (3), (4)
- [ ] A5 — If any repository fix was made, the full suite passes and changed files pass `node --check` — verify: `pnpm test` → `fail 0`, or "no repo change" with `git status --short`

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [ ] Names and structure state intent; comments explain only non-obvious reasons
- [ ] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [ ] Master standards commands pass: format none, lint none, `node --check` on changed files, `pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Setup's real `claude mcp add` changes the user's Claude Code profile | certain | low | Approved by C8; P5 uninstall removes only owned entries; `claude mcp list` before/after recorded |
| `data/config.json` port is rewritten by setup | low | medium | S2 checks port 7799 after setup; if lost, stop and amend |
| Gatekeeper never prompts for a locally generated `.command` (no quarantine attribute), so the documented "Open Anyway" step is not exercised | high | low | Record `xattr` and the observed behavior; P6 corrects the docs |
| The hub window opens a Chrome app window on the user's screen | certain | low | Happens only in S4 with the user present |
| Other agent sessions may start a hub | low | medium | Every CLI call sets `VIDEOHUB_PORT=7799` |

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
