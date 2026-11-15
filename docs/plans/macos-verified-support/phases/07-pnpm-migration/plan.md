# Phase P7 — pnpm migration

- Plan ID: `macos-verified-support`
- Phase: P7
- Plan version: 1
- Validated against master version: 17
- Status: done
- Approved by: Jorge Venegas (standing instruction C6)
- Approved at: 2026-11-14
- Commit: 94b012e
- Implementation mode: subagent
- Implemented by: sonnet-worker-p7
- Implemented at: 2026-11-14
- Exception approved by: none
- Exception reason: none
- Parallel safe: no
- Depends on: P1
- Written: 2026-11-14
- Master plan: [master.md](../../master.md)

> Read `master.md` first. Every phase acceptance criterion must trace to a master definition-of-done item.

## 1. Phase objective

Move VideoHub from npm to pnpm end to end (C4, C5): the repository carries `pnpm-lock.yaml` instead of `package-lock.json` and pins pnpm with `packageManager`; setup and update install dependencies with `pnpm install --frozen-lockfile` on every OS and stop with an OS-specific install hint when pnpm is missing; an npm-era install updates to pnpm without losing data; and every user- and agent-facing instruction says pnpm. This satisfies D8 and keeps D1 green, and it gives P3 a pnpm-based `setup.sh` to verify on the real Mac.

## 2. Master traceability

| Master item | How this phase advances it | Phase criterion |
|---|---|---|
| D8 | Lockfile, `packageManager`, installer/update commands, missing-pnpm hints, npm→pnpm update path, docs and templates | A1, A2, A3, A4, A5 |
| D1 | Suite stays green after the installer and test changes | A6 |

## Prior discoveries applied

| Ledger | Discovery | Effect on this phase |
|---|---|---|
| L1 | User requires pnpm for development and the product; npm references at `scripts/install.mjs:164-165,280-289`, README, CLAUDE.md, ARCHITECTURE.md and film templates | Defines S2–S5 and the file list |
| L2 | `pnpm test` auto-installs on pnpm 11 | Until S1 lands, run tests with `pnpm --config.verify-deps-before-run=false test`; after S1 the lockfile exists and plain `pnpm test` (after `pnpm install --frozen-lockfile`) is the steady-state command written into docs (S5) |
| L4 | volumes()/GPU/launcher findings for P2 (Affects P2 only) | Not applicable to P7; listed after master revalidation |
| L3 | `pnpm import` converts `package-lock.json` keeping resolved versions; pnpm replaces an npm `node_modules` non-interactively | S1 generates the lockfile with `pnpm import`; S3 adds no purge flag; A4 tests the npm→pnpm update path |

## 3. Scope

In scope:
- `pnpm-lock.yaml` (from `pnpm import`), delete `package-lock.json`, `packageManager` in `package.json`.
- Installer/update package step, lockfile change detection, shipped `ITEMS`, missing-pnpm hints.
- Tests that assert the package command; a test for missing pnpm and for the npm-era update path.
- npm wording in README, CLAUDE.md, docs/ARCHITECTURE.md, templates/new-film/README.md, both `render.js` copies, `server/util.js` and `scripts/test.mjs` comments.

Out of scope:
- Upgrading or changing any dependency version (the lockfile must resolve the same versions as `package-lock.json`).
- `scripts/agents.mjs:48` (about npm-installed agent CLI shims, unrelated to VideoHub's own packages).
- Installing pnpm for the user, adding corepack logic, or changing `setup.sh`/`setup.ps1`/`*.cmd` entry points (the Node installer prints the hint).
- macOS platform fixes (P2) and docs/PLATFORMS.md verified-status rewrite (P6).
- Adding a `.gitignore`.

## 4. Entry conditions

- [x] P1 done and suite green — verify: `pnpm --config.verify-deps-before-run=false test 2>&1 | grep -E "^ℹ (pass|fail)"` → `fail 0`
- [x] pnpm available — verify: `pnpm --version` → 11.x
- [x] Network access for `pnpm import`/`pnpm install` (npm registry)
- [x] Phase plan revalidated against current master version
- [x] User approved this phase plan — verify: `Approved by` is set and status is `ready`

## 5. Steps

If a step reveals work outside this phase, report it and continue the approved steps unless it blocks them. Do not add it to this plan or implement it here.

### S1 — Replace the npm lockfile with a pnpm lockfile

- Depends on: none
- Files:
  - `pnpm-lock.yaml` (create) — via `pnpm import`
  - `package-lock.json` (delete)
  - `package.json` (modify) — add `"packageManager": "pnpm@11.5.2"` (the exact output of `pnpm --version`)
- Change: run `pnpm import` from the repo root, add `packageManager` with the exact local pnpm version, `git rm package-lock.json`, then `pnpm install --frozen-lockfile` to prove the lockfile matches. Resolved versions of `@modelcontextprotocol/sdk`, `puppeteer-core` and `zod` must equal those in the deleted `package-lock.json`. Never commit `node_modules/`.
- Acceptance:
  - [x] `pnpm install --frozen-lockfile` exits 0
  - [x] `pnpm list --depth 0` shows the same three versions `package-lock.json` had (`git show HEAD:package-lock.json`)
- Verification: `pnpm install --frozen-lockfile && pnpm list --depth 0` — expected: exit 0, matching versions
- Rollback: `git checkout HEAD -- package.json package-lock.json && rm -f pnpm-lock.yaml`

### S2 — Install dependencies with pnpm in setup and update

- Depends on: S1
- Files:
  - `scripts/install.mjs` (modify) — `packageInstall`, update lockfile comparison (`lockBefore`/`lockAfter`), `ITEMS`
- Change: `packageInstall` runs `pnpm install --frozen-lockfile` (Windows through the existing fixed `platform.shellCommand` plan so a `pnpm.cmd` shim works; Unix as `{ file: 'pnpm', args: [...] }`), with an updated `say(...)` line and failure message. Update compares `pnpm-lock.yaml` before/after instead of `package-lock.json`, so an npm-era target (no `pnpm-lock.yaml`) always reinstalls with pnpm. `ITEMS` ships `pnpm-lock.yaml` instead of `package-lock.json`. Keep every other behavior, including dry-run printing without running anything.
- Acceptance:
  - [x] Dry-run setup prints the pnpm install action and runs no command
  - [x] Windows plan is `cmd.exe /d /s /c "pnpm install --frozen-lockfile"` with cwd and env passed separately
- Verification: `node --check scripts/install.mjs && node --test scripts/install.test.js scripts/windows-installer.test.js`
- Rollback: `git checkout HEAD -- scripts/install.mjs`

### S3 — Stop with an install hint when pnpm is missing

- Depends on: S2
- Files:
  - `scripts/install.mjs` (modify) — `packageInstall` (or immediately before it)
- Change: before running the package command (not in dry-run, and only when packages actually need installing), detect pnpm with the platform's existing tool lookup (Windows must also find `pnpm.cmd`). If missing, throw an error naming the OS hint from C5: Windows `winget install -e --id pnpm.pnpm`, macOS `brew install pnpm`, Linux `npm install -g pnpm` or the distribution package — each followed by "then run setup again" / "update again". In dry-run, emit the same hint as a warning instead. No automatic installation.
- Acceptance:
  - [x] Setup with a fixture where pnpm is not found fails before any package command with the OS-specific hint, and creates no workspace
  - [x] Dry-run with pnpm missing warns with the hint and still writes nothing
- Verification: new tests in S4 pass
- Rollback: revert the S3 hunk in `scripts/install.mjs`

### S4 — Cover the pnpm behavior in tests

- Depends on: S2, S3
- Files:
  - `scripts/windows-installer.test.js` (modify) — the "runtime package command" test expects the pnpm command
  - `scripts/install.test.js` (modify) — add: macOS/Linux setup runs `pnpm install --frozen-lockfile` in the hub folder; missing pnpm (setup and dry-run) gives the hint; update of a target that has `package-lock.json` and no `pnpm-lock.yaml` runs the pnpm install and preserves `data/`
- Change: tests use the existing fixtures and injected `run`/platform; they must not invoke real pnpm or npm and must stay under `.test-tmp`.
- Acceptance:
  - [x] Each new test fails if the corresponding behavior is reverted (check by temporarily reverting S2's command or S3's guard)
- Verification: `node --test scripts/install.test.js scripts/windows-installer.test.js` — expected: `fail 0`
- Rollback: `git checkout HEAD -- scripts/install.test.js scripts/windows-installer.test.js`

### S5 — Say pnpm everywhere users and agents read

- Depends on: S1
- Files:
  - `README.md` (modify) — requirements (add pnpm with per-OS install hints), troubleshooting line, test command
  - `CLAUDE.md` (modify) — install step 1 requirements (pnpm hints per OS), "Before committing" test command
  - `docs/ARCHITECTURE.md` (modify) — dependency sentence and test command
  - `templates/new-film/README.md` (modify) — `pnpm install`
  - `templates/new-film/render.js` and `examples/hello-film/render.js` (modify) — the "puppeteer-core not found" message says `pnpm install`; the two files must stay byte-identical
  - `server/util.js`, `scripts/test.mjs` (modify) — comments only
- Change: replace npm instructions with the pnpm equivalents; the steady-state dev commands are `pnpm install --frozen-lockfile` and `pnpm test`. Do not rewrite unrelated text.
- Acceptance:
  - [x] `grep -rn -E "npm ci|npm install|npm test|package-lock" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.test-tmp --exclude-dir=plans --exclude-dir=.agents --exclude-dir=.claude .` returns only the Linux `npm install -g pnpm` hint(s)
  - [x] `cmp templates/new-film/render.js examples/hello-film/render.js` exits 0
- Verification: the grep and cmp above
- Rollback: `git checkout HEAD -- README.md CLAUDE.md docs/ARCHITECTURE.md templates/new-film/README.md templates/new-film/render.js examples/hello-film/render.js server/util.js scripts/test.mjs`

## 6. Phase acceptance criteria

- [x] A1 — The repo pins pnpm and ships only a pnpm lockfile with unchanged dependency versions — verify: `grep packageManager package.json`, `test ! -e package-lock.json`, `pnpm install --frozen-lockfile && pnpm list --depth 0`
- [x] A2 — Setup and update install with `pnpm install --frozen-lockfile` on Windows and Unix — verify: S2/S4 tests in `scripts/install.test.js` and `scripts/windows-installer.test.js`
- [x] A3 — Missing pnpm stops setup with the OS-specific hint before changes, and dry-run warns — verify: S4 tests
- [x] A4 — An npm-era install (has `package-lock.json`, no `pnpm-lock.yaml`) updates to pnpm and keeps `data/` — verify: S4 update test
- [x] A5 — No npm install/test instruction remains and the two `render.js` copies match — verify: S5 grep and `cmp`
- [x] A6 — Full suite and syntax checks pass — verify: `pnpm test 2>&1 | grep -E "^ℹ (pass|fail)"` → `fail 0`; `node --check` on each changed .js/.mjs

## 7. Code standards check

- [x] The diff is the smallest change that meets the acceptance criteria; no speculative abstraction, unused code, or new dependency
- [x] Existing helpers are reused where they fit; duplication the change creates is removed without adding a framework for two similar lines
- [x] Names and structure state intent; comments explain only non-obvious reasons
- [x] Every new test fails if the behavior it covers breaks; no test restates the implementation
- [x] Master standards commands pass: format none, lint none, `node --check` on changed files, `pnpm test`

## 8. Risks and unknowns

| Risk | Likelihood | Impact | Mitigation or check |
|---|---|---|---|
| R5: Windows pnpm path cannot be run on real Windows here | high | medium | Injected Windows tests only; P6 docs record Windows pnpm verification as pending |
| `pnpm import` resolves different versions than npm did | low | medium | S1 acceptance compares versions against the deleted lockfile |
| pnpm's symlinked `node_modules` breaks `require.resolve('puppeteer-core', { paths: [VIDEOHUB_DIR] })` in film render scripts (R7) | low | high | Quick check after S1: `node -e "require(require.resolve('puppeteer-core',{paths:[process.cwd()]}))"` from the repo root; full check in P4 render |
| Update copy refuses symlinks; pnpm creates them under `node_modules` | low | medium | `node_modules` is not in `ITEMS` and is never copied; A4 test covers update |
| Local `node_modules/` is untracked and could be committed | medium | medium | Commit with explicit paths, never `git add -A` |

## 9. Deviations and working notes

Append during implementation. One line per deviation: date, step, what changed, why, approval if needed. A deviation records an approved adjustment; it must not be used to add out-of-scope work.

- 2026-11-14, S5: the plan's grep `npm ci|npm install|npm test` also matches the substring inside `pnpm install`/`pnpm test`. Verified with `(^|[^p])npm (ci|install|test)|package-lock` instead; remaining hits are only the Linux `npm install -g pnpm` hints (README, CLAUDE.md, install.mjs, install.test.js) and the npm-era `package-lock.json` fixture in the update test. No plan change needed.
- 2026-11-14, S3: Windows lookup tries `findTool('pnpm')` then `findTool('pnpm.cmd')` inside install.mjs because `platform.findTool` (not in scope) only tries `.exe` suffixes.

## 10. Closeout

Fill at the end of every implementation session. Do not mark the phase done until this section is complete and the master is updated. Set `Implemented by` to the worker name or ID and `Implemented at` to the implementation date; `close` requires both.

- Date: 2026-11-14
- Session: sonnet-worker-p7
- Verdict: addressed
- Steps complete: S1, S2, S3, S4, S5
- Verification run: S1 `pnpm install --frozen-lockfile && pnpm list --depth 0` exit 0, sdk 1.32.1 / puppeteer-core 25.17.0 / zod 4.6.7 (same as deleted lockfile); S2-S4 `node --test scripts/install.test.js scripts/windows-installer.test.js` pass 39 fail 0; S4 revert checks (npm command, no pnpm guard, old lock name) each made the matching new test fail, then restored; S5 corrected grep plus `cmp` clean; `node --check` on all changed .js/.mjs OK; R7 `node -e "require(require.resolve('puppeteer-core',{paths:[process.cwd()]}))"` OK; `pnpm test` tests 345 pass 344 fail 0 skipped 1.

| Criterion | Verdict | Evidence |
|---|---|---|
| A1 | met | `grep packageManager package.json` pnpm@11.5.2; `package-lock.json` removed; frozen install and `pnpm list --depth 0` match versions |
| A2 | met | new Unix setup test and updated Windows test assert `pnpm install --frozen-lockfile` (Windows via `cmd.exe /d /s /c`) |
| A3 | met | missing-pnpm test: darwin/linux setup rejects with hint, no workspace or data; dry-run warns, writes nothing |
| A4 | met | npm-era update test: pnpm install runs in target, `data/config.json` kept, `pnpm-lock.yaml` copied |
| A5 | met | corrected grep (see section 9) leaves only Linux hint and fixture; `cmp` of the two `render.js` exits 0 |
| A6 | met | `pnpm test` fail 0; `node --check` clean |
| D8 (master) | met | A1-A5 above; real Windows pnpm run still pending (R5) |
| D1 (master) | met | `pnpm test` pass 344 fail 0 skipped 1 |

**Discoveries no earlier plan predicted:**

| ID | Discovery | Type | Applies to | Action written |
|---|---|---|---|---|
| N1 | Plan S5 grep matches `pnpm install`/`pnpm test` as substrings of `npm install`/`npm test`; the criterion needs `(^|[^p])npm` | note | P7 | recorded in section 9 |
| N2 | `platform.findTool` on Windows does not try `.cmd`; installer works around it locally. Real Windows pnpm verification remains pending (R5) | note | P6 | none |

**Master updates written:** none (coordinator owns master.md)
**Next-phase updates written:** none
**Remaining work and handoff:** coordinator runs record-commit/close for P7 and starts P2. P3 setup.sh on the Mac needs pnpm on PATH. Windows pnpm path is verified only by injected tests.
