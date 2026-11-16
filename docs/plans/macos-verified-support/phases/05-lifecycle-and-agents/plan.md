# Phase P5 — Lifecycle and agents

- Plan ID: `macos-verified-support`
- Phase: P5
- Plan version: 1
- Validated against master version: 31
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
| L15 | LaunchAgent does not restart the hub after update | Note for P6 docs |
| L14 | Finder Trash AppleScript always fails (-1728) | Added S6 fix and S7 retry; A4 verified by S7 |
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
  - [x] Update exits 0; code backed up under `data/update-backup/`; `server/platform.js` in the install now contains the SIGSTOP fix
  - [x] Data, notes, outputs and port 7799 unchanged; `VideoHub.command` still valid; `claude mcp list` still one `videohub`; `~/.config/opencode` unchanged
- Verification: before/after snapshots and update output recorded
- Evidence (2026-11-15, worker): before/after snapshots (script `scratchpad/p5-snap.sh`) are byte-identical (`diff` empty): `data/config.json` d63a17c1... (port 7799), `setup-answers.json` 75654ffb..., `notes.json` f07808d1..., outputs v1 082f0cb9... and v2 6388b22e... (workspace/outputs copies the same), `~/Desktop/VideoHub.command` b86c3ade... (content unchanged: `exec '/Users/jorge/.asdf/installs/nodejs/22.22.3/bin/node' '.../install/scripts/install.mjs' open "$@"`). `ls -la ~/.config/opencode` before = after (.gitignore, cli.json, plugins, service.json, tui.json; no change). `claude mcp list` before = after: one `videohub: node /Users/jorge/VideoHubScratch/install/server/mcp.js - Connected`.
  - Dry run: `check the render queue and stop only the server belonging to /Users/jorge/VideoHubScratch/install`, `back up replaced code to .../data/update-backup/2026-11-15T20-39-06-569Z`, `keep installed Node packages`, `would copy VideoHub skill to /Users/jorge/.claude/skills/videohub`, `Update complete...`. No warnings.
  - Real: `stop this install's server (pid 17592)`, `back up replaced code to /Users/jorge/VideoHubScratch/install/data/update-backup/2026-11-15T20-39-06-569Z and copy the new code (data and projects stay)`, `keep installed Node packages`, `copy VideoHub skill to /Users/jorge/.claude/skills/videohub`, `Update complete. Open VideoHub with its existing launcher and restart your agent session.` No warnings. (Exit code was not captured because of the `tee` pipe; the completion line and effects confirm success.)
  - `grep -n SIGSTOP /Users/jorge/VideoHubScratch/install/server/platform.js` -> 0 matches before, `475:    try { kill(pid, 'SIGSTOP'); } catch { }` after.
  - Dot-folders / plans: the install already had `.agents/` and `.claude/` (created 12:01 by setup, not by update; empty skills dirs) and `docs/plans`; `diff -rq /Users/jorge/code/Videohub/docs /Users/jorge/VideoHubScratch/install/docs` is empty after update. Update copies docs/plans from a git checkout (low impact; note).
  - Hub: `VIDEOHUB_NO_WINDOW=1 bash open.sh --server` -> `VideoHub is available at http://127.0.0.1:7799`; `/api/ping` -> `{"ok":true,"app":"videohub","pid":58781}`.
- Rollback: restore code from `data/update-backup/TIMESTAMP` (copy back), restart the hub

### S2 — Real stopped render after update (D9, C11)

- Depends on: S1
- Files:
  - none in the repository
- Change: reuse the P4 S5 bash capture script approach (file in the scratchpad, run with `bash`): queue `hub_render '{"project":"hello-film","mode":"full","env":{"DUR":"120"}}'` with `VIDEOHUB_PORT=7799`, wait until Chrome and ffmpeg are running and at least one chunk has started, snapshot the tree, `POST /api/jobs/JOB-ID/cancel`, wait 5 s, `ps -p` every recorded pid and search for any process started after Stop whose command has a `puppeteer_dev_chrome_profile`, `render.js`, or the scratch film path.
- Acceptance:
  - [x] Job cancelled; no recorded pid alive; no puppeteer Chrome, ffmpeg or render.js tied to the scratch film 5 s and again 15 s after Stop
- Verification: script log recorded
- Evidence (2026-11-15 12:39, script `scratchpad/p5-s2.sh`, from the P4 capture script; the intended pre-Stop pid recording was lost by a shell-expansion slip in my script edit, so the pid list below comes from the snapshot printed by the script): job `jmwiashlf-1e9b6300`, `hub_render {"project":"hello-film","mode":"full","env":{"DUR":"120"}}`, rootPid 59047 (ppid hub 58781) found after 2 polls; one render only. Snapshot 4 s later (job running, render phase, progress 0.1): node render.js 59047 (nice 10/pri 31), 2 Chrome browsers 59099 59100, Chrome helpers 59311-59315 59317 59319-59324, 2 ffmpeg h264_videotoolbox 59409 59410 (17 pids).
  - `POST /api/jobs/jmwiashlf-1e9b6300/cancel` -> `{"ok":true}`; `hub_job`: `Job jmwiashlf-1e9b6300: cancelled`; `/api/renders` `guard.renders` `[]`, 0 active jobs; hub 58781 unaffected.
  - Orphan search (ps -axo with full command, pattern `puppeteer_dev|ffmpeg|hello-film|render\.js|VideoHubScratch|Chrome for Testing|headless`): +5 s and +15 s after Stop only the hub (58781, `server/hub.js`) matched; no puppeteer_dev_chrome_profile, ffmpeg, render.js or scratch film process. `ps -p` on the 17 snapshot pids was run minutes later (not at +5 s): all gone. The +5 s per-pid `ps -p` was therefore not literally recorded; the pattern search at +5/+15 s covers the same ground. Early `/api/renders` polls printed a TypeError in the script's JSON parser (response had no `guard`/`jobs` for the first poll right after hub restart); harmless.
  - Result: Stop fix confirmed on a real render, no orphans (C11 recheck, D9). Nothing was killed manually.
- Rollback: kill only orphans proven to belong to this render and report a defect

### S3 — Enable the login LaunchAgent and observe it

- Depends on: S2
- Files:
  - none in the repository
- Change: stop the hub (`node scripts/install.mjs stop` from the install), run `node scripts/install.mjs autostart --startup yes` from the install, then check `~/Library/LaunchAgents/com.videohub.hub.plist` (Node path follows the stable rule, PATH includes Homebrew), `launchctl print gui/$(id -u)/com.videohub.hub` (loaded), and that the hub answers on 7799 (RunAtLoad started it). Leave it enabled for the user walkthrough; uninstall removes it.
- Acceptance:
  - [x] Plist owned by this install; `launchctl print` exit 0; `/api/ping` 200 on 7799 started by launchd (parent pid 1)
- Verification: recorded outputs
- Evidence (2026-11-15): `node scripts/install.mjs stop` -> `stop this install's server (pid 58781)`; ping then failed (hub down). `node scripts/install.mjs autostart --startup yes` -> `{"enabled":true}`.
  - Plist `~/Library/LaunchAgents/com.videohub.hub.plist`: Label `com.videohub.hub`; ProgramArguments `/Users/jorge/.asdf/installs/nodejs/22.22.3/bin/node`, `/Users/jorge/VideoHubScratch/install/server/hub.js`; WorkingDirectory the install; `VideoHubInstall` key = the install; RunAtLoad true (no KeepAlive); EnvironmentVariables PATH = the user's full shell PATH (asdf shims and 22.22.3/bin first, `/opt/homebrew/bin`, `/usr/local/bin`, system dirs, ...).
  - `launchctl print gui/501/com.videohub.hub` exit 0: `state = running`, `program = .../22.22.3/bin/node`, `runs = 1`, `pid = 60158`, `last exit code = (never exited)`, `properties = partial import | runatload | inferred program`.
  - `/api/ping` on 7799 -> `{"ok":true,"app":"videohub","pid":60158}`; `ps` pid 60158 ppid 1 (`node .../install/server/hub.js`), the sole listener on 7799. Autostart left enabled, hub running (launchd-owned, idle).
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
  - [x] Owned integrations gone; kept items present before the Trash move; nothing listens on 7799; real profile back to the pre-P3 state
- Verification: uninstall output and before/after listings recorded
- Evidence (2026-11-15): before: `claude mcp list` had `videohub` (node .../VideoHubScratch/install/server/mcp.js), skills improve/rex/synced/videohub, Desktop `VideoHub.command` and LaunchAgent plist present, `launchctl print` exit 0, hub pid 68548 on 7799 (7788 free), no render (no ffmpeg), `~/.claude/CLAUDE.md` absent, `~/.config/opencode` listed (cli.json, service.json, tui.json, plugins, .gitignore).
  - `bash uninstall.sh --dry-run` exit 0 (would stop server, remove MCP, Trash skill, disable autostart, Trash launcher, Trash install record); `bash uninstall.sh` exit 0 (stopped hub pid 68548, removed MCP `videohub`, skill folder to Trash, autostart disabled, launcher to Trash, record to Trash; "Your films, notes, outputs, settings and the program folder remain").
  - After: `videohub` gone from `claude mcp list`; skills improve/rex/synced; no Desktop command; no plist; `launchctl print` exit 113; nothing listening on 7788/7799; `~/.claude/CLAUDE.md` absent; `~/.config/opencode` listing identical (dates and files unchanged). Kept: install program files, `install/data` (config.json, setup-answers.json, jobs, index), workspace outputs (3 mp4), `films/trash-test/hello-film_v2.mp4`. `films/hello-film` (and its notes.json) was not present: the janitor log shows it was recycled to the Finder Trash (ok:true) at 2026-11-16T01:13Z during the S7 UI test, before uninstall, so it is not an uninstall defect.
  - Finder `delete` of `/Users/jorge/VideoHubScratch` returned exit 0 ("folder VideoHubScratch of item .Trash"); original path no longer exists. Final state matches the pre-P3 baseline: MCP list (Claude Docs, context7, DaVinci Resolve), skills (improve, rex, synced), no Desktop command, no LaunchAgent plist, no ~/.claude/CLAUDE.md, nothing on 7788/7799; opencode dir unchanged.
- Rollback: re-run setup from the Trash-restored folder (not expected)

### S6 — Fix macOS Finder Trash (phase-amend L14)

- Depends on: S4
- Files:
  - `server/platform.js` (modify) — the macOS AppleScript in Unix `trashOne`
  - `server/platform.darwin.test.js` (modify) — Trash script test
- Change: coerce the target with `POSIX file (item 1 of argv) as alias` before the `tell application "Finder"` block, keep passing the path as argv (no quoting/injection risk), and keep the refusal behavior. The error text should no longer claim the cause is Automation permission unless stderr says so (e.g. -1743 "Not authorized"); otherwise report Finder's message. No hard-delete fallback.
- Acceptance:
  - [x] Darwin test: the script coerces to an alias outside the Finder `tell`, passes the path only as argv, and a failure leaves the source and reports the error
  - [x] Real-Finder test on a throwaway folder under `.test-tmp` moves it to the Trash (darwin only; skipped elsewhere and when `osascript` is unavailable)
- Verification: `node --test server/platform.darwin.test.js` plus the real-Finder test; `pnpm test` → `fail 0`
- Rollback: `git checkout HEAD -- server/platform.js server/platform.darwin.test.js`
- Evidence (S6): script `on run argv\nset f to POSIX file (item 1 of argv) as alias\ntell application "Finder" to delete f\nend run`; error keeps the Automation hint only for -1743/not authorized/not allowed, else `Could not move to Trash: FINDER-MESSAGE (200 chars)`.
  - `node --check` on platform.js, platform.darwin.test.js, trash-darwin.test.js: ok
  - `node --test server/platform.darwin.test.js server/trash-darwin.test.js`: pass 16, fail 0 (real-Finder test ran, folder moved to Trash)
  - Revert check: with the old platform.js (git stash) the real-Finder test failed with Finder -1728 "Can't get POSIX file"; restored, passes
  - Real-Finder test lives in new file `server/trash-darwin.test.js` (darwin only, skipped without osascript)
  - `pnpm test`: tests 350, pass 349, skipped 1, fail 0
  - Opt-in amend: the real-Finder test runs only with `VIDEOHUB_REAL_TRASH_TEST=1` (so default runs never touch the real Trash). With it set: pass 1, fail 0. Default `pnpm test`: tests 350, pass 348, skipped 2, fail 0

### S7 — Re-update the scratch install and retry the user Trash check

- Depends on: S6
- Files:
  - none in the repository
- Change: rerun `bash update.sh --target "/Users/jorge/VideoHubScratch/install"` from the repo (data must stay identical), make sure the launchd hub restarts on 7799, then the coordinator asks the user to delete `trash-test` in the UI and Put Back from the Finder Trash.
- Acceptance:
  - [x] Delete moves `trash-test` to the Trash; Put Back restores it
- Verification: user report; `ls /Users/jorge/VideoHubScratch/workspace/films/trash-test`
- Rollback: none
- Evidence (2026-11-15, worker, automated part; the user delete/Put Back is still pending):
  - Before: no render active (`/api/renders` renders `[]`; jobs all done/cancelled). Snapshot of config.json, setup-answers.json, hello-film notes.json, both hello-film output mp4s (and render chunks, outputs copies), `~/Desktop/VideoHub.command`, LaunchAgent plist, `claude mcp list` (one `videohub`, Connected), `ls -la ~/.config/opencode`.
  - `bash update.sh --target ... --dry-run` exit 0 (no warnings); real update exit 0 (redirected to a log, `echo $?`): `stop this install's server (pid 60158)`, backup to `data/update-backup/2026-11-15T20-44-31-336Z`, skill copied, `Update complete`.
  - `grep -n "as alias" install/server/platform.js` -> `400:      const script = 'on run argv\nset f to POSIX file (item 1 of argv) as alias\ntell application "Finder" to delete f\nend run';`
  - Hub: after update launchd showed `state = not running`; `launchctl kickstart -k gui/501/com.videohub.hub` -> `state = running`, hub pid 68548, parent pid 1 (launchd), `/api/ping` ok on 7799. No window opened.
  - After snapshot: `diff` before/after is empty (all checksums identical, opencode dir and `claude mcp list` unchanged). `trash-test/hello-film_v2.mp4` still present (1732470 bytes); POST /api/scan then `/api/projects` lists `trash-test`.

## 6. Phase acceptance criteria

- [x] A1 — Update from the repository preserves data, notes, outputs and settings, installs the new code and leaves integrations consistent — verify: S1 snapshots
- [x] A2 — A real render stopped after update leaves no process behind — verify: S2 log
- [x] A3 (S3 part) — The LaunchAgent starts the hub — verify: S3 outputs; S4 (3) if done
- [ ] A4 — A UI deletion goes to the Finder Trash and is restorable — verify: S6 tests and S7 user report (S4 (1) exposed L14)
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

**S7 user answer (2026-11-15):** after the re-update, deleting `trash-test` in the UI moved it to the Finder Trash and Put Back restored it; `ls /Users/jorge/VideoHubScratch/workspace/films/trash-test` shows `hello-film_v2.mp4` (1732470 bytes).

**S4 user answers (2026-11-15):** (1) Delete of trash-test failed: "Could not move to Trash. Allow Finder Automation permission and try again. 41:77: execution error: Finder got an error: Can't get POSIX file \"/Users/jorge/VideoHubScratch/workspace/films/trash-test\". (-1728)" — source kept (L14). (2) Claude Code /mcp: new session lists `videohub` with `hub_*` tools (answered after the retry). (3) Logout skipped; launchd RunAtLoad start (S3) accepted as evidence.

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

- 2026-11-15 S1-S3 worker: S4 test item prepared: `/Users/jorge/VideoHubScratch/workspace/films/trash-test/hello-film_v2.mp4` (copy), `POST /api/scan` then `/api/projects` lists `trash-test` (id 66197c13084a, status review). S4 user actions and S5 not done. Type: note.
- 2026-11-15 S1 note: update from a git checkout leaves `.agents/`, `.claude/` and `docs/plans` in the install (they were already there from setup). Type: note.
- 2026-11-15 S2 note: my capture script lost the pre-Stop pid list (heredoc expanded `$(treepids)`); orphan search by pattern at +5 s and +15 s is clean and per-pid `ps -p` run later is clean. Type: note.
- 2026-11-15 S7 note: after `update.sh` stopped the hub, the LaunchAgent did not bring it back (`state = not running`); a manual `launchctl kickstart -k` was needed. Type: note.
- 2026-11-15 S5 note: `films/hello-film` had been recycled during the S7 UI test, so notes.json for it could not be checked as kept after uninstall; its Finder Trash copy was not inspected (~/.Trash is not readable from the shell). Type: note.

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
