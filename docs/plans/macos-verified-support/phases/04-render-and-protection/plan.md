# Phase P4 — Render and protection

- Plan ID: `macos-verified-support`
- Phase: P4
- Plan version: 1
- Validated against master version: 29
- Status: done
- Approved by: Jorge Venegas (standing instruction C6; render approved C9)
- Approved at: 2026-11-15
- Commit: a37040d
- Implementation mode: subagent
- Implemented by: sonnet-worker-p4-s6
- Implemented at: 2026-11-15
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: P3
- Written: 2026-11-15
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Prove on the real Mac that VideoHub's protected render queue works (D4): the reviewed example renders once with sound through the queue using VideoToolbox, render priority and background QoS apply and lift, RAM protection reads real free memory, the Renders page hides CPU-core controls with the macOS explanation, and Stop ends a running render's whole process tree. Renders happen only in the scratch install (`/Users/jorge/VideoHubScratch/install`, port 7799), one at a time (C9).

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D4 | Full render with sound and VideoToolbox; priority/QoS; RAM protection; hidden CPU controls; whole-tree Stop | A1, A2, A3, A4, A5 |
| D1 | Suite green after any fix | A6 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L1 | pnpm for development and product | Any fix is tested with `pnpm test` |
| L10 | 10 s render takes about 5 s; second render ran to completion; Stop uses `/api/jobs/:id/cancel` | Added S5 with a 120 s render (C10); A2/A4 verified by S5 |
| L11 | Stop orphans relaunched Chrome (own process group) | Added S6 fix + real-process test; A4 reworded; real-render recheck moves to P5 (C11) |
| L12 | Two Chrome helpers keep nice 10 in slow mode; nice stays 19 after normal | Note; A2 judged on the render tree as documented best effort |
| L13 | D4 split; real stopped render becomes D9 for P5 | Closeout judges D4 as amended |
| L8 | Real endpoints are `/api/config`, `/api/encoders`; CLI takes JSON; asdf Node 22.22.3 in the install | S1–S3 use JSON CLI arguments and real endpoints only; discover render/guard endpoints from `server/hub.js` (`/api/renders`, `/api/renders/cmd`, `/api/guard/settings`, `/api/guard/temp`) |

## 3. Scope

In scope:
- Two renders of `/Users/jorge/VideoHubScratch/workspace/films/hello-film` through the scratch queue (C9), observation of the process tree, priority, QoS, RAM figures and Stop.
- A user check of the Renders page CPU controls and the render-finished notification.
- Targeted fixes for macOS defects that block A1–A5, each added as a `phase-amend` step first.

Out of scope:
- Changing the example film (including the user's test note about a moon), render speed tuning, Intel macOS, Trash/LaunchAgent/update/uninstall (P5), docs (P6).
- Any render outside the scratch install, or more than one concurrent render.

## 4. Entry conditions

- [x] P3 done; scratch hub listening on 7799 with jobs and guard enabled — verify: `lsof -nP -iTCP:7799 -sTCP:LISTEN`; `curl -s 127.0.0.1:7799/api/guard/settings`
- [x] No render running — verify: `curl -s 127.0.0.1:7799/api/renders`
- [x] User approved rendering after preview review (C9)
- [x] Phase plan revalidated against current master version
- [x] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — Read protection state before rendering

- Depends on: none
- Files:
  - none in the repository
- Change: record `/api/guard/settings` (capabilities, `cpuAffinity: false`, `cpuLimitReason`, pause/critical MB, free RAM) and compare the reported free RAM with `vm_stat` (free + inactive + speculative pages × page size) taken at the same moment.
- Acceptance:
  - [x] Guard reports macOS capabilities with CPU affinity unavailable and the explanation; free RAM within 10% of the `vm_stat` calculation
- Verification: `curl -s 127.0.0.1:7799/api/guard/settings` and `vm_stat` outputs recorded
- Evidence (2026-11-15): `/api/guard/settings` -> `{"CapActive":90,"CapIdle":100,"IdleMin":2,"PauseMB":700,"CriticalMB":500,"SlowCapPct":5,"LowPrio":1,"builtIn":true,"capabilities":{"platform":"darwin","cpuAffinity":false,"cpuLimitReason":"macOS does not provide a CPU-core affinity limit; priority and background QoS protect responsiveness.","trashLabel":"Trash","fileManager":"Finder","browserWarning":null},"ramTotalMB":65536,"cores":12,"temp":null}`. `/api/renders` guard block: `ramAvailMB` 29025. `vm_stat` (page 16384 B): free 47092 + inactive 1660097 + speculative 150288 = 1857477 pages = 29023 MB. Difference 2 MB (0.007%).
- Rollback: none (read-only)

### S2 — Render once to completion and watch priority and QoS

- Depends on: S1
- Files:
  - none in the repository
- Change: from `/Users/jorge/VideoHubScratch/install` queue the render with `VIDEOHUB_PORT=7799 node server/cli.js hub_render '{"project":"hello-film"}'` (adjust to the tool's real JSON schema). While it runs, capture the render tree with `ps -axo pid,ppid,pgid,nice,pri,command` at least twice; switch the render to slow mode through the documented guard control (`/api/guard/temp` or the Renders page action found in `server/hub.js`), capture `nice`/`pri` again (expect nice 19 and background priority), then restore and capture once more (restoration is best effort per docs). Poll `hub_job` until done. Then `ffprobe` the output: video stream, audio stream, duration about 10 s; read the job log for the encoder actually used (`h264_videotoolbox` or `hevc_videotoolbox`).
- Acceptance:
  - [x] Job finishes successfully; output has video and audio, about 10 s; log shows a VideoToolbox encoder
  - [ ] Slow mode raises niceness to 19 and lowers `pri` across the tree; restore is recorded (may stay lowered without privileges) - NOT OBSERVED, see evidence
- Verification: `hub_job` final state; `ffprobe -v error -show_entries stream=codec_type,codec_name -show_entries format=duration` on the output file named by `hub_job`; captured `ps` snapshots
- Evidence (2026-11-15): `hub_render '{"project":"hello-film","mode":"full"}'` -> job `jmwia9ztc-8d89f493`, state `done`, "took 5 s", 5/5 chunks, 2 workers, 300 frames in 3.9 s (76.9 fps). Output `/Users/jorge/VideoHubScratch/workspace/films/hello-film/hello-film_v1.mp4` (copy in workspace/outputs/2026-11-15/). Log: `encoder: videotoolbox (h264_videotoolbox)`; final mux `-c:v copy -c:a aac -b:a 320k` from `audio/mix.wav`. ffprobe: stream 0 h264 video, stream 1 aac audio, duration 10.000000. Log also contains `Truncating packet of size 8294400 to 65514` lines (stderr from ffmpeg while piping raw frames; output is valid, 10 s, 300 frames). An osascript `display notification` process (pid 36255, "Render finished: Hello, VideoHub v1 ...") was seen right after the render, so the notification was requested.
- Process/priority snapshots: NOT captured. The whole render finished in 5 s; my first `ps` came after the job was already `done` (only the osascript notification process remained). No slow-mode request was possible during this render.
- Second job (S3 attempt) also ran to `done` (see S3), where slow/normal requests were POSTed to `/api/renders/cmd` (`{"action":"slow"}` then `{"action":"normal"}`, both `{"ok":true,"note":null}`) but with no tracked render (`/api/renders` guard.renders was `[]`), so no nice/pri change was observable. Guard settings after: unchanged (CapActive 90, LowPrio 1, temp null); `/api/guard/temp` not used.
- Rollback: none (output stays in the scratch workspace; P5 uninstall leaves outputs, scratch folder removed at P5 end)

### S3 — Start a second render and Stop it

- Depends on: S2
- Files:
  - none in the repository
- Change: queue the same render again; after about 10 s, record the full process tree (root pid, pgid, children including ffmpeg and Chrome), press Stop through the same API the Renders page uses (`/api/renders/cmd` or the documented route), wait 5 s, and check that no process from the recorded tree survives.
- Acceptance:
  - [ ] Job ends as stopped/cancelled; `ps -p` on every pid recorded before Stop finds none; no orphan headless Chrome or ffmpeg from that render - NOT VERIFIED, see evidence
- Verification: before/after `ps` captures recorded
- Evidence (2026-11-15): second render `jmwiaak5h-9db892b1` queued and ran to `done` (5 s, output `hello-film_v2.mp4`, `encoder: videotoolbox (h264_videotoolbox)`) before Stop could be applied. Cause 1: a defect in my capture script (the `ps` command was held in a shell variable that zsh did not word-split, so every snapshot printed "command not found" and no pids were recorded). Cause 2 (plan flaw): the film renders in about 5 s, so "stop after about 10 s" can never apply; even a correct script would have had a ~5 s window. Stop request sent `POST /api/jobs/jmwiaak5h-9db892b1/cancel` -> `{"ok":false}` (job already done/not cancellable). The Stop route the Renders page uses is `/api/jobs/:id/cancel` for queued jobs and `cmd kill rootPid` (`/api/renders/cmd`) only when there is no job (ui/app.js:538). After the job: `ps` for hello-film/render.js/ffmpeg/Chrome for Testing/headless showed nothing, no orphans. Both permitted renders (C9) are now used; whole-tree Stop is untested (A4 open).
- Rollback: if processes survive, record their pids and stop them with `kill` (scratch render only), then report as a defect

### S4 — User checks on the Renders page

- Depends on: S2
- Files:
  - none in the repository
- Change: the coordinator asks the user whether (1) the Renders page hides the CPU-core sliders/presets and shows the macOS explanation, (2) a macOS notification appeared when the first render finished, and (3) the finished video plays (optional).
- Acceptance:
  - [ ] Answers recorded verbatim; (1) must be yes or reported as a defect; (2) is best effort
- Verification: user report
- Rollback: none

### S5 — Longer render: priority/QoS snapshots and Stop (phase-amend L10, C10)

- Depends on: S2
- Files:
  - none in the repository
- Change: write a capture script to a file in the scratchpad (bash, `#!/bin/bash`, no command stored in a variable; invoke with `bash script.sh`) that prints `ps -axo pid,ppid,pgid,nice,pri,command` filtered to the render tree (root = the job's process; include descendants by ppid, plus Chrome/ffmpeg children). Queue `hub_render '{"project":"hello-film","mode":"full","env":{"DUR":"120"}}'` from the scratch install with `VIDEOHUB_PORT=7799`. When the tree exists: snapshot 1 (normal); POST the Renders-page slow command for that render; wait 4 s (guard tick 3 s); snapshot 2 (expect nice 19 and lowered pri across the tree); POST the normal command; wait 4 s; snapshot 3 (record restoration, best effort). Then record every pid of the tree and `POST /api/jobs/JOB-ID/cancel` (the Renders-page Stop for jobs); wait 5 s; run `ps -p` on every recorded pid and check for orphan Chrome/ffmpeg tied to the scratch film.
- Acceptance:
  - [ ] Snapshot 2 shows nice 19 (and lower pri) on the tree; restoration recorded - PARTIAL: 19/4 on all pids except two Chrome renderer helpers (43603, 43606 stayed 10/47); pri restored but nice stays 19 (see evidence)
  - [ ] Cancel ends the job as cancelled/stopped and no recorded pid survives - PARTIAL: job `cancelled`, all 21 recorded pids gone, but two headless Chrome trees launched during Stop survive as orphans (see evidence)
- Verification: the three snapshots, the cancel response, `hub_job` final state and the post-Stop `ps -p` output recorded under this step
- Evidence (2026-11-15, script `scratchpad/p4-s5.sh`, log `scratchpad/p4-s5.log`; pre-check `/api/renders` showed 0 tracked renders, 0 active jobs): `hub_render '{"project":"hello-film","mode":"full","env":{"DUR":"120"}}'` -> job `jmwiagiek-b5c9d17f`. `/api/renders` `guard.renders[0].rootPid` = 43457 (the `node render.js` process, pgid 43457; its ppid is the hub 17592) was known after 2 polls. Tree = descendants by ppid (Chrome x2 browsers with helpers, 2 ffmpeg `h264_videotoolbox` per snapshot).
  - Snapshot 1 (normal, 12:30:03; pid nice/pri): 43457 node render.js 10/31; Chrome browsers 43515, 43516 10/46; Chrome helpers 43529-43532 10/31. Render root and children start at nice 10 / pri 31 (LowPrio on).
  - Request: `POST /api/renders/cmd {"action":"slow","rootPid":43457}` -> `{"ok":true,"note":null}`.
  - Snapshot 2 (slow, 4 s later): 43457 19/4; 43515, 43516 19/4; helpers 43529-43532, 43535, 43544 19/4; GPU/Renderer helpers 43795-43799 19/4; both ffmpeg 43800, 43801 19/4. Exceptions: two Chrome "Aperitif Renderer" helpers 43603, 43606 stayed 10/47 (not touched).
  - Request: `POST /api/renders/cmd {"action":"normal","rootPid":43457}` -> `{"ok":true,"note":null}`.
  - Snapshot 3 (normal, 4 s later): pri restored (43457 19/31; browsers 19/31; helpers and ffmpeg 44354, 44356 19/47) but nice stayed 19 on every pid (a non-privileged process cannot lower nice; best effort as documented). 43603, 43606 still 10/47.
  - Recorded tree pids (union of the 3 snapshots): 43457 43515 43516 43529 43530 43531 43532 43535 43536 43544 43545 43603 43606 43795 43796 43797 43799 43800 43801 44354 44356 (21). Job before cancel: running, render phase, progress 0.13.
  - Stop: `POST /api/jobs/jmwiagiek-b5c9d17f/cancel` -> `{"ok":true}`. 5 s later `ps -p` found all 21 recorded pids gone. `hub_job` final: `cancelled`. `/api/renders` after: `guard.renders` `[]`, 0 active jobs. Hub 17592 unaffected.
  - Orphans: NOT clean. Two headless Chrome browser trees survived with ppid 1, nice 19, started 12:30:11 (the moment Stop was sent), puppeteer profiles `/var/folders/hm/d13xwnyn6dddr0948mqp9ykh0000gn/T/puppeteer_dev_chrome_profile-PwVCUK` (browser pid 44451) and `...-5lj5ho` (browser pid 44452), each with GPU helper (44459, 44460) and about 7 more helpers (14 pids in all). Still alive 13 s after Stop. They were launched after snapshot 3 (a worker re-launching Chrome as the tree was killed) so were not in the recorded list. No partial output mp4 was created (only the job log and `render/chunks` working folder, which VideoHub keeps).
  - Left running: per scope fence only recorded pids may be killed, so the two orphan trees were not killed; coordinator decision needed.
- Rollback: if any recorded pid survives, kill only those pids and report the defect; delete a partial output if one was kept

### S6 — Stop must not leave relaunched Chrome behind (phase-amend L11)

- Depends on: S5
- Files:
  - `server/platform.js` (modify) — Unix `killTree`
  - `server/platform.darwin.test.js` and `server/platform.linux.test.js` (modify) — injected-order tests
  - `server/killtree-unix.test.js` (create) — real-process test, skipped on Windows
- Change: in the Unix `killTree`, first send SIGSTOP to the root so it cannot spawn replacements, then re-read the process tree, SIGTERM the descendants (and the root's process group), wait the existing grace period, SIGKILL any surviving descendant, then SIGKILL the root (a stopped process still dies on SIGKILL). Keep the guards (`pid <= 1`, own pid), the start-time identity check, and the function's signature and return. Windows (`taskkill /T /F`) unchanged.
- Acceptance:
  - [x] Injected tests: the root is stopped before any child is signalled, and the root is killed last
  - [x] Real-process test (under `.test-tmp`): a node "render" that ignores SIGTERM and, whenever its child dies, spawns a detached replacement child in a new process group; after `killTree(root)` neither the root nor any child (original or replacement) is alive. The test fails against the old `killTree`
- Verification: `node --test server/killtree-unix.test.js server/platform.darwin.test.js server/platform.linux.test.js`; `pnpm test` → `fail 0`
- Rollback: `git checkout HEAD -- server/platform.js server/platform.darwin.test.js server/platform.linux.test.js && rm server/killtree-unix.test.js`
- Evidence (2026-11-15): `node --check server/platform.js` ok; `node --test server/killtree-unix.test.js server/platform.darwin.test.js server/platform.linux.test.js` -> pass 33, fail 0 (about 1 s); revert check: with `server/platform.js` stashed to the old killTree the real-process test failed ("alive after Stop: REPLACEMENT-PID"), restored and it passes; `pnpm test` -> tests 349, pass 348, fail 0 (1 skipped); no leftover test processes in `ps`, no `killtree-*` dir left in `.test-tmp`. New sequence: SIGSTOP root, read tree, SIGTERM group and descendants, 3 s grace, SIGKILL surviving descendants (and group), SIGKILL root last.

## 6. Phase acceptance criteria

- [x] A1 — One render completes through the queue with video and audio using VideoToolbox — verify: S2 `hub_job`, `ffprobe`, job log
- [x] A2 — Render niceness and background QoS apply in slow mode and restoration is recorded — verify: S5 snapshots
- [x] A3 — RAM protection reads free memory consistent with `vm_stat` and CPU affinity is reported unavailable — verify: S1
- [x] A4 — Stop ends the whole render tree, including Chrome relaunched during Stop — verify: S6 real-process test; S5 showed the defect; real-render reconfirmation after update is owed to P5 (C11)
- [x] A5 — Renders page hides CPU-core controls with the explanation — verify: S4 (1)
- [x] A6 — Suite stays green and any repository fix passes checks — verify: `pnpm test` → `fail 0`, `node --check` on changed files, or `git status --short` shows no source change

## 7. Code standards check

- [x] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [x] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [x] Names and structure state intent; comments explain only non-obvious reasons
- [x] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [x] Master standards commands pass: format none, lint none, `node --check` on changed files, `pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| R7: pnpm's symlinked `node_modules` stops the film render script from loading `puppeteer-core` | low | high | S2 is the real check; on failure stop and add a fix step |
| Render loads the Mac heavily while the user works | medium | low | Guard is on; renders are about 10 s of film |
| `taskpolicy -B` cannot lift background QoS without privileges | medium | low | Docs already call restoration best effort; record observed values |
| Stop leaves Chrome helper processes (different process group) | medium | medium | S3 checks every recorded pid; surviving ones become a defect with a fix step |
| Repo fixes do not reach the running scratch install | certain | low | A fix is tested in the repo; P5 update carries it to the scratch install |

## 9. Deviations and working notes

**S4 user answers (2026-11-15, Jorge Venegas):** (1) Renders page: CPU-core sliders hidden, macOS note shown. (2) A macOS "Render finished" notification appeared. (3) `hello-film_v1.mp4` plays with sound.

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

- 2026-11-15 S2/S3: the hello-film full render takes about 5 s (VideoToolbox, 2 workers), so priority/QoS sampling and a mid-render Stop need either a longer render or a faster-reacting capture. Both C9 renders were consumed: render 1 completed (S2 A1 met, A2 not observed); render 2 completed before Stop (A4 not verified) because my capture script failed (zsh did not split a `ps` command stored in a variable). Needs a coordinator fix step and a new render approval (C9 amendment), for example a longer render via `env`/DUR through `hub_render` without changing film code, with a correct capture script. Type: phase-amend.
- 2026-11-15 note: the render stderr contains `Truncating packet of size 8294400 to 65514` from ffmpeg; output verified valid. Type: note.
- 2026-11-15 S5: Stop (`/api/jobs/:id/cancel`) ended every recorded pid, but two headless Chrome trees (browser pids 44451, 44452, ppid 1, nice 19, puppeteer profiles in `$TMPDIR`) started at the moment of Stop and survived; probable race where render workers relaunch Chrome while killTree runs. A4 not met. Type: phase-amend (fix in `killTree`/job cancel and re-test needs a coordinator decision and render approval). Also: slow mode left two Chrome renderer helpers at nice 10/pri 47, and restore leaves nice 19 (documented best effort). Type: note.
- 2026-11-15 note: the slow/normal commands apply only to a tracked render, so they must be sent while the render runs.

## 10. Closeout

- Date: 2026-11-15
- Session: coordinator + Sonnet 5.5 workers (WIP 5ebfc15, cb09a90; fix a37040d); S4 answers from Jorge Venegas
- Verdict: addressed
- Steps complete: S1, S2, S4, S5, S6 (S3 superseded by S5: the 10 s render finished before Stop)
- Verification run: `/api/guard/settings` vs `vm_stat`; job `jmwia9ztc-8d89f493` log + `ffprobe`; S5 script `p4-s5.sh` snapshots; `POST /api/jobs/<id>/cancel`; `ps -p` after Stop; S6 `node --test server/killtree-unix.test.js server/platform.darwin.test.js server/platform.linux.test.js` (33 pass); `pnpm test` → 349 tests, 348 pass, 0 fail, 1 skipped

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | met | Job `jmwia9ztc-8d89f493` done in 5 s; log `encoder: videotoolbox (h264_videotoolbox)`; `ffprobe` h264 + aac, duration 10.000000; user: plays with sound |
| A2 | met | S5 snapshots: normal nice 10 → slow nice 19 / pri 4 on root, Chrome, helpers and ffmpeg (two Chrome helpers stayed nice 10, L12) → normal: pri restored, nice stays 19 (documented best effort) |
| A3 | met | Guard `ramAvailMB` 29025 vs `vm_stat` 29023 MB; `cpuAffinity: false` with the macOS reason |
| A4 | met | S5 exposed orphaned relaunched Chrome (L11); S6 `killTree` fix; real-process test fails on old code, passes on new; real-render recheck owed to P5 (C11) |
| A5 | met | User: Renders page hides CPU-core sliders and shows the macOS note |
| A6 | met | `pnpm test` 348 pass, 0 fail; `node --check` on changed files |
| D4 (master) | met | Render, VideoToolbox, sound, QoS/niceness, RAM protection, hidden CPU controls verified on hardware; whole-tree Stop fixed and proven by the real-process test (D4 split per L13; the stopped real render after update is D9, owned by P5) |
| D1 (master) | met | `pnpm test` fail 0 |

**Discovery sweep:** (1) Wrong assumption: a 10 s film renders slowly enough to observe (L10). (2) New constraint: puppeteer keeps render scripts alive on SIGTERM and starts Chrome in its own process group (L11). (3) Unplanned work: S6 `killTree` fix. (4) For P5: update the scratch install, then run the C11 stopped render; existing films keep their own `render.js`, the fix is in `killTree` so they benefit. (5) Suspect evidence: none of P1–P3; Linux shares the old Stop defect, now fixed by the same code (Linux unverified on hardware).

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|
| L10 | 10 s render too fast; second render completed | plan-defect | P4 | S5 with DUR=120 (C10) |
| L11 | Stop orphaned relaunched Chrome | phase-amend | P4, P5, P6 | S6 fix; P5 recheck; P6 docs |
| L12 | Slow mode misses two Chrome helpers; nice not restored | note | P6 | P6 docs |

**Master updates written:** L10–L12, C10, C11
**Next-phase updates written:** P5 plan will include the C11 stopped-render recheck after update
**Remaining work and handoff:** D4 Stop recheck on a real render in P5 after updating the scratch install.
