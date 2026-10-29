# Habits: agent notes

Vanilla ES-module pages, no build, plus `server/` (node:http + `pg`, the one runtime
dependency, behind `server/state-postgres.js`): it serves the pages and keeps every saved
document in one PostgreSQL table (`/api/state/<key>`, see `js/state-storage.js`; the pages fall
back to localStorage when served as plain files). The seed in `data/seed.json` is a snapshot of
the "ToDo List" Google Sheet (2026-10-28). Since 2026-10-29 the categories are the three 3DeT
características (Poder, Habilidade, Resistência): an item done pays 1 XP on that track, and the
`daily` flag marks a Today habit with its own `xp` per day (`rollDailyItems` brings them back
every morning, the Today tab lists the pending ones as the good habits (`today-view.js`, action
`done-item`), a done one is greyed on the list with "Already done today"). The old Source values
(Read, Watch, Side Hustle, Today, Personal; the Today items' `track`) are migrated on parse by
`migrateCategory`, never written. Items have `doneAt`; cards edit in place
(`js/render-item-editor.js`). The hero is drawn by `diego-sprite.js` (string
pixel maps traced from Diego's reference), enemies by the generic `chibi-sprite.js`. Deployed on the home server by push (docker compose, see README).
`game.html` + `js/game/` is the 3DeT Victory game (see README "Architecture"); combat and
progression are pure functions that take an injected `rollDie`, so tests use scripted dice and
the page accepts `?seed=N`. Keep game strings in `js/game/game-i18n.js` (EN + PT). Stage maps are
ASCII in `js/game/stage-maps.js` (tests check every minion blocks the only way forward); sprites
are procedural chibis (`chibi-sprite.js`), sounds are synthesised in `sound.js` (no audio files).
The hero's Today/Sheet tabs live on `index.html` (shared `js/game/hero-controller.js`); `game.html`
keeps Arcas + Adventure and `puzzle.html` the sort puzzles, both locked unless the Pomodoro on
`index.html` earned free time (`js/pomodoro/`, `?fast=1` shrinks a minute to 0.1 s for e2e).
Optional Google Sheets sync: `sheets-sync/Code.gs` (Apps Script, deployed by Diego, token in a
script property) + `js/sync/` (sheet wins, op queue; e2e stubs the /exec URL with page.route).

## Testing and shipping (dev-playbook)

This repo follows the dev-playbook (`~/.claude/skills/dev-playbook/PLAYBOOK.md`).

- One gate: `scripts/check` (prettier + `node --test` + clean-code audit). The pre-push hook runs it
  (`git config core.hooksPath .githooks`). Never push with `--no-verify`.
- Bugs: write a failing regression test first, then fix.
- Never weaken, skip or delete a test to make it pass.
- UI changes: run `npm run e2e` and attach desktop (1280) + mobile (375)
  screenshots of every changed screen to the PR or final message.
- Risk class for this repo: low (the server's PostgreSQL holds the state; Export is the manual backup).
- e2e runs the real server with `HABITS_STORE=memory` (one worker, state wiped per spec via
  `DELETE /api/state`, which only the memory store allows).
- No real paths, IPs, passwords or tokens in code, tests, fixtures or docs.
- Before finishing: run `/code-review` on the diff, then give the evidence package:
  summary, risk class, test results, screenshots, rollback steps.

## Clean code (dev-playbook CLEAN-CODE.md)

Language: vanilla JS ES modules. Formatter: prettier; `scripts/check` runs it, don't discuss style.

- Functions 4–20 lines. Files ≤300 lines, hard max 500. `scripts/clean-code-audit` lists violations
  (`--strict` in `scripts/check`).
- One responsibility per module. Layout: `js/<concern>.js` ES modules, `tests/` (node --test), `e2e/` (Playwright).
- Names specific and searchable (<5 grep hits). Banned: `data`, `handler`, `utils`, `Manager`, `Service`.
- Types explicit: JSDoc `@param`/`@returns` on every exported function.
- Early returns, max 2 nested levels. Extract duplicated logic the second time it appears.
- Errors include the offending value and the expected shape
  (`category "Game": expected Poder, Habilidade or Resistência`).
- Comments: keep the ones you find, they carry intent. Write WHY, cite issue numbers / SHAs.
  Docstring + one usage example on public functions. Never `// increment i`.
- Dependencies injected via parameters: `createItemStore(storage)`, `createItem(fields, clock)`;
  tests use named fakes (`FakeStorage`), not inline stubs. The only third-party runtime lib is
  `pg`, used in `server/state-postgres.js` alone.
- Logging: the server prints one JSON object per line; the pages log nothing.
- Defensive code this repo needs: input validation (`parseItem`, `parseItemList`, the server's
  key/body checks); the server's connect-with-retry at start (Postgres may still be booting
  after a host reboot); the pages' write queue retrying failed PUTs (`state-storage.js`).
- README has an "Architecture" section; update it when the shape changes.
- `scripts/setup` bootstraps a clean machine idempotently; `scripts/check` is the single validation command.
