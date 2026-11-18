# Platform support

VideoHub supports macOS and Linux. macOS on Apple Silicon is **verified on real hardware** (macOS 26.6, M2 Max, 2026-11-15). Linux and Intel macOS are **new, not yet tested on real machines**; their operating-system calls are covered by injected tests. Passing unit tests does not establish desktop integration or render performance on another operating system.

`server/platform.js` owns operating-system integrations. The queue, cleanup, UI and MCP tools keep the same public contracts. Everything stays local: the hub listens on `127.0.0.1`.

| Feature | Linux desktop | macOS |
|---|---|---|
| Workspace, scan, notes and live preview | Implemented; real desktop verification pending | Verified on Apple Silicon |
| Settings location | `$XDG_CONFIG_HOME/videohub` or `~/.config/videohub` protection settings; install `data/` for hub data | `~/Library/Application Support/VideoHub` protection settings; install `data/` for hub data |
| Desktop and Documents | `xdg-user-dir`, then `~/Desktop` and `~/Documents` | `~/Desktop` and `~/Documents` |
| ffmpeg and ffprobe | Native executables on PATH | Native executables on PATH (including Homebrew paths supplied by the launcher) |
| Browser discovery | Native Chrome, Chromium and Edge on PATH; `VIDEOHUB_BROWSER` override | Chrome, Edge and Chromium in `/Applications` or `~/Applications`; `VIDEOHUB_BROWSER` override |
| App-style hub window | Native browser `--app`; `xdg-open` fallback | Chrome/Edge via `open -na` with `--app`; default-browser `open` fallback |
| Open media and folders | `xdg-open` | `open` with default application |
| Reveal a selected file | FileManager1 D-Bus where available; parent folder fallback | `open -R` |
| Folder dialog | `zenity` or `kdialog`; typed-path UI fallback if neither exists | AppleScript `choose folder`; cancellation leaves the selection unchanged |
| Reversible deletion | `gio trash`, `trash-put`, then freedesktop Trash in Node; refuse if no safe destination is available | Finder Trash via AppleScript (file passed as an alias); Put Back works; Automation permission may be requested on first use; refusal preserves source |
| Volume information | `df -kP` | `df -kP` |
| Render notifications | `notify-send` if available; otherwise in-app notices only | AppleScript desktop notification; best effort |
| Process list and RAM hogs | `/proc`, with `ps` fallback; Linux system processes excluded | `ps -axo`; macOS system processes excluded |
| Render tree stop | Freeze the render root (SIGSTOP), then TERM its process tree and KILL after a grace period, then KILL the root | Freeze the render root (SIGSTOP), then TERM its process tree and KILL after a grace period, then KILL the root; no orphaned headless Chrome after Stop |
| Render priority | Per-process niceness | Per-process niceness; `taskpolicy` background QoS in slow mode |
| CPU core limit | `taskset` if available; priority and RAM protection remain available without it | Unavailable: no supported affinity API; CPU sliders and presets hidden with explanation |
| RAM protection | Available memory and existing thresholds | `vm_stat`: free + inactive + speculative pages × page size |
| Autostart | XDG `autostart/videohub.desktop` | `~/Library/LaunchAgents/com.videohub.hub.plist`; `launchctl bootstrap` / `bootout`; update stops the hub but does not restart it, so open VideoHub or log in again |
| Custom render commands | `/bin/sh -c`, with the same approval step | `/bin/sh -c`, with the same approval step |
| Video encoders | NVENC, VAAPI, QSV, x264; short encode probes decide availability | VideoToolbox and x264; Apple Silicon quality / Intel bitrate candidates probed; VideoToolbox measured on Apple Silicon |
| Render template browser lookup | Native browser paths plus `VIDEOHUB_BROWSER` | Application browser paths plus `VIDEOHUB_BROWSER` |
| Install, update and uninstall | `setup.sh`, `update.sh`, `uninstall.sh` | Same Bash scripts with macOS paths and Homebrew hints; setup installs dependencies with pnpm |
| Desktop launcher | Desktop entry with SVG icon | Optional executable `VideoHub.command`; no `.app` bundle; opens without a Gatekeeper prompt on Apple Silicon |
| Claude Code integration | CLI MCP registration, skill and managed global rule, through the shared Node helper | Same integrations through shared Node helper |
| OpenCode integration | CLI MCP registration; JSONC-tolerant fallback only if CLI is absent; skill and managed rule, through the shared Node helper | Same integrations through shared Node helper |

## Optional Linux tools

Native Chrome, Chromium or Edge and ffmpeg are needed for renders. Setup prints package-manager hints and does not silently install system packages. Install `zenity` or `kdialog` for a graphical folder picker, `taskset` for CPU affinity, and `notify-send` for desktop notifications. Their absence does not disable the hub. The Renders page explains when CPU limits are unavailable.

Trash helpers are optional. The Node fallback writes restorable `.trashinfo` metadata and moves files rather than hard-deleting them. Home-filesystem paths use the user's Trash; other filesystems need a writable `.Trash-<uid>` destination. If no safe Trash operation works, the source stays in place and VideoHub reports the refusal.

## macOS permissions and limits

The optional Desktop `VideoHub.command` launcher opens Terminal briefly. Setup creates it locally, so it normally opens without a Gatekeeper prompt. No unsigned `.app` bundle is created. Only if macOS does block it, use System Settings → Privacy & Security → Open Anyway, then open the launcher again; `bash open.sh` from the installation is an alternative. With login startup, an update stops the hub without restarting it: open VideoHub or log in again.

Finder may request Automation permission when VideoHub first sends files to Trash; the Automation message appears only when macOS reports that permission is missing, and any other Finder error is reported as Finder returned it. On refusal VideoHub keeps the source. It does not fall back to permanent deletion. macOS has no supported CPU-core affinity API, so the Renders page hides core-power controls while retaining niceness, background QoS and RAM protection.

On Linux and macOS, raising priority after a slow period can require privileges. Restoration is best effort without elevation; an existing render may keep its lower nice priority until completion. In slow mode a couple of Chrome helper processes may keep normal niceness while the rest of the render tree is lowered. A new render starts with its configured priority. The UI does not promise a precise CPU percentage when affinity is unavailable.

## Agent integration

Setup can target Claude Code, OpenCode or both. Skills share one source file and rules are limited to VideoHub's marked block. Existing unrelated settings and rules remain in their respective agent files. An OpenCode `AGENTS.md` causes OpenCode to prefer that rules file over Claude's global rules; setup prints this consequence and does not copy unrelated rules between agents.

## Not supported

- Snap and Flatpak browser wrappers are not used for Puppeteer renders; install a native browser executable.
- Linux CPU affinity without `taskset`, and CPU affinity on macOS; priority and RAM protection still work.
- Guaranteed restoration of Unix niceness without the required privileges; no elevated helper is installed.
- Permanent deletion as a fallback for an unavailable Trash.
- Native modules, compiled helper programs and unsigned `.app` bundles.
- Renders made from an older template are not rewritten. Their own browser lookup may need updating or the script may need to honor `VIDEOHUB_BROWSER`.

## Real-machine acceptance still required

On Ubuntu 24.04 desktop, install from a fresh clone, open the example in live preview, send a note, render once with sound after approving the preview, inspect priority and `taskset`, stop a render with children, restore a deleted folder from Trash, update while retaining data, and uninstall. Apple Silicon macOS (macOS 26.6, M2 Max) completed this list on 2026-11-15: installation, live preview, notes, a VideoToolbox render, priority/background QoS, whole-tree Stop, Trash and Put Back, LaunchAgent login startup, data-preserving update, uninstall and Claude Code integration. Repeat it on Intel macOS if available. Still unverified on real machines: Linux, Intel macOS, other macOS versions, a real OpenCode session exposing the `hub_*` tools.
