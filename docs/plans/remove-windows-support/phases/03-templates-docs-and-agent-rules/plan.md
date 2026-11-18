# Phase P3 — Templates, docs and agent rules

- Plan ID: `remove-windows-support`
- Phase: P3
- Plan version: 1
- Validated against master version: 13
- Status: in_progress
- Approved by: Jorge Venegas
- Approved at: 2026-11-17
- Commit: pending
- Implementation mode: subagent
- Implemented by: pending
- Implemented at: pending
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
  - [ ] `cmp templates/new-film/render.js examples/hello-film/render.js` exits 0
  - [ ] `grep -nE "win32|\.exe\b|Program Files|AppData" templates examples` prints nothing
- Verification: `node --check templates/new-film/render.js && cmp templates/new-film/render.js examples/hello-film/render.js` — expected: exit 0
- Rollback: `git checkout HEAD -- templates/new-film/render.js examples/hello-film/render.js`

### S2 — Update package metadata

- Depends on: none
- Files:
  - `package.json` (modify) — `os` becomes `["linux", "darwin"]`; drop the `windows` keyword
- Change: no other field changes. `pnpm-lock.yaml` must not change.
- Acceptance:
  - [ ] `node -p "require('./package.json').os"` prints `[ 'linux', 'darwin' ]`
  - [ ] `pnpm install --frozen-lockfile` succeeds and `git diff --quiet pnpm-lock.yaml` exits 0
- Verification: the two commands above — expected: as stated
- Rollback: `git checkout HEAD -- package.json`

### S3 — Remove the Windows security guide

- Depends on: none
- Files:
  - `docs/WINDOWS-SECURITY.md` (delete)
- Change: `git rm` it. S4 and S5 remove the links to it.
- Acceptance:
  - [ ] `git ls-files docs/WINDOWS-SECURITY.md` prints nothing and `grep -rn "WINDOWS-SECURITY" --exclude-dir=node_modules --exclude-dir=plans .` prints nothing after S4–S5
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
  - [ ] `grep -nE "Windows|PowerShell|winget|\.cmd\b|\.ps1\b|%APPDATA%|Recycle Bin|Explorer|SmartScreen|USERPROFILE|LOCALAPPDATA" CLAUDE.md AGENTS.md skill/videohub/SKILL.md` prints nothing
  - [ ] Every non-Windows rule in CLAUDE.md is still present (review the diff; the closeout lists removed clauses)
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
  - [ ] `grep -rnE "Windows|PowerShell|winget|\.cmd\b|\.ps1\b|%APPDATA%|Recycle Bin|Explorer|SmartScreen" README.md docs --exclude-dir=plans` prints only the RENDER-SPEED historical note
- Verification: the grep — expected: only the allowed hit
- Rollback: `git checkout HEAD -- README.md docs/PLATFORMS.md docs/ARCHITECTURE.md docs/RENDER-SPEED.md docs/MIGRATING.md`

### S6 — Final D1–D6 sweep

- Depends on: S1, S2, S3, S4, S5
- Files: none (verification only)
- Change: run each master D1–D6 verification command exactly as written in `master.md` (D2 as amended by L7). For D3, run the `bash setup.sh --dry-run --yes` from a scratch copy per L3. For D5, run `node --check` on every `.js`/`.mjs` changed since the plan base commit `9b122eb`. Record each command and its result in the closeout.
- Acceptance:
  - [ ] All six DoD checks pass, with only the two recorded exceptions (L7 for D2, RENDER-SPEED for D4)
- Verification: as described — expected: as stated
- Rollback: none

## 6. Phase acceptance criteria

- [ ] A1 — D1 holds — verify: `git ls-files '*.cmd' '*.ps1' '*.bat' '*.vbs' 'scripts/windows-*' 'server/platform.win32.test.js' 'docs/WINDOWS-SECURITY.md'` prints nothing
- [ ] A2 — D2 holds — verify: the master D2 grep prints only the L7 `exe: null` lines
- [ ] A3 — D3 holds — verify: `pnpm test` installer/agents/init-config tests pass; scratch-copy `bash setup.sh --dry-run --yes` exits 0
- [ ] A4 — D4 holds — verify: the master D4 grep shows only the RENDER-SPEED historical note
- [ ] A5 — D5 holds — verify: `pnpm install --frozen-lockfile && pnpm test` — 0 failures; `package.json` `os` is `[ 'linux', 'darwin' ]`; `node --check` clean on every `.js`/`.mjs` changed since `9b122eb`
- [ ] A6 — D6 holds — verify: `cmp templates/new-film/render.js examples/hello-film/render.js` exits 0 and the D2 grep has no hit in either file

## 7. Code standards check

- [ ] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [ ] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [ ] Names and structure state intent; comments explain only non-obvious reasons
- [ ] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [ ] Master standards commands pass: format none, lint none, `node --check` on each changed file, `pnpm install --frozen-lockfile && pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| CLAUDE.md rewrite drops a non-Windows rule | medium | Future agents lose guidance | S4 diff review; closeout lists every removed clause |
| Doc rewrite introduces an inaccurate Unix claim | low | Misleading docs | Change only Windows text; do not reword Unix claims |
| Templates diverge | low | Breaks the equality rule | `cmp` in S1 and A6 |
| `package.json` edit changes the lockfile | low | Frozen install fails | `git diff --quiet pnpm-lock.yaml` |

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
| A1 | pending | |
| A2 | pending | |
| A3 | pending | |
| A4 | pending | |
| A5 | pending | |
| A6 | pending | |
| D1 (master) | pending | |
| D2 (master) | pending | |
| D3 (master) | pending | |
| D4 (master) | pending | |
| D5 (master) | pending | |
| D6 (master) | pending | |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|

**Master updates written:** none yet
**Next-phase updates written:** none yet
**Remaining work and handoff:** none yet
