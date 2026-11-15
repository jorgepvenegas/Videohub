# Master Plan — macOS verified support

- Plan ID: `macos-verified-support`
- Master version: 7
- Status: draft
- Created: 2026-11-14
- Source: user request (2026-11-14): "I need to create a macOS compatible version of this project. create a plan to achieve this"
- Size: large
- Owner: coordinator agent (Claude Code); approvals by Jorge Venegas
- Plan directory: `docs/plans/macos-verified-support`
- Branch: `plan/macos-verified-support`

`Status` is one of `draft`, `active`, `complete`, or `blocked`. `approve` sets `active`; `close` sets `complete` when every phase is done.

### Intake

- Problem: VideoHub already contains a macOS code path (`server/platform.js` darwin branch, Bash lifecycle scripts, `.command` launcher, LaunchAgent, VideoToolbox encoders), but `docs/PLATFORMS.md` states it was only exercised by injected tests on Windows and has never run on a real Mac. Read-only probes on this Mac already show Mac-specific defects.
- Outcome: a Mac user can install, review, render, protect, update and uninstall VideoHub on Apple Silicon macOS with the same contracts as Windows, and the docs state that this was verified on real hardware.
- Acceptance: D1–D7 below.
- Constraints: one shared codebase (no fork); CLAUDE.md rules hold — no native modules, compiled helpers or `.app` bundle; Windows behavior and public return shapes unchanged; no hard-delete fallback; renders only after preview review and explicit request; tests isolate home/temp/data under `.test-tmp`.
- Non-goals: see section 5.
- Unknowns: answered below (U1–U4).
- Size: large — several subsystems (platform layer, installer, render queue/guard, agent integrations, docs) and real-machine acceptance across sessions.

Gap answers (2026-11-14, Jorge Venegas):

- U1 Goal: **verify and fix the existing macOS support** in the shared codebase; not a separate build, not an `.app` bundle.
- U2 Real-account checks: **scratch install on the real account** — install a copy into a scratch folder with a scratch workspace, walk through permission prompts with the user, then uninstall. Never touch the user's films, real workspace or agent configuration without asking first.
- U3 Baseline failures: **fix in the first phase** so `npm test` is green before macOS work.
- U4 Hardware: **Apple Silicon only**; Intel macOS stays "implemented, not verified".

## 1. Objective

A VideoHub user on an Apple Silicon Mac can install VideoHub with `setup.sh`, open the hub from the Desktop launcher, review a code-made film in live preview and leave notes, render it with VideoToolbox through the protected queue, stop a render, send files to the Finder Trash, start the hub at login, update without losing data, uninstall cleanly, and use the `hub_*` tools from Claude Code — and `docs/PLATFORMS.md` reports macOS (Apple Silicon) as verified on real hardware instead of "pending".

## 2. Goal flow

```mermaid
flowchart LR
    A["Mac user today<br/>macOS path is untested"] --> B["Runs setup.sh<br/>and opens the Desktop launcher"]
    B --> C["Reviews the example film<br/>in live preview and leaves a note"]
    C --> D["Renders it safely<br/>with Mac hardware encoding"]
    D --> E["Updates, cleans up to Trash<br/>and uninstalls without data loss"]
    E --> F["Docs say macOS<br/>Apple Silicon is verified"]
```

## 3. Definition of done

- [ ] D1 — The full test suite passes on this Mac with zero failures — verify: `npm test` → `fail 0`
- [ ] D2 — Platform calls return Mac-correct data on real hardware: storage volumes exclude system/simulator mounts, the GPU is named, and launchers survive a Node version-manager or Homebrew upgrade path — verify: darwin unit tests in `server/platform.darwin.test.js` plus a read-only probe script run on this Mac
- [ ] D3 — A scratch install made with `bash setup.sh` on the real account opens the hub from `VideoHub.command` (Gatekeeper first-launch documented), shows the example film in live preview, saves a note, and the folder picker and Finder reveal work — verify: user observation recorded in P3 closeout + `node server/cli.js hub_workspace` on the scratch port
- [ ] D4 — One reviewed render of a scratch example completes through the queue with sound and VideoToolbox, Stop terminates the whole process tree, background QoS/niceness and RAM protection apply, CPU sliders are hidden with the explanation — verify: `ffprobe` on the output, `ps -o pid,ppid,nice,command` during render, UI observation
- [ ] D5 — Finder Trash cleanup is restorable (Automation prompt handled, no hard delete), the LaunchAgent starts the hub at login, update preserves data/notes, and uninstall removes only owned integrations — verify: restore from Finder, `launchctl print gui/$(id -u)/com.videohub.hub`, data diff before/after update, uninstall dry-run then run
- [ ] D6 — A new Claude Code session exposes the `hub_*` tools from the scratch install (OpenCode checked if the user agrees) — verify: tool list in a fresh agent session
- [ ] D7 — `docs/PLATFORMS.md`, `README.md` and `CLAUDE.md` state macOS Apple Silicon as verified on real hardware, Intel as pending, and record any new macOS limits found — verify: `grep -n "macOS" docs/PLATFORMS.md README.md CLAUDE.md`

## 4. Code standards

| Topic | Rule or command |
|---|---|
| Source of truth | `CLAUDE.md` (Development rules), `docs/ARCHITECTURE.md`, `docs/PLATFORMS.md` |
| Format | none (no formatter configured; match the compact ES module style of surrounding code) |
| Lint | none |
| Type check | `node --check <each changed .js/.mjs file>` |
| Tests | `npm test` (Node test runner via `scripts/test.mjs`; isolates home/temp/data under `.test-tmp`) |
| Project rules | OS selection stays in `server/platform.js` with injectable deps; preserve Windows behavior and exported names/return shapes; read old stored values through `legacy.js`; UI never imports `server/`; test hubs use `VIDEOHUB_PORT=7799`, `VIDEOHUB_DATA_DIR`/`VIDEOHUB_BASE_DIR` scratch, `VIDEOHUB_GUARD=off`, `VIDEOHUB_JOBS=off`, `VIDEOHUB_NO_WINDOW=1` (guard/jobs on only in P4); keep `templates/new-film/render.js` equal to `examples/hello-film/render.js`; inspect staged diff for private paths, identities and tokens before commit |

## 5. Non-goals

- A separate macOS fork, distribution or branch-specific build.
- A signed or unsigned `.app` bundle, notarization, native modules or compiled helpers (CLAUDE.md forbids them).
- Intel macOS verification (no hardware); Linux verification.
- CPU-core affinity on macOS (no supported API; already documented as unavailable).
- Changes to Windows behavior, refactors of shared code not required by a macOS defect, and new features.
- Touching the user's real workspace, films or existing agent configuration without asking first.

## 6. Current state and assumptions

| Area | Evidence | Constraint or surprise |
|---|---|---|
| Request | User request 2026-11-14; answers U1–U4 above | Verify-and-fix in the shared codebase |
| Machine | `uname -m` → arm64; macOS 26.6.2 (25G83); Node 24.16.0 via asdf; `/opt/homebrew/bin/ffmpeg`; Google Chrome in `/Applications`; `claude` and `opencode` CLIs in `/opt/homebrew/bin` | No Intel Mac, no Edge/Chromium |
| macOS code path | `server/platform.js:319-550` (Unix `createPlatform` branch, `IS_MAC`); `scripts/install.mjs:153,241,247` (`VideoHub.command`); `server/platform.js:502-506` (LaunchAgent `com.videohub.hub.plist`) | Implemented, never run on a Mac |
| Existing tests | `server/platform.darwin.test.js` (13 tests), macOS cases in `scripts/install.test.js:65-80` | Injected-dependency tests only |
| Baseline | `npm test` → 342 tests, 338 pass, **3 fail**, 1 skipped | Failures: `scripts/upload-rules.test.js:19` and `scripts/distribution-safety.test.js:10` flag the committed `.agents/`/`.claude/` skill folders (dot names, symlinks); `scripts/windows-safety.test.js:28` requires `open.ps1` to be absent but it is tracked |
| Encoder probe | `node scripts/init-config.mjs --detect` → `{"available":["videotoolbox","x264"],"best":"videotoolbox","gpus":[]}` | VideoToolbox works; GPU list empty |
| Volumes | `volumes()` probe → 19 mounts including `/dev`, `/System/Volumes/{VM,Preboot,Update,xarts,iSCPreboot,Hardware,Data}` and CoreSimulator images | Noise in storage UI and mount matching |
| GPU names | `server/platform.js:534` `gpuNames()` returns `[]` when `IS_MAC` | No GPU shown on Mac |
| Launcher Node path | `scripts/install.mjs:241` writes `process.execPath` into `VideoHub.command`; LaunchAgent uses the same | asdf → `~/.asdf/installs/nodejs/24.16.0/bin/node`; Homebrew → versioned Cellar path; both break after a Node upgrade |
| asdf under fake HOME | `bash setup.sh --dry-run` under a `.test-tmp` HOME exited 126 because `/Users/jorge/.asdf/shims/node` depends on the real HOME | Probes and tests on this Mac must put a real `node` first on PATH |
| Windows-only exports | `server/platform.js:317` exports `getShortcut`/`setShortcut`/`getAutostartState`, absent from the Unix return at `:550` | All callers in `scripts/install.mjs` are guarded by `platform.IS_WIN`; harmless, recorded as a note |

**Assumptions:** Finder Automation, Gatekeeper and LaunchAgent behavior on macOS 26 match the documented flows (checked in P3/P5 with the user). Puppeteer renders use the installed Chrome via existing browser lookup (checked in P4).
**Unknowns:** Which further defects real-hardware runs reveal in P3–P5; those become discoveries and, if large, new phases.

## 7. Phase map

| ID | Phase | Outcome | Depends on | Status | Plan |
|---|---|---|---|---|---|
| P1 | Green baseline | npm test passes with zero failures on this Mac | none | planned | [plan](phases/01-green-baseline/plan.md) |
| P2 | macOS platform fixes | Volumes, GPU names and launcher Node path are correct on real macOS, with darwin tests | P1 | planned | pending |
| P3 | Scratch install and review | Scratch setup.sh install opens from VideoHub.command; live preview, notes, folder picker and Finder reveal work | P2 | planned | pending |
| P4 | Render and protection | One reviewed VideoToolbox render with sound; Stop, QoS/niceness, RAM protection and hidden CPU sliders verified | P3 | planned | pending |
| P5 | Lifecycle and agents | Finder Trash restore, LaunchAgent login start, data-preserving update, clean uninstall, Claude Code hub_* tools | P4 | planned | pending |
| P6 | Docs verified status | PLATFORMS/README/CLAUDE docs mark macOS Apple Silicon verified and record new limits | P5 | planned | pending |

Exit criteria per phase: P1 → D1; P2 → D2 and D1 still green; P3 → D3; P4 → D4; P5 → D5, D6; P6 → D7 and a final `npm test`. Each of P3–P5 fixes the macOS defects it finds inside its own scope; a defect that needs more than a targeted fix becomes a new phase.

Status: `planned`, `ready`, `in_progress`, `done`, `blocked`, `needs_replan`, `superseded`.
`ready` means the user has explicitly approved that phase plan. A written plan is not `ready` until it passes the approval gate. Later phases may stay as outlines; add them with `add-phase --outline`, then write the plan with `write-plan` just before the phase starts and stop for approval.

A phase plan with `Parallel safe: yes` may be approved before its dependencies are done. Use it only for phases the master explicitly marks independent. No phase in this plan is parallel safe: P3–P5 share one scratch install, and P2–P5 share `server/platform.js`.

## 8. Cross-phase decisions

Append-only. Supersede a decision with a new row; never delete history.

| ID | Date | Decision | Reason | Affects |
|---|---|---|---|---|
| C1 | 2026-11-14 | Fix macOS in the shared codebase behind `IS_MAC`; no fork and no `.app` bundle | U1; CLAUDE.md forbids unsigned bundles and compiled helpers | all |
| C2 | 2026-11-14 | Real-account checks use one scratch install (`~/VideoHubScratch/install`) and scratch workspace (`~/VideoHubScratch/workspace`) on port 7799, created in P3 and removed at the end of P5; agent registration on the real profile only after asking the user | U2; CLAUDE.md forbids touching the user's films or another install | P3, P4, P5 |
| C3 | 2026-11-14 | Probes and tests on this Mac put a real Node binary first on PATH (asdf shims depend on the real HOME) | Baseline: `setup.sh` exited 126 under a fake HOME | all |

## 9. Discovery ledger

Append-only. One row per discovery that changed or could change a plan. Use `note` for findings worth keeping with no plan change.

| ID | Date | Phase | Affects | Discovery | Type | Action taken | Status |
|---|---|---|---|---|---|---|---|

Types: `note`, `phase-amend`, `next-phase-amend`, `master-amend`, `new-phase`, `scope-change`, `plan-defect`.
Statuses: `open`, `applied`, `superseded`, `wontfix`. Only `superseded` rows are skipped by discovery propagation.

Every row must have an `Affects` value: `all`, one phase ID, or a comma-separated list/range such as `P3–P5`. `check` fails a `ready`, `in_progress`, or `done` phase that does not list every affecting row in its `Prior discoveries applied` table.

## 10. Open questions, risks, and blockers

| ID | Question or risk | Owner | Needed by | Status |
|---|---|---|---|---|
| R1 | Real-hardware runs (P3–P5) may surface defects too large for a targeted fix | coordinator | P3–P5 closeouts | open — add a new phase if so |
| R2 | Finder Automation / Gatekeeper prompts need the user at the keyboard | Jorge Venegas | P3, P5 | open |
| R3 | Registering MCP/skill with the real Claude Code/OpenCode profile changes user config | Jorge Venegas | P5 | open — ask before registering; uninstall must remove only owned entries |
| R4 | Other sessions may be running a real VideoHub hub on port 7788 | coordinator | P3 | open — scratch uses 7799 only |

## 11. Closeout history

| Phase | Date | Verdict | Criteria met | Commit | Report |
|---|---|---|---|---|---|

## 12. Resume brief

- Current phase: P1 (draft plan awaiting approval)
- Last verdict: none
- Next action: get user approval for P1, then delegate to a worker subagent
- Open decisions: R2, R3
- PR: none
- Last updated: 2026-11-14
