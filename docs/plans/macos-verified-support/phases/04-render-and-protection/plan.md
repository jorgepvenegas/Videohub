# Phase P4 — Render and protection

- Plan ID: `macos-verified-support`
- Phase: P4
- Plan version: 1
- Validated against master version: 23
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

- [ ] P3 done; scratch hub listening on 7799 with jobs and guard enabled — verify: `lsof -nP -iTCP:7799 -sTCP:LISTEN`; `curl -s 127.0.0.1:7799/api/guard/settings`
- [ ] No render running — verify: `curl -s 127.0.0.1:7799/api/renders`
- [ ] User approved rendering after preview review (C9)
- [ ] Phase plan revalidated against current master version
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — Read protection state before rendering

- Depends on: none
- Files:
  - none in the repository
- Change: record `/api/guard/settings` (capabilities, `cpuAffinity: false`, `cpuLimitReason`, pause/critical MB, free RAM) and compare the reported free RAM with `vm_stat` (free + inactive + speculative pages × page size) taken at the same moment.
- Acceptance:
  - [ ] Guard reports macOS capabilities with CPU affinity unavailable and the explanation; free RAM within 10% of the `vm_stat` calculation
- Verification: `curl -s 127.0.0.1:7799/api/guard/settings` and `vm_stat` outputs recorded
- Rollback: none (read-only)

### S2 — Render once to completion and watch priority and QoS

- Depends on: S1
- Files:
  - none in the repository
- Change: from `/Users/jorge/VideoHubScratch/install` queue the render with `VIDEOHUB_PORT=7799 node server/cli.js hub_render '{"project":"hello-film"}'` (adjust to the tool's real JSON schema). While it runs, capture the render tree with `ps -axo pid,ppid,pgid,nice,pri,command` at least twice; switch the render to slow mode through the documented guard control (`/api/guard/temp` or the Renders page action found in `server/hub.js`), capture `nice`/`pri` again (expect nice 19 and background priority), then restore and capture once more (restoration is best effort per docs). Poll `hub_job` until done. Then `ffprobe` the output: video stream, audio stream, duration about 10 s; read the job log for the encoder actually used (`h264_videotoolbox` or `hevc_videotoolbox`).
- Acceptance:
  - [ ] Job finishes successfully; output has video and audio, about 10 s; log shows a VideoToolbox encoder
  - [ ] Slow mode raises niceness to 19 and lowers `pri` across the tree; restore is recorded (may stay lowered without privileges)
- Verification: `hub_job` final state; `ffprobe -v error -show_entries stream=codec_type,codec_name -show_entries format=duration <output>`; captured `ps` snapshots
- Rollback: none (output stays in the scratch workspace; P5 uninstall leaves outputs, scratch folder removed at P5 end)

### S3 — Start a second render and Stop it

- Depends on: S2
- Files:
  - none in the repository
- Change: queue the same render again; after about 10 s, record the full process tree (root pid, pgid, children including ffmpeg and Chrome), press Stop through the same API the Renders page uses (`/api/renders/cmd` or the documented route), wait 5 s, and check that no process from the recorded tree survives.
- Acceptance:
  - [ ] Job ends as stopped/cancelled; `ps -p <each recorded pid>` finds none; no orphan headless Chrome or ffmpeg from that render
- Verification: before/after `ps` captures recorded
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

## 6. Phase acceptance criteria

- [ ] A1 — One render completes through the queue with video and audio using VideoToolbox — verify: S2 `hub_job`, `ffprobe`, job log
- [ ] A2 — Render niceness and background QoS apply in slow mode and restoration is recorded — verify: S2 `ps` snapshots
- [ ] A3 — RAM protection reads free memory consistent with `vm_stat` and CPU affinity is reported unavailable — verify: S1
- [ ] A4 — Stop ends the whole render tree — verify: S3 before/after `ps`
- [ ] A5 — Renders page hides CPU-core controls with the explanation — verify: S4 (1)
- [ ] A6 — If a repository fix was made, `pnpm test` → `fail 0` and `node --check` on changed files; otherwise `git status --short` shows no source change

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [ ] Names and structure state intent; comments explain only non-obvious reasons
- [ ] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [ ] Master standards commands pass: format none, lint none, `node --check` on changed files, `pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| R7: pnpm's symlinked `node_modules` stops the film render script from loading `puppeteer-core` | low | high | S2 is the real check; on failure stop and add a fix step |
| Render loads the Mac heavily while the user works | medium | low | Guard is on; renders are about 10 s of film |
| `taskpolicy -B` cannot lift background QoS without privileges | medium | low | Docs already call restoration best effort; record observed values |
| Stop leaves Chrome helper processes (different process group) | medium | medium | S3 checks every recorded pid; surviving ones become a defect with a fix step |
| Repo fixes do not reach the running scratch install | certain | low | A fix is tested in the repo; P5 update carries it to the scratch install |

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
