# Habits: agent notes

Static site, vanilla ES modules, no build. The seed in `data/seed.json` is a snapshot of
the "ToDo List" Google Sheet (2026-10-28); the live list is the browser's localStorage.

## Testing and shipping (dev-playbook)

This repo follows the dev-playbook (`~/.claude/skills/dev-playbook/PLAYBOOK.md`).

- One gate: `scripts/check` (prettier + `node --test` + clean-code audit). The pre-push hook runs it
  (`git config core.hooksPath .githooks`). Never push with `--no-verify`.
- Bugs: write a failing regression test first, then fix.
- Never weaken, skip or delete a test to make it pass.
- UI changes: run `npm run e2e` and attach desktop (1280) + mobile (375)
  screenshots of every changed screen to the PR or final message.
- Risk class for this repo: none (browser-only data; Export is the user's backup).
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
  (`category "Game": expected Read, Watch, Side Hustle or Personal`).
- Comments: keep the ones you find, they carry intent. Write WHY, cite issue numbers / SHAs.
  Docstring + one usage example on public functions. Never `// increment i`.
- Dependencies injected via parameters: `createItemStore(storage)`, `createItem(fields, clock)`;
  tests use named fakes (`FakeStorage`), not inline stubs. No third-party runtime libs.
- Logging: none; this is a static page.
- Defensive code this repo needs: none beyond input validation (`parseItem`, `parseItemList`).
- README has an "Architecture" section; update it when the shape changes.
- `scripts/setup` bootstraps a clean machine idempotently; `scripts/check` is the single validation command.
