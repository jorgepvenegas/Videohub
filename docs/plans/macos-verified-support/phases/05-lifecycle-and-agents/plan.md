# Phase P5 — Lifecycle and agents

- Plan ID: `macos-verified-support`
- Phase: P5
- Plan version: 1
- Validated against master version: 29
- Status: in_progress
- Approved by: Jorge Venegas (standing instruction C6; stopped render C11)
- Approved at: 2026-11-15
- Commit: pending
- Implementation mode: subagent
- Implemented by: pending
- Implemented at: pending
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: P4
- Written: 2026-11-15
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Finish the real-Mac lifecycle (D5, D6, D9): update the scratch install from the repository without losing data, confirm on a real stopped render that the Stop fix leaves nothing behind, enable and observe the login LaunchAgent, send a test item to the Finder Trash from the UI and restore it, confirm a new Claude Code session sees the `hub_*` tools, and finally uninstall the scratch install, leaving only what the docs promise and removing the scratch folder (C2, C8).

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D5 | Update preserves data; LaunchAgent; Finder Trash restore; uninstall removes only owned integrations | A1, A3, A4, A6 |
| D6 | New Claude Code session lists `hub_*` tools | A5 |
| D9 | Real stopped render after update leaves no orphans | A2 |
| D8 | npm-free update path on the real install | A1 |
| D1 | Suite green after any fix | A7 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L1 | pnpm for development and product | Update runs `pnpm install --frozen-lockfile` only if the lockfile changed |
| L8 | Real endpoints, JSON CLI arguments, asdf Node 22.22.3 in the install | All CLI/API calls use JSON and `/api/config`, `/api/renders`, `/api/jobs/:id/cancel` |
| L11 | Stop orphaned relaunched Chrome; fixed in `killTree` | S2 is the real-render recheck (C11) |
| L13 | D4 split; D9 is this phase's | A2 traces to D9 |

## 3. Scope

In scope:
- Update, stopped render, LaunchAgent, user walkthrough (Trash, Claude Code session, optional login), uninstall, scratch-folder removal to the Trash.

Out of scope:
- OpenCode integration (C8: not registered); `~/.claude/CLAUDE.md`; the user's real workspace and films; docs (P6).
- Any additional render beyond the single stopped render in S2.

## 4. Entry conditions

- [ ] P4 done; suite green — verify: `pnpm test` → `fail 0`
- [ ] Scratch hub on 7799 healthy and idle — verify: `curl -s 127.0.0.1:7799/api/renders`
- [ ] Phase plan revalidated against current master version
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — Update the scratch install from the repository

- Depends on: none
- Files:
  - none in the repository
- Change: snapshot checksums of `/Users/jorge/VideoHubScratch/install/data/config.json`, `setup-answers.json`, `/Users/jorge/VideoHubScratch/workspace/films/hello-film/.videohub/notes.json`, the output videos, `~/Desktop/VideoHub.command`, `claude mcp list`, and `ls -la ~/.config/opencode`. From `/Users/jorge/code/Videohub` run `bash update.sh --target "/Users/jorge/VideoHubScratch/install" --dry-run`, read it, then run it. Restart the hub from the install with `bash open.sh --server` if update stopped it. Re-snapshot.
- Acceptance:
  - [ ] Update exits 0; code backed up under `data/update-backup/`; `server/platform.js` in the install now contains the SIGSTOP fix
  - [ ] Data, notes, outputs and port 7799 unchanged; `VideoHub.command` still valid; `claude mcp list` still one `videohub`; `~/.config/opencode` unchanged
- Verification: before/after snapshots and update output recorded
- Rollback: restore code from `data/update-backup/TIMESTAMP` (copy back), restart the hub

### S2 — Real stopped render after update (D9, C11)

- Depends on: S1
- Files:
  - none in the repository
- Change: reuse the P4 S5 bash capture script approach (file in the scratchpad, run with `bash`): queue `hub_render '{"project":"hello-film","mode":"full","env":{"DUR":"120"}}'` with `VIDEOHUB_PORT=7799`, wait until Chrome and ffmpeg are running and at least one chunk has started, snapshot the tree, `POST /api/jobs/JOB-ID/cancel`, wait 5 s, `ps -p` every recorded pid and search for any process started after Stop whose command has a `puppeteer_dev_chrome_profile`, `render.js`, or the scratch film path.
- Acceptance:
  - [ ] Job cancelled; no recorded pid alive; no puppeteer Chrome, ffmpeg or render.js tied to the scratch film 5 s and again 15 s after Stop
- Verification: script log recorded
- Rollback: kill only orphans proven to belong to this render and report a defect

### S3 — Enable the login LaunchAgent and observe it

- Depends on: S2
- Files:
  - none in the repository
- Change: stop the hub (`node scripts/install.mjs stop` from the install), run `node scripts/install.mjs autostart --startup yes` from the install, then check `~/Library/LaunchAgents/com.videohub.hub.plist` (Node path follows the stable rule, PATH includes Homebrew), `launchctl print gui/$(id -u)/com.videohub.hub` (loaded), and that the hub answers on 7799 (RunAtLoad started it). Leave it enabled for the user walkthrough; uninstall removes it.
- Acceptance:
  - [ ] Plist owned by this install; `launchctl print` exit 0; `/api/ping` 200 on 7799 started by launchd (parent pid 1)
- Verification: recorded outputs
- Rollback: `node scripts/install.mjs autostart --startup no`

### S4 — User walkthrough (coordinator with the user)

- Depends on: S3
- Files:
  - none in the repository (the worker for S1–S3 creates the test item `/Users/jorge/VideoHubScratch/workspace/films/trash-test` as a copy of `hello-film_v2.mp4` in its own folder)
- Change: the coordinator asks the user to (1) delete the `trash-test` project from VideoHub's UI, allow Finder Automation if prompted, then restore it from the Finder Trash with Put Back; (2) start a new Claude Code session in any folder and confirm `/mcp` shows `videohub` with `hub_*` tools; (3) optionally log out and back in and confirm VideoHub's hub is running (the coordinator checks `/api/ping` and `launchctl print`).
- Acceptance:
  - [ ] (1) and (2) reported working or as defects; (3) recorded as observed or skipped
- Verification: user report; `ls /Users/jorge/VideoHubScratch/workspace/films/trash-test` after Put Back
- Rollback: none

### S5 — Uninstall the scratch install and remove the scratch folder

- Depends on: S4
- Files:
  - none in the repository
- Change: from the install run `bash uninstall.sh --dry-run`, then `bash uninstall.sh`. Verify removed: Desktop `VideoHub.command`, LaunchAgent plist and launchd job, `claude mcp list` `videohub`, `~/.claude/skills/videohub`; verify kept: install program files, data, workspace films/outputs/notes. Verify the hub on 7799 is stopped. Then move `/Users/jorge/VideoHubScratch` to the Finder Trash (osascript Finder delete, never `rm`) per C2, and confirm `claude mcp list` and `~/.config/opencode` match the pre-P3 state.
- Acceptance:
  - [ ] Owned integrations gone; kept items present before the Trash move; nothing listens on 7799; real profile back to the pre-P3 state
- Verification: uninstall output and before/after listings recorded
- Rollback: re-run setup from the Trash-restored folder (not expected)

## 6. Phase acceptance criteria

- [ ] A1 — Update from the repository preserves data, notes, outputs and settings, installs the new code and leaves integrations consistent — verify: S1 snapshots
- [ ] A2 — A real render stopped after update leaves no process behind — verify: S2 log
- [ ] A3 — The LaunchAgent starts the hub — verify: S3 outputs; S4 (3) if done
- [ ] A4 — A UI deletion goes to the Finder Trash and is restorable — verify: S4 (1)
- [ ] A5 — A new Claude Code session lists `hub_*` tools — verify: S4 (2)
- [ ] A6 — Uninstall removes only owned integrations and the scratch folder ends in the Trash — verify: S5
- [ ] A7 — Suite green and any repository fix checked — verify: `pnpm test` → `fail 0`, or `git status --short` shows no source change

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [ ] Names and structure state intent; comments explain only non-obvious reasons
- [ ] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [ ] Master standards commands pass: format none, lint none, `node --check` on changed files, `pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| Update's agent refresh touches OpenCode although it was never selected | low | medium | S1 snapshots `~/.config/opencode` before/after; any change is a defect |
| Update from a git checkout copies the dev-only `.agents`/`.claude` or plan files | low | low | Update copies only `ITEMS`; S1 checks |
| LaunchAgent hub uses port 7788 if config is not read | low | medium | S3 checks 7799; config has port 7799 |
| Finder Automation prompt denied | medium | low | Docs say the source stays; S4 records it |
| Removing the scratch folder | certain | low | Finder Trash only, restorable |

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
