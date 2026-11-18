# Phase P3 — Templates, docs and agent rules

- Plan ID: `remove-windows-support`
- Phase: P3
- Plan version: 1
- Validated against master version: 13
- Status: done
- Approved by: Jorge Venegas
- Approved at: 2026-11-17
- Commit: 0ab6645
- Implementation mode: subagent
- Implemented by: p3-worker
- Implemented at: 2026-11-17
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: P2
- Written: 2026-11-17
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Finish the removal where users and agents see it. Remove the Windows browser paths from the two render templates and keep them byte-equal. Update `package.json` so it lists only `linux` and `darwin`. Delete `docs/WINDOWS-SECURITY.md`. Rewrite README, CLAUDE.md, the docs and the skill so they describe macOS + Linux only: no Windows install commands, no `.cmd`/`.ps1` entry points, no Windows security guidance, no Recycle Bin/Explorer wording. Then run the full D1–D6 sweep, which closes the plan.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D1 | Deletes `docs/WINDOWS-SECURITY.md`; final D1 check | A1 |
| D2 | Clears templates, examples, skill and `package.json`; final D2 check across all source paths | A2 |
| D3 | Final Unix lifecycle check (installer tests + scratch-copy setup dry-run) | A3 |
| D4 | Rewrites README, CLAUDE.md, AGENTS.md, docs and skill | A4 |
| D5 | `package.json` `os` drops `win32`; final suite and syntax check | A5 |
| D6 | Template and example `render.js` drop Windows paths and stay byte-equal | A6 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L3 | Lifecycle dry-runs must run from a scratch copy with real node first on PATH | S6 runs the D3 setup dry-run that way |
| L4 | Baseline after P1: 325/324/1/0 | Superseded by L9 for comparison; no step change |
| L5 | `scope` reads only the first path of each Files: bullet | Every Files: bullet below names one file |
| L6 | P1/P2 marked D1/D2/D5 met only for their own share | S6 re-runs D1–D6 in full with the master commands; the closeout reports full-plan verdicts |
| L7 | `exe: null` in `/api/guard/settings` is the accepted D2 exception (master D2 amended) | A2 allows exactly that hit and no other |
| L8 | Backslash/drive-letter normalization and `vmmem`/WSL process names remain in `server/` | Not in scope; the closeout lists them as known non-D2 remnants |
| L9 | Baseline after P2: 299 tests, 298 pass, 1 skipped, 0 fail | A5 expects 0 failures and the same count (docs/template changes add or remove no tests) |
| L10 | `windowsHide` in both render.js spawn calls | Removed in S1 (both files, byte-equal) |
| L11 | Docs cells depending on Windows text; fs.watch pitfall kept reworded | Rewritten in place during S5 |

## 3. Scope

In scope:
- Template and example `render.js` browser lookup, plus `package.json` metadata.
- Deleting `docs/WINDOWS-SECURITY.md`.
- Removing the Windows content from README, CLAUDE.md, AGENTS.md, `docs/*.md` (except `docs/plans`) and `skill/videohub/SKILL.md`.

Writing rules:
- State the supported platforms positively ("macOS and Linux"). Do not add a Windows refusal or "Windows is not supported" warning (decision C2). Remove Windows rows, columns and sections; do not replace them with notices.
- CLAUDE.md: rewrite install steps 1–6 and the update/uninstall section for `setup.sh`/`update.sh`/`uninstall.sh`/`open.sh` only. Remove the Windows security paragraph and the link to WINDOWS-SECURITY.md. In Development rules, drop the Windows-only clauses (execution policy, PowerShell, P/Invoke, `.cmd` entry points, `USERPROFILE`/`APPDATA`/`LOCALAPPDATA` in the test isolation list). Keep the general rules (no native modules, no compiled helper binaries, no unsigned `.app` bundles, no elevated privileges). Keep every non-Windows rule unchanged.
- `docs/RENDER-SPEED.md` "What was measured" is a historical record from a Windows 11 PC, including an AMF row. Keep the measurement and add a short note that it predates the macOS/Linux-only codebase and that AMF is no longer probed. This is the one allowed D4 hit; the closeout lists it.
- `docs/MIGRATING.md`: delete the line about renamed Windows script names; keep the rest.
- Use plain English and match each document's existing tone and layout.

Out of scope:
- Code in `server/`, `ui/`, `scripts/` (done in P1/P2) except what the final sweep shows was missed, which is a discovery to report, not to fix.
- `docs/plans/`, screenshots, `pnpm-lock.yaml` (must not change), publishing or `scripts/make-upload.mjs`.
- The L8 path-normalization remnants.

## 4. Entry conditions

- [ ] P2 is `done`; tree clean on `plan/remove-windows-support` — verify: `git status --short && git branch --show-current`
- [ ] Baseline matches L9 — verify: `pnpm test` — 299 tests, 0 fail
- [ ] Phase plan revalidated against current master version
- [ ] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — Remove Windows browser paths from the render templates

- Depends on: none
- Files:
  - `templates/new-film/render.js` (modify) — `browserPath()` candidate list and its comment
  - `examples/hello-film/render.js` (modify) — same change, byte-equal result
- Change: drop the `C:/Program Files...` and `AppData/Local` candidates. Keep `CHROME`, `VIDEOHUB_BROWSER`, PATH names and the macOS `/Applications` lookup, plus the Snap/Flatpak checks. Do not touch the backslash classes in the Snap/Flatpak regexes; they are harmless on Unix.
- Acceptance:
  - [x] `cmp templates/new-film/render.js examples/hello-film/render.js` exits 0 (cmp: same)
  - [x] `grep -nE "win32|\.exe\b|Program Files|AppData" templates examples` prints nothing (empty)
- Verification: `node --check templates/new-film/render.js && cmp templates/new-film/render.js examples/hello-film/render.js` — expected: exit 0
- Rollback: `git checkout HEAD -- templates/new-film/render.js examples/hello-film/render.js`

### S2 — Update package metadata

- Depends on: none
- Files:
  - `package.json` (modify) — `os` becomes `["linux", "darwin"]`; drop the `windows` keyword
- Change: no other field changes. `pnpm-lock.yaml` must not change.
- Acceptance:
  - [x] `node -p "require('./package.json').os"` prints `[ 'linux', 'darwin' ]` (printed as stated)
  - [x] `pnpm install --frozen-lockfile` succeeds and `git diff --quiet pnpm-lock.yaml` exits 0 (Already up to date; lock-unchanged)
- Verification: the two commands above — expected: as stated
- Rollback: `git checkout HEAD -- package.json`

### S3 — Remove the Windows security guide

- Depends on: none
- Files:
  - `docs/WINDOWS-SECURITY.md` (delete)
- Change: `git rm` it. S4 and S5 remove the links to it.
- Acceptance:
  - [x] `git ls-files docs/WINDOWS-SECURITY.md` prints nothing and `grep -rn "WINDOWS-SECURITY" --exclude-dir=node_modules --exclude-dir=plans .` prints nothing after S4–S5
- Verification: the commands above — expected: no output
- Rollback: `git checkout HEAD -- docs/WINDOWS-SECURITY.md`

### S4 — Rewrite agent instructions for macOS + Linux

- Depends on: S3
- Files:
  - `CLAUDE.md` (modify) — intro sentence, install steps 1–6, update/uninstall section, Map, Development rules, Windows security paragraph
  - `AGENTS.md` (modify only if it carries Windows content)
  - `skill/videohub/SKILL.md` (modify) — "Recycle Bin" → "Trash"
- Change: apply the writing rules above.
- Acceptance:
  - [x] `grep -nE "Windows|PowerShell|winget|\.cmd\b|\.ps1\b|%APPDATA%|Recycle Bin|Explorer|SmartScreen|USERPROFILE|LOCALAPPDATA" CLAUDE.md AGENTS.md skill/videohub/SKILL.md` prints nothing (empty)
  - [x] Every non-Windows rule in CLAUDE.md is still present (review the diff; the closeout lists removed clauses)
- Verification: the grep plus `git diff CLAUDE.md` review — expected: no grep output
- Rollback: `git checkout HEAD -- CLAUDE.md AGENTS.md skill/videohub/SKILL.md`

### S5 — Rewrite README and docs for macOS + Linux

- Depends on: S3
- Files:
  - `README.md` (modify) — platform banner, Trash wording, CPU limits/encoders bullets, requirements table, Windows install/launch/security/update/uninstall sections, `-Agents` legacy note
  - `docs/PLATFORMS.md` (modify) — remove the Windows column, the "Windows security behavior" section and Windows-only clauses
  - `docs/ARCHITECTURE.md` (modify) — "Windows is established" intro, Recycle Bin wording, the Windows `fs.watch` pitfall (rewrite it as a Unix-neutral rule if the behavior is still kept, per P2), CI sentence, "Distribution and Windows trust" heading/section
  - `docs/RENDER-SPEED.md` (modify) — historical-measurement note (writing rules)
  - `docs/MIGRATING.md` (modify) — delete the Windows script-name line
- Change: apply the writing rules above.
- Acceptance:
  - [x] `grep -rnE "Windows|PowerShell|winget|\.cmd\b|\.ps1\b|%APPDATA%|Recycle Bin|Explorer|SmartScreen" README.md docs --exclude-dir=plans` prints only the RENDER-SPEED historical note (docs/RENDER-SPEED.md:67)
- Verification: the grep — expected: only the allowed hit
- Rollback: `git checkout HEAD -- README.md docs/PLATFORMS.md docs/ARCHITECTURE.md docs/RENDER-SPEED.md docs/MIGRATING.md`

### S6 — Final D1–D6 sweep

- Depends on: S1, S2, S3, S4, S5
- Files: none (verification only)
- Change: run each master D1–D6 verification command exactly as written in `master.md` (D2 as amended by L7). For D3, run the `bash setup.sh --dry-run --yes` from a scratch copy per L3. For D5, run `node --check` on every `.js`/`.mjs` changed since the plan base commit `9b122eb`. Record each command and its result in the closeout.
- Acceptance:
  - [x] All six DoD checks pass, with only the two recorded exceptions (L7 for D2, RENDER-SPEED for D4)
- Verification: as described — expected: as stated
- Rollback: none

## 6. Phase acceptance criteria

- [x] A1 — D1 holds — verify: `git ls-files '*.cmd' '*.ps1' '*.bat' '*.vbs' 'scripts/windows-*' 'server/platform.win32.test.js' 'docs/WINDOWS-SECURITY.md'` prints nothing
- [x] A2 — D2 holds — verify: the master D2 grep prints only the L7 `exe: null` lines
- [x] A3 — D3 holds — verify: `pnpm test` installer/agents/init-config tests pass; scratch-copy `bash setup.sh --dry-run --yes` exits 0
- [x] A4 — D4 holds — verify: the master D4 grep shows only the RENDER-SPEED historical note
- [x] A5 — D5 holds — verify: `pnpm install --frozen-lockfile && pnpm test` — 0 failures; `package.json` `os` is `[ 'linux', 'darwin' ]`; `node --check` clean on every `.js`/`.mjs` changed since `9b122eb`
- [x] A6 — D6 holds — verify: `cmp templates/new-film/render.js examples/hello-film/render.js` exits 0 and the D2 grep has no hit in either file

## 7. Code standards check

- [x] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [x] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [x] Names and structure state intent; comments explain only non-obvious reasons
- [x] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [x] Master standards commands pass: format none, lint none, `node --check` on each changed file, `pnpm install --frozen-lockfile && pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| CLAUDE.md rewrite drops a non-Windows rule | medium | Future agents lose guidance | S4 diff review; closeout lists every removed clause |
| Doc rewrite introduces an inaccurate Unix claim | low | Misleading docs | Change only Windows text; do not reword Unix claims |
| Templates diverge | low | Breaks the equality rule | `cmp` in S1 and A6 |
| `package.json` edit changes the lockfile | low | Frozen install fails | `git diff --quiet pnpm-lock.yaml` |

## 9. Deviations and working notes

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

- 2026-11-17, S1: also removed `windowsHide: true` from the two spawn calls in both `render.js` files (lines 70 and 90). The master D2 grep matches it and D6 requires no D2 hit in either template; the S1 file list already covers both files. No approval needed (same files, same acceptance).
- 2026-11-17, S5: in `docs/MIGRATING.md`, after deleting the script-name line, the next line ("The installed skill ...") was an indented continuation of that bullet, so it became its own bullet (`- The installed skill`). No other wording changed.
- 2026-11-17, S5: in `docs/PLATFORMS.md` the Claude Code and OpenCode integration rows had Linux/macOS cells reading "Same integrations" (referring to the removed Windows cell); the Windows cell text was moved into them. In `docs/ARCHITECTURE.md` the `fs.watch` pitfall kept (code still has `reallyChanged`), reworded as "`fs.watch` can report reads as changes".
- 2026-11-17, S5: README line about hardware encoders points to RENDER-SPEED as "the existing measurements (an older PC; see the note there)" so the only D4 hit is the RENDER-SPEED note.

## 10. Closeout

Fill at the end of every implementation session. Do not mark the phase done until this section is complete and the master is updated. Set `Implemented by` to the worker name or ID and `Implemented at` to the implementation date; `close` requires both.

- Date: 2026-11-17
- Session: p3-worker
- Verdict: addressed
- Steps complete: S1, S2, S3, S4, S5, S6
- Verification run:
  - S1: `node --check templates/new-film/render.js && cmp templates/new-film/render.js examples/hello-film/render.js` - exit 0
  - S2: `node -p "require('./package.json').os"` - `[ 'linux', 'darwin' ]`; `pnpm install --frozen-lockfile` - Already up to date; `git diff --quiet pnpm-lock.yaml` - exit 0
  - S3: `git ls-files docs/WINDOWS-SECURITY.md` - empty; `grep -rn "WINDOWS-SECURITY" --exclude-dir=node_modules --exclude-dir=plans --exclude-dir=.git .` - empty
  - S4: grep on CLAUDE.md AGENTS.md skill/videohub/SKILL.md - empty
  - S5: README/docs grep - only docs/RENDER-SPEED.md:67
  - S6 D1: `git ls-files '*.cmd' '*.ps1' '*.bat' '*.vbs' 'scripts/windows-*' 'server/platform.win32.test.js' 'docs/WINDOWS-SECURITY.md'` - empty
  - S6 D2: master D2 grep (as amended) over server scripts ui templates examples engine-hooks skill package.json setup.sh update.sh uninstall.sh open.sh - only `server/guard.js:37 out.exe = null` (L7; `server/hub.js` `exe: null` does not match the pattern). First run also hit `windowsHide: true` in both render.js files; removed (section 9), re-run clean apart from L7
  - S6 D3: `pnpm test` (includes install/agents/init-config tests) 299 tests, 298 pass, 0 fail, 1 skipped; `bash setup.sh --dry-run --yes --workspace <scratch>` from a scratch repo copy at `.test-tmp/p3-scratch/repo` with fake HOME/XDG_CONFIG_HOME/XDG_DATA_HOME/TMPDIR/VIDEOHUB_DATA_DIR/VIDEOHUB_BASE_DIR under `.test-tmp/p3-scratch`, VIDEOHUB_PORT=7799, VIDEOHUB_NO_WINDOW=1, real node dir (asdf install, not the shim) first on PATH - exit 0, all steps listed as dry run
  - S6 D4: master D4 grep - only docs/RENDER-SPEED.md:67
  - S6 D5: `pnpm install --frozen-lockfile && pnpm test` - 299/298/0 fail/1 skipped; os is `[ 'linux', 'darwin' ]`; `node --check` on every .js/.mjs in `git diff --name-only 9b122eb HEAD` plus staged that still exists - no errors (the 5 Windows test/script files from that diff no longer exist)
  - S6 D6: `cmp templates/new-film/render.js examples/hello-film/render.js` - same; D2 grep has no hit in either file

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | met | D1 command prints nothing |
| A2 | met | D2 grep prints only `server/guard.js:37` (`exe: null`, L7) |
| A3 | met | pnpm test 0 fail; scratch-copy `setup.sh --dry-run --yes` exit 0 |
| A4 | met | D4 grep only RENDER-SPEED.md:67 historical note |
| A5 | met | frozen install + 299/298/0/1; os `[ 'linux', 'darwin' ]`; node --check clean |
| A6 | met | cmp same; no D2 hit in templates/examples |
| D1 (master) | met | A1 evidence, full plan |
| D2 (master) | met | A2 evidence, only the L7 exception |
| D3 (master) | met | A3 evidence |
| D4 (master) | met | A4 evidence, only the allowed RENDER-SPEED note |
| D5 (master) | met | A5 evidence |
| D6 (master) | met | A6 evidence |

**CLAUDE.md clauses removed:** "Windows" from the platform list in the intro; Windows `winget` hints (step 1); "Windows: node scripts/install.mjs setup --dry-run" and the Windows setup command (steps 2, 4); "legacy Windows parameter spellings remain compatibility aliases"; `open.cmd` (step 5); `UPDATE.cmd` / `node scripts/install.mjs update` Windows command and "Windows update also retires a recognized old render-protection helper ..."; `UNINSTALL.cmd` Windows uninstall command and the `.ps1` wrapper / execution-policy sentences; "preserve Windows behavior" (Map); "shared Windows/Unix" (Map); `USERPROFILE`, `APPDATA`, `LOCALAPPDATA` from the test isolation list; "inline C#/custom P/Invoke, generated PowerShell runtime files or encoded PowerShell commands", Windows Node-launch/.NET libraries/execution-policy/PowerShell-wrapper sentences; the Windows security-warning paragraph and its WINDOWS-SECURITY.md link. All other rules kept. Also `skill/videohub/SKILL.md`: "Recycle Bin" to "Trash".

**Allowed residual hits:**
- D2: `server/guard.js:37` `out.exe = null` (and `exe: null` in `server/hub.js`), legacy `/api/guard/settings` field (L7).
- D4: `docs/RENDER-SPEED.md:67` "Windows 11" in the historical measurement, with a note added above it that it predates the macOS and Linux only codebase and that AMF is no longer probed.
- L8 known remnants (not matched by D2, left as is): backslash/drive-letter normalization in `server/janitor.js` (archiveOne) and `server/outputs.js` (guardPath); `vmmem`/WSL names in `server/ramhogs.js`. The Snap/Flatpak backslash classes in `render.js` are also kept per S1. `docs/RENDER-SPEED.md` still has an AMF row (historical).

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|
| P3-1 | Both `render.js` files also carried `windowsHide: true` (2 spawn calls); the plan's S1 text listed only the browser paths, but master D2/D6 match it | phase-amend | P3 | Removed within S1 files; section 9 |
| P3-2 | The master D2 grep does not match the `exe: null` in `server/hub.js` (pattern is `\.exe\b`); only `server/guard.js:37` shows up | note | closeout | Recorded above; no action |
| P3-3 | Several docs cells (PLATFORMS integration rows, MIGRATING bullet) depended on the Windows text for their meaning, so a pure deletion would have left dangling text | note | none | Fixed in place (section 9) |
| P3-4 | The first `cp --parents` scratch copy fallback worked via rsync and `node` on the dev machine is an asdf shim; D3 needed the real node dir on PATH (L3 already) | note | none | Used the real binary path |

No master updates written (coordinator owns master.md). Nothing in earlier evidence looks suspect: baseline 299/298/0/1 held across P2 and P3; template edits changed no test count.

**Master updates written:** none (coordinator owns master.md)
**Next-phase updates written:** none (final phase)
**Remaining work and handoff:** Close the plan in the coordinator (record commit, mark P3 done and the master complete). Real-hardware Linux and Intel macOS verification stays out of scope (master non-goals). L8 remnants remain for a future cleanup if wanted.
