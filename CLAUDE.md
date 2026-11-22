# VideoHub: notes for agents working on this repo

VideoHub is a local review studio and protected render queue for code-made videos on macOS and Linux, with Claude Code or OpenCode. macOS on Apple Silicon is verified on real hardware; Linux and Intel macOS are new, not yet tested on real machines. Node 22+, ES modules, no build step, vanilla-JS UI and built-in render protection. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/PLATFORMS.md](docs/PLATFORMS.md) and the film [project contract](docs/PROJECT-CONTRACT.md). Root `AGENTS.md` points to these same instructions.

## Installing VideoHub for the user
When the user opens this folder in an agent and asks to install or set up VideoHub, do the install for them. Explain each step briefly in their language. Do not change application code during an install. Keep unrelated user rules and agent settings intact.

1. **Requirements.** Check Node 22+, pnpm, ffmpeg and a native Chrome/Chromium/Edge browser. Explain missing tools before installing system packages; setup itself only prints instructions. Linux: the distribution's Node 22+ package and `apt install ffmpeg`, `dnf install ffmpeg` or `pacman -S ffmpeg`; pnpm via `npm install -g pnpm` or the distribution package; use a native browser, not a Snap/Flatpak wrapper. macOS with Homebrew: `brew install node ffmpeg pnpm`, `brew install --cask google-chrome`.
2. **Inspect without changes.** `bash setup.sh --dry-run`. `node scripts/init-config.ts --state` shows existing answers and discovered folders; `--detect` checks graphics encoders. Do not re-ask decisions already saved.
3. **Collect the missing answers** using a concise question tool and the recommended answer first: workspace (default `Documents/VideoHub`, containing films, outputs, sounds, thumbnails and archive); watch discovered video folders (no); graphics encoding when available (yes); selected agents (Claude Code, OpenCode or both); review-before-render rule (yes); Desktop shortcut (yes); start at login (no); example film (yes). Validate a typed workspace with `node scripts/init-config.ts --check "<folder>"`. Detect agents by their CLI or config folder. Ask which to use when both or neither are detected, unless already specified.
4. **Install once with the answers.** `bash setup.sh --workspace "<folder>" --agents claude,opencode --watch-found yes|no --gpu-encoder yes|no --global-rule yes|no --shortcut yes|no --startup yes|no --example yes|no`. Pass only the selected agents and replace each choice with the actual answer. `--yes` accepts recommendations. Re-runs preserve folders, configuration values and remembered answers. Read the output and explain any remaining step or failure.
5. **Check the installation.** `node server/cli.ts hub_workspace` prints the workspace; open with `bash open.sh`. With an example, inspect it using `hub_project`. Show a new film in live preview before any render and wait for the user's review.
6. **Explain what comes next.** Give the workspace location and launcher, suggest opening the example card and leaving a note, and tell them to start a new selected-agent session for `hub_*` tools. Films belong in `<workspace>/films`, never inside the VideoHub installation.

On macOS the Desktop launcher is `VideoHub.command` and briefly opens Terminal. It normally opens without a prompt; only if macOS blocks it, explain System Settings → Privacy & Security → Open Anyway; `bash open.sh` is also available. No `.app` bundle is created. Finder may ask for Automation permission on first Trash use. After an update with login startup, tell the user to open VideoHub (or log in again) to restart the hub. macOS cannot limit CPU cores: priority, background QoS and RAM protection remain available.

## Agent integration
Each selected agent gets its own MCP registration, skill and optional marked VideoHub rule block. The one skill source is `skill/videohub/SKILL.md`; never copy personal rules from one agent to the other. Claude global rules are in `~/.claude/CLAUDE.md`; OpenCode uses `~/.config/opencode/AGENTS.md` (or `$XDG_CONFIG_HOME/opencode/AGENTS.md`). When OpenCode's file exists, it takes precedence over the Claude compatibility rules; setup prints this consequence. MCP changes prefer the agent CLI, and unreadable/conflicting configuration is left untouched. Update/uninstall may change only integration entries owned by the target install. Settings → Agent name controls presentation; stored note values remain compatible.

## Updating and uninstalling
From the new downloaded folder, preview then run `bash update.sh --target "<install>"`. The update stops only the identified install after checking no render/cleanup is active, backs up replaced code and preserves data, films and notes. Restart the selected agent afterwards.

Uninstall from the installed folder with `bash uninstall.sh`, using `--dry-run` first. It removes only owned integrations and launchers. Films, outputs, notes, settings and program files remain.

## Map
- `server/platform.js`: operating-system integrations and injectable dependencies. Keep OS selection here; preserve existing public return shapes.
- `server/hub.js`: loopback HTTP/SSE; `scan.js`: catalog; `live.js`: preview; `notes.js`: review; `jobs.js`: queue; `tools.js`, `mcp.js`, `cli.js`: agent tools.
- `server/guard.js`: built-in render protection; `ramhogs.js`: RAM consumers; `encoders.js`: probed encoder arguments.
- `server/config.js`, `scripts/init-config.mjs`: workspace and settings; `scripts/agents.mjs`: agent integrations; `scripts/install.mjs`: shared install/update/uninstall/launch decisions.
- `ui/app.js`, `ui/review*`, `ui/thumbstudio*`: vanilla browser UI. `engine-hooks/`: page hooks; `examples/hello-film`: example; `templates/new-film`: film starter; `templates/thumbnail`: thumbnail templates.

## Development rules
- Work on scratch copies and test hubs, never the user's films or another install. Other sessions may be rendering.
- Installer development: use dry-run or a fake home/data/temp entirely under `.test-tmp`, including `HOME`, `XDG_CONFIG_HOME` and `XDG_DATA_HOME`. Never run agent CLI registration against the real profile during tests.
- Test hub: `VIDEOHUB_PORT=7799`, `VIDEOHUB_DATA_DIR=<scratch>`, `VIDEOHUB_BASE_DIR=<scratch>`, `VIDEOHUB_GUARD=off`, `VIDEOHUB_JOBS=off`, `VIDEOHUB_NO_WINDOW=1`. Set the same port on every CLI call so it cannot reach/start the real hub.
- New code-made films/scenes must open through `hub_live` before rendering. Stop for the user to watch, leave notes and send them to the agent. Fix code only; render only on explicit request, one render at a time through the queue. Render tests use a scratch example copy, only after the required preview review.
- Never use hard deletion as a fallback for failed Trash. Cleanup requires user approval in the UI; archive copies are verified before removing originals. Custom command jobs retain their approval step.
- No native modules, compiled helper binaries or unsigned `.app` bundles at runtime: the hub, installer scripts and films use none. npm-distributed dev and build tools with prebuilt native binaries (TypeScript, oxlint, oxfmt, Vite) are allowed. System integrations use transparent commands. Unix niceness restoration is best effort; no elevated privileges are requested.
- English code/comments/UI. Keep the compact ES module style. Read old stored values through `legacy.js`; preserve exported names and result shapes.
- The UI never imports `server/` or Node modules. After changing UI, check pages and the console with a scratch hub. Do not play or render a film merely to inspect application pages.
- Before committing: `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `node --check` changed files that are still JavaScript and inspect the staged diff for private paths, identities, tokens and user content. Tests isolate home, temp, workspace and data under `.test-tmp`; OS tests inject dependencies. Linux and Intel macOS desktop and rendering acceptance still requires real hardware.
- Keep `templates/new-film/render.js` equal to `examples/hello-film/render.js`. See [docs/RENDER-SPEED.md](docs/RENDER-SPEED.md) for render-specific verification.
- Publish only when asked. Browser upload cannot carry dot-prefixed names; `.github/workflows/test.yml` must be uploaded through a route that supports it. Do not work around upload exclusions. `scripts/make-upload.ts` prepares the normal upload folder when publishing is authorized.

Older distributed copies are not updated by source edits: distribute the new version and explicitly update the intended install.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for performance, filesystem watcher, media and local-server security pitfalls.
