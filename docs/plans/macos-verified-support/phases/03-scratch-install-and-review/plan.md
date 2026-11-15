# Phase P3 — Scratch install and review

- Plan ID: `macos-verified-support`
- Phase: P3
- Plan version: 2
- Validated against master version: 21
- Status: in_progress
- Approved by: Jorge Venegas (standing instruction C6)
- Approved at: 2026-11-15
- Commit: pending
- Implementation mode: subagent
- Implemented by: Sonnet 5.5 subagent (S1-S3); S4 pending coordinator
- Implemented at: 2026-11-15 (S1-S3)
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
| D3 | Agent guidance on the Mac points at valid paths | A6 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L6 | hub_workspace hard-codes `\\` separators | Added S5 and A6 |
| L7 | Seeded config.json blocks --workspace; port must be set after setup | S1 evidence records the post-setup port edit; no code change |
| L8 | Real API endpoints and JSON CLI arguments; asdf Node 22.22.3 | Notes only for this phase |
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
- Evidence (2026-11-15): `git archive HEAD | tar -x -C ~/VideoHubScratch/install` done; install has `setup.sh`, `pnpm-lock.yaml`, `server/hub.js`. Entry checks passed: nothing on 7788/7799, no Desktop command, `claude mcp list` had no videohub, `~/.claude/CLAUDE.md` does not exist (no checksum), `~/.claude/skills` = improve rex synced.
- Deviation: the seeded `data/config.json` `{"port": 7799}` made `setup.sh --dry-run` report `kept the workspace /Users/jorge/Documents/VideoHub (... was not used: the workspace is already set)` — `initConfig` treats any existing config.json as an installed workspace and ignores `--workspace`. Seed removed before the real run (see S2).
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
- Evidence (2026-11-15):
  - Before: `claude mcp list` = claude.ai Claude Docs, plugin:context7, DaVinci Resolve (no videohub); `~/.claude/CLAUDE.md` absent; `~/.claude/skills` = improve rex synced.
  - Dry-run and real run used `VIDEOHUB_PORT=7799 bash setup.sh [--dry-run] --workspace /Users/jorge/VideoHubScratch/workspace --agents claude --watch-found no --gpu-encoder yes --global-rule no --shortcut yes --startup no --example yes --server`. `--server` (extra flag) keeps setup from opening a browser window; `VIDEOHUB_PORT=7799` keeps its end-of-setup hub off 7788. Dry-run output: pnpm install, use workspace, create 5 folders + README.txt, write config.json, would register MCP videohub / copy skill, write launcher, copy example, "start the local hub if needed (server only)". No warnings.
  - Real run: exit 0. `pnpm install --frozen-lockfile` ran (pnpm 11.5.2, +115 packages: @modelcontextprotocol/sdk 1.32.1, puppeteer-core 25.17.0, zod 4.6.7). Output also said `Found video folder: /Users/jorge/Documents/Media` (listed disabled in roots because `--watch-found no`).
  - `data/config.json` after setup: `"port": 7788` (setup writes the default, not 7799), baseDir/outputs/sounds/archive/thumbstudio under `/Users/jorge/VideoHubScratch/workspace`, roots = scratch films (enabled) + Documents/Media (media, disabled), `render.encoder` auto. Port set to 7799 afterwards with a JSON edit (hub stopped via `node scripts/install.mjs stop`, restarted with `bash open.sh --server`).
  - `~/Desktop/VideoHub.command` (mode -rwxr-xr-x, 268 bytes):
    `#!/bin/bash` / `# VideoHub install: /Users/jorge/VideoHubScratch/install` / `set -euo pipefail` / `export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"` / `exec '/Users/jorge/.asdf/installs/nodejs/22.22.3/bin/node' '/Users/jorge/VideoHubScratch/install/scripts/install.mjs' open "$@"`.
  - `xattr ~/Desktop/VideoHub.command` = `com.apple.macl`, `com.apple.provenance` (no `com.apple.quarantine`).
  - After: `claude mcp list` has `videohub: node /Users/jorge/VideoHubScratch/install/server/mcp.js - Connected`; `~/.claude/skills` = improve rex synced videohub; `~/.claude/CLAUDE.md` still absent (unchanged); no OpenCode touched.
  - Workspace: archive films outputs sounds thumbnail-templates thumbnails README.txt; films/hello-film present.

### S3 — Automated hub checks on port 7799

- Depends on: S2
- Files:
  - none in the repository
- Change: from the install, start the server only (`bash open.sh --server`), then with `VIDEOHUB_PORT=7799` run `node server/cli.js hub_workspace` and `hub_project` for the example, fetch `http://127.0.0.1:7799/` and the capabilities/settings endpoints, and check the encoder result names `Apple M2 Max` (D2 on real install). Record outputs. Leave the server running for S4.
- Acceptance:
  - [ ] `hub_workspace` prints the scratch workspace; `hub_project` finds the example; the UI root returns 200
- Verification: command outputs recorded in the closeout
- Rollback: stop the server (`node scripts/install.mjs stop` from the install)
- Evidence (2026-11-15), all with `VIDEOHUB_PORT=7799`:
  - `bash open.sh --server` -> `VideoHub is available at http://127.0.0.1:7799`; listener on 7799 only (pid 7896 at the time of writing), none on 7788.
  - `node server/cli.js hub_workspace` -> `Workspace: /Users/jorge/VideoHubScratch/workspace`, films/outputs/sounds/thumbnails/archive under it.
  - `node server/cli.js hub_project '{"project":"hello-film"}'` -> `Project: Hello, VideoHub (id 926ba32ad69f) · /Users/jorge/VideoHubScratch/workspace/films/hello-film`, chunked, DUR=10, 30 fps, notes 0/0. (The CLI takes a JSON argument; a bare `hello-film` fails with "not valid JSON".)
  - `curl /` -> 200; `/api/ping` -> `{"ok":true,"app":"videohub","pid":7896}` 200; `/api/config` -> 200 with port 7799. `/api/capabilities` and `/api/settings` do not exist (they return the SPA index page).
  - `/api/encoders` -> `{"available":["videotoolbox","x264"],"best":"videotoolbox","gpus":["Apple M2 Max"],"chosen":"auto"}`; `data/encoders.json` also has `gpus: ["Apple M2 Max"]`.
  - Server left running for S4.

### S4 — User walkthrough (coordinator with the user)

- Depends on: S3
- Files:
  - none in the repository
- Change: the coordinator asks the user to: (1) double-click `~/Desktop/VideoHub.command` and report whether Terminal opens, whether macOS shows any Gatekeeper prompt, and whether the hub opens in a Chrome app window; (2) open the example card and play it in live preview (`hub_live`), then leave a note on a frame; (3) Settings → pick a folder with the macOS folder dialog, and cancel once; (4) reveal a file in Finder from the UI. The coordinator verifies the note with `hub_notes` on port 7799 and records each answer verbatim.
- Acceptance:
  - [ ] Each of (1)–(4) reported working, or reported as a defect with exact symptoms
- Verification: user reports + `VIDEOHUB_PORT=7799 node server/cli.js hub_notes hello-film` shows the note (example project name from `hub_project`)
- Rollback: none needed (read-only for the repo)

### S5 — Use the platform separator in hub_workspace guidance (phase-amend L6)

- Depends on: S3
- Files:
  - `server/tools.js` (modify) — the `New films go in:` line in the workspace tool text
  - `server/tools.test.js` (create) — no existing test covers the tool texts
- Change: build both example paths with the platform path separator (`path.join`/`path.sep`) instead of hard-coded `\\`, so macOS/Linux show `/` and Windows keeps `\\`. No other text changes.
- Acceptance:
  - [x] On macOS, `VIDEOHUB_PORT=7799 node server/cli.js hub_workspace '{}'` from the repo shows `/` separators; a test fails if the backslash text returns on a POSIX path module
  - Evidence (2026-11-15): `node --test server/tools.test.js` → pass 1, fail 0; with `server/tools.js` reverted to the backslash text → fail 1 (restored); `pnpm test` → tests 348, pass 347, fail 0. Checked through the unit test against a fake hub, not the hub on 7799.
- Verification: `node --test server/tools.test.js` and `pnpm test` — expected: `fail 0`
- Rollback: `git checkout HEAD -- server/tools.js server/tools.test.js`

## 6. Phase acceptance criteria

- [ ] A1 — `bash setup.sh` installs the scratch copy with pnpm, Claude Code integration only, and the recorded answers — verify: S2 evidence
- [ ] A2 — The Desktop `VideoHub.command` opens the hub; its Node path follows the stable rule; Gatekeeper behavior is recorded — verify: S2 content + S4 (1)
- [ ] A3 — The example plays in live preview and a note is saved — verify: S4 (2) + `hub_notes`
- [ ] A4 — macOS folder dialog and Finder reveal work from the UI — verify: S4 (3), (4)
- [ ] A6 — hub_workspace guidance uses the platform separator on macOS — verify: S5
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

S1–S3 and any fix steps are implemented by a subagent. S4 is a user walkthrough run by the coordinator; it writes no product code.

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

- 2026-11-15 S1/S2: the seeded `data/config.json` was removed before setup because an existing config makes setup ignore `--workspace` (it kept `~/Documents/VideoHub`). Setup then wrote `"port": 7788`; port 7799 was set by a JSON edit afterwards (hub stopped and restarted). Setup ran with extra `--server` and `VIDEOHUB_PORT=7799` so it opened no browser window and started no hub on 7788.
- Discoveries (not fixed here, no repo change): (1) phase-amend/note: S1 order is wrong, the port must be set after setup (or setup must honor a seeded port while still applying `--workspace`). (2) note: the launcher Node path is `~/.asdf/installs/nodejs/22.22.3/bin/node`, because `node` on PATH here resolves to asdf 22.22.3 (not 24.16.0 from master section 6); versioned path, as designed. (3) note: `hub_workspace` prints Windows-style separators (`films\<film-name>`, `templates\new-film`) on macOS; cosmetic text defect for a later phase. (4) note: no `com.apple.quarantine` on the generated launcher, so Gatekeeper's Open Anyway may never appear (S4 confirms). (5) note: `/api/capabilities` and `/api/settings` do not exist; `/api/config` and `/api/encoders` are the real endpoints.

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
**Remaining work and handoff:** Closeout pending S4 (coordinator with user)
